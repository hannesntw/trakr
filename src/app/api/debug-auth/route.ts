import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";

export async function GET() {
  const results: Record<string, unknown> = {};

  try {
    // Test basic DB connectivity
    const allUsers = await db.select().from(users);
    results.userCount = allUsers.length;
    results.dbConnected = true;
  } catch (e: any) {
    results.dbError = e.message;
    results.dbConnected = false;
  }

  try {
    // Test verification token insert (what the adapter does)
    const testToken = {
      identifier: "debug-test@test.com",
      token: "debug-" + Date.now(),
      expires: new Date(Date.now() + 600000),
    };
    await db.insert(verificationTokens).values(testToken);
    results.insertWorks = true;

    // Clean up
    const { eq, and } = await import("drizzle-orm");
    await db.delete(verificationTokens).where(
      and(
        eq(verificationTokens.identifier, testToken.identifier),
        eq(verificationTokens.token, testToken.token)
      )
    );
    results.deleteWorks = true;
  } catch (e: any) {
    results.insertError = e.message;
    results.insertStack = e.stack?.split("\n").slice(0, 5);
  }

  // Check env vars (redacted)
  results.hasAuthSecret = !!process.env.AUTH_SECRET;
  results.hasResendKey = !!process.env.AUTH_RESEND_KEY;
  results.hasGoogleId = !!process.env.AUTH_GOOGLE_ID;
  results.authUrl = process.env.AUTH_URL;
  results.tursoUrl = process.env.TURSO_DATABASE_URL?.slice(0, 30) + "...";
  results.hasTursoToken = !!process.env.TURSO_AUTH_TOKEN;

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
