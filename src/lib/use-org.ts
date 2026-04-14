"use client";

import { useMemo } from "react";

export interface OrgData {
  id: number;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

export function useOrg(): OrgData {
  return useMemo(() => {
    if (typeof document === "undefined") {
      return { id: 0, name: "", slug: "", plan: "free", role: "member" };
    }
    const el = document.getElementById("org-data");
    if (!el) return { id: 0, name: "", slug: "", plan: "free", role: "member" };
    try {
      return JSON.parse(el.textContent ?? "{}");
    } catch {
      return { id: 0, name: "", slug: "", plan: "free", role: "member" };
    }
  }, []);
}
