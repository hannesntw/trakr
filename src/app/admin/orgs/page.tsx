"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, ChevronRight, MoreHorizontal,
  Trash2, CreditCard,
} from "lucide-react";
import { AdminTabNav } from "@/components/AdminTabNav";

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  plan: string;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  developer: "bg-blue-100 text-blue-700",
  team: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-800",
};

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search) params.set("q", search);
    if (planFilter) params.set("plan", planFilter);
    fetch(`/api/admin/orgs?${params}`)
      .then((r) => r.json())
      .then((d) => { setOrgs(d.items ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, search, planFilter]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  async function changePlan(orgId: string, newPlan: string) {
    await fetch(`/api/admin/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: newPlan }),
    });
    setActionMenu(null);
    fetchOrgs();
  }

  async function deleteOrg(orgId: string) {
    if (!confirm("Delete this organization?")) return;
    await fetch(`/api/admin/orgs/${orgId}`, { method: "DELETE" });
    setActionMenu(null);
    fetchOrgs();
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organizations</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-500/25">Super Admin</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <AdminTabNav activeTab="orgs" />

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input type="text" placeholder="Search organizations..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary outline-none focus:border-accent" />
            </div>
            <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary outline-none focus:border-accent">
              <option value="">All plans</option>
              <option value="free">Free</option>
              <option value="developer">Developer</option>
              <option value="team">Team</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <div className="flex-1" />
            <span className="text-xs text-text-tertiary">{total} organizations</span>
          </div>

          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-sm text-text-tertiary text-center">Loading...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-content-bg/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Organization</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Plan</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary">Members</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary">Projects</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Created</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orgs.map((org) => (
                    <tr key={org.id} className="hover:bg-content-bg/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-medium text-text-primary">{org.name}</span>
                          <span className="text-text-tertiary text-xs">/{org.slug}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${planColors[org.plan] ?? "bg-gray-100 text-gray-700"}`}>
                          {org.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">{org.memberCount}</td>
                      <td className="px-4 py-3 text-right text-text-secondary">{org.projectCount}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : "--"}</td>
                      <td className="px-4 py-3 text-right relative">
                        <button onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === org.id ? null : org.id); }}
                          className="p-1 rounded hover:bg-content-bg transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-text-tertiary" />
                        </button>
                        {actionMenu === org.id && (
                          <div className="absolute right-4 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 py-1 w-48">
                            <button onClick={(e) => { e.stopPropagation(); changePlan(org.id, org.plan === "enterprise" ? "team" : "enterprise"); }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors">
                              <CreditCard className="w-3.5 h-3.5 text-text-tertiary" />
                              {org.plan === "enterprise" ? "Downgrade to Team" : "Upgrade to Enterprise"}
                            </button>
                            <div className="border-t border-border my-1" />
                            <button onClick={(e) => { e.stopPropagation(); deleteOrg(org.id); }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors text-red-600">
                              <Trash2 className="w-3.5 h-3.5" /> Delete org
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {orgs.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-tertiary">No organizations found</td></tr>
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
