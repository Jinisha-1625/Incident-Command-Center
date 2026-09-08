import { Router } from "express";
import {
  addComment,
  assignIncident,
  createIncident,
  getIncident,
  hideOrEditEvent,
  listIncidents,
  reassignIncident,
  requestReassignment,
  resolveIncident,
  updateStatus,
} from "../controllers/incidentController.js";
import { requireAuth, requireCommander } from "../middleware/auth.js";

export const incidentRoutes = Router();

incidentRoutes.use(requireAuth);

incidentRoutes.post("/", createIncident);
incidentRoutes.get("/", listIncidents);
incidentRoutes.get("/:id", getIncident);
incidentRoutes.patch("/:id/assign", requireCommander, assignIncident);
incidentRoutes.patch("/:id/reassign", requireCommander, reassignIncident);
incidentRoutes.post("/:id/request-reassignment", requestReassignment);
incidentRoutes.post("/:id/events", addComment);
incidentRoutes.patch("/:id/events/:eventId", hideOrEditEvent);
incidentRoutes.patch("/:id/status", updateStatus);
incidentRoutes.patch("/:id/resolve", resolveIncident);
