import { api } from "./http";

export function listIncidents(token, { q, status, page } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (page) params.set("page", String(page));
  const qs = params.toString();
  return api(`/incidents${qs ? `?${qs}` : ""}`, { token });
}

export function getIncident(token, id) {
  return api(`/incidents/${id}`, { token });
}

export function createIncident(token, body) {
  return api("/incidents", { method: "POST", token, body });
}

export function assignIncident(token, id, body) {
  return api(`/incidents/${id}/assign`, { method: "PATCH", token, body });
}

export function reassignIncident(token, id, body) {
  return api(`/incidents/${id}/reassign`, { method: "PATCH", token, body });
}

export function requestReassignment(token, id, body) {
  return api(`/incidents/${id}/request-reassignment`, { method: "POST", token, body });
}

export function addComment(token, id, message) {
  return api(`/incidents/${id}/events`, { method: "POST", token, body: { message } });
}

export function updateEvent(token, incidentId, eventId, body) {
  return api(`/incidents/${incidentId}/events/${eventId}`, { method: "PATCH", token, body });
}

export function updateStatus(token, id, status, lockVersion) {
  return api(`/incidents/${id}/status`, { method: "PATCH", token, body: { status, lockVersion } });
}

export function resolveIncident(token, id, body) {
  return api(`/incidents/${id}/resolve`, { method: "PATCH", token, body });
}
