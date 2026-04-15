export function StoriLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <circle cx="16" cy="16" r="14" fill="none" stroke="#6366F1" strokeWidth="2.5"/>
      <g transform="translate(16, 16.5) scale(0.85)">
        <polyline points="-6,6 0,0 6,6" fill="none" stroke="#6366F1" strokeWidth="2.0" strokeLinecap="square" strokeLinejoin="miter"/>
        <polyline points="-8.5,3.5 0,-5 8.5,3.5" fill="none" stroke="#6366F1" strokeWidth="2.0" strokeLinecap="square" strokeLinejoin="miter"/>
        <polyline points="-11,1 0,-10 11,1" fill="none" stroke="#6366F1" strokeWidth="2.0" strokeLinecap="square" strokeLinejoin="miter"/>
      </g>
    </svg>
  );
}
