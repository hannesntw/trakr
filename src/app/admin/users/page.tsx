"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, MoreHorizontal,
  Shield, Trash2, UserCheck,
} from "lucide-react";
import { AdminTabNav } from "@/components/AdminTabNav";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  orgs: { id: number; name: string; role: string }[];
  isPlatformAdmin: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search) params.set("q", search);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => { setUsers(d.items ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleAdmin(userId: string, current: boolean) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPlatformAdmin: !current }),
    });
    setActionMenu(null);
    fetchUsers();
  }

  async function deleteUser(userId: string) {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setActionMenu(null);
    fetchUsers();
  }

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
          <AdminTabNav activeTab="users" />

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input type="text" placeholder="Search by name or email..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary outline-none focus:border-accent" />
            </div>
            <div className="flex-1" />
            <span className="text-xs text-text-tertiary">{total} users</span>
          </div>

          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-sm text-text-tertiary text-center">Loading...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-content-bg/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Organization(s)</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Role</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-content-bg/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                            {(user.name ?? user.email ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-text-primary truncate">{user.name ?? "Unnamed"}</span>
                              {user.isPlatformAdmin && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200 shrink-0">ADMIN</span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-tertiary truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.orgs.length === 0 ? (
                            <span className="text-[10px] text-text-tertiary">No org</span>
                          ) : user.orgs.map((o) => (
                            <span key={o.id} className="text-[10px] px-1.5 py-0.5 bg-content-bg border border-border rounded text-text-secondary">
                              {o.name} <span className="text-text-tertiary">({o.role})</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {user.isPlatformAdmin ? "Admin" : "User"}
                      </td>
                      <td className="px-4 py-3 text-right relative">
                        <button onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === user.id ? null : user.id); }}
                          className="p-1 rounded hover:bg-content-bg transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-text-tertiary" />
                        </button>
                        {actionMenu === user.id && (
                          <div className="absolute right-4 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 py-1 w-48">
                            <button onClick={(e) => { e.stopPropagation(); toggleAdmin(user.id, user.isPlatformAdmin); }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors">
                              <UserCheck className="w-3.5 h-3.5 text-text-tertiary" />
                              {user.isPlatformAdmin ? "Remove admin" : "Make admin"}
                            </button>
                            <div className="border-t border-border my-1" />
                            <button onClick={(e) => { e.stopPropagation(); deleteUser(user.id); }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors text-red-600">
                              <Trash2 className="w-3.5 h-3.5" /> Delete user
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-text-tertiary">No users found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
