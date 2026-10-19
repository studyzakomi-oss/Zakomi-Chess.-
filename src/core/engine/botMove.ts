import { Chess, PIECE_VALUE, phaseOf, tryUci, kingSquare, other, type Move, type Color } from '../chess/game';
import { hangingPieces } from '../chess/attacks';
import { scoreValue, type PvLine } from './uci';
import type { BotProfile, BotStyle } from './botProfiles';

export type Rng = () => number;

export interface MoveFeatures {
  capture: number;
  check: boolean;
  sacrifice: boolean;
  center: number;
  development: boolean;
  castle: boolean;
  pawnStorm: boolean;
  trade: boolean;
  defends: boolean;
  kingActivity: boolean;
  pawnPush: boolean;
}

const CENTER = new Set(['d4', 'd5', 'e4', 'e5']);
const RING = new Set(['c3', 'd3', 'e3', 'f3', 'c4', 'f4', 'c5', 'f5', 'c6', 'd6', 'e6', 'f6']);

export function moveFeatures(fen: string, mv: Move): MoveFeatures {
  const before = new Chess(fen);
  const after = new Chess(fen);
  tryUci(after, mv.from + mv.to + (mv.promotion ?? ''));
  const me: Color = mv.color;
  const phase = phaseOf(before);
  const captured = mv.captured ? PIECE_VALUE[mv.captured] : 0;
  const moved = PIECE_VALUE[mv.piece];
  const enPrise = hangingPieces(after, me).some((h) => h.square === mv.to);
  const enemyKing = kingSquare(before, other(me));
  const fileDist = enemyKing ? Math.abs(enemyKing.charCodeAt(0) - mv.to.charCodeAt(0)) : 8;
  const hangingBefore = hangingPieces(before, me).reduce((s, h) => s + h.value, 0);
  const hangingAfter = hangingPieces(after, me).reduce((s, h) => s + h.value, 0);
  const homeRank = me === 'w' ? '1' : '8';
  return {
    capture: captured,
    check: after.inCheck(),
    sacrifice: enPrise && moved > captured && mv.piece !== 'p',
    center: CENTER.has(mv.to) ? 2 : RING.has(mv.to) ? 1 : 0,
    development: phase === 'opening' && (mv.piece === 'n' || mv.piece === 'b') && mv.from[1] === homeRank,
    castle: mv.isKingsideCastle() || mv.isQueensideCastle(),
    pawnStorm: mv.piece === 'p' && fileDist <= 1 && phase !== 'endgame',
    trade: captured > 0 && captured === moved,
    defends: hangingAfter < hangingBefore,
    kingActivity: phase === 'endgame' && mv.piece === 'k' && (CENTER.has(mv.to) || RING.has(mv.to)),
    pawnPush: phase === 'endgame' && mv.piece === 'p',
  };
}

export function styleBonus(f: MoveFeatures, s: BotStyle, scale: number): number {
  const raw =
    s.aggression * ((f.check ? 0.6 : 0) + (f.capture ? 0.3 : 0) + (f.sacrifice ? 0.8 : 0) + (f.pawnStorm ? 0.3 : 0)) +
    s.positional * (f.center * 0.25 + (f.development ? 0.4 : 0) + (f.castle ? 0.5 : 0)) +
    s.defense * ((f.defends ? 0.7 : 0) + (f.castle ? 0.4 : 0) - (f.sacrifice ? 0.5 : 0)) +
    s.simplify * (f.trade ? 0.7 : 0) +
    s.endgame * ((f.kingActivity ? 0.6 : 0) + (f.pawnPush ? 0.4 : 0));
  return Math.max(-1, Math.min(1.5, raw)) * scale;
}

function softmaxPick<T>(items: T[], utility: (t: T) => number, temperature: number, rng: Rng): T {
  const u = items.map(utility);
  const max = Math.max(...u);
  const w = u.map((x) => Math.exp((x - max) / Math.max(1, temperature)));
  const total = w.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= w[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export type ChoiceKind = 'engine' | 'style' | 'designed-error' | 'beginner-error';

export interface BotChoice {
  uci: string;
  kind: ChoiceKind;
  /** Centipawns lost compared with the engine's best line (a lower bound when outside the MultiPV list). */
  loss: number;
}

/**
 * Picks a move for a bot. Candidates come from the engine's MultiPV lines (scores from the
 * bot's point of view). Normal play: softmax over (score + style bonus) among moves within
 * `maxLoss`. With probability `errorRate`, a *designed* error is made: a lower-ranked engine
 * line inside `errorMaxLoss`, or — for beginner bots — a greedy pick over all legal moves.
 * The result is always validated as a legal move by chess.js.
 */
export function chooseBotMove(fen: string, lines: PvLine[], bot: BotProfile, rng: Rng = Math.random): BotChoice {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) throw new Error('no legal moves');
  const byUci = new Map(legal.map((m) => [m.from + m.to + (m.promotion ?? ''), m]));
  const cands = lines.filter((l) => l.pv[0] && byUci.has(l.pv[0]));
  if (cands.length === 0) {
    const m = legal[Math.floor(rng() * legal.length)];
    return { uci: m.from + m.to + (m.promotion ?? ''), kind: 'beginner-error', loss: 0 };
  }
  const best = scoreValue(cands[0]);
  const mateFound = cands[0].mate !== undefined && cands[0].mate > 0;

  // A forced mate is never thrown away by strong bots; weak bots still might miss it.
  const errorRoll = rng() < bot.errorRate && !(mateFound && bot.nominal >= 1400);
  if (errorRoll) {
    if (bot.errorMaxLoss === null) {
      const m = softmaxPick(
        legal,
        (mv) => (mv.captured ? PIECE_VALUE[mv.captured] * 60 : 0) + (mv.san.includes('+') ? 40 : 0),
        60,
        rng,
      );
      const uci = m.from + m.to + (m.promotion ?? '');
      const line = cands.find((l) => l.pv[0] === uci);
      // Outside the candidate list the exact loss is unknown; report the lower bound.
      const floor = best - scoreValue(cands[cands.length - 1]);
      return { uci, kind: 'beginner-error', loss: line ? best - scoreValue(line) : floor };
    }
    const window = cands.slice(1).filter((l) => best - scoreValue(l) <= bot.errorMaxLoss!);
    if (window.length > 0) {
      const l = window[Math.floor(rng() * window.length)];
      return { uci: l.pv[0], kind: 'designed-error', loss: best - scoreValue(l) };
    }
  }

  const pool = cands.filter((l) => best - scoreValue(l) <= bot.maxLoss);
  const util = (l: PvLine) => {
    const s = Math.max(-3000, Math.min(3000, scoreValue(l)));
    return s + styleBonus(moveFeatures(fen, byUci.get(l.pv[0])!), bot.style, bot.styleScale);
  };
  const pick = softmaxPick(pool, util, bot.temperature, rng);
  return { uci: pick.pv[0], kind: pick === cands[0] ? 'engine' : 'style', loss: best - scoreValue(pick) };
}

/** Deterministic PRNG (mulberry32) for reproducible tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
