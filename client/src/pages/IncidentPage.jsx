import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addComment,
  assignIncident,
  getIncident,
  reassignIncident,
  requestReassignment,
  resolveIncident,
  updateEvent,
  updateStatus,
} from "@/api/incidentApi";
import { AssignForm } from "@/components/AssignForm";
import { Navbar } from "@/components/Navbar";
import { RequestReassignmentForm } from "@/components/RequestReassignmentForm";
import { ResolveForm } from "@/components/ResolveForm";
import { ReassignmentBadge, SeverityBadge, StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";

export function IncidentPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState("");

  async function refresh() {
    const next = await getIncident(token, id);
    setData(next);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getIncident(token, id)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const incident = data?.incident;
  const isAssignee = incident?.assignee?.id === user.id;
  const requested = Boolean(incident?.reassignmentRequested);
  const canResolve =
    incident &&
    incident.status !== "resolved" &&
    (user.role === "commander" || (isAssignee && !requested));
  const open = incident && incident.status !== "resolved";
  const canAckMitigate = open && isAssignee && !requested;

  async function run(fn) {
    setActionError("");
    try {
      await fn();
      await refresh();
    } catch (err) {
      setActionError(err.message);
      try {
        await refresh();
      } catch {
        /* keep the action error */
      }
    }
  }

  return (
    <div className="min-h-svh">
      <Navbar />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Link to="/" className="text-sm text-sky-400 hover:underline">
            ← Board
          </Link>
          {loading && <p className="mt-6 text-slate-400">Loading incident…</p>}
          {error && <p className="mt-6 text-red-400">{error}</p>}
          {incident && (
            <>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-2xl font-semibold text-white">{incident.title}</h1>
                <div className="flex flex-wrap gap-2">
                  {requested && <ReassignmentBadge />}
                  <SeverityBadge severity={incident.severity} />
                  <StatusBadge status={incident.status} />
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-400">{incident.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                Assignee: {incident.assignee?.name || "Unassigned"} ({incident.assignee?.role || "—"})
              </p>

              {actionError && <p className="mt-3 text-sm text-red-400">{actionError}</p>}

              {canAckMitigate && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {incident.status === "open" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        run(() => updateStatus(token, id, "acknowledged", incident.lockVersion))
                      }
                    >
                      Acknowledge
                    </Button>
                  )}
                  {incident.status === "acknowledged" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        run(() => updateStatus(token, id, "mitigated", incident.lockVersion))
                      }
                    >
                      Mark mitigated
                    </Button>
                  )}
                </div>
              )}

              <section className="mt-8">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Timeline
                </h2>
                <Timeline
                  events={data.events}
                  currentUserId={user.id}
                  onEdit={(eventId, message) =>
                    run(() => updateEvent(token, id, eventId, { message }))
                  }
                  onHide={(eventId) => run(() => updateEvent(token, id, eventId, { hidden: true }))}
                />
              </section>

              {open && (
                <form
                  className="mt-8 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      await addComment(token, id, comment);
                      setComment("");
                    });
                  }}
                >
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Progress update for everyone watching this incident"
                  />
                  <Button type="submit" variant="secondary" disabled={!comment.trim()}>
                    Post update
                  </Button>
                </form>
              )}
            </>
          )}
        </div>

        {incident && (
          <aside className="space-y-6">
            {open && user.role === "commander" && (
              <Card className="p-4">
                {requested && (
                  <p className="mb-3 text-xs text-amber-300">
                    Assignee requested reassignment. Copy their handoff from the timeline into the
                    box below (no auto-fill).
                  </p>
                )}
                <AssignForm
                  incident={incident}
                  onSubmit={async (body) => {
                    const payload = { ...body, lockVersion: incident.lockVersion };
                    if (incident.assignee) {
                      await reassignIncident(token, id, payload);
                    } else {
                      await assignIncident(token, id, payload);
                    }
                    await refresh();
                  }}
                />
              </Card>
            )}
            {open && isAssignee && !requested && (
              <Card className="p-4">
                <RequestReassignmentForm
                  onSubmit={async ({ handoffSummary }) => {
                    await requestReassignment(token, id, {
                      handoffSummary,
                      lockVersion: incident.lockVersion,
                    });
                    await refresh();
                  }}
                />
              </Card>
            )}
            {open && canResolve && (
              <Card className="p-4">
                <ResolveForm
                  onSubmit={async (body) => {
                    await resolveIncident(token, id, {
                      ...body,
                      lockVersion: incident.lockVersion,
                    });
                    await refresh();
                  }}
                />
              </Card>
            )}
            {!open && incident.resolutionSummary && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-white">Resolution summary</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                  {incident.resolutionSummary}
                </p>
              </Card>
            )}
            {user.role !== "commander" && open && (
              <p className="text-xs text-slate-500">
                Only a commander can change assignee and severity.
                {isAssignee && requested
                  ? " You requested reassignment — you can still post comments."
                  : isAssignee
                    ? " You can acknowledge, mitigate, request reassignment, or resolve."
                    : " You can post timeline updates."}
              </p>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
