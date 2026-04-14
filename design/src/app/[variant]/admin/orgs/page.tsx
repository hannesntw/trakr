"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Search, Plus, ChevronDown, ChevronRight, MoreHorizontal,
  Building2, Users, FolderKanban, Shield, Ban, Trash2,
  UserCheck, CreditCard, ExternalLink, Clock,
} from "lucide-react";
import { AdminTabNav } from "@/components/AdminTabNav";
import { Pagination, paginate } from "@/components/Pagination";

/* ── types ── */

type Plan = "Free" | "Developer" | "Team" | "Enterprise";
type OrgStatus = "active" | "suspended" | "trial";

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  status: OrgStatus;
  members: number;
  projects: number;
  workItems: number;
  owner: string;
  ownerEmail: string;
  billingStatus: string;
  storageUsed: string;
  apiCalls30d: string;
  created: string;
  lastActive: string;
}

/* ── mock data ── */

const orgs: Org[] = [
  {
    id: "org_1", name: "Nexa Digital", slug: "nexa-digital", plan: "Enterprise", status: "active",
    members: 24, projects: 8, workItems: 847, owner: "Hannes Lehmann", ownerEmail: "hannes@nexa.com",
    billingStatus: "Active - next invoice Apr 28", storageUsed: "3.2 GB", apiCalls30d: "45.2k",
    created: "2025-08-12", lastActive: "2 min ago",
  },
  {
    id: "org_2", name: "ByteCraft", slug: "bytecraft", plan: "Team", status: "active",
    members: 12, projects: 4, workItems: 412, owner: "Marcus Wolf", ownerEmail: "m.wolf@bytecraft.io",
    billingStatus: "Active - next invoice May 1", storageUsed: "1.1 GB", apiCalls30d: "18.7k",
    created: "2025-11-03", lastActive: "15 min ago",
  },
  {
    id: "org_3", name: "Tekton Labs", slug: "tekton-labs", plan: "Team", status: "active",
    members: 8, projects: 3, workItems: 234, owner: "Priya Sharma", ownerEmail: "priya@tekton.dev",
    billingStatus: "Active - next invoice May 5", storageUsed: "0.8 GB", apiCalls30d: "9.4k",
    created: "2025-12-18", lastActive: "1 hour ago",
  },
  {
    id: "org_4", name: "CloudPeak", slug: "cloudpeak", plan: "Developer", status: "trial",
    members: 3, projects: 2, workItems: 89, owner: "James Okafor", ownerEmail: "james@cloudpeak.co",
    billingStatus: "Trial - 8 days remaining", storageUsed: "0.2 GB", apiCalls30d: "2.1k",
    created: "2026-03-20", lastActive: "3 hours ago",
  },
  {
    id: "org_5", name: "NordStack", slug: "nordstack", plan: "Free", status: "active",
    members: 2, projects: 1, workItems: 45, owner: "Lena Bergstrom", ownerEmail: "lena@nordstack.se",
    billingStatus: "Free plan", storageUsed: "0.1 GB", apiCalls30d: "1.2k",
    created: "2026-01-14", lastActive: "1 day ago",
  },
  {
    id: "org_6", name: "DevHarbor", slug: "devharbor", plan: "Developer", status: "active",
    members: 5, projects: 2, workItems: 156, owner: "Tom Martinez", ownerEmail: "tom@devharbor.com",
    billingStatus: "Active - next invoice May 12", storageUsed: "0.4 GB", apiCalls30d: "5.8k",
    created: "2025-10-07", lastActive: "30 min ago",
  },
  {
    id: "org_7", name: "Kaizen Corp", slug: "kaizen-corp", plan: "Enterprise", status: "active",
    members: 18, projects: 6, workItems: 523, owner: "Ayumi Tanaka", ownerEmail: "ayumi@kaizen.jp",
    billingStatus: "Active - annual plan, renews Sep 1", storageUsed: "2.6 GB", apiCalls30d: "32.1k",
    created: "2025-09-01", lastActive: "5 min ago",
  },
  {
    id: "org_8", name: "VoltLabs", slug: "voltlabs", plan: "Team", status: "suspended",
    members: 6, projects: 2, workItems: 178, owner: "Nina Petrova", ownerEmail: "nina@voltlabs.eu",
    billingStatus: "Suspended - payment failed", storageUsed: "0.5 GB", apiCalls30d: "0",
    created: "2025-11-22", lastActive: "12 days ago",
  },
];

const planColors: Record<Plan, string> = {
  Free: "bg-gray-100 text-gray-700",
  Developer: "bg-blue-100 text-blue-700",
  Team: "bg-purple-100 text-purple-700",
  Enterprise: "bg-amber-100 text-amber-800",
};

const statusColors: Record<OrgStatus, string> = {
  active: "bg-emerald-500",
  trial: "bg-blue-500",
  suspended: "bg-red-500",
};

export default function AdminOrgsPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<Plan | "all">("all");
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [actionMenuOrg, setActionMenuOrg] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = orgs.filter((org) => {
    if (planFilter !== "all" && org.plan !== planFilter) return false;
    if (search && !org.name.toLowerCase().includes(search.toLowerCase()) && !org.slug.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const paginatedOrgs = paginate(filtered, currentPage, pageSize);

  return (
    <>
      <header className="bg-amber-950 text-amber-100 shrink-0">
        <div className="h-8 px-6 flex items-center gap-2 text-xs">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-amber-400">Platform Administration</span>
          <span className="text-amber-300/60 mx-1">/</span>
          <span className="text-amber-300/80">Organizations</span>
        </div>
      </header>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organizations</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-200">Super Admin</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <AdminTabNav variant={variant} activeTab="orgs" />

          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary outline-none focus:border-accent"
              />
            </div>
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value as Plan | "all"); setCurrentPage(1); }}
              className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary outline-none focus:border-accent"
            >
              <option value="all">All plans</option>
              <option value="Free">Free</option>
              <option value="Developer">Developer</option>
              <option value="Team">Team</option>
              <option value="Enterprise">Enterprise</option>
            </select>
            <div className="flex-1" />
            <span className="text-xs text-text-tertiary">{filtered.length} organizations</span>
            <button className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              Create organization
            </button>
          </div>

          {/* Table */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-content-bg/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary w-8"></th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Organization</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Plan</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary">Members</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary">Projects</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary">Last Active</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedOrgs.map((org) => (
                  <>
                    <tr
                      key={org.id}
                      className="hover:bg-content-bg/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                    >
                      <td className="px-4 py-3">
                        <ChevronRight className={`w-3.5 h-3.5 text-text-tertiary transition-transform ${expandedOrg === org.id ? "rotate-90" : ""}`} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${statusColors[org.status]}`} />
                          <span className="font-medium text-text-primary">{org.name}</span>
                          <span className="text-text-tertiary text-xs">/{org.slug}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${planColors[org.plan]}`}>
                          {org.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">{org.members}</td>
                      <td className="px-4 py-3 text-right text-text-secondary">{org.projects}</td>
                      <td className="px-4 py-3 text-text-secondary">{org.created}</td>
                      <td className="px-4 py-3 text-text-secondary">{org.lastActive}</td>
                      <td className="px-4 py-3 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOrg(actionMenuOrg === org.id ? null : org.id);
                          }}
                          className="p-1 rounded hover:bg-content-bg transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4 text-text-tertiary" />
                        </button>
                        {actionMenuOrg === org.id && (
                          <div className="absolute right-4 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 py-1 w-48">
                            <button className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors">
                              <CreditCard className="w-3.5 h-3.5 text-text-tertiary" />
                              Change plan
                            </button>
                            <button className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors">
                              <UserCheck className="w-3.5 h-3.5 text-text-tertiary" />
                              Impersonate owner
                            </button>
                            <button className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors text-amber-600">
                              <Ban className="w-3.5 h-3.5" />
                              {org.status === "suspended" ? "Unsuspend org" : "Suspend org"}
                            </button>
                            <div className="border-t border-border my-1" />
                            <button className="w-full text-left px-3 py-2 text-xs hover:bg-content-bg flex items-center gap-2 transition-colors text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete org
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedOrg === org.id && (
                      <tr key={`${org.id}-detail`} className="bg-content-bg/40">
                        <td colSpan={8} className="px-8 py-4">
                          <div className="grid grid-cols-3 gap-6 text-xs">
                            <div className="space-y-2">
                              <p className="font-medium text-text-primary">Owner</p>
                              <p className="text-text-secondary">{org.owner}</p>
                              <p className="text-text-tertiary">{org.ownerEmail}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="font-medium text-text-primary">Billing</p>
                              <p className="text-text-secondary">{org.billingStatus}</p>
                              <p className="text-text-tertiary">Storage: {org.storageUsed}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="font-medium text-text-primary">Usage</p>
                              <p className="text-text-secondary">{org.workItems} work items</p>
                              <p className="text-text-tertiary">{org.apiCalls30d} API calls (30d)</p>
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
              noun="organizations"
            />
          </div>
        </div>
      </div>
    </>
  );
}
