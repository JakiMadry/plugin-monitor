import type { FastifyInstance } from "fastify";
import { eq, sql, desc, and } from "drizzle-orm";
import {
  shops,
  paywallEvents,
  pluginEvents,
  hazardAlerts,
} from "../../db/schema.js";
import { requireJwt } from "../auth/auth.middleware.js";

export async function queryRoutes(fastify: FastifyInstance) {
  // Cross-section overview for a single shop
  fastify.get<{ Params: { id: string } }>(
    "/api/dashboard/query/shop/:id",
    { preHandler: requireJwt },
    async (request, reply) => {
      const shopId = request.params.id;

      // Verify shop exists
      const [shop] = await fastify.db
        .select()
        .from(shops)
        .where(eq(shops.id, shopId))
        .limit(1);

      if (!shop) return reply.status(404).send({ error: "Shop not found" });

      // Run all queries in parallel
      const [
        recentPaywall,
        recentErrors,
        activeHazardAlerts,
        paywallStats,
        errorStats,
      ] = await Promise.all([
        // Last 10 paywall events
        fastify.db
          .select()
          .from(paywallEvents)
          .where(eq(paywallEvents.shopId, shopId))
          .orderBy(desc(paywallEvents.occurredAt))
          .limit(10),

        // Last 10 plugin events
        fastify.db
          .select()
          .from(pluginEvents)
          .where(eq(pluginEvents.shopId, shopId))
          .orderBy(desc(pluginEvents.occurredAt))
          .limit(10),

        // Active hazard alerts
        fastify.db
          .select()
          .from(hazardAlerts)
          .where(
            and(
              eq(hazardAlerts.shopId, shopId),
              eq(hazardAlerts.status, "active")
            )
          ),

        // Paywall stats (last 24h)
        fastify.db
          .select({
            eventType: paywallEvents.eventType,
            count: sql<number>`count(*)::int`,
          })
          .from(paywallEvents)
          .where(
            and(
              eq(paywallEvents.shopId, shopId),
              sql`${paywallEvents.occurredAt} > now() - interval '24 hours'`
            )
          )
          .groupBy(paywallEvents.eventType),

        // Error stats (last 24h)
        fastify.db
          .select({
            severity: pluginEvents.severity,
            count: sql<number>`count(*)::int`,
            unread: sql<number>`count(*) filter (where ${pluginEvents.isRead} = false)::int`,
          })
          .from(pluginEvents)
          .where(
            and(
              eq(pluginEvents.shopId, shopId),
              sql`${pluginEvents.occurredAt} > now() - interval '24 hours'`
            )
          )
          .groupBy(pluginEvents.severity),
      ]);

      return {
        shop: {
          id: shop.id,
          name: shop.name,
          domain: shop.domain,
          platform: shop.platform,
          isActive: shop.isActive,
          lastSeenAt: shop.lastSeenAt,
        },
        hazard: {
          activeAlerts: activeHazardAlerts,
        },
        paywall: {
          recentEvents: recentPaywall,
          stats24h: paywallStats,
        },
        errors: {
          recentEvents: recentErrors,
          stats24h: errorStats,
        },
      };
    }
  );
}
