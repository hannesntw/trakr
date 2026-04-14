"use client";

import { useEffect, useState } from "react";
import { Users, FolderKanban, HardDrive, Activity } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { useOrg } from "@/lib/use-org";

export default function OrgDashboardPage() {
  const org = useOrg();
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    if (!org.id) return;
    fetch(`/api/orgs/${org.id}/members?page=1&pageSize=1`)
      .then((r) => r.json())
      .then((data) => setMemberCount(data.total ?? 0))
      .catch(() => {});
  }, [org.id]);

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full capitalize">{org.role} view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav />

          {/* Key metrics */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Overview</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: Users, label: "Active Members", value: memberCount !== null ? String(memberCount) : "--", subtext: org.plan === "free" ? "of 1 seat" : org.plan === "developer" ? "of 1 seat" : "Unlimited", percent: 0 },
                { icon: FolderKanban, label: "Projects", value: "--", subtext: "Unlimited", percent: 0 },
                { icon: HardDrive, label: "Storage Used", value: "--", subtext: org.plan === "team" ? "of 10 GB" : org.plan === "free" ? "of 100 MB" : "Unlimited", percent: 0 },
                { icon: Activity, label: "API Calls", value: "--", subtext: "this month", percent: 0 },
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

          {/* Org info card */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Organization Details</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-tertiary">Name</p>
                  <p className="text-sm text-text-primary font-medium mt-0.5">{org.name}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Slug</p>
                  <p className="text-sm text-text-primary font-mono mt-0.5">{org.slug}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Plan</p>
                  <p className="text-sm text-text-primary font-medium mt-0.5 capitalize">{org.plan}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Your Role</p>
                  <p className="text-sm text-text-primary font-medium mt-0.5 capitalize">{org.role}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
