"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface StateOverrideContextType {
  get: (key: string) => string;
  set: (key: string, value: string) => void;
}

const StateOverrideContext = createContext<StateOverrideContextType>({
  get: () => "default",
  set: () => {},
});

export function StateOverrideProvider({
  children,
}: {
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = useCallback(
    (key: string) => searchParams.get(`state.${key}`) ?? "default",
    [searchParams]
  );

  const set = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "default") {
        params.delete(`state.${key}`);
      } else {
        params.set(`state.${key}`, value);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  return (
    <StateOverrideContext.Provider value={{ get, set }}>
      {children}
    </StateOverrideContext.Provider>
  );
}

export function useStateOverride(key: string): string {
  const ctx = useContext(StateOverrideContext);
  return ctx.get(key);
}

export function useSetStateOverride(): (key: string, value: string) => void {
  const ctx = useContext(StateOverrideContext);
  return ctx.set;
}
