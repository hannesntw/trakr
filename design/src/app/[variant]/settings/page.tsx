"use client";

import { useState } from "react";
import { Pencil, Check, X, Plus, Trash2, Mail, Cpu } from "lucide-react";

export default function SettingsPage() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [members, setMembers] = useState([
    { email: "hannes@example.com", role: "Owner" },
    { email: "alex@example.com", role: "Contributor" },
  ]);

  function addMember() {
    if (!inviteEmail.trim()) return;
    setMembers([...members, { email: inviteEmail.trim(), role: "Contributor" }]);
    setInviteEmail("");
  }

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
                  <input defaultValue="My Demo Project" className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Key</label>
                  <input defaultValue="MDP" className="w-24 px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Description</label>
                <textarea defaultValue="A project I created to try out Trakr." rows={2} className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Visibility</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="vis" defaultChecked className="accent-accent" /> Private
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="vis" className="accent-accent" /> Public
                  </label>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">Public projects are visible to all signed-in users. Private projects are only visible to you and invited members.</p>
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

              {/* Invite */}
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

          {/* Sprint Cadence */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Sprint Cadence</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs text-text-tertiary">Duration</label>
                <select className="px-2 py-1 text-sm border border-border rounded-md bg-content-bg">
                  <option>1 week</option>
                  <option selected>2 weeks</option>
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
