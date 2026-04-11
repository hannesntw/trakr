import { drizzle } from "drizzle-orm/libsql";
import { createClient as createWebClient } from "@libsql/client/web";
import { createClient as createLocalClient } from "@libsql/client";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocal = url.startsWith("file:");

const client = isLocal
  ? createLocalClient({ url, authToken })
  : createWebClient({ url, authToken });

export const db = drizzle(client, { schema });
