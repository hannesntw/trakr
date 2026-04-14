"use client";

import { useState } from "react";
import { Check, X, CreditCard, ExternalLink } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { useOrg } from "@/lib/use-org";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: { label: string; included: boolean }[];
  cta: string;
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
  },
];

export default function BillingPage() {
  const org = useOrg();
  const currentPlanId = org.plan || "team";
  const [changingPlan, setChangingPlan] = useState(false);

  async function changePlan(planId: string) {
    if (planId === currentPlanId) return;
    setChangingPlan(true);
    try {
      await fetch(`/api/orgs/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      // Reload to reflect new plan
      window.location.reload();
    } finally {
      setChangingPlan(false);
    }
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full capitalize">{org.role} view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          <OrgTabNav />

          {/* Plan comparison table */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Choose Your Plan</h2>
            <div className="bg-surface border border-border rounded-lg overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-4 text-left text-xs font-medium text-text-tertiary uppercase w-40">Feature</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className={`px-4 py-4 text-center min-w-[140px] ${plan.id === currentPlanId ? "bg-accent/5" : ""}`}>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-semibold text-text-primary">{plan.name}</span>
                          <div>
                            <span className="text-lg font-bold text-text-primary">{plan.price}</span>
                            {plan.period && <span className="text-xs text-text-tertiary ml-0.5">{plan.period}</span>}
                          </div>
                          {plan.id === currentPlanId && (
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
                          <td key={plan.id} className={`px-4 py-2.5 text-center ${plan.id === currentPlanId ? "bg-accent/5" : ""}`}>
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
                      <td key={plan.id} className={`px-4 py-4 text-center ${plan.id === currentPlanId ? "bg-accent/5" : ""}`}>
                        <button
                          onClick={() => changePlan(plan.id)}
                          disabled={plan.id === currentPlanId || changingPlan}
                          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                            plan.id === currentPlanId
                              ? "bg-content-bg text-text-tertiary cursor-default"
                              : plan.id === "enterprise"
                              ? "bg-accent hover:bg-accent-hover text-white"
                              : "border border-border text-text-secondary hover:border-accent hover:text-accent"
                          }`}
                        >
                          {plan.id === currentPlanId ? "Current plan" : plan.cta}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Billing details */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Billing Details</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary font-medium">Payment method</p>
                  <p className="text-xs text-text-tertiary">No payment method configured yet</p>
                </div>
                <button className="px-3 py-1.5 text-xs border border-border rounded-md text-text-secondary hover:border-accent hover:text-accent transition-colors">
                  Add payment method
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
