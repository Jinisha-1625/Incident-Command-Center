import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { connectDb } from "./config/db.js";
import { authRoutes } from "./routes/authRoutes.js";
import { incidentRoutes } from "./routes/incidentRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { seedIfEmpty } from "./seed.js";
import { HttpError } from "./utils/httpError.js";

process.env.JWT_SECRET ||= "dev-only-change-me";
const PORT = Number(process.env.PORT) || 38471;

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html><body style="font-family:sans-serif;padding:2rem">
  <p>This is the <strong>API</strong>, not the website.</p>
  <p>Open the UI at <a href="http://127.0.0.1:38472">http://127.0.0.1:38472</a></p>
  <p>Health: <a href="/api/health">/api/health</a></p>
</body></html>`);
});

app.get("/api/health", (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  res.json({
    ok: true,
    service: "incident-command-center",
    mongoReady,
    api: `http://127.0.0.1:${PORT}`,
    website: "http://127.0.0.1:38472",
  });
});

app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: "Database is still starting. Wait a few seconds and try again." });
    return;
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/incidents", incidentRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

app.use((err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || "Server error";
  if (err.code === 11000) {
    status = 409;
    message = "That email is already registered";
  }
  if (err.name === "CastError") {
    status = 404;
    message = "Not found";
  }
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API http://127.0.0.1:${PORT}`);
  console.log(`Health http://127.0.0.1:${PORT}/api/health`);
  console.log(`Website http://127.0.0.1:38472`);
  connectDb()
    .then(() => seedIfEmpty())
    .catch((err) => {
      console.error("MongoDB failed to start:", err);
    });
});

export { HttpError };
