import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import debug from "debug";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth";
import jobRoutes from "./routes/job";
import companyRoutes from "./routes/company";
import applicationRoutes from "./routes/application";
import seoRoutes from "./routes/seo";
import openapiRoutes from "./routes/openapi";
import notificationRoutes from "./routes/notification";
import paymentsRoutes from "./routes/payments";
import aiRoutes from "./routes/ai";
import adminRoutes from "./routes/admin";
import sourceAdminRoutes from "./routes/source";
import userRoutes from './routes/user';
import skillsRoutes from './routes/skills';
import profileFieldsRoutes from './routes/profileFields';

dotenv.config();
const log = debug("jobintel:server");

const app = express();
// Configure CORS: set CORS_ORIGIN env (comma-separated) in production for stricter security
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  // Normalize configured origins: trim whitespace and remove any trailing slashes
  const origins = corsOrigin
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  // Add a lightweight middleware that always sets the CORS headers for allowed origins.
  // This avoids throwing an error during the CORS check which resulted in 500 responses.
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    const originNorm = origin ? origin.replace(/\/$/, '') : undefined;
    if (origin && (origin === '*' || (originNorm && origins.includes(originNorm)))) {
      res.setHeader('Access-Control-Allow-Origin', origin === '*' ? '*' : origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    // Handle preflight early so the browser sees the headers on OPTIONS
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Use cors() with a permissive callback (do not throw errors) so requests from disallowed origins fail gracefully without 500
  app.use(cors({
    origin: (origin, callback) => {
      // Allow non-browser requests with no origin (curl, server-to-server)
      if (!origin) return callback(null, true);
      const originNorm = (origin as string).replace(/\/$/, '');
      if (origin === '*' || origins.includes(originNorm)) return callback(null, true);
      // Deny cross-origin requests silently (no exception)
      return callback(null, false);
    },
    credentials: true,
  }));
} else {
  // Default to permissive for local dev
  app.use(cors());
}
// Capture raw body for webhook signature verification
app.use(express.json({ verify: (req: any, _res, buf: Buffer, _encoding) => {
  // store raw body string for use in webhook verification
  req.rawBody = buf && buf.toString();
}}));

app.get("/api/health", async (_req, res) => {
  // Basic healthy probe
  const ok: any = { service: "jobscout-backend", status: "ok" };

  // Check MongoDB connection state (0 = disconnected, 1 = connected)
  try {
    // lazy require to avoid unnecessary import order issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mongoose = require('mongoose');
    const ready = mongoose.connection && mongoose.connection.readyState === 1;
    ok.mongo = ready ? 'connected' : 'disconnected';
    if (!ready) ok.status = 'degraded';
  } catch (e) {
    ok.mongo = 'unknown';
    ok.status = 'degraded';
  }

  // Check Redis if configured
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    const client = new Redis(process.env.REDIS_URL || undefined);
    // attempt a ping with timeout
    const ping = await Promise.race([
      client.ping(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1000)),
    ]);
    ok.redis = ping === 'PONG' ? 'connected' : 'unknown';
    await client.disconnect();
  } catch (e) {
    // If no REDIS_URL set, that's acceptable — mark as optional
    ok.redis = process.env.REDIS_URL ? 'disconnected' : 'not-configured';
    if (ok.redis === 'disconnected') ok.status = 'degraded';
  }

  const statusCode = ok.status === 'ok' ? 200 : 503;
  return res.status(statusCode).json(ok);
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/docs", openapiRoutes);
app.use(seoRoutes);
app.use("/api/notifications", notificationRoutes);app.use('/api/payments', paymentsRoutes);app.use('/api/admin', sourceAdminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile-fields', profileFieldsRoutes);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "";

(async () => {
  try {
    await connectDB(MONGODB_URI);
    log("DB connected");
  } catch (err) {
    console.warn("Failed to connect to DB (continuing in degraded mode):", err?.message || err);
  }

  app.listen(PORT, () => {
    log(`Backend listening on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);

    // Log SMTP status (do not print secret)
    const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
    console.log('SMTP configured:', smtpConfigured ? `yes (${process.env.SMTP_USER})` : 'no');
  });
})();
