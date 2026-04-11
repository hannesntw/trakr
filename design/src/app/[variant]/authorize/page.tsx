"use client";

import { useState } from "react";
import { FolderKanban, Check, Cpu } from "lucide-react";

export default function AuthorizePage() {
  const [authorized, setAuthorized] = useState(false);

  if (authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Authorized</h1>
          <p className="text-sm text-text-secondary">
            Claude Code is now connected to Trakr as <strong>hannes@example.com</strong>. You can close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-content-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <FolderKanban className="w-10 h-10 text-accent mb-3" />
          <h1 className="text-xl font-bold text-text-primary">Authorize Claude Code</h1>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          {/* App info */}
          <div className="flex items-center gap-3 p-3 bg-content-bg rounded-lg mb-5">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Claude Code (MCP)</p>
              <p className="text-xs text-text-tertiary">wants to access Trakr on your behalf</p>
            </div>
          </div>

          {/* Signed in as */}
          <div className="mb-5">
            <p className="text-xs text-text-tertiary mb-2">Signed in as</p>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">
                H
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">hannes@example.com</p>
                <p className="text-xs text-text-tertiary">2 projects</p>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="mb-5">
            <p className="text-xs text-text-tertiary mb-2">This will allow Claude Code to</p>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Read and write work items in your projects
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Manage sprints and comments
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Upload attachments
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-content-bg transition-colors">
              Cancel
            </button>
            <button
              onClick={() => setAuthorized(true)}
              className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
            >
              Authorize
            </button>
          </div>

          <p className="text-[10px] text-text-tertiary text-center mt-3">
            You can revoke this at any time from Settings → API Keys
          </p>
        </div>
      </div>
    </div>
  );
}
