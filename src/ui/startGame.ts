import { START_FEN, type Color } from '../core/chess/game';
import type { BotId } from '../core/engine/botProfiles';
import type { ActiveGame, GameMode, Profile, Settings } from '../storage/profile';
import { newGameId } from './useBotGame';

const CLOCKS: Record<Exclude<Settings['clock'], 'none'>, [number, number]> = { '10+0': [600_000, 0], '5+3': [300_000, 3000], '15+10': [900_000, 10_000] };

export function createGame(opts: {
  mode: GameMode;
  bot: BotId;
  nominal: number;
  color: Color | 'random';
  levelId?: string;
  clock?: Settings['clock'];
  training?: boolean;
}): ActiveGame {
  const color = opts.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : opts.color;
  const clock = opts.clock && opts.clock !== 'none' ? CLOCKS[opts.clock] : null;
  return {
    id: newGameId(),
    mode: opts.mode,
    levelId: opts.levelId,
    bot: opts.bot,
    botNominal: opts.nominal,
    playerColor: color,
    startFen: START_FEN,
    moves: [],
    times: [],
    clockMs: clock ? { w: clock[0], b: clock[0] } : undefined,
    incrementMs: clock ? clock[1] : undefined,
    undosUsed: 0,
    training: opts.training,
    startedAt: Date.now(),
  };
}

/** Adaptive opponent strength: around the current estimate, nudged by the difficulty preference. */
export function adaptiveNominal(p: Profile): number {
  const shift = p.settings.difficulty === 'easier' ? -200 : p.settings.difficulty === 'harder' ? 150 : -50;
  return Math.round(Math.max(250, Math.min(2500, p.rating.r + shift)) / 50) * 50;
}

/** Placement games: start just below the diagnostic estimate, then follow the updated rating. */
export function placementNominal(p: Profile): number {
  return Math.round(Math.max(250, Math.min(2300, p.rating.r - 100)) / 50) * 50;
}
