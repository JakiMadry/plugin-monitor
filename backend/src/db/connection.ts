import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import { config } from "../config.js";

const pool = new pg.Pool({
  connectionString: config.database.url,
  max: 20,
});

export const db = drizzle(pool, { schema, logger: config.nodeEnv === "development" });

export { pool };
