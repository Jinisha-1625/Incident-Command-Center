import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { httpError } from "../utils/httpError.js";

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw httpError(401, "Login required");
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw httpError(401, "Session expired or invalid. Please log in again.");
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw httpError(401, "Account no longer exists");
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireCommander(req, _res, next) {
  if (req.user?.role !== "commander") {
    next(httpError(403, "Only a commander can assign, reassign, or set severity"));
    return;
  }
  next();
}
