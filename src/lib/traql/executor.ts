// TraQL Executor — compiles AST to SQL and executes against the database

import { db } from "@/db";
import { workItems, sprints, projects, users, workItemLinks } from "@/db/schema";
import { eq, and, or, not, like, gt, gte, lt, lte, inArray, between, sql, desc, asc, SQL, count, sum, avg } from "drizzle-orm";
import type { TraqlAST, FilterNode, SortClause, SelectClause } from "./parser";

// Security: whitelist of allowed column names to prevent SQL injection via sql.raw()
const ALLOWED_COLUMNS = new Set([
  "type", "state", "title", "description", "assignee", "points", "priority",
  "id", "parent_id", "project_id", "sprint_id", "created_at", "updated_at",
]);
const ALLOWED_OPERATORS = new Set([">", ">=", "<", "<=", "="]);

function safeColumn(name: string): string {
  // Map logical field names to actual column names
  const colMap: Record<string, string> = {
    type: "type", state: "state", title: "title", description: "description",
    assignee: "assignee", points: "points", priority: "priority",
  };
  const col = colMap[name];
  if (!col || !ALLOWED_COLUMNS.has(col)) {
    throw new ExecutionError(`Invalid field: ${name}`);
  }
  return col;
}

function safeOperator(op: string): string {
  if (!ALLOWED_OPERATORS.has(op)) {
    throw new ExecutionError(`Invalid operator: ${op}`);
  }
  return op;
}

export interface TraqlResult {
  type: "items" | "scalar" | "grouped" | "text";
  items?: Array<Record<string, unknown>>;
  value?: number;
  groups?: Array<{ key: string; value: number }>;
  text?: string[];
  count?: number;
}

export class ExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionError";
  }
}

// Expand simple shortcuts into field filters (non-state shortcuts only)
function expandShortcuts(node: FilterNode): FilterNode {
  if (node.kind === "shortcut") {
    const simple: Record<string, FilterNode> = {
      "is:unassigned": { kind: "field", field: "assignee", operator: "eq", value: "none" },
      "is:overdue": { kind: "field", field: "end", operator: "lt", value: "today()" },
      "my:items": { kind: "field", field: "assignee", operator: "eq", value: "me" },
    };
    // is:open, is:closed, is:stale are handled dynamically in buildWhere
    // because they depend on the project's workflow Done-category states
    return simple[node.name] ?? node;
  }
  if (node.kind === "logic") {
    return { ...node, left: expandShortcuts(node.left), right: expandShortcuts(node.right) };
  }
  if (node.kind === "not") {
    return { ...node, child: expandShortcuts(node.child) };
  }
  return node;
}

// Resolve date expressions
function resolveDate(value: string): string {
  if (value === "today()") return new Date().toISOString().split("T")[0];
  if (value === "now()") return new Date().toISOString();

  const lastMatch = value.match(/^last\((\d+)([dwm])\)$/);
  if (lastMatch) {
    const [, num, unit] = lastMatch;
    const d = new Date();
    if (unit === "d") d.setDate(d.getDate() - parseInt(num));
    else if (unit === "w") d.setDate(d.getDate() - parseInt(num) * 7);
    else if (unit === "m") d.setMonth(d.getMonth() - parseInt(num));
    return d.toISOString();
  }

  return value;
}

// Build SQL WHERE clause from filter AST
function buildWhere(node: FilterNode, contextProjectId?: number, currentUserId?: string): SQL | undefined {
  const expanded = expandShortcuts(node);

  // Dynamic shortcuts that need DB access (done-category states from workflow)
  if (expanded.kind === "shortcut") {
    if (expanded.name === "is:open") {
      // Exclude all states in the "done" category for this project
      if (contextProjectId) {
        return sql`${workItems.state} NOT IN (SELECT slug FROM workflow_states WHERE project_id = ${contextProjectId} AND category = 'done')`;
      }
      // Cross-project: exclude done-category states from any project the item belongs to
      return sql`${workItems.state} NOT IN (SELECT slug FROM workflow_states WHERE project_id = ${workItems.projectId} AND category = 'done')`;
    }
    if (expanded.name === "is:closed") {
      if (contextProjectId) {
        return sql`${workItems.state} IN (SELECT slug FROM workflow_states WHERE project_id = ${contextProjectId} AND category = 'done')`;
      }
      return sql`${workItems.state} IN (SELECT slug FROM workflow_states WHERE project_id = ${workItems.projectId} AND category = 'done')`;
    }
    if (expanded.name === "is:stale") {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const staleDate = fourteenDaysAgo.toISOString();
      const openFilter = contextProjectId
        ? sql`${workItems.state} NOT IN (SELECT slug FROM workflow_states WHERE project_id = ${contextProjectId} AND category = 'done')`
        : sql`${workItems.state} NOT IN (SELECT slug FROM workflow_states WHERE project_id = ${workItems.projectId} AND category = 'done')`;
      return and(lt(workItems.updatedAt as any, staleDate), openFilter);
    }
    return undefined;
  }

  if (expanded.kind === "logic") {
    const left = buildWhere(expanded.left, contextProjectId, currentUserId);
    const right = buildWhere(expanded.right, contextProjectId, currentUserId);
    if (!left) return right;
    if (!right) return left;
    return expanded.op === "AND" ? and(left, right) : or(left, right);
  }

  if (expanded.kind === "not") {
    const child = buildWhere(expanded.child, contextProjectId, currentUserId);
    return child ? not(child) : undefined;
  }

  if (expanded.kind !== "field") return undefined;

  const { field, operator, value } = expanded;

  // Map field names to columns
  const columnMap: Record<string, () => typeof workItems.id> = {
    type: () => workItems.type as any,
    state: () => workItems.state as any,
    assignee: () => workItems.assignee as any,
    title: () => workItems.title as any,
    description: () => workItems.description as any,
    points: () => workItems.points as any,
    priority: () => workItems.priority as any,
    id: () => workItems.id as any,
    project: () => workItems.projectId as any,
    created: () => workItems.createdAt as any,
    updated: () => workItems.updatedAt as any,
    sprint: () => workItems.sprintId as any,
  };

  // Handle special field prefixes
  if (field.startsWith("parent.") || field.startsWith("children.") || field.startsWith("ancestor.") || field.startsWith("descendant.")) {
    return buildHierarchyFilter(expanded, contextProjectId, currentUserId);
  }

  if (field.startsWith("sprint.")) {
    return buildSprintFilter(expanded);
  }

  // Project field needs special handling — map key to id
  if (field === "project") {
    if (typeof value === "string") {
      if (value === "all") return undefined; // no project filter
      // Could be a key like "PIC" or "TRK"
      return sql`${workItems.projectId} IN (SELECT id FROM projects WHERE key = ${value})`;
    }
    if (Array.isArray(value)) {
      return sql`${workItems.projectId} IN (SELECT id FROM projects WHERE key IN (${sql.join(value.map(v => sql`${v}`), sql`, `)}))`;
    }
  }

  // Assignee special values
  if (field === "assignee") {
    if (value === "none") return sql`${workItems.assignee} IS NULL`;
    if (value === "me" && currentUserId) return eq(workItems.assignee as any, currentUserId);
  }

  // Sprint special values
  if (field === "sprint") {
    if (value === "none") return sql`${workItems.sprintId} IS NULL`;
    if (value === "active") return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state = 'active')`;
    if (typeof value === "string" && !["none", "active"].includes(value)) {
      return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE name = ${value})`;
    }
  }

  const col = columnMap[field]?.();
  if (!col) return undefined;

  const v = typeof value === "string" ? value : String(value);

  switch (operator) {
    case "eq": return eq(col, v as any);
    case "neq": return not(eq(col, v as any));
    case "gt": return gt(col, isDateField(field) ? resolveDate(v) as any : Number(v) as any);
    case "gte": return gte(col, isDateField(field) ? resolveDate(v) as any : Number(v) as any);
    case "lt": return lt(col, isDateField(field) ? resolveDate(v) as any : Number(v) as any);
    case "lte": return lte(col, isDateField(field) ? resolveDate(v) as any : Number(v) as any);
    case "contains": return like(col, `%${v}%` as any);
    case "in": {
      const vals = Array.isArray(value) ? value : [v];
      return inArray(col, vals as any);
    }
    case "range": {
      return between(col, v as any, (expanded.rangeEnd ?? v) as any);
    }
    case "func": {
      // Date functions
      if (v.startsWith("last(")) {
        const resolved = resolveDate(v);
        return gte(col, resolved as any);
      }
      if (v.startsWith("within(")) {
        // within(sprint:active) — item's date falls within the sprint's date range
        const inner = v.match(/within\(sprint:(\w+)\)/);
        if (inner) {
          const sprintFilter = inner[1];
          if (sprintFilter === "active") {
            return sql`${col} BETWEEN (SELECT start_date FROM sprints WHERE state = 'active' LIMIT 1) AND (SELECT end_date FROM sprints WHERE state = 'active' LIMIT 1)`;
          }
          return sql`${col} BETWEEN (SELECT start_date FROM sprints WHERE name = ${sprintFilter} LIMIT 1) AND (SELECT end_date FROM sprints WHERE name = ${sprintFilter} LIMIT 1)`;
        }
      }
      // Quantifiers handled in hierarchy filter
      return undefined;
    }
    default: return undefined;
  }
}

function isDateField(field: string): boolean {
  return ["created", "updated", "end", "start"].includes(field);
}

function buildHierarchyFilter(node: FilterNode & { kind: "field" }, contextProjectId?: number, currentUserId?: string): SQL | undefined {
  const [prefix, subField] = node.field.split(".", 2);
  const { operator, value, funcName } = node;

  if (prefix === "parent") {
    const col = safeColumn(subField);

    if (operator === "contains") {
      return sql`${workItems.parentId} IN (SELECT id FROM work_items WHERE ${sql.raw(col)} LIKE ${'%' + value + '%'})`;
    }
    if (operator === "eq") {
      return sql`${workItems.parentId} IN (SELECT id FROM work_items WHERE ${sql.raw(col)} = ${value})`;
    }
  }

  if (prefix === "ancestor") {
    const col = safeColumn(subField);

    // Recursive CTE to find all ancestors
    if (operator === "contains") {
      return sql`${workItems.id} IN (
        WITH RECURSIVE ancestors AS (
          SELECT id, parent_id FROM work_items WHERE id = work_items.id
          UNION ALL
          SELECT w.id, w.parent_id FROM work_items w JOIN ancestors a ON w.id = a.parent_id
        )
        SELECT ancestors.id FROM ancestors
        JOIN work_items p ON p.id = ancestors.parent_id
        WHERE p.${sql.raw(col)} LIKE ${'%' + value + '%'}
      )`;
    }
    if (operator === "eq") {
      return sql`${workItems.id} IN (
        WITH RECURSIVE ancestors AS (
          SELECT parent_id FROM work_items WHERE id = work_items.id
          UNION ALL
          SELECT w.parent_id FROM work_items w JOIN ancestors a ON w.id = a.parent_id WHERE w.parent_id IS NOT NULL
        )
        SELECT work_items.id FROM work_items
        WHERE work_items.id IN (SELECT parent_id FROM ancestors)
        AND ${sql.raw(col)} = ${value}
      )`;
    }
  }

  if (prefix === "children") {
    if (subField === "count") {
      const numVal = Number(value);
      const opMap: Record<string, string> = { gt: ">", gte: ">=", lt: "<", lte: "<=", eq: "=" };
      const sqlOp = safeOperator(opMap[operator] ?? "=");
      return sql`(SELECT COUNT(*) FROM work_items c WHERE c.parent_id = work_items.id) ${sql.raw(sqlOp)} ${numVal}`;
    }

    // Quantifiers: all(done), any(in_progress), has(bug)
    if (funcName === "all") {
      const safeCol = safeColumn(subField);
      return sql`NOT EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = work_items.id AND c.${sql.raw(safeCol)} != ${value})
        AND EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = work_items.id)`;
    }
    if (funcName === "any") {
      const safeCol = safeColumn(subField);
      return sql`EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = work_items.id AND c.${sql.raw(safeCol)} = ${value})`;
    }
    if (funcName === "has") {
      const safeCol = safeColumn(subField);
      return sql`EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = work_items.id AND c.${sql.raw(safeCol)} = ${value})`;
    }
  }

  if (prefix === "descendant") {
    if (subField === "count") {
      const numVal = Number(value);
      const opMap: Record<string, string> = { gt: ">", gte: ">=", lt: "<", lte: "<=", eq: "=" };
      const sqlOp = opMap[operator] ?? "=";
      const safeSqlOp = safeOperator(sqlOp);
      // Use a subquery that computes descendant count per item via recursive CTE
      return sql`work_items.id IN (
        SELECT root_id FROM (
          WITH RECURSIVE descendants(root_id, desc_id) AS (
            SELECT w.id, c.id FROM work_items w JOIN work_items c ON c.parent_id = w.id
            UNION ALL
            SELECT d.root_id, c.id FROM descendants d JOIN work_items c ON c.parent_id = d.desc_id
          )
          SELECT root_id, COUNT(*) as cnt FROM descendants GROUP BY root_id
          HAVING cnt ${sql.raw(safeSqlOp)} ${numVal}
        )
      )`;
    }
  }

  return undefined;
}

function buildSprintFilter(node: FilterNode & { kind: "field" }): SQL | undefined {
  const subField = node.field.split(".")[1];
  if (subField === "state") {
    return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state = ${node.value})`;
  }
  return undefined;
}

// Build ORDER BY
function buildOrderBy(clauses: SortClause[]) {
  const columnMap: Record<string, any> = {
    id: workItems.id,
    title: workItems.title,
    type: workItems.type,
    state: workItems.state,
    assignee: workItems.assignee,
    points: workItems.points,
    priority: workItems.priority,
    created: workItems.createdAt,
    updated: workItems.updatedAt,
  };

  return clauses.map(c => {
    const col = columnMap[c.field];
    if (!col) return undefined;
    return c.direction === "DESC" ? desc(col) : asc(col);
  }).filter(Boolean);
}

// Security: maximum result size to prevent DoS
const MAX_RESULTS = 1000;
const MAX_RECURSION_DEPTH = 50; // for recursive CTEs

// Security: build project access filter — user can only query projects they have access to
async function buildProjectAccessFilter(currentUserId?: string): Promise<SQL | undefined> {
  if (!currentUserId) return undefined;

  // User can access: public projects + projects they own + projects they're invited to
  return sql`${workItems.projectId} IN (
    SELECT id FROM projects WHERE visibility = 'public'
    UNION
    SELECT id FROM projects WHERE owner_id = ${currentUserId}
    UNION
    SELECT project_id FROM project_invites
    WHERE email IN (SELECT email FROM user WHERE id = ${currentUserId})
  )`;
}

// Main executor
export async function executeTraql(
  ast: TraqlAST,
  contextProjectId?: number,
  currentUserId?: string,
): Promise<TraqlResult> {
  const whereClause = ast.filter
    ? buildWhere(ast.filter, contextProjectId, currentUserId)
    : undefined;

  // Add default project scope if no explicit project filter
  const hasProjectFilter = ast.filter ? containsField(ast.filter, "project") : false;
  const projectScope = !hasProjectFilter && contextProjectId
    ? eq(workItems.projectId, contextProjectId)
    : undefined;

  // Security: always restrict to accessible projects for cross-project queries
  const accessFilter = hasProjectFilter
    ? await buildProjectAccessFilter(currentUserId)
    : undefined;

  const allFilters = [projectScope, whereClause, accessFilter].filter(Boolean) as SQL[];
  const fullWhere = allFilters.length > 0
    ? allFilters.reduce((a, b) => and(a, b)!)
    : undefined;

  if (ast.type === "select" && ast.select) {
    return executeSelect(ast.select, fullWhere, ast.sort);
  }

  // Regular item query with result limit
  const orderBy = ast.sort ? buildOrderBy(ast.sort) : [];
  const query = db
    .select()
    .from(workItems)
    .where(fullWhere ?? undefined)
    .limit(MAX_RESULTS);

  if (orderBy.length > 0) {
    (query as any).orderBy(...orderBy);
  }

  const items = await query;
  return { type: "items", items, count: items.length };
}

async function executeSelect(
  selectClause: SelectClause,
  where: SQL | undefined,
  sort?: SortClause[],
): Promise<TraqlResult> {
  const parenIdx = selectClause.func.indexOf("(");
  if (parenIdx === -1) throw new ExecutionError(`Invalid SELECT function: ${selectClause.func}`);
  const funcName = selectClause.func.slice(0, parenIdx);
  const funcArg = selectClause.func.slice(parenIdx + 1, -1); // strip outer parens

  // Format function — text output
  if (funcName === "format") {
    const template = funcArg.replace(/^"|"$/g, "");
    const orderBy = sort ? buildOrderBy(sort) : [];

    const query = db.select().from(workItems).where(where ?? undefined);
    if (orderBy.length > 0) (query as any).orderBy(...orderBy);
    const items = await query;

    // Also fetch project keys for {url} and {project} placeholders
    const projectIds = [...new Set(items.map(i => i.projectId))];
    const projectMap = new Map<number, string>();
    if (projectIds.length > 0) {
      const projs = await db.select().from(projects).where(inArray(projects.id, projectIds));
      for (const p of projs) projectMap.set(p.id, p.key);
    }

    const lines = items.map(item => {
      let line = template;
      line = line.replace(/\{(\w+(?:\.\w+)?)\}/g, (_, key: string) => {
        if (key === "url") {
          const pkey = projectMap.get(item.projectId) ?? "?";
          return `/projects/${pkey}/work-items/${item.id}`;
        }
        if (key === "project") return projectMap.get(item.projectId) ?? String(item.projectId);
        return String((item as any)[key] ?? "");
      });
      return line;
    });

    if (selectClause.groupBy) {
      const grouped = new Map<string, string[]>();
      for (let i = 0; i < items.length; i++) {
        const groupKey = String((items[i] as any)[selectClause.groupBy] ?? "");
        if (!grouped.has(groupKey)) grouped.set(groupKey, []);
        grouped.get(groupKey)!.push(lines[i]);
      }
      const result: string[] = [];
      for (const [key, groupLines] of grouped) {
        result.push(`## ${key}`);
        result.push(...groupLines);
        result.push("");
      }
      return { type: "text", text: result };
    }

    return { type: "text", text: lines };
  }

  // Aggregate functions
  if (selectClause.groupBy) {
    const groupCol = selectClause.groupBy;
    // Special handling for 'project' — group by project key via subquery
    const groupColRef = groupCol === "project"
      ? sql`(SELECT key FROM projects WHERE projects.id = work_items.project_id)`
      : (workItems as any)[groupCol] ?? (() => { throw new ExecutionError(`Invalid GROUP BY field: ${groupCol}`); })();

    let selectExpr;
    if (funcName === "count") selectExpr = count();
    else if (funcName === "sum") selectExpr = sum((workItems as any)[funcArg]);
    else if (funcName === "avg") selectExpr = avg((workItems as any)[funcArg]);
    else throw new ExecutionError(`Unknown function: ${funcName}`);

    const rows = await db
      .select({ key: groupColRef, value: selectExpr })
      .from(workItems)
      .where(where ?? undefined)
      .groupBy(groupColRef);

    return {
      type: "grouped",
      groups: rows.map(r => ({
        key: String(r.key ?? "null"),
        value: Number(r.value) || 0,
      })),
    };
  }

  // Scalar aggregate
  let selectExpr;
  if (funcName === "count") selectExpr = count();
  else if (funcName === "sum") selectExpr = sum((workItems as any)[funcArg]);
  else if (funcName === "avg") selectExpr = avg((workItems as any)[funcArg]);
  else throw new ExecutionError(`Unknown function: ${funcName}`);

  const [row] = await db
    .select({ value: selectExpr })
    .from(workItems)
    .where(where ?? undefined);

  return { type: "scalar", value: Number(row?.value) || 0 };
}

function containsField(node: FilterNode, fieldName: string): boolean {
  if (node.kind === "field") return node.field === fieldName;
  if (node.kind === "logic") return containsField(node.left, fieldName) || containsField(node.right, fieldName);
  if (node.kind === "not") return containsField(node.child, fieldName);
  return false;
}
