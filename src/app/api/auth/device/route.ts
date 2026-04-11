import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deviceCodes } from "@/db/schema";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  const code = randomBytes(16).toString("base64url");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  await db.insert(deviceCodes).values({ code, expiresAt });

  const baseUrl = process.env.AUTH_URL ?? request.nextUrl.origin;

  return NextResponse.json({
    code,
    verification_url: `${baseUrl}/authorize?code=${code}`,
    expires_in: 600,
  });
}
