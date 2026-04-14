"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Upload } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";

export default function OrgSettingsPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [orgName, setOrgName] = useState("ThoughtWorks");
  const [orgSlug, setOrgSlug] = useState("thoughtworks");
  const [logoUploaded, setLogoUploaded] = useState(false);

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">Owner view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav variant={variant} activeTab="settings" />

          {/* Organization identity */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Organization Profile</h2>
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => setLogoUploaded(true)}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-accent flex items-center justify-center transition-colors shrink-0"
                >
                  {logoUploaded ? (
                    <span className="w-full h-full rounded-lg bg-accent/10 text-accent text-xl font-bold flex items-center justify-center">
                      TW
                    </span>
                  ) : (
                    <Upload className="w-5 h-5 text-text-tertiary" />
                  )}
                </button>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs text-text-tertiary block mb-1">Organization Name</label>
                    <input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-tertiary block mb-1">URL Slug</label>
                    <div className="flex items-center gap-0">
                      <span className="px-3 py-1.5 text-sm bg-content-bg border border-r-0 border-border rounded-l-md text-text-tertiary">
                        https://
                      </span>
                      <input
                        value={orgSlug}
                        onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="flex-1 px-3 py-1.5 text-sm border border-border bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono"
                      />
                      <span className="px-3 py-1.5 text-sm bg-content-bg border border-l-0 border-border rounded-r-md text-text-tertiary">
                        .trakr.app
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <h2 className="text-sm font-semibold text-red-500 mb-4">Danger Zone</h2>
            <div className="bg-surface border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Delete organization</p>
                  <p className="text-xs text-text-tertiary">Permanently delete this organization, all projects, and all data. This cannot be undone.</p>
                </div>
                <button className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
