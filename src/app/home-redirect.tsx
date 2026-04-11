"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function HomeRedirect({ projectKeys }: { projectKeys: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("trakr-last-project");
    const key = stored && projectKeys.includes(stored) ? stored : projectKeys[0];
    router.replace(`/projects/${key}/board`);
  }, [projectKeys, router]);

  return null;
}
