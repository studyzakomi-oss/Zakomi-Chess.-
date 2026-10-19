# ZAKOMI CHESS DIMENSIONS

لعبة تعليم شطرنج تفاعلية متعددة الأبعاد — من أول نقلة نحو مسار تدريبي متقدم.
An interactive, multi-dimension chess-learning game (Arabic RTL · English · French), installable on Android as a PWA and playable offline.

> **ملاحظة صادقة:** التصنيف داخل اللعبة تقديري وليس تصنيف FIDE. إنهاء «طريق الأستاذ الكبير» لا يمنح لقبًا رسميًا؛ لقب Grandmaster يمنحه FIDE وفق شروطه.

## Status — Phase 1 (playable MVP)

| Feature | State |
|---|---|
| Full chess rules (castling, en passant, promotion, check/mate, all draws) | ✅ via `chess.js` |
| Touch board: tap & drag, legal-move dots, last move, check, arrows, promotion picker, flip | ✅ |
| Real engine: Stockfish 19 (lite, single-thread WASM) in a Web Worker | ✅ works offline |
| Opponents with distinct styles (LUMO, NOVA, SHADOW, ARCHITECT, ORACLE, VEKTOR, GRANDMASTER, Z-DRONE) | ✅ logic; only LUMO + adaptive drone unlocked in free play (others unlock with their worlds) |
| Adaptive diagnostic (8 categories, 16 questions) + 3 placement games + level report | ✅ |
| Glicko-2 internal rating with uncertainty, ranges instead of fake precision | ✅ |
| Post-game Stockfish analysis, key moments, error types, graded coaching (question → hint → idea → engine line) | ✅ |
| Mistake notebook with engine-checked re-drills | ✅ |
| Spaced repetition per skill (mastered / due / forgotten) + daily training | ✅ |
| World 1 *THE AWAKENING*: 5 levels (lesson → example → exercises → match → mastery test ≥ 80%) | ✅ |
| Worlds 2–7 | 🔒 shown on the map as "under construction" (Phase 3) |
| Clocks (15+10, 10+0, 5+3), training mode with undo (unrated), PGN export/import | ✅ |
| Local save (auto, survives reloads/accidental exits) + JSON backup export/import | ✅ |
| Final character illustrations | ⚠️ original SVG placeholders (see *Art*) |

## Run

```bash
npm install          # also copies the Stockfish WASM files into public/engine
npm run dev          # http://localhost:5173
npm run build        # production build in dist/ (PWA + service worker)
npm run preview      # serve dist/ on http://localhost:4173
```

Install on Android: open the deployed site in Chrome → menu → *Install app / Add to Home screen*. Any static HTTPS host works (no special headers are needed for the single-threaded engine).

## Tests

```bash
npm test             # unit + engine tests (Vitest, runs the real Stockfish in Node)
npm run test:e2e     # browser tests on a Pixel 7 viewport (Playwright, needs `npm run build` first)
npm run typecheck
```

What the tests cover is listed in [docs/TESTING.md](docs/TESTING.md).

## Project layout

```
src/
  core/            game logic, no UI
    chess/         rules wrapper, FEN, attacked/hanging pieces
    engine/        UCI client, Stockfish worker transport, bot personalities, game analysis
    rating/        Glicko-2 + honest rating display
    diagnostic/    adaptive placement test, level report
    training/      spaced repetition, level gating, daily sessions, notebook
    coach/         graded explanations built from engine facts
    puzzles/       answer checking (computed from rules where possible)
  content/         puzzles, World 1 curriculum, worlds, characters & dialogue (ar/en/fr)
  storage/         profile schema, migration, backup
  i18n/            UI strings
  ui/              React screens & components (board, portraits, puzzle runner, match…)
tests/             Vitest (tests/engine/* use the real engine)
e2e/               Playwright
scripts/           engine copy step, puzzle-authoring probe
docs/              architecture, rating, analysis, testing notes
```

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Art

The reference image of the ZAKOMI TECH character was not available in the build environment, so the portraits are original vector placeholders following the brief (dark turban, white-and-blue *daraa*, white Z on deep blue, tech bag, navy / electric-blue palette). Each portrait lives in `src/ui/components/Portrait.tsx` under its character id; replace an entry with an `<image>`/`<img>` of the final asset to swap it.

## License

GPL-3.0-or-later (the app bundles Stockfish, which is GPL-3.0).
