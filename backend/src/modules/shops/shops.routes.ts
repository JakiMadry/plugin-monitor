import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { shops } from "../../db/schema.js";
import { requireJwt, requireRole } from "../auth/auth.middleware.js";

export async function shopRoutes(fastify: FastifyInstance) {
  // List all shops
  fastify.get("/api/dashboard/shops", { preHandler: requireJwt }, async () => {
    return fastify.db
      .select({
        id: shops.id,
        name: shops.name,
        domain: shops.domain,
        platform: shops.platform,
        isActive: shops.isActive,
        lastSeenAt: shops.lastSeenAt,
        lastDomainReported: shops.lastDomainReported,
        createdAt: shops.createdAt,
      })
      .from(shops)
      .orderBy(shops.name);
  });

  // Get single shop
  fastify.get<{ Params: { id: string } }>(
    "/api/dashboard/shops/:id",
    { preHandler: requireJwt },
    async (request, reply) => {
      const [shop] = await fastify.db
        .select()
        .from(shops)
        .where(eq(shops.id, request.params.id))
        .limit(1);

      if (!shop) return reply.status(404).send({ error: "Shop not found" });
      return shop;
    }
  );

  // Create shop (admin only)
  fastify.post<{
    Body: { name: string; domain: string; platform: string };
  }>(
    "/api/dashboard/shops",
    {
      preHandler: requireRole("admin"),
      schema: {
        body: {
          type: "object",
          required: ["name", "domain", "platform"],
          properties: {
            name: { type: "string", minLength: 1 },
            domain: { type: "string", minLength: 3 },
            platform: {
              type: "string",
              enum: ["woocommerce", "magento", "sylius", "prestashop"],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const apiKey = `pm_${uuidv4().replace(/-/g, "")}`;
      const domain = request.body.domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");

      const [shop] = await fastify.db
        .insert(shops)
        .values({
          name: request.body.name,
          domain,
          platform: request.body.platform,
          apiKey,
        })
        .returning();

      reply.status(201).send(shop);
    }
  );

  // Update shop (admin only)
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; domain?: string; platform?: string; isActive?: boolean };
  }>(
    "/api/dashboard/shops/:id",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (request.body.name) updates.name = request.body.name;
      if (request.body.domain) {
        updates.domain = request.body.domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
      }
      if (request.body.platform) updates.platform = request.body.platform;
      if (request.body.isActive !== undefined) updates.isActive = request.body.isActive;

      const [shop] = await fastify.db
        .update(shops)
        .set(updates)
        .where(eq(shops.id, request.params.id))
        .returning();

      if (!shop) return reply.status(404).send({ error: "Shop not found" });
      return shop;
    }
  );

  // Regenerate API key (admin only)
  fastify.post<{ Params: { id: string } }>(
    "/api/dashboard/shops/:id/regenerate-key",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const newApiKey = `pm_${uuidv4().replace(/-/g, "")}`;

      // Invalidate old key cache
      const [oldShop] = await fastify.db
        .select({ apiKey: shops.apiKey })
        .from(shops)
        .where(eq(shops.id, request.params.id))
        .limit(1);

      if (oldShop) {
        await fastify.redis.del(`apikey:${oldShop.apiKey}`);
      }

      const [shop] = await fastify.db
        .update(shops)
        .set({ apiKey: newApiKey, updatedAt: new Date() })
        .where(eq(shops.id, request.params.id))
        .returning();

      if (!shop) return reply.status(404).send({ error: "Shop not found" });
      return { apiKey: shop.apiKey };
    }
  );
}
