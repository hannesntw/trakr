"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Building2, Users, FolderKanban, HardDrive, CreditCard, ExternalLink, Upload, Check } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["Up to 5 members", "3 projects", "Basic workflow", "1 GB storage"],
    cta: "Current plan",
    current: false,
  },
  {
    id: "team",
    name: "Team",
    price: "$12",
    period: "per user/month",
    features: ["Up to 50 members", "Unlimited projects", "Custom workflows", "10 GB storage", "Priority support"],
    cta: "Current plan",
    current: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$39",
    period: "per user/month",
    features: ["Unlimited members", "Unlimited projects", "SSO/SAML", "Audit log", "Custom roles", "100 GB storage", "Dedicated support", "99.9% SLA"],
    cta: "Upgrade",
    current: false,
  },
];

export default function OrgPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [orgName, setOrgName] = useState("ThoughtWorks");
  const [orgSlug, setOrgSlug] = useState("thoughtworks");
  const [logoUploaded, setLogoUploaded] = useState(false);

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization Settings</h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {/* Sub-nav */}
          <nav className="flex gap-1 border-b border-border -mt-2 mb-2">
            {[
              { href: `/${variant}/org`, label: "Overview", active: true },
              { href: `/${variant}/org/members`, label: "Members" },
              { href: `/${variant}/org/teams`, label: "Teams" },
              { href: `/${variant}/org/roles`, label: "Roles & Permissions" },
              { href: `/${variant}/org/audit`, label: "Audit Log" },
              { href: `/${variant}/org/security`, label: "Security" },
            ].map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                  tab.active
                    ? "border-accent text-accent font-medium"
                    : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Organization identity */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Organization</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => setLogoUploaded(true)}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-accent flex items-center justify-center transition-colors shrink-0"
                >
                  {logoUploaded ? (
                    <span className="w-full h-full rounded-lg bg-accent/10 text-accent text-xl font-bold flex items-center justify-center">
                      TW
                    </span>
                  ) : (
                    <Upload className="w-5 h-5 text-text-tertiary" />
                  )}
                </button>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs text-text-tertiary block mb-1">Organization Name</label>
                    <input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-tertiary block mb-1">URL Slug</label>
                    <div className="flex items-center gap-0">
                      <span className="px-3 py-1.5 text-sm bg-content-bg border border-r-0 border-border rounded-l-md text-text-tertiary">
                        https://
                      </span>
                      <input
                        value={orgSlug}
                        onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="flex-1 px-3 py-1.5 text-sm border border-border bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono"
                      />
                      <span className="px-3 py-1.5 text-sm bg-content-bg border border-l-0 border-border rounded-r-md text-text-tertiary">
                        .trakr.app
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </section>

          {/* Usage stats */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Usage</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Users, label: "Members", value: "24", limit: "50", percent: 48 },
                { icon: FolderKanban, label: "Projects", value: "8", limit: "Unlimited", percent: 0 },
                { icon: HardDrive, label: "Storage", value: "3.2 GB", limit: "10 GB", percent: 32 },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-text-tertiary" />
                    <span className="text-xs text-text-tertiary">{stat.label}</span>
                  </div>
                  <p className="text-xl font-semibold text-text-primary">{stat.value}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">of {stat.limit}</p>
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

          {/* Billing plans */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Billing Plan</h2>
            <div className="grid grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-surface border rounded-lg p-4 ${
                    plan.current ? "border-accent ring-1 ring-accent/20" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-text-primary">{plan.name}</h3>
                    {plan.current && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-text-primary">
                    {plan.price}
                    <span className="text-xs font-normal text-text-tertiary ml-1">{plan.period}</span>
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full mt-4 px-3 py-1.5 text-sm rounded-md transition-colors ${
                      plan.current
                        ? "bg-content-bg text-text-tertiary cursor-default"
                        : plan.id === "enterprise"
                        ? "bg-accent hover:bg-accent-hover text-white"
                        : "border border-border text-text-secondary hover:border-accent hover:text-accent"
                    }`}
                  >
                    {plan.current ? "Current plan" : plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Billing details */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Billing Details</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary font-medium">Next invoice</p>
                  <p className="text-xs text-text-tertiary">May 1, 2026 &mdash; $288.00 (24 seats x $12)</p>
                </div>
                <button className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                  View invoices <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="border-t border-border pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-text-tertiary" />
                  <div>
                    <p className="text-sm text-text-primary">Visa ending in 4242</p>
                    <p className="text-xs text-text-tertiary">Expires 08/2028</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-xs border border-border rounded-md text-text-secondary hover:border-accent hover:text-accent transition-colors">
                  Update payment method
                </button>
              </div>
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <h2 className="text-sm font-semibold text-red-500 mb-4">Danger Zone</h2>
            <div className="bg-surface border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Delete organization</p>
                  <p className="text-xs text-text-tertiary">Permanently delete this organization, all projects, and all data. This cannot be undone.</p>
                </div>
                <button className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
