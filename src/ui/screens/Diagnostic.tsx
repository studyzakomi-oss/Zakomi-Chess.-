import { useState } from 'react';
import { useStore, useT } from '../store';
import { go } from '../router';
import { Btn, Bar, Card, Screen, Speaker } from '../components/common';
import { PuzzleRunner } from '../components/PuzzleRunner';
import { DIAG_ROUNDS, nextPuzzle, recordAttempt } from '../../core/diagnostic/diagnostic';
import { DIAGNOSTIC_PUZZLES } from '../../content/puzzles';
import { DIAG_CATEGORIES } from '../../content/types';
import { recordPuzzle } from '../../core/training/progress';
import { createGame, placementNominal } from '../startGame';

export function Diagnostic() {
  const { profile, update } = useStore();
  const { t } = useT();
  const diag = profile.onboarding.diagnostic;
  // The current question stays on screen (with its explanation) until the learner taps "next".
  const [puzzle, setPuzzle] = useState(() => (diag ? nextPuzzle(diag, DIAGNOSTIC_PUZZLES) : null));

  if (!diag) {
    go('onboarding');
    return null;
  }
  const total = DIAG_ROUNDS * DIAG_CATEGORIES.length;
  const n = diag.attempts.filter((a) => a.puzzleId !== puzzle?.id).length;

  if (!puzzle) {
    const placed = profile.onboarding.placementGameIds.length;
    return (
      <Screen title={t('diagDone')} onBack={() => go('home')}>
        <Speaker who="ustad" mood="happy" name={t('ustadSays')} text={t('placementIntro')} />
        <Card>
          <p className="muted small">{t('nominalNote')}</p>
          <div className="actions">
            {placed < 3 && (
              <Btn
                testId="start-placement"
                onClick={() => {
                  update((p) => ({ ...p, activeGame: createGame({ mode: 'placement', bot: 'drone', nominal: placementNominal(p), color: placed % 2 === 0 ? 'w' : 'b', clock: '15+10' }) }));
                  go('match');
                }}
              >
                {t('placementGame', { n: placed + 1 })}
              </Btn>
            )}
            <Btn
              kind="ghost"
              testId="skip-placement"
              onClick={() => {
                update((p) => ({ ...p, onboarding: { ...p.onboarding, completed: true } }));
                go('report');
              }}
            >
              {placed >= 3 ? t('report') : t('skipPlacement')}
            </Btn>
          </div>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title={t('diagnostic')} onBack={() => go('home')}>
      <Bar value={(n / total) * 100} label={t('question', { n: n + 1, total })} />
      <PuzzleRunner
        key={puzzle.id}
        puzzle={puzzle}
        maxAttempts={1}
        header={`${t('question', { n: n + 1, total })} · ${t(`cat.${puzzle.category}`)}`}
        onDone={(o) => {
          update((p) => {
            const d = p.onboarding.diagnostic!;
            const nd = recordAttempt(d, { puzzleId: puzzle.id, category: puzzle.category!, rating: puzzle.rating, correct: o.ok, hintsUsed: o.hints, timeMs: o.ms, timedOut: o.timedOut });
            const done = nextPuzzle(nd, DIAGNOSTIC_PUZZLES) === null;
            const withPuzzle = recordPuzzle(p, puzzle, { ok: o.ok, hints: o.hints, ms: o.ms, context: 'diagnostic' });
            return {
              ...withPuzzle,
              onboarding: { ...p.onboarding, diagnostic: done ? { ...nd, finishedAt: Date.now() } : nd },
              rating: { ...nd.estimate },
              ratingHistory: done ? [...p.ratingHistory, { t: Date.now(), r: nd.estimate.r, rd: nd.estimate.rd, source: 'diagnostic' }] : p.ratingHistory,
            };
          });
        }}
        onNext={() => setPuzzle(nextPuzzle(diag, DIAGNOSTIC_PUZZLES))}
      />
    </Screen>
  );
}
