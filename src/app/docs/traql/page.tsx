"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, ArrowLeft, Play } from "lucide-react";
import Link from "next/link";

interface Example {
  query: string;
  note: string;
}

interface Section {
  title: string;
  description: string;
  examples: Example[];
}

const sections: Section[] = [
  {
    title: "Field Queries",
    description: "Filter by any work item property. Fields support equality, comparison, negation, containment, and range operators.",
    examples: [
      { query: "type:story", note: "Stories only" },
      { query: "state:in_progress", note: "In-progress items" },
      { query: "assignee:Hannes", note: "Assigned to Hannes" },
      { query: 'title:~"sprint planning"', note: "Title contains text (case-insensitive)" },
      { query: "points:>=5", note: "5 or more story points" },
      { query: "priority:>2", note: "Priority above 2" },
      { query: "id:300..310", note: "ID range (inclusive)" },
    ],
  },
  {
    title: "Negation & Multi-value",
    description: "Prefix a value with ! to exclude it. Use | to match any of several values.",
    examples: [
      { query: "state:!done", note: "Not done" },
      { query: "type:story|bug", note: "Stories or bugs" },
      { query: "state:ready|in_progress", note: "Ready or in progress" },
    ],
  },
  {
    title: "Project Queries",
    description: "Query across projects or scope to a specific one. Use the project key (e.g. PIC, TRK).",
    examples: [
      { query: "project:PIC", note: "Items in Pictura" },
      { query: "project:PIC|TRK", note: "Items in either project" },
      { query: "project:all", note: "All projects you have access to" },
      { query: "project:PIC type:story is:open", note: "Open Pictura stories" },
      { query: "SELECT count() GROUP BY project WHERE is:open", note: "Open items per project" },
    ],
  },
  {
    title: "Dates & Time",
    description: "Filter by date fields using absolute dates, relative ranges, or functions. Supported fields: created, updated, start, end.",
    examples: [
      { query: "created:>2026-01-01", note: "Created after date" },
      { query: "updated:last(7d)", note: "Updated in last 7 days" },
      { query: "updated:last(2w)", note: "Updated in last 2 weeks" },
      { query: "created:2026-01..2026-03", note: "Created in Q1" },
      { query: "created:within(sprint:active)", note: "Created during the active sprint" },
      { query: "end:<today()", note: "Past end date (overdue)" },
    ],
  },
  {
    title: "Sprint Queries",
    description: "Filter by sprint assignment, name, or state.",
    examples: [
      { query: 'sprint:"Sprint 9"', note: "In a specific sprint (quote names with spaces)" },
      { query: "sprint:active", note: "In the currently active sprint" },
      { query: "sprint:none", note: "Not in any sprint (backlog)" },
      { query: "sprint.state:closed", note: "In a closed sprint" },
    ],
  },
  {
    title: "Hierarchy Traversal",
    description: "Query based on parent, children, ancestors (any level up), or descendants (any level down). This is where TraQL goes beyond JQL.",
    examples: [
      { query: "parent.type:epic", note: "Direct parent is an epic" },
      { query: "parent.state:active", note: "Parent is active" },
      { query: 'ancestor.title:~"Core"', note: "Has an ancestor whose title contains \"Core\"" },
      { query: "children.state:all(done)", note: "All direct children are done" },
      { query: "children.state:any(in_progress)", note: "At least one child is in progress" },
      { query: "children.type:has(bug)", note: "Has at least one bug child" },
      { query: "children.count:>3", note: "More than 3 direct children" },
      { query: "descendant.count:>10", note: "More than 10 total descendants (recursive)" },
    ],
  },
  {
    title: "Logic & Grouping",
    description: "Combine conditions with AND (implicit or explicit), OR, NOT, and parentheses. Adjacent conditions are implicitly AND-ed.",
    examples: [
      { query: "type:story state:ready", note: "Implicit AND — both conditions" },
      { query: "type:story AND state:ready", note: "Explicit AND — same as above" },
      { query: "type:story OR type:bug", note: "Either condition" },
      { query: "NOT state:done", note: "Negated condition" },
      { query: "(type:story OR type:bug) AND state:!done", note: "Grouped logic with parentheses" },
    ],
  },
  {
    title: "Syntactic Sugar",
    description: "Shortcuts for common queries. These expand to their full form at parse time.",
    examples: [
      { query: "is:open", note: "→ state:!done" },
      { query: "is:closed", note: "→ state:done" },
      { query: "is:unassigned", note: "→ assignee:none" },
      { query: "is:overdue", note: "→ end:<today()" },
      { query: "is:stale", note: "→ updated:last(14d) AND state:!done" },
      { query: "my:items", note: "→ assignee:me (current user)" },
    ],
  },
  {
    title: "Sorting",
    description: "Append ORDER BY to any query to sort results. Supports multiple fields with ASC (default) or DESC.",
    examples: [
      { query: "type:story ORDER BY created DESC", note: "Newest stories first" },
      { query: "is:open ORDER BY priority DESC, title", note: "By priority descending, then title ascending" },
    ],
  },
  {
    title: "Aggregations",
    description: "Use SELECT with count(), sum(), or avg() to get numeric results instead of work items. Add GROUP BY to break down by a field.",
    examples: [
      { query: "SELECT count() WHERE type:story AND state:done", note: "→ 42" },
      { query: "SELECT sum(points) WHERE sprint:active", note: "→ 34" },
      { query: "SELECT avg(points) WHERE type:story", note: "→ 4.2" },
      { query: "SELECT count() GROUP BY state", note: "→ {new: 5, active: 3, ...}" },
      { query: "SELECT sum(points) GROUP BY assignee WHERE sprint:active", note: "→ {Hannes: 13, ...}" },
      { query: "SELECT count() GROUP BY parent.title WHERE type:story AND is:open", note: "Open stories per feature" },
      { query: "SELECT count() GROUP BY project WHERE is:open", note: "Cross-project breakdown" },
    ],
  },
  {
    title: "Text Output",
    description: 'Use SELECT format("template") to produce formatted text. Templates use {field} for interpolation. Supports any field including parent.title and the special {url} placeholder.',
    examples: [
      { query: 'SELECT format("{title} (#{id})") WHERE sprint:active', note: "Title and ID per item" },
      { query: 'SELECT format("- [{title}]({url})") WHERE sprint:active', note: "Markdown link list" },
      { query: 'SELECT format("{title}: {points}pts") WHERE sprint:active ORDER BY points DESC', note: "Sorted text list" },
      { query: 'SELECT format("| {id} | {title} | {state} |") WHERE type:story is:open', note: "Markdown table rows" },
      { query: 'SELECT format("{assignee}: {title}") GROUP BY assignee WHERE sprint:active', note: "Grouped by person" },
      { query: 'SELECT format("{parent.title} → {title}") WHERE type:story state:in_progress', note: "Include parent fields" },
    ],
  },
];

// Syntax highlighting
function Highlight({ query }: { query: string }) {
  const keywords = new Set(["AND", "OR", "NOT", "ORDER", "BY", "SELECT", "WHERE", "GROUP", "ASC", "DESC"]);
  const parts = query.split(/(\s+|[():,])/);
  return (
    <code className="text-[13px]">
      {parts.map((part, i) => {
        if (/^\s+$/.test(part) || /^[():,]$/.test(part))
          return <span key={i} className="text-text-tertiary">{part}</span>;
        if (keywords.has(part))
          return <span key={i} className="text-purple-500 font-semibold">{part}</span>;
        const colonIdx = part.indexOf(":");
        if (colonIdx > 0) {
          const field = part.slice(0, colonIdx);
          const value = part.slice(colonIdx + 1);
          return (
            <span key={i}>
              <span className="text-blue-500">{field}</span>
              <span className="text-text-tertiary">:</span>
              <span className="text-amber-600">{value}</span>
            </span>
          );
        }
        if (part.match(/^\w+\(/) || part.endsWith("()"))
          return <span key={i} className="text-teal-500">{part}</span>;
        return <span key={i}>{part}</span>;
      })}
    </code>
  );
}

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

export default function TraqlReferencePage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  function toggle(idx: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-content-bg">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent transition-colors mb-6">
            <ArrowLeft className="w-3 h-3" /> Back to Trakr
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0">
              <rect width="32" height="32" rx="6" fill="#6366F1"/>
              <rect x="7" y="8" width="5" height="16" rx="1.5" fill="white" opacity="0.9"/>
              <rect x="14" y="12" width="5" height="12" rx="1.5" fill="white" opacity="0.7"/>
              <rect x="21" y="10" width="5" height="14" rx="1.5" fill="white" opacity="0.5"/>
            </svg>
            <h1 className="text-2xl font-bold text-text-primary">TraQL Language Reference</h1>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            TraQL (Trakr Query Language) is a structured query language for work items.
            It supports field filtering, hierarchy traversal, date arithmetic, cross-project queries,
            aggregations, and formatted text output.
          </p>
        </div>

        {/* Quick start */}
        <div className="bg-surface border border-border rounded-lg p-5 mb-8">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Quick Start</h2>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>Open the <strong>Queries</strong> page from the sidebar. Type a query and press <kbd className="px-1.5 py-0.5 bg-content-bg border border-border rounded text-xs font-mono">Cmd+Enter</kbd> to run it.</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-content-bg rounded-md p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">Find open stories</p>
                <Highlight query="type:story is:open" />
              </div>
              <div className="bg-content-bg rounded-md p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">Count by status</p>
                <Highlight query="SELECT count() GROUP BY state" />
              </div>
              <div className="bg-content-bg rounded-md p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">Features with all stories done</p>
                <Highlight query="type:feature children.state:all(done)" />
              </div>
              <div className="bg-content-bg rounded-md p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">Sprint standup list</p>
                <Highlight query={'SELECT format("- [{title}]({url})") WHERE sprint:active'} />
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {sections.map((section, si) => (
            <div key={si} className="bg-surface border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(si)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-content-bg/50 transition-colors"
              >
                {expanded.has(si) ? (
                  <ChevronDown className="w-4 h-4 text-text-tertiary shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
                )}
                <span className="text-sm font-semibold text-text-primary">{section.title}</span>
                <span className="text-xs text-text-tertiary ml-2">{section.examples.length} examples</span>
              </button>

              {expanded.has(si) && (
                <div className="px-5 pb-4 border-t border-border/50">
                  <p className="text-xs text-text-secondary py-3 leading-relaxed">{section.description}</p>
                  <div className="space-y-1">
                    {section.examples.map((ex, ei) => (
                      <div
                        key={ei}
                        className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-content-bg transition-colors group cursor-pointer"
                        onClick={() => {
                          navigator.clipboard?.writeText(ex.query);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <Highlight query={ex.query} />
                          <p className="text-[11px] text-text-tertiary mt-0.5">{ex.note}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex gap-1 mt-0.5">
                          <CopyButton text={ex.query} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Grammar summary */}
        <div className="mt-8 bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Grammar Summary</h2>
          <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-4 overflow-x-auto leading-relaxed">{`query     = filter [ORDER BY sort_list]
          | SELECT func [GROUP BY field] [WHERE filter] [ORDER BY sort_list]

filter    = condition { (AND | OR) condition }
condition = NOT condition | "(" filter ")" | field_expr
field_expr= field ":" [operator] value

field     = word { "." word }        # e.g. parent.type, children.state
operator  = "!" | "~" | ">" | ">=" | "<" | "<="
value     = word | quoted_string | word "|" word  | word ".." word | func

func      = word "(" [args] ")"      # count(), sum(points), all(done), last(7d)
sort_list = field [ASC|DESC] { "," field [ASC|DESC] }

# Shortcuts: is:open, is:closed, is:unassigned, is:overdue, is:stale, my:items
# Special values: none, me, active, all, today()`}</pre>
        </div>

        <div className="mt-6 text-center text-xs text-text-tertiary">
          TraQL is read-only — it cannot modify work items.
        </div>
      </div>
    </div>
  );
}
