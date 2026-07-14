import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { users } from "../../db/schema.js";
import { requireJwt, requireRole } from "./auth.middleware.js";

export async function userRoutes(fastify: FastifyInstance) {
  // List all users (admin only)
  fastify.get(
    "/api/dashboard/users",
    { preHandler: requireRole("admin") },
    async () => {
      return fastify.db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.email);
    }
  );

  // Create user (admin only)
  fastify.post<{
    Body: { email: string; password: string; displayName?: string; role?: string };
  }>(
    "/api/dashboard/users",
    {
      preHandler: requireRole("admin"),
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            displayName: { type: "string" },
            role: { type: "string", enum: ["admin", "manager", "viewer"] },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, displayName, role } = request.body;

      const passwordHash = await bcrypt.hash(password, 10);

      try {
        const [user] = await fastify.db
          .insert(users)
          .values({
            email,
            passwordHash,
            displayName: displayName || null,
            role: role || "viewer",
          })
          .returning({
            id: users.id,
            email: users.email,
            displayName: users.displayName,
            role: users.role,
            createdAt: users.createdAt,
          });

        reply.status(201).send(user);
      } catch (error: any) {
        if (error.code === "23505") {
          return reply.status(409).send({ error: "Email already exists" });
        }
        throw error;
      }
    }
  );

  // Update user (admin only)
  fastify.put<{
    Params: { id: string };
    Body: { displayName?: string; role?: string; password?: string };
  }>(
    "/api/dashboard/users/:id",
    {
      preHandler: requireRole("admin"),
      schema: {
        body: {
          type: "object",
          properties: {
            displayName: { type: "string" },
            role: { type: "string", enum: ["admin", "manager", "viewer"] },
            password: { type: "string", minLength: 6 },
          },
        },
      },
    },
    async (request, reply) => {
      const updates: Record<string, unknown> = {};
      if (request.body.displayName !== undefined) updates.displayName = request.body.displayName;
      if (request.body.role) updates.role = request.body.role;
      if (request.body.password) {
        updates.passwordHash = await bcrypt.hash(request.body.password, 10);
      }

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      const [user] = await fastify.db
        .update(users)
        .set(updates)
        .where(eq(users.id, request.params.id))
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          createdAt: users.createdAt,
        });

      if (!user) return reply.status(404).send({ error: "User not found" });
      return user;
    }
  );

  // Delete user (admin only)
  fastify.delete<{ Params: { id: string } }>(
    "/api/dashboard/users/:id",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      // Prevent self-delete
      const currentUser = request.user as { id: string };
      if (currentUser.id === request.params.id) {
        return reply.status(400).send({ error: "Cannot delete yourself" });
      }

      const [deleted] = await fastify.db
        .delete(users)
        .where(eq(users.id, request.params.id))
        .returning({ id: users.id });

      if (!deleted) return reply.status(404).send({ error: "User not found" });
      return { ok: true };
    }
  );
}
