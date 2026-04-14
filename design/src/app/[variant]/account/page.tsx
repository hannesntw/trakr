"use client";

import { useState } from "react";
import { Plus, Cpu, Copy, Check, Key, Monitor, Smartphone, Laptop, Bell, Link2, Sun, Moon, Palette, X } from "lucide-react";
import { ToggleLeft, ToggleRight } from "lucide-react";

interface SessionInfo {
  id: string;
  device: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
}

const initialSessions: SessionInfo[] = [
  { id: "s1", device: "MacBook Pro", deviceType: "desktop", browser: "Chrome 124", location: "Berlin, DE", lastActive: "Active now", current: true },
  { id: "s2", device: "iPhone 15", deviceType: "mobile", browser: "Safari 18", location: "Berlin, DE", lastActive: "2 hours ago", current: false },
  { id: "s3", device: "iPad Air", deviceType: "tablet", browser: "Safari 18", location: "Berlin, DE", lastActive: "3 days ago", current: false },
];

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Laptop,
};

export default function AccountPage() {
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [copied, setCopied] = useState(false);

  // Notifications
  const [notifAssigned, setNotifAssigned] = useState(true);
  const [notifMentioned, setNotifMentioned] = useState(true);
  const [notifSprint, setNotifSprint] = useState(false);
  const [notifDigest, setNotifDigest] = useState(true);

  // Sessions
  const [sessions, setSessions] = useState<SessionInfo[]>(initialSessions);

  // Theme
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  function generateKey() {
    const key = "str_" + Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
    setNewKeyValue(key);
    setShowNewKey(true);
  }

  function copyKey() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function revokeSession(id: string) {
    setSessions(sessions.filter((s) => s.id !== id));
  }

  function revokeAllOtherSessions() {
    setSessions(sessions.filter((s) => s.current));
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Account Settings</h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          {/* Profile */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Profile</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-12 h-12 rounded-full bg-accent/10 text-accent text-lg font-bold flex items-center justify-center">
                  H
                </span>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-xs text-text-tertiary block mb-1">Display name</label>
                    <input defaultValue="Hannes" placeholder="Display name" className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-text-tertiary block mb-1">Email</label>
                    <div className="flex items-center gap-2">
                      <input value="hannes@example.com" readOnly className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg/50 text-text-tertiary cursor-not-allowed" />
                      <span className="text-[10px] text-text-tertiary whitespace-nowrap">Managed by Google</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-border/50">
                <button className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors">
                  Save
                </button>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-text-tertiary" />
              Notifications
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs text-text-tertiary mb-2">Choose which email notifications you receive.</p>
              {[
                { label: "Work item assigned to me", desc: "Get notified when a work item is assigned to you", value: notifAssigned, toggle: () => setNotifAssigned(!notifAssigned) },
                { label: "Mentioned in comment", desc: "Get notified when someone @mentions you in a comment", value: notifMentioned, toggle: () => setNotifMentioned(!notifMentioned) },
                { label: "Sprint started", desc: "Get notified when a sprint begins in your projects", value: notifSprint, toggle: () => setNotifSprint(!notifSprint) },
                { label: "Weekly digest", desc: "Receive a summary of activity across your projects every Monday", value: notifDigest, toggle: () => setNotifDigest(!notifDigest) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-tertiary">{item.desc}</p>
                  </div>
                  <button onClick={item.toggle}>
                    {item.value ? <ToggleRight className="w-6 h-6 text-accent" /> : <ToggleLeft className="w-6 h-6 text-text-tertiary" />}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Connected Accounts */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-text-tertiary" />
              Connected Accounts
            </h2>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded bg-white border border-border flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Google Account</p>
                  <p className="text-xs text-text-tertiary">hannes@example.com &middot; Connected since Jan 15, 2025</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full font-medium">Connected</span>
                <button className="px-2 py-1 text-xs text-red-500 hover:text-red-600 border border-red-200 rounded transition-colors">
                  Disconnect
                </button>
              </div>
            </div>
          </section>

          {/* Active Sessions */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-text-tertiary" />
              Active Sessions
            </h2>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              {sessions.map((session) => {
                const DeviceIcon = deviceIcons[session.deviceType];
                return (
                  <div key={session.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0">
                    <DeviceIcon className="w-5 h-5 text-text-tertiary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary flex items-center gap-2">
                        {session.device}
                        {session.current && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">This device</span>
                        )}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {session.browser} &middot; {session.location}
                      </p>
                    </div>
                    <span className="text-xs text-text-tertiary shrink-0">{session.lastActive}</span>
                    {!session.current && (
                      <button
                        onClick={() => revokeSession(session.id)}
                        className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })}
              {sessions.filter((s) => !s.current).length > 0 && (
                <div className="px-4 py-2.5 bg-content-bg/50 flex justify-end">
                  <button
                    onClick={revokeAllOtherSessions}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors"
                  >
                    Revoke all other sessions
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* API Keys */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-text-tertiary" />
              API Keys
            </h2>
            <p className="text-xs text-text-secondary mb-3">
              API keys let MCP servers and scripts access Stori as you. They work across all projects you have access to.
            </p>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              {/* Existing key */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">Claude Code — MacBook</p>
                  <p className="text-xs text-text-tertiary">Created Apr 11, 2026 · Last used just now</p>
                </div>
                <code className="text-xs text-text-tertiary font-mono">str_••••••••k7w2</code>
                <button className="px-2 py-1 text-xs text-red-500 hover:text-red-600 border border-red-200 rounded transition-colors">
                  Revoke
                </button>
              </div>

              {/* New key creation */}
              {showNewKey ? (
                <div className="px-4 py-4 bg-amber-50 border-b border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">Copy your new API key now — it won&apos;t be shown again</p>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <code className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-md text-xs font-mono text-text-primary select-all">
                      {newKeyValue}
                    </code>
                    <button onClick={copyKey} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-md flex items-center gap-1 transition-colors">
                      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Add this to your MCP config: <code className="bg-white/50 px-1 rounded">{"\"env\": { \"STORI_API_KEY\": \"" + newKeyValue.slice(0, 12) + "...\" }"}</code>
                  </p>
                </div>
              ) : (
                <div className="px-4 py-3 bg-content-bg/50 flex items-center gap-3">
                  <button onClick={generateKey} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Generate new key
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Theme */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 text-text-tertiary" />
              Theme
            </h2>
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-xs text-text-tertiary mb-3">Choose how Stori looks for you.</p>
              <div className="flex gap-3">
                {[
                  { id: "light" as const, label: "Light", icon: Sun },
                  { id: "dark" as const, label: "Dark", icon: Moon },
                  { id: "system" as const, label: "System", icon: Monitor },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`flex-1 flex flex-col items-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                      theme === opt.id
                        ? "border-accent bg-accent/5 text-accent"
                        : "border-border text-text-secondary hover:border-border hover:bg-content-bg"
                    }`}
                  >
                    <opt.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
