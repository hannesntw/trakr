"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
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

  async function handleContinue() {
    if (!email) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/auth/sso?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setSsoStatus(data);

      if (data.sso && data.protocol === "oidc" && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      // No SSO — send magic link directly
      if (!data.sso) {
        setSending(true);
        await signIn("resend", { email, callbackUrl: "/" });
        return;
      }
    } catch {
      // SSO check failed — fall back to magic link
      setSending(true);
      await signIn("resend", { email, callbackUrl: "/" });
    } finally {
      setChecking(false);
    }
  }

  // SAML required
  if (ssoStatus && ssoStatus.sso && ssoStatus.protocol === "saml") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <Shield className="w-4 h-4 text-accent" />
          <span className="font-medium">SSO required</span>
        </div>
        <p className="text-xs text-text-tertiary">{ssoStatus.message}</p>
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
      <label className="text-xs font-medium text-text-tertiary block mb-1.5">Email</label>
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setSsoStatus(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleContinue(); } }}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-border rounded-lg bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        />
        <button
          type="button"
          disabled={!email || checking || sending}
          onClick={handleContinue}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          <Mail className="w-4 h-4" />
          {checking ? "Checking..." : sending ? "Sending..." : "Continue"}
        </button>
      </div>
      <p className="text-[11px] text-text-tertiary mt-1.5">
        Enter your email to check for SSO or receive a magic link.
      </p>
    </div>
  );
}
