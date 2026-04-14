"use client";

import { useParams } from "next/navigation";
import { Users, FolderKanban, HardDrive, TrendingUp, BarChart3, Activity, FileText } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";

const sparklineData = [18, 20, 19, 22, 21, 24, 23, 24]; // active users per week

const storageByProject = [
  { name: "Trakr", storage: 1.8, color: "bg-accent" },
  { name: "Pictura", storage: 0.9, color: "bg-purple-500" },
  { name: "Infrastructure", storage: 0.3, color: "bg-emerald-500" },
  { name: "Design System", storage: 0.2, color: "bg-amber-500" },
];

const totalStorage = storageByProject.reduce((a, b) => a + b.storage, 0);

export default function OrgDashboardPage() {
  const params = useParams();
  const variant = params.variant as string;

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">Owner view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav variant={variant} activeTab="dashboard" />

          {/* Key metrics */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Overview</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: Users, label: "Active Members", value: "24", subtext: "of 50 seats", percent: 48 },
                { icon: FolderKanban, label: "Projects", value: "8", subtext: "Unlimited", percent: 0 },
                { icon: HardDrive, label: "Storage Used", value: "3.2 GB", subtext: "of 10 GB", percent: 32 },
                { icon: Activity, label: "API Calls", value: "12.4k", subtext: "this month", percent: 0 },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-text-tertiary" />
                    <span className="text-xs text-text-tertiary">{stat.label}</span>
                  </div>
                  <p className="text-xl font-semibold text-text-primary">{stat.value}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{stat.subtext}</p>
                  {stat.percent > 0 && (
                    <div className="mt-2 h-1.5 bg-content-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${stat.percent}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Active users sparkline */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-text-tertiary" />
              Active Users (last 8 weeks)
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-end gap-2 h-24">
                {sparklineData.map((val, i) => {
                  const maxVal = Math.max(...sparklineData);
                  const heightPct = (val / maxVal) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-text-tertiary">{val}</span>
                      <div
                        className="w-full bg-accent/80 rounded-t transition-all"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-text-tertiary">
                <span>8 weeks ago</span>
                <span>This week</span>
              </div>
            </div>
          </section>

          {/* Work items created + API calls */}
          <section>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-text-tertiary" />
                  <span className="text-sm font-semibold text-text-primary">Work Items This Week</span>
                </div>
                <div className="space-y-2">
                  {[
                    { project: "Trakr", count: 14, color: "bg-accent" },
                    { project: "Pictura", count: 8, color: "bg-purple-500" },
                    { project: "Infrastructure", count: 3, color: "bg-emerald-500" },
                    { project: "Design System", count: 2, color: "bg-amber-500" },
                  ].map((item) => (
                    <div key={item.project} className="flex items-center gap-3">
                      <span className="text-xs text-text-secondary w-24 shrink-0">{item.project}</span>
                      <div className="flex-1 h-4 bg-content-bg rounded overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded transition-all`}
                          style={{ width: `${(item.count / 14) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-primary font-medium w-6 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-tertiary mt-3">27 total work items created this week</p>
              </div>

              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-text-tertiary" />
                  <span className="text-sm font-semibold text-text-primary">API Calls This Month</span>
                </div>
                <p className="text-3xl font-bold text-text-primary mb-1">12,438</p>
                <p className="text-xs text-emerald-600 font-medium">+18% vs last month</p>
                <div className="mt-3 space-y-1.5">
                  {[
                    { label: "REST API", value: "8,241", pct: 66 },
                    { label: "MCP Server", value: "3,102", pct: 25 },
                    { label: "Webhooks", value: "1,095", pct: 9 },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2 text-xs">
                      <span className="text-text-secondary w-20">{row.label}</span>
                      <div className="flex-1 h-1.5 bg-content-bg rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${row.pct}%` }} />
                      </div>
                      <span className="text-text-tertiary w-12 text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Storage breakdown */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-text-tertiary" />
              Storage Breakdown
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4">
              {/* Stacked bar */}
              <div className="h-6 flex rounded overflow-hidden mb-4">
                {storageByProject.map((p) => (
                  <div
                    key={p.name}
                    className={`${p.color} transition-all`}
                    style={{ width: `${(p.storage / 10) * 100}%` }}
                    title={`${p.name}: ${p.storage} GB`}
                  />
                ))}
                <div className="flex-1 bg-content-bg" />
              </div>
              <div className="space-y-2">
                {storageByProject.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded ${p.color} shrink-0`} />
                    <span className="text-xs text-text-secondary flex-1">{p.name}</span>
                    <div className="w-48 h-2 bg-content-bg rounded-full overflow-hidden">
                      <div
                        className={`h-full ${p.color} rounded-full transition-all`}
                        style={{ width: `${(p.storage / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-primary font-medium w-16 text-right">{p.storage} GB</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-text-tertiary">
                <span>{totalStorage.toFixed(1)} GB used</span>
                <span>10 GB plan limit</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
