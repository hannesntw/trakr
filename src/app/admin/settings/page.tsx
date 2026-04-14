"use client";

import { useEffect, useState } from "react";
import {
  Shield, ToggleLeft, ToggleRight, AlertTriangle,
  Mail, Gauge, Globe, Server,
} from "lucide-react";
import { AdminTabNav } from "@/components/AdminTabNav";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: "integration" | "platform" | "experimental";
}

const defaultFlags: FeatureFlag[] = [
  { id: "github", name: "GitHub Integration", description: "Connect repos, show CI status on work items", enabled: true, category: "integration" },
  { id: "traql_v2", name: "TraQL v2 Engine", description: "New query parser with subqueries and aggregations", enabled: true, category: "platform" },
  { id: "scim", name: "SCIM Provisioning", description: "Automatic user provisioning via SCIM 2.0", enabled: false, category: "integration" },
  { id: "swimlanes", name: "Board Swimlanes", description: "Group board columns by assignee or priority", enabled: true, category: "platform" },
  { id: "ai_assist", name: "AI Writing Assistant", description: "AI-powered description generation", enabled: false, category: "experimental" },
  { id: "api_v2", name: "API v2 Preview", description: "New REST API with batch operations", enabled: false, category: "experimental" },
];

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState(defaultFlags);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("Trakr is currently undergoing scheduled maintenance.");
  const [openSignup, setOpenSignup] = useState(true);
  const [allowedDomains, setAllowedDomains] = useState("");
  const [apiRateLimit, setApiRateLimit] = useState("1000");
  const [traqlLimit, setTraqlLimit] = useState("100");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((settings) => {
        if (settings.feature_flags) {
          try {
            const saved = JSON.parse(settings.feature_flags);
            setFlags((prev) => prev.map((f) => ({ ...f, enabled: saved[f.id] !== undefined ? saved[f.id] : f.enabled })));
          } catch { /* ignore */ }
        }
        if (settings.maintenance_mode) setMaintenanceMode(settings.maintenance_mode === "true");
        if (settings.maintenance_message) setMaintenanceMessage(settings.maintenance_message);
        if (settings.open_signup) setOpenSignup(settings.open_signup !== "false");
        if (settings.api_rate_limit) setApiRateLimit(settings.api_rate_limit);
        if (settings.traql_limit) setTraqlLimit(settings.traql_limit);
      })
      .catch(() => {});
  }, []);

  async function saveSetting(key: string, value: string) {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  function toggleFlag(id: string) {
    setFlags((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f));
      const flagMap: Record<string, boolean> = {};
      updated.forEach((f) => { flagMap[f.id] = f.enabled; });
      saveSetting("feature_flags", JSON.stringify(flagMap));
      return updated;
    });
  }

  const categories = [
    { key: "platform" as const, label: "Platform" },
    { key: "integration" as const, label: "Integrations" },
    { key: "experimental" as const, label: "Experimental" },
  ];

  return (
    <>
      <header className="bg-amber-950 text-amber-100 shrink-0">
        <div className="h-8 px-6 flex items-center gap-2 text-xs">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-amber-400">Platform Administration</span>
          <span className="text-amber-300/60 mx-1">/</span>
          <span className="text-amber-300/80">Settings</span>
        </div>
      </header>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Platform Settings</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-200">Super Admin</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <AdminTabNav activeTab="settings" />

          {/* Maintenance mode */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className={`w-4 h-4 ${maintenanceMode ? "text-amber-500" : "text-text-tertiary"}`} />
              <h2 className="text-sm font-semibold text-text-primary">Maintenance Mode</h2>
            </div>
            <div className={`bg-surface border rounded-lg p-4 space-y-3 ${maintenanceMode ? "border-amber-300 bg-amber-50/50" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary font-medium">Enable maintenance mode</p>
                  <p className="text-xs text-text-tertiary mt-0.5">All users see a maintenance message. API returns 503.</p>
                </div>
                <button onClick={() => { const v = !maintenanceMode; setMaintenanceMode(v); saveSetting("maintenance_mode", String(v)); }} className="shrink-0">
                  {maintenanceMode ? <ToggleRight className="w-10 h-6 text-amber-500" /> : <ToggleLeft className="w-10 h-6 text-text-tertiary" />}
                </button>
              </div>
              {maintenanceMode && (
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Maintenance message</label>
                  <textarea value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)}
                    onBlur={() => saveSetting("maintenance_message", maintenanceMessage)} rows={2}
                    className="w-full px-3 py-2 text-sm bg-white border border-border rounded-lg text-text-primary outline-none focus:border-accent resize-none" />
                </div>
              )}
            </div>
          </section>

          {/* Feature flags */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-sm font-semibold text-text-primary">Feature Flags</h2>
              <span className="text-xs text-text-tertiary">{flags.filter(f => f.enabled).length} of {flags.length} enabled</span>
            </div>
            <div className="space-y-4">
              {categories.map((cat) => {
                const catFlags = flags.filter(f => f.category === cat.key);
                if (catFlags.length === 0) return null;
                return (
                  <div key={cat.key}>
                    <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">{cat.label}</h3>
                    <div className="bg-surface border border-border rounded-lg divide-y divide-border">
                      {catFlags.map((flag) => (
                        <div key={flag.id} className="px-4 py-3 flex items-center gap-4">
                          <button onClick={() => toggleFlag(flag.id)} className="shrink-0">
                            {flag.enabled ? <ToggleRight className="w-9 h-5 text-accent" /> : <ToggleLeft className="w-9 h-5 text-text-tertiary" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary font-medium">{flag.name}</p>
                            <p className="text-xs text-text-tertiary mt-0.5">{flag.description}</p>
                          </div>
                          {cat.key === "experimental" && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium shrink-0">BETA</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Rate limits */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Gauge className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-sm font-semibold text-text-primary">Rate Limits</h2>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">API rate limit (req/min per org)</label>
                  <input type="text" value={apiRateLimit} onChange={(e) => setApiRateLimit(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-content-bg border border-border rounded-lg text-text-primary outline-none focus:border-accent font-mono" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">TraQL limit (queries/min per user)</label>
                  <input type="text" value={traqlLimit} onChange={(e) => setTraqlLimit(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-content-bg border border-border rounded-lg text-text-primary outline-none focus:border-accent font-mono" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => { saveSetting("api_rate_limit", apiRateLimit); saveSetting("traql_limit", traqlLimit); }}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors">
                  Save rate limits
                </button>
              </div>
            </div>
          </section>

          {/* Sign-up settings */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-sm font-semibold text-text-primary">Sign-up Settings</h2>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary font-medium">Open sign-up</p>
                  <p className="text-xs text-text-tertiary mt-0.5">Allow anyone to create an account.</p>
                </div>
                <button onClick={() => { const v = !openSignup; setOpenSignup(v); saveSetting("open_signup", String(v)); }} className="shrink-0">
                  {openSignup ? <ToggleRight className="w-10 h-6 text-accent" /> : <ToggleLeft className="w-10 h-6 text-text-tertiary" />}
                </button>
              </div>
              {!openSignup && (
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Allowed email domains (comma-separated)</label>
                  <input type="text" value={allowedDomains} onChange={(e) => setAllowedDomains(e.target.value)}
                    onBlur={() => saveSetting("allowed_domains", allowedDomains)} placeholder="example.com, company.io"
                    className="w-full px-3 py-2 text-sm bg-content-bg border border-border rounded-lg text-text-primary outline-none focus:border-accent" />
                </div>
              )}
            </div>
          </section>

          <div className="h-8" />
        </div>
      </div>
    </>
  );
}
