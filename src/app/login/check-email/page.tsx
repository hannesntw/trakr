import { Mail } from "lucide-react";
import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-content-bg">
      <div className="w-full max-w-sm text-center">
        <div className="flex flex-col items-center mb-6">
          <svg width="40" height="40" viewBox="0 0 32 32" className="mb-3">
            <rect width="32" height="32" rx="6" fill="#6366F1"/>
            <rect x="7" y="8" width="5" height="16" rx="1.5" fill="white" opacity="0.9"/>
            <rect x="14" y="12" width="5" height="12" rx="1.5" fill="white" opacity="0.7"/>
            <rect x="21" y="10" width="5" height="14" rx="1.5" fill="white" opacity="0.5"/>
          </svg>
          <h1 className="text-2xl font-bold text-text-primary">Check your email</h1>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <Mail className="w-12 h-12 text-accent mx-auto mb-4" />
          <p className="text-sm text-text-secondary mb-4">
            We sent you a magic link. Click the link in your email to sign in.
          </p>
          <p className="text-xs text-text-tertiary">
            Didn't get it? Check your spam folder or{" "}
            <Link href="/login" className="text-accent hover:underline">
              try again
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
