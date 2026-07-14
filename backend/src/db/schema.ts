import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  jsonb,
  serial,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Shops ───────────────────────────────────────────────

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    platform: varchar("platform", { length: 50 }).notNull(),
    apiKey: varchar("api_key", { length: 128 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastDomainReported: varchar("last_domain_reported", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_shops_domain").on(table.domain),
    uniqueIndex("idx_shops_api_key").on(table.apiKey),
  ]
);

// ─── Users ───────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("viewer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── User Notification Preferences ──────────────────────

export const userNotificationPrefs = pgTable(
  "user_notification_prefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    section: varchar("section", { length: 50 }).notNull(),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    notifyEmail: boolean("notify_email").default(true).notNull(),
  },
  (table) => [
    uniqueIndex("idx_user_notif_unique").on(table.userId, table.section, table.shopId),
  ]
);

// ─── Hazard Domains ─────────────────────────────────────

export const hazardDomains = pgTable(
  "hazard_domains",
  {
    id: serial("id").primaryKey(),
    lp: integer("lp").notNull().unique(),
    domain: varchar("domain", { length: 255 }).notNull(),
    dateAdded: timestamp("date_added", { withTimezone: true }).notNull(),
    dateRemoved: timestamp("date_removed", { withTimezone: true }),
    isActive: boolean("is_active")
      .generatedAlwaysAs(sql`date_removed IS NULL`)
      .notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_hazard_domain").on(table.domain),
    index("idx_hazard_active").on(table.isActive),
  ]
);

// ─── Hazard Alerts ──────────────────────────────────────

export const hazardAlerts = pgTable(
  "hazard_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id),
    hazardDomainId: integer("hazard_domain_id").references(() => hazardDomains.id),
    matchedDomain: varchar("matched_domain", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("idx_hazard_alerts_shop").on(table.shopId)]
);

// ─── Hazard Sync Log ────────────────────────────────────

export const hazardSyncLog = pgTable("hazard_sync_log", {
  id: serial("id").primaryKey(),
  syncType: varchar("sync_type", { length: 10 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  domainsTotal: integer("domains_total"),
  domainsAdded: integer("domains_added").default(0),
  domainsRemoved: integer("domains_removed").default(0),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  errorMessage: text("error_message"),
});

// ─── Paywall Events ─────────────────────────────────────

export const paywallEvents = pgTable(
  "paywall_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_paywall_shop_time").on(table.shopId, table.occurredAt),
    index("idx_paywall_type").on(table.eventType),
  ]
);

// ─── Plugin Events (errors, info, warnings) ─────────────

export const pluginEvents = pgTable(
  "plugin_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id),
    severity: varchar("severity", { length: 20 }).notNull(),
    source: varchar("source", { length: 100 }),
    message: text("message").notNull(),
    stackTrace: text("stack_trace"),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    isRead: boolean("is_read").default(false).notNull(),
  },
  (table) => [
    index("idx_plugin_events_shop").on(table.shopId, table.occurredAt),
    index("idx_plugin_events_severity").on(table.severity),
  ]
);
