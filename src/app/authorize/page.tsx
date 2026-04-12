import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { deviceCodes, apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Cpu, Check } from "lucide-react";
import { createHash, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { code } = await searchParams;
  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <p className="text-sm text-text-secondary">Missing authorization code.</p>
      </div>
    );
  }

  const [device] = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.code, code));

  if (!device) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <p className="text-sm text-text-secondary">Invalid authorization code.</p>
      </div>
    );
  }

  if (new Date(device.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <p className="text-sm text-text-secondary">This authorization has expired. Please try again from Claude Code.</p>
      </div>
    );
  }

  if (device.status === "authorized") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Already Authorized</h1>
          <p className="text-sm text-text-secondary">You can close this window.</p>
        </div>
      </div>
    );
  }

  async function authorize() {
    "use server";
    const session = await auth();
    if (!session?.user?.id || !code) return;

    // Generate API key
    const rawKey = "trk_" + randomBytes(24).toString("base64url");
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 8);

    await db.insert(apiKeys).values({
      userId: session.user.id,
      keyHash,
      keyPrefix,
      label: `Claude Code — authorized ${new Date().toLocaleDateString()}`,
    });

    // Mark device code as authorized and store raw key for polling
    await db
      .update(deviceCodes)
      .set({ status: "authorized", userId: session.user.id, apiKey: rawKey })
      .where(eq(deviceCodes.code, code));

    redirect(`/authorize?code=${code}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-content-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <svg width="40" height="40" viewBox="0 0 32 32" className="mb-3">
            <rect width="32" height="32" rx="6" fill="#6366F1"/>
            <rect x="7" y="8" width="5" height="16" rx="1.5" fill="white" opacity="0.9"/>
            <rect x="14" y="12" width="5" height="12" rx="1.5" fill="white" opacity="0.7"/>
            <rect x="21" y="10" width="5" height="14" rx="1.5" fill="white" opacity="0.5"/>
          </svg>
          <h1 className="text-xl font-bold text-text-primary">Authorize Claude Code</h1>
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
                <p className="text-sm font-medium text-text-primary">{session.user.name ?? session.user.email}</p>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-xs text-text-tertiary mb-2">This will allow Claude Code to</p>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />Read and write work items in your projects</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />Manage sprints and comments</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />Upload attachments</li>
            </ul>
          </div>

          <form action={authorize} className="flex gap-2">
            <a href="/" className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary text-center hover:bg-content-bg transition-colors">
              Cancel
            </a>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
              Authorize
            </button>
          </form>

          <p className="text-[10px] text-text-tertiary text-center mt-3">
            You can revoke this at any time from Account Settings → API Keys
          </p>
        </div>
      </div>
    </div>
  );
}
