import { Link } from "react-router-dom";
import { ReassignmentBadge, SeverityBadge, StatusBadge } from "@/components/StatusBadge";

export function IncidentCard({ incident }) {
  return (
    <Link
      to={`/incidents/${incident.id}`}
      className="block rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-sky-700 hover:bg-slate-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{incident.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">{incident.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {incident.reassignmentRequested && <ReassignmentBadge />}
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-500">
        Owner: {incident.assignee?.name || "Unassigned"} · {incident.assignee?.role || "—"}
      </div>
    </Link>
  );
}
