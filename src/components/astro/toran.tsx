/** Festive marigold toran (garland) — pure SVG, tiles across any width. */
export function Toran({ className }: { className?: string }) {
  const W = 120;
  return (
    <div aria-hidden className={className}>
      <svg width="100%" height="64" preserveAspectRatio="none" className="block">
        <defs>
          <radialGradient id="mg-o" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#ffd36b" /><stop offset=".6" stopColor="#ff9a1f" /><stop offset="1" stopColor="#e2690c" /></radialGradient>
          <radialGradient id="mg-y" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#fff2a6" /><stop offset=".6" stopColor="#ffd23f" /><stop offset="1" stopColor="#e7a50f" /></radialGradient>
          <pattern id="toran" width={W} height="64" patternUnits="userSpaceOnUse">
            <path d={`M0 6 Q ${W / 2} 34 ${W} 6`} fill="none" stroke="#c98a1c" strokeWidth="1.4" />
            {Array.from({ length: 7 }, (_, i) => {
              const t = (i + 0.5) / 7;
              const x = t * W;
              const y = 6 + 4 * 28 * t * (1 - t);
              return <circle key={i} cx={x} cy={y} r={i % 2 ? 6 : 7} fill={i % 2 ? "url(#mg-y)" : "url(#mg-o)"} />;
            })}
            <path d={`M${W / 2 - 7} 34 q7 16 14 0 q-7 6 -14 0`} fill="#3f9a4a" />
            <circle cx={W / 2} cy="50" r="5.5" fill="url(#mg-o)" />
            <circle cx={W / 2} cy="60" r="3.5" fill="url(#mg-y)" />
          </pattern>
        </defs>
        <rect width="100%" height="64" fill="url(#toran)" />
      </svg>
    </div>
  );
}
