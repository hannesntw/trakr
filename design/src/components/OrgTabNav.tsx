"use client";

import Link from "next/link";

const tabs = [
  { id: "dashboard", label: "Dashboard", path: "" },
  { id: "members", label: "Members", path: "/members" },
  { id: "teams", label: "Teams", path: "/teams" },
  { id: "roles", label: "Roles", path: "/roles" },
  { id: "billing", label: "Plans & Billing", path: "/billing" },
  { id: "audit", label: "Audit Log", path: "/audit" },
  { id: "security", label: "Security", path: "/security" },
  { id: "settings", label: "Settings", path: "/settings" },
];

export function OrgTabNav({ variant, activeTab }: { variant: string; activeTab: string }) {
  return (
    <nav className="flex gap-1 border-b border-border -mt-2 mb-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/${variant}/org${tab.path}`}
          className={`px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
            tab.id === activeTab
              ? "border-accent text-accent font-medium"
              : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
