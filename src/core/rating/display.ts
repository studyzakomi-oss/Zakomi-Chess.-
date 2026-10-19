import type { Rating } from './glicko2';

export type Confidence = 'very-low' | 'low' | 'medium' | 'high';

export function confidenceOf(rd: number): Confidence {
  if (rd >= 250) return 'very-low';
  if (rd >= 150) return 'low';
  if (rd >= 80) return 'medium';
  return 'high';
}

/**
 * Honest presentation: a ~95% interval (r ± 2·RD) rounded to 50, and a single number only once
 * the estimate is reasonably certain. A brand-new player gets no number at all.
 */
export function ratingRange(r: Rating) {
  const round = (x: number) => Math.round(x / 50) * 50;
  const lo = Math.max(100, round(r.r - 2 * r.rd));
  const hi = round(r.r + 2 * r.rd);
  const confidence = confidenceOf(r.rd);
  return {
    lo,
    hi,
    point: confidence === 'high' || confidence === 'medium' ? Math.round(r.r) : null,
    confidence,
    provisional: r.rd >= 110,
  };
}

/** Coarse skill bands used in the report (in-game scale). */
export function skillBand(r: number): 'novice' | 'beginner' | 'improver' | 'intermediate' | 'club' | 'advanced' | 'expert' {
  if (r < 600) return 'novice';
  if (r < 900) return 'beginner';
  if (r < 1200) return 'improver';
  if (r < 1500) return 'intermediate';
  if (r < 1800) return 'club';
  if (r < 2100) return 'advanced';
  return 'expert';
}
