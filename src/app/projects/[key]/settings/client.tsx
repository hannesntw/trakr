"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Trash2, Mail, GripVertical, Plus } from "lucide-react";
import type { WorkflowState } from "@/lib/constants";

interface Project {
  id: number;
  name: string;
  key: string;
  description: string | null;
  visibility: string;
  ownerId: string | null;
}

interface Invite {
  id: number;
  email: string;
}

export function SettingsClient({ project }: { project: Project }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [description, setDescription] = useState(project.description ?? "");
  const [visibility, setVisibility] = useState(project.visibility);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [addingState, setAddingState] = useState(false);
  const [newStateName, setNewStateName] = useState("");
  const [newStateCategory, setNewStateCategory] = useState<"todo" | "in_progress" | "done">("todo");
  const [newStateColor, setNewStateColor] = useState("#9CA3AF");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const colorOptions = ["#9CA3AF", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#6366F1", "#8B5CF6", "#EC4899", "#14B8A6"];
  const categoryLabels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };
  const categoryColors: Record<string, string> = { todo: "bg-gray-100 text-gray-600 border-gray-300", in_progress: "bg-blue-50 text-blue-600 border-blue-300", done: "bg-emerald-50 text-emerald-600 border-emerald-300" };

  const fetchWorkflow = useCallback(async () => {
    const res = await fetch(`/api/projects/${project.id}/workflow`);
    if (res.ok) setWorkflowStates(await res.json());
  }, [project.id]);

  useEffect(() => {
    fetch(`/api/projects/${project.id}/invites`).then(r => r.json()).then(setInvites);
    fetchWorkflow();
  }, [project.id, fetchWorkflow]);

  async function saveGeneral() {
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, key, description, visibility }),
    });
    setSaving(false);
    router.refresh();
  }

  async function addInvite() {
    if (!inviteEmail.trim()) return;
    const res = await fetch(`/api/projects/${project.id}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    if (res.ok) {
      const inv = await res.json();
      setInvites([...invites, inv]);
      setInviteEmail("");
    }
  }

  async function removeInvite(inviteId: number) {
    await fetch(`/api/projects/${project.id}/invites`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inviteId }),
    });
    setInvites(invites.filter(i => i.id !== inviteId));
  }

  async function deleteProject() {
    if (!confirm("Permanently delete this project and all its data?")) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Header title="Project Settings" />
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          {/* General */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">General</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-text-tertiary block mb-1">Project Name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Key</label>
                  <input value={key} onChange={e => setKey(e.target.value.toUpperCase().slice(0, 5))}
                    className="w-24 px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Visibility</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="vis" checked={visibility === "private"} onChange={() => setVisibility("private")} className="accent-accent" /> Private
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="vis" checked={visibility === "public"} onChange={() => setVisibility("public")} className="accent-accent" /> Public
                  </label>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">Public projects are visible to all signed-in users. Private projects are only visible to you and invited members.</p>
              </div>
              <div className="flex justify-end">
                <button onClick={saveGeneral} disabled={saving}
                  className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </section>

          {/* Members */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Members</h2>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              {/* Owner */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50">
                <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">O</span>
                <span className="text-sm text-text-primary flex-1">You (owner)</span>
                <span className="text-xs text-text-tertiary">Owner</span>
              </div>

              {/* Invites */}
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50">
                  <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                    {inv.email.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm text-text-primary flex-1">{inv.email}</span>
                  <span className="text-xs text-text-tertiary">Invited</span>
                  <button onClick={() => removeInvite(inv.id)} className="p-1 text-text-tertiary hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Invite input */}
              <div className="px-4 py-3 bg-content-bg/50 flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-md px-3 py-1.5">
                  <Mail className="w-3.5 h-3.5 text-text-tertiary" />
                  <input
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addInvite()}
                    placeholder="Invite by email..."
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <button onClick={addInvite} disabled={!inviteEmail.trim()}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors">
                  Invite
                </button>
              </div>
            </div>
          </section>

          {/* Workflow */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Workflow</h2>

            {/* Preset buttons */}
            <div className="flex gap-2 mb-4">
              <span className="text-xs text-text-tertiary self-center mr-1">Presets:</span>
              {(["simple", "standard", "delivery_pipeline"] as const).map(preset => (
                <button
                  key={preset}
                  onClick={async () => {
                    const res = await fetch(`/api/projects/${project.id}/workflow`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ preset }),
                    });
                    if (res.ok) fetchWorkflow();
                  }}
                  className="px-2.5 py-1 text-xs border border-border rounded-md text-text-secondary hover:border-accent hover:text-accent transition-colors"
                >
                  {preset === "simple" ? "Simple (3)" : preset === "standard" ? "Standard (4)" : "Delivery Pipeline (6)"}
                </button>
              ))}
            </div>

            {/* State list */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden mb-4">
              {workflowStates.map((ws, idx) => {
                const categoryCount = workflowStates.filter(s => s.category === ws.category).length;
                const canDelete = workflowStates.length > 2 && categoryCount > 1;

                return (
                  <div
                    key={ws.id}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragIdx === null || dragIdx === idx) return;
                      const reordered = [...workflowStates];
                      const [moved] = reordered.splice(dragIdx, 1);
                      reordered.splice(idx, 0, moved);
                      setWorkflowStates(reordered);
                      setDragIdx(idx);
                    }}
                    onDragEnd={async () => {
                      setDragIdx(null);
                      await fetch(`/api/projects/${project.id}/workflow/reorder`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ids: workflowStates.map(s => s.id) }),
                      });
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0 group transition-colors ${dragIdx === idx ? "bg-accent/5" : "hover:bg-content-bg/50"}`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />

                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ws.color }} />

                    {editingSlug === ws.slug ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === "Enter" && editName.trim()) {
                            await fetch(`/api/projects/${project.id}/workflow/${ws.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ displayName: editName.trim() }),
                            });
                            setEditingSlug(null);
                            fetchWorkflow();
                          }
                          if (e.key === "Escape") setEditingSlug(null);
                        }}
                        onBlur={async () => {
                          if (editName.trim() && editName !== ws.displayName) {
                            await fetch(`/api/projects/${project.id}/workflow/${ws.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ displayName: editName.trim() }),
                            });
                            fetchWorkflow();
                          }
                          setEditingSlug(null);
                        }}
                        className="flex-1 px-1.5 py-0.5 text-sm border border-accent rounded bg-content-bg text-text-primary outline-none"
                      />
                    ) : (
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setEditingSlug(ws.slug); setEditName(ws.displayName); }}>
                        <span className="text-sm text-text-primary">{ws.displayName}</span>
                        <span className="text-[10px] text-text-tertiary ml-2 font-mono">{ws.slug}</span>
                      </div>
                    )}

                    <select
                      value={ws.category}
                      onChange={async e => {
                        await fetch(`/api/projects/${project.id}/workflow/${ws.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ category: e.target.value }),
                        });
                        fetchWorkflow();
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${categoryColors[ws.category] ?? ""}`}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>

                    {canDelete ? (
                      <button
                        onClick={async () => {
                          await fetch(`/api/projects/${project.id}/workflow/${ws.id}`, { method: "DELETE" });
                          fetchWorkflow();
                        }}
                        className="p-1 text-text-tertiary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="w-[26px]" />
                    )}
                  </div>
                );
              })}

              {/* Add state */}
              {addingState ? (
                <div className="px-4 py-3 bg-content-bg/50 space-y-2">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newStateName}
                      onChange={e => setNewStateName(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === "Enter" && newStateName.trim()) {
                          await fetch(`/api/projects/${project.id}/workflow`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ displayName: newStateName.trim(), category: newStateCategory, color: newStateColor }),
                          });
                          setNewStateName("");
                          setAddingState(false);
                          fetchWorkflow();
                        }
                        if (e.key === "Escape") setAddingState(false);
                      }}
                      placeholder="State name..."
                      className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-surface outline-none focus:border-accent"
                    />
                    <select value={newStateCategory} onChange={e => setNewStateCategory(e.target.value as any)} className="px-2 py-1.5 text-xs border border-border rounded-md bg-surface">
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex gap-1">
                      {colorOptions.map(c => (
                        <button key={c} onClick={() => setNewStateColor(c)} className={`w-5 h-5 rounded-full border-2 ${newStateColor === c ? "border-accent" : "border-transparent"}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={async () => {
                          if (!newStateName.trim()) return;
                          await fetch(`/api/projects/${project.id}/workflow`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ displayName: newStateName.trim(), category: newStateCategory, color: newStateColor }),
                          });
                          setNewStateName("");
                          setAddingState(false);
                          fetchWorkflow();
                        }}
                        disabled={!newStateName.trim()}
                        className="px-3 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded-md"
                      >
                        Add
                      </button>
                      <button onClick={() => setAddingState(false)} className="px-3 py-1 text-xs text-text-tertiary hover:text-text-secondary">Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingState(true)} className="w-full px-4 py-2.5 text-xs text-text-tertiary hover:text-accent hover:bg-content-bg/50 transition-colors flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Add state
                </button>
              )}
            </div>

            {/* Board preview */}
            <div>
              <h3 className="text-xs text-text-tertiary mb-2">Board Preview</h3>
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex gap-2 overflow-x-auto">
                  {workflowStates.map((ws, idx) => {
                    const isFirstOfCategory = idx === 0 || workflowStates[idx - 1].category !== ws.category;
                    return (
                      <div key={ws.id} className="flex-1 min-w-[80px]">
                        {isFirstOfCategory && (
                          <div className={`text-[9px] uppercase tracking-wider font-medium mb-1 ${ws.category === "todo" ? "text-gray-400" : ws.category === "in_progress" ? "text-blue-400" : "text-emerald-400"}`}>
                            {categoryLabels[ws.category]}
                          </div>
                        )}
                        {!isFirstOfCategory && <div className="h-[13px]" />}
                        <div className="rounded-md border border-border/50 bg-content-bg p-2">
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ws.color }} />
                            <span className="text-[10px] font-medium text-text-secondary truncate">{ws.displayName}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="h-4 bg-surface rounded border border-border/30" />
                            <div className="h-4 bg-surface rounded border border-border/30 opacity-50" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[10px] text-text-tertiary mt-2">Each state becomes a board column, grouped by category. Items in "Done" states are excluded from <code className="font-mono">is:open</code> queries.</p>
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h2 className="text-sm font-semibold text-red-500 mb-4">Danger Zone</h2>
            <div className="bg-surface border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Delete project</p>
                  <p className="text-xs text-text-tertiary">Permanently delete this project and all its data.</p>
                </div>
                <button onClick={deleteProject} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors">
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
