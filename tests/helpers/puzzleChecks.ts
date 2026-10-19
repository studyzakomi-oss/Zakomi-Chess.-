import { Chess, tryUci } from '../../src/core/chess/game';
import { flipTurn, squaresAnswer } from '../../src/core/puzzles/answers';
import { scoreValue, type UciEngine } from '../../src/core/engine/uci';
import type { Puzzle } from '../../src/content/types';

const DEPTH = 18;
const TOLERANCE = 60;
const MARGIN = 40;

/** Returns a list of problems (empty when the puzzle is sound). */
export function staticProblems(p: Puzzle): string[] {
  const errs: string[] = [];
  let c: Chess;
  try {
    c = new Chess(p.fen);
  } catch (e) {
    return [`invalid FEN: ${e}`];
  }
  try {
    if (new Chess(flipTurn(p.fen)).inCheck()) errs.push('side not to move is in check (illegal position)');
  } catch {
    /* flipped FEN may be rejected only when it is already illegal */
  }
  if (c.isGameOver() && p.kind !== 'squares' && !(p.kind === 'choice' && p.query.type === 'status')) errs.push('position is already over');
  if (p.kind === 'move') {
    const g = new Chess(p.fen);
    for (const u of p.line) if (!tryUci(g, u)) errs.push(`illegal move in line: ${u}`);
    for (const u of p.accept ?? []) if (!tryUci(new Chess(p.fen), u)) errs.push(`illegal accepted move: ${u}`);
    if (p.goal === 'mate' && !g.isCheckmate()) errs.push('mate line does not end in checkmate');
    const first = new Chess(p.fen);
    const m = tryUci(first, p.line[0]);
    if (p.goal === 'check' && !first.inCheck()) errs.push('check goal: first move does not give check');
    if (p.goal === 'promote' && m?.promotion !== 'q') errs.push('promote goal: first move does not promote');
  }
  if (p.kind === 'squares' && squaresAnswer(p).length === 0) errs.push('squares answer is empty');
  if (p.kind === 'choice' && (p.query.type === 'moves' || p.query.type === 'threat')) {
    const fen = p.query.type === 'threat' ? flipTurn(p.fen) : p.fen;
    for (const u of p.query.options) if (!tryUci(new Chess(fen), u)) errs.push(`illegal option ${u}`);
    if (!p.query.options.includes(p.query.correct)) errs.push('correct option missing');
  }
  return errs;
}

async function optionScores(engine: UciEngine, fen: string, options: string[]) {
  const out: Record<string, number> = {};
  for (const o of options) {
    const r = await engine.search({ fen, depth: DEPTH, searchMoves: [o] });
    out[o] = scoreValue(r.lines[0]);
  }
  return out;
}

export async function engineProblems(engine: UciEngine, p: Puzzle): Promise<string[]> {
  const errs: string[] = [];
  const q = p.kind === 'choice' ? p.query : null;
  if (q && (q.type === 'moves' || q.type === 'threat')) {
    const fen = q.type === 'threat' ? flipTurn(p.fen) : p.fen;
    const s = await optionScores(engine, fen, q.options);
    const correct = s[q.correct];
    const others = q.options.filter((o) => o !== q.correct).map((o) => s[o]);
    const worstMode = q.type === 'moves' && q.mode === 'worst';
    const ok = worstMode ? others.every((v) => v - correct >= MARGIN) : others.every((v) => correct - v >= MARGIN);
    if (!ok) errs.push(`option scores do not single out the answer: ${JSON.stringify(s)}`);
  }
  if (p.kind === 'move') {
    if (p.goal === 'mate') {
      const g = new Chess(p.fen);
      for (let i = 0; i < p.line.length; i += 2) {
        const need = Math.ceil((p.line.length - i) / 2);
        const r = await engine.search({ fen: g.fen(), depth: DEPTH });
        if (r.lines[0]?.mate !== need) errs.push(`ply ${i}: engine mate ${r.lines[0]?.mate}, expected ${need}`);
        tryUci(g, p.line[i]);
        if (p.line[i + 1]) tryUci(g, p.line[i + 1]);
      }
    } else if (p.goal === 'best') {
      const r = await engine.search({ fen: p.fen, depth: DEPTH, multipv: 6 });
      const best = scoreValue(r.lines[0]);
      const good = r.lines.filter((l) => best - scoreValue(l) <= TOLERANCE).map((l) => l.pv[0]);
      if (good.length === r.lines.length && r.lines.length === 6) errs.push('too many equally good moves');
      const expected = new Set([p.line[0], ...(p.accept ?? [])]);
      const goodSet = new Set(good);
      const same = expected.size === goodSet.size && [...expected].every((m) => goodSet.has(m));
      if (!same) errs.push(`accepted moves ${[...expected]} but engine-good moves are ${good} (scores ${r.lines.map((l) => `${l.pv[0]}:${scoreValue(l)}`)})`);
      if (best < 150) errs.push(`solution does not win clearly (score ${best})`);
    }
  }
  return errs;
}
