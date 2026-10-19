/**
 * Opponent personalities. Every bot gets its candidate moves from the same real Stockfish
 * search (MultiPV) and then chooses among them according to a documented style and strength
 * model (see botMove.ts). The `nominal` number is the in-game *design target* for that bot,
 * not a measured human or FIDE rating.
 */

export type BotId =
  | 'lumo'
  | 'nova'
  | 'shadow'
  | 'architect'
  | 'oracle'
  | 'vektor'
  | 'grandmaster'
  | 'drone';

export interface BotStyle {
  aggression: number;
  positional: number;
  defense: number;
  simplify: number;
  endgame: number;
}

export interface BotStrength {
  /** Search depth for the candidate list. */
  depth: number;
  multipv: number;
  /** Softmax temperature in centipawns: higher = more varied (weaker) choices. */
  temperature: number;
  /** Moves losing more than this (vs the best line) are never picked in normal play. */
  maxLoss: number;
  /** Probability per move of a designed, human-like error. */
  errorRate: number;
  /** Error window in cp; `null` = beginner-style error over all legal moves (greedy). */
  errorMaxLoss: number | null;
  /** Maximum style bonus in centipawns. */
  styleScale: number;
}

export interface BotProfile extends BotStrength {
  id: BotId;
  nominal: number;
  style: BotStyle;
}

const BALANCED: BotStyle = { aggression: 0.3, positional: 0.3, defense: 0.3, simplify: 0.2, endgame: 0.3 };

/** Strength curve shared by all bots, interpolated on the nominal in-game rating. */
export function strengthFor(nominal: number): BotStrength {
  const pts: [number, BotStrength][] = [
    [250, { depth: 1, multipv: 10, temperature: 220, maxLoss: 900, errorRate: 0.45, errorMaxLoss: null, styleScale: 40 }],
    [500, { depth: 2, multipv: 10, temperature: 170, maxLoss: 700, errorRate: 0.3, errorMaxLoss: null, styleScale: 45 }],
    [800, { depth: 4, multipv: 8, temperature: 120, maxLoss: 450, errorRate: 0.2, errorMaxLoss: 600, styleScale: 50 }],
    [1100, { depth: 6, multipv: 7, temperature: 80, maxLoss: 300, errorRate: 0.12, errorMaxLoss: 400, styleScale: 50 }],
    [1400, { depth: 8, multipv: 6, temperature: 55, maxLoss: 200, errorRate: 0.08, errorMaxLoss: 300, styleScale: 45 }],
    [1700, { depth: 10, multipv: 5, temperature: 35, maxLoss: 120, errorRate: 0.05, errorMaxLoss: 200, styleScale: 40 }],
    [2000, { depth: 12, multipv: 4, temperature: 20, maxLoss: 70, errorRate: 0.025, errorMaxLoss: 120, styleScale: 30 }],
    [2400, { depth: 15, multipv: 3, temperature: 8, maxLoss: 30, errorRate: 0, errorMaxLoss: 60, styleScale: 15 }],
  ];
  if (nominal <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [r1, s1] = pts[i];
    const [r0, s0] = pts[i - 1];
    if (nominal <= r1) {
      const t = (nominal - r0) / (r1 - r0);
      const lerp = (a: number, b: number) => a + (b - a) * t;
      return {
        depth: Math.round(lerp(s0.depth, s1.depth)),
        multipv: Math.round(lerp(s0.multipv, s1.multipv)),
        temperature: lerp(s0.temperature, s1.temperature),
        maxLoss: lerp(s0.maxLoss, s1.maxLoss),
        errorRate: lerp(s0.errorRate, s1.errorRate),
        errorMaxLoss: s0.errorMaxLoss === null || s1.errorMaxLoss === null ? (t < 0.5 ? s0.errorMaxLoss : s1.errorMaxLoss) : lerp(s0.errorMaxLoss, s1.errorMaxLoss),
        styleScale: lerp(s0.styleScale, s1.styleScale),
      };
    }
  }
  return pts[pts.length - 1][1];
}

const STYLES: Record<BotId, BotStyle> = {
  lumo: { aggression: 0.5, positional: 0.1, defense: 0.1, simplify: 0.1, endgame: 0.1 },
  nova: { aggression: 1, positional: 0.1, defense: 0, simplify: 0, endgame: 0.2 },
  shadow: { aggression: 0.1, positional: 0.3, defense: 1, simplify: 0.2, endgame: 0.3 },
  architect: { aggression: 0.1, positional: 1, defense: 0.4, simplify: 0.2, endgame: 0.3 },
  oracle: { aggression: 0.1, positional: 0.4, defense: 0.3, simplify: 0.9, endgame: 1 },
  vektor: { aggression: 0.5, positional: 0.4, defense: 0.3, simplify: 0.2, endgame: 0.4 },
  grandmaster: BALANCED,
  drone: BALANCED,
};

export const BOT_NOMINAL: Record<Exclude<BotId, 'drone'>, number> = {
  lumo: 450,
  nova: 1150,
  shadow: 1350,
  architect: 1550,
  oracle: 1750,
  vektor: 1950,
  grandmaster: 2500,
};

export function makeBot(id: BotId, nominal?: number): BotProfile {
  const n = nominal ?? (id === 'drone' ? 1000 : BOT_NOMINAL[id]);
  return { id, nominal: n, style: STYLES[id], ...strengthFor(n) };
}
