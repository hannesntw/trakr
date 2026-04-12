"use client";

import { useState } from "react";
import { Pencil, Check, X, Plus, Trash2, Mail, GripVertical, ChevronRight } from "lucide-react";
import { useVariant } from "@/components/VariantContext";

type StateCategory = "todo" | "in_progress" | "done";

interface WorkflowState {
  id: string;
  name: string;
  category: StateCategory;
  color: string;
}

const categoryLabels: Record<StateCategory, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const categoryColors: Record<StateCategory, string> = {
  todo: "bg-gray-100 text-gray-600 border-gray-300",
  in_progress: "bg-blue-50 text-blue-600 border-blue-300",
  done: "bg-emerald-50 text-emerald-600 border-emerald-300",
};

const categoryDescriptions: Record<StateCategory, string> = {
  todo: "Work not yet started. Items in these states appear in the leftmost board columns.",
  in_progress: "Work actively being done. These states form the middle board columns.",
  done: "Completed work. Items in these states appear in the rightmost board columns and are excluded by is:open queries.",
};

const presetWorkflows: Record<string, WorkflowState[]> = {
  simple: [
    { id: "new", name: "New", category: "todo", color: "#9CA3AF" },
    { id: "in_progress", name: "In Progress", category: "in_progress", color: "#6366F1" },
    { id: "done", name: "Done", category: "done", color: "#10B981" },
  ],
  standard: [
    { id: "new", name: "New", category: "todo", color: "#9CA3AF" },
    { id: "ready", name: "Ready", category: "todo", color: "#F59E0B" },
    { id: "in_progress", name: "In Progress", category: "in_progress", color: "#6366F1" },
    { id: "done", name: "Done", category: "done", color: "#10B981" },
  ],
  delivery: [
    { id: "prep", name: "In Preparation", category: "todo", color: "#9CA3AF" },
    { id: "ready", name: "Ready", category: "todo", color: "#F59E0B" },
    { id: "in_progress", name: "In Progress", category: "in_progress", color: "#6366F1" },
    { id: "dev_done", name: "Dev Done", category: "in_progress", color: "#8B5CF6" },
    { id: "deployed", name: "Deployed", category: "done", color: "#14B8A6" },
    { id: "done", name: "Done", category: "done", color: "#10B981" },
  ],
};

const colorOptions = [
  "#9CA3AF", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#6366F1", "#8B5CF6", "#EC4899", "#14B8A6",
];

export default function SettingsPage() {
  const config = useVariant();
  const hasWorkflow = config.features.configurableWorkflow;

  const [inviteEmail, setInviteEmail] = useState("");
  const [members, setMembers] = useState([
    { email: "hannes@example.com", role: "Owner" },
    { email: "alex@example.com", role: "Contributor" },
  ]);

  // Workflow state
  const [states, setStates] = useState<WorkflowState[]>(presetWorkflows.delivery);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addingState, setAddingState] = useState(false);
  const [newStateName, setNewStateName] = useState("");
  const [newStateCategory, setNewStateCategory] = useState<StateCategory>("todo");
  const [newStateColor, setNewStateColor] = useState("#9CA3AF");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function addMember() {
    if (!inviteEmail.trim()) return;
    setMembers([...members, { email: inviteEmail.trim(), role: "Contributor" }]);
    setInviteEmail("");
  }

  function addState() {
    if (!newStateName.trim()) return;
    const id = newStateName.toLowerCase().replace(/\s+/g, "_");
    setStates([...states, { id, name: newStateName.trim(), category: newStateCategory, color: newStateColor }]);
    setNewStateName("");
    setAddingState(false);
  }

  function removeState(id: string) {
    setStates(states.filter(s => s.id !== id));
  }

  function updateStateName(id: string) {
    if (!editName.trim()) { setEditingId(null); return; }
    setStates(states.map(s => s.id === id ? { ...s, name: editName.trim() } : s));
    setEditingId(null);
  }

  function updateCategory(id: string, category: StateCategory) {
    setStates(states.map(s => s.id === id ? { ...s, category } : s));
  }

  function updateColor(id: string, color: string) {
    setStates(states.map(s => s.id === id ? { ...s, color } : s));
  }

  function applyPreset(key: string) {
    setStates(presetWorkflows[key]);
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...states];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setStates(reordered);
    setDragIdx(idx);
  }

  // Group states by category for board preview
  const todoStates = states.filter(s => s.category === "todo");
  const inProgressStates = states.filter(s => s.category === "in_progress");
  const doneStates = states.filter(s => s.category === "done");

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Project Settings</h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          {/* General */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">General</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-text-tertiary block mb-1">Project Name</label>
                  <input defaultValue="Trakr" className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Key</label>
                  <input defaultValue="TRK" className="w-24 px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Description</label>
                <textarea defaultValue="Project management tool — agile work item tracking." rows={2} className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Visibility</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="vis" className="accent-accent" /> Private
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="vis" defaultChecked className="accent-accent" /> Public
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Members */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Members</h2>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              {members.map((m, i) => (
                <div key={m.email} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0">
                  <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                    {m.email.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm text-text-primary flex-1">{m.email}</span>
                  <span className="text-xs text-text-tertiary">{m.role}</span>
                  {m.role !== "Owner" && (
                    <button onClick={() => setMembers(members.filter((_, j) => j !== i))} className="p-1 text-text-tertiary hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <div className="px-4 py-3 bg-content-bg/50 flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-md px-3 py-1.5">
                  <Mail className="w-3.5 h-3.5 text-text-tertiary" />
                  <input
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addMember()}
                    placeholder="Invite by email..."
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <button onClick={addMember} disabled={!inviteEmail.trim()} className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors">
                  Invite
                </button>
              </div>
            </div>
          </section>

          {/* Workflow — feature-gated */}
          {hasWorkflow && (
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-4">Workflow</h2>

              {/* Preset selector */}
              <div className="flex gap-2 mb-4">
                <span className="text-xs text-text-tertiary self-center mr-1">Presets:</span>
                {Object.entries(presetWorkflows).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className="px-2.5 py-1 text-xs border border-border rounded-md text-text-secondary hover:border-accent hover:text-accent transition-colors"
                  >
                    {key === "simple" ? "Simple (3)" : key === "standard" ? "Standard (4)" : "Delivery Pipeline (6)"}
                  </button>
                ))}
              </div>

              {/* State list */}
              <div className="bg-surface border border-border rounded-lg overflow-hidden mb-4">
                {states.map((state, idx) => (
                  <div
                    key={state.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={() => setDragIdx(null)}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0 group transition-colors ${dragIdx === idx ? "bg-accent/5" : "hover:bg-content-bg/50"}`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />

                    {/* Color dot */}
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: state.color }} />
                      {/* Color picker on click */}
                      <select
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        value={state.color}
                        onChange={e => updateColor(state.id, e.target.value)}
                      >
                        {colorOptions.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Name */}
                    {editingId === state.id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") updateStateName(state.id); if (e.key === "Escape") setEditingId(null); }}
                        onBlur={() => updateStateName(state.id)}
                        className="flex-1 px-1.5 py-0.5 text-sm border border-accent rounded bg-content-bg text-text-primary outline-none"
                      />
                    ) : (
                      <span
                        className="flex-1 text-sm text-text-primary cursor-pointer"
                        onClick={() => { setEditingId(state.id); setEditName(state.name); }}
                      >
                        {state.name}
                      </span>
                    )}

                    {/* Category */}
                    <select
                      value={state.category}
                      onChange={e => updateCategory(state.id, e.target.value as StateCategory)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${categoryColors[state.category]}`}
                    >
                      {(Object.keys(categoryLabels) as StateCategory[]).map(cat => (
                        <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                      ))}
                    </select>

                    {/* Delete */}
                    {states.length > 2 && (
                      <button
                        onClick={() => removeState(state.id)}
                        className="p-1 text-text-tertiary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add state */}
                {addingState ? (
                  <div className="px-4 py-3 bg-content-bg/50 space-y-2">
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newStateName}
                        onChange={e => setNewStateName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addState(); if (e.key === "Escape") setAddingState(false); }}
                        placeholder="State name..."
                        className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-surface outline-none focus:border-accent"
                      />
                      <select
                        value={newStateCategory}
                        onChange={e => setNewStateCategory(e.target.value as StateCategory)}
                        className="px-2 py-1.5 text-xs border border-border rounded-md bg-surface"
                      >
                        {(Object.keys(categoryLabels) as StateCategory[]).map(cat => (
                          <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex gap-1">
                        {colorOptions.map(c => (
                          <button
                            key={c}
                            onClick={() => setNewStateColor(c)}
                            className={`w-5 h-5 rounded-full border-2 ${newStateColor === c ? "border-accent" : "border-transparent"}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="ml-auto flex gap-2">
                        <button onClick={addState} disabled={!newStateName.trim()} className="px-3 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded-md">
                          Add
                        </button>
                        <button onClick={() => setAddingState(false)} className="px-3 py-1 text-xs text-text-tertiary hover:text-text-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingState(true)}
                    className="w-full px-4 py-2.5 text-xs text-text-tertiary hover:text-accent hover:bg-content-bg/50 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add state
                  </button>
                )}
              </div>

              {/* Board preview */}
              <div>
                <h3 className="text-xs text-text-tertiary mb-2">Board Preview</h3>
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex gap-2 overflow-x-auto">
                    {states.map((state, idx) => {
                      const isFirstOfCategory = idx === 0 || states[idx - 1].category !== state.category;
                      return (
                        <div key={state.id} className="flex-1 min-w-[100px]">
                          {isFirstOfCategory && (
                            <div className={`text-[9px] uppercase tracking-wider font-medium mb-1 ${state.category === "todo" ? "text-gray-400" : state.category === "in_progress" ? "text-blue-400" : "text-emerald-400"}`}>
                              {categoryLabels[state.category]}
                            </div>
                          )}
                          {!isFirstOfCategory && <div className="h-[13px]" />}
                          <div className="rounded-md border border-border/50 bg-content-bg p-2">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: state.color }} />
                              <span className="text-[10px] font-medium text-text-secondary truncate">{state.name}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="h-5 bg-surface rounded border border-border/30" />
                              <div className="h-5 bg-surface rounded border border-border/30 opacity-50" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-[10px] text-text-tertiary mt-2">
                  Each state becomes a column on the board, grouped by category. Items in "Done" states are excluded from <code className="font-mono">is:open</code> TraQL queries.
                </p>
              </div>
            </section>
          )}

          {/* Sprint Cadence */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Sprint Cadence</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs text-text-tertiary">Duration</label>
                <select className="px-2 py-1 text-sm border border-border rounded-md bg-content-bg">
                  <option>1 week</option>
                  <option>2 weeks</option>
                  <option>3 weeks</option>
                  <option>4 weeks</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-text-tertiary">Start date</label>
                <input type="date" defaultValue="2026-03-30" className="px-2 py-1 text-sm border border-border rounded-md bg-content-bg" />
              </div>
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <h2 className="text-sm font-semibold text-red-500 mb-4">Danger Zone</h2>
            <div className="bg-surface border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Delete project</p>
                  <p className="text-xs text-text-tertiary">Permanently delete this project and all its data.</p>
                </div>
                <button className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
