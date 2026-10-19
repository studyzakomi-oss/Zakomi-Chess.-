# Testing

Last full run (this commit): **108 / 108 Vitest tests passed**, **6 / 6 Playwright tests passed**, `tsc -b` clean, `vite build` OK.

## Vitest (`npm test`)

| File | What it proves |
|---|---|
| `tests/glicko2.test.ts` | Glicko-2 reproduces Glickman's published example; RD shrinks with games, grows with inactivity; no point estimate while uncertain. |
| `tests/diagnostic.test.ts` | 16 questions over all 8 categories, no repeats; difficulty rises after correct and falls after wrong answers; a simulated 1400 solver ends > 300 points above a 700 solver; puzzle-only RD ≥ 200; hints reduce credit, slowness alone does not decide. |
| `tests/srs.test.ts` | Intervals grow / reset; mastered → due → forgotten over time; daily queue picks weak skills. |
| `tests/content.test.ts` | Every referenced puzzle exists, ids unique, lesson boards parse, example moves legal; puzzle checker accepts the main line, alternative mates and any check for "check" goals, rejects wrong/illegal moves; computed answers (en passant squares, stalemate, castling, castling-out-of-check). |
| `tests/progress.test.ts` | Save/restore & backup round-trip, corrupt storage tolerated, unsupported versions rejected; level gating (mastery ≥ 80 % **and** match); mastery tests prefer unseen questions; failed puzzles go to the notebook and resolve after 3 reviews; daily session targets weak skills; rating moves with results. |
| `tests/engine/puzzles.verify.test.ts` | **Every puzzle (65) checked against real Stockfish 19**: legal FEN (side not to move not in check), legal lines, mate lines end in mate with the exact mate distance at each step, "best" puzzles accept exactly the moves within 60 cp of the engine's best and win clearly, choice questions single out the answer by ≥ 40 cp. |
| `tests/engine/bots.test.ts` | Every bot returns a legal move in varied positions; average centipawn loss strictly decreases from a 400 → 1200 → 2400 bot; a strong bot always takes a forced mate; styles produce different preferences. |
| `tests/engine/analysis.test.ts` | Win%/accuracy formulas; 2…Qh4?? is a blunder with "hung piece on h4", tactical error type, top key moment and 4-step explanation; Scholar's-mate defence error flagged as "allowed mate". |

## Playwright (`npm run build && npm run test:e2e`, Pixel 7 viewport, Chromium)

1. Home renders in Arabic RTL, switches to English (LTR) and French; no horizontal overflow at phone width.
2. Onboarding → diagnostic → answering a question → result saved to storage.
3. **Stockfish replies in the browser (Web Worker WASM)**; the game survives a page reload; resigning ends the game, the rating drops, post-game analysis completes and shows accuracy.
4. Level 1: lesson steps, interactive example (tap g1 → f3), first exercise.
5. Promotion picker on the touch board (seeded profile where levels 1–2 are passed).
6. Screenshots of home / worlds (`docs/screenshots`).

## Not yet tested

* A physical Android device (only Chromium with Android viewport/touch emulation was used).
* Offline mode end-to-end (the service worker precache list includes the engine, but no automated offline run).
* Clock flag-fall in the UI (the timeout rule itself is in `game.ts`; no e2e test).
* Long sessions / storage quota limits.
* Bot strength calibration against humans (not done; numbers are design targets).
