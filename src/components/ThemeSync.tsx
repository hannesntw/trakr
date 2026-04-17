"use client";

import { useEffect } from "react";

function applyStoredTheme() {
  try {
    const stored = localStorage.getItem("stori-theme");
    const resolved =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.setAttribute("data-theme", resolved);
  } catch {}
}

export function ThemeSync() {
  useEffect(() => {
    applyStoredTheme();
    const onPageShow = () => applyStoredTheme();
    const onPopState = () => applyStoredTheme();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "stori-theme") applyStoredTheme();
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}
