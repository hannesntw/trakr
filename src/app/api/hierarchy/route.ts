import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItems } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";

interface TreeNode {
  id: string;
  projectId: string;
  title: string;
  type: string;
  state: string;
  assignee: string | null;
  sprintId: string | null;
  priority: number | null;
  children: TreeNode[];
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams;
  const projectId = url.get("projectId");
  const rootId = url.get("rootId");

  let allItems;
  if (projectId) {
    allItems = await db
      .select()
      .from(workItems)
      .where(eq(workItems.projectId, projectId))
      .orderBy(workItems.priority, workItems.id);
  } else {
    allItems = await db
      .select()
      .from(workItems)
      .orderBy(workItems.priority, workItems.id);
  }

  const itemMap = new Map<string, TreeNode>();
  for (const item of allItems) {
    itemMap.set(item.id, { ...item, children: [] });
  }

  const roots: TreeNode[] = [];
  for (const item of allItems) {
    const node = itemMap.get(item.id)!;
    if (rootId && item.id === rootId) {
      roots.push(node);
    } else if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children.push(node);
    } else if (!item.parentId) {
      roots.push(node);
    }
  }

  if (rootId) {
    const root = itemMap.get(rootId);
    return NextResponse.json(root ?? { error: "Not found" }, root ? {} : { status: 404 });
  }

  return NextResponse.json(roots);
}
