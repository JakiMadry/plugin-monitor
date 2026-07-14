import type { FastifyInstance } from "fastify";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";
import { paywallEvents, shops } from "../../db/schema.js";
import { requireJwt } from "../auth/auth.middleware.js";

export async function paywallRoutes(fastify: FastifyInstance) {
  // List paywall events (paginated, filterable)
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      shopId?: string;
      eventType?: string;
      from?: string;
      to?: string;
    };
  }>(
    "/api/dashboard/paywall/events",
    { preHandler: requireJwt },
    async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = Math.min(parseInt(request.query.limit || "50", 10), 200);
      const offset = (page - 1) * limit;

      const conditions = [];
      if (request.query.shopId) conditions.push(eq(paywallEvents.shopId, request.query.shopId));
      if (request.query.eventType) conditions.push(eq(paywallEvents.eventType, request.query.eventType));
      if (request.query.from) conditions.push(gte(paywallEvents.occurredAt, new Date(request.query.from)));
      if (request.query.to) conditions.push(lte(paywallEvents.occurredAt, new Date(request.query.to)));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await fastify.db
        .select({ count: sql<number>`count(*)` })
        .from(paywallEvents)
        .where(where);

      const events = await fastify.db
        .select({
          id: paywallEvents.id,
          shopId: paywallEvents.shopId,
          shopName: shops.name,
          eventType: paywallEvents.eventType,
          payload: paywallEvents.payload,
          occurredAt: paywallEvents.occurredAt,
          receivedAt: paywallEvents.receivedAt,
        })
        .from(paywallEvents)
        .innerJoin(shops, eq(paywallEvents.shopId, shops.id))
        .where(where)
        .orderBy(desc(paywallEvents.occurredAt))
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

  // Aggregated stats
  fastify.get<{
    Querystring: { shopId?: string; from?: string; to?: string };
  }>(
    "/api/dashboard/paywall/stats",
    { preHandler: requireJwt },
    async (request) => {
      const conditions = [];
      if (request.query.shopId) conditions.push(eq(paywallEvents.shopId, request.query.shopId));
      if (request.query.from) conditions.push(gte(paywallEvents.occurredAt, new Date(request.query.from)));
      if (request.query.to) conditions.push(lte(paywallEvents.occurredAt, new Date(request.query.to)));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const stats = await fastify.db
        .select({
          eventType: paywallEvents.eventType,
          count: sql<number>`count(*)`,
          lastOccurred: sql<string>`max(${paywallEvents.occurredAt})`,
        })
        .from(paywallEvents)
        .where(where)
        .groupBy(paywallEvents.eventType);

      return stats;
    }
  );
}
