"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Building2, Users, FolderKanban, FileText, Zap,
  TrendingUp, AlertTriangle, Clock, Server, Database,
  HardDrive, Activity, ChevronRight, Shield,
} from "lucide-react";
import { AdminTabNav } from "@/components/AdminTabNav";

/* ── mock data ── */

const activeUsersData = [
  42, 45, 48, 44, 50, 53, 49, 55, 52, 58,
  60, 57, 62, 59, 64, 61, 66, 63, 68, 65,
  70, 67, 72, 69, 74, 71, 76, 73, 78, 75,
]; // last 30 days

const recentSignups = [
  { name: "Sarah Chen", email: "sarah@nexadigital.com", org: "Nexa Digital", when: "2 hours ago" },
  { name: "Marcus Wolf", email: "m.wolf@bytecraft.io", org: "ByteCraft", when: "5 hours ago" },
  { name: "Priya Sharma", email: "priya@tekton.dev", org: "Tekton Labs", when: "8 hours ago" },
  { name: "James Okafor", email: "james@cloudpeak.co", org: "CloudPeak", when: "1 day ago" },
  { name: "Lena Bergstrom", email: "lena@nordstack.se", org: "NordStack", when: "1 day ago" },
  { name: "Tom Martinez", email: "tom@devharbor.com", org: "DevHarbor", when: "2 days ago" },
  { name: "Ayumi Tanaka", email: "ayumi@kaizen.jp", org: "Kaizen Corp", when: "2 days ago" },
  { name: "David Kim", email: "david@flowstate.io", org: "FlowState", when: "3 days ago" },
  { name: "Nina Petrova", email: "nina@voltlabs.eu", org: "VoltLabs", when: "3 days ago" },
  { name: "Carlos Ruiz", email: "carlos@agilestack.mx", org: "AgileStack", when: "4 days ago" },
];

const recentErrors = [
  { code: "500", message: "Internal server error in /api/work-items/bulk", count: 3, when: "12 min ago", org: "ByteCraft" },
  { code: "429", message: "Rate limit exceeded for TraQL endpoint", count: 18, when: "28 min ago", org: "Nexa Digital" },
  { code: "503", message: "Database connection pool exhausted", count: 1, when: "1 hour ago", org: "System" },
  { code: "400", message: "Invalid webhook payload from GitHub", count: 7, when: "2 hours ago", org: "Tekton Labs" },
  { code: "500", message: "Timeout in sprint velocity calculation", count: 2, when: "3 hours ago", org: "CloudPeak" },
];

export default function AdminDashboardPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  return (
    <>
      {/* Admin header with amber banner */}
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
          <AdminTabNav variant={variant} activeTab="dashboard" />

          {/* Platform stats */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Platform Overview</h2>
            <div className="grid grid-cols-5 gap-4">
              {[
                { icon: Building2, label: "Organizations", value: "7", trend: "+2 this month" },
                { icon: Users, label: "Total Users", value: "78", trend: "+12 this month" },
                { icon: FolderKanban, label: "Projects", value: "23", trend: "across all orgs" },
                { icon: FileText, label: "Work Items", value: "1,847", trend: "+342 this week" },
                { icon: Zap, label: "API Calls (24h)", value: "34.2k", trend: "avg 142/min" },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-text-tertiary" />
                    <span className="text-xs text-text-tertiary">{stat.label}</span>
                  </div>
                  <p className="text-xl font-semibold text-text-primary">{stat.value}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{stat.trend}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Active users graph */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-text-tertiary" />
              Active Users (last 30 days)
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-end gap-[3px] h-32">
                {activeUsersData.map((val, i) => {
                  const maxVal = Math.max(...activeUsersData);
                  const heightPct = (val / maxVal) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center relative"
                      onMouseEnter={() => setHoveredDay(i)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      {hoveredDay === i && (
                        <div className="absolute -top-6 bg-text-primary text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                          {val} users
                        </div>
                      )}
                      <div
                        className={`w-full rounded-t transition-all cursor-default ${
                          hoveredDay === i ? "bg-accent" : "bg-accent/60"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-text-tertiary">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-6">
            {/* Recent sign-ups */}
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-text-tertiary" />
                Recent Sign-ups
              </h2>
              <div className="bg-surface border border-border rounded-lg divide-y divide-border">
                {recentSignups.map((user) => (
                  <div key={user.email} className="px-4 py-2.5 flex items-center gap-3 hover:bg-content-bg/50 transition-colors">
                    <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{user.name}</p>
                      <p className="text-[10px] text-text-tertiary truncate">{user.email}</p>
                    </div>
                    <span className="text-[10px] text-text-tertiary shrink-0">{user.org}</span>
                    <span className="text-[10px] text-text-tertiary shrink-0 w-16 text-right">{user.when}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* System health + recent errors */}
            <div className="space-y-6">
              <section>
                <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Server className="w-4 h-4 text-text-tertiary" />
                  System Health
                </h2>
                <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
                  {[
                    { icon: Activity, label: "API Response Time", value: "48ms", status: "healthy" as const },
                    { icon: Database, label: "DB Connections", value: "12 / 100", status: "healthy" as const },
                    { icon: HardDrive, label: "Storage Used", value: "8.4 GB / 50 GB", status: "healthy" as const },
                    { icon: AlertTriangle, label: "Error Rate (1h)", value: "0.12%", status: "warning" as const },
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

              <section>
                <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-text-tertiary" />
                  Recent Errors
                </h2>
                <div className="bg-surface border border-border rounded-lg divide-y divide-border">
                  {recentErrors.map((err, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-content-bg/50 transition-colors cursor-pointer">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        err.code === "500" || err.code === "503"
                          ? "bg-red-100 text-red-700"
                          : err.code === "429"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {err.code}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary truncate">{err.message}</p>
                        <p className="text-[10px] text-text-tertiary">{err.org} &middot; {err.when}</p>
                      </div>
                      <span className="text-[10px] text-text-tertiary shrink-0">x{err.count}</span>
                      <ChevronRight className="w-3 h-3 text-text-tertiary shrink-0" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
