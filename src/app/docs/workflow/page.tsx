"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */

interface WorkflowState {
  slug: string;
  displayName: string;
  category: "todo" | "in_progress" | "done";
  color: string;
}

interface Preset {
  name: string;
  description: string;
  states: WorkflowState[];
}

const presets: Preset[] = [
  {
    name: "Simple",
    description: "Three states for small projects or personal task tracking. Minimal overhead, maximum clarity.",
    states: [
      { slug: "todo", displayName: "To Do", category: "todo", color: "#6B7280" },
      { slug: "in_progress", displayName: "In Progress", category: "in_progress", color: "#F59E0B" },
      { slug: "done", displayName: "Done", category: "done", color: "#10B981" },
    ],
  },
  {
    name: "Standard",
    description: "The default for most teams. Adds a Ready column for groomed items and a review gate before done.",
    states: [
      { slug: "new", displayName: "New", category: "todo", color: "#6B7280" },
      { slug: "ready", displayName: "Ready", category: "todo", color: "#3B82F6" },
      { slug: "in_progress", displayName: "In Progress", category: "in_progress", color: "#F59E0B" },
      { slug: "in_review", displayName: "In Review", category: "in_progress", color: "#8B5CF6" },
      { slug: "done", displayName: "Done", category: "done", color: "#10B981" },
    ],
  },
  {
    name: "Delivery Pipeline",
    description: "For teams that track work through QA, staging, and deployment. Mirrors a CI/CD pipeline.",
    states: [
      { slug: "backlog", displayName: "Backlog", category: "todo", color: "#6B7280" },
      { slug: "ready", displayName: "Ready", category: "todo", color: "#3B82F6" },
      { slug: "in_progress", displayName: "In Progress", category: "in_progress", color: "#F59E0B" },
      { slug: "in_review", displayName: "In Review", category: "in_progress", color: "#8B5CF6" },
      { slug: "qa", displayName: "QA", category: "in_progress", color: "#EC4899" },
      { slug: "staging", displayName: "Staging", category: "in_progress", color: "#14B8A6" },
      { slug: "deployed", displayName: "Deployed", category: "done", color: "#10B981" },
      { slug: "closed", displayName: "Closed", category: "done", color: "#9CA3AF" },
    ],
  },
];

const categoryColors: Record<string, { bg: string; text: string; label: string }> = {
  todo: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", label: "To Do" },
  in_progress: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", label: "In Progress" },
  done: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", label: "Done" },
};

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded hover:bg-content-bg text-text-tertiary hover:text-text-secondary transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="relative bg-content-bg rounded-md overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="text-xs text-text-secondary font-mono p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
      {!label && (
        <div className="absolute top-2 right-2">
          <CopyButton text={code} />
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-content-bg/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-text-tertiary shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
        )}
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        {badge && <span className="text-xs text-text-tertiary ml-2">{badge}</span>}
      </button>
      {open && <div className="px-5 pb-5 border-t border-border/50">{children}</div>}
    </div>
  );
}

function StatePill({ state }: { state: WorkflowState }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: state.color + "18", color: state.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: state.color }} />
      {state.displayName}
    </span>
  );
}

function WorkflowDiagram({ states }: { states: WorkflowState[] }) {
  const grouped = {
    todo: states.filter((s) => s.category === "todo"),
    in_progress: states.filter((s) => s.category === "in_progress"),
    done: states.filter((s) => s.category === "done"),
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {(["todo", "in_progress", "done"] as const).map((cat) => {
        const info = categoryColors[cat];
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat} className={`flex-1 min-w-[120px] rounded-lg p-3 ${info.bg}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${info.text}`}>
              {info.label}
            </p>
            <div className="space-y-1.5">
              {items.map((s) => (
                <div key={s.slug} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-text-primary">{s.displayName}</span>
                  <span className="text-[10px] text-text-tertiary font-mono ml-auto">{s.slug}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WorkflowGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0">
            <rect width="32" height="32" rx="6" fill="#6366F1" />
            <rect x="7" y="8" width="5" height="16" rx="1.5" fill="white" opacity="0.9" />
            <rect x="14" y="12" width="5" height="12" rx="1.5" fill="white" opacity="0.7" />
            <rect x="21" y="10" width="5" height="14" rx="1.5" fill="white" opacity="0.5" />
          </svg>
          <h1 className="text-2xl font-bold text-text-primary">Workflows Guide</h1>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          Every Stori project has its own configurable workflow -- a set of states that work items
          move through from creation to completion. This guide explains how workflows work, how to
          set them up, and how they integrate with boards, TraQL, and the API.
        </p>
      </div>

      {/* Quick concept */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">How It Works</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
              <span className="text-lg">1</span>
            </div>
            <p className="text-xs text-text-secondary">
              <strong className="text-text-primary block mb-0.5">Define states</strong>
              Each state has a slug, display name, and category
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-lg">2</span>
            </div>
            <p className="text-xs text-text-secondary">
              <strong className="text-text-primary block mb-0.5">Group by category</strong>
              States belong to To Do, In Progress, or Done
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-lg">3</span>
            </div>
            <p className="text-xs text-text-secondary">
              <strong className="text-text-primary block mb-0.5">Drive the board</strong>
              Categories become board columns automatically
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {/* What are workflows */}
        <CollapsibleSection title="What Are Workflows?" defaultOpen>
          <div className="space-y-3 pt-3 text-xs text-text-secondary leading-relaxed">
            <p>
              A workflow defines the lifecycle of work items within a project. It is a flat, ordered
              list of <strong className="text-text-primary">states</strong>, each assigned to one of
              three <strong className="text-text-primary">categories</strong>:
            </p>
            <div className="border border-border/50 rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-content-bg/50">
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Category</th>
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Meaning</th>
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Board Column</th>
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">TraQL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/30">
                    <td className="px-3 py-2 font-semibold text-gray-500">To Do</td>
                    <td className="px-3 py-2">Work not yet started</td>
                    <td className="px-3 py-2">Left column(s)</td>
                    <td className="px-3 py-2 font-mono text-[11px]">is:open</td>
                  </tr>
                  <tr className="border-t border-border/30">
                    <td className="px-3 py-2 font-semibold text-amber-500">In Progress</td>
                    <td className="px-3 py-2">Work actively being done</td>
                    <td className="px-3 py-2">Middle column(s)</td>
                    <td className="px-3 py-2 font-mono text-[11px]">is:open</td>
                  </tr>
                  <tr className="border-t border-border/30">
                    <td className="px-3 py-2 font-semibold text-emerald-500">Done</td>
                    <td className="px-3 py-2">Work completed</td>
                    <td className="px-3 py-2">Right column(s)</td>
                    <td className="px-3 py-2 font-mono text-[11px]">is:closed</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Every project must have at least one state in each category. This ensures the board
              always has a starting point, an active area, and a resolution.
            </p>
          </div>
        </CollapsibleSection>

        {/* Default presets */}
        <CollapsibleSection title="Default Workflow Presets" badge="3 presets">
          <div className="space-y-6 pt-3">
            {presets.map((preset) => (
              <div key={preset.name}>
                <h3 className="text-sm font-semibold text-text-primary mb-1">{preset.name}</h3>
                <p className="text-xs text-text-secondary mb-3">{preset.description}</p>
                <WorkflowDiagram states={preset.states} />
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Slug vs Display Name */}
        <CollapsibleSection title="Slugs vs Display Names">
          <div className="space-y-3 pt-3 text-xs text-text-secondary leading-relaxed">
            <p>Each state has two identifiers:</p>
            <div className="border border-border/50 rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-content-bg/50">
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Property</th>
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Example</th>
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Mutable?</th>
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Used In</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/30">
                    <td className="px-3 py-2 font-semibold text-text-primary">slug</td>
                    <td className="px-3 py-2 font-mono text-blue-500">in_progress</td>
                    <td className="px-3 py-2 text-red-400">Immutable</td>
                    <td className="px-3 py-2">Data storage, API, TraQL, MCP</td>
                  </tr>
                  <tr className="border-t border-border/30">
                    <td className="px-3 py-2 font-semibold text-text-primary">displayName</td>
                    <td className="px-3 py-2 text-amber-600">Working On</td>
                    <td className="px-3 py-2 text-emerald-400">Editable</td>
                    <td className="px-3 py-2">UI (board columns, dropdowns, badges)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              The <strong className="text-text-primary">slug</strong> is auto-generated from the
              display name when a state is created (e.g., &quot;QA Review&quot; becomes <code className="px-1 py-0.5 bg-content-bg border border-border/50 rounded text-[11px] font-mono">qa_review</code>).
              It never changes, even if you rename the state. This means TraQL queries, API
              integrations, and saved filters remain stable when you rename states.
            </p>
            <div className="bg-content-bg rounded-md p-3">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Example</p>
              <p>
                You create a state &quot;In Dev&quot; (slug: <code className="font-mono text-[11px]">in_dev</code>).
                Later you rename it to &quot;Development&quot;. The slug stays <code className="font-mono text-[11px]">in_dev</code>.
                The TraQL query <code className="font-mono text-[11px]">state:in_dev</code> continues to work.
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Setting up */}
        <CollapsibleSection title="Setting Up a Workflow">
          <div className="space-y-4 pt-3 text-xs text-text-secondary leading-relaxed">
            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-1.5">Apply a Preset</h3>
              <p className="mb-2">
                The fastest way to get started. Go to <strong className="text-text-primary">Project Settings &gt; Workflow</strong> and
                select one of the three presets (Simple, Standard, or Delivery Pipeline). This replaces
                the current workflow entirely.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-1.5">Add a State</h3>
              <p className="mb-2">
                Click &quot;Add State&quot; in the workflow editor or use the API/MCP:
              </p>
              <CodeBlock
                code={`// Add a "QA" state via MCP
await mcp.add_workflow_state({
  projectId: 1,
  displayName: "QA",
  category: "in_progress",
  color: "#EC4899"
});`}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-1.5">Rename a State</h3>
              <p className="mb-2">
                Change the display name without affecting the slug. Existing queries and data remain intact.
              </p>
              <CodeBlock
                code={`await mcp.update_workflow_state({
  projectId: 1,
  stateId: 3,
  displayName: "Working On"
});
// slug stays "in_progress", board shows "Working On"`}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-1.5">Reorder States</h3>
              <p>
                Drag states in the workflow editor to reorder them. The order controls how they appear
                on the board (left to right) and in dropdowns. States are ordered within their category.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-1.5">Delete a State</h3>
              <p className="mb-2">
                You cannot delete the last state in a category. If work items exist in the state
                being deleted, you must specify a migration target:
              </p>
              <CodeBlock
                code={`// Delete "staging" and move its items to "deployed"
await mcp.delete_workflow_state({
  projectId: 1,
  stateId: 6,
  migrateToSlug: "deployed"
});`}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* TraQL integration */}
        <CollapsibleSection title="TraQL Integration">
          <div className="space-y-3 pt-3 text-xs text-text-secondary leading-relaxed">
            <p>
              Workflow states are first-class citizens in TraQL. You can filter, negate, and combine
              state queries with any other field.
            </p>

            <div className="border border-border/50 rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-content-bg/50">
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Query</th>
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { q: "state:in_progress", m: "Items in the \"In Progress\" state" },
                    { q: "state:deployed", m: "Items in the \"Deployed\" state" },
                    { q: "state:!done", m: "Items not in the \"Done\" state" },
                    { q: "state:ready|in_progress", m: "Items in Ready or In Progress" },
                    { q: "is:open", m: "All items NOT in a Done-category state" },
                    { q: "is:closed", m: "All items in a Done-category state" },
                    { q: "SELECT count() GROUP BY state", m: "Count of items per state" },
                    { q: "children.state:all(done)", m: "Items where all children are done" },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-border/30">
                      <td className="px-3 py-2 font-mono text-[11px] text-blue-500 whitespace-nowrap">{row.q}</td>
                      <td className="px-3 py-2">{row.m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-content-bg rounded-md p-3">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Important</p>
              <p>
                <code className="font-mono text-[11px]">is:open</code> matches all items where the
                state&apos;s <strong className="text-text-primary">category</strong> is either <code className="font-mono text-[11px]">todo</code> or <code className="font-mono text-[11px]">in_progress</code>.
                It does <em>not</em> check the state slug itself. This means if you create a custom
                state called &quot;Parked&quot; in the <code className="font-mono text-[11px]">todo</code> category,
                it will still show up in <code className="font-mono text-[11px]">is:open</code> results.
              </p>
            </div>

            <p>
              See the{" "}
              <Link href="/docs/traql" className="text-accent hover:underline">
                TraQL Reference
              </Link>{" "}
              for the full query language documentation.
            </p>
          </div>
        </CollapsibleSection>

        {/* API */}
        <CollapsibleSection title="API Reference">
          <div className="space-y-3 pt-3 text-xs text-text-secondary leading-relaxed">
            <p>
              The workflow API is scoped under each project. All endpoints accept and return JSON.
            </p>

            <div className="border border-border/50 rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-content-bg/50">
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Method</th>
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Endpoint</th>
                    <th className="text-left px-3 py-2 text-text-tertiary font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { method: "GET", endpoint: "/api/projects/:id/workflow", desc: "List all states (ordered by position)" },
                    { method: "POST", endpoint: "/api/projects/:id/workflow", desc: "Add a new state" },
                    { method: "PATCH", endpoint: "/api/projects/:id/workflow/:stateId", desc: "Update display name, category, or color" },
                    { method: "DELETE", endpoint: "/api/projects/:id/workflow/:stateId", desc: "Delete a state (with optional migration)" },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-border/30">
                      <td className="px-3 py-2">
                        <span className={`font-mono text-[11px] font-semibold ${
                          row.method === "GET" ? "text-emerald-500" :
                          row.method === "POST" ? "text-blue-500" :
                          row.method === "PATCH" ? "text-amber-500" :
                          "text-red-500"
                        }`}>{row.method}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-text-primary">{row.endpoint}</td>
                      <td className="px-3 py-2">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p>
              For full API documentation including request/response schemas, see the{" "}
              <Link href="/docs/api" className="text-accent hover:underline">
                REST API Reference
              </Link>.
            </p>
          </div>
        </CollapsibleSection>

        {/* Best practices */}
        <CollapsibleSection title="Best Practices">
          <div className="space-y-3 pt-3 text-xs text-text-secondary leading-relaxed">
            <ul className="space-y-3">
              <li className="flex gap-2">
                <span className="text-emerald-500 shrink-0 mt-0.5">&#10003;</span>
                <div>
                  <strong className="text-text-primary">Start simple, add states as needed.</strong>{" "}
                  Most teams do well with 4-5 states. Only add a state when you find yourself
                  regularly needing to distinguish between two phases of work.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 shrink-0 mt-0.5">&#10003;</span>
                <div>
                  <strong className="text-text-primary">Don&apos;t add states you won&apos;t use.</strong>{" "}
                  Unused states clutter the board and create decision fatigue. If nobody ever moves
                  items to &quot;Staging&quot;, remove it.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 shrink-0 mt-0.5">&#10003;</span>
                <div>
                  <strong className="text-text-primary">Each category needs at least one state.</strong>{" "}
                  Stori enforces a minimum of one state per category (To Do, In Progress, Done).
                  This ensures the board always has a complete flow.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 shrink-0 mt-0.5">&#10003;</span>
                <div>
                  <strong className="text-text-primary">Use display names for your team, slugs for automation.</strong>{" "}
                  Rename display names freely to match your team&apos;s language. Slugs are stable
                  identifiers that scripts, queries, and integrations should rely on.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500 shrink-0 mt-0.5">!</span>
                <div>
                  <strong className="text-text-primary">Be careful with Done-category states.</strong>{" "}
                  Items in Done-category states are excluded from <code className="px-1 py-0.5 bg-content-bg border border-border/50 rounded text-[11px] font-mono">is:open</code> queries
                  and may not appear on active board views. Make sure your team understands which
                  states mean &quot;finished.&quot;
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500 shrink-0 mt-0.5">!</span>
                <div>
                  <strong className="text-text-primary">Migrate before deleting.</strong>{" "}
                  When removing a state that has existing items, always specify a{" "}
                  <code className="px-1 py-0.5 bg-content-bg border border-border/50 rounded text-[11px] font-mono">migrateToSlug</code>{" "}
                  to avoid orphaned work items.
                </div>
              </li>
            </ul>
          </div>
        </CollapsibleSection>
      </div>

      <div className="mt-8 text-center text-xs text-text-tertiary">
        Workflows are project-scoped. Each project can have a completely different set of states.
      </div>
    </div>
  );
}
