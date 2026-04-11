import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deviceCodes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const [device] = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.code, code));

  if (!device) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (new Date(device.expiresAt) < new Date()) {
    return NextResponse.json({ status: "expired" });
  }

  if (device.status === "authorized" && device.apiKey) {
    const key = device.apiKey;
    // Clear the raw key after first retrieval
    await db.update(deviceCodes).set({ apiKey: null }).where(eq(deviceCodes.id, device.id));
    return NextResponse.json({ status: "authorized", api_key: key });
  }

  return NextResponse.json({ status: "pending" });
}
