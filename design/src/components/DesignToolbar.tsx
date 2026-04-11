"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useVariant } from "./VariantContext";
import { useStateOverride, useSetStateOverride } from "./StateOverrideContext";
import { variants } from "../app/variants";
import { getRelevantOverrides } from "../app/state-overrides/registry";
import { ChevronDown, Layers, SlidersHorizontal } from "lucide-react";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [ref, handler]);
}

export function DesignToolbar() {
  const variant = useVariant();
  const pathname = usePathname();
  const router = useRouter();
  const relevantOverrides = getRelevantOverrides(pathname);

  const [variantOpen, setVariantOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const variantRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);

  useClickOutside(variantRef, () => setVariantOpen(false));
  useClickOutside(stateRef, () => setStateOpen(false));

  function navigateToVariant(variantId: string) {
    const rest = pathname.split("/").slice(2).map(s => `/${s}`).join("");
    router.push(`/${variantId}${rest}`);
    setVariantOpen(false);
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-toolbar-bg text-toolbar-text text-xs">
      <div className="flex items-center gap-2 px-3 h-9">
        {/* Variant dropdown */}
        <div ref={variantRef} className="relative">
          <button
            onClick={() => { setVariantOpen(!variantOpen); setStateOpen(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/15 transition-colors"
          >
            <Layers className="w-3 h-3 opacity-60" />
            <span className="font-medium text-white">{variant.label}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {variantOpen && (
            <div className="absolute top-full left-0 mt-1 bg-toolbar-bg border border-white/10 rounded-lg shadow-xl py-1 min-w-[200px]">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider opacity-40">
                Design Variant
              </p>
              {Object.values(variants).map((v) => (
                <button
                  key={v.id}
                  onClick={() => navigateToVariant(v.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-white/10 transition-colors flex items-center gap-2 ${
                    variant.id === v.id ? "text-white bg-white/5" : "text-toolbar-text"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${variant.id === v.id ? "bg-white" : "bg-white/30"}`} />
                  <span className="text-[12px]">{v.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* State overrides dropdown */}
        {relevantOverrides.length > 0 && (
          <div ref={stateRef} className="relative">
            <button
              onClick={() => { setStateOpen(!stateOpen); setVariantOpen(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/15 transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3 opacity-60" />
              <span>State Overrides</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {stateOpen && (
              <div className="absolute top-full left-0 mt-1 bg-toolbar-bg border border-white/10 rounded-lg shadow-xl py-1 min-w-[220px]">
                <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider opacity-40">
                  Override UI States
                </p>
                {relevantOverrides.map((def) => (
                  <StateOverrideRow key={def.key} def={def} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />
        <span className="text-[10px] opacity-30">Click Dummy</span>
      </div>
    </div>
  );
}

function StateOverrideRow({
  def,
}: {
  def: { key: string; label: string; states: string[] };
}) {
  const current = useStateOverride(def.key);
  const setOverride = useSetStateOverride();

  return (
    <div className="px-3 py-2 flex items-center justify-between gap-3">
      <span className="text-[12px] text-toolbar-text">{def.label}</span>
      <div className="flex gap-0.5">
        {def.states.map((s) => (
          <button
            key={s}
            onClick={() => setOverride(def.key, s)}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              current === s
                ? "bg-white/20 text-white font-medium"
                : "hover:bg-white/10 text-toolbar-text"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
