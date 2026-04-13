"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, Search, X, Mail, ChevronDown, MoreHorizontal, Clock, UserMinus, ShieldCheck, ShieldAlert } from "lucide-react";

type OrgRole = "Owner" | "Admin" | "Member" | "Viewer" | "Guest";

interface OrgMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: OrgRole;
  teams: string[];
  lastActive: string;
  joined: string;
  status: "active" | "deactivated";
}

interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  sentAt: string;
  sentBy: string;
}

const roleColors: Record<OrgRole, string> = {
  Owner: "bg-purple-50 text-purple-600 border-purple-200",
  Admin: "bg-blue-50 text-blue-600 border-blue-200",
  Member: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Viewer: "bg-gray-50 text-gray-500 border-gray-200",
  Guest: "bg-amber-50 text-amber-600 border-amber-200",
};

const allRoles: OrgRole[] = ["Owner", "Admin", "Member", "Viewer", "Guest"];

const initialMembers: OrgMember[] = [
  { id: "1", name: "Hannes", email: "hannes@example.com", avatar: "H", role: "Owner", teams: ["Platform Engineering"], lastActive: "Just now", joined: "Jan 15, 2025", status: "active" },
  { id: "2", name: "Sarah Chen", email: "sarah@example.com", avatar: "S", role: "Admin", teams: ["Platform Engineering", "Product Design"], lastActive: "2 hours ago", joined: "Feb 3, 2025", status: "active" },
  { id: "3", name: "Alex Rivera", email: "alex@example.com", avatar: "A", role: "Member", teams: ["Platform Engineering", "QA & Release"], lastActive: "1 day ago", joined: "Mar 10, 2025", status: "active" },
  { id: "4", name: "Peter Schmidt", email: "peter@example.com", avatar: "P", role: "Member", teams: ["Platform Engineering"], lastActive: "3 hours ago", joined: "Mar 15, 2025", status: "active" },
  { id: "5", name: "Maya Patel", email: "maya@example.com", avatar: "M", role: "Admin", teams: ["Product Design"], lastActive: "5 hours ago", joined: "Apr 1, 2025", status: "active" },
  { id: "6", name: "Jordan Lee", email: "jordan@example.com", avatar: "J", role: "Member", teams: ["Product Design"], lastActive: "1 day ago", joined: "Apr 8, 2025", status: "active" },
  { id: "7", name: "Taylor Kim", email: "taylor@example.com", avatar: "T", role: "Member", teams: ["Product Design"], lastActive: "4 days ago", joined: "May 20, 2025", status: "active" },
  { id: "8", name: "Chris Evans", email: "chris@example.com", avatar: "C", role: "Member", teams: ["Growth"], lastActive: "2 days ago", joined: "Jun 1, 2025", status: "active" },
  { id: "9", name: "Dana White", email: "dana@example.com", avatar: "D", role: "Viewer", teams: ["Growth"], lastActive: "1 week ago", joined: "Jul 15, 2025", status: "active" },
  { id: "10", name: "Robin Park", email: "robin@example.com", avatar: "R", role: "Member", teams: ["QA & Release"], lastActive: "6 hours ago", joined: "Aug 3, 2025", status: "active" },
  { id: "11", name: "Sam Torres", email: "sam@example.com", avatar: "S", role: "Member", teams: ["QA & Release"], lastActive: "3 days ago", joined: "Sep 12, 2025", status: "active" },
  { id: "12", name: "Jamie Nguyen", email: "jamie@example.com", avatar: "J", role: "Guest", teams: [], lastActive: "2 weeks ago", joined: "Oct 5, 2025", status: "deactivated" },
];

const initialInvitations: Invitation[] = [
  { id: "i1", email: "casey@newco.com", role: "Member", sentAt: "Apr 11, 2026", sentBy: "Hannes" },
  { id: "i2", email: "quinn@partner.io", role: "Guest", sentAt: "Apr 10, 2026", sentBy: "Sarah Chen" },
];

export default function MembersPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [members, setMembers] = useState<OrgMember[]>(initialMembers);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState<OrgRole | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("Member");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = members.filter((m) => {
    if (searchText) {
      const q = searchText.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    }
    if (roleFilter && m.role !== roleFilter) return false;
    return true;
  });

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((m) => m.id)));
  }

  function changeRole(id: string, role: OrgRole) {
    setMembers(members.map((m) => (m.id === id ? { ...m, role } : m)));
    setMenuOpen(null);
  }

  function deactivateMember(id: string) {
    setMembers(members.map((m) => (m.id === id ? { ...m, status: m.status === "active" ? "deactivated" as const : "active" as const } : m)));
    setMenuOpen(null);
  }

  function removeMember(id: string) {
    setMembers(members.filter((m) => m.id !== id));
    setMenuOpen(null);
  }

  function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInvitations([...invitations, { id: String(Date.now()), email: inviteEmail.trim(), role: inviteRole, sentAt: "Apr 13, 2026", sentBy: "Hannes" }]);
    setInviteEmail("");
    setShowInvite(false);
  }

  function revokeInvite(id: string) {
    setInvitations(invitations.filter((i) => i.id !== id));
  }

  function bulkChangeRole(role: OrgRole) {
    setMembers(members.map((m) => (selectedIds.has(m.id) && m.role !== "Owner" ? { ...m, role } : m)));
    setSelectedIds(new Set());
  }

  function bulkRemove() {
    setMembers(members.filter((m) => !selectedIds.has(m.id) || m.role === "Owner"));
    setSelectedIds(new Set());
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization Settings</h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {/* Sub-nav */}
          <nav className="flex gap-1 border-b border-border -mt-2 mb-2">
            {[
              { href: `/${variant}/org`, label: "Overview" },
              { href: `/${variant}/org/members`, label: "Members", active: true },
              { href: `/${variant}/org/teams`, label: "Teams" },
              { href: `/${variant}/org/roles`, label: "Roles & Permissions" },
              { href: `/${variant}/org/audit`, label: "Audit Log" },
              { href: `/${variant}/org/security`, label: "Security" },
            ].map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                  tab.active
                    ? "border-accent text-accent font-medium"
                    : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Members</h2>
              <p className="text-xs text-text-tertiary mt-0.5">{members.filter((m) => m.status === "active").length} active members, {invitations.length} pending invitations</p>
            </div>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Invite Member
            </button>
          </div>

          {/* Invite form */}
          {showInvite && (
            <div className="bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">Invite New Member</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-content-bg border border-border rounded-md">
                    <Mail className="w-3.5 h-3.5 text-text-tertiary" />
                    <input
                      autoFocus
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                      placeholder="Email address..."
                      className="flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                  className="px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg"
                >
                  {allRoles.filter((r) => r !== "Owner").map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button onClick={sendInvite} disabled={!inviteEmail.trim()} className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors">
                  Send Invite
                </button>
                <button onClick={() => { setShowInvite(false); setInviteEmail(""); }} className="px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Filters + bulk actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search members..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setRoleFilter(roleFilter ? null : "Member")}
                className={`h-8 flex items-center gap-1.5 px-2.5 text-xs border rounded-md transition-colors ${
                  roleFilter ? "border-accent/50 bg-accent/5 text-accent" : "border-border text-text-secondary hover:border-border"
                }`}
              >
                Role{roleFilter && `: ${roleFilter}`}
                <ChevronDown className="w-3 h-3" />
              </button>
              {/* Simplified: cycle through roles on click */}
            </div>

            {selectedIds.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-text-tertiary">{selectedIds.size} selected</span>
                <select
                  onChange={(e) => { if (e.target.value) bulkChangeRole(e.target.value as OrgRole); e.target.value = ""; }}
                  className="h-8 px-2 text-xs border border-border rounded-md bg-content-bg text-text-secondary"
                  defaultValue=""
                >
                  <option value="" disabled>Change role...</option>
                  {allRoles.filter((r) => r !== "Owner").map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button onClick={bulkRemove} className="h-8 px-2.5 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors">
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Members table */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="accent-accent"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase">Member</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-24">Role</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase">Teams</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-28">Last Active</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-28">Joined</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id} className={`border-b border-border/50 hover:bg-content-bg/50 transition-colors ${member.status === "deactivated" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member.id)}
                        onChange={() => toggleSelect(member.id)}
                        className="accent-accent"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                          {member.avatar}
                        </span>
                        <div>
                          <p className="text-sm text-text-primary font-medium">{member.name}</p>
                          <p className="text-xs text-text-tertiary">{member.email}</p>
                        </div>
                        {member.status === "deactivated" && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-500 border border-red-200 rounded">Deactivated</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${roleColors[member.role]}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {member.teams.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 text-[10px] bg-content-bg border border-border rounded text-text-secondary">{t}</span>
                        ))}
                        {member.teams.length === 0 && <span className="text-xs text-text-tertiary">--</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-text-tertiary">{member.lastActive}</td>
                    <td className="px-3 py-2.5 text-xs text-text-tertiary">{member.joined}</td>
                    <td className="px-3 py-2.5 relative">
                      {member.role !== "Owner" && (
                        <>
                          <button
                            onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                            className="p-1 text-text-tertiary hover:text-text-secondary rounded transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {menuOpen === member.id && (
                            <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 min-w-[160px]">
                              <div className="py-1">
                                <div className="px-3 py-1 text-[10px] text-text-tertiary uppercase tracking-wider">Change role</div>
                                {allRoles.filter((r) => r !== "Owner" && r !== member.role).map((r) => (
                                  <button key={r} onClick={() => changeRole(member.id, r)} className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-content-bg flex items-center gap-2">
                                    <ShieldCheck className="w-3 h-3" /> {r}
                                  </button>
                                ))}
                              </div>
                              <div className="border-t border-border py-1">
                                <button onClick={() => deactivateMember(member.id)} className="w-full text-left px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                  <ShieldAlert className="w-3 h-3" /> {member.status === "active" ? "Deactivate" : "Reactivate"}
                                </button>
                                <button onClick={() => removeMember(member.id)} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2">
                                  <UserMinus className="w-3 h-3" /> Remove
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-tertiary" />
                Pending Invitations
              </h2>
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0">
                    <Mail className="w-4 h-4 text-text-tertiary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">{inv.email}</p>
                      <p className="text-xs text-text-tertiary">Invited by {inv.sentBy} on {inv.sentAt}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full border font-medium ${roleColors[inv.role]}`}>
                      {inv.role}
                    </span>
                    <button className="px-2 py-1 text-xs text-text-tertiary hover:text-accent border border-border rounded transition-colors">
                      Resend
                    </button>
                    <button onClick={() => revokeInvite(inv.id)} className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors">
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
