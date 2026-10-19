import type { DiagCategory } from '../../content/types';
import type { ErrorType } from '../engine/analysis';
import type { GameRecord, Profile } from '../../storage/profile';
import { summarizeCategories, type CategorySummary } from './diagnostic';
import { ratingRange, skillBand } from '../rating/display';

export type Aspect = DiagCategory | 'opening-play' | 'middlegame-play' | 'endgame-play';

export interface LevelReport {
  band: ReturnType<typeof skillBand>;
  range: ReturnType<typeof ratingRange>;
  gamesUsed: number;
  puzzlesUsed: number;
  strengths: Aspect[];
  weaknesses: Aspect[];
  frequentErrors: { type: ErrorType | 'hung-piece'; count: number }[];
  categories: CategorySummary[];
  plan: DiagCategory[];
  /** True while the estimate rests on puzzles only (no rated games yet). */
  puzzleOnly: boolean;
}

/** Maps game-phase accuracy to a performance number comparable with puzzle performance. */
function phasePerformance(games: GameRecord[], key: 'opening' | 'middlegame' | 'endgame', base: number): number | null {
  const accs = games.map((g) => g.analysis?.byPhase[key]).filter((x) => x && x.moves > 0 && !Number.isNaN(x.accuracy)) as { accuracy: number }[];
  if (accs.length === 0) return null;
  const avg = accs.reduce((s, a) => s + a.accuracy, 0) / accs.length;
  return base + (avg - 75) * 12;
}

export function buildReport(p: Profile): LevelReport {
  const diag = p.onboarding.diagnostic;
  const categories = diag ? summarizeCategories(diag) : [];
  const games = p.games.filter((g) => g.rated && g.analysis);
  const aspects: { a: Aspect; perf: number }[] = categories.filter((c) => c.attempts > 0).map((c) => ({ a: c.category, perf: c.performance }));
  for (const [key, a] of [['opening', 'opening-play'], ['middlegame', 'middlegame-play'], ['endgame', 'endgame-play']] as const) {
    const perf = phasePerformance(games, key, p.rating.r);
    if (perf !== null) aspects.push({ a, perf });
  }
  aspects.sort((x, y) => y.perf - x.perf);
  const strengths = aspects.slice(0, 3).map((x) => x.a);
  const weaknesses = aspects.slice(-3).reverse().map((x) => x.a).filter((a) => !strengths.includes(a));

  const errs: Record<string, number> = {};
  for (const g of games) {
    for (const [k, v] of Object.entries(g.analysis!.errorTypes)) errs[k] = (errs[k] ?? 0) + v;
    errs['hung-piece'] = (errs['hung-piece'] ?? 0) + g.analysis!.hungPieces;
  }
  const frequentErrors = Object.entries(errs)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, count]) => ({ type: type as ErrorType | 'hung-piece', count }));

  const weakCats = categories.filter((c) => c.attempts > 0).sort((a, b) => a.performance - b.performance).map((c) => c.category);
  return {
    band: skillBand(p.rating.r),
    range: ratingRange(p.rating),
    gamesUsed: games.length,
    puzzlesUsed: diag?.attempts.length ?? 0,
    strengths,
    weaknesses,
    frequentErrors,
    categories,
    plan: weakCats.slice(0, 3),
    puzzleOnly: games.length === 0,
  };
}
