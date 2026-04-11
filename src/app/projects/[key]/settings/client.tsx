"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Trash2, Mail } from "lucide-react";

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

  useEffect(() => {
    fetch(`/api/projects/${project.id}/invites`).then(r => r.json()).then(setInvites);
  }, [project.id]);

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
