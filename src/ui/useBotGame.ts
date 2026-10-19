import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, boardOutcome, resignOutcome, timeoutOutcome, tryUci, other, type GameOutcome, type PieceSymbol, type Square } from '../core/chess/game';
import { getEngine } from '../core/engine/engineService';
import { chooseBotMove } from '../core/engine/botMove';
import { makeBot } from '../core/engine/botProfiles';
import { scoreValue } from '../core/engine/uci';
import type { ActiveGame, GameRecord, Profile } from '../storage/profile';
import { addGame, evaluateLevelPass, patchLevel, rateGame, scoreFor } from '../core/training/progress';
import { LEVELS_BY_ID } from '../content/curriculum';
import { useStore } from './store';
import { play } from './sound';

export interface BotSignal {
  /** Bot-POV score after its search (centipawns, mates clamped). */
  score: number;
  gaveCheck: boolean;
  captured: boolean;
}

export function replay(g: ActiveGame): Chess {
  const c = new Chess(g.startFen);
  for (const u of g.moves) tryUci(c, u);
  return c;
}

/** Finalises a game: rating update, level progress, history. Pure (testable). */
export function finalizeGame(p: Profile, g: ActiveGame, out: GameOutcome, now = Date.now()): { profile: Profile; record: GameRecord } {
  const rated = !g.training && g.undosUsed === 0 && g.moves.length >= 2;
  const score = scoreFor(out.result, g.playerColor);
  const after = rated ? rateGame(p.rating, g.botNominal, score) : p.rating;
  const record: GameRecord = {
    id: g.id,
    t: now,
    mode: g.mode,
    levelId: g.levelId,
    bot: g.bot,
    botNominal: g.botNominal,
    playerColor: g.playerColor,
    startFen: g.startFen,
    moves: g.moves,
    times: g.times,
    result: out.result,
    reason: out.reason,
    ratingBefore: p.rating,
    ratingAfter: after,
    rated,
  };
  let np = addGame(p, record);
  if (g.mode === 'level' && g.levelId) {
    np = patchLevel(np, g.levelId, { matchPlayed: true, matchResult: out.result });
    const lv = LEVELS_BY_ID[g.levelId];
    if (lv) np = evaluateLevelPass(np, lv, now);
  }
  if (g.mode === 'placement') np = { ...np, onboarding: { ...np.onboarding, placementGameIds: [...np.onboarding.placementGameIds, g.id] } };
  return { profile: np, record };
}

export function useBotGame(onFinished: (record: GameRecord) => void) {
  const { profile, update } = useStore();
  const g = profile.activeGame;
  const chess = useMemo(() => (g ? replay(g) : null), [g]);
  const [thinking, setThinking] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [signal, setSignal] = useState<BotSignal | null>(null);
  const [now, setNow] = useState(Date.now());
  const turnStart = useRef(Date.now());
  const ended = useRef(false);
  const gid = g?.id;

  useEffect(() => {
    ended.current = false;
    turnStart.current = Date.now();
  }, [gid]);

  const end = useCallback(
    (out: GameOutcome) => {
      if (ended.current) return;
      ended.current = true;
      let rec: GameRecord | null = null;
      update((p) => {
        if (!p.activeGame) return p;
        const r = finalizeGame(p, p.activeGame, out);
        rec = r.record;
        return r.profile;
      });
      play('end', profile.settings.sound);
      window.setTimeout(() => rec && onFinished(rec), 50);
    },
    [update, onFinished, profile.settings.sound],
  );

  const applyMove = useCallback(
    (uci: string) => {
      update((p) => {
        const a = p.activeGame;
        if (!a) return p;
        const c = replay(a);
        const mover = c.turn();
        const m = tryUci(c, uci);
        if (!m) return p;
        const spent = Date.now() - turnStart.current;
        let clockMs = a.clockMs;
        if (clockMs) clockMs = { ...clockMs, [mover]: Math.max(0, clockMs[mover] - spent + (a.incrementMs ?? 0)) };
        play(c.inCheck() ? 'check' : m.captured ? 'capture' : 'move', p.settings.sound);
        return { ...p, activeGame: { ...a, moves: [...a.moves, uci], times: [...a.times, spent], clockMs } };
      });
      turnStart.current = Date.now();
    },
    [update],
  );

  // Game-over detection from the board.
  useEffect(() => {
    if (!chess || !g) return;
    const out = boardOutcome(chess);
    if (out) end(out);
  }, [chess, g, end]);

  // Clock ticking & flag fall.
  useEffect(() => {
    if (!g?.clockMs || !chess || chess.isGameOver()) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      const side = chess.turn();
      if (g.clockMs![side] - (Date.now() - turnStart.current) <= 0) end(timeoutOutcome(chess, side));
    }, 200);
    return () => window.clearInterval(id);
  }, [g, chess, end]);

  // Bot's turn.
  useEffect(() => {
    if (!g || !chess || chess.isGameOver() || chess.turn() === g.playerColor || ended.current) return;
    let cancelled = false;
    setThinking(true);
    const fen = chess.fen();
    const ply = g.moves.length;
    (async () => {
      try {
        const engine = await getEngine();
        const bot = makeBot(g.bot, g.botNominal);
        const t0 = Date.now();
        const r = await engine.search({ fen, depth: bot.depth, multipv: bot.multipv });
        const choice = chooseBotMove(fen, r.lines, bot);
        const wait = Math.max(0, 450 + Math.random() * 500 - (Date.now() - t0));
        await new Promise((res) => setTimeout(res, wait));
        if (cancelled) return;
        const probe = new Chess(fen);
        const m = tryUci(probe, choice.uci);
        const best = r.lines[0];
        setSignal({ score: best ? Math.max(-3000, Math.min(3000, scoreValue(best))) : 0, gaveCheck: probe.inCheck(), captured: !!m?.captured });
        if (replay(g).fen() === fen && g.moves.length === ply) applyMove(choice.uci);
      } catch (e) {
        setEngineError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setThinking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [g, chess, applyMove]);

  const playerMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!g || !chess || chess.turn() !== g.playerColor) return;
      const probe = new Chess(chess.fen());
      if (!tryUci(probe, from + to + (promotion ?? ''))) return;
      applyMove(from + to + (promotion ?? ''));
    },
    [g, chess, applyMove],
  );

  const resign = useCallback(() => g && end(resignOutcome(g.playerColor)), [g, end]);

  const undo = useCallback(() => {
    update((p) => {
      const a = p.activeGame;
      if (!a || !a.training || a.moves.length === 0) return p;
      // Take back the player's last move (and the bot reply after it).
      const c = new Chess(a.startFen);
      const moverOfLast = (a.moves.length % 2 === 1) === (c.turn() === 'w') ? 'w' : 'b';
      const n = moverOfLast === a.playerColor ? 1 : 2;
      return { ...p, activeGame: { ...a, moves: a.moves.slice(0, -n), times: a.times.slice(0, -n), undosUsed: a.undosUsed + 1 } };
    });
    turnStart.current = Date.now();
  }, [update]);

  const clocks = g?.clockMs && chess
    ? { w: g.clockMs.w - (chess.turn() === 'w' && !chess.isGameOver() ? now - turnStart.current : 0), b: g.clockMs.b - (chess.turn() === 'b' && !chess.isGameOver() ? now - turnStart.current : 0) }
    : null;

  return { game: g, chess, thinking, engineError, signal, playerMove, resign, undo, clocks, botColor: g ? other(g.playerColor) : null };
}

export function newGameId() {
  return `g${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}
