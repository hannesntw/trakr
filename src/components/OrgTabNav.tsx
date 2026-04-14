"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrg } from "@/lib/use-org";

interface Tab {
  id: string;
  label: string;
  path: string;
  /** Minimum role required to see this tab */
  minRole?: "owner" | "admin" | "member";
}

const tabs: Tab[] = [
  { id: "dashboard", label: "Dashboard", path: "" },
  { id: "members", label: "Members", path: "/members" },
  { id: "teams", label: "Teams", path: "/teams" },
  { id: "roles", label: "Roles", path: "/roles" },
  { id: "billing", label: "Plans & Billing", path: "/billing", minRole: "owner" },
  { id: "settings", label: "Settings", path: "/settings", minRole: "owner" },
];

const ROLE_LEVEL: Record<string, number> = {
  guest: 0,
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

export function OrgTabNav() {
  const pathname = usePathname();
  const org = useOrg();

  const userLevel = ROLE_LEVEL[org.role] ?? 0;

  function getActiveTab() {
    // Match most specific first
    for (const tab of tabs) {
      if (tab.path && pathname === `/org${tab.path}`) return tab.id;
    }
    if (pathname === "/org") return "dashboard";
    return "dashboard";
  }

  const activeTab = getActiveTab();

  const visibleTabs = tabs.filter((tab) => {
    if (!tab.minRole) return true;
    return userLevel >= (ROLE_LEVEL[tab.minRole] ?? 0);
  });

  return (
    <nav className="flex gap-1 border-b border-border -mt-2 mb-2">
      {visibleTabs.map((tab) => (
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
