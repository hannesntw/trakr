"use client";

import { useState, useRef, useEffect } from "react";
import { useVariant } from "@/components/VariantContext";
import {
  Circle, CircleDot, CircleCheck, Play,
  ChevronDown, ChevronRight, RotateCcw, Globe, Terminal, Cpu,
  ArrowLeft, MessageSquare, ImagePlus, Search, X,
  Link2, ArrowRight, Ban, Plus, GripVertical,
} from "lucide-react";
import Link from "next/link";
import { PointsBadge, PointsPicker } from "@/components/PointsBadge";

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

// --- Combobox component ---
function Combobox({ value, options, onSelect, placeholder, renderOption }: {
  value: string | null;
  options: { id: string; label: string; secondary?: string }[];
  onSelect: (id: string | null) => void;
  placeholder?: string;
  renderOption?: (opt: { id: string; label: string; secondary?: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.secondary?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const selected = options.find(o => o.id === value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-content-bg transition-colors text-left"
      >
        {selected ? (
          renderOption ? renderOption(selected) : (
            <>
              <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center shrink-0">
                {selected.label.charAt(0)}
              </span>
              <span className="text-sm text-text-primary truncate">{selected.label}</span>
            </>
          )
        ) : (
          <span className="text-sm text-text-tertiary">{placeholder ?? "Select..."}</span>
        )}
        <ChevronDown className="w-3 h-3 text-text-tertiary ml-auto shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-xl z-30 min-w-[200px]">
          <div className="p-1.5 border-b border-border">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-6 pr-2 py-1 text-xs bg-content-bg border border-border rounded text-text-primary outline-none focus:border-accent placeholder:text-text-tertiary"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-auto py-1">
            {value && (
              <button
                onClick={() => { onSelect(null); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-tertiary hover:bg-content-bg"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-tertiary">No results</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { onSelect(opt.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-content-bg transition-colors ${opt.id === value ? "text-accent font-medium" : "text-text-primary"}`}
                >
                  {renderOption ? renderOption(opt) : (
                    <>
                      <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center shrink-0">
                        {opt.label.charAt(0)}
                      </span>
                      <span className="truncate">{opt.label}</span>
                      {opt.secondary && <span className="text-text-tertiary ml-auto">{opt.secondary}</span>}
                    </>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Mock data ---
const mockUsers = [
  { id: "hannes", label: "Hannes", secondary: "hannes@example.com" },
  { id: "claude", label: "Claude", secondary: "claude@anthropic.com" },
  { id: "peter", label: "Peter", secondary: "peter@example.com" },
  { id: "sarah", label: "Sarah", secondary: "sarah@example.com" },
];

const mockParentOptions = [
  { id: "69", label: "User Management", secondary: "Epic TRK-69" },
  { id: "38", label: "Trakr Core", secondary: "Epic TRK-38" },
  { id: "39", label: "Work Item Management", secondary: "Feature TRK-39" },
  { id: "44", label: "Sprint Planning", secondary: "Feature TRK-44" },
  { id: "50", label: "Timeline Planning", secondary: "Feature TRK-50" },
  { id: "63", label: "Sprint v2", secondary: "Feature TRK-63" },
  { id: "73", label: "Advanced Story Detail", secondary: "Feature TRK-73" },
  { id: "81", label: "General Improvements", secondary: "Feature TRK-81" },
  { id: "94", label: "Search and Queries", secondary: "Feature TRK-94" },
];

const linkTypes = [
  { id: "blocks", label: "Blocks", icon: Ban, color: "text-red-500" },
  { id: "blocked_by", label: "Blocked by", icon: Ban, color: "text-red-500" },
  { id: "relates_to", label: "Relates to", icon: Link2, color: "text-blue-500" },
  { id: "duplicates", label: "Duplicates", icon: Link2, color: "text-amber-500" },
];

const mockLinks = [
  { type: "blocks", targetId: 75, targetTitle: "Status Timeline on Detail Page", targetState: "done" },
  { type: "relates_to", targetId: 74, targetTitle: "Work Item Snapshots and Change Tracking", targetState: "done" },
];

const mockLinkTargets = [
  { id: "40", label: "Create Work Item", secondary: "Story TRK-40" },
  { id: "41", label: "View Sprint Board", secondary: "Story TRK-41" },
  { id: "42", label: "View Backlog Table", secondary: "Story TRK-42" },
  { id: "43", label: "View Work Item Detail", secondary: "Story TRK-43" },
  { id: "45", label: "Plan Sprint", secondary: "Story TRK-45" },
  { id: "74", label: "Work Item Snapshots", secondary: "Story TRK-74" },
  { id: "75", label: "Status Timeline on Detail Page", secondary: "Story TRK-75" },
];

const story = {
  id: 72,
  title: "Project Settings and Invites",
  type: "story" as const,
  state: "done",
  assignee: "claude",
  sprint: "Sprint 6 — User Management",
  parentId: "69",
  parentTitle: "User Management",
  createdAt: "Apr 10, 2026",
  description: `As a project owner, I want to manage my project's settings and invite others by email so colleagues can collaborate on my project.

### Context
The Settings page is accessible from the sidebar for projects the user owns. It has four sections: General, Members, Sprint Cadence, and Danger Zone.

### Acceptance Criteria
* GIVEN I own a project WHEN I navigate to Settings THEN I see General, Members, Sprint Cadence, and Danger Zone sections
* GIVEN I enter an email and click Invite WHEN the invite is saved THEN the email appears in the member list`,
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

interface ShortChange { field: string; old: string | null; new: string; diff?: never }
interface DiffChange { field: string; old?: never; new?: never; diff: Array<{ type: "context" | "added" | "removed"; line: string }> }
type FieldChange = ShortChange | DiffChange;
interface ChangeEntry { version: number; at: string; by: string; channel: "web" | "api" | "mcp"; fields: FieldChange[] }

const changeLog: ChangeEntry[] = [
  { version: 5, at: "Apr 10, 21:47", by: "Claude", channel: "mcp", fields: [{ field: "state", old: "in_progress", new: "done" }] },
  { version: 4, at: "Apr 10, 21:46", by: "Claude", channel: "mcp", fields: [{ field: "state", old: "new", new: "in_progress" }] },
  { version: 3, at: "Apr 10, 21:45", by: "Hannes", channel: "web", fields: [{ field: "state", old: "done", new: "new" }] },
  { version: 1, at: "Apr 10, 21:39", by: "Claude", channel: "mcp", fields: [{ field: "state", old: "new", new: "in_progress" }, { field: "assignee", old: null, new: "Claude" }] },
  { version: 0, at: "Apr 10, 21:32", by: "Claude", channel: "mcp", fields: [{ field: "title", old: null, new: "Project Settings and Invites" }, { field: "type", old: null, new: "story" }, { field: "state", old: null, new: "new" }] },
];

// --- Page ---
export default function StoryDetailPage() {
  const variant = useVariant();
  const hasCombobox = variant.features.assigneeCombobox;
  const hasLinks = variant.features.workItemLinks;
  const hasReparent = variant.features.reparent;
  const [historyOpen, setHistoryOpen] = useState(false);

  const hasPoints = variant.features.storyPoints;

  // Points state
  const [points, setPoints] = useState<number | null>(5);

  // Assignee combobox state
  const [assignee, setAssignee] = useState<string | null>(story.assignee);

  // Parent combobox state
  const [parentId, setParentId] = useState<string | null>(story.parentId);

  // Links state
  const [links, setLinks] = useState(mockLinks);
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkType, setNewLinkType] = useState("blocks");
  const [newLinkTarget, setNewLinkTarget] = useState<string | null>(null);

  function addLink() {
    if (!newLinkTarget) return;
    const target = mockLinkTargets.find(t => t.id === newLinkTarget);
    if (!target) return;
    setLinks(prev => [...prev, { type: newLinkType, targetId: parseInt(newLinkTarget), targetTitle: target.label, targetState: "done" }]);
    setAddingLink(false);
    setNewLinkTarget(null);
  }

  const parentOption = mockParentOptions.find(o => o.id === parentId);

  return (
    <>
      <header className="h-14 px-6 flex items-center gap-3 border-b border-border bg-surface shrink-0">
        <Link href={`/${variant.id}/board`} className="p-1 rounded hover:bg-content-bg transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-secondary" />
        </Link>
        <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">Story</span>
        <span className="text-xs text-text-tertiary font-mono">TRK-{story.id}</span>
        <span className="text-text-tertiary">/</span>
        <span className="text-sm text-text-secondary">{story.title}</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="grid grid-cols-[1fr_280px] gap-6">
            {/* Main content */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">Story</span>
                  <span className="text-xs text-text-tertiary font-mono">TRK-{story.id}</span>
                </div>
                <h2 className="text-xl font-semibold text-text-primary">{story.title}</h2>
              </div>

              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Description</h3>
                <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{story.description}</div>
              </div>

              {/* Status Timeline */}
              {variant.features.storyTimeline && (
                <div>
                  <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">Status Timeline</h3>
                  <div className="bg-surface border border-border rounded-lg p-5">
                    <div className="grid items-center" style={{ gridTemplateColumns: statusChanges.map((_, i) => i < statusChanges.length - 1 ? "auto 1fr" : "auto").join(" ") }}>
                      {statusChanges.map((change, i) => {
                        const isLast = i === statusChanges.length - 1;
                        return (
                          <div key={`icon-${i}`} className="contents">
                            <div className="flex justify-center">
                              <div className={`w-9 h-9 rounded-full border-2 ${stateColors[change.to]} flex items-center justify-center`}>
                                <StateIcon state={change.to} size={18} />
                              </div>
                            </div>
                            {!isLast && (<div className="flex items-center px-1"><div className={`h-0.5 flex-1 ${change.to === "done" && statusChanges[i + 1]?.from === "done" ? "bg-red-300" : "bg-border"}`} /></div>)}
                          </div>
                        );
                      })}
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
                            {!isLast && (<div className="text-center pt-2">{change.duration && <p className="text-[9px] text-text-tertiary">{change.duration}</p>}</div>)}
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

              {/* Change History */}
              {variant.features.changeHistory && (
                <div>
                  <button onClick={() => setHistoryOpen(!historyOpen)} className="flex items-center gap-2 text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3 hover:text-text-secondary transition-colors">
                    {historyOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Change History <span className="font-normal normal-case">{changeLog.length} versions</span>
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
                                <div key={j} className="text-xs font-mono">
                                  <span className="text-text-tertiary">{f.field}:</span>
                                  {f.old === null ? (
                                    <span className="ml-2 text-emerald-600 bg-emerald-50 px-1 rounded">{f.new}</span>
                                  ) : (
                                    <>
                                      <span className="ml-2 line-through text-red-400 bg-red-50 px-1 rounded">{f.field === "state" && f.old ? stateLabels[f.old] ?? f.old : f.old}</span>
                                      <span className="mx-1 text-text-tertiary">→</span>
                                      <span className="text-emerald-600 bg-emerald-50 px-1 rounded">{f.field === "state" && f.new ? stateLabels[f.new] ?? f.new : f.new}</span>
                                    </>
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
                        <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center">{c.author.charAt(0)}</span>
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

                {/* Parent — combobox or static */}
                <div>
                  <span className="text-xs text-text-tertiary block mb-1">Parent</span>
                  {hasReparent ? (
                    <Combobox
                      value={parentId}
                      options={mockParentOptions}
                      onSelect={setParentId}
                      placeholder="No parent"
                      renderOption={(opt) => (
                        <>
                          <span className="text-sm text-text-primary truncate">{opt.label}</span>
                          {opt.secondary && <span className="text-[10px] text-text-tertiary ml-auto shrink-0">{opt.secondary}</span>}
                        </>
                      )}
                    />
                  ) : (
                    <span className="text-sm text-accent">TRK-{story.parentId} {story.parentTitle}</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-text-tertiary block mb-1">Sprint</span>
                  <span className="text-sm text-text-primary">{story.sprint}</span>
                </div>

                {/* Assignee — combobox or static */}
                <div>
                  <span className="text-xs text-text-tertiary block mb-1">Assignee</span>
                  {hasCombobox ? (
                    <Combobox
                      value={assignee}
                      options={mockUsers}
                      onSelect={setAssignee}
                      placeholder="Unassigned"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">C</span>
                      <span className="text-sm text-text-primary">Claude</span>
                    </div>
                  )}
                </div>

                {/* Points — stories and bugs only */}
                {hasPoints && (story.type === "story" || story.type === "bug") && (
                  <div>
                    <span className="text-xs text-text-tertiary block mb-1.5">Points</span>
                    <PointsPicker value={points} onChange={setPoints} />
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-text-tertiary block mb-0.5">Created</span>
                  <span className="text-xs text-text-secondary">{story.createdAt}</span>
                </div>
              </div>

              {/* Links section */}
              {hasLinks && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      <Link2 className="w-3 h-3 inline mr-1" />
                      Links ({links.length})
                    </span>
                    <button onClick={() => setAddingLink(!addingLink)} className="text-text-tertiary hover:text-accent transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Add link form */}
                  {addingLink && (
                    <div className="mb-3 p-2.5 bg-content-bg rounded-md border border-border space-y-2">
                      <select
                        value={newLinkType}
                        onChange={e => setNewLinkType(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-surface border border-border rounded text-text-primary outline-none focus:border-accent"
                      >
                        {linkTypes.map(lt => (
                          <option key={lt.id} value={lt.id}>{lt.label}</option>
                        ))}
                      </select>
                      <Combobox
                        value={newLinkTarget}
                        options={mockLinkTargets}
                        onSelect={setNewLinkTarget}
                        placeholder="Search work items..."
                        renderOption={(opt) => (
                          <>
                            <span className="text-xs text-text-primary truncate">{opt.label}</span>
                            <span className="text-[10px] text-text-tertiary ml-auto shrink-0">{opt.secondary}</span>
                          </>
                        )}
                      />
                      <div className="flex gap-2">
                        <button onClick={addLink} disabled={!newLinkTarget} className="px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded">
                          Add
                        </button>
                        <button onClick={() => { setAddingLink(false); setNewLinkTarget(null); }} className="px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Existing links */}
                  {links.length === 0 ? (
                    <p className="text-xs text-text-tertiary">No links yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {links.map((link, i) => {
                        const lt = linkTypes.find(t => t.id === link.type);
                        return (
                          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-content-bg transition-colors group">
                            {lt && <lt.icon className={`w-3 h-3 shrink-0 ${lt.color}`} />}
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-text-tertiary block">{lt?.label}</span>
                              <span className="text-xs text-text-primary truncate block">TRK-{link.targetId} {link.targetTitle}</span>
                            </div>
                            <StateIcon state={link.targetState} size={12} />
                            <button
                              onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))}
                              className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-500 transition-all shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

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
