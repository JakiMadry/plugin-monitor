import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { userNotificationPrefs } from "../../db/schema.js";
import { requireJwt } from "../auth/auth.middleware.js";

export async function notificationRoutes(fastify: FastifyInstance) {
  // Get current user's notification preferences
  fastify.get(
    "/api/dashboard/notifications/prefs",
    { preHandler: requireJwt },
    async (request) => {
      const user = request.user as { id: string };
      return fastify.db
        .select()
        .from(userNotificationPrefs)
        .where(eq(userNotificationPrefs.userId, user.id));
    }
  );

  // Set notification preference
  fastify.post<{
    Body: { section: string; shopId?: string; notifyEmail: boolean };
  }>(
    "/api/dashboard/notifications/prefs",
    {
      preHandler: requireJwt,
      schema: {
        body: {
          type: "object",
          required: ["section", "notifyEmail"],
          properties: {
            section: {
              type: "string",
              enum: ["hazard", "paywall", "errors", "all"],
            },
            shopId: { type: "string" },
            notifyEmail: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string };
      const { section, shopId, notifyEmail } = request.body;

      // Upsert preference
      const [existing] = await fastify.db
        .select()
        .from(userNotificationPrefs)
        .where(
          and(
            eq(userNotificationPrefs.userId, user.id),
            eq(userNotificationPrefs.section, section),
            shopId
              ? eq(userNotificationPrefs.shopId, shopId)
              : eq(userNotificationPrefs.shopId, user.id) // won't match, handled below
          )
        )
        .limit(1);

      if (existing) {
        const [updated] = await fastify.db
          .update(userNotificationPrefs)
          .set({ notifyEmail })
          .where(eq(userNotificationPrefs.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await fastify.db
        .insert(userNotificationPrefs)
        .values({
          userId: user.id,
          section,
          shopId: shopId || null,
          notifyEmail,
        })
        .returning();

      reply.status(201).send(created);
    }
  );

  // Delete notification preference
  fastify.delete<{ Params: { id: string } }>(
    "/api/dashboard/notifications/prefs/:id",
    { preHandler: requireJwt },
    async (request, reply) => {
      const user = request.user as { id: string };

      const [pref] = await fastify.db
        .select()
        .from(userNotificationPrefs)
        .where(
          and(
            eq(userNotificationPrefs.id, request.params.id),
            eq(userNotificationPrefs.userId, user.id)
          )
        )
        .limit(1);

      if (!pref) return reply.status(404).send({ error: "Not found" });

      await fastify.db
        .delete(userNotificationPrefs)
        .where(eq(userNotificationPrefs.id, request.params.id));

      return { ok: true };
    }
  );
}
