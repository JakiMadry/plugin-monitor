import type { FastifyInstance } from "fastify";
import { sql, like, desc } from "drizzle-orm";
import { hazardDomains } from "../../db/schema.js";
import { HazardService } from "./hazard.service.js";
import { requireJwt } from "../auth/auth.middleware.js";

export async function hazardRoutes(fastify: FastifyInstance) {
  const hazardService = new HazardService(fastify.db);

  // ─── PUSH endpoint (MF sends incremental updates) ─────
  fastify.post(
    "/api/hazard/push",
    {
      config: { rawBody: true },
    },
    async (request, reply) => {
      const xml = request.body as string;

      try {
        await hazardService.processIncrementalUpdate(xml);
      } catch (error) {
        fastify.log.error(error, "Failed to process hazard push");
        return reply.status(500).send();
      }

      reply.header("Rsh-Push", "accepted").status(200).send();
    }
  );

  // ─── Dashboard routes ─────────────────────────────────

  // List hazard domains (paginated + search)
  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string };
  }>(
    "/api/dashboard/hazard/domains",
    { preHandler: requireJwt },
    async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = Math.min(parseInt(request.query.limit || "50", 10), 200);
      const offset = (page - 1) * limit;
      const search = request.query.search;

      let query = fastify.db.select().from(hazardDomains);

      if (search) {
        query = query.where(like(hazardDomains.domain, `%${search}%`)) as any;
      }

      const [countResult] = await fastify.db
        .select({ count: sql<number>`count(*)` })
        .from(hazardDomains)
        .where(search ? like(hazardDomains.domain, `%${search}%`) : undefined);

      const domains = await (query as any)
        .orderBy(desc(hazardDomains.lp))
        .limit(limit)
        .offset(offset);

      return {
        data: domains,
        pagination: {
          page,
          limit,
          total: Number(countResult.count),
          totalPages: Math.ceil(Number(countResult.count) / limit),
        },
      };
    }
  );

  // Get alerts
  fastify.get<{
    Querystring: { shopId?: string };
  }>(
    "/api/dashboard/hazard/alerts",
    { preHandler: requireJwt },
    async (request) => {
      return hazardService.getAlerts(request.query.shopId);
    }
  );

  // Manual check trigger
  fastify.post(
    "/api/dashboard/hazard/check",
    { preHandler: requireJwt },
    async (_request, reply) => {
      await fastify.queues.hazardPull.add("fetchAndSyncRegistry", {
        manual: true,
        triggeredAt: new Date().toISOString(),
      });
      reply.send({ queued: true });
    }
  );

  // Sync log
  fastify.get(
    "/api/dashboard/hazard/sync-log",
    { preHandler: requireJwt },
    async () => {
      return hazardService.getSyncLog();
    }
  );

  // Status overview
  fastify.get(
    "/api/dashboard/hazard/status",
    { preHandler: requireJwt },
    async () => {
      const [domainCount] = await fastify.db
        .select({ count: sql<number>`count(*)` })
        .from(hazardDomains);

      const [activeCount] = await fastify.db
        .select({ count: sql<number>`count(*)` })
        .from(hazardDomains)
        .where(sql`date_removed IS NULL`);

      const alerts = await hazardService.getAlerts();

      const syncLog = await hazardService.getSyncLog(1);

      return {
        totalDomains: Number(domainCount.count),
        activeDomains: Number(activeCount.count),
        activeAlerts: alerts.filter((a: any) => a.status === "active").length,
        lastSync: syncLog[0] || null,
      };
    }
  );
}
