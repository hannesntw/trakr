"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Download, Search, ChevronDown, X, UserPlus, Settings, FolderPlus, Shield, Link2, UserMinus, Pencil, Trash2, Key, Info } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";

type ActionType = "member_invited" | "member_removed" | "role_changed" | "project_created" | "project_deleted" | "settings_changed" | "integration_connected" | "integration_disconnected" | "work_item_created" | "work_item_deleted" | "api_key_created" | "sso_configured";

interface AuditEntry {
  id: string;
  user: string;
  avatar: string;
  action: ActionType;
  description: string;
  target: string;
  project: string | null;
  timestamp: string;
  ip: string;
}

const actionLabels: Record<ActionType, { label: string; color: string; icon: React.ElementType }> = {
  member_invited: { label: "Member invited", color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: UserPlus },
  member_removed: { label: "Member removed", color: "bg-red-50 text-red-600 border-red-200", icon: UserMinus },
  role_changed: { label: "Role changed", color: "bg-blue-50 text-blue-600 border-blue-200", icon: Shield },
  project_created: { label: "Project created", color: "bg-purple-50 text-purple-600 border-purple-200", icon: FolderPlus },
  project_deleted: { label: "Project deleted", color: "bg-red-50 text-red-600 border-red-200", icon: Trash2 },
  settings_changed: { label: "Settings changed", color: "bg-amber-50 text-amber-600 border-amber-200", icon: Settings },
  integration_connected: { label: "Integration connected", color: "bg-cyan-50 text-cyan-600 border-cyan-200", icon: Link2 },
  integration_disconnected: { label: "Integration disconnected", color: "bg-gray-50 text-gray-500 border-gray-200", icon: Link2 },
  work_item_created: { label: "Work item created", color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: Pencil },
  work_item_deleted: { label: "Work item deleted", color: "bg-red-50 text-red-600 border-red-200", icon: Trash2 },
  api_key_created: { label: "API key created", color: "bg-amber-50 text-amber-600 border-amber-200", icon: Key },
  sso_configured: { label: "SSO configured", color: "bg-blue-50 text-blue-600 border-blue-200", icon: Shield },
};

const entries: AuditEntry[] = [
  { id: "1", user: "Hannes", avatar: "H", action: "sso_configured", description: "Configured SAML SSO with Okta", target: "Organization", project: null, timestamp: "Apr 13, 2026 09:42 AM", ip: "192.168.1.42" },
  { id: "2", user: "Hannes", avatar: "H", action: "member_invited", description: "Invited casey@newco.com as Member", target: "casey@newco.com", project: null, timestamp: "Apr 11, 2026 03:15 PM", ip: "192.168.1.42" },
  { id: "3", user: "Sarah Chen", avatar: "S", action: "member_invited", description: "Invited quinn@partner.io as Guest", target: "quinn@partner.io", project: null, timestamp: "Apr 10, 2026 11:30 AM", ip: "10.0.0.55" },
  { id: "4", user: "Hannes", avatar: "H", action: "integration_connected", description: "Connected GitHub repository hannesntw/stori", target: "GitHub", project: "Stori", timestamp: "Apr 10, 2026 10:00 AM", ip: "192.168.1.42" },
  { id: "5", user: "Hannes", avatar: "H", action: "api_key_created", description: "Created API key 'Claude Code - MacBook'", target: "API Key", project: null, timestamp: "Apr 10, 2026 09:45 AM", ip: "192.168.1.42" },
  { id: "6", user: "Maya Patel", avatar: "M", action: "project_created", description: "Created project Pictura (PIC)", target: "Pictura", project: "Pictura", timestamp: "Apr 9, 2026 02:30 PM", ip: "10.0.0.78" },
  { id: "7", user: "Sarah Chen", avatar: "S", action: "role_changed", description: "Changed Alex Rivera's role from Viewer to Member", target: "Alex Rivera", project: null, timestamp: "Apr 8, 2026 04:20 PM", ip: "10.0.0.55" },
  { id: "8", user: "Hannes", avatar: "H", action: "settings_changed", description: "Updated organization name to ThoughtWorks", target: "Organization", project: null, timestamp: "Apr 7, 2026 11:00 AM", ip: "192.168.1.42" },
  { id: "9", user: "Robin Park", avatar: "R", action: "work_item_deleted", description: "Deleted TRK-456 'Legacy migration script'", target: "TRK-456", project: "Stori", timestamp: "Apr 6, 2026 03:45 PM", ip: "10.0.0.91" },
  { id: "10", user: "Hannes", avatar: "H", action: "project_created", description: "Created project Stori (TRK)", target: "Stori", project: "Stori", timestamp: "Apr 5, 2026 09:00 AM", ip: "192.168.1.42" },
  { id: "11", user: "Hannes", avatar: "H", action: "settings_changed", description: "Updated billing plan from Free to Team", target: "Billing", project: null, timestamp: "Apr 5, 2026 08:55 AM", ip: "192.168.1.42" },
  { id: "12", user: "Hannes", avatar: "H", action: "member_invited", description: "Invited sarah@example.com as Admin", target: "sarah@example.com", project: null, timestamp: "Apr 4, 2026 10:30 AM", ip: "192.168.1.42" },
  { id: "13", user: "Sarah Chen", avatar: "S", action: "member_invited", description: "Invited peter@example.com as Member", target: "peter@example.com", project: null, timestamp: "Apr 3, 2026 02:15 PM", ip: "10.0.0.55" },
  { id: "14", user: "Hannes", avatar: "H", action: "member_removed", description: "Removed jamie@example.com from organization", target: "jamie@example.com", project: null, timestamp: "Apr 2, 2026 09:20 AM", ip: "192.168.1.42" },
];

const allUsers = [...new Set(entries.map((e) => e.user))];
const allActionTypes: ActionType[] = [...new Set(entries.map((e) => e.action))];
const allProjects = [...new Set(entries.map((e) => e.project).filter(Boolean))] as string[];

export default function AuditPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [searchText, setSearchText] = useState("");
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<ActionType | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [userDropdown, setUserDropdown] = useState(false);
  const [actionDropdown, setActionDropdown] = useState(false);
  const [projectDropdown, setProjectDropdown] = useState(false);

  const filtered = entries.filter((e) => {
    if (searchText) {
      const q = searchText.toLowerCase();
      if (!e.description.toLowerCase().includes(q) && !e.user.toLowerCase().includes(q) && !e.target.toLowerCase().includes(q)) return false;
    }
    if (userFilter && e.user !== userFilter) return false;
    if (actionFilter && e.action !== actionFilter) return false;
    if (projectFilter && e.project !== projectFilter) return false;
    return true;
  });

  const hasFilters = searchText || userFilter || actionFilter || projectFilter;

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">Owner view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav variant={variant} activeTab="audit" />

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
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary hover:border-accent hover:text-accent text-sm rounded-md transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search audit log..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            {/* User filter */}
            <div className="relative">
              <button
                onClick={() => { setUserDropdown(!userDropdown); setActionDropdown(false); setProjectDropdown(false); }}
                className={`h-8 flex items-center gap-1.5 px-2.5 text-xs border rounded-md transition-colors ${
                  userFilter ? "border-accent/50 bg-accent/5 text-accent" : "border-border text-text-secondary hover:border-border"
                }`}
              >
                User{userFilter && `: ${userFilter}`}
                <ChevronDown className="w-3 h-3" />
              </button>
              {userDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-20 min-w-[150px]">
                  {allUsers.map((u) => (
                    <button key={u} onClick={() => { setUserFilter(userFilter === u ? null : u); setUserDropdown(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-content-bg transition-colors ${userFilter === u ? "text-accent font-medium" : "text-text-secondary"}`}>
                      {u}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action filter */}
            <div className="relative">
              <button
                onClick={() => { setActionDropdown(!actionDropdown); setUserDropdown(false); setProjectDropdown(false); }}
                className={`h-8 flex items-center gap-1.5 px-2.5 text-xs border rounded-md transition-colors ${
                  actionFilter ? "border-accent/50 bg-accent/5 text-accent" : "border-border text-text-secondary hover:border-border"
                }`}
              >
                Action{actionFilter && `: ${actionLabels[actionFilter].label}`}
                <ChevronDown className="w-3 h-3" />
              </button>
              {actionDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-20 min-w-[180px] max-h-60 overflow-auto">
                  {allActionTypes.map((a) => (
                    <button key={a} onClick={() => { setActionFilter(actionFilter === a ? null : a); setActionDropdown(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-content-bg transition-colors ${actionFilter === a ? "text-accent font-medium" : "text-text-secondary"}`}>
                      {actionLabels[a].label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Project filter */}
            <div className="relative">
              <button
                onClick={() => { setProjectDropdown(!projectDropdown); setUserDropdown(false); setActionDropdown(false); }}
                className={`h-8 flex items-center gap-1.5 px-2.5 text-xs border rounded-md transition-colors ${
                  projectFilter ? "border-accent/50 bg-accent/5 text-accent" : "border-border text-text-secondary hover:border-border"
                }`}
              >
                Project{projectFilter && `: ${projectFilter}`}
                <ChevronDown className="w-3 h-3" />
              </button>
              {projectDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-20 min-w-[130px]">
                  {allProjects.map((p) => (
                    <button key={p} onClick={() => { setProjectFilter(projectFilter === p ? null : p); setProjectDropdown(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-content-bg transition-colors ${projectFilter === p ? "text-accent font-medium" : "text-text-secondary"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasFilters && (
              <button
                onClick={() => { setSearchText(""); setUserFilter(null); setActionFilter(null); setProjectFilter(null); }}
                className="h-8 flex items-center gap-1 px-2 text-xs text-text-tertiary hover:text-text-secondary"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Audit entries */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border/50">
              {filtered.map((entry) => {
                const meta = actionLabels[entry.action];
                const Icon = meta.icon;
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-content-bg/30 transition-colors">
                    <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {entry.avatar}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">
                        <span className="font-medium">{entry.user}</span>{" "}
                        <span className="text-text-secondary">{entry.description}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${meta.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {meta.label}
                        </span>
                        {entry.project && (
                          <span className="text-[10px] text-text-tertiary bg-content-bg px-1.5 py-0.5 rounded border border-border">
                            {entry.project}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-text-tertiary">{entry.timestamp}</p>
                      <p className="text-[10px] text-text-tertiary/60 font-mono">{entry.ip}</p>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-text-tertiary">No matching audit entries.</p>
                </div>
              )}
            </div>
          </div>

          {/* Pagination hint */}
          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>Showing {filtered.length} of {entries.length} entries</span>
            <span>Audit logs are retained for 90 days on the Team plan</span>
          </div>
        </div>
      </div>
    </>
  );
}
