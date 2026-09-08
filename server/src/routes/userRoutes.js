import { Router } from "express";
import { listTeamWorkload } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

export const userRoutes = Router();

userRoutes.get("/workload", requireAuth, listTeamWorkload);
