// Test database — connects to Neon test branch
// Same Postgres dialect as production, isolated data
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../db/schema";

const TEST_DB_URL = process.env.TEST_DATABASE_URL
  ?? "postgresql://neondb_owner:npg_WzZhy9sQ1tdF@ep-steep-flower-aloiaj3m.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(TEST_DB_URL);
export const db = drizzle(sql, { schema });
