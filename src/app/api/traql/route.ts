import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runTraql, ExecutionError } from "@/lib/traql";
import { resolveApiUser } from "@/lib/api-auth";
import { requireProjectAccess } from "@/lib/project-auth";

const schema = z.object({
  query: z.string().min(1).max(2000), // cap query length
  projectId: z.string().min(1).optional(),
});

// Simple in-memory rate limiter: max 30 TraQL queries per minute per user/IP
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit by user ID
  const rateLimitKey = user.id;
  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 30 queries per minute." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { query, projectId } = parsed.data;

  // Check project access if projectId provided
  if (projectId) {
    const access = await requireProjectAccess(projectId, user.id, "viewer");
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const result = await runTraql(query, projectId, user?.id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ExecutionError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("TraQL execution error:", e);
    return NextResponse.json({ error: "Internal error executing query" }, { status: 500 });
  }
}
