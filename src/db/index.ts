import { drizzle } from "drizzle-orm/libsql";
import { createClient as createWebClient } from "@libsql/client/web";
import { createClient as createLocalClient } from "@libsql/client";
import * as schema from "./schema";

const rawUrl = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocal = rawUrl.startsWith("file:");

// Convert libsql:// to https:// for the web client (Vercel serverless)
const url = isLocal ? rawUrl : rawUrl.replace("libsql://", "https://");

const client = isLocal
  ? createLocalClient({ url: rawUrl, authToken })
  : createWebClient({ url, authToken });

export const db = drizzle(client, { schema });
