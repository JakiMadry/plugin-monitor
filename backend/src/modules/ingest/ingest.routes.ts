import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { requirePluginSecret } from "../auth/auth.middleware.js";
import { shops } from "../../db/schema.js";

interface IngestEvent {
  type: string;
  source?: string;
  message: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

interface IngestBatchBody {
  shopDomain: string;
  pluginVersion?: string;
  platform: string;
  phpVersion?: string;
  events: IngestEvent[];
}

/**
 * Find or auto-create shop by domain + platform.
 */
async function resolveShop(fastify: FastifyInstance, domain: string, platform: string) {
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "").toLowerCase();

  // Check Redis cache first
  const cacheKey = `shop:${cleanDomain}:${platform}`;
  const cached = await fastify.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Lookup in DB
  let [shop] = await fastify.db
    .select()
    .from(shops)
    .where(eq(shops.domain, cleanDomain))
    .limit(1);

  // Auto-register if new
  if (!shop) {
    [shop] = await fastify.db
      .insert(shops)
      .values({
        name: cleanDomain,
        domain: cleanDomain,
        platform,
        apiKey: `auto_${cleanDomain}_${Date.now()}`,
      })
      .returning();
  }

  // Cache for 10 minutes
  await fastify.redis.setex(cacheKey, 600, JSON.stringify(shop));
  return shop;
}

export async function ingestRoutes(fastify: FastifyInstance) {
  // Main batch ingest endpoint
  fastify.post<{ Body: IngestBatchBody }>(
    "/api/ingest/batch",
    {
      preHandler: requirePluginSecret,
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: {
          type: "object",
          required: ["shopDomain", "platform", "events"],
          properties: {
            shopDomain: { type: "string" },
            pluginVersion: { type: "string" },
            platform: { type: "string" },
            phpVersion: { type: "string" },
            events: {
              type: "array",
              maxItems: 100,
              items: {
                type: "object",
                required: ["type", "message", "occurredAt"],
                properties: {
                  type: { type: "string" },
                  source: { type: "string" },
                  message: { type: "string" },
                  stackTrace: { type: "string" },
                  metadata: { type: "object" },
                  occurredAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { shopDomain, pluginVersion, platform, phpVersion, events } = request.body;
      const shop = await resolveShop(fastify, shopDomain, platform);

      if (!shop.isActive) {
        return reply.status(403).send({ error: "Shop is deactivated" });
      }

      // Queue the batch for async processing
      await fastify.queues.ingest.add("processBatch", {
        shopId: shop.id,
        shopName: shop.name,
        shopDomain,
        pluginVersion,
        platform,
        phpVersion,
        events,
        receivedAt: new Date().toISOString(),
      });

      reply.status(202).send({ accepted: events.length });
    }
  );

  // Register endpoint (plugin activation heartbeat)
  fastify.post<{
    Body: {
      shopDomain: string;
      platform: string;
      pluginVersion?: string;
      phpVersion?: string;
    };
  }>(
    "/api/ingest/register",
    {
      preHandler: requirePluginSecret,
      schema: {
        body: {
          type: "object",
          required: ["shopDomain", "platform"],
          properties: {
            shopDomain: { type: "string" },
            platform: { type: "string" },
            pluginVersion: { type: "string" },
            phpVersion: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const shop = await resolveShop(fastify, request.body.shopDomain, request.body.platform);

      // Queue a heartbeat event
      await fastify.queues.ingest.add("processBatch", {
        shopId: shop.id,
        shopName: shop.name,
        shopDomain: request.body.shopDomain,
        pluginVersion: request.body.pluginVersion,
        platform: request.body.platform,
        phpVersion: request.body.phpVersion,
        events: [
          {
            type: "info",
            source: "plugin",
            message: "Plugin activated - registration",
            metadata: {
              pluginVersion: request.body.pluginVersion,
              phpVersion: request.body.phpVersion,
            },
            occurredAt: new Date().toISOString(),
          },
        ],
        receivedAt: new Date().toISOString(),
      });

      reply.status(201).send({ registered: true, shopId: shop.id });
    }
  );
}
