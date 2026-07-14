import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import bcrypt from "bcrypt";
import { users } from "./schema.js";
import { config } from "../config.js";

async function seed() {
  const pool = new pg.Pool({ connectionString: config.database.url });
  const db = drizzle(pool);

  const passwordHash = await bcrypt.hash("admin123", 12);

  await db
    .insert(users)
    .values({
      email: "admin@pluginmonitor.pl",
      passwordHash,
      displayName: "Administrator",
      role: "admin",
    })
    .onConflictDoNothing();

  console.log("Seeded admin user: admin@pluginmonitor.pl / admin123");
  await pool.end();
}

seed().catch(console.error);
