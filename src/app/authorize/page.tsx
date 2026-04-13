import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { deviceCodes, apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Cpu, Check, Shield, ShieldCheck, Mail } from "lucide-react";
import { createHash, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

async function approveDeviceCode(userId: string, code: string) {
  // Generate API key
  const rawKey = "trk_" + randomBytes(24).toString("base64url");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 8);

  await db.insert(apiKeys).values({
    userId,
    keyHash,
    keyPrefix,
    label: `Claude Code — authorized ${new Date().toLocaleDateString()}`,
  });

  // Mark device code as authorized and store raw key for polling
  await db
    .update(deviceCodes)
    .set({ status: "authorized", userId, apiKey: rawKey })
    .where(eq(deviceCodes.code, code));
}

function TrakrLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="6" fill="#6366F1" />
      <rect x="7" y="8" width="5" height="16" rx="1.5" fill="white" opacity="0.9" />
      <rect x="14" y="12" width="5" height="12" rx="1.5" fill="white" opacity="0.7" />
      <rect x="21" y="10" width="5" height="14" rx="1.5" fill="white" opacity="0.5" />
    </svg>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; auto?: string }>;
}) {
  const session = await auth();
  const { code, auto } = await searchParams;

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <div className="w-full max-w-sm text-center">
          <TrakrLogo />
          <p className="text-sm text-text-secondary mt-4">Missing authorization code.</p>
        </div>
      </div>
    );
  }

  // Validate the device code
  const [device] = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.code, code));

  if (!device) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <div className="w-full max-w-sm text-center">
          <TrakrLogo />
          <p className="text-sm text-text-secondary mt-4">
            Invalid authorization code. Please try again from Claude Code.
          </p>
        </div>
      </div>
    );
  }

  if (new Date(device.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <div className="w-full max-w-sm text-center">
          <TrakrLogo />
          <p className="text-sm text-text-secondary mt-4">
            This authorization has expired. Please try again from Claude Code.
          </p>
        </div>
      </div>
    );
  }

  // Already authorized — show success
  if (device.status === "authorized") {
    return <SuccessState />;
  }

  // Authenticated user with auto-approve flag (returning from sign-in/sign-up)
  if (session?.user?.id && auto === "1") {
    await approveDeviceCode(session.user.id, code);
    return <SuccessState />;
  }

  // Authenticated user — show approve/deny
  if (session?.user) {
    return <ApproveView session={session} code={code} />;
  }

  // Unauthenticated — show inline sign-in/sign-up
  return <SignInView code={code} />;
}

function SuccessState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-content-bg">
      <div className="w-full max-w-sm text-center">
        <div className="flex flex-col items-center mb-6">
          <TrakrLogo />
          <h1 className="text-lg font-semibold text-text-primary mt-3">Trakr</h1>
        </div>
        <div className="bg-surface border border-border rounded-xl p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Connected!</h2>
          <p className="text-sm text-text-secondary">
            Claude Code can now access Trakr on your behalf. You can close this tab.
          </p>
        </div>
      </div>
    </div>
  );
}

function PermissionsList() {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium text-text-tertiary mb-2">This will allow Claude Code to</p>
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
  );
}

function ApproveView({
  session,
  code,
}: {
  session: { user: { id?: string; name?: string | null; email?: string | null; image?: string | null } };
  code: string;
}) {
  async function authorize() {
    "use server";
    const sess = await auth();
    if (!sess?.user?.id || !code) return;
    await approveDeviceCode(sess.user.id, code);
    redirect(`/authorize?code=${code}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-content-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <TrakrLogo />
          <h1 className="text-lg font-semibold text-text-primary mt-3">Trakr</h1>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 p-3 bg-content-bg rounded-lg mb-5">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Claude Code (MCP)</p>
              <p className="text-xs text-text-tertiary">wants to access Trakr on your behalf</p>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-xs text-text-tertiary mb-2">Signed in as</p>
            <div className="flex items-center gap-2">
              {session.user.image ? (
                <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">
                  {(session.user.name ?? session.user.email ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {session.user.name ?? session.user.email}
                </p>
              </div>
            </div>
          </div>

          <PermissionsList />

          <form action={authorize} className="flex gap-2">
            <a
              href="/"
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary text-center hover:bg-content-bg transition-colors"
            >
              Deny
            </a>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Authorize
            </button>
          </form>

          <p className="text-[10px] text-text-tertiary text-center mt-3">
            You can revoke access at any time from Account Settings &rarr; API Keys
          </p>
        </div>
      </div>
    </div>
  );
}

function SignInView({ code }: { code: string }) {
  const redirectTo = `/authorize?code=${code}&auto=1`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-content-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <TrakrLogo />
          <h1 className="text-lg font-semibold text-text-primary mt-3">Trakr</h1>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 mb-4">
          <div className="flex items-center gap-3 p-3 bg-content-bg rounded-lg mb-5">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Claude Code (MCP)</p>
              <p className="text-xs text-text-tertiary">wants to access Trakr on your behalf</p>
            </div>
          </div>

          <PermissionsList />

          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-5">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">
              Sign in or create an account to authorize this connection.
            </p>
          </div>

          {/* Magic link */}
          <form
            action={async (formData: FormData) => {
              "use server";
              const email = formData.get("email") as string;
              const target = formData.get("redirectTo") as string;
              await signIn("resend", { email, redirectTo: target });
            }}
          >
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <label className="text-xs font-medium text-text-tertiary block mb-1.5">Email</label>
            <div className="flex gap-2">
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send link
              </button>
            </div>
            <p className="text-[11px] text-text-tertiary mt-1.5">
              We&apos;ll email you a magic link to sign in instantly.
            </p>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-text-tertiary">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-border rounded-lg hover:bg-content-bg transition-colors text-sm font-medium text-text-primary"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
