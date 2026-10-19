# Rating model

## Internal rating — Glicko-2

`core/rating/glicko2.ts` implements Glicko-2 exactly as in Glickman's paper (τ = 0.5). `tests/glicko2.test.ts` reproduces the paper's worked example (1464.06 / 151.52 / 0.05999).

* New players start at RD 350 (≈ ±700 at 95 %): **no number is shown**, only a range.
* A single number appears only once RD < 150 (confidence "medium"/"high"); otherwise the UI shows `r ± 2·RD`, rounded to 50.
* Games against bots use the bot's nominal strength with RD 120 as the opponent, reflecting that bot strength is itself uncertain.
* Training games (undo used / training mode) are never rated.
* RD grows again with inactivity (`decayForInactivity`).

## Diagnostic

`core/diagnostic/diagnostic.ts`

* 16 questions: two rounds over 8 categories (rules, threats, tactics, mates, candidate moves, strategy, endgames, time pressure).
* Starting difficulty comes from self-reported experience (600 / 850 / 1150 / 1500).
* Per-category staircase: correct without hints → +200, with hints → +100, wrong → −200; the closest unused puzzle is picked.
* Evidence: each answer is a Glicko "game" against the puzzle's difficulty. Hints reduce credit (1 → 0.7 → 0.4). Slowness only costs 10 % outside the time-pressure category, so speed is never the deciding factor.
* **Puzzle-only estimates are floored at RD 200** — the report states that confidence is low and that games are needed.

Then 3 placement games against the adaptive drone (15+10 clock), each analysed by Stockfish, refine the rating and feed the report (accuracy by phase, error types, hung pieces).

## Puzzle rating

Puzzle results outside the diagnostic update a separate `puzzleRating`, used only to choose training material. It never changes the player rating.

## Limits (stated honestly)

* The diagnostic bank currently tops out around 1700 difficulty, so very strong players are under-measured by puzzles; games correct this.
* Bot nominal strengths are not calibrated against humans. Comparing the in-game number with FIDE, Lichess or Chess.com ratings is not meaningful.
