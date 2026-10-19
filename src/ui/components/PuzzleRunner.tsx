import { useEffect, useMemo, useRef, useState } from 'react';
import type { Puzzle, SquaresPuzzle } from '../../content/types';
import { MovePuzzleRunner, choiceAnswer, choiceOptions, isSquaresCorrect, optionSan, squaresAnswer, puzzleSolverColor } from '../../core/puzzles/answers';
import { Chess, parseUci, type Square, type PieceSymbol } from '../../core/chess/game';
import { Board, type Arrow } from './Board';
import { Btn, Speaker } from './common';
import { useStore, useT } from '../store';
import { play } from '../sound';

export interface PuzzleOutcome {
  ok: boolean;
  hints: number;
  ms: number;
  timedOut: boolean;
}

interface Props {
  puzzle: Puzzle;
  /** Wrong tries allowed before the puzzle counts as failed. */
  maxAttempts?: number;
  showHints?: boolean;
  header?: string;
  onDone: (o: PuzzleOutcome) => void;
  onNext: () => void;
  nextLabel?: string;
}

export function PuzzleRunner({ puzzle, maxAttempts = 2, showHints = true, header, onDone, onNext, nextLabel }: Props) {
  const { t, tl } = useT();
  const { profile } = useStore();
  const sound = profile.settings.sound;
  const solver = puzzleSolverColor(puzzle);
  const runner = useMemo(() => (puzzle.kind === 'move' ? new MovePuzzleRunner(puzzle) : null), [puzzle]);
  const [fen, setFen] = useState(puzzle.fen);
  const [last, setLast] = useState<[Square, Square] | null>(null);
  const [hints, setHints] = useState(0);
  const [tries, setTries] = useState(0);
  const [picked, setPicked] = useState<Square[]>([]);
  const [state, setState] = useState<'playing' | 'right' | 'wrong-retry' | 'failed'>('playing');
  const [timeLeft, setTimeLeft] = useState(puzzle.timeLimitSec ?? 0);
  const [choice, setChoice] = useState<string | null>(null);
  const started = useRef(Date.now());
  const finished = state === 'right' || state === 'failed';

  useEffect(() => {
    if (!puzzle.timeLimitSec || finished) return;
    const id = window.setInterval(() => {
      const left = puzzle.timeLimitSec! - Math.floor((Date.now() - started.current) / 1000);
      setTimeLeft(left);
      if (left <= 0) finish(false, true);
    }, 250);
    return () => window.clearInterval(id);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  function finish(ok: boolean, timedOut = false) {
    if (finished) return;
    setState(ok ? 'right' : 'failed');
    play(ok ? 'success' : 'fail', sound);
    onDone({ ok, hints, ms: Date.now() - started.current, timedOut });
  }

  function miss() {
    const n = tries + 1;
    setTries(n);
    play('fail', sound);
    if (n >= maxAttempts) finish(false);
    else setState('wrong-retry');
  }

  function onMove(from: Square, to: Square, promotion?: PieceSymbol) {
    if (!runner || finished) return;
    const uci = from + to + (promotion ?? '');
    const v = runner.submit(uci);
    if (v.kind === 'illegal') return;
    if (v.kind === 'wrong') {
      const c = new Chess(runner.fen);
      c.move({ from, to, promotion });
      setFen(c.fen());
      setLast([from, to]);
      window.setTimeout(() => {
        setFen(runner.fen);
        setLast(null);
      }, 700);
      miss();
      return;
    }
    setFen(runner.fen);
    play('move', sound);
    if (v.kind === 'solved') {
      setLast([from, to]);
      finish(true);
    } else {
      setState('playing');
      const r = parseUci(v.reply);
      setLast([r.from, r.to]);
    }
  }

  const arrows: Arrow[] = [];
  let marksGood: Square[] = [];
  let marksBad: Square[] = [];
  if (state === 'failed' && runner) {
    const exp = runner.expected();
    if (exp) arrows.push({ from: parseUci(exp).from, to: parseUci(exp).to, color: '#22c55e' });
  }
  if (puzzle.kind === 'squares' && finished) {
    const ans = squaresAnswer(puzzle as SquaresPuzzle);
    marksGood = ans;
    marksBad = picked.filter((s) => !ans.includes(s));
  }
  if (puzzle.kind === 'choice' && finished && (puzzle.query.type === 'moves' || puzzle.query.type === 'threat')) {
    const a = parseUci(choiceAnswer(puzzle));
    arrows.push({ from: a.from, to: a.to, color: '#22c55e' });
  }

  const sideName = solver === 'w' ? t('white') : t('black');
  const optLabel = (o: string) => {
    if (puzzle.kind !== 'choice') return o;
    if (puzzle.query.type === 'status') return t(`st.${o}`);
    if (puzzle.query.type === 'castling') return t(`cs.${o}`);
    return optionSan(puzzle, o);
  };

  return (
    <div className="puzzle">
      <div className="puzzle-head">
        {header && <span className="pill">{header}</span>}
        <span className="pill">{t('difficulty')}: {puzzle.rating}</span>
        {puzzle.timeLimitSec ? <span className={`pill ${timeLeft <= 5 ? 'warn' : ''}`}>⏱ {Math.max(0, timeLeft)}s</span> : null}
        <span className="pill">{t('attempts')}: {tries}/{maxAttempts}</span>
      </div>
      <p className="prompt" data-testid="puzzle-prompt">
        <b>{t('goal')}:</b> {tl(puzzle.prompt)} <span className="muted">({t('yourMove', { side: sideName })})</span>
      </p>
      <Board
        fen={fen}
        orientation={solver}
        movable={puzzle.kind === 'move' && !finished ? solver : null}
        onMove={onMove}
        lastMove={last}
        arrows={arrows}
        selectable={puzzle.kind === 'squares' && !finished}
        selected={picked}
        onSquareClick={(sq) => setPicked((p) => (p.includes(sq) ? p.filter((x) => x !== sq) : [...p, sq]))}
        marksGood={marksGood}
        marksBad={marksBad}
        showLegal={profile.settings.showLegal}
      />
      {puzzle.kind === 'squares' && !finished && (
        <div className="row">
          <span className="muted small">{t('selectSquares')}</span>
          <Btn testId="confirm-squares" onClick={() => (isSquaresCorrect(puzzle, picked) ? finish(true) : (miss(), setPicked([])))}>
            {t('confirm')}
          </Btn>
        </div>
      )}
      {puzzle.kind === 'choice' && (
        <div className="choices">
          {choiceOptions(puzzle).map((o) => {
            const correct = finished && o === choiceAnswer(puzzle);
            const chosenWrong = finished && o === choice && !correct;
            return (
              <button
                key={o}
                data-testid={`choice-${o}`}
                className={`choice ${correct ? 'good' : ''} ${chosenWrong ? 'bad' : ''}`}
                disabled={finished}
                onClick={() => {
                  setChoice(o);
                  if (o === choiceAnswer(puzzle)) finish(true);
                  else miss();
                }}
              >
                {optLabel(o)}
              </button>
            );
          })}
        </div>
      )}
      {state === 'wrong-retry' && <div className="feedback bad">{t('wrong')} {t('retry')}…</div>}
      {!finished && showHints && (
        <div className="hints">
          {puzzle.hints.slice(0, hints).map((h, i) => (
            <Speaker key={i} who="ustad" mood="think" name={t('ustadSays')} text={tl(h)} />
          ))}
          {hints < 2 && (
            <Btn kind="soft" onClick={() => setHints(hints + 1)} testId="hint-btn">
              💡 {t('hint')} ({hints + 1}/2)
            </Btn>
          )}
        </div>
      )}
      {finished && (
        <div className={`feedback ${state === 'right' ? 'good' : 'bad'}`} data-testid="puzzle-feedback">
          <b>{state === 'right' ? t('correct') : timeLeft <= 0 && puzzle.timeLimitSec ? t('timeUp') : t('wrongFinal')}</b>
          <Speaker who="ustad" mood={state === 'right' ? 'happy' : 'neutral'} name={t('ustadSays')} text={tl(puzzle.explanation)} />
          <Btn onClick={onNext} testId="puzzle-next">
            {nextLabel ?? t('next')}
          </Btn>
        </div>
      )}
    </div>
  );
}
