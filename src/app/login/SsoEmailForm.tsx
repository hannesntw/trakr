"use client";

import { useState, useTransition } from "react";
import { Mail, Shield } from "lucide-react";

export function SsoEmailForm() {
  const [email, setEmail] = useState("");
  const [ssoStatus, setSsoStatus] = useState<
    | null
    | { sso: false }
    | { sso: true; protocol: "oidc"; redirectUrl: string }
    | { sso: true; protocol: "saml"; message: string }
  >(null);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

  async function checkSso() {
    if (!email) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/auth/sso?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setSsoStatus(data);

      // If OIDC SSO, redirect immediately
      if (data.sso && data.protocol === "oidc" && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
    } catch {
      setSsoStatus(null);
    } finally {
      setChecking(false);
    }
  }

  async function sendMagicLink() {
    setSending(true);
    // Submit the magic link form via standard form submission
    const form = document.getElementById("magic-link-form") as HTMLFormElement;
    form?.requestSubmit();
  }

  // If SAML is required, show message
  if (ssoStatus && ssoStatus.sso && ssoStatus.protocol === "saml") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <Shield className="w-4 h-4 text-accent" />
          <span className="font-medium">SSO Required</span>
        </div>
        <p className="text-xs text-text-tertiary">
          {ssoStatus.message}
        </p>
        <button
          onClick={() => { setSsoStatus(null); setEmail(""); }}
          className="text-xs text-accent hover:text-accent-hover transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-text-tertiary block mb-1.5">
        Email
      </label>
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSsoStatus(null);
          }}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        />
        <button
          type="button"
          disabled={!email || checking}
          onClick={checkSso}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Mail className="w-4 h-4" />
          {checking ? "Checking..." : "Continue"}
        </button>
      </div>

      {/* Show magic link form if no SSO required */}
      {ssoStatus && !ssoStatus.sso && (
        <form id="magic-link-form" action="/api/auth/signin/resend" method="post">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="csrfToken" value="" />
          <input type="hidden" name="callbackUrl" value="/" />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Send magic link
          </button>
        </form>
      )}

      <p className="text-[11px] text-text-tertiary mt-1.5">
        {ssoStatus && !ssoStatus.sso
          ? "No SSO required for this domain. Click above to receive a magic link."
          : "Enter your email to check for SSO or receive a magic link."}
      </p>
    </div>
  );
}
