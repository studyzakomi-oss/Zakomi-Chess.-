import {
  Chess,
  PIECE_VALUE,
  material,
  phaseOf,
  tryUci,
  uciLineToSan,
  other,
  type Color,
  type Phase,
  type PieceSymbol,
  type Square,
} from '../chess/game';
import { forkTargets, hangingPieces } from '../chess/attacks';
import type { PvLine, SearchResult, UciEngine } from './uci';

/** Win probability (%) for White from a centipawn score — the logistic model used by Lichess. */
export function winPct(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Per-move accuracy from the win% drop (Lichess formula). */
export function moveAccuracy(winBefore: number, winAfter: number): number {
  const a = 103.1668 * Math.exp(-0.04354 * Math.max(0, winBefore - winAfter)) - 3.1669;
  return Math.max(0, Math.min(100, a));
}

export type MoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

/** Thresholds on the mover’s win% drop (documented in docs/ANALYSIS.md). */
export const THRESHOLDS = { inaccuracy: 10, mistake: 20, blunder: 30 };

export function classify(drop: number, isBest: boolean): MoveClass {
  if (isBest || drop < 1) return 'best';
  if (drop >= THRESHOLDS.blunder) return 'blunder';
  if (drop >= THRESHOLDS.mistake) return 'mistake';
  if (drop >= THRESHOLDS.inaccuracy) return 'inaccuracy';
  return 'good';
}

export type ErrorType = 'tactical' | 'planning' | 'calculation' | 'time' | 'endgame';

export type Motif =
  | 'hung-piece'
  | 'allowed-mate'
  | 'missed-mate'
  | 'missed-win-material'
  | 'missed-fork'
  | 'allowed-fork'
  | 'allowed-capture';

export interface PositionEval {
  /** White-POV win% (0–100). */
  win: number;
  /** White-POV centipawns (mates clamped to ±10000). */
  cp: number;
  mate?: number;
  best?: string;
  pv: string[];
  second?: PvLine;
}

export interface PlyAnalysis {
  ply: number;
  color: Color;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  phase: Phase;
  before: PositionEval;
  after: PositionEval;
  /** Mover-POV win% before/after and the drop. */
  winBefore: number;
  winAfter: number;
  drop: number;
  accuracy: number;
  cls: MoveClass;
  bestUci?: string;
  bestSan?: string;
  bestLineSan: string[];
  /** Opponent’s best reply after the played move (what the move allowed). */
  threatSan?: string;
  threatLineSan: string[];
  errorType?: ErrorType;
  motifs: Motif[];
  hung?: { square: Square; type: PieceSymbol };
  timeMs?: number;
}

export interface PhaseStats {
  moves: number;
  accuracy: number;
  errors: number;
}

export interface GameAnalysis {
  depth: number;
  engine: string;
  plies: PlyAnalysis[];
  accuracy: Record<Color, number>;
  counts: Record<Color, Record<MoveClass, number>>;
  /** Indices (into plies) of the player’s most costly moments, worst first (max 3). */
  keyMoments: number[];
  /** Index of the move that swung the evaluation the most (either side). */
  turningPoint: number | null;
  byPhase: Record<Phase, PhaseStats>;
  errorTypes: Record<ErrorType, number>;
}

export function evalFromSearch(fen: string, r: SearchResult): PositionEval {
  const c = new Chess(fen);
  if (c.isCheckmate()) return { win: c.turn() === 'w' ? 0 : 100, cp: c.turn() === 'w' ? -10000 : 10000, pv: [] };
  if (c.isDraw() || c.isStalemate()) return { win: 50, cp: 0, pv: [] };
  const l = r.lines[0];
  const sign = c.turn() === 'w' ? 1 : -1;
  if (!l) return { win: 50, cp: 0, pv: [] };
  if (l.mate !== undefined) {
    const whiteMates = l.mate * sign > 0;
    return { win: whiteMates ? 100 : 0, cp: whiteMates ? 10000 : -10000, mate: l.mate * sign, best: l.pv[0], pv: l.pv, second: r.lines[1] };
  }
  const cp = (l.cp ?? 0) * sign;
  return { win: winPct(cp), cp, best: l.pv[0], pv: l.pv, second: r.lines[1] };
}

/** Material change (for `color`) along the first `plies` moves of a line. */
export function materialSwing(fen: string, line: string[], color: Color, plies = 4): number {
  const c = new Chess(fen);
  const m0 = material(c);
  for (const u of line.slice(0, plies)) if (!tryUci(c, u)) break;
  const m1 = material(c);
  return m1[color] - m1[other(color)] - (m0[color] - m0[other(color)]);
}

function detectMotifs(p: Omit<PlyAnalysis, 'motifs' | 'errorType'>): { motifs: Motif[]; hung?: PlyAnalysis['hung'] } {
  const motifs: Motif[] = [];
  const me = p.color;
  let hung: PlyAnalysis['hung'];
  if (p.after.mate !== undefined && (me === 'w' ? p.after.mate < 0 : p.after.mate > 0)) motifs.push('allowed-mate');
  if (p.before.mate !== undefined && (me === 'w' ? p.before.mate > 0 : p.before.mate < 0) && p.cls !== 'best') motifs.push('missed-mate');

  const afterBoard = new Chess(p.fenAfter);
  const beforeBoard = new Chess(p.fenBefore);
  const hangingBefore = new Set(hangingPieces(beforeBoard, me).map((h) => h.square));
  const newHanging = hangingPieces(afterBoard, me).filter((h) => !hangingBefore.has(h.square) && h.value >= 3);
  const threatSwing = p.after.pv.length ? materialSwing(p.fenAfter, p.after.pv, me) : 0;
  if (newHanging.length && threatSwing <= -2) {
    motifs.push('hung-piece');
    hung = { square: newHanging[0].square, type: newHanging[0].type };
  } else if (threatSwing <= -2) motifs.push('allowed-capture');

  if (p.after.pv[0]) {
    const t = new Chess(p.fenAfter);
    const mv = tryUci(t, p.after.pv[0]);
    if (mv && forkTargets(t, mv.to).length >= 2 && threatSwing <= -2) motifs.push('allowed-fork');
  }
  if (p.bestUci && p.bestUci !== p.uci) {
    const bestSwing = materialSwing(p.fenBefore, p.before.pv, me);
    if (bestSwing >= 2 && !motifs.includes('missed-mate')) motifs.push('missed-win-material');
    const b = new Chess(p.fenBefore);
    const bm = tryUci(b, p.bestUci);
    if (bm && bestSwing >= 2 && forkTargets(b, bm.to).length >= 2) motifs.push('missed-fork');
  }
  return { motifs, hung };
}

export function errorTypeOf(p: PlyAnalysis, opts: { clockMs?: number; initialMs?: number } = {}): ErrorType {
  const forcingAvailable = new Chess(p.fenBefore).moves({ verbose: true }).some((m) => m.captured || m.san.includes('+'));
  if (opts.initialMs && opts.clockMs !== undefined && opts.clockMs < opts.initialMs * 0.1) return 'time';
  if (p.timeMs !== undefined && p.timeMs < 2500 && forcingAvailable && p.drop >= THRESHOLDS.mistake) return 'time';
  if (p.phase === 'endgame') return 'endgame';
  if (p.motifs.length) return 'tactical';
  if (p.san.includes('x') || p.san.includes('+')) return 'calculation';
  return 'planning';
}

export interface AnalyzeInput {
  startFen: string;
  moves: string[];
  /** Milliseconds spent on each ply (optional). */
  times?: number[];
  /** Mover’s remaining clock after each ply (optional). */
  clocks?: number[];
  initialMs?: number;
  playerColor?: Color;
}

/** Full-game analysis driven by Stockfish (each position searched once at `depth`). */
export async function analyzeGame(
  engine: UciEngine,
  input: AnalyzeInput,
  opts: { depth?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<GameAnalysis> {
  const depth = opts.depth ?? 11;
  const fens: string[] = [input.startFen];
  const sans: string[] = [];
  const c = new Chess(input.startFen);
  for (const u of input.moves) {
    const m = tryUci(c, u);
    if (!m) break;
    sans.push(m.san);
    fens.push(c.fen());
  }
  const evals: PositionEval[] = [];
  for (let i = 0; i < fens.length; i++) {
    const pos = new Chess(fens[i]);
    const r = pos.isGameOver() ? { bestmove: null, lines: [] } : await engine.search({ fen: fens[i], depth, multipv: 2 });
    evals.push(evalFromSearch(fens[i], r));
    opts.onProgress?.(i + 1, fens.length);
  }
  return buildAnalysis(input, fens, sans, evals, depth, engine.name);
}

export function buildAnalysis(
  input: AnalyzeInput,
  fens: string[],
  sans: string[],
  evals: PositionEval[],
  depth: number,
  engineName: string,
): GameAnalysis {
  const plies: PlyAnalysis[] = [];
  for (let i = 0; i < sans.length; i++) {
    const color: Color = new Chess(fens[i]).turn();
    const winBefore = color === 'w' ? evals[i].win : 100 - evals[i].win;
    const winAfter = color === 'w' ? evals[i + 1].win : 100 - evals[i + 1].win;
    const drop = Math.max(0, winBefore - winAfter);
    const uci = input.moves[i];
    const isBest = evals[i].best === uci;
    const base = {
      ply: i,
      color,
      san: sans[i],
      uci,
      fenBefore: fens[i],
      fenAfter: fens[i + 1],
      phase: phaseOf(new Chess(fens[i])),
      before: evals[i],
      after: evals[i + 1],
      winBefore,
      winAfter,
      drop,
      accuracy: moveAccuracy(winBefore, winAfter),
      cls: classify(drop, isBest),
      bestUci: evals[i].best,
      bestSan: evals[i].best ? uciLineToSan(fens[i], [evals[i].best!])[0] : undefined,
      bestLineSan: uciLineToSan(fens[i], evals[i].pv.slice(0, 8)),
      threatSan: evals[i + 1].pv[0] ? uciLineToSan(fens[i + 1], [evals[i + 1].pv[0]])[0] : undefined,
      threatLineSan: uciLineToSan(fens[i + 1], evals[i + 1].pv.slice(0, 6)),
      timeMs: input.times?.[i],
    };
    const { motifs, hung } = detectMotifs(base);
    const ply: PlyAnalysis = { ...base, motifs, hung };
    if (ply.cls === 'mistake' || ply.cls === 'blunder' || ply.cls === 'inaccuracy') {
      ply.errorType = errorTypeOf(ply, { clockMs: input.clocks?.[i], initialMs: input.initialMs });
    }
    plies.push(ply);
  }
  const zero = (): Record<MoveClass, number> => ({ best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 });
  const counts = { w: zero(), b: zero() };
  const accSum = { w: 0, b: 0 };
  const accN = { w: 0, b: 0 };
  for (const p of plies) {
    counts[p.color][p.cls]++;
    accSum[p.color] += p.accuracy;
    accN[p.color]++;
  }
  const player = input.playerColor ?? 'w';
  const mine = plies.filter((p) => p.color === player);
  const keyMoments = [...mine]
    .filter((p) => p.cls === 'blunder' || p.cls === 'mistake' || p.cls === 'inaccuracy')
    .sort((a, b) => b.drop - a.drop)
    .slice(0, 3)
    .map((p) => p.ply);
  let turningPoint: number | null = null;
  let maxSwing = 0;
  for (const p of plies)
    if (p.drop > maxSwing) {
      maxSwing = p.drop;
      turningPoint = p.ply;
    }
  if (maxSwing < THRESHOLDS.inaccuracy) turningPoint = null;
  const phases: Phase[] = ['opening', 'middlegame', 'endgame'];
  const byPhase = Object.fromEntries(
    phases.map((ph) => {
      const ps = mine.filter((p) => p.phase === ph);
      return [
        ph,
        {
          moves: ps.length,
          accuracy: ps.length ? ps.reduce((s, p) => s + p.accuracy, 0) / ps.length : NaN,
          errors: ps.filter((p) => p.cls === 'mistake' || p.cls === 'blunder').length,
        },
      ];
    }),
  ) as Record<Phase, PhaseStats>;
  const errorTypes: Record<ErrorType, number> = { tactical: 0, planning: 0, calculation: 0, time: 0, endgame: 0 };
  for (const p of mine) if (p.errorType && p.cls !== 'inaccuracy') errorTypes[p.errorType]++;
  return {
    depth,
    engine: engineName,
    plies,
    accuracy: { w: accN.w ? accSum.w / accN.w : NaN, b: accN.b ? accSum.b / accN.b : NaN },
    counts,
    keyMoments,
    turningPoint,
    byPhase,
    errorTypes,
  };
}

export { PIECE_VALUE };
