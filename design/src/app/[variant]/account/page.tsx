"use client";

import { useState } from "react";
import { Plus, Cpu, Trash2, Copy, Check, Key } from "lucide-react";

export default function AccountPage() {
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [copied, setCopied] = useState(false);
  const [keyLabel, setKeyLabel] = useState("Claude Code");

  function generateKey() {
    const key = "trk_" + Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
    setNewKeyValue(key);
    setShowNewKey(true);
  }

  function copyKey() {
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
                <span className="w-12 h-12 rounded-full bg-accent/10 text-accent text-lg font-bold flex items-center justify-center">
                  H
                </span>
                <div className="flex-1">
                  <input defaultValue="Hannes" placeholder="Display name" className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  <p className="text-xs text-text-tertiary mt-1">hannes@example.com</p>
                </div>
              </div>
            </div>
          </section>

          {/* API Keys */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">API Keys</h2>
            <p className="text-xs text-text-secondary mb-3">
              API keys let MCP servers and scripts access Trakr as you. They work across all projects you have access to.
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
                <code className="text-xs text-text-tertiary font-mono">trk_••••••••k7w2</code>
                <button className="px-2 py-1 text-xs text-red-500 hover:text-red-600 border border-red-200 rounded transition-colors">
                  Revoke
                </button>
              </div>

              {/* New key creation */}
              {showNewKey ? (
                <div className="px-4 py-4 bg-amber-50 border-b border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">Copy your new API key now — it won't be shown again</p>
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
                    Add this to your MCP config: <code className="bg-white/50 px-1 rounded">{"\"env\": { \"TRAKR_API_KEY\": \"" + newKeyValue.slice(0, 12) + "...\" }"}</code>
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

          {/* Connected Apps */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Connected Apps</h2>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Claude Code (MCP)</p>
                  <p className="text-xs text-text-tertiary">Authorized Apr 11, 2026</p>
                </div>
                <button className="px-2 py-1 text-xs text-red-500 hover:text-red-600 border border-red-200 rounded transition-colors">
                  Revoke
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
