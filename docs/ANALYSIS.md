# Game analysis & coaching

`core/engine/analysis.ts`

* Every position of the game is searched once by Stockfish (depth 11 in the app, MultiPV 2).
* Win probability: Lichess' logistic model `50 + 50·(2/(1+e^(−0.00368208·cp)) − 1)`; mates map to 0 / 100 %.
* Move accuracy: Lichess formula `103.1668·e^(−0.04354·Δwin) − 3.1669`.
* Classification by the mover's win-% drop: inaccuracy ≥ 10, mistake ≥ 20, blunder ≥ 30 (slightly more lenient than Lichess' 5/10/15 to suit beginners); "best" when the engine's move was played.
* Motifs (from engine lines + board facts): hung piece, allowed mate, missed mate, missed material win, missed fork, allowed fork, allowed capture.
* Error type for each mistake (heuristic, labelled as such):
  1. **time** — clock under 10 %, or < 2.5 s spent on a sharp position with a big drop;
  2. **endgame** — the position before the move was an endgame;
  3. **tactical** — any tactical motif above;
  4. **calculation** — the player's own move was a capture/check that failed;
  5. **planning** — otherwise (quiet positional error).
* Key moments = the player's 3 costliest moves; turning point = the largest swing by either side.

## Coach (`core/coach/coach.ts`)

For each key moment the coach reveals, one step at a time:

1. a guiding **question** tied to the motif / error type;
2. a concrete **hint** (the square of the hung piece, the opponent's reply, or which piece the better move uses);
3. the **idea** in plain words, naming the better move;
4. the **detailed engine line** with evaluations and win % before/after.

All concrete facts come from the engine. The wording is template-based and the UI states that the explanation is simplified.

Each key mistake (mistake/blunder) is copied to the mistake notebook. Re-drills accept the engine's best move or any move within 50 cp of it (checked live by Stockfish), and an entry is resolved after 3 successful reviews spaced 1 / 3 / 7 days apart.
