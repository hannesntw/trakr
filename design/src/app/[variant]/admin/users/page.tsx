"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Search, ChevronRight, MoreHorizontal,
  Shield, UserX, Trash2, UserCheck, RefreshCw,
  Key, Clock, Monitor, Activity,
} from "lucide-react";
import { AdminTabNav } from "@/components/AdminTabNav";
import { Pagination, paginate } from "@/components/Pagination";

/* ── types ── */

type SignInMethod = "Google" | "Magic Link" | "SSO" | "Password";
type UserStatus = "active" | "inactive" | "deactivated";

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  orgs: { name: string; role: string }[];
  signInMethod: SignInMethod;
  status: UserStatus;
  isPlatformAdmin: boolean;
  lastActive: string;
  created: string;
  sessions: number;
  apiKeys: number;
  recentActions: string[];
}

/* ── mock data ── */

const users: PlatformUser[] = [
  {
    id: "usr_1", name: "Hannes Lehmann", email: "hannes@nexa.com", avatar: "HL",
    orgs: [{ name: "Nexa Digital", role: "Owner" }], signInMethod: "Google",
    status: "active", isPlatformAdmin: true, lastActive: "Just now", created: "2025-08-12",
    sessions: 3, apiKeys: 2,
    recentActions: ["Changed plan for VoltLabs", "Created org Nexa Digital", "Enabled GitHub integration"],
  },
  {
    id: "usr_2", name: "Sarah Chen", email: "sarah@nexadigital.com", avatar: "SC",
    orgs: [{ name: "Nexa Digital", role: "Admin" }], signInMethod: "Google",
    status: "active", isPlatformAdmin: false, lastActive: "2 hours ago", created: "2025-08-15",
    sessions: 2, apiKeys: 1,
    recentActions: ["Created project Design System", "Updated sprint Sprint 12"],
  },
  {
    id: "usr_3", name: "Marcus Wolf", email: "m.wolf@bytecraft.io", avatar: "MW",
    orgs: [{ name: "ByteCraft", role: "Owner" }], signInMethod: "Magic Link",
    status: "active", isPlatformAdmin: false, lastActive: "15 min ago", created: "2025-11-03",
    sessions: 1, apiKeys: 3,
    recentActions: ["Bulk moved 12 items", "Updated workflow"],
  },
  {
    id: "usr_4", name: "Priya Sharma", email: "priya@tekton.dev", avatar: "PS",
    orgs: [{ name: "Tekton Labs", role: "Owner" }], signInMethod: "SSO",
    status: "active", isPlatformAdmin: false, lastActive: "1 hour ago", created: "2025-12-18",
    sessions: 2, apiKeys: 0,
    recentActions: ["Added webhook integration", "Invited 2 members"],
  },
  {
    id: "usr_5", name: "James Okafor", email: "james@cloudpeak.co", avatar: "JO",
    orgs: [{ name: "CloudPeak", role: "Owner" }], signInMethod: "Google",
    status: "active", isPlatformAdmin: false, lastActive: "3 hours ago", created: "2026-03-20",
    sessions: 1, apiKeys: 0,
    recentActions: ["Started trial", "Created first project"],
  },
  {
    id: "usr_6", name: "Lena Bergstrom", email: "lena@nordstack.se", avatar: "LB",
    orgs: [{ name: "NordStack", role: "Owner" }], signInMethod: "Magic Link",
    status: "active", isPlatformAdmin: false, lastActive: "1 day ago", created: "2026-01-14",
    sessions: 1, apiKeys: 0,
    recentActions: ["Created work item", "Updated backlog"],
  },
  {
    id: "usr_7", name: "Tom Martinez", email: "tom@devharbor.com", avatar: "TM",
    orgs: [{ name: "DevHarbor", role: "Owner" }], signInMethod: "Password",
    status: "active", isPlatformAdmin: false, lastActive: "30 min ago", created: "2025-10-07",
    sessions: 2, apiKeys: 1,
    recentActions: ["Ran TraQL query", "Exported sprint report"],
  },
  {
    id: "usr_8", name: "Ayumi Tanaka", email: "ayumi@kaizen.jp", avatar: "AT",
    orgs: [{ name: "Kaizen Corp", role: "Owner" }], signInMethod: "SSO",
    status: "active", isPlatformAdmin: false, lastActive: "5 min ago", created: "2025-09-01",
    sessions: 4, apiKeys: 2,
    recentActions: ["Configured SCIM provisioning", "Updated SSO settings"],
  },
  {
    id: "usr_9", name: "Nina Petrova", email: "nina@voltlabs.eu", avatar: "NP",
    orgs: [{ name: "VoltLabs", role: "Owner" }], signInMethod: "Magic Link",
    status: "deactivated", isPlatformAdmin: false, lastActive: "12 days ago", created: "2025-11-22",
    sessions: 0, apiKeys: 0,
    recentActions: ["Account suspended due to billing"],
  },
  {
    id: "usr_10", name: "Carlos Ruiz", email: "carlos@agilestack.mx", avatar: "CR",
    orgs: [{ name: "Nexa Digital", role: "Member" }], signInMethod: "Google",
    status: "active", isPlatformAdmin: false, lastActive: "4 hours ago", created: "2026-02-10",
    sessions: 1, apiKeys: 0,
    recentActions: ["Commented on TRK-142", "Updated story points"],
  },
  {
    id: "usr_11", name: "Emma Wilson", email: "emma@bytecraft.io", avatar: "EW",
    orgs: [{ name: "ByteCraft", role: "Admin" }], signInMethod: "Google",
    status: "active", isPlatformAdmin: false, lastActive: "45 min ago", created: "2025-11-10",
    sessions: 2, apiKeys: 1,
    recentActions: ["Created sprint Sprint 8", "Added 5 stories"],
  },
  {
    id: "usr_12", name: "Ravi Patel", email: "ravi@nexa.com", avatar: "RP",
    orgs: [{ name: "Nexa Digital", role: "Member" }, { name: "Kaizen Corp", role: "Member" }], signInMethod: "SSO",
    status: "active", isPlatformAdmin: false, lastActive: "20 min ago", created: "2025-09-15",
    sessions: 3, apiKeys: 1,
    recentActions: ["Moved item to Done", "Created link between items"],
  },
  {
    id: "usr_13", name: "Mia Johansson", email: "mia@nordstack.se", avatar: "MJ",
    orgs: [{ name: "NordStack", role: "Member" }], signInMethod: "Magic Link",
    status: "inactive", isPlatformAdmin: false, lastActive: "14 days ago", created: "2026-01-20",
    sessions: 0, apiKeys: 0,
    recentActions: ["Viewed board", "Updated profile"],
  },
  {
    id: "usr_14", name: "Alex Novak", email: "alex@tekton.dev", avatar: "AN",
    orgs: [{ name: "Tekton Labs", role: "Member" }], signInMethod: "SSO",
    status: "active", isPlatformAdmin: false, lastActive: "2 hours ago", created: "2026-01-05",
    sessions: 1, apiKeys: 0,
    recentActions: ["Created work item", "Added comment"],
  },
  {
    id: "usr_15", name: "Sofia Garcia", email: "sofia@devharbor.com", avatar: "SG",
    orgs: [{ name: "DevHarbor", role: "Member" }], signInMethod: "Password",
    status: "active", isPlatformAdmin: false, lastActive: "1 hour ago", created: "2025-12-01",
    sessions: 1, apiKeys: 0,
    recentActions: ["Ran backlog query", "Updated sprint scope"],
  },
  {
    id: "usr_16", name: "Kenji Watanabe", email: "kenji@kaizen.jp", avatar: "KW",
    orgs: [{ name: "Kaizen Corp", role: "Admin" }], signInMethod: "SSO",
    status: "active", isPlatformAdmin: false, lastActive: "10 min ago", created: "2025-09-05",
    sessions: 2, apiKeys: 1,
    recentActions: ["Updated team structure", "Assigned roles"],
  },
  {
    id: "usr_17", name: "Lisa Park", email: "lisa@nexa.com", avatar: "LP",
    orgs: [{ name: "Nexa Digital", role: "Member" }], signInMethod: "Google",
    status: "active", isPlatformAdmin: false, lastActive: "35 min ago", created: "2025-10-20",
    sessions: 1, apiKeys: 0,
    recentActions: ["Edited work item description", "Changed priority"],
  },
  {
    id: "usr_18", name: "Daniel Lee", email: "daniel@bytecraft.io", avatar: "DL",
    orgs: [{ name: "ByteCraft", role: "Member" }], signInMethod: "Magic Link",
    status: "active", isPlatformAdmin: false, lastActive: "6 hours ago", created: "2026-01-15",
    sessions: 1, apiKeys: 0,
    recentActions: ["Completed 3 stories", "Updated timeline"],
  },
  {
    id: "usr_19", name: "Fatima Al-Said", email: "fatima@kaizen.jp", avatar: "FA",
    orgs: [{ name: "Kaizen Corp", role: "Member" }], signInMethod: "SSO",
    status: "active", isPlatformAdmin: false, lastActive: "1 hour ago", created: "2025-11-01",
    sessions: 1, apiKeys: 0,
    recentActions: ["Added attachment", "Created sub-task"],
  },
  {
    id: "usr_20", name: "Oliver Brown", email: "oliver@nexa.com", avatar: "OB",
    orgs: [{ name: "Nexa Digital", role: "Viewer" }], signInMethod: "Google",
    status: "active", isPlatformAdmin: false, lastActive: "2 hours ago", created: "2026-03-01",
    sessions: 1, apiKeys: 0,
    recentActions: ["Viewed sprint report", "Browsed backlog"],
  },
  {
    id: "usr_21", name: "Ingrid Muller", email: "ingrid@nexa.com", avatar: "IM",
    orgs: [{ name: "Nexa Digital", role: "Member" }, { name: "ByteCraft", role: "Member" }], signInMethod: "Google",
    status: "active", isPlatformAdmin: false, lastActive: "4 hours ago", created: "2025-09-20",
    sessions: 2, apiKeys: 0,
    recentActions: ["Updated custom fields", "Created query"],
  },
];

const methodColors: Record<SignInMethod, string> = {
  Google: "bg-blue-100 text-blue-700",
  "Magic Link": "bg-purple-100 text-purple-700",
  SSO: "bg-emerald-100 text-emerald-700",
  Password: "bg-gray-100 text-gray-700",
};

const statusColors: Record<UserStatus, string> = {
  active: "bg-emerald-500",
  inactive: "bg-amber-500",
  deactivated: "bg-red-500",
};

export default function AdminUsersPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = users.filter((user) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.orgs.some((o) => o.name.toLowerCase().includes(q))
    );
  });

  const paginatedUsers = paginate(filtered, currentPage, pageSize);

  return (
    <>
      <header className="bg-amber-950 text-amber-100 shrink-0">
        <div className="h-8 px-6 flex items-center gap-2 text-xs">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-amber-400">Platform Administration</span>
          <span className="text-amber-300/60 mx-1">/</span>
          <span className="text-amber-300/80">Users</span>
        </div>
      </header>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Users</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-200">Super Admin</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <AdminTabNav variant={variant} activeTab="users" />

          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search by name, email, or organization..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1" />
            <span className="text-xs text-text-tertiary">{filtered.length} of {users.length} users</span>
          </div>

          {/* Table */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-content-bg/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary w-8"></th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Organization(s)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Sign-in</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Last Active</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedUsers.map((user) => (
                  <>
                    <tr
                      key={user.id}
                      className="hover:bg-content-bg/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    >
                      <td className="px-4 py-3">
                        <ChevronRight className={`w-3.5 h-3.5 text-text-tertiary transition-transform ${expandedUser === user.id ? "rotate-90" : ""}`} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[user.status]}`} />
                          <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                            {user.avatar}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-text-primary truncate">{user.name}</span>
                              {user.isPlatformAdmin && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200 shrink-0">
                                  PLATFORM ADMIN
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-tertiary truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.orgs.map((o) => (
                            <span key={o.name} className="text-[10px] px-1.5 py-0.5 bg-content-bg border border-border rounded text-text-secondary">
                              {o.name} <span className="text-text-tertiary">({o.role})</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${methodColors[user.signInMethod]}`}>
                          {user.signInMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{user.lastActive}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{user.created}</td>
                      <td className="px-4 py-3 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuUser(actionMenuUser === user.id ? null : user.id);
                          }}
                          className="p-1 rounded hover:bg-content-bg transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4 text-text-tertiary" />
                        </button>
                        {actionMenuUser === user.id && (
                          <div className="absolute right-4 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 py-1 w-48">
                            <button className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors">
                              <UserCheck className="w-3.5 h-3.5 text-text-tertiary" />
                              Impersonate
                            </button>
                            <button className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors">
                              <RefreshCw className="w-3.5 h-3.5 text-text-tertiary" />
                              Reset sessions
                            </button>
                            <button className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors text-amber-600">
                              <UserX className="w-3.5 h-3.5" />
                              {user.status === "deactivated" ? "Reactivate" : "Deactivate"}
                            </button>
                            <div className="border-t border-border my-1" />
                            <button className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete user
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedUser === user.id && (
                      <tr key={`${user.id}-detail`} className="bg-content-bg/40">
                        <td colSpan={7} className="px-8 py-4">
                          <div className="grid grid-cols-3 gap-6 text-xs">
                            <div className="space-y-2">
                              <p className="font-medium text-text-primary flex items-center gap-1.5">
                                <Monitor className="w-3.5 h-3.5 text-text-tertiary" />
                                Sessions & Keys
                              </p>
                              <p className="text-text-secondary">{user.sessions} active session{user.sessions !== 1 ? "s" : ""}</p>
                              <p className="text-text-secondary">{user.apiKeys} API key{user.apiKeys !== 1 ? "s" : ""}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="font-medium text-text-primary flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-text-tertiary" />
                                Recent Activity
                              </p>
                              {user.recentActions.map((action, i) => (
                                <p key={i} className="text-text-secondary">{action}</p>
                              ))}
                            </div>
                            <div className="space-y-2">
                              <p className="font-medium text-text-primary flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-text-tertiary" />
                                Account Details
                              </p>
                              <p className="text-text-secondary">Status: <span className="capitalize">{user.status}</span></p>
                              <p className="text-text-secondary">Method: {user.signInMethod}</p>
                              <p className="text-text-tertiary">ID: {user.id}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            <Pagination
              totalItems={filtered.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              noun="users"
            />
          </div>
        </div>
      </div>
    </>
  );
}
