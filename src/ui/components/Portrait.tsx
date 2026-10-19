import type { CharacterId, Mood } from '../../content/characters';

/**
 * Original vector portraits (placeholder art designed to be swapped for final illustrations:
 * replace an entry in `ART` with an <img> of the same id to use a commissioned asset).
 */
export function Portrait({ id, mood = 'neutral', size = 96, className }: { id: CharacterId; mood?: Mood; size?: number; className?: string }) {
  const Art = ART[id] ?? ART.drone;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`portrait mood-${mood} ${className ?? ''}`} role="img" aria-label={id}>
      <Art mood={mood} />
    </svg>
  );
}

function Eyes({ mood, x1 = 48, x2 = 72, y = 58, color = '#0b1020' }: { mood: Mood; x1?: number; x2?: number; y?: number; color?: string }) {
  if (mood === 'happy' || mood === 'celebrate')
    return (
      <g stroke={color} strokeWidth={3} fill="none" strokeLinecap="round">
        <path d={`M${x1 - 5} ${y + 1} q5 -6 10 0`} />
        <path d={`M${x2 - 5} ${y + 1} q5 -6 10 0`} />
      </g>
    );
  const r = mood === 'surprised' ? 4.2 : 3.2;
  const lid = mood === 'focus' || mood === 'think';
  return (
    <g fill={color}>
      <circle cx={x1} cy={y} r={r} />
      <circle cx={x2} cy={y} r={r} />
      <circle cx={x1 + 1.2} cy={y - 1.2} r={1} fill="#fff" />
      <circle cx={x2 + 1.2} cy={y - 1.2} r={1} fill="#fff" />
      {lid && (
        <g stroke={color} strokeWidth={2.5} strokeLinecap="round">
          <path d={`M${x1 - 6} ${y - 7} l11 ${mood === 'focus' ? 2 : -1}`} />
          <path d={`M${x2 + 6} ${y - 7} l-11 ${mood === 'focus' ? 2 : -1}`} />
        </g>
      )}
      {mood === 'sad' && (
        <g stroke={color} strokeWidth={2.5} strokeLinecap="round">
          <path d={`M${x1 - 6} ${y - 6} l10 -3`} />
          <path d={`M${x2 + 6} ${y - 6} l-10 -3`} />
        </g>
      )}
    </g>
  );
}

function Mouth({ mood, x = 60, y = 76, color = '#0b1020' }: { mood: Mood; x?: number; y?: number; color?: string }) {
  switch (mood) {
    case 'happy':
    case 'celebrate':
      return <path d={`M${x - 9} ${y - 2} q9 10 18 0 z`} fill={color} />;
    case 'surprised':
      return <ellipse cx={x} cy={y} rx={4} ry={5} fill={color} />;
    case 'sad':
      return <path d={`M${x - 8} ${y + 3} q8 -7 16 0`} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'think':
      return <path d={`M${x - 6} ${y} l12 -2`} stroke={color} strokeWidth={3} strokeLinecap="round" />;
    default:
      return <path d={`M${x - 7} ${y} q7 4 14 0`} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />;
  }
}

const ZBadge = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-9} y={-9} width={18} height={18} rx={4} fill="#0a1a4a" stroke="#38bdf8" strokeWidth={1.2} />
    <path d="M-5 -5h10l-10 10h10" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
  </g>
);

type ArtFn = (p: { mood: Mood }) => JSX.Element;

const ART: Record<CharacterId, ArtFn> = {
  zakomi: ({ mood }) => (
    <g>
      <circle cx={60} cy={60} r={58} fill="#0b1a44" />
      <circle cx={60} cy={60} r={58} fill="url(#zk-glow)" opacity={0.6} />
      <defs>
        <radialGradient id="zk-glow" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#0b1a44" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* daraa (wide robe) */}
      <path d="M14 120c2-22 18-34 46-34s44 12 46 34z" fill="#f8fbff" />
      <path d="M40 92c6 8 34 8 40 0l-3 28H43z" fill="#2563eb" />
      <path d="M47 96c4 4 22 4 26 0" stroke="#bfdbfe" strokeWidth={1.5} fill="none" />
      <path d="M50 102h20M52 108h16" stroke="#93c5fd" strokeWidth={1.3} />
      {/* tech bag strap */}
      <path d="M22 98l66 22" stroke="#111827" strokeWidth={5} />
      <circle cx={52} cy={108} r={3} fill="#38bdf8" />
      <ZBadge x={88} y={104} s={0.8} />
      {/* face */}
      <ellipse cx={60} cy={62} rx={21} ry={24} fill="#8a5a3c" />
      {/* turban */}
      <path d="M36 54c-2-20 12-30 24-30s27 9 24 30c-6-6-14-9-24-9s-18 3-24 9z" fill="#14213d" />
      <path d="M38 46c8-6 36-6 44 0M37 52c10-6 36-6 46 0" stroke="#24345c" strokeWidth={2.5} fill="none" />
      <path d="M83 50c6 6 6 20 0 30" stroke="#14213d" strokeWidth={6} fill="none" strokeLinecap="round" />
      <ZBadge x={60} y={36} s={0.55} />
      <Eyes mood={mood} y={60} />
      <Mouth mood={mood} y={75} />
      {mood === 'celebrate' && <path d="M14 30l6 4M106 30l-6 4M20 16l3 6M100 16l-3 6" stroke="#fde047" strokeWidth={3} strokeLinecap="round" />}
    </g>
  ),
  ustad: ({ mood }) => (
    <g>
      <circle cx={60} cy={60} r={58} fill="#071437" />
      <path d="M100 18l-6 92" stroke="#7dd3fc" strokeWidth={3} opacity={0.8} />
      <circle cx={100} cy={16} r={6} fill="#7dd3fc" opacity={0.9} />
      <path d="M12 120c2-22 18-34 48-34s46 12 48 34z" fill="#1e3a8a" />
      <path d="M44 90l16 30 16-30" stroke="#e0f2fe" strokeWidth={2} fill="none" />
      <path d="M50 98h20M53 106h14" stroke="#e0f2fe" strokeWidth={1.3} />
      <ellipse cx={60} cy={60} rx={21} ry={24} fill="#7a4e33" />
      {/* beard */}
      <path d="M40 64c2 22 12 30 20 30s18-8 20-30c-6 8-12 10-20 10s-14-2-20-10z" fill="#e5e7eb" />
      <path d="M36 52c-2-20 12-30 24-30s27 9 24 30c-6-6-14-9-24-9s-18 3-24 9z" fill="#030712" />
      <path d="M38 44c8-6 36-6 44 0" stroke="#1f2937" strokeWidth={2.5} fill="none" />
      <ZBadge x={60} y={35} s={0.5} />
      <g stroke="#cbd5e1" strokeWidth={1.8} fill="none">
        <circle cx={49} cy={58} r={6.5} />
        <circle cx={71} cy={58} r={6.5} />
        <path d="M55.5 58h9" />
      </g>
      <Eyes mood={mood} x1={49} x2={71} y={58} />
      <Mouth mood={mood} y={74} color="#4b2e1f" />
    </g>
  ),
  lumo: ({ mood }) => (
    <g>
      <circle cx={60} cy={60} r={58} fill="#082f49" />
      <circle cx={60} cy={62} r={34} fill="#0ea5e9" />
      <circle cx={60} cy={62} r={34} fill="#fff" opacity={0.15} />
      <circle cx={60} cy={62} r={44} fill="none" stroke="#fde047" strokeWidth={2} strokeDasharray="4 7" />
      <path d="M60 20l4 10h-8z M60 104l4-10h-8z" fill="#fde047" />
      <Eyes mood={mood} y={58} color="#06213a" />
      <Mouth mood={mood} y={74} color="#06213a" />
    </g>
  ),
  nova: ({ mood }) => (
    <g>
      <circle cx={60} cy={60} r={58} fill="#2e1065" />
      <path d="M60 6l6 18 18-6-10 16 18 8-20 4 6 18-18-12-18 12 6-18-20-4 18-8-10-16 18 6z" fill="#7c3aed" opacity={0.45} />
      <path d="M16 120c3-20 18-32 44-32s41 12 44 32z" fill="#4c1d95" />
      <ellipse cx={60} cy={62} rx={22} ry={25} fill="#c08457" />
      <path d="M36 60c0-24 12-34 24-34s24 10 24 34l-6-8H42z" fill="#a855f7" />
      <path d="M40 54h40" stroke="#f472b6" strokeWidth={3} />
      <path d="M84 40l14-12-4 18z" fill="#f472b6" />
      <Eyes mood={mood} y={62} />
      <Mouth mood={mood} y={78} />
    </g>
  ),
  shadow: ({ mood }) => (
    <g>
      <circle cx={60} cy={60} r={58} fill="#030712" />
      <path d="M22 120c0-50 14-94 38-94s38 44 38 94z" fill="#111827" />
      <ellipse cx={60} cy={64} rx={20} ry={24} fill="#000" />
      <Eyes mood={mood} y={60} color="#22d3ee" />
    </g>
  ),
  architect: ({ mood }) => (
    <g>
      <circle cx={60} cy={60} r={58} fill="#042f2e" />
      <path d="M10 30h100M10 50h100M10 70h100M30 10v100M50 10v100M70 10v100M90 10v100" stroke="#115e59" strokeWidth={1} />
      <rect x={34} y={34} width={52} height={54} rx={10} fill="#0f766e" stroke="#a7f3d0" strokeWidth={2} />
      <rect x={40} y={50} width={40} height={16} rx={4} fill="#022c22" />
      <Eyes mood={mood} y={58} color="#a7f3d0" />
      <Mouth mood={mood} y={78} color="#a7f3d0" />
      <path d="M60 34V22M54 22h12" stroke="#a7f3d0" strokeWidth={2} />
    </g>
  ),
  oracle: ({ mood }) => (
    <g>
      <circle cx={60} cy={60} r={58} fill="#451a03" />
      <circle cx={60} cy={56} r={40} fill="none" stroke="#fde68a" strokeWidth={2} opacity={0.8} />
      <path d="M18 120c3-22 18-34 42-34s39 12 42 34z" fill="#b45309" />
      <path d="M34 100c0-44 10-70 26-70s26 26 26 70z" fill="#78350f" />
      <ellipse cx={60} cy={62} rx={18} ry={22} fill="#a16207" />
      <Eyes mood={mood} y={60} />
      <Mouth mood={mood} y={76} />
      <path d="M52 40q8-6 16 0q-8 6-16 0z" fill="#fde68a" />
      <circle cx={60} cy={40} r={2} fill="#451a03" />
    </g>
  ),
  vektor: ({ mood }) => (
    <g>
      <circle cx={60} cy={60} r={58} fill="#0f172a" />
      <path d="M36 30h48l10 20-8 40H34l-8-40z" fill="#334155" stroke="#94a3b8" strokeWidth={2} />
      <rect x={36} y={50} width={48} height={14} rx={3} fill="#450a0a" />
      <Eyes mood={mood} y={57} color="#f87171" />
      <path d="M46 78h28" stroke="#f87171" strokeWidth={mood === 'happy' ? 4 : 2} />
    </g>
  ),
  grandmaster: ({ mood }) => (
    <g>
      <circle cx={60} cy={60} r={58} fill="#020617" />
      <path d="M38 34l8 10 14-16 14 16 8-10v16H38z" fill="#facc15" />
      <path d="M16 120c3-22 18-34 44-34s41 12 44 34z" fill="#0f172a" stroke="#facc15" strokeWidth={1.5} />
      <ellipse cx={60} cy={66} rx={21} ry={24} fill="#1e293b" />
      <Eyes mood={mood} y={64} color="#facc15" />
      <Mouth mood={mood} y={80} color="#facc15" />
    </g>
  ),
  drone: ({ mood }) => (
    <g>
      <circle cx={60} cy={60} r={58} fill="#0c1a3d" />
      <path d="M20 40h30M70 40h30" stroke="#93c5fd" strokeWidth={4} strokeLinecap="round" />
      <path d="M35 40v12M85 40v12" stroke="#93c5fd" strokeWidth={3} />
      <circle cx={60} cy={66} r={26} fill="#1e3a8a" stroke="#93c5fd" strokeWidth={2} />
      <rect x={42} y={56} width={36} height={14} rx={7} fill="#020617" />
      <Eyes mood={mood} y={63} x1={52} x2={68} color="#93c5fd" />
    </g>
  ),
};
