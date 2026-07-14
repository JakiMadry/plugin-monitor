import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { users } from "../../db/schema.js";
import { requireJwt } from "./auth.middleware.js";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: { email: string; password: string };
  }>("/api/auth/login", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
      },
    },
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    const [user] = await fastify.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: "15m" }
    );

    const refreshToken = fastify.jwt.sign(
      { id: user.id, type: "refresh" },
      { expiresIn: "7d" }
    );

    reply
      .setCookie("token", token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 15 * 60,
      })
      .setCookie("refreshToken", refreshToken, {
        path: "/api/auth/refresh",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 7 * 24 * 60 * 60,
      })
      .send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
      });
  });

  fastify.post("/api/auth/logout", async (_request, reply) => {
    reply
      .clearCookie("token", { path: "/" })
      .clearCookie("refreshToken", { path: "/api/auth/refresh" })
      .send({ ok: true });
  });

  fastify.get("/api/auth/me", { preHandler: requireJwt }, async (request) => {
    const payload = request.user as { id: string; email: string; role: string };

    const [user] = await fastify.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, payload.id))
      .limit(1);

    return { user };
  });

  fastify.post("/api/auth/refresh", async (request, reply) => {
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken) {
      return reply.status(401).send({ error: "No refresh token" });
    }

    try {
      const payload = fastify.jwt.verify<{ id: string; type: string }>(refreshToken);
      if (payload.type !== "refresh") throw new Error("Invalid token type");

      const [user] = await fastify.db
        .select()
        .from(users)
        .where(eq(users.id, payload.id))
        .limit(1);

      if (!user) return reply.status(401).send({ error: "User not found" });

      const token = fastify.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: "15m" }
      );

      reply
        .setCookie("token", token, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 15 * 60,
        })
        .send({ ok: true });
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }
  });
}
