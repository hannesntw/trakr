"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { VariantConfig } from "../app/variants/types";
import { variants, defaultVariant } from "../app/variants";

const VariantContext = createContext<VariantConfig>(variants[defaultVariant]);

export function VariantProvider({
  variantId,
  children,
}: {
  variantId: string;
  children: ReactNode;
}) {
  const config = variants[variantId] ?? variants[defaultVariant];
  return (
    <VariantContext.Provider value={config}>{children}</VariantContext.Provider>
  );
}

export function useVariant() {
  return useContext(VariantContext);
}
