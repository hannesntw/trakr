import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { eq, and, gte, lte, like, or, desc, sql } from "drizzle-orm";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, checkIpAllowlist } from "@/lib/org-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = Number(id);

  // Only owner or admin can view audit log
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "25")));
  const q = url.searchParams.get("q") ?? "";
  const actionFilter = url.searchParams.get("action") ?? "";
  const actorIdFilter = url.searchParams.get("actorId") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const format = url.searchParams.get("format") ?? "";

  // Build conditions
  const conditions = [eq(auditLog.orgId, orgId)];

  if (actionFilter) {
    conditions.push(eq(auditLog.action, actionFilter));
  }
  if (actorIdFilter) {
    conditions.push(eq(auditLog.actorId, actorIdFilter));
  }
  if (from) {
    conditions.push(gte(auditLog.createdAt, new Date(from).toISOString()));
  }
  if (to) {
    // Include the entire "to" day
    const toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);
    conditions.push(lte(auditLog.createdAt, toDate.toISOString()));
  }

  const where = and(...conditions);

  // Get all matching rows (we filter by search text in JS since it spans multiple columns)
  let rows = await db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.createdAt));

  // Text search filter
  if (q) {
    const lower = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.description.toLowerCase().includes(lower) ||
        r.actorName?.toLowerCase().includes(lower) ||
        r.action.toLowerCase().includes(lower) ||
        r.targetId?.toLowerCase().includes(lower)
    );
  }

  // CSV export
  if (format === "csv") {
    const header = "Date,Actor,Action,Description,Target Type,Target ID,IP Address";
    const csvRows = rows.map((r) => {
      const escapeCsv = (s: string | null) => {
        if (!s) return "";
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      return [
        escapeCsv(r.createdAt),
        escapeCsv(r.actorName),
        escapeCsv(r.action),
        escapeCsv(r.description),
        escapeCsv(r.targetType),
        escapeCsv(r.targetId),
        escapeCsv(r.ipAddress),
      ].join(",");
    });

    const csv = [header, ...csvRows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-log-${orgId}.csv"`,
      },
    });
  }

  // Paginate
  const total = rows.length;
  const offset = (page - 1) * pageSize;
  const items = rows.slice(offset, offset + pageSize);

  return NextResponse.json({
    items: items.map((r) => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
    })),
    total,
    page,
    pageSize,
  });
}
