"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, X, Mail, ChevronDown, ChevronRight, MoreHorizontal, Clock, UserMinus, ShieldCheck, ShieldAlert } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { Pagination } from "@/components/Pagination";
import { useOrg } from "@/lib/use-org";
import { formatDate } from "@/lib/utils";

type OrgRole = "owner" | "admin" | "member" | "viewer" | "guest";

interface MemberItem {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { name: string | null; email: string | null };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

const roleColors: Record<string, string> = {
  owner: "bg-purple-50 text-purple-600 border-purple-200",
  admin: "bg-blue-50 text-blue-600 border-blue-200",
  member: "bg-emerald-50 text-emerald-600 border-emerald-200",
  viewer: "bg-gray-50 text-gray-500 border-gray-200",
  guest: "bg-amber-50 text-amber-600 border-amber-200",
};

const allRoles: OrgRole[] = ["owner", "admin", "member", "viewer", "guest"];
const assignableRoles: OrgRole[] = ["admin", "member", "viewer", "guest"];

export default function MembersPage() {
  const org = useOrg();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [total, setTotal] = useState(0);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchText, setSearchText] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!org.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
      });
      if (searchText) params.set("q", searchText);
      const res = await fetch(`/api/orgs/${org.id}/members?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.items);
        setTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [org.id, currentPage, pageSize, searchText]);

  const fetchInvitations = useCallback(async () => {
    if (!org.id) return;
    try {
      const res = await fetch(`/api/orgs/${org.id}/invitations`);
      if (res.ok) {
        setInvitations(await res.json());
      }
    } catch {
      // ignore
    }
  }, [org.id]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  async function changeRole(memberId: string, role: OrgRole) {
    const res = await fetch(`/api/orgs/${org.id}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    }
    setMenuOpen(null);
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/orgs/${org.id}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setTotal((prev) => prev - 1);
      if (expandedId === memberId) setExpandedId(null);
    }
    setMenuOpen(null);
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    const res = await fetch(`/api/orgs/${org.id}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    if (res.ok) {
      setInviteEmail("");
      setShowInvite(false);
      fetchInvitations();
    }
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch(`/api/orgs/${org.id}/invitations/${inviteId}`, { method: "DELETE" });
    if (res.ok) {
      setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
    }
  }

  async function resendInvite(inviteId: string) {
    await fetch(`/api/orgs/${org.id}/invitations/${inviteId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend" }),
    });
  }

  function handleRowClick(memberId: string) {
    setExpandedId(expandedId === memberId ? null : memberId);
    setMenuOpen(null);
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full capitalize">{org.role} view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Members</h2>
              <p className="text-xs text-text-tertiary mt-0.5">{total} members, {invitations.length} pending invitations</p>
            </div>
            {(org.role === "owner" || org.role === "admin") && (
              <button
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Invite Member
              </button>
            )}
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
                  {assignableRoles.map((r) => (
                    <option key={r} value={r} className="capitalize">{r}</option>
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

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                placeholder="Search members..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>

          {/* Members table */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-text-tertiary uppercase">Member</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-24">Role</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-32">Joined</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading && members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-tertiary">
                      Loading members...
                    </td>
                  </tr>
                )}
                {!loading && members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-tertiary">
                      No members found
                    </td>
                  </tr>
                )}
                {members.map((member) => {
                  const isExpanded = expandedId === member.id;
                  const displayName = member.user.name || member.user.email || "Unknown";
                  const initial = displayName.charAt(0).toUpperCase();

                  return (
                    <tr key={member.id} className="group">
                      <td colSpan={4} className="p-0">
                        <div className={`${isExpanded ? "bg-accent/5" : ""}`}>
                          {/* Main row */}
                          <div className={`flex items-center border-b border-border/50 transition-colors ${!isExpanded ? "hover:bg-content-bg/50" : ""}`}>
                            <div className="flex-1 px-4 py-2.5 cursor-pointer" onClick={() => handleRowClick(member.id)}>
                              <div className="flex items-center gap-2.5">
                                <ChevronRight className={`w-3.5 h-3.5 text-text-tertiary transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                                <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {initial}
                                </span>
                                <div>
                                  <p className="text-sm text-text-primary font-medium">{displayName}</p>
                                  <p className="text-xs text-text-tertiary">{member.user.email}</p>
                                </div>
                              </div>
                            </div>
                            <div className="w-24 px-3 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${roleColors[member.role] ?? roleColors.member}`}>
                                {member.role}
                              </span>
                            </div>
                            <div className="w-32 px-3 py-2.5 text-xs text-text-tertiary">
                              {formatDate(member.joinedAt)}
                            </div>
                            <div className="w-10 px-3 py-2.5 relative">
                              {member.role !== "owner" && (org.role === "owner" || org.role === "admin") && (
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
                                        {assignableRoles.filter((r) => r !== member.role).map((r) => (
                                          <button key={r} onClick={() => changeRole(member.id, r)} className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-content-bg flex items-center gap-2 capitalize">
                                            <ShieldCheck className="w-3 h-3" /> {r}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="border-t border-border py-1">
                                        <button onClick={() => removeMember(member.id)} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2">
                                          <UserMinus className="w-3 h-3" /> Remove
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="px-6 py-4 border-b border-border/50 space-y-4">
                              <div className="bg-content-bg border border-border rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-3">
                                  <span className="w-10 h-10 rounded-full bg-accent/10 text-accent text-sm font-bold flex items-center justify-center">
                                    {initial}
                                  </span>
                                  <div>
                                    <p className="text-sm text-text-primary font-medium">{displayName}</p>
                                    <p className="text-xs text-text-tertiary">{member.user.email}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                                  <div>
                                    <p className="text-[10px] text-text-tertiary">Role</p>
                                    <div className="mt-0.5">
                                      {member.role === "owner" ? (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${roleColors.owner}`}>
                                          owner
                                        </span>
                                      ) : (org.role === "owner" || org.role === "admin") ? (
                                        <select
                                          value={member.role}
                                          onChange={(e) => changeRole(member.id, e.target.value as OrgRole)}
                                          className="px-2 py-0.5 text-xs border border-border rounded-md bg-surface capitalize"
                                        >
                                          {assignableRoles.map((r) => (
                                            <option key={r} value={r} className="capitalize">{r}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${roleColors[member.role] ?? roleColors.member}`}>
                                          {member.role}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-text-tertiary">Joined</p>
                                    <p className="text-xs text-text-primary mt-0.5">{formatDate(member.joinedAt)}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              {member.role !== "owner" && (org.role === "owner" || org.role === "admin") && (
                                <div className="border border-red-200 rounded-lg p-3 space-y-2">
                                  <h4 className="text-xs font-medium text-red-600">Actions</h4>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => removeMember(member.id)}
                                      className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                                    >
                                      Remove from Organization
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              totalItems={total}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              noun="members"
            />
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
                      <p className="text-xs text-text-tertiary">Expires {formatDate(inv.expiresAt)}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full border font-medium capitalize ${roleColors[inv.role] ?? roleColors.member}`}>
                      {inv.role}
                    </span>
                    <button onClick={() => resendInvite(inv.id)} className="px-2 py-1 text-xs text-text-tertiary hover:text-accent border border-border rounded transition-colors">
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
