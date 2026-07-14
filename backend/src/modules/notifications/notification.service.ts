import { eq, and, or, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { userNotificationPrefs, users } from "../../db/schema.js";
import { sendEmail, type EmailPayload } from "./email.service.js";

type Section = "hazard" | "paywall" | "errors" | "all";

interface NotificationTarget {
  userId: string;
  email: string;
}

export class NotificationService {
  constructor(private db: NodePgDatabase<any>) {}

  /**
   * Find users who should be notified for a given section + shop.
   * Matches:
   *  - prefs with section="all" OR section=<given>
   *  - prefs with shopId=NULL (all shops) OR shopId=<given>
   *  - prefs with notifyEmail=true
   */
  async getSubscribers(section: Section, shopId: string): Promise<NotificationTarget[]> {
    const rows = await this.db
      .select({
        userId: userNotificationPrefs.userId,
        email: users.email,
      })
      .from(userNotificationPrefs)
      .innerJoin(users, eq(users.id, userNotificationPrefs.userId))
      .where(
        and(
          eq(userNotificationPrefs.notifyEmail, true),
          or(
            eq(userNotificationPrefs.section, section),
            eq(userNotificationPrefs.section, "all")
          ),
          or(
            isNull(userNotificationPrefs.shopId),
            eq(userNotificationPrefs.shopId, shopId)
          )
        )
      );

    // Deduplicate by email
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (seen.has(r.email)) return false;
      seen.add(r.email);
      return true;
    });
  }

  /**
   * Send an email to all subscribers of a section+shop.
   */
  async notify(section: Section, shopId: string, email: EmailPayload): Promise<number> {
    const subscribers = await this.getSubscribers(section, shopId);

    if (subscribers.length === 0) {
      return 0;
    }

    let sent = 0;
    for (const sub of subscribers) {
      const success = await sendEmail({ ...email, to: sub.email });
      if (success) sent++;
    }

    console.log(`[notifications] Sent ${sent}/${subscribers.length} emails for ${section} (shop: ${shopId})`);
    return sent;
  }
}
