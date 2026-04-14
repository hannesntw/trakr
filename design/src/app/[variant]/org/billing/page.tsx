"use client";

import { useParams } from "next/navigation";
import { Check, X, CreditCard, ExternalLink } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: { label: string; included: boolean }[];
  cta: string;
  current: boolean;
  highlight?: boolean;
}

const planFeatures = [
  "Members",
  "Projects",
  "Storage",
  "GitHub integration",
  "Teams & RBAC",
  "SSO / SAML",
  "Audit log",
  "IP allowlist",
  "Custom roles",
  "Dedicated support",
];

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      { label: "1 member", included: true },
      { label: "1 project", included: true },
      { label: "100 MB", included: true },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
    ],
    cta: "Downgrade",
    current: false,
  },
  {
    id: "developer",
    name: "Developer",
    price: "$9",
    period: "/month",
    features: [
      { label: "1 member", included: true },
      { label: "Unlimited", included: true },
      { label: "1 GB", included: true },
      { label: "Yes", included: true },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
    ],
    cta: "Downgrade",
    current: false,
  },
  {
    id: "team",
    name: "Team",
    price: "$15",
    period: "/user/month",
    features: [
      { label: "Unlimited", included: true },
      { label: "Unlimited", included: true },
      { label: "10 GB", included: true },
      { label: "Yes", included: true },
      { label: "Yes", included: true },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
      { label: "", included: false },
    ],
    cta: "Current plan",
    current: true,
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      { label: "Unlimited", included: true },
      { label: "Unlimited", included: true },
      { label: "Unlimited", included: true },
      { label: "Yes", included: true },
      { label: "Yes", included: true },
      { label: "Yes", included: true },
      { label: "Yes", included: true },
      { label: "Yes", included: true },
      { label: "Yes", included: true },
      { label: "Yes", included: true },
    ],
    cta: "Contact Sales",
    current: false,
  },
];

export default function BillingPage() {
  const params = useParams();
  const variant = params.variant as string;

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">Owner view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          <OrgTabNav variant={variant} activeTab="billing" />

          {/* Plan comparison table */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Choose Your Plan</h2>
            <div className="bg-surface border border-border rounded-lg overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-4 text-left text-xs font-medium text-text-tertiary uppercase w-40">Feature</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className={`px-4 py-4 text-center min-w-[140px] ${plan.current ? "bg-accent/5" : ""}`}>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-semibold text-text-primary">{plan.name}</span>
                          <div>
                            <span className="text-lg font-bold text-text-primary">{plan.price}</span>
                            {plan.period && <span className="text-xs text-text-tertiary ml-0.5">{plan.period}</span>}
                          </div>
                          {plan.current && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {planFeatures.map((feature, fi) => (
                    <tr key={feature} className="border-b border-border/30">
                      <td className="px-4 py-2.5 text-xs text-text-secondary">{feature}</td>
                      {plans.map((plan) => {
                        const f = plan.features[fi];
                        return (
                          <td key={plan.id} className={`px-4 py-2.5 text-center ${plan.current ? "bg-accent/5" : ""}`}>
                            {f.included ? (
                              f.label ? (
                                <span className="text-xs text-text-primary font-medium">{f.label}</span>
                              ) : (
                                <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                              )
                            ) : (
                              <X className="w-4 h-4 text-text-tertiary/30 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-4" />
                    {plans.map((plan) => (
                      <td key={plan.id} className={`px-4 py-4 text-center ${plan.current ? "bg-accent/5" : ""}`}>
                        <button
                          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                            plan.current
                              ? "bg-content-bg text-text-tertiary cursor-default"
                              : plan.id === "enterprise"
                              ? "bg-accent hover:bg-accent-hover text-white"
                              : "border border-border text-text-secondary hover:border-accent hover:text-accent"
                          }`}
                        >
                          {plan.cta}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Usage vs limits */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Usage vs Plan Limits</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              {[
                { label: "Members", used: "24", limit: "Unlimited", pct: 0 },
                { label: "Projects", used: "8", limit: "Unlimited", pct: 0 },
                { label: "Storage", used: "3.2 GB", limit: "10 GB", pct: 32 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-secondary">{item.label}</span>
                    <span className="text-xs text-text-primary font-medium">{item.used} <span className="text-text-tertiary">/ {item.limit}</span></span>
                  </div>
                  {item.pct > 0 && (
                    <div className="h-1.5 bg-content-bg rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                  )}
                  {item.pct === 0 && (
                    <div className="h-1.5 bg-content-bg rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: "8%" }} />
                    </div>
                  )}
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
                  <p className="text-xs text-text-tertiary">May 1, 2026 &mdash; $360.00 (24 seats x $15)</p>
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
        </div>
      </div>
    </>
  );
}
