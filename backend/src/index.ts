import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import databasePlugin from "./plugins/database.js";
import redisPlugin from "./plugins/redis.js";
import queuePlugin from "./plugins/queue.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { shopRoutes } from "./modules/shops/shops.routes.js";
import { ingestRoutes } from "./modules/ingest/ingest.routes.js";
import { hazardRoutes } from "./modules/hazard/hazard.routes.js";
import { paywallRoutes } from "./modules/paywall/paywall.routes.js";
import { errorsRoutes } from "./modules/errors/errors.routes.js";
import { userRoutes } from "./modules/auth/users.routes.js";
import { notificationRoutes } from "./modules/notifications/notifications.routes.js";
import { queryRoutes } from "./modules/query/query.routes.js";

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === "development" ? "debug" : "info",
    ...(config.nodeEnv === "development" && {
      transport: { target: "pino-pretty" },
    }),
  },
});

// ─── Plugins ────────────────────────────────────────────

await fastify.register(cors, {
  origin: config.nodeEnv === "development"
    ? true
    : [process.env.FRONTEND_URL || "http://localhost:3000"].filter(Boolean),
  credentials: true,
});

await fastify.register(cookie);

await fastify.register(rateLimit, {
  global: false,
});

await fastify.register(jwt, {
  secret: config.jwt.secret,
  cookie: { cookieName: "token", signed: false },
});

// Register XML content type parser for hazard push
fastify.addContentTypeParser(
  ["application/xml", "text/xml"],
  { parseAs: "string" },
  (_req, body, done) => {
    done(null, body);
  }
);

await fastify.register(databasePlugin);
await fastify.register(redisPlugin);
await fastify.register(queuePlugin);

// ─── Routes ─────────────────────────────────────────────

await fastify.register(authRoutes);
await fastify.register(shopRoutes);
await fastify.register(ingestRoutes);
await fastify.register(hazardRoutes);
await fastify.register(paywallRoutes);
await fastify.register(errorsRoutes);
await fastify.register(userRoutes);
await fastify.register(notificationRoutes);
await fastify.register(queryRoutes);

// ─── Health check ───────────────────────────────────────

fastify.get("/api/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

// ─── Start ──────────────────────────────────────────────

try {
  await fastify.listen({ port: config.port, host: config.host });
  fastify.log.info(`Server running on ${config.host}:${config.port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
