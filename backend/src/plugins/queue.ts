import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { config } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    queues: {
      ingest: Queue;
      hazardPull: Queue;
      notifications: Queue;
    };
  }
}

function createConnection(): any {
  return new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

function createQueue(name: string) {
  return new Queue(name, {
    connection: createConnection(),
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
}

export default fp(async (fastify: FastifyInstance) => {
  const queues = {
    ingest: createQueue("ingest"),
    hazardPull: createQueue("hazard-pull"),
    notifications: createQueue("notifications"),
  };

  // Schedule repeatable hazard pull job
  await queues.hazardPull.upsertJobScheduler(
    "hazard-pull-scheduler",
    { every: config.hazard.pullIntervalMs },
    { name: "fetchAndSyncRegistry" }
  );

  fastify.decorate("queues", queues);

  fastify.addHook("onClose", async () => {
    await Promise.all(Object.values(queues).map((q) => q.close()));
  });
});
