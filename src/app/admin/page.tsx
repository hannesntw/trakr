"use client";

import { useEffect, useState } from "react";
import {
  Building2, Users, FolderKanban, FileText, Zap,
  AlertTriangle, Shield, Server,
  Activity, Database, HardDrive,
} from "lucide-react";
import { AdminTabNav } from "@/components/AdminTabNav";

interface DashboardData {
  totalOrgs: number;
  totalUsers: number;
  totalProjects: number;
  totalWorkItems: number;
  apiCalls24h: number;
  recentSignups: { id: string; name: string | null; email: string | null; image: string | null }[];
  systemHealth: {
    status: string;
    apiResponseMs: number;
    dbConnections: string;
    storageUsed: string;
    errorRate: string;
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="bg-amber-950 text-amber-100 shrink-0">
        <div className="h-8 px-6 flex items-center gap-2 text-xs">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-amber-400">Platform Administration</span>
          <span className="text-amber-300/60 mx-1">/</span>
          <span className="text-amber-300/80">Super-admin access for platform owner</span>
        </div>
      </header>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Admin Dashboard</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-200">Super Admin</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          <AdminTabNav activeTab="dashboard" />

          {loading ? (
            <div className="text-sm text-text-tertiary">Loading...</div>
          ) : data ? (
            <>
              <section>
                <h2 className="text-sm font-semibold text-text-primary mb-4">Platform Overview</h2>
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { icon: Building2, label: "Organizations", value: String(data.totalOrgs) },
                    { icon: Users, label: "Total Users", value: String(data.totalUsers) },
                    { icon: FolderKanban, label: "Projects", value: String(data.totalProjects) },
                    { icon: FileText, label: "Work Items", value: String(data.totalWorkItems) },
                    { icon: Zap, label: "API Calls (24h)", value: data.apiCalls24h ? `${(data.apiCalls24h / 1000).toFixed(1)}k` : "N/A" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon className="w-4 h-4 text-text-tertiary" />
                        <span className="text-xs text-text-tertiary">{stat.label}</span>
                      </div>
                      <p className="text-xl font-semibold text-text-primary">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-2 gap-6">
                <section>
                  <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-text-tertiary" />
                    Recent Sign-ups
                  </h2>
                  <div className="bg-surface border border-border rounded-lg divide-y divide-border">
                    {data.recentSignups.length === 0 ? (
                      <div className="px-4 py-6 text-xs text-text-tertiary text-center">No users yet</div>
                    ) : (
                      data.recentSignups.map((user) => (
                        <div key={user.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-content-bg/50 transition-colors">
                          <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                            {(user.name ?? user.email ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-primary truncate">{user.name ?? "Unnamed"}</p>
                            <p className="text-[10px] text-text-tertiary truncate">{user.email}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4 text-text-tertiary" />
                    System Health
                  </h2>
                  <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
                    {[
                      { icon: Activity, label: "API Response Time", value: `${data.systemHealth.apiResponseMs}ms`, status: "healthy" as const },
                      { icon: Database, label: "DB Connections", value: data.systemHealth.dbConnections, status: "healthy" as const },
                      { icon: HardDrive, label: "Storage Used", value: data.systemHealth.storageUsed, status: "healthy" as const },
                      { icon: AlertTriangle, label: "Error Rate (1h)", value: data.systemHealth.errorRate, status: "warning" as const },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 text-text-tertiary shrink-0" />
                        <span className="text-xs text-text-secondary flex-1">{item.label}</span>
                        <span className="text-xs font-medium text-text-primary">{item.value}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          item.status === "healthy" ? "bg-emerald-500" : "bg-amber-500"
                        }`} />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="text-sm text-red-500">Failed to load dashboard data</div>
          )}
        </div>
      </div>
    </>
  );
}
