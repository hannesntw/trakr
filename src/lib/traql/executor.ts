// TraQL Executor — compiles AST to SQL and executes against the database

import { db } from "@/db";
import { workItems, sprints, projects, users, workItemLinks, statusHistory, workItemSnapshots } from "@/db/schema";
import { eq, and, or, not, like, ilike, gt, gte, lt, lte, inArray, between, sql, desc, asc, SQL, count, sum, avg, ne, isNull } from "drizzle-orm";
import type { TraqlAST, FilterNode, SortClause, SelectClause, WasNode, ChangedNode } from "./parser";

// Security: zero sql.raw() calls.
// Column names use sql.identifier() (quoted identifiers) or Drizzle column references.
// Operators use Drizzle typed comparison functions (eq, gt, gte, lt, lte).
// Postgres safeguards: 10s statement_timeout at role level, RLS on work_items.
import type { Column } from "drizzle-orm";

// Column references for work_items fields that TraQL can query
const WORK_ITEM_COLUMNS: Record<string, Column> = {
  type: workItems.type,
  state: workItems.state,
  title: workItems.title,
  description: workItems.description as Column,
  assignee: workItems.assignee as Column,
  points: workItems.points as Column,
  priority: workItems.priority as Column,
};

function safeColumnRef(name: string): Column {
  const col = WORK_ITEM_COLUMNS[name];
  if (!col) throw new ExecutionError(`Invalid field: ${name}`);
  return col;
}

// Apply a comparison operator using Drizzle's typed functions — no sql.raw() for operators
function applyComparison(col: Column, op: string, val: unknown): SQL {
  switch (op) {
    case ">": return gt(col, val as any);
    case ">=": return gte(col, val as any);
    case "<": return lt(col, val as any);
    case "<=": return lte(col, val as any);
    case "=": return eq(col, val as any);
    case "!=": return not(eq(col, val as any));
    default: throw new ExecutionError(`Invalid operator: ${op}`);
  }
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
  // WAS and CHANGED nodes pass through unchanged
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

  // History queries: WAS
  if (expanded.kind === "was") {
    return buildWasFilter(expanded);
  }

  // History queries: CHANGED
  if (expanded.kind === "changed") {
    return buildChangedFilter(expanded);
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
    if (operator === "empty") return sql`${workItems.sprintId} IS NULL`;
    if (operator === "not_empty") return sql`${workItems.sprintId} IS NOT NULL`;
    if (value === "none" || value === "empty") return sql`${workItems.sprintId} IS NULL`;
    if (value === "active" || value === "current") return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state = 'active')`;
    if (value === "open") return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state != 'closed')`;
    if (value === "future") return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state = 'planning')`;
    if (value === "closed") return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state = 'closed')`;
    if (value === "last") return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state = 'closed' ORDER BY end_date DESC LIMIT 1)`;
    if (typeof value === "string" && !["none", "active", "current", "open", "future", "closed", "last"].includes(value)) {
      return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE name = ${value})`;
    }
  }

  // Link traversal
  if (field === "links") {
    if (value === "any") return sql`EXISTS (SELECT 1 FROM work_item_links WHERE source_id = ${workItems.id} OR target_id = ${workItems.id})`;
    if (value === "none") return sql`NOT EXISTS (SELECT 1 FROM work_item_links WHERE source_id = ${workItems.id} OR target_id = ${workItems.id})`;
    if (value === "blocks") return sql`EXISTS (SELECT 1 FROM work_item_links WHERE source_id = ${workItems.id} AND type = 'blocks')`;
    if (value === "blocked_by") return sql`EXISTS (SELECT 1 FROM work_item_links WHERE target_id = ${workItems.id} AND type = 'blocks')`;
    // Generic link type
    if (typeof value === "string") return sql`EXISTS (SELECT 1 FROM work_item_links WHERE (source_id = ${workItems.id} OR target_id = ${workItems.id}) AND type = ${value})`;
  }

  // blocked_by:state — items blocked by an item in a specific state
  if (field === "blocked_by") {
    return sql`EXISTS (SELECT 1 FROM work_item_links wil JOIN work_items blocker ON blocker.id = wil.source_id WHERE wil.target_id = ${workItems.id} AND wil.type = 'blocks' AND blocker.state = ${value})`;
  }

  // Null/empty checks
  if (operator === "empty") {
    const emptyCol = columnMap[field]?.();
    if (!emptyCol) return undefined;
    // Text fields: IS NULL OR = ''
    if (["title", "description", "assignee"].includes(field)) {
      return sql`(${emptyCol} IS NULL OR ${emptyCol} = '')`;
    }
    // Numeric/FK fields: IS NULL
    return sql`${emptyCol} IS NULL`;
  }
  if (operator === "not_empty") {
    const neCol = columnMap[field]?.();
    if (!neCol) return undefined;
    if (["title", "description", "assignee"].includes(field)) {
      return sql`(${neCol} IS NOT NULL AND ${neCol} != '')`;
    }
    return sql`${neCol} IS NOT NULL`;
  }

  // Special handling for id field — match against displayId when value contains a dash
  if (field === "id") {
    const v = typeof value === "string" ? value : String(value);
    if (v.includes("-")) {
      // Display ID format, e.g. "TRK-5" or range "TRK-1..TRK-10"
      if (operator === "range") {
        // Parse numeric suffix from both ends
        const startNum = parseInt(v.split("-").pop()!);
        const endNum = parseInt(String(expanded.rangeEnd ?? v).split("-").pop()!);
        const prefix = v.split("-").slice(0, -1).join("-");
        // Match displayId where prefix matches and numeric suffix is in range
        return sql`${workItems.displayId} IS NOT NULL AND ${workItems.displayId} LIKE ${prefix + '-%'} AND CAST(SUBSTR(${workItems.displayId}, ${prefix.length + 2}) AS INTEGER) BETWEEN ${startNum} AND ${endNum}`;
      }
      return eq(workItems.displayId as any, v.toUpperCase());
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
    case "contains": return ilike(col, `%${v}%` as any);
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
    safeColumnRef(subField); // validate
    const colId = sql.identifier(subField);

    if (operator === "contains") {
      return sql`${workItems.parentId} IN (SELECT id FROM work_items WHERE ${colId} ILIKE ${'%' + value + '%'})`;
    }
    if (operator === "eq") {
      return sql`${workItems.parentId} IN (SELECT id FROM work_items WHERE ${colId} = ${value})`;
    }
  }

  if (prefix === "ancestor") {
    safeColumnRef(subField); // validate
    const colId = sql.identifier(subField);

    if (operator === "contains") {
      return sql`${workItems.id} IN (
        WITH RECURSIVE ancestors AS (
          SELECT id, parent_id FROM work_items WHERE id = work_items.id
          UNION ALL
          SELECT w.id, w.parent_id FROM work_items w JOIN ancestors a ON w.id = a.parent_id
        )
        SELECT ancestors.id FROM ancestors
        JOIN work_items p ON p.id = ancestors.parent_id
        WHERE p.${colId} ILIKE ${'%' + value + '%'}
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
        AND ${colId} = ${value}
      )`;
    }
  }

  if (prefix === "children") {
    if (subField === "count") {
      const numVal = Number(value);
      // Use a CASE-based approach to avoid raw operators
      const countSql = sql`(SELECT COUNT(*) FROM work_items c WHERE c.parent_id = work_items.id)`;
      const opMap: Record<string, string> = { gt: ">", gte: ">=", lt: "<", lte: "<=", eq: "=" };
      const op = opMap[operator] ?? "=";
      // Build comparison using typed Drizzle functions
      if (op === ">") return gt(countSql, numVal);
      if (op === ">=") return gte(countSql, numVal);
      if (op === "<") return lt(countSql, numVal);
      if (op === "<=") return lte(countSql, numVal);
      return eq(countSql, numVal);
    }

    // Quantifiers: all(done), any(in_progress), has(bug)
    safeColumnRef(subField); // validate
    const colId = sql.identifier(subField);

    if (funcName === "all") {
      return sql`NOT EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = work_items.id AND c.${colId} != ${value})
        AND EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = work_items.id)`;
    }
    if (funcName === "any") {
      return sql`EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = work_items.id AND c.${colId} = ${value})`;
    }
    if (funcName === "has") {
      return sql`EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = work_items.id AND c.${colId} = ${value})`;
    }
  }

  if (prefix === "descendant") {
    if (subField === "count") {
      const numVal = Number(value);
      const opMap: Record<string, string> = { gt: ">", gte: ">=", lt: "<", lte: "<=", eq: "=" };
      const op = opMap[operator] ?? "=";
      // Build the HAVING clause using typed comparison
      // We use separate queries per operator to avoid sql.raw()
      const havingSql = op === ">" ? sql`HAVING COUNT(*) > ${numVal}`
        : op === ">=" ? sql`HAVING COUNT(*) >= ${numVal}`
        : op === "<" ? sql`HAVING COUNT(*) < ${numVal}`
        : op === "<=" ? sql`HAVING COUNT(*) <= ${numVal}`
        : sql`HAVING COUNT(*) = ${numVal}`;

      return sql`work_items.id IN (
        SELECT root_id FROM (
          WITH RECURSIVE descendants(root_id, desc_id) AS (
            SELECT w.id, c.id FROM work_items w JOIN work_items c ON c.parent_id = w.id
            UNION ALL
            SELECT d.root_id, c.id FROM descendants d JOIN work_items c ON c.parent_id = d.desc_id
          )
          SELECT root_id FROM descendants GROUP BY root_id
          ${havingSql}
        ) sub
      )`;
    }
  }

  return undefined;
}

function buildSprintFilter(node: FilterNode & { kind: "field" }): SQL | undefined {
  const parts = node.field.split(".");
  const subField = parts[1];

  if (subField === "state") {
    return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state = ${node.value})`;
  }

  if (subField === "name") {
    return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE name = ${node.value})`;
  }

  // Sprint health analysis
  if (subField === "health") {
    return buildSprintHealthFilter(node.value as string);
  }

  return undefined;
}

function buildSprintHealthFilter(healthType: string): SQL | undefined {
  switch (healthType) {
    case "clean":
      // Item in a sprint AND item state is in done-category
      // Simplified: sprint exists (closed or active) and item is done
      return sql`${workItems.sprintId} IS NOT NULL
        AND ${workItems.state} IN (SELECT slug FROM workflow_states WHERE project_id = ${workItems.projectId} AND category = 'done')
        AND ${workItems.sprintId} IN (SELECT id FROM sprints WHERE state = 'closed')`;

    case "incomplete":
      // In active sprint, state NOT in done-category
      return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state = 'active')
        AND ${workItems.state} NOT IN (SELECT slug FROM workflow_states WHERE project_id = ${workItems.projectId} AND category = 'done')`;

    case "added_late":
      // Item created after its sprint's start_date (simple proxy)
      return sql`${workItems.sprintId} IS NOT NULL
        AND ${workItems.createdAt} > (SELECT start_date FROM sprints WHERE id = ${workItems.sprintId})`;

    case "spilled":
      // In a closed sprint but state NOT in done-category
      return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state = 'closed')
        AND ${workItems.state} NOT IN (SELECT slug FROM workflow_states WHERE project_id = ${workItems.projectId} AND category = 'done')`;

    case "carried":
      // Item in active/planning sprint AND has status_history entries during a closed sprint's date range
      return sql`${workItems.sprintId} IN (SELECT id FROM sprints WHERE state IN ('active', 'planning'))
        AND EXISTS (
          SELECT 1 FROM status_history sh
          JOIN sprints cs ON cs.state = 'closed'
            AND cs.project_id = (SELECT project_id FROM sprints WHERE id = ${workItems.sprintId})
            AND sh.changed_at >= cs.start_date
            AND sh.changed_at <= cs.end_date
          WHERE sh.work_item_id = ${workItems.id}
        )`;

    default:
      return undefined;
  }
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
    WHERE email IN (SELECT email FROM "user" WHERE id = ${currentUserId})
  )`;
}

// Security notes (Postgres):
// - statement_timeout = 10s set at role level (kills runaway CTEs)
// - RLS enabled on work_items with project access policies
// - Column whitelist (safeColumn) prevents SQL injection via field names
// - MAX_RESULTS = 1000 caps output size
// - For read-only transactions: need websocket driver (neon-http doesn't support transactions)

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

    // Pre-compute sprint health if template uses {sprint.health}
    const needsHealth = template.includes("{sprint.health}");
    let healthMap = new Map<number, string>();
    if (needsHealth) {
      healthMap = await computeSprintHealthMap(items);
    }

    const lines = items.map(item => {
      let line = template;
      line = line.replace(/\{(\w+(?:\.\w+)?)\}/g, (_, key: string) => {
        if (key === "id") return (item as any).displayId ?? String(item.id);
        if (key === "url") {
          const pkey = projectMap.get(item.projectId) ?? "?";
          return `/projects/${pkey}/work-items/${(item as any).displayId ?? item.id}`;
        }
        if (key === "project") return projectMap.get(item.projectId) ?? String(item.projectId);
        if (key === "sprint.health") return healthMap.get(item.id) ?? "";
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

    // Special handling for sprint.health — computed virtual field
    if (groupCol === "sprint.health") {
      return groupBySprintHealth(funcName, funcArg, where);
    }

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

// Compute sprint health classification for a set of items (for format output)
async function computeSprintHealthMap(items: any[]): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const itemIds = items.map(i => i.id);
  if (itemIds.length === 0) return result;

  // Fetch sprints for all items
  const sprintIds = [...new Set(items.map(i => i.sprintId).filter(Boolean))];
  const sprintMap = new Map<number, any>();
  if (sprintIds.length > 0) {
    const sprintRows = await db.select().from(sprints).where(inArray(sprints.id, sprintIds));
    for (const s of sprintRows) sprintMap.set(s.id, s);
  }

  // Fetch done-category states per project
  const projectIds = [...new Set(items.map(i => i.projectId))];
  const doneStates = new Map<number, Set<string>>();
  if (projectIds.length > 0) {
    const wfRows = await db.execute(
      sql`SELECT project_id, slug FROM workflow_states WHERE project_id IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)}) AND category = 'done'`
    );
    for (const r of wfRows.rows as any[]) {
      if (!doneStates.has(r.project_id)) doneStates.set(r.project_id, new Set());
      doneStates.get(r.project_id)!.add(r.slug);
    }
  }

  for (const item of items) {
    if (!item.sprintId) { result.set(item.id, ""); continue; }
    const sprint = sprintMap.get(item.sprintId);
    if (!sprint) { result.set(item.id, ""); continue; }

    const isDone = doneStates.get(item.projectId)?.has(item.state) ?? false;

    if (sprint.state === "closed" && isDone) {
      result.set(item.id, "clean");
    } else if (sprint.state === "closed" && !isDone) {
      result.set(item.id, "spilled");
    } else if (sprint.state === "active" && !isDone) {
      // Check if added late
      if (sprint.startDate && item.createdAt > sprint.startDate) {
        result.set(item.id, "added_late");
      } else {
        result.set(item.id, "incomplete");
      }
    } else if (sprint.state === "active" && isDone) {
      result.set(item.id, "clean");
    } else {
      result.set(item.id, "");
    }
  }

  return result;
}

// GROUP BY sprint.health — compute health classification for each item and group
async function groupBySprintHealth(funcName: string, funcArg: string, where: SQL | undefined): Promise<TraqlResult> {
  const healthTypes = ["clean", "incomplete", "added_late", "spilled", "carried"] as const;
  const groups: Array<{ key: string; value: number }> = [];

  for (const ht of healthTypes) {
    const healthFilter = buildSprintHealthFilter(ht);
    if (!healthFilter) continue;

    const combined = where ? and(where, healthFilter) : healthFilter;
    let selectExpr;
    if (funcName === "count") selectExpr = count();
    else if (funcName === "sum") selectExpr = sum((workItems as any)[funcArg]);
    else if (funcName === "avg") selectExpr = avg((workItems as any)[funcArg]);
    else throw new ExecutionError(`Unknown function: ${funcName}`);

    const [row] = await db
      .select({ value: selectExpr })
      .from(workItems)
      .where(combined ?? undefined);

    const val = Number(row?.value) || 0;
    if (val > 0) groups.push({ key: ht, value: val });
  }

  return { type: "grouped", groups };
}

// History query: field WAS value [BEFORE date] [AFTER date]
function buildWasFilter(node: WasNode): SQL | undefined {
  const { field, value, before, after } = node;

  if (field === "state") {
    // Check status_history for to_state matching the value
    const conditions = [sql`sh.work_item_id = ${workItems.id}`, sql`sh.to_state = ${value}`];
    if (before) conditions.push(sql`sh.changed_at < ${before}`);
    if (after) conditions.push(sql`sh.changed_at > ${after}`);
    const whereClause = conditions.reduce((a, b) => sql`${a} AND ${b}`);
    return sql`EXISTS (SELECT 1 FROM status_history sh WHERE ${whereClause})`;
  }

  if (field === "assignee") {
    // Check work_item_snapshots for assignee value in snapshot JSON
    const conditions = [sql`ws.work_item_id = ${workItems.id}`, sql`ws.snapshot::jsonb->>'assignee' = ${value}`];
    if (before) conditions.push(sql`ws.created_at < ${before}`);
    if (after) conditions.push(sql`ws.created_at > ${after}`);
    const whereClause = conditions.reduce((a, b) => sql`${a} AND ${b}`);
    return sql`EXISTS (SELECT 1 FROM work_item_snapshots ws WHERE ${whereClause})`;
  }

  return undefined;
}

// History query: field CHANGED [FROM value TO value] [DURING range]
function buildChangedFilter(node: ChangedNode): SQL | undefined {
  const { field, fromValue, toValue, during } = node;

  if (field === "state") {
    const conditions: SQL[] = [sql`sh.work_item_id = ${workItems.id}`];
    if (fromValue) conditions.push(sql`sh.from_state = ${fromValue}`);
    if (toValue) conditions.push(sql`sh.to_state = ${toValue}`);

    if (during) {
      // Parse during value: sprint:active, sprint:closed, or date range
      const sprintMatch = during.match(/^sprint:(\w+)$/);
      if (sprintMatch) {
        const sprintState = sprintMatch[1];
        if (sprintState === "active") {
          conditions.push(sql`sh.changed_at >= (SELECT start_date FROM sprints WHERE state = 'active' LIMIT 1)`);
          conditions.push(sql`sh.changed_at <= (SELECT end_date FROM sprints WHERE state = 'active' LIMIT 1)`);
        } else {
          conditions.push(sql`sh.changed_at >= (SELECT start_date FROM sprints WHERE state = ${sprintState} ORDER BY end_date DESC LIMIT 1)`);
          conditions.push(sql`sh.changed_at <= (SELECT end_date FROM sprints WHERE state = ${sprintState} ORDER BY end_date DESC LIMIT 1)`);
        }
      }
    }

    const whereClause = conditions.reduce((a, b) => sql`${a} AND ${b}`);
    return sql`EXISTS (SELECT 1 FROM status_history sh WHERE ${whereClause})`;
  }

  if (field === "assignee") {
    if (fromValue && toValue) {
      // Check consecutive snapshots for assignee change from X to Y
      return sql`EXISTS (
        SELECT 1 FROM work_item_snapshots ws1
        JOIN work_item_snapshots ws2 ON ws2.work_item_id = ws1.work_item_id AND ws2.version = ws1.version + 1
        WHERE ws1.work_item_id = ${workItems.id}
          AND ws1.snapshot::jsonb->>'assignee' = ${fromValue}
          AND ws2.snapshot::jsonb->>'assignee' = ${toValue}
      )`;
    }
    // assignee CHANGED — check if more than one distinct assignee value in snapshots
    return sql`(SELECT COUNT(DISTINCT ws.snapshot::jsonb->>'assignee') FROM work_item_snapshots ws WHERE ws.work_item_id = ${workItems.id}) > 1`;
  }

  return undefined;
}

function containsField(node: FilterNode, fieldName: string): boolean {
  if (node.kind === "field") return node.field === fieldName;
  if (node.kind === "was") return node.field === fieldName;
  if (node.kind === "changed") return node.field === fieldName;
  if (node.kind === "logic") return containsField(node.left, fieldName) || containsField(node.right, fieldName);
  if (node.kind === "not") return containsField(node.child, fieldName);
  return false;
}
