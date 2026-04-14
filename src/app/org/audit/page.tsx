"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Search, ChevronDown, X, UserPlus, Settings, FolderPlus, Shield, Link2, UserMinus, Pencil, Trash2, Key, Info, Building2 } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { Pagination } from "@/components/Pagination";
import { useOrg } from "@/lib/use-org";
import { formatRelativeTime } from "@/lib/utils";

interface AuditEntry {
  id: number;
  orgId: number;
  actorId: string | null;
  actorName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  description: string;
  ipAddress: string | null;
  projectId: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const actionMeta: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "member.invited": { label: "Member invited", color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: UserPlus },
  "member.added": { label: "Member added", color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: UserPlus },
  "member.removed": { label: "Member removed", color: "bg-red-50 text-red-600 border-red-200", icon: UserMinus },
  "member.role_changed": { label: "Role changed", color: "bg-blue-50 text-blue-600 border-blue-200", icon: Shield },
  "organization.created": { label: "Org created", color: "bg-purple-50 text-purple-600 border-purple-200", icon: Building2 },
  "organization.updated": { label: "Org updated", color: "bg-amber-50 text-amber-600 border-amber-200", icon: Settings },
  "organization.deleted": { label: "Org deleted", color: "bg-red-50 text-red-600 border-red-200", icon: Trash2 },
  "team.created": { label: "Team created", color: "bg-purple-50 text-purple-600 border-purple-200", icon: FolderPlus },
  "team.deleted": { label: "Team deleted", color: "bg-red-50 text-red-600 border-red-200", icon: Trash2 },
  "role.created": { label: "Role created", color: "bg-blue-50 text-blue-600 border-blue-200", icon: Shield },
  "role.updated": { label: "Role updated", color: "bg-blue-50 text-blue-600 border-blue-200", icon: Pencil },
};

const defaultMeta = { label: "Unknown", color: "bg-gray-50 text-gray-500 border-gray-200", icon: Settings };

const allActionTypes = Object.keys(actionMeta);

export default function AuditPage() {
  const org = useOrg();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [actionDropdown, setActionDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchEntries = useCallback(async () => {
    if (!org.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
      });
      if (searchText) params.set("q", searchText);
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/orgs/${org.id}/audit-log?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.items);
        setTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [org.id, currentPage, pageSize, searchText, actionFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function exportCsv() {
    if (!org.id) return;
    const params = new URLSearchParams({ format: "csv" });
    if (searchText) params.set("q", searchText);
    if (actionFilter) params.set("action", actionFilter);

    const res = await fetch(`/api/orgs/${org.id}/audit-log?${params}`);
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasFilters = searchText || actionFilter;

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full capitalize">{org.role} view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav />

          {/* Permission note */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700">Only visible to Owners and Admins.</p>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Audit Log</h2>
              <p className="text-xs text-text-tertiary mt-0.5">Track all organization activity</p>
            </div>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary hover:border-accent hover:text-accent text-sm rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                placeholder="Search audit log..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            {/* Action filter */}
            <div className="relative">
              <button
                onClick={() => setActionDropdown(!actionDropdown)}
                className={`h-8 flex items-center gap-1.5 px-2.5 text-xs border rounded-md transition-colors ${
                  actionFilter ? "border-accent/50 bg-accent/5 text-accent" : "border-border text-text-secondary hover:border-border"
                }`}
              >
                Action{actionFilter && `: ${actionMeta[actionFilter]?.label ?? actionFilter}`}
                <ChevronDown className="w-3 h-3" />
              </button>
              {actionDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-20 min-w-[180px] max-h-60 overflow-auto">
                  {allActionTypes.map((a) => (
                    <button
                      key={a}
                      onClick={() => { setActionFilter(actionFilter === a ? null : a); setActionDropdown(false); setCurrentPage(1); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-content-bg transition-colors ${actionFilter === a ? "text-accent font-medium" : "text-text-secondary"}`}
                    >
                      {actionMeta[a]?.label ?? a}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasFilters && (
              <button
                onClick={() => { setSearchText(""); setActionFilter(null); setCurrentPage(1); }}
                className="h-8 flex items-center gap-1 px-2 text-xs text-text-tertiary hover:text-text-secondary"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Audit entries */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border/50">
              {loading && entries.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-text-tertiary">Loading audit log...</p>
                </div>
              )}

              {!loading && entries.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-text-tertiary">No matching audit entries.</p>
                </div>
              )}

              {entries.map((entry) => {
                const meta = actionMeta[entry.action] ?? defaultMeta;
                const Icon = meta.icon;
                const actorInitial = (entry.actorName ?? "?").charAt(0).toUpperCase();

                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-content-bg/30 transition-colors">
                    <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {actorInitial}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">
                        <span className="font-medium">{entry.actorName ?? "Unknown"}</span>{" "}
                        <span className="text-text-secondary">{entry.description}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${meta.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-text-tertiary">{formatRelativeTime(entry.createdAt)}</p>
                      {entry.ipAddress && (
                        <p className="text-[10px] text-text-tertiary/60 font-mono">{entry.ipAddress}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              totalItems={total}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              noun="entries"
            />
          </div>

          {/* Retention note */}
          <div className="text-xs text-text-tertiary text-right">
            Audit logs are retained for 90 days on the Team plan
          </div>
        </div>
      </div>
    </>
  );
}
