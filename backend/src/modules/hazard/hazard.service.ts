import { eq, inArray, sql, and, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Queue } from "bullmq";
import { hazardDomains, hazardAlerts, hazardSyncLog, shops } from "../../db/schema.js";
import { parseHazardXml, type HazardEntry } from "./hazard.parser.js";
import { config } from "../../config.js";

const BATCH_SIZE = 1000;

export class HazardService {
  private notificationsQueue: Queue | null = null;

  constructor(private db: any) {}

  setNotificationsQueue(queue: Queue) {
    this.notificationsQueue = queue;
  }

  async fetchModificationDate(): Promise<string | null> {
    const res = await fetch(config.hazard.modificationDateUrl, {
      headers: { Accept: "application/xml" },
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const match = xml.match(/<DataModyfikacji[^>]*>([^<]+)<\/DataModyfikacji>/);
    return match?.[1] || null;
  }

  async fetchAndSyncRegistry(): Promise<{ total: number; added: number; removed: number }> {
    // Create sync log entry
    const [logEntry] = await this.db
      .insert(hazardSyncLog)
      .values({ syncType: "pull", status: "running" })
      .returning();

    try {
      const res = await fetch(config.hazard.registryUrl, {
        headers: { Accept: "application/xml" },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const xml = await res.text();
      const entries = parseHazardXml(xml);

      const result = await this.upsertEntries(entries);

      // Update sync log
      await this.db
        .update(hazardSyncLog)
        .set({
          finishedAt: new Date(),
          domainsTotal: entries.length,
          domainsAdded: result.added,
          domainsRemoved: result.removed,
          status: "completed",
        })
        .where(eq(hazardSyncLog.id, logEntry.id));

      // Check domain matches
      await this.checkDomainMatches();

      return { total: entries.length, ...result };
    } catch (error) {
      await this.db
        .update(hazardSyncLog)
        .set({
          finishedAt: new Date(),
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        })
        .where(eq(hazardSyncLog.id, logEntry.id));
      throw error;
    }
  }

  async processIncrementalUpdate(xml: string): Promise<{ added: number; removed: number }> {
    const [logEntry] = await this.db
      .insert(hazardSyncLog)
      .values({ syncType: "push", status: "running" })
      .returning();

    try {
      const entries = parseHazardXml(xml);
      const result = await this.upsertEntries(entries);

      await this.db
        .update(hazardSyncLog)
        .set({
          finishedAt: new Date(),
          domainsTotal: entries.length,
          domainsAdded: result.added,
          domainsRemoved: result.removed,
          status: "completed",
        })
        .where(eq(hazardSyncLog.id, logEntry.id));

      await this.checkDomainMatches();
      return result;
    } catch (error) {
      await this.db
        .update(hazardSyncLog)
        .set({
          finishedAt: new Date(),
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        })
        .where(eq(hazardSyncLog.id, logEntry.id));
      throw error;
    }
  }

  private async upsertEntries(entries: HazardEntry[]): Promise<{ added: number; removed: number }> {
    let added = 0;
    let removed = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      const values = batch.map((e) => ({
        lp: e.lp,
        domain: e.domain.replace(/^www\./, "").toLowerCase(),
        dateAdded: new Date(e.dateAdded),
        dateRemoved: e.dateRemoved ? new Date(e.dateRemoved) : null,
        updatedAt: new Date(),
      }));

      const result = await this.db
        .insert(hazardDomains)
        .values(values)
        .onConflictDoUpdate({
          target: hazardDomains.lp,
          set: {
            domain: sql`EXCLUDED.domain`,
            dateAdded: sql`EXCLUDED.date_added`,
            dateRemoved: sql`EXCLUDED.date_removed`,
            updatedAt: sql`now()`,
          },
        })
        .returning();

      for (const row of result) {
        if (row.dateRemoved) removed++;
        else added++;
      }
    }

    return { added, removed };
  }

  async checkDomainMatches(): Promise<void> {
    // Get all active shop domains
    const allShops = await this.db
      .select({ id: shops.id, name: shops.name, domain: shops.domain })
      .from(shops)
      .where(eq(shops.isActive, true));

    if (allShops.length === 0) return;

    const shopDomains = allShops.map((s: any) =>
      s.domain.replace(/^www\./, "").toLowerCase()
    );

    // Find matching hazard domains
    const matches = await this.db
      .select()
      .from(hazardDomains)
      .where(
        and(
          inArray(hazardDomains.domain, shopDomains),
          isNull(hazardDomains.dateRemoved)
        )
      );

    for (const match of matches) {
      const shop = allShops.find(
        (s: any) => s.domain.replace(/^www\./, "").toLowerCase() === match.domain
      );
      if (!shop) continue;

      // Create alert if not already active
      const [existing] = await this.db
        .select()
        .from(hazardAlerts)
        .where(
          and(
            eq(hazardAlerts.shopId, shop.id),
            eq(hazardAlerts.matchedDomain, match.domain),
            eq(hazardAlerts.status, "active")
          )
        )
        .limit(1);

      if (!existing) {
        await this.db.insert(hazardAlerts).values({
          shopId: shop.id,
          hazardDomainId: match.id,
          matchedDomain: match.domain,
          status: "active",
        });

        // Queue notification
        if (this.notificationsQueue) {
          await this.notificationsQueue.add("notify", {
            type: "hazard_alert",
            shopId: shop.id,
            shopName: shop.name || shop.domain,
            data: {
              domain: shop.domain,
              matchedDomain: match.domain,
            },
          });
        }
      }
    }
  }

  async getAlerts(shopId?: string) {
    const query = this.db
      .select({
        id: hazardAlerts.id,
        shopId: hazardAlerts.shopId,
        shopName: shops.name,
        shopDomain: shops.domain,
        matchedDomain: hazardAlerts.matchedDomain,
        status: hazardAlerts.status,
        createdAt: hazardAlerts.createdAt,
        resolvedAt: hazardAlerts.resolvedAt,
      })
      .from(hazardAlerts)
      .innerJoin(shops, eq(hazardAlerts.shopId, shops.id))
      .orderBy(sql`${hazardAlerts.createdAt} DESC`);

    if (shopId) {
      return query.where(eq(hazardAlerts.shopId, shopId));
    }
    return query;
  }

  async getSyncLog(limit = 20) {
    return this.db
      .select()
      .from(hazardSyncLog)
      .orderBy(sql`${hazardSyncLog.startedAt} DESC`)
      .limit(limit);
  }
}
