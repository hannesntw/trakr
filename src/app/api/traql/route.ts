import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runTraql, ExecutionError } from "@/lib/traql";
import { resolveApiUser } from "@/lib/api-auth";

const schema = z.object({
  query: z.string().min(1),
  projectId: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  const user = await resolveApiUser(request);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { query, projectId } = parsed.data;

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
