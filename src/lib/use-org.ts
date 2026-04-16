"use client";

import { useMemo } from "react";

export interface OrgData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

export function useOrg(): OrgData {
  return useMemo(() => {
    if (typeof document === "undefined") {
      return { id: "", name: "", slug: "", plan: "free", role: "member" };
    }
    const el = document.getElementById("org-data");
    if (!el) return { id: "", name: "", slug: "", plan: "free", role: "member" };
    try {
      return JSON.parse(el.textContent ?? "{}");
    } catch {
      return { id: "", name: "", slug: "", plan: "free", role: "member" };
    }
  }, []);
}
