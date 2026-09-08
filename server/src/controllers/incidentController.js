import { Incident } from "../models/Incident.js";
import { IncidentEvent } from "../models/IncidentEvent.js";
import { User } from "../models/User.js";
import { httpError } from "../utils/httpError.js";
import { assertSeverity, severityRank } from "../utils/severity.js";

const OPEN_STATUSES = ["open", "acknowledged", "mitigated"];
const STALE = "This incident was updated. Try again on this page — do not refresh the browser if you are filling a form.";
const STALE_COUNT =
  "This person's solving count changed. Submit again if you still want them. Do not refresh the browser or an unsaved form will be lost.";

function searchFilter(q) {
  if (!q?.trim()) return {};
  const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return { $or: [{ title: rx }, { description: rx }, { searchText: rx }] };
}

function isAssignee(incident, user) {
  return incident.assignee && String(incident.assignee._id || incident.assignee) === String(user._id);
}

function assertLockVersion(incident, expected) {
  if (expected === undefined || expected === null || expected === "") {
    throw httpError(400, "lockVersion is required");
  }
  if (Number(expected) !== incident.lockVersion) {
    throw httpError(409, STALE);
  }
}

async function bumpIfMatch(incident, extraSet = {}) {
  const updated = await Incident.findOneAndUpdate(
    { _id: incident._id, lockVersion: incident.lockVersion },
    { $set: extraSet, $inc: { lockVersion: 1 } },
    { new: true }
  );
  if (!updated) {
    throw httpError(409, STALE);
  }
  return updated;
}

async function assertExpectedOpenCount(assigneeId, expectedOpenCount, excludeIncidentId) {
  if (expectedOpenCount === undefined || expectedOpenCount === null || expectedOpenCount === "") {
    throw httpError(400, "expectedOpenCount is required");
  }
  const filter = { assignee: assigneeId, status: { $ne: "resolved" } };
  if (excludeIncidentId) filter._id = { $ne: excludeIncidentId };
  const actual = await Incident.countDocuments(filter);
  if (Number(expectedOpenCount) !== actual) {
    throw httpError(409, STALE_COUNT);
  }
}

async function addEvent(incidentId, type, message, authorId) {
  return IncidentEvent.create({ incident: incidentId, type, message, author: authorId });
}

async function hydrate(incident) {
  const doc = await Incident.findById(incident._id)
    .populate("assignee", "name email role")
    .populate("createdBy", "name email role")
    .populate("resolvedBy", "name email role");
  const events = await IncidentEvent.find({ incident: incident._id, hidden: { $ne: true } })
    .sort({ createdAt: 1 })
    .populate("author", "name email role");
  return { incident: doc.toJSON(), events: events.map((e) => e.toJSON()) };
}

export async function createIncident(req, res, next) {
  try {
    if (req.user.role !== "commander") {
      throw httpError(403, "Only a commander can open and assign an incident");
    }

    const { title, description, severity, assigneeId, expectedOpenCount } = req.body || {};
    if (!title?.trim() || !description?.trim()) {
      throw httpError(400, "Title and description are required");
    }
    assertSeverity(severity);

    let assignee = null;
    if (assigneeId) {
      assignee = await User.findById(assigneeId);
      if (!assignee) throw httpError(400, "Assignee not found");
    }

    const incident = await Incident.create({
      title: title.trim(),
      description: description.trim(),
      severity,
      severityRank: severityRank(severity),
      status: "open",
      assignee: null,
      createdBy: req.user._id,
      searchText: `${title} ${description}`.toLowerCase(),
      lockVersion: 0,
      reassignmentRequested: false,
    });

    await addEvent(
      incident._id,
      "created",
      `Opened as ${severity}: ${title.trim()}`,
      req.user._id
    );

    let assignError = null;
    if (assignee) {
      try {
        await assertExpectedOpenCount(assignee._id, expectedOpenCount, incident._id);
        incident.assignee = assignee._id;
        await incident.save();
        await addEvent(
          incident._id,
          "assigned",
          `${req.user.name} assigned this to ${assignee.name} at ${severity}`,
          req.user._id
        );
      } catch (err) {
        if (err.status === 409) {
          assignError = err.message;
        } else {
          throw err;
        }
      }
    }

    const payload = await hydrate(incident);
    if (assignError) {
      payload.assignError = assignError;
      payload.assignHint =
        "The incident was saved. Open it from the board to assign — you do not need to type it again.";
    }
    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
}

export async function listIncidents(req, res, next) {
  try {
    const { q = "", status = "open", page = "1", limit = "50" } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));

    const filter = { ...searchFilter(q) };
    if (status === "open") {
      filter.status = { $in: OPEN_STATUSES };
    } else if (status === "resolved") {
      filter.status = "resolved";
    } else if (status !== "all") {
      throw httpError(400, "status must be open, resolved, or all");
    }

    const [items, total] = await Promise.all([
      Incident.find(filter)
        .sort({ reassignmentRequested: -1, severityRank: 1, updatedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("assignee", "name email role")
        .populate("createdBy", "name email role"),
      Incident.countDocuments(filter),
    ]);

    res.json({
      items: items.map((i) => i.toJSON()),
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    next(err);
  }
}

export async function getIncident(req, res, next) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw httpError(404, "Incident not found");
    res.json(await hydrate(incident));
  } catch (err) {
    next(err);
  }
}

export async function assignIncident(req, res, next) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw httpError(404, "Incident not found");
    if (incident.status === "resolved") {
      throw httpError(400, "A resolved incident cannot be assigned");
    }

    const { assigneeId, severity, lockVersion, expectedOpenCount } = req.body || {};
    assertLockVersion(incident, lockVersion);
    if (!assigneeId) throw httpError(400, "Choose a person to assign");
    assertSeverity(severity);

    const assignee = await User.findById(assigneeId);
    if (!assignee) throw httpError(400, "Assignee not found");

    await assertExpectedOpenCount(assignee._id, expectedOpenCount, incident._id);

    const updated = await bumpIfMatch(incident, {
      assignee: assignee._id,
      severity,
      severityRank: severityRank(severity),
      reassignmentRequested: false,
    });

    await addEvent(
      updated._id,
      "assigned",
      `${req.user.name} assigned this to ${assignee.name} at ${severity}`,
      req.user._id
    );

    res.json(await hydrate(updated));
  } catch (err) {
    next(err);
  }
}

export async function reassignIncident(req, res, next) {
  try {
    const incident = await Incident.findById(req.params.id).populate("assignee", "name");
    if (!incident) throw httpError(404, "Incident not found");
    if (incident.status === "resolved") {
      throw httpError(400, "A resolved incident cannot be reassigned");
    }

    const { assigneeId, severity, handoffSummary, lockVersion, expectedOpenCount } = req.body || {};
    assertLockVersion(incident, lockVersion);
    if (!assigneeId) throw httpError(400, "Choose a person to reassign to");
    if (!handoffSummary?.trim()) {
      throw httpError(
        400,
        "A handoff summary is required so the next person knows what was already tried"
      );
    }
    assertSeverity(severity);

    const nextOwner = await User.findById(assigneeId);
    if (!nextOwner) throw httpError(400, "Assignee not found");
    if (incident.assignee && String(incident.assignee._id) === String(nextOwner._id)) {
      throw httpError(400, "Pick a different person to reassign to");
    }

    await assertExpectedOpenCount(nextOwner._id, expectedOpenCount, incident._id);

    const previousName = incident.assignee?.name || "unassigned";
    const updated = await bumpIfMatch(incident, {
      assignee: nextOwner._id,
      severity,
      severityRank: severityRank(severity),
      reassignmentRequested: false,
    });

    await addEvent(
      updated._id,
      "reassigned",
      `${req.user.name} reassigned this from ${previousName} to ${nextOwner.name} at ${severity}. Handoff: ${handoffSummary.trim()}`,
      req.user._id
    );

    res.json(await hydrate(updated));
  } catch (err) {
    next(err);
  }
}

export async function requestReassignment(req, res, next) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw httpError(404, "Incident not found");
    if (incident.status === "resolved") {
      throw httpError(400, "A resolved incident cannot be handed off");
    }
    if (!isAssignee(incident, req.user)) {
      throw httpError(403, "Only the current assignee can request reassignment");
    }
    if (incident.reassignmentRequested) {
      throw httpError(400, "Reassignment was already requested");
    }

    const { handoffSummary, lockVersion } = req.body || {};
    assertLockVersion(incident, lockVersion);
    if (!handoffSummary?.trim()) {
      throw httpError(400, "A handoff summary is required to request reassignment");
    }

    const updated = await bumpIfMatch(incident, { reassignmentRequested: true });
    await addEvent(
      updated._id,
      "reassignment_requested",
      `Reassignment requested. Handoff: ${handoffSummary.trim()}`,
      req.user._id
    );

    res.json(await hydrate(updated));
  } catch (err) {
    next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw httpError(404, "Incident not found");
    if (incident.status === "resolved") {
      throw httpError(400, "Resolved incidents are closed — comments are not added");
    }

    const message = req.body?.message?.trim();
    if (!message) throw httpError(400, "Write a progress update");

    await addEvent(incident._id, "comment", message, req.user._id);
    incident.updatedAt = new Date();
    await incident.save();

    res.status(201).json(await hydrate(incident));
  } catch (err) {
    next(err);
  }
}

export async function hideOrEditEvent(req, res, next) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw httpError(404, "Incident not found");

    const event = await IncidentEvent.findOne({
      _id: req.params.eventId,
      incident: incident._id,
    });
    if (!event || event.hidden) throw httpError(404, "Timeline line not found");
    if (String(event.author) !== String(req.user._id)) {
      throw httpError(403, "Only the person who created this line can update or hide it");
    }

    if (req.body?.hidden === true) {
      event.hidden = true;
      await event.save();
      return res.json(await hydrate(incident));
    }

    const message = req.body?.message?.trim();
    if (!message) throw httpError(400, "Write the updated text or set hidden");
    event.message = message;
    event.editedAt = new Date();
    await event.save();
    res.json(await hydrate(incident));
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw httpError(404, "Incident not found");
    if (incident.status === "resolved") {
      throw httpError(400, "Already resolved — use search to read the timeline");
    }
    if (!isAssignee(incident, req.user)) {
      throw httpError(403, "Only the assignee can acknowledge or mitigate");
    }
    if (incident.reassignmentRequested) {
      throw httpError(400, "Reassignment was requested — wait for a commander or comment only");
    }

    const { status: nextStatus, lockVersion } = req.body || {};
    assertLockVersion(incident, lockVersion);
    if (!["acknowledged", "mitigated"].includes(nextStatus)) {
      throw httpError(400, "Status can move to acknowledged or mitigated here; resolve uses the resolve endpoint");
    }

    if (nextStatus === "mitigated" && incident.status === "open") {
      throw httpError(400, "Acknowledge the incident before marking it mitigated");
    }
    if (nextStatus === "acknowledged" && incident.status !== "open") {
      throw httpError(400, "This incident is already past open");
    }
    if (nextStatus === "mitigated" && incident.status !== "acknowledged") {
      throw httpError(400, "Cannot move to that status");
    }

    const updated = await bumpIfMatch(incident, { status: nextStatus });
    await addEvent(
      updated._id,
      "status",
      `${req.user.name} marked this ${nextStatus}`,
      req.user._id
    );

    res.json(await hydrate(updated));
  } catch (err) {
    next(err);
  }
}

export async function resolveIncident(req, res, next) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw httpError(404, "Incident not found");
    if (incident.status === "resolved") {
      throw httpError(400, "Already resolved");
    }

    const assigneeOwns = isAssignee(incident, req.user);
    if (!assigneeOwns && req.user.role !== "commander") {
      throw httpError(403, "Only the assignee or a commander can resolve this");
    }
    if (assigneeOwns && incident.reassignmentRequested && req.user.role !== "commander") {
      throw httpError(400, "You requested reassignment — you cannot resolve. A commander can still resolve.");
    }

    const { whatHappened, whatWeDid, outcome, lockVersion } = req.body || {};
    assertLockVersion(incident, lockVersion);
    if (!whatHappened?.trim() || !whatWeDid?.trim() || !outcome?.trim()) {
      throw httpError(400, "Write what happened, what you did, and the outcome");
    }

    const summary = `What happened: ${whatHappened.trim()}\nWhat we did: ${whatWeDid.trim()}\nOutcome: ${outcome.trim()}`;
    const updated = await bumpIfMatch(incident, {
      status: "resolved",
      resolutionSummary: summary,
      resolvedBy: req.user._id,
      reassignmentRequested: false,
      searchText: `${incident.title} ${incident.description} ${summary}`.toLowerCase(),
    });

    await addEvent(updated._id, "resolved", summary, req.user._id);
    res.json(await hydrate(updated));
  } catch (err) {
    next(err);
  }
}
