"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Shield, Key, Globe, AlertTriangle, ToggleLeft, ToggleRight, Check, X, Plus, Monitor } from "lucide-react";
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

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">Owner view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav variant={variant} activeTab="security" />

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
