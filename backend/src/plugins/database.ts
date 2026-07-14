import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../db/connection.js";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof db;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate("db", db);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});
