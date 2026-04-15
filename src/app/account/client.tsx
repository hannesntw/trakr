"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Cpu, Copy, Check, Key, Sun, Moon, Monitor } from "lucide-react";
import { formatFullDateTime } from "@/lib/utils";

interface ApiKeyInfo {
  id: number;
  label: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface AccountClientProps {
  user: { id?: string; name?: string | null; email?: string | null; image?: string | null };
}

export function AccountClient({ user }: AccountClientProps) {
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("Claude Code");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/account/keys").then(r => r.json()).then(setKeys);
    const stored = localStorage.getItem("stori-theme") as "light" | "dark" | null;
    setTheme(stored ?? "system");
  }, []);

  function applyTheme(t: "light" | "dark" | "system") {
    setTheme(t);
    if (t === "system") {
      localStorage.removeItem("stori-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      localStorage.setItem("stori-theme", t);
      document.documentElement.setAttribute("data-theme", t);
    }
  }

  async function saveName() {
    setSaving(true);
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaving(false);
    router.refresh();
  }

  async function generateKey() {
    const res = await fetch("/api/account/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim() || "API Key" }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKey(data.key);
      setKeys(prev => [...prev, data]);
      setCreating(false);
      setNewLabel("Claude Code");
    }
  }

  async function revokeKey(id: number) {
    await fetch("/api/account/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setKeys(keys.filter(k => k.id !== id));
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                {user.image ? (
                  <img src={user.image} alt="" className="w-12 h-12 rounded-full shrink-0" />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-accent/10 text-accent text-lg font-bold flex items-center justify-center shrink-0">
                    {(name || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-xs text-text-tertiary block mb-1">Display name</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-text-tertiary block mb-1">Email</label>
                    <p className="text-sm text-text-secondary">{user.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={saveName} disabled={saving || name.trim() === (user.name ?? "")}
                  className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </section>

          {/* Theme */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Theme</h2>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex gap-2">
                {([
                  { value: "light" as const, icon: Sun, label: "Light" },
                  { value: "dark" as const, icon: Moon, label: "Dark" },
                  { value: "system" as const, icon: Monitor, label: "System" },
                ]).map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => applyTheme(value)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md border transition-colors ${
                      theme === value
                        ? "border-accent bg-accent/10 text-accent font-medium"
                        : "border-border text-text-secondary hover:border-border-hover hover:text-text-primary"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* API Keys */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">API Keys</h2>
            <p className="text-xs text-text-secondary mb-3">
              API keys let MCP servers and scripts access Stori as you. They work across all projects you have access to.
            </p>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              {keys.map(k => (
                <div key={k.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                  <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{k.label}</p>
                    <p className="text-xs text-text-tertiary">
                      <span title={formatFullDateTime(k.createdAt)}>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                      {k.lastUsedAt && <span title={formatFullDateTime(k.lastUsedAt)}>{` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}</span>}
                    </p>
                  </div>
                  <code className="text-xs text-text-tertiary font-mono">{k.keyPrefix}••••</code>
                  <button onClick={() => revokeKey(k.id)} className="px-2 py-1 text-xs text-red-500 hover:text-red-600 border border-red-200 rounded transition-colors">
                    Revoke
                  </button>
                </div>
              ))}

              {/* New key display */}
              {newKey && (
                <div className="px-4 py-4 bg-amber-50 border-b border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">Copy your new API key now — it won't be shown again</p>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <code className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-md text-xs font-mono text-text-primary select-all overflow-hidden">
                      {newKey}
                    </code>
                    <button onClick={() => copyToClipboard(newKey)} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-md flex items-center gap-1 transition-colors shrink-0">
                      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Add to your MCP config: <code className="bg-white/50 px-1 rounded">STORI_API_KEY={newKey.slice(0, 12)}...</code>
                  </p>
                  <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-amber-600 hover:text-amber-800">
                    I've copied it, dismiss
                  </button>
                </div>
              )}

              {/* Generate */}
              <div className="px-4 py-3 bg-content-bg/50">
                {creating ? (
                  <div className="flex gap-2">
                    <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Key label"
                      className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    <button onClick={generateKey} disabled={!newLabel.trim()} className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors">
                      Generate
                    </button>
                    <button onClick={() => setCreating(false)} className="px-3 py-1.5 text-sm text-text-secondary">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Generate new key
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
