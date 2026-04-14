"use client";

import { Users } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { useOrg } from "@/lib/use-org";

export default function TeamsPage() {
  const org = useOrg();

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full capitalize">{org.role} view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav />

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Teams</h2>
              <p className="text-xs text-text-tertiary mt-0.5">Organize members into teams with project access controls</p>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-12 text-center">
            <Users className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-primary font-medium">Teams coming soon</p>
            <p className="text-xs text-text-tertiary mt-1">
              Team management with project access controls will be available in a future update.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
