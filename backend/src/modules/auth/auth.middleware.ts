import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { shops } from "../../db/schema.js";
import { config } from "../../config.js";

// JWT auth for dashboard routes
export async function requireJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

// Role-based access
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireJwt(request, reply);
    if (reply.sent) return;

    const user = request.user as { role: string };
    if (!roles.includes(user.role)) {
      return reply.status(403).send({ error: "Forbidden" });
    }
  };
}

// Shared secret auth for plugin ingest routes
export async function requirePluginSecret(request: FastifyRequest, reply: FastifyReply) {
  const secret = request.headers["x-plugin-secret"] as string | undefined;
  if (!secret || secret !== config.pluginSecret) {
    return reply.status(401).send({ error: "Invalid plugin secret" });
  }
}
