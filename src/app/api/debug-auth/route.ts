import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";

export async function GET() {
  const results: Record<string, unknown> = {};

  // Show what URL the client is actually using
  const rawUrl = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
  const isLocal = rawUrl.startsWith("file:");
  const resolvedUrl = isLocal ? rawUrl : rawUrl.replace("libsql://", "https://");
  results.rawUrl = rawUrl.slice(0, 40) + "...";
  results.resolvedUrl = resolvedUrl.slice(0, 40) + "...";
  results.isLocal = isLocal;
  results.hasToken = !!process.env.TURSO_AUTH_TOKEN;

  // Test raw fetch to Turso
  if (!isLocal) {
    try {
      const r = await fetch(resolvedUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.TURSO_AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statements: ["SELECT count(*) as cnt FROM user"] }),
      });
      const data = await r.json();
      results.rawFetchStatus = r.status;
      results.rawFetchData = data;
    } catch (e: any) {
      results.rawFetchError = e.message;
    }
  }

  // Test via Drizzle
  try {
    const allUsers = await db.select().from(users);
    results.drizzleUserCount = allUsers.length;
    results.drizzleWorks = true;
  } catch (e: any) {
    results.drizzleError = e.message;
    results.drizzleWorks = false;
    results.drizzleCause = e.cause?.message;
  }

  results.hasAuthSecret = !!process.env.AUTH_SECRET;
  results.hasResendKey = !!process.env.AUTH_RESEND_KEY;
  results.authUrl = process.env.AUTH_URL;

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
