"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { id: "dashboard", label: "Dashboard", path: "" },
  { id: "members", label: "Members", path: "/members" },
  { id: "teams", label: "Teams", path: "/teams" },
  { id: "roles", label: "Roles", path: "/roles" },
  { id: "billing", label: "Plans & Billing", path: "/billing" },
  { id: "settings", label: "Settings", path: "/settings" },
];

export function OrgTabNav() {
  const pathname = usePathname();

  function getActiveTab() {
    // Match most specific first
    for (const tab of tabs) {
      if (tab.path && pathname === `/org${tab.path}`) return tab.id;
    }
    if (pathname === "/org") return "dashboard";
    return "dashboard";
  }

  const activeTab = getActiveTab();

  return (
    <nav className="flex gap-1 border-b border-border -mt-2 mb-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/org${tab.path}`}
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
