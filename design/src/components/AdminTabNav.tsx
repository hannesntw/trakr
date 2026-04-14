"use client";

import Link from "next/link";

const tabs = [
  { id: "dashboard", label: "Dashboard", path: "" },
  { id: "orgs", label: "Organizations", path: "/orgs" },
  { id: "users", label: "Users", path: "/users" },
  { id: "settings", label: "Settings", path: "/settings" },
];

export function AdminTabNav({ variant, activeTab }: { variant: string; activeTab: string }) {
  return (
    <nav className="flex gap-1 border-b border-border -mt-2 mb-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/${variant}/admin${tab.path}`}
          className={`px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
            tab.id === activeTab
              ? "border-amber-500 text-amber-600 font-medium"
              : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
