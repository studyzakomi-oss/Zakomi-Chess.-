import type { Color, PieceSymbol } from '../../core/chess/game';

/**
 * Original piece set drawn for ZAKOMI CHESS DIMENSIONS (viewBox 0 0 45 45).
 * White pieces: porcelain with navy outline. Black pieces: deep navy with an electric-blue edge.
 */
const BASE = 'M11 39.5h23a1.5 1.5 0 0 0 1.5-1.5v-1a1.5 1.5 0 0 0-1.5-1.5H11A1.5 1.5 0 0 0 9.5 37v1a1.5 1.5 0 0 0 1.5 1.5z';

const SHAPES: Record<PieceSymbol, string[]> = {
  p: ['M22.5 8.5a5 5 0 0 1 3.2 8.85c2.3 1.25 3.8 3.4 3.8 5.65h-2.4c1.2 3.3 3.4 7.3 5.4 12.5H12.5c2-5.2 4.2-9.2 5.4-12.5H15.5c0-2.25 1.5-4.4 3.8-5.65A5 5 0 0 1 22.5 8.5z', BASE],
  r: [
    'M12 9.5h4v3h3v-3h7v3h3v-3h4v7l-3 2.5v11l3 5.5H12l3-5.5V19l-3-2.5z',
    BASE,
    'M15 19h15',
    'M15 30h15',
  ],
  n: [
    'M14 35.5c.5-5 3-8 6-11 1.5-1.5 1-3.5-.5-3.5-2 0-4.5 2.5-6.5 1.5-1.8-.9-1.5-3 0-4.5L20 11l-.5-3.5 3 2.5c7 .5 11.5 6 12 13 .4 5.5-1 9-1.5 12.5z',
    BASE,
  ],
  b: [
    'M22.5 6.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 1 1 0-4.4zM22.5 11c5 3.5 8 7.5 8 12 0 3.2-1.8 5.4-4 6.5l2 6H16l2-6c-2.2-1.1-4-3.3-4-6.5 0-4.5 3-8.5 8.5-12z',
    BASE,
    'M22.5 16.5v7M19 20h7',
  ],
  q: [
    'M9 14a2.2 2.2 0 1 1 .01 0zM16.2 10a2.2 2.2 0 1 1 .01 0zM22.5 8.5a2.2 2.2 0 1 1 .01 0zM28.8 10a2.2 2.2 0 1 1 .01 0zM36 14a2.2 2.2 0 1 1 .01 0z',
    'M9.5 15.5l4.5 12 2.5-14 6 13 6-13 2.5 14 4.5-12-2.5 20h-21z',
    BASE,
    'M13 31h19',
  ],
  k: [
    'M22.5 5v7M19 8.5h7',
    'M22.5 13c-3.5 0-5 3-4.5 6-4-2.5-9.5-.5-9.5 4.5 0 4.5 4 7 5.5 12.5h17c1.5-5.5 5.5-8 5.5-12.5 0-5-5.5-7-9.5-4.5.5-3-1-6-4.5-6z',
    BASE,
    'M14 31h17',
  ],
};

export function PieceSvg({ type, color, className }: { type: PieceSymbol; color: Color; className?: string }) {
  const fill = color === 'w' ? '#f4f8ff' : '#101b3d';
  const stroke = color === 'w' ? '#0b1430' : '#5cc8ff';
  const detail = color === 'w' ? '#0b1430' : '#5cc8ff';
  const [main, ...rest] = SHAPES[type];
  return (
    <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
      <g strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
        {type === 'q' ? (
          <>
            <path d={main} fill={fill} stroke={stroke} />
            <path d={rest[0]} fill={fill} stroke={stroke} />
            <path d={rest[1]} fill={fill} stroke={stroke} />
            <path d={rest[2]} fill="none" stroke={detail} />
          </>
        ) : type === 'k' ? (
          <>
            <path d={main} fill="none" stroke={stroke} strokeWidth={2} />
            <path d={rest[0]} fill={fill} stroke={stroke} />
            <path d={rest[1]} fill={fill} stroke={stroke} />
            <path d={rest[2]} fill="none" stroke={detail} />
          </>
        ) : (
          <>
            <path d={main} fill={fill} stroke={stroke} />
            {rest.map((d, i) => (
              <path key={i} d={d} fill={i === 0 ? fill : 'none'} stroke={i === 0 ? stroke : detail} />
            ))}
            {type === 'n' && <circle cx={25} cy={15} r={1.3} fill={detail} />}
          </>
        )}
      </g>
    </svg>
  );
}
