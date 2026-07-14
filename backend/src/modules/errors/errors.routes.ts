import type { FastifyInstance } from "fastify";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";
import { pluginEvents, shops } from "../../db/schema.js";
import { requireJwt } from "../auth/auth.middleware.js";

export async function errorsRoutes(fastify: FastifyInstance) {
  // List plugin events (paginated, filterable)
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      shopId?: string;
      severity?: string;
      from?: string;
      to?: string;
    };
  }>(
    "/api/dashboard/errors/events",
    { preHandler: requireJwt },
    async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = Math.min(parseInt(request.query.limit || "50", 10), 200);
      const offset = (page - 1) * limit;

      const conditions = [];
      if (request.query.shopId) conditions.push(eq(pluginEvents.shopId, request.query.shopId));
      if (request.query.severity) conditions.push(eq(pluginEvents.severity, request.query.severity));
      if (request.query.from) conditions.push(gte(pluginEvents.occurredAt, new Date(request.query.from)));
      if (request.query.to) conditions.push(lte(pluginEvents.occurredAt, new Date(request.query.to)));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await fastify.db
        .select({ count: sql<number>`count(*)` })
        .from(pluginEvents)
        .where(where);

      const events = await fastify.db
        .select({
          id: pluginEvents.id,
          shopId: pluginEvents.shopId,
          shopName: shops.name,
          severity: pluginEvents.severity,
          source: pluginEvents.source,
          message: pluginEvents.message,
          stackTrace: pluginEvents.stackTrace,
          metadata: pluginEvents.metadata,
          occurredAt: pluginEvents.occurredAt,
          receivedAt: pluginEvents.receivedAt,
          isRead: pluginEvents.isRead,
        })
        .from(pluginEvents)
        .innerJoin(shops, eq(pluginEvents.shopId, shops.id))
        .where(where)
        .orderBy(desc(pluginEvents.occurredAt))
        .limit(limit)
        .offset(offset);

      return {
        data: events,
        pagination: {
          page,
          limit,
          total: Number(countResult.count),
          totalPages: Math.ceil(Number(countResult.count) / limit),
        },
      };
    }
  );

  // Mark event as read
  fastify.patch<{ Params: { id: string } }>(
    "/api/dashboard/errors/events/:id/read",
    { preHandler: requireJwt },
    async (request, reply) => {
      const [event] = await fastify.db
        .update(pluginEvents)
        .set({ isRead: true })
        .where(eq(pluginEvents.id, request.params.id))
        .returning();

      if (!event) return reply.status(404).send({ error: "Event not found" });
      return { ok: true };
    }
  );

  // Error stats (counts by severity)
  fastify.get<{
    Querystring: { shopId?: string; from?: string; to?: string };
  }>(
    "/api/dashboard/errors/stats",
    { preHandler: requireJwt },
    async (request) => {
      const conditions = [];
      if (request.query.shopId) conditions.push(eq(pluginEvents.shopId, request.query.shopId));
      if (request.query.from) conditions.push(gte(pluginEvents.occurredAt, new Date(request.query.from)));
      if (request.query.to) conditions.push(lte(pluginEvents.occurredAt, new Date(request.query.to)));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const stats = await fastify.db
        .select({
          severity: pluginEvents.severity,
          count: sql<number>`count(*)`,
          unread: sql<number>`count(*) FILTER (WHERE ${pluginEvents.isRead} = false)`,
        })
        .from(pluginEvents)
        .where(where)
        .groupBy(pluginEvents.severity);

      return stats;
    }
  );
}
