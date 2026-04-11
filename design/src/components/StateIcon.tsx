"use client";

import { Circle, CircleDot, CircleCheck, Play, Loader } from "lucide-react";

const stateConfig: Record<string, { icon: typeof Circle; color: string }> = {
  new: { icon: Circle, color: "text-gray-400" },
  active: { icon: CircleDot, color: "text-blue-500" },
  ready: { icon: CircleDot, color: "text-amber-500" },
  in_progress: { icon: Play, color: "text-indigo-500" },
  done: { icon: CircleCheck, color: "text-emerald-500" },
};

export function StateIcon({
  state,
  size = 14,
}: {
  state: string;
  size?: number;
}) {
  const config = stateConfig[state] ?? stateConfig.new;
  const Icon = config.icon;
  return <Icon style={{ width: size, height: size }} className={`${config.color} shrink-0`} />;
}
