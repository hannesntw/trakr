// Story points badge — SVG circle with increasing visual complexity
// 1: thin dashed gray → 13: thick solid double ring, vibrant color

const FIBONACCI = [1, 2, 3, 5, 8, 13] as const;

interface PointsConfig {
  size: number;
  color: string;
  fillOpacity: number;
  fontSize: number;
  fontWeight: number;
  rings: Array<{
    r: number;        // radius
    stroke: number;   // stroke width
    opacity: number;
    dash?: string;    // strokeDasharray
  }>;
}

const configs: Record<number, PointsConfig> = {
  1: {
    size: 22, color: "#9CA3AF", fillOpacity: 0, fontSize: 9, fontWeight: 400,
    rings: [
      { r: 9, stroke: 1.2, opacity: 0.5, dash: "2 2" },
    ],
  },
  2: {
    size: 22, color: "#6B7280", fillOpacity: 0, fontSize: 9, fontWeight: 500,
    rings: [
      { r: 9, stroke: 1.5, opacity: 0.6, dash: "3 2" },
    ],
  },
  3: {
    size: 24, color: "#0EA5E9", fillOpacity: 0.06, fontSize: 10, fontWeight: 500,
    rings: [
      { r: 10, stroke: 1.5, opacity: 0.8 },
    ],
  },
  5: {
    size: 24, color: "#8B5CF6", fillOpacity: 0.08, fontSize: 10, fontWeight: 600,
    rings: [
      { r: 10, stroke: 2, opacity: 0.9 },
    ],
  },
  8: {
    size: 26, color: "#F59E0B", fillOpacity: 0.08, fontSize: 11, fontWeight: 600,
    rings: [
      { r: 11, stroke: 2, opacity: 1 },
      { r: 8, stroke: 1, opacity: 0.3, dash: "2 2" },
    ],
  },
  13: {
    size: 28, color: "#EF4444", fillOpacity: 0.08, fontSize: 11, fontWeight: 700,
    rings: [
      { r: 12, stroke: 2.5, opacity: 1 },
      { r: 9, stroke: 1.2, opacity: 0.4, dash: "1.5 1.5" },
    ],
  },
};

export function PointsBadge({ points, className }: { points: number | null; className?: string }) {
  if (points == null) return null;
  const c = configs[points] ?? configs[3];
  const center = c.size / 2;

  return (
    <svg width={c.size} height={c.size} viewBox={`0 0 ${c.size} ${c.size}`} className={`shrink-0 ${className ?? ""}`}>
      {c.rings.map((ring, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={ring.r}
          fill={i === 0 ? c.color : "none"}
          fillOpacity={i === 0 ? c.fillOpacity : 0}
          stroke={c.color}
          strokeWidth={ring.stroke}
          opacity={ring.opacity}
          strokeDasharray={ring.dash}
          strokeLinecap="round"
        />
      ))}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill={c.color}
        fontSize={c.fontSize}
        fontWeight={c.fontWeight}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {points}
      </text>
    </svg>
  );
}

export function PointsPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {FIBONACCI.map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? null : n)}
          className={`rounded-md transition-all ${
            value === n
              ? "bg-surface ring-2 ring-accent ring-offset-1 scale-110"
              : "hover:bg-content-bg hover:scale-105"
          }`}
          style={{ padding: 2 }}
        >
          <PointsBadge points={n} />
        </button>
      ))}
    </div>
  );
}
