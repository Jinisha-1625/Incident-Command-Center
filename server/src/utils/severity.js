export const SEVERITIES = ["SEV-1", "SEV-2", "SEV-3", "SEV-4"];

export function severityRank(severity) {
  const rank = { "SEV-1": 1, "SEV-2": 2, "SEV-3": 3, "SEV-4": 4 };
  return rank[severity] ?? 99;
}

import { httpError } from "./httpError.js";

export function assertSeverity(severity) {
  if (!SEVERITIES.includes(severity)) {
    throw httpError(400, "Severity must be SEV-1, SEV-2, SEV-3, or SEV-4");
  }
}
