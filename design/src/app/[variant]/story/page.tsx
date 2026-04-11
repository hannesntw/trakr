"use client";

import { useState } from "react";
import { useVariant } from "@/components/VariantContext";
import {
  Circle, CircleDot, CircleCheck, Play,
  ChevronDown, ChevronRight, RotateCcw, Globe, Terminal, Cpu,
  ArrowLeft, Paperclip, MessageSquare, ImagePlus,
} from "lucide-react";
import Link from "next/link";

// --- Shared ---
function StateIcon({ state, size = 16 }: { state: string; size?: number }) {
  const map: Record<string, { icon: typeof Circle; color: string }> = {
    new: { icon: Circle, color: "text-gray-400" },
    active: { icon: CircleDot, color: "text-blue-500" },
    ready: { icon: CircleDot, color: "text-amber-500" },
    in_progress: { icon: Play, color: "text-indigo-500" },
    done: { icon: CircleCheck, color: "text-emerald-500" },
  };
  const cfg = map[state] ?? map.new;
  const Icon = cfg.icon;
  return <Icon style={{ width: size, height: size }} className={`${cfg.color} shrink-0`} />;
}

const stateLabels: Record<string, string> = { new: "New", active: "Active", ready: "Ready", in_progress: "In Progress", done: "Done" };
const stateColors: Record<string, string> = { new: "bg-gray-100 border-gray-300", active: "bg-blue-50 border-blue-300", ready: "bg-amber-50 border-amber-300", in_progress: "bg-indigo-50 border-indigo-300", done: "bg-emerald-50 border-emerald-300" };
const stateBadge: Record<string, string> = { new: "text-gray-600 bg-gray-50 border-gray-200", active: "text-blue-600 bg-blue-50 border-blue-200", ready: "text-amber-600 bg-amber-50 border-amber-200", in_progress: "text-indigo-600 bg-indigo-50 border-indigo-200", done: "text-emerald-600 bg-emerald-50 border-emerald-200" };

function ChannelIcon({ channel }: { channel: "web" | "api" | "mcp" }) {
  const map = {
    web: { icon: Globe, label: "Web", color: "text-blue-500" },
    api: { icon: Terminal, label: "API", color: "text-amber-500" },
    mcp: { icon: Cpu, label: "MCP", color: "text-purple-500" },
  };
  const cfg = map[channel];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${cfg.color}`} title={cfg.label}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// --- Mock data mimicking the real Trakr detail page ---
const story = {
  id: 72,
  title: "Project Settings and Invites",
  type: "story" as const,
  state: "done",
  assignee: "Claude",
  sprint: "Sprint 6 — User Management",
  parentId: 69,
  parentTitle: "User Management",
  createdAt: "Apr 10, 2026",
  description: `As a project owner, I want to manage my project's settings and invite others by email so colleagues can collaborate on my project.

### Context
The Settings page is accessible from the sidebar for projects the user owns. It has four sections: General, Members, Sprint Cadence, and Danger Zone.

### Acceptance Criteria
* GIVEN I own a project WHEN I navigate to Settings THEN I see General, Members, Sprint Cadence, and Danger Zone sections
* GIVEN I enter an email and click Invite WHEN the invite is saved THEN the email appears in the member list
* GIVEN I invite someone WHEN the invite is saved THEN they receive an email with a sign-in link`,
  children: [] as { id: number; title: string; type: string; state: string }[],
  comments: [
    { author: "Claude", body: "Settings page and invite API implemented. Email notification added via Resend.", time: "2h ago" },
    { author: "Hannes", body: "Pulled this back to add email notifications — the invite should actually notify people.", time: "3h ago" },
  ],
};

const statusChanges = [
  { from: "new", to: "in_progress", at: "Apr 10, 21:39", by: "Claude", channel: "mcp" as const, duration: null },
  { from: "in_progress", to: "done", at: "Apr 10, 21:41", by: "Claude", channel: "mcp" as const, duration: "2 min" },
  { from: "done", to: "new", at: "Apr 10, 21:45", by: "Hannes", channel: "web" as const, duration: "4 min" },
  { from: "new", to: "in_progress", at: "Apr 10, 21:46", by: "Claude", channel: "mcp" as const, duration: "1 min" },
  { from: "in_progress", to: "done", at: "Apr 10, 21:47", by: "Claude", channel: "mcp" as const, duration: "1 min" },
];

// Change type: short fields use old/new, long text fields use diff lines
interface ShortChange { field: string; old: string | null; new: string; diff?: never }
interface DiffChange { field: string; old?: never; new?: never; diff: Array<{ type: "context" | "added" | "removed"; line: string }> }
type FieldChange = ShortChange | DiffChange;

interface ChangeEntry {
  version: number;
  at: string;
  by: string;
  channel: "web" | "api" | "mcp";
  fields: FieldChange[];
}

const changeLog: ChangeEntry[] = [
  {
    version: 5, at: "Apr 10, 21:47", by: "Claude", channel: "mcp",
    fields: [
      { field: "state", old: "in_progress", new: "done" },
    ],
  },
  {
    version: 4, at: "Apr 10, 21:46", by: "Claude", channel: "mcp",
    fields: [
      { field: "state", old: "new", new: "in_progress" },
      { field: "description", diff: [
        { type: "context", line: "…invite others by email so colleagues can collaborate on my project." },
        { type: "context", line: "" },
        { type: "removed", line: "### Not in Scope" },
        { type: "removed", line: "* Role management beyond owner/contributor" },
        { type: "removed", line: "* Bulk invite" },
        { type: "removed", line: "* Invite link (URL-based sharing)" },
        { type: "removed", line: "* Email notification to invited users" },
        { type: "added", line: "### Not in Scope" },
        { type: "added", line: "* Role management beyond owner/contributor" },
        { type: "added", line: "* Bulk invite" },
        { type: "added", line: "* Invite link (URL-based sharing)" },
        { type: "context", line: "" },
        { type: "removed", line: "### How to showcase" },
        { type: "removed", line: "Navigate to Settings on an owned project. Change the description. Invite" },
        { type: "removed", line: "alex@example.com — they appear in the member list. Toggle visibility to public." },
        { type: "added", line: "### In Scope" },
        { type: "added", line: "* Email notification sent to invited user with a link to sign in" },
        { type: "context", line: "" },
        { type: "added", line: "### How to showcase" },
        { type: "added", line: "Navigate to Settings on an owned project. Invite alex@example.com — they" },
        { type: "added", line: "receive an email, click the link, sign in, and see the project." },
        { type: "context", line: "" },
        { type: "context", line: "### Acceptance Criteria" },
      ]},
    ],
  },
  {
    version: 3, at: "Apr 10, 21:45", by: "Hannes", channel: "web",
    fields: [
      { field: "state", old: "done", new: "new" },
    ],
  },
  {
    version: 2, at: "Apr 10, 21:41", by: "Claude", channel: "mcp",
    fields: [
      { field: "state", old: "in_progress", new: "done" },
      { field: "description", diff: [
        { type: "context", line: "### Acceptance Criteria" },
        { type: "context", line: "* GIVEN I own a project WHEN I navigate to Settings THEN I see General," },
        { type: "context", line: "  Members, Sprint Cadence, and Danger Zone sections" },
        { type: "added", line: "* GIVEN I enter an email and click Invite WHEN the invite is saved THEN" },
        { type: "added", line: "  the email appears in the member list as Contributor" },
        { type: "added", line: "* GIVEN an invited user signs in WHEN they view the project list THEN" },
        { type: "added", line: "  they see my private project" },
        { type: "added", line: "* GIVEN I toggle visibility to public WHEN another user views the project" },
        { type: "added", line: "  list THEN they see the project without an invite" },
        { type: "added", line: "* GIVEN I click Delete WHEN confirmed THEN the project and all its data" },
        { type: "added", line: "  are removed" },
        { type: "context", line: "" },
        { type: "context", line: "### UI Design" },
        { type: "added", line: "![Settings page](/api/attachments/22)" },
      ]},
    ],
  },
  {
    version: 1, at: "Apr 10, 21:39", by: "Claude", channel: "mcp",
    fields: [
      { field: "state", old: "new", new: "in_progress" },
      { field: "assignee", old: null, new: "Claude" },
      { field: "sprintId", old: null, new: "Sprint 6 — User Management" },
    ],
  },
  {
    version: 0, at: "Apr 10, 21:32", by: "Claude", channel: "mcp",
    fields: [
      { field: "title", old: null, new: "Project Settings and Invites" },
      { field: "type", old: null, new: "story" },
      { field: "state", old: null, new: "new" },
      { field: "parentId", old: null, new: "#69 User Management" },
      { field: "description", old: null, new: "As a project owner, I want to manage my project's settings…" },
    ],
  },
];

// --- Page ---
export default function StoryDetailPage() {
  const variant = useVariant();
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <header className="h-14 px-6 flex items-center gap-3 border-b border-border bg-surface shrink-0">
        <Link href={`/${variant.id}/board`} className="p-1 rounded hover:bg-content-bg transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-secondary" />
        </Link>
        <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">Story</span>
        <span className="text-xs text-text-tertiary font-mono">#{story.id}</span>
        <span className="text-text-tertiary">/</span>
        <span className="text-sm text-text-secondary">{story.title}</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="grid grid-cols-[1fr_280px] gap-6">
            {/* Main content */}
            <div className="space-y-6">
              {/* Title */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">Story</span>
                  <span className="text-xs text-text-tertiary font-mono">#{story.id}</span>
                </div>
                <h2 className="text-xl font-semibold text-text-primary">{story.title}</h2>
              </div>

              {/* Description (markdown-like) */}
              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Description</h3>
                <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {story.description}
                </div>
              </div>

              {/* Status Timeline (feature-gated) */}
              {variant.features.storyTimeline && (
                <div>
                  <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">Status Timeline</h3>
                  <div className="bg-surface border border-border rounded-lg p-5">
                    {/* Grid: columns = node, connector, node, connector, ... */}
                    <div
                      className="grid items-center"
                      style={{
                        gridTemplateColumns: statusChanges.map((_, i) =>
                          i < statusChanges.length - 1 ? "auto 1fr" : "auto"
                        ).join(" "),
                      }}
                    >
                      {/* Row 1: icons + connectors */}
                      {statusChanges.map((change, i) => {
                        const isLast = i === statusChanges.length - 1;
                        return (
                          <div key={`icon-${i}`} className="contents">
                            <div className="flex justify-center">
                              <div className={`w-9 h-9 rounded-full border-2 ${stateColors[change.to]} flex items-center justify-center`}>
                                <StateIcon state={change.to} size={18} />
                              </div>
                            </div>
                            {!isLast && (
                              <div className="flex items-center px-1">
                                <div className={`h-0.5 flex-1 ${change.to === "done" && statusChanges[i + 1]?.from === "done" ? "bg-red-300" : "bg-border"}`} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Row 2: labels (span across connector columns too) */}
                      {statusChanges.map((change, i) => {
                        const isLast = i === statusChanges.length - 1;
                        return (
                          <div key={`label-${i}`} className="contents">
                            <div className="text-center pt-2">
                              <p className="text-[11px] font-medium text-text-primary">{stateLabels[change.to]}</p>
                              <p className="text-[10px] text-text-tertiary">{change.at.split(", ")[1]}</p>
                              <div className="mt-0.5"><ChannelIcon channel={change.channel} /></div>
                              <p className="text-[10px] text-text-secondary">{change.by}</p>
                            </div>
                            {!isLast && (
                              <div className="text-center pt-2">
                                {change.duration && <p className="text-[9px] text-text-tertiary">{change.duration}</p>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-6 mt-5 pt-4 border-t border-border">
                      <div><p className="text-[10px] text-text-tertiary uppercase tracking-wider">Lead time</p><p className="text-sm font-semibold text-text-primary">8 min</p></div>
                      <div><p className="text-[10px] text-text-tertiary uppercase tracking-wider">Cycle time</p><p className="text-sm font-semibold text-text-primary">3 min</p></div>
                      <div><p className="text-[10px] text-text-tertiary uppercase tracking-wider">Regressions</p><p className="text-sm font-semibold text-red-500">1</p></div>
                      <div><p className="text-[10px] text-text-tertiary uppercase tracking-wider">Changes</p><p className="text-sm font-semibold text-text-primary">5</p></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Change History (feature-gated, collapsed by default) */}
              {variant.features.changeHistory && (
                <div>
                  <button onClick={() => setHistoryOpen(!historyOpen)} className="flex items-center gap-2 text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3 hover:text-text-secondary transition-colors">
                    {historyOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Change History
                    <span className="font-normal normal-case">{changeLog.length} versions</span>
                  </button>

                  {historyOpen && (
                    <div className="space-y-0">
                      {changeLog.map((entry, i) => (
                        <div key={entry.version} className="relative pl-8 pb-5 last:pb-0">
                          {i < changeLog.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />}
                          <div className="absolute left-1 top-1 w-[14px] h-[14px] rounded-full bg-surface border-2 border-border" />

                          <div className="bg-surface border border-border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] text-text-tertiary font-mono">v{entry.version}</span>
                              <span className="text-[10px] text-text-tertiary">{entry.at}</span>
                              <span className="text-xs text-text-secondary">{entry.by}</span>
                              <ChannelIcon channel={entry.channel} />
                              {entry.version > 0 && (
                                <button className="ml-auto flex items-center gap-1 text-[10px] text-text-tertiary hover:text-accent transition-colors">
                                  <RotateCcw className="w-3 h-3" /> Restore
                                </button>
                              )}
                            </div>
                            <div className="space-y-2">
                              {entry.fields.map((f, j) => (
                                <div key={j}>
                                  {f.diff ? (
                                    /* Diff view for long text fields */
                                    <div>
                                      <span className="text-xs text-text-tertiary font-mono">{f.field}:</span>
                                      <div className="mt-1 rounded border border-border overflow-hidden text-[11px] font-mono leading-relaxed">
                                        {f.diff.map((line, k) => (
                                          <div key={k} className={
                                            line.type === "added" ? "bg-emerald-50 text-emerald-800" :
                                            line.type === "removed" ? "bg-red-50 text-red-800" :
                                            "bg-surface text-text-secondary"
                                          }>
                                            <span className="inline-block w-5 text-center text-text-tertiary select-none">
                                              {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                                            </span>
                                            {line.line || "\u00A0"}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    /* Inline view for short fields */
                                    <div className="text-xs font-mono">
                                      <span className="text-text-tertiary">{f.field}:</span>
                                      {f.old === null ? (
                                        <span className="ml-2 text-emerald-600 bg-emerald-50 px-1 rounded">{f.new}</span>
                                      ) : (
                                        <>
                                          <span className="ml-2 line-through text-red-400 bg-red-50 px-1 rounded">{f.field === "state" ? stateLabels[f.old] ?? f.old : f.old}</span>
                                          <span className="mx-1 text-text-tertiary">→</span>
                                          <span className="text-emerald-600 bg-emerald-50 px-1 rounded">{f.field === "state" ? stateLabels[f.new] ?? f.new : f.new}</span>
                                          {f.field === "state" && f.old === "done" && (
                                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-200">regression</span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                  Comments ({story.comments.length})
                </h3>
                <div className="space-y-3 mb-4">
                  {story.comments.map((c, i) => (
                    <div key={i} className="bg-surface border border-border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center">
                          {c.author.charAt(0)}
                        </span>
                        <span className="text-sm font-medium text-text-primary">{c.author}</span>
                        <span className="text-xs text-text-tertiary">{c.time}</span>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">{c.body}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input type="text" placeholder="Write a comment..." className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  <button className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors">Post</button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
                <div>
                  <span className="text-xs text-text-tertiary block mb-1">State</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${stateBadge[story.state]}`}>
                    {stateLabels[story.state]}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-text-tertiary block mb-1">Type</span>
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">Story</span>
                </div>
                <div>
                  <span className="text-xs text-text-tertiary block mb-1">Parent</span>
                  <span className="text-sm text-accent">#{story.parentId} {story.parentTitle}</span>
                </div>
                <div>
                  <span className="text-xs text-text-tertiary block mb-1">Sprint</span>
                  <span className="text-sm text-text-primary">{story.sprint}</span>
                </div>
                <div>
                  <span className="text-xs text-text-tertiary block mb-1">Assignee</span>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">C</span>
                    <span className="text-sm text-text-primary">{story.assignee}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-text-tertiary block mb-0.5">Created</span>
                  <span className="text-xs text-text-secondary">{story.createdAt}</span>
                </div>
              </div>

              {/* Attachments */}
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Attachments (1)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="aspect-square rounded-md border border-border overflow-hidden bg-content-bg flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-text-tertiary/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
