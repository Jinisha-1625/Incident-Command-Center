import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { workload } from "@/api/userApi";
import { useAuth } from "@/context/AuthContext";

const SEVS = ["SEV-1", "SEV-2", "SEV-3", "SEV-4"];

export function AssignForm({ incident, onSubmit, mode }) {
  const { token } = useAuth();
  const [people, setPeople] = useState([]);
  const [assigneeId, setAssigneeId] = useState(incident.assignee ? "" : incident.assignee?.id || "");
  const [severity, setSeverity] = useState(incident.severity || "SEV-2");
  const [handoffSummary, setHandoff] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const isReassign = mode === "reassign" || Boolean(incident.assignee);

  useEffect(() => {
    let cancelled = false;
    workload(token)
      .then((data) => {
        if (!cancelled) setPeople(data.people);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit({
        assigneeId,
        severity,
        handoffSummary: isReassign ? handoffSummary : undefined,
        expectedOpenCount: people.find((p) => p.id === assigneeId)?.openCount ?? 0,
      });
      setHandoff("");
    } catch (err) {
      setError(err.message);
      workload(token)
        .then((data) => setPeople(data.people))
        .catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold text-white">
        {isReassign ? "Reassign (handoff required)" : "Assign and set severity"}
      </h3>
      <p className="text-xs text-slate-500">
        Severity is set by the commander who assigns. Use open vs resolved counts so you do not overload one person.
        If another commander just assigned this person, you will be asked to reload.
      </p>
      {loadError && <p className="text-sm text-red-400">{loadError}</p>}
      <div className="space-y-1">
        <Label htmlFor="assignee">Person</Label>
        <select
          id="assignee"
          required
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
        >
          <option value="">Select someone…</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.role} · solving {p.openCount} · solved {p.resolvedCount}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="severity">Severity</Label>
        <select
          id="severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
        >
          {SEVS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {isReassign && (
        <div className="space-y-1">
          <Label htmlFor="handoff">Handoff from the previous owner</Label>
          <Textarea
            id="handoff"
            required
            value={handoffSummary}
            onChange={(e) => setHandoff(e.target.value)}
            placeholder="What was tried, what is still broken, where to look next"
          />
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading || !assigneeId}>
        {loading ? "Saving…" : isReassign ? "Reassign" : "Assign"}
      </Button>
    </form>
  );
}
