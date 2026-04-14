import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { isPlatformAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = await isPlatformAdmin(session.user.id);
  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-content-bg">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-text-tertiary mx-auto" />
          <h1 className="text-lg font-semibold text-text-primary">Access Denied</h1>
          <p className="text-sm text-text-secondary">You do not have platform admin access.</p>
          <Link href="/" className="text-sm text-accent hover:text-accent-hover">Back to projects</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <aside className="w-60 bg-sidebar-bg text-sidebar-text flex flex-col shrink-0 border-r border-sidebar-border">
        <div className="h-14 flex items-center border-b border-sidebar-border pl-4">
          <svg width="20" height="20" viewBox="0 0 32 32" className="mr-2">
            <rect width="32" height="32" rx="6" fill="#6366F1"/>
            <rect x="7" y="8" width="5" height="16" rx="1.5" fill="white" opacity="0.9"/>
            <rect x="14" y="12" width="5" height="12" rx="1.5" fill="white" opacity="0.7"/>
            <rect x="21" y="10" width="5" height="14" rx="1.5" fill="white" opacity="0.5"/>
          </svg>
          <span className="font-semibold text-sidebar-text-active text-sm">Stori</span>
        </div>
        <div className="px-3 py-3">
          <Link href="/" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </Link>
        </div>
        <div className="px-3 py-1">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">Platform Admin</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="border-t border-sidebar-border py-2 px-3">
          <div className="flex items-center gap-2.5 pl-1 py-1.5 group">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
            ) : (
              <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                {(session.user.name ?? session.user.email ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-xs text-sidebar-text-active truncate flex-1">
              {session.user.name ?? session.user.email}
            </span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" className="text-[10px] text-sidebar-text opacity-0 group-hover:opacity-100 hover:text-sidebar-text-active transition-opacity">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 bg-content-bg">
        {children}
      </main>
    </div>
  );
}
