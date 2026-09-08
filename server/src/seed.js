import bcrypt from "bcryptjs";
import { User } from "./models/User.js";
import { Incident } from "./models/Incident.js";
import { IncidentEvent } from "./models/IncidentEvent.js";
import { severityRank } from "./utils/severity.js";

const COMMANDERS = [
  { name: "Maya Shah", email: "maya@command.local" },
  { name: "Kabir Mehta", email: "kabir@command.local" },
  { name: "Ananya Iyer", email: "ananya@command.local" },
  { name: "Rohan Desai", email: "rohan@command.local" },
  { name: "Sneha Kapoor", email: "sneha@command.local" },
];

const ENGINEERS = [
  { name: "Arjun Mehta", email: "arjun@command.local" },
  { name: "Priya Nair", email: "priya@command.local" },
  { name: "Vikram Joshi", email: "vikram@command.local" },
  { name: "Neha Reddy", email: "neha@command.local" },
  { name: "Aditya Menon", email: "aditya@command.local" },
];

function searchBlob(...parts) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export async function seedIfEmpty() {
  if (process.env.SEED_ON_START === "false") return;
  const count = await User.countDocuments();
  if (count > 0) return;

  const passwordHash = await bcrypt.hash("command123", 10);
  const engineerHash = await bcrypt.hash("engineer123", 10);

  const commanders = await User.create(
    COMMANDERS.map((row) => ({ ...row, passwordHash, role: "commander" }))
  );
  const engineers = await User.create(
    ENGINEERS.map((row) => ({ ...row, passwordHash: engineerHash, role: "engineer" }))
  );

  const [maya, kabir, ananya, rohan, sneha] = commanders;
  const [arjun, priya, vikram, neha, aditya] = engineers;

  async function addIncident({
    title,
    description,
    severity,
    status = "open",
    creator,
    assignee = null,
    reassignmentRequested = false,
    resolvedBy = null,
    resolutionSummary = "",
    events = [],
  }) {
    const incident = await Incident.create({
      title,
      description,
      severity,
      severityRank: severityRank(severity),
      status,
      createdBy: creator._id,
      assignee: assignee?._id ?? null,
      reassignmentRequested,
      resolvedBy: resolvedBy?._id ?? null,
      resolutionSummary,
      searchText: searchBlob(title, description, resolutionSummary),
    });

    await IncidentEvent.create(
      events.map((e) => ({
        incident: incident._id,
        type: e.type,
        message: e.message,
        author: e.author,
      }))
    );
    return incident;
  }

  await addIncident({
    title: "Checkout 500s on /pay",
    description:
      "Customers cannot complete payment. Error rate jumped after the 14:10 deploy of payments-api.",
    severity: "SEV-1",
    status: "acknowledged",
    creator: maya,
    assignee: arjun,
    events: [
      { type: "created", message: "Opened as SEV-1: Checkout 500s on /pay", author: maya._id },
      { type: "assigned", message: `${maya.name} assigned this to ${arjun.name} at SEV-1`, author: maya._id },
      { type: "status", message: `${arjun.name} marked this acknowledged`, author: arjun._id },
      {
        type: "comment",
        message:
          "Reproduced on staging. Errors are timeouts to the card processor, not our 4xx validation.",
        author: arjun._id,
      },
    ],
  });

  await addIncident({
    title: "Search latency above 2s",
    description: "Catalog search p95 is 2.4s in APAC. Index lag suspected after the catalog deploy.",
    severity: "SEV-2",
    creator: kabir,
    assignee: priya,
    events: [
      { type: "created", message: "Opened as SEV-2: Search latency above 2s", author: kabir._id },
      { type: "assigned", message: `${kabir.name} assigned this to ${priya.name} at SEV-2`, author: kabir._id },
    ],
  });

  await addIncident({
    title: "Push notifications delayed 15+ minutes",
    description: "iOS and Android workers are backing up. Queue depth climbing since 09:40.",
    severity: "SEV-2",
    status: "mitigated",
    creator: ananya,
    assignee: vikram,
    events: [
      {
        type: "created",
        message: "Opened as SEV-2: Push notifications delayed 15+ minutes",
        author: ananya._id,
      },
      { type: "assigned", message: `${ananya.name} assigned this to ${vikram.name} at SEV-2`, author: ananya._id },
      { type: "status", message: `${vikram.name} marked this acknowledged`, author: vikram._id },
      {
        type: "status",
        message: `${vikram.name} marked this mitigated — scaled workers 4 → 12. Queue draining.`,
        author: vikram._id,
      },
    ],
  });

  await addIncident({
    title: "Admin CSV export times out",
    description: "Exports over ~50k rows hit the 30s gateway timeout. Finance cannot close the week.",
    severity: "SEV-3",
    creator: rohan,
    assignee: neha,
    reassignmentRequested: true,
    events: [
      { type: "created", message: "Opened as SEV-3: Admin CSV export times out", author: rohan._id },
      { type: "assigned", message: `${rohan.name} assigned this to ${neha.name} at SEV-3`, author: rohan._id },
      {
        type: "comment",
        message: "Looks like a sync query on the reporting replica, not the UI.",
        author: neha._id,
      },
      {
        type: "reassignment_requested",
        message:
          "Handoff: timeout is in the export worker. I am on another SEV-2 and cannot finish this today. Next person should check reporting replica lag and the 30s gateway.",
        author: neha._id,
      },
    ],
  });

  await addIncident({
    title: "Stale prices on category pages",
    description: "Cache TTL looks wrong after the catalog deploy. Merchandising is reporting wrong sale tags.",
    severity: "SEV-3",
    creator: sneha,
    assignee: aditya,
    events: [
      { type: "created", message: "Opened as SEV-3: Stale prices on category pages", author: sneha._id },
      { type: "assigned", message: `${sneha.name} assigned this to ${aditya.name} at SEV-3`, author: sneha._id },
    ],
  });

  await addIncident({
    title: "SSO login loop for partner accounts",
    description: "A subset of SAML partners bounce between IdP and /login. Not all tenants.",
    severity: "SEV-2",
    creator: maya,
    events: [{ type: "created", message: "Opened as SEV-2: SSO login loop for partner accounts", author: maya._id }],
  });

  const cookieSummary =
    "What happened: SameSite=None was missing on the session cookie.\nWhat we did: Set SameSite=None; Secure on the auth cookie and redeployed.\nOutcome: Safari login holds a session; resolved.";

  await addIncident({
    title: "Auth cookie not set on Safari",
    description: "Login succeeded but session cookie was missing on Safari 18.",
    severity: "SEV-2",
    status: "resolved",
    creator: kabir,
    assignee: priya,
    resolvedBy: priya,
    resolutionSummary: cookieSummary,
    events: [
      { type: "created", message: "Opened as SEV-2: Auth cookie not set on Safari", author: kabir._id },
      { type: "assigned", message: `${kabir.name} assigned this to ${priya.name} at SEV-2`, author: kabir._id },
      { type: "resolved", message: cookieSummary, author: priya._id },
    ],
  });

  const smsSummary =
    "What happened: Twilio account hit a geographic permission block.\nWhat we did: Enabled India + US destinations and retried the drill.\nOutcome: SMS delivered. Runbook updated.";

  await addIncident({
    title: "On-call SMS not delivering",
    description: "Pager SMS via Twilio failed for two commanders during last night's drill.",
    severity: "SEV-3",
    status: "resolved",
    creator: ananya,
    assignee: aditya,
    resolvedBy: aditya,
    resolutionSummary: smsSummary,
    events: [
      { type: "created", message: "Opened as SEV-3: On-call SMS not delivering", author: ananya._id },
      { type: "assigned", message: `${ananya.name} assigned this to ${aditya.name} at SEV-3`, author: ananya._id },
      { type: "resolved", message: smsSummary, author: aditya._id },
    ],
  });

  console.log("Seeded 5 commanders + 5 engineers and sample incidents");
  console.log("  Commanders: maya, kabir, ananya, rohan, sneha @command.local / command123");
  console.log("  Engineers:  arjun, priya, vikram, neha, aditya @command.local / engineer123");
}
