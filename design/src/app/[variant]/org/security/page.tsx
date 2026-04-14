"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Shield, Key, Globe, AlertTriangle, ToggleLeft, ToggleRight, Check, X, Plus, Monitor, BadgeCheck, Clock, Copy, RefreshCw, Link2 } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";

export default function SecurityPage() {
  const params = useParams();
  const variant = params.variant as string;

  // SSO state
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [ssoProvider, setSsoProvider] = useState("saml");
  const [ssoEntityId, setSsoEntityId] = useState("https://thoughtworks.okta.com/app/abc123");
  const [ssoMetadataUrl, setSsoMetadataUrl] = useState("https://thoughtworks.okta.com/app/abc123/sso/saml/metadata");
  const [ssoEnforced, setSsoEnforced] = useState(false);

  // MFA
  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [mfaGracePeriod, setMfaGracePeriod] = useState("7");

  // IP allowlist
  const [ipAllowlistEnabled, setIpAllowlistEnabled] = useState(false);
  const [ipEntries, setIpEntries] = useState(["192.168.1.0/24", "10.0.0.0/8"]);
  const [newIp, setNewIp] = useState("");

  // Verified domains
  const [domains, setDomains] = useState([
    { domain: "thoughtworks.com", status: "verified" as const, requireSso: true, blockMagicLink: false, autoCapture: true },
    { domain: "tw-consulting.com", status: "pending" as const, requireSso: false, blockMagicLink: false, autoCapture: false },
  ]);
  const [newDomain, setNewDomain] = useState("");
  const [showAddDomain, setShowAddDomain] = useState(false);

  // SCIM
  const [scimEnabled, setScimEnabled] = useState(false);
  const [scimTokenGenerated, setScimTokenGenerated] = useState(false);
  const [scimTokenVisible, setScimTokenVisible] = useState(false);

  // Sessions summary
  const [sessionsRevoked, setSessionsRevoked] = useState(false);

  function addIp() {
    if (!newIp.trim()) return;
    setIpEntries([...ipEntries, newIp.trim()]);
    setNewIp("");
  }

  function removeIp(ip: string) {
    setIpEntries(ipEntries.filter((e) => e !== ip));
  }

  function addDomain() {
    if (!newDomain.trim()) return;
    setDomains([...domains, { domain: newDomain.trim(), status: "pending", requireSso: false, blockMagicLink: false, autoCapture: false }]);
    setNewDomain("");
    setShowAddDomain(false);
  }

  function toggleDomainPolicy(domain: string, policy: "requireSso" | "blockMagicLink" | "autoCapture") {
    setDomains(domains.map((d) => d.domain === domain ? { ...d, [policy]: !d[policy] } : d));
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">Owner view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav variant={variant} activeTab="security" />

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

              {/* Domain list */}
              <div className="space-y-3">
                {domains.map((d) => (
                  <div key={d.domain} className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-content-bg">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-text-tertiary" />
                        <span className="text-sm text-text-primary font-mono">{d.domain}</span>
                      </div>
                      {d.status === "verified" ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
                          <Clock className="w-3 h-3" /> Pending verification
                        </span>
                      )}
                    </div>

                    {d.status === "pending" && (
                      <div className="px-3 py-3 border-t border-border space-y-2">
                        <p className="text-xs text-text-secondary">Add this DNS TXT record to verify ownership:</p>
                        <div className="flex items-center gap-2 px-3 py-2 bg-content-bg border border-border rounded-md">
                          <code className="text-xs font-mono text-text-primary flex-1">
                            _stori-verify.{d.domain} → trk-verify=abc123
                          </code>
                          <button className="p-1 text-text-tertiary hover:text-accent transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button className="px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-md transition-colors">
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
                            onClick={() => ssoEnabled && toggleDomainPolicy(d.domain, "requireSso")}
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
                          <button onClick={() => toggleDomainPolicy(d.domain, "blockMagicLink")}>
                            {d.blockMagicLink ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-text-primary font-medium">Auto-capture new sign-ups</p>
                            <p className="text-[10px] text-text-tertiary">Automatically add new users with this domain to your organization</p>
                          </div>
                          <button onClick={() => toggleDomainPolicy(d.domain, "autoCapture")}>
                            {d.autoCapture ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add domain form */}
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
                <button onClick={() => setSsoEnabled(!ssoEnabled)}>
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
                  </div>

                  <div className="border-t border-border pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary">Enforce SSO</p>
                      <p className="text-xs text-text-tertiary">Require all members to sign in via SSO (disable other login methods)</p>
                    </div>
                    <button onClick={() => setSsoEnforced(!ssoEnforced)}>
                      {ssoEnforced ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                    </button>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs text-emerald-700 font-medium">SSO is active</p>
                      <p className="text-[10px] text-emerald-600">Connected to Okta. Last metadata refresh: Apr 13, 2026 09:42 AM</p>
                    </div>
                  </div>
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
                        <button className="p-1.5 text-text-tertiary hover:text-accent border border-border rounded-md transition-colors">
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
                              value={scimTokenVisible ? "scim_str_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" : "scim_str_••••••••••••••••••••••••••••••"}
                              className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg font-mono text-text-secondary focus:outline-none"
                            />
                            <button
                              onClick={() => setScimTokenVisible(!scimTokenVisible)}
                              className="p-1.5 text-text-tertiary hover:text-accent border border-border rounded-md transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-amber-600">This token was shown once when generated. Store it securely in your IdP.</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setScimTokenGenerated(true); setScimTokenVisible(true); }}
                          className="px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
                        >
                          Generate Token
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    {scimTokenGenerated ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs text-emerald-700 font-medium">Connected — last sync 5 minutes ago</p>
                          <p className="text-[10px] text-emerald-600">24 users, 6 groups synced from Okta</p>
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
                <button onClick={() => setMfaEnforced(!mfaEnforced)}>
                  {mfaEnforced ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                </button>
              </div>

              {mfaEnforced && (
                <div className="border-t border-border pt-3 flex items-center gap-3">
                  <label className="text-xs text-text-tertiary">Grace period for enrollment</label>
                  <select
                    value={mfaGracePeriod}
                    onChange={(e) => setMfaGracePeriod(e.target.value)}
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
                  <p className="text-xs text-amber-700">MFA is not enforced. 8 of 24 members have MFA enabled voluntarily.</p>
                </div>
              )}
            </div>
          </section>

          {/* Active Sessions — summary view */}
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
                      <p className="text-sm text-text-primary font-medium">47 active sessions across 18 users</p>
                      <p className="text-xs text-text-tertiary mt-1">Sessions are automatically expired after 30 days of inactivity.</p>
                    </div>
                    <button
                      onClick={() => setSessionsRevoked(true)}
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
                  {ipEntries.map((ip) => (
                    <div key={ip} className="flex items-center gap-2 px-3 py-1.5 bg-content-bg rounded-md group">
                      <code className="text-xs font-mono text-text-primary flex-1">{ip}</code>
                      <button onClick={() => removeIp(ip)} className="p-1 text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
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
                    <p className="text-xs text-amber-700">Make sure your current IP (192.168.1.42) is included, or you may lose access.</p>
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
