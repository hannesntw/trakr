"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Trash2, Mail, GripVertical, Plus, ExternalLink, Unlink, GitPullRequest, Rocket } from "lucide-react";
import type { WorkflowState } from "@/lib/constants";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016.02 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

function ToggleButton({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? "bg-accent" : "bg-gray-300"}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
    </button>
  );
}

interface Project {
  id: number;
  name: string;
  key: string;
  description: string | null;
  visibility: string;
  ownerId: string | null;
  githubOwner: string | null;
  githubRepo: string | null;
  githubStatusChecks: boolean;
  githubPrComments: boolean;
  makerMode: boolean;
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

  // Maker mode state
  const [makerMode, setMakerMode] = useState(project.makerMode);

  // GitHub integration state
  const [githubLinked, setGithubLinked] = useState(!!(project.githubOwner && project.githubRepo));
  const [githubRepo, setGithubRepo] = useState(project.githubOwner && project.githubRepo ? `${project.githubOwner}/${project.githubRepo}` : "");
  const [repoInput, setRepoInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null); // shown once after connecting
  const [secretCopied, setSecretCopied] = useState(false);
  const [automations, setAutomations] = useState<Array<{ id: number; event: string; targetStateId: number; enabled: boolean; stateName: string }>>([]);
  const [statusChecks, setStatusChecks] = useState(project.githubStatusChecks);
  const [prComments, setPrComments] = useState(project.githubPrComments);
  const [addingAutomation, setAddingAutomation] = useState(false);
  const [newAutomationEvent, setNewAutomationEvent] = useState("pr_opened");
  const [newAutomationStateId, setNewAutomationStateId] = useState<number | null>(null);

  const eventLabels: Record<string, string> = {
    pr_opened: "PR opened",
    pr_merged: "PR merged",
    pr_closed: "PR closed",
    deploy_succeeded: "Deploy succeeded",
    deploy_failed: "Deploy failed",
  };

  const colorOptions = ["#9CA3AF", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#6366F1", "#8B5CF6", "#EC4899", "#14B8A6"];
  const categoryLabels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };
  const categoryColors: Record<string, string> = { todo: "bg-gray-100 text-gray-600 border-gray-300", in_progress: "bg-blue-50 text-blue-600 border-blue-300", done: "bg-emerald-50 text-emerald-600 border-emerald-300" };

  const fetchWorkflow = useCallback(async () => {
    const res = await fetch(`/api/projects/${project.id}/workflow`);
    if (res.ok) setWorkflowStates(await res.json());
  }, [project.id]);

  const fetchAutomations = useCallback(async () => {
    const res = await fetch(`/api/projects/${project.id}/github/automations`);
    if (res.ok) setAutomations(await res.json());
  }, [project.id]);

  useEffect(() => {
    fetch(`/api/projects/${project.id}/invites`).then(r => r.json()).then(setInvites);
    fetchWorkflow();
    if (githubLinked) fetchAutomations();
  }, [project.id, fetchWorkflow, fetchAutomations, githubLinked]);

  async function connectRepo() {
    if (!repoInput.includes("/")) return;
    setConnecting(true);
    const [owner, repo] = repoInput.split("/", 2);
    const res = await fetch(`/api/projects/${project.id}/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo }),
    });
    if (res.ok) {
      const data = await res.json();
      setGithubLinked(true);
      setGithubRepo(repoInput.trim());
      setRepoInput("");
      setWebhookSecret(data.webhookSecret ?? null);
      fetchAutomations();
    }
    setConnecting(false);
  }

  async function disconnectRepo() {
    if (!confirm("Disconnect GitHub repository? All automation rules and event history will be deleted.")) return;
    const res = await fetch(`/api/projects/${project.id}/github`, { method: "DELETE" });
    if (res.ok) {
      setGithubLinked(false);
      setGithubRepo("");
      setAutomations([]);
    }
  }

  async function toggleAutomation(ruleId: number, enabled: boolean) {
    await fetch(`/api/projects/${project.id}/github/automations/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setAutomations(prev => prev.map(a => a.id === ruleId ? { ...a, enabled } : a));
  }

  async function updateAutomationState(ruleId: number, targetStateId: number) {
    const res = await fetch(`/api/projects/${project.id}/github/automations/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStateId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAutomations(prev => prev.map(a => a.id === ruleId ? { ...a, targetStateId, stateName: updated.stateName } : a));
    }
  }

  async function deleteAutomation(ruleId: number) {
    await fetch(`/api/projects/${project.id}/github/automations/${ruleId}`, { method: "DELETE" });
    setAutomations(prev => prev.filter(a => a.id !== ruleId));
  }

  async function addAutomation() {
    if (!newAutomationStateId) return;
    const res = await fetch(`/api/projects/${project.id}/github/automations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: newAutomationEvent, targetStateId: newAutomationStateId }),
    });
    if (res.ok) {
      const rule = await res.json();
      setAutomations(prev => [...prev, rule]);
      setAddingAutomation(false);
      setNewAutomationEvent("pr_opened");
      setNewAutomationStateId(null);
    }
  }

  async function toggleStatusChecks() {
    const newVal = !statusChecks;
    setStatusChecks(newVal);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubStatusChecks: newVal }),
    });
  }

  async function togglePrComments() {
    const newVal = !prComments;
    setPrComments(newVal);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubPrComments: newVal }),
    });
  }

  async function toggleMakerMode() {
    const newVal = !makerMode;
    setMakerMode(newVal);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ makerMode: newVal }),
    });
    router.refresh();
  }

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

          {/* Project Mode */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Project Mode</h2>
            <div className="bg-surface border border-border rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <ToggleButton enabled={makerMode} onClick={toggleMakerMode} />
                <div>
                  <p className="text-sm text-text-primary">Maker Mode</p>
                  <p className="text-xs text-text-tertiary">Simplified project without sprints — designed for solo development with AI tools</p>
                </div>
              </label>
              {makerMode && (
                <div className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-md">
                  <p className="text-xs text-text-secondary">
                    Sprints and timeline are hidden. The board shows all items without sprint filtering.
                    An <strong>Ideas</strong> tab is available for capturing ideas before promoting them to the backlog.
                  </p>
                </div>
              )}
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

          {/* GitHub Integration */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <GitHubIcon className="w-4 h-4" />
              GitHub
            </h2>

            {/* Linked repo */}
            <div className="bg-surface border border-border rounded-lg p-4 mb-4">
              <span className="text-xs text-text-tertiary block mb-2">Repository</span>
              {githubLinked ? (
                <div className="flex items-center gap-3">
                  <GitHubIcon className="w-5 h-5 text-text-secondary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{githubRepo}</p>
                    <p className="text-xs text-text-tertiary">Connected — receiving webhook events</p>
                  </div>
                  <a href={`https://github.com/${githubRepo}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-text-tertiary hover:text-text-secondary transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={disconnectRepo}
                    className="px-2.5 py-1 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <Unlink className="w-3 h-3 inline mr-1" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={repoInput}
                    onChange={e => setRepoInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && connectRepo()}
                    placeholder="owner/repository"
                    className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                  <button
                    onClick={connectRepo}
                    disabled={!repoInput.includes("/") || connecting}
                    className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors"
                  >
                    {connecting ? "Connecting..." : "Connect"}
                  </button>
                </div>
              )}
            </div>

            {/* Webhook setup — shown after connecting or when secret is available */}
            {githubLinked && (
              <div className="bg-surface border border-border rounded-lg p-4 mb-4">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-2">Webhook</span>
                {webhookSecret ? (
                  <>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                      <p className="text-xs text-amber-800 font-medium mb-1">Set up the GitHub webhook to receive events</p>
                      <p className="text-xs text-amber-700">The webhook secret is shown only once. Copy it now.</p>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div>
                        <span className="text-xs text-text-tertiary block mb-1">Payload URL</span>
                        <div className="flex gap-1.5">
                          <code className="flex-1 text-xs bg-content-bg border border-border rounded px-2.5 py-1.5 font-mono text-text-secondary select-all">
                            {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/github` : "/api/webhooks/github"}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/github`)}
                            className="px-2 py-1.5 text-xs text-text-tertiary hover:text-accent border border-border rounded transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-text-tertiary block mb-1">Secret</span>
                        <div className="flex gap-1.5">
                          <code className="flex-1 text-xs bg-content-bg border border-border rounded px-2.5 py-1.5 font-mono text-text-secondary select-all">
                            {webhookSecret}
                          </code>
                          <button
                            onClick={() => { navigator.clipboard.writeText(webhookSecret); setSecretCopied(true); setTimeout(() => setSecretCopied(false), 2000); }}
                            className="px-2 py-1.5 text-xs text-text-tertiary hover:text-accent border border-border rounded transition-colors"
                          >
                            {secretCopied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`https://github.com/${githubRepo}/settings/hooks/new`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-accent border border-border rounded-md hover:bg-content-bg transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open GitHub webhook settings
                    </a>

                    <p className="text-[10px] text-text-tertiary mt-2">
                      Content type: <code className="font-mono">application/json</code> · SSL: enabled · Events: Pull requests, Pushes, Check suites, Deployments
                    </p>

                    <button
                      onClick={() => setWebhookSecret(null)}
                      className="text-[10px] text-text-tertiary hover:text-text-secondary mt-2 block"
                    >
                      I&apos;ve saved the secret — dismiss
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Webhook configured
                  </div>
                )}
              </div>
            )}

            {/* Automations and feedback — only when linked */}
            {githubLinked && (
              <>
                {/* Automation rules */}
                <div className="bg-surface border border-border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Automations</span>
                  </div>
                  <p className="text-xs text-text-secondary mb-3">
                    Automatically move work items through workflow states based on GitHub events.
                    Work items are matched by <code className="font-mono text-accent">{project.key}-123</code> mentions in PR titles, branch names, or commit messages.
                  </p>

                  <div className="space-y-2 mb-3">
                    {automations.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-3 p-2.5 bg-content-bg rounded-md group">
                        <ToggleButton
                          enabled={rule.enabled}
                          onClick={() => toggleAutomation(rule.id, !rule.enabled)}
                        />

                        <div className={`flex items-center gap-2 flex-1 ${!rule.enabled ? "opacity-40" : ""}`}>
                          {rule.event.startsWith("pr_") && <GitPullRequest className={`w-3.5 h-3.5 ${rule.event === "pr_merged" ? "text-purple-500" : rule.event === "pr_closed" ? "text-red-500" : "text-blue-500"}`} />}
                          {rule.event.startsWith("deploy_") && <Rocket className={`w-3.5 h-3.5 ${rule.event === "deploy_succeeded" ? "text-emerald-500" : "text-red-500"}`} />}
                          <span className="text-xs text-text-primary">{eventLabels[rule.event] ?? rule.event}</span>
                          <span className="text-xs text-text-tertiary">&rarr;</span>
                          <select
                            value={rule.targetStateId}
                            onChange={e => updateAutomationState(rule.id, Number(e.target.value))}
                            className="text-xs px-2 py-0.5 border border-border rounded bg-surface text-text-primary"
                          >
                            {workflowStates.map(s => (
                              <option key={s.id} value={s.id}>{s.displayName}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => deleteAutomation(rule.id)}
                          className="p-1 text-text-tertiary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {addingAutomation ? (
                    <div className="flex items-center gap-2 p-2.5 bg-content-bg rounded-md">
                      <select
                        value={newAutomationEvent}
                        onChange={e => setNewAutomationEvent(e.target.value)}
                        className="text-xs px-2 py-1 border border-border rounded bg-surface text-text-primary"
                      >
                        {Object.entries(eventLabels).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <span className="text-xs text-text-tertiary">&rarr;</span>
                      <select
                        value={newAutomationStateId ?? ""}
                        onChange={e => setNewAutomationStateId(Number(e.target.value))}
                        className="text-xs px-2 py-1 border border-border rounded bg-surface text-text-primary"
                      >
                        <option value="" disabled>Select state...</option>
                        {workflowStates.map(s => (
                          <option key={s.id} value={s.id}>{s.displayName}</option>
                        ))}
                      </select>
                      <button
                        onClick={addAutomation}
                        disabled={!newAutomationStateId}
                        className="px-2.5 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded-md"
                      >
                        Add
                      </button>
                      <button onClick={() => setAddingAutomation(false)} className="px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingAutomation(true)}
                      className="text-xs text-text-tertiary hover:text-accent transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add automation rule
                    </button>
                  )}
                </div>

                {/* GitHub Feedback */}
                <div className="bg-surface border border-border rounded-lg p-4 mb-4">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-3">GitHub Feedback</span>
                  <p className="text-xs text-text-secondary mb-3">
                    Push Stori context back into GitHub so developers see work item info without leaving their PR.
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <ToggleButton enabled={statusChecks} onClick={toggleStatusChecks} />
                      <div>
                        <p className="text-sm text-text-primary">Status checks</p>
                        <p className="text-xs text-text-tertiary">Show linked work item state as a GitHub Status Check on PRs</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <ToggleButton enabled={prComments} onClick={togglePrComments} />
                      <div>
                        <p className="text-sm text-text-primary">PR comments</p>
                        <p className="text-xs text-text-tertiary">Post work item context (title, acceptance criteria, sprint) as a comment on linked PRs</p>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}
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
