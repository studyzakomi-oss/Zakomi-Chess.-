/**
 * Glicko-2 (Glickman, "Example of the Glicko-2 system", 2013). Ratings are on the familiar
 * Elo-like scale (default 1500 / RD 350); internally the algorithm works on the Glicko-2 scale.
 */

export interface Rating {
  r: number;
  rd: number;
  vol: number;
}

export interface GameResult {
  opponent: { r: number; rd: number };
  /** 1 win, 0.5 draw, 0 loss (fractional scores are allowed for weighted puzzle evidence). */
  score: number;
}

const SCALE = 173.7178;
const TAU = 0.5;
const EPS = 0.000001;
export const MIN_RD = 45;
export const MAX_RD = 350;

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const E = (mu: number, muj: number, phij: number) => 1 / (1 + Math.exp(-g(phij) * (mu - muj)));

export function expectedScore(a: { r: number; rd: number }, b: { r: number; rd: number }): number {
  return E((a.r - 1500) / SCALE, (b.r - 1500) / SCALE, Math.hypot(a.rd, b.rd) / SCALE);
}

export function update(player: Rating, games: GameResult[], opts: { minRd?: number } = {}): Rating {
  const mu = (player.r - 1500) / SCALE;
  const phi = player.rd / SCALE;
  if (games.length === 0) {
    const phiStar = Math.sqrt(phi * phi + player.vol * player.vol);
    return { ...player, rd: Math.min(MAX_RD, phiStar * SCALE) };
  }
  let vInv = 0;
  let deltaSum = 0;
  for (const gm of games) {
    const muj = (gm.opponent.r - 1500) / SCALE;
    const phij = gm.opponent.rd / SCALE;
    const e = E(mu, muj, phij);
    vInv += g(phij) ** 2 * e * (1 - e);
    deltaSum += g(phij) * (gm.score - e);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  // Volatility via the Illinois algorithm (step 5).
  const a = Math.log(player.vol ** 2);
  const f = (x: number) =>
    (Math.exp(x) * (delta ** 2 - phi ** 2 - v - Math.exp(x))) / (2 * (phi ** 2 + v + Math.exp(x)) ** 2) - (x - a) / TAU ** 2;
  let A = a;
  let B: number;
  if (delta ** 2 > phi ** 2 + v) B = Math.log(delta ** 2 - phi ** 2 - v);
  else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPS) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else fA /= 2;
    B = C;
    fB = fC;
  }
  const vol = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi ** 2 + vol ** 2);
  const phiNew = 1 / Math.sqrt(1 / phiStar ** 2 + 1 / v);
  const muNew = mu + phiNew ** 2 * deltaSum;
  return {
    r: muNew * SCALE + 1500,
    rd: Math.max(opts.minRd ?? MIN_RD, Math.min(MAX_RD, phiNew * SCALE)),
    vol,
  };
}

/** RD grows back when a player is inactive (one rating period per `periodDays`). */
export function decayForInactivity(player: Rating, daysIdle: number, periodDays = 14): Rating {
  let p = player;
  for (let i = 0; i < Math.floor(daysIdle / periodDays); i++) p = update(p, []);
  return p;
}
