import "dotenv/config";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "./db/connection.js";
import { shops, pluginEvents, paywallEvents } from "./db/schema.js";
import { HazardService } from "./modules/hazard/hazard.service.js";
import { NotificationService } from "./modules/notifications/notification.service.js";
import {
  sendEmail,
  hazardAlertEmail,
  errorAlertEmail,
  paywallAlertEmail,
} from "./modules/notifications/email.service.js";
import { config } from "./config.js";

import { Queue } from "bullmq";

const connection = { url: config.redis.url };
const notificationsQueue = new Queue("notifications", { connection });

const PAYWALL_EVENT_TYPES = new Set([
  "payment_initiated",
  "payment_completed",
  "payment_failed",
  "refund_initiated",
  "refund_completed",
]);

// ─── Ingest Worker ──────────────────────────────────────

const ingestWorker = new Worker(
  "ingest",
  async (job) => {
    const { shopId, shopDomain, events, receivedAt } = job.data;

    // Update shop last_seen and domain
    await db
      .update(shops)
      .set({
        lastSeenAt: new Date(receivedAt),
        lastDomainReported: shopDomain,
        updatedAt: new Date(),
      })
      .where(eq(shops.id, shopId));

    // Classify and insert events
    const paywall: any[] = [];
    const plugin: any[] = [];

    for (const event of events) {
      if (PAYWALL_EVENT_TYPES.has(event.type)) {
        paywall.push({
          shopId,
          eventType: event.type,
          payload: event.metadata || {},
          occurredAt: new Date(event.occurredAt),
        });
      } else {
        const severityMap: Record<string, string> = {
          error: "error",
          critical: "critical",
          warning: "warning",
          heartbeat: "info",
          info: "info",
          domain_changed: "warning",
        };

        plugin.push({
          shopId,
          severity: severityMap[event.type] || "info",
          source: event.source || null,
          message: event.message,
          stackTrace: event.stackTrace || null,
          metadata: event.metadata || null,
          occurredAt: new Date(event.occurredAt),
        });
      }
    }

    if (paywall.length > 0) {
      await db.insert(paywallEvents).values(paywall);
    }
    if (plugin.length > 0) {
      await db.insert(pluginEvents).values(plugin);
    }

    // Queue notifications for errors/critical
    const shopName = job.data.shopName;
    for (const event of events) {
      if (event.type === "error" || event.type === "critical") {
        await notificationsQueue.add("notify", {
          type: "error_alert",
          shopId,
          shopName: shopName || shopDomain,
          data: {
            severity: event.type,
            message: event.message,
            source: event.source || null,
          },
        });
      }
    }

    console.log(
      `[ingest] Processed ${events.length} events for shop ${shopId} (${paywall.length} paywall, ${plugin.length} plugin)`
    );
  },
  { connection, concurrency: 10 }
);

// ─── Services ──────────────────────────────────────────

const notificationService = new NotificationService(db);

// ─── Hazard Pull Worker ─────────────────────────────────

const hazardService = new HazardService(db);
hazardService.setNotificationsQueue(notificationsQueue);

const hazardPullWorker = new Worker(
  "hazard-pull",
  async (job) => {
    console.log(`[hazard-pull] Starting registry sync (manual: ${job.data?.manual || false})`);

    try {
      const result = await hazardService.fetchAndSyncRegistry();
      console.log(
        `[hazard-pull] Completed: ${result.total} total, ${result.added} added, ${result.removed} removed`
      );
    } catch (error) {
      console.error("[hazard-pull] Failed:", error);
      throw error;
    }
  },
  { connection, concurrency: 1 }
);

// ─── Notifications Worker ───────────────────────────────

const notificationsWorker = new Worker(
  "notifications",
  async (job) => {
    const { type, shopId, shopName, data } = job.data;

    switch (type) {
      case "hazard_alert": {
        const email = hazardAlertEmail(shopName, data.domain, data.matchedDomain);
        await notificationService.notify("hazard", shopId, email);
        break;
      }
      case "error_alert": {
        const email = errorAlertEmail(shopName, data.severity, data.message, data.source);
        await notificationService.notify("errors", shopId, email);
        break;
      }
      case "paywall_alert": {
        const email = paywallAlertEmail(shopName, data.eventType, data.summary);
        await notificationService.notify("paywall", shopId, email);
        break;
      }
      default:
        console.warn(`[notifications] Unknown notification type: ${type}`);
    }
  },
  { connection, concurrency: 5 }
);

// ─── Graceful shutdown ──────────────────────────────────

const shutdown = async () => {
  console.log("Shutting down workers...");
  await Promise.all([
    ingestWorker.close(),
    hazardPullWorker.close(),
    notificationsWorker.close(),
    notificationsQueue.close(),
  ]);
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("Workers started: ingest, hazard-pull, notifications");
