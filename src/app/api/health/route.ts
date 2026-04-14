import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  let dbStatus: "connected" | "error" = "error";
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "connected";
  } catch {
    // DB unreachable
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    db: dbStatus,
  });
}
