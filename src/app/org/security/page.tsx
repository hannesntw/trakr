"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, Key, Globe, AlertTriangle, ToggleLeft, ToggleRight,
  Check, X, Plus, Monitor, BadgeCheck, Clock, Copy, RefreshCw, Link2,
} from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { useOrg } from "@/lib/use-org";

interface Domain {
  id: number;
  domain: string;
  status: string;
  verificationToken: string;
  requireSso: boolean;
  blockMagicLink: boolean;
  autoCapture: boolean;
}

interface SsoConfig {
  id: number;
  protocol: string;
  entityId: string | null;
  metadataUrl: string | null;
  clientId: string | null;
  discoveryUrl: string | null;
  enforced: boolean;
}

interface IpEntry {
  id: number;
  cidr: string;
  description: string | null;
}

export default function SecurityPage() {
  const org = useOrg();

  // SSO state
  const [ssoConfig, setSsoConfig] = useState<SsoConfig | null>(null);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoProvider, setSsoProvider] = useState("saml");
  const [ssoEntityId, setSsoEntityId] = useState("");
  const [ssoMetadataUrl, setSsoMetadataUrl] = useState("");
  const [ssoEnforced, setSsoEnforced] = useState(false);
  const [ssoSaving, setSsoSaving] = useState(false);

  // MFA
  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [mfaGracePeriod, setMfaGracePeriod] = useState("7");

  // IP allowlist
  const [ipAllowlistEnabled, setIpAllowlistEnabled] = useState(false);
  const [ipEntries, setIpEntries] = useState<IpEntry[]>([]);
  const [newIp, setNewIp] = useState("");
  const [newIpDesc, setNewIpDesc] = useState("");

  // Verified domains
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [showAddDomain, setShowAddDomain] = useState(false);

  // SCIM
  const [scimEnabled, setScimEnabled] = useState(false);
  const [scimTokenGenerated, setScimTokenGenerated] = useState(false);
  const [scimTokenVisible, setScimTokenVisible] = useState(false);
  const [scimTokenValue, setScimTokenValue] = useState<string | null>(null);
  const [scimGenerating, setScimGenerating] = useState(false);

  // Sessions
  const [sessionStats, setSessionStats] = useState({ activeCount: 0, userCount: 0 });
  const [sessionsRevoked, setSessionsRevoked] = useState(false);

  // Loading
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!org.id) return;
    setLoading(true);
    try {
      const [ssoRes, domainsRes, ipRes, mfaRes, sessRes, scimRes] = await Promise.all([
        fetch(`/api/orgs/${org.id}/security/sso`),
        fetch(`/api/orgs/${org.id}/security/domains`),
        fetch(`/api/orgs/${org.id}/security/ip-allowlist`),
        fetch(`/api/orgs/${org.id}/security/mfa`),
        fetch(`/api/orgs/${org.id}/security/sessions`),
        fetch(`/api/orgs/${org.id}/security/scim-token`),
      ]);

      if (ssoRes.ok) {
        const data = await ssoRes.json();
        if (data) {
          setSsoConfig(data);
          setSsoEnabled(true);
          setSsoProvider(data.protocol);
          setSsoEntityId(data.entityId ?? data.clientId ?? "");
          setSsoMetadataUrl(data.metadataUrl ?? data.discoveryUrl ?? "");
          setSsoEnforced(data.enforced);
        }
      }

      if (domainsRes.ok) {
        setDomains(await domainsRes.json());
      }

      if (ipRes.ok) {
        const entries = await ipRes.json();
        setIpEntries(entries);
        if (entries.length > 0) setIpAllowlistEnabled(true);
      }

      if (mfaRes.ok) {
        const policy = await mfaRes.json();
        setMfaEnforced(policy.enforced);
        setMfaGracePeriod(String(policy.gracePeriodDays));
      }

      if (sessRes.ok) {
        setSessionStats(await sessRes.json());
      }

      if (scimRes.ok) {
        const scimData = await scimRes.json();
        if (scimData.hasToken) {
          setScimEnabled(true);
          setScimTokenGenerated(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [org.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- SSO handlers ---
  async function saveSso() {
    setSsoSaving(true);
    try {
      const body: Record<string, string> = { protocol: ssoProvider };
      if (ssoProvider === "saml") {
        body.entityId = ssoEntityId;
        body.metadataUrl = ssoMetadataUrl;
      } else {
        body.clientId = ssoEntityId;
        body.discoveryUrl = ssoMetadataUrl;
      }
      const res = await fetch(`/api/orgs/${org.id}/security/sso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setSsoConfig(data);
      }
    } finally {
      setSsoSaving(false);
    }
  }

  async function toggleSsoEnforced() {
    const newVal = !ssoEnforced;
    const res = await fetch(`/api/orgs/${org.id}/security/sso`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enforced: newVal }),
    });
    if (res.ok) setSsoEnforced(newVal);
  }

  async function removeSso() {
    await fetch(`/api/orgs/${org.id}/security/sso`, { method: "DELETE" });
    setSsoConfig(null);
    setSsoEnabled(false);
    setSsoProvider("saml");
    setSsoEntityId("");
    setSsoMetadataUrl("");
    setSsoEnforced(false);
  }

  // --- Domain handlers ---
  async function addDomain() {
    if (!newDomain.trim()) return;
    const res = await fetch(`/api/orgs/${org.id}/security/domains`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: newDomain.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setDomains([...domains, data]);
      setNewDomain("");
      setShowAddDomain(false);
    }
  }

  async function verifyDomain(domainId: number) {
    const res = await fetch(`/api/orgs/${org.id}/security/domains/${domainId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDomains(domains.map((d) => (d.id === domainId ? updated : d)));
    }
  }

  async function toggleDomainPolicy(domainId: number, policy: "requireSso" | "blockMagicLink" | "autoCapture") {
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) return;
    const res = await fetch(`/api/orgs/${org.id}/security/domains/${domainId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [policy]: !domain[policy] }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDomains(domains.map((d) => (d.id === domainId ? updated : d)));
    }
  }

  async function removeDomain(domainId: number) {
    const res = await fetch(`/api/orgs/${org.id}/security/domains`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId }),
    });
    if (res.ok) {
      setDomains(domains.filter((d) => d.id !== domainId));
    }
  }

  // --- IP allowlist handlers ---
  async function addIp() {
    if (!newIp.trim()) return;
    const res = await fetch(`/api/orgs/${org.id}/security/ip-allowlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cidr: newIp.trim(), description: newIpDesc.trim() || undefined }),
    });
    if (res.ok) {
      const entry = await res.json();
      setIpEntries([...ipEntries, entry]);
      setNewIp("");
      setNewIpDesc("");
    }
  }

  async function removeIp(entryId: number) {
    const res = await fetch(`/api/orgs/${org.id}/security/ip-allowlist`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId }),
    });
    if (res.ok) {
      setIpEntries(ipEntries.filter((e) => e.id !== entryId));
    }
  }

  // --- MFA handler ---
  async function updateMfa(enforced: boolean, gracePeriodDays?: number) {
    const res = await fetch(`/api/orgs/${org.id}/security/mfa`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enforced,
        gracePeriodDays: gracePeriodDays ?? Number(mfaGracePeriod),
      }),
    });
    if (res.ok) {
      const policy = await res.json();
      setMfaEnforced(policy.enforced);
      setMfaGracePeriod(String(policy.gracePeriodDays));
    }
  }

  // --- Sessions handler ---
  async function revokeAllSessions() {
    const res = await fetch(`/api/orgs/${org.id}/security/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke-all" }),
    });
    if (res.ok) {
      setSessionsRevoked(true);
      setSessionStats({ activeCount: 0, userCount: 0 });
    }
  }

  if (loading) {
    return (
      <>
        <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
          <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-text-tertiary">Loading security settings...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full capitalize">
          {org.role} view
        </span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav />

          {/* Verified Domains */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-text-tertiary" />
              Verified Domains
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <p className="text-xs text-text-tertiary">
                Verify ownership of your email domains to enable domain-based authentication policies and auto-capture new sign-ups.
              </p>

              <div className="space-y-3">
                {domains.map((d) => (
                  <div key={d.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-content-bg">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-text-tertiary" />
                        <span className="text-sm text-text-primary font-mono">{d.domain}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.status === "verified" ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
                            <Clock className="w-3 h-3" /> Pending verification
                          </span>
                        )}
                        <button
                          onClick={() => removeDomain(d.id)}
                          className="p-1 text-text-tertiary hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {d.status === "pending" && (
                      <div className="px-3 py-3 border-t border-border space-y-2">
                        <p className="text-xs text-text-secondary">Add this DNS TXT record to verify ownership:</p>
                        <div className="flex items-center gap-2 px-3 py-2 bg-content-bg border border-border rounded-md">
                          <code className="text-xs font-mono text-text-primary flex-1">
                            _stori-verify.{d.domain} → {d.verificationToken}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(`_stori-verify.${d.domain} TXT ${d.verificationToken}`)}
                            className="p-1 text-text-tertiary hover:text-accent transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => verifyDomain(d.id)}
                          className="px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
                        >
                          Verify
                        </button>
                      </div>
                    )}

                    {d.status === "verified" && (
                      <div className="px-3 py-3 border-t border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-text-primary font-medium">Require SSO for this domain</p>
                            <p className="text-[10px] text-text-tertiary">
                              {ssoEnabled ? "Users with this domain must sign in via SSO" : "Configure SSO first to enable this policy"}
                            </p>
                          </div>
                          <button
                            onClick={() => ssoEnabled && toggleDomainPolicy(d.id, "requireSso")}
                            className={!ssoEnabled ? "opacity-40 cursor-not-allowed" : ""}
                          >
                            {d.requireSso ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-text-primary font-medium">Block magic link sign-in</p>
                            <p className="text-[10px] text-text-tertiary">Prevent passwordless email login for this domain</p>
                          </div>
                          <button onClick={() => toggleDomainPolicy(d.id, "blockMagicLink")}>
                            {d.blockMagicLink ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-text-primary font-medium">Auto-capture new sign-ups</p>
                            <p className="text-[10px] text-text-tertiary">Automatically add new users with this domain to your organization</p>
                          </div>
                          <button onClick={() => toggleDomainPolicy(d.id, "autoCapture")}>
                            {d.autoCapture ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {showAddDomain ? (
                <div className="border border-accent/30 rounded-lg p-3 space-y-2">
                  <label className="text-xs text-text-tertiary block">Domain name</label>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addDomain()}
                      placeholder="e.g. acme-corp.com"
                      className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                    <button onClick={addDomain} disabled={!newDomain.trim()} className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors">
                      Add Domain
                    </button>
                    <button onClick={() => { setShowAddDomain(false); setNewDomain(""); }} className="px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddDomain(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add domain
                </button>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700">Public email domains (gmail.com, outlook.com, etc.) cannot be verified.</p>
              </div>
            </div>
          </section>

          {/* SSO Configuration */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-text-tertiary" />
              Single Sign-On (SSO)
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary font-medium">SSO Authentication</p>
                  <p className="text-xs text-text-tertiary">Allow members to sign in with your identity provider</p>
                </div>
                <button onClick={() => {
                  if (ssoEnabled && ssoConfig) {
                    removeSso();
                  } else {
                    setSsoEnabled(!ssoEnabled);
                  }
                }}>
                  {ssoEnabled ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                </button>
              </div>

              {ssoEnabled && (
                <>
                  <div className="border-t border-border pt-4">
                    <div className="flex gap-3 mb-4">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="sso" value="saml" checked={ssoProvider === "saml"} onChange={() => setSsoProvider("saml")} className="accent-accent" />
                        SAML 2.0
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="sso" value="oidc" checked={ssoProvider === "oidc"} onChange={() => setSsoProvider("oidc")} className="accent-accent" />
                        OpenID Connect
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-text-tertiary block mb-1">
                          {ssoProvider === "saml" ? "Entity ID / Issuer" : "Client ID"}
                        </label>
                        <input
                          value={ssoEntityId}
                          onChange={(e) => setSsoEntityId(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-tertiary block mb-1">
                          {ssoProvider === "saml" ? "Metadata URL" : "Discovery URL"}
                        </label>
                        <input
                          value={ssoMetadataUrl}
                          onChange={(e) => setSsoMetadataUrl(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end mt-3">
                      <button
                        onClick={saveSso}
                        disabled={ssoSaving}
                        className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors"
                      >
                        {ssoSaving ? "Saving..." : "Save SSO Configuration"}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary">Enforce SSO</p>
                      <p className="text-xs text-text-tertiary">Require all members to sign in via SSO (disable other login methods)</p>
                    </div>
                    <button onClick={toggleSsoEnforced} disabled={!ssoConfig}>
                      {ssoEnforced ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                    </button>
                  </div>

                  {ssoConfig && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs text-emerald-700 font-medium">SSO is configured</p>
                        <p className="text-[10px] text-emerald-600">
                          Protocol: {ssoConfig.protocol.toUpperCase()}. Enforcement: {ssoConfig.enforced ? "on" : "off"}.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* SCIM Provisioning */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-text-tertiary" />
              SCIM Provisioning
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary font-medium">SCIM User & Group Sync</p>
                  <p className="text-xs text-text-tertiary">Automatically sync users and groups from your identity provider</p>
                </div>
                <button onClick={() => setScimEnabled(!scimEnabled)}>
                  {scimEnabled ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                </button>
              </div>

              {scimEnabled && (
                <>
                  <div className="border-t border-border pt-4 space-y-3">
                    <div>
                      <label className="text-xs text-text-tertiary block mb-1">SCIM Endpoint URL</label>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value="https://stori.zone/api/scim/v2"
                          className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono text-text-secondary focus:outline-none"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText("https://stori.zone/api/scim/v2")}
                          className="p-1.5 text-text-tertiary hover:text-accent border border-border rounded-md transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-text-tertiary block mb-1">SCIM Bearer Token</label>
                      {scimTokenGenerated ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              readOnly
                              value={scimTokenVisible && scimTokenValue ? scimTokenValue : "scim_str_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                              className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono text-text-secondary focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                if (scimTokenValue) {
                                  navigator.clipboard.writeText(scimTokenValue);
                                }
                                setScimTokenVisible(!scimTokenVisible);
                              }}
                              className="p-1.5 text-text-tertiary hover:text-accent border border-border rounded-md transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-amber-600">
                            {scimTokenValue
                              ? "Copy this token now. It will not be shown again."
                              : "This token was shown once when generated. Store it securely in your IdP."}
                          </p>
                        </div>
                      ) : (
                        <button
                          disabled={scimGenerating}
                          onClick={async () => {
                            setScimGenerating(true);
                            try {
                              const res = await fetch(`/api/orgs/${org.id}/security/scim-token`, { method: "POST" });
                              if (res.ok) {
                                const data = await res.json();
                                setScimTokenValue(data.token);
                                setScimTokenGenerated(true);
                                setScimTokenVisible(true);
                              }
                            } finally {
                              setScimGenerating(false);
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50"
                        >
                          {scimGenerating ? "Generating..." : "Generate Token"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    {scimTokenGenerated ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs text-emerald-700 font-medium">Token generated</p>
                          <p className="text-[10px] text-emerald-600">Configure this token in your identity provider to enable SCIM sync.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0" />
                        <p className="text-xs text-gray-500">Not connected — generate a bearer token and configure it in your identity provider.</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                    <p className="text-xs text-blue-700">
                      SCIM automatically syncs users and groups from your identity provider. Users removed from your IdP are deactivated in Stori.
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* MFA */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-text-tertiary" />
              Multi-Factor Authentication (MFA)
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary font-medium">Enforce MFA for all members</p>
                  <p className="text-xs text-text-tertiary">Require a second factor (TOTP, WebAuthn) for every login</p>
                </div>
                <button onClick={() => updateMfa(!mfaEnforced)}>
                  {mfaEnforced ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                </button>
              </div>

              {mfaEnforced && (
                <div className="border-t border-border pt-3 flex items-center gap-3">
                  <label className="text-xs text-text-tertiary">Grace period for enrollment</label>
                  <select
                    value={mfaGracePeriod}
                    onChange={(e) => {
                      setMfaGracePeriod(e.target.value);
                      updateMfa(true, Number(e.target.value));
                    }}
                    className="px-2 py-1 text-sm border border-border rounded-md bg-content-bg"
                  >
                    <option value="0">No grace period</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                  </select>
                </div>
              )}

              {!mfaEnforced && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">MFA is not enforced. Members can enable MFA voluntarily from their profile.</p>
                </div>
              )}
            </div>
          </section>

          {/* Active Sessions */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-text-tertiary" />
              Active Sessions
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              {!sessionsRevoked ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary font-medium">
                        {sessionStats.activeCount} active session{sessionStats.activeCount !== 1 ? "s" : ""} across {sessionStats.userCount} user{sessionStats.userCount !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">Sessions are automatically expired after 30 days of inactivity.</p>
                    </div>
                    <button
                      onClick={revokeAllSessions}
                      className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Revoke all sessions
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                    <p className="text-xs text-blue-700">
                      Manage individual sessions from the member detail page. Click any member in the <span className="font-medium">Members</span> tab to view and revoke their sessions.
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-700 font-medium">All sessions revoked</p>
                    <p className="text-[10px] text-emerald-600">All users will need to sign in again. 0 active sessions across 0 users.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* IP Allowlist */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-text-tertiary" />
              IP Allowlist
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary font-medium">Restrict access by IP</p>
                  <p className="text-xs text-text-tertiary">Only allow connections from approved IP addresses or CIDR ranges</p>
                </div>
                <button onClick={() => setIpAllowlistEnabled(!ipAllowlistEnabled)}>
                  {ipAllowlistEnabled ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                </button>
              </div>

              {ipAllowlistEnabled && (
                <div className="border-t border-border pt-3 space-y-2">
                  {ipEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 px-3 py-1.5 bg-content-bg rounded-md group">
                      <code className="text-xs font-mono text-text-primary flex-1">{entry.cidr}</code>
                      {entry.description && (
                        <span className="text-[10px] text-text-tertiary">{entry.description}</span>
                      )}
                      <button onClick={() => removeIp(entry.id)} className="p-1 text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addIp()}
                      placeholder="e.g. 203.0.113.0/24"
                      className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                    <button onClick={addIp} disabled={!newIp.trim()} className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors">
                      Add
                    </button>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700">Make sure your current IP is included, or you may lose access.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
