import { Badge } from "@/components/ui/badge";

const sevTone = { "SEV-1": "sev1", "SEV-2": "sev2", "SEV-3": "sev3", "SEV-4": "sev4" };

export function StatusBadge({ status }) {
  return <Badge tone={status}>{status}</Badge>;
}

export function ReassignmentBadge() {
  return <Badge tone="request">Reassignment requested</Badge>;
}

export function SeverityBadge({ severity }) {
  return <Badge tone={sevTone[severity] || "sev4"}>{severity}</Badge>;
}
