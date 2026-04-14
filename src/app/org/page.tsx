"use client";

import { useEffect, useState } from "react";
import { Users, FolderKanban, HardDrive, Activity } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { useOrg } from "@/lib/use-org";

interface OrgMetrics {
  memberCount: number;
  projectCount: number;
}

export default function OrgDashboardPage() {
  const org = useOrg();
  const [metrics, setMetrics] = useState<OrgMetrics | null>(null);

  useEffect(() => {
    if (!org.id) return;

    // Fetch member count and project count in parallel
    Promise.all([
      fetch(`/api/orgs/${org.id}/members?page=1&pageSize=1`)
        .then((r) => r.json())
        .then((data) => data.total ?? 0)
        .catch(() => 0),
      fetch("/api/projects")
        .then((r) => r.json())
        .then((data: { orgId?: number | null }[]) =>
          data.filter((p) => p.orgId === org.id).length
        )
        .catch(() => 0),
    ]).then(([memberCount, projectCount]) => {
      setMetrics({ memberCount, projectCount });
    });
  }, [org.id]);

  function getPlanLimit(metric: string): string {
    const plan = org.plan;
    if (metric === "members") {
      if (plan === "free" || plan === "developer") return "of 1 seat";
      return "Unlimited";
    }
    if (metric === "storage") {
      if (plan === "free") return "of 100 MB";
      if (plan === "developer") return "of 1 GB";
      if (plan === "team") return "of 10 GB";
      return "Unlimited";
    }
    return "";
  }

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
                {
                  icon: Users,
                  label: "Active Members",
                  value: metrics ? String(metrics.memberCount) : "--",
                  subtext: getPlanLimit("members"),
                },
                {
                  icon: FolderKanban,
                  label: "Projects",
                  value: metrics ? String(metrics.projectCount) : "--",
                  subtext: "Unlimited",
                },
                {
                  icon: HardDrive,
                  label: "Storage Used",
                  value: "--",
                  subtext: getPlanLimit("storage"),
                },
                {
                  icon: Activity,
                  label: "API Calls",
                  value: "--",
                  subtext: "this month",
                },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-text-tertiary" />
                    <span className="text-xs text-text-tertiary">{stat.label}</span>
                  </div>
                  <p className="text-xl font-semibold text-text-primary">{stat.value}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{stat.subtext}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Plan info card */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Plan Information</h2>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary capitalize">{org.plan} Plan</p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {org.plan === "free"
                      ? "1 member, 1 project, 100 MB storage"
                      : org.plan === "developer"
                      ? "1 member, unlimited projects, 1 GB storage, GitHub integration"
                      : org.plan === "team"
                      ? "Unlimited members, projects, 10 GB storage, teams, RBAC"
                      : "Unlimited everything, SSO, audit log, custom roles"}
                  </p>
                </div>
                {org.plan !== "enterprise" && org.role === "owner" && (
                  <a
                    href="/org/billing"
                    className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
                  >
                    Upgrade
                  </a>
                )}
              </div>
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
