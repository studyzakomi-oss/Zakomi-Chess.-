import { useEffect, useRef, useState } from 'react';
import { useStore, useT } from '../store';
import { go } from '../router';
import { Btn, EngineBanner, Speaker } from '../components/common';
import { Board } from '../components/Board';
import { Portrait } from '../components/Portrait';
import { useBotGame } from '../useBotGame';
import { CHARACTERS, lineFor, type DialogueEvent, type Mood } from '../../content/characters';

import type { L } from '../../content/types';

function fmtClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function Match() {
  const { profile } = useStore();
  const { t, tl } = useT();
  const { game, chess, thinking, engineError, signal, playerMove, resign, undo, clocks, botColor } = useBotGame((rec) => go(`analysis/${rec.id}`));
  const [flip, setFlip] = useState(false);
  const [say, setSay] = useState<{ who: 'bot' | 'ustad'; text: L; mood: Mood } | null>(null);
  const prevScore = useRef<number | null>(null);
  const greeted = useRef<string | null>(null);

  useEffect(() => {
    if (game && greeted.current !== game.id) {
      greeted.current = game.id;
      const g = lineFor(game.bot, 'greet');
      if (g) setSay({ who: 'bot', text: g, mood: 'happy' });
    }
  }, [game]);

  useEffect(() => {
    if (!signal || !game) return;
    const ev: DialogueEvent | null = signal.gaveCheck ? 'check' : signal.score >= 250 && (prevScore.current ?? 0) < 250 ? 'botAdvantage' : null;
    if (game.mode === 'level' && signal.score >= 300 && (prevScore.current ?? 0) < 150) {
      setSay({ who: 'ustad', text: CHARACTERS.ustad.lines.playerBlunder![0], mood: 'think' });
    } else if (ev) {
      const line = lineFor(game.bot, ev, game.moves.length);
      if (line) setSay({ who: 'bot', text: line, mood: ev === 'check' ? 'focus' : 'happy' });
    }
    prevScore.current = signal.score;
  }, [signal]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!game || !chess) {
    return (
      <div className="screen">
        <main className="screen-body center">
          <p>—</p>
          <Btn onClick={() => go('home')}>{t('back')}</Btn>
        </main>
      </div>
    );
  }
  const orientation = flip ? botColor! : game.playerColor;
  const hist = chess.history({ verbose: true });
  const lastMv = hist.length ? hist[hist.length - 1] : null;
  const botMood: Mood = thinking ? 'think' : (signal?.score ?? 0) > 200 ? 'happy' : (signal?.score ?? 0) < -200 ? 'sad' : 'neutral';
  const c = CHARACTERS[game.bot];
  const sans = chess.history();
  const moveRows: string[][] = [];
  const startsBlack = game.startFen.split(' ')[1] === 'b';
  const all = startsBlack ? ['…', ...sans] : sans;
  for (let i = 0; i < all.length; i += 2) moveRows.push(all.slice(i, i + 2));

  return (
    <div className="screen match">
      <header className="topbar">
        <button className="icon-btn" onClick={() => go('home')} aria-label={t('back')}>
          <span className="chev">‹</span>
        </button>
        <h1>{game.mode === 'placement' ? t('placementGame', { n: profile.onboarding.placementGameIds.length + 1 }) : c.name}</h1>
        <div className="topbar-actions">
          <span className={`pill ${game.training || game.undosUsed ? '' : 'rated'}`}>{game.training || game.undosUsed ? t('unrated') : t('rated')}</span>
        </div>
      </header>
      <main className="screen-body">
        <EngineBanner />
        {engineError && <div className="banner error">{t('engineError')} ({engineError})</div>}
        <div className="player-strip opp">
          <Portrait id={game.bot} mood={botMood} size={44} />
          <div className="grow">
            <b>{c.name}</b> <span className="muted small">{tl(c.style)} · {t('nominal', { n: game.botNominal })}</span>
            <div className="muted small" data-testid="bot-status">{thinking ? t('thinking') : ' '}</div>
          </div>
          {clocks && <div className={`clock ${chess.turn() === botColor ? 'run' : ''}`}>{fmtClock(clocks[botColor!])}</div>}
        </div>
        {say && <Speaker who={say.who === 'bot' ? game.bot : 'ustad'} mood={say.mood} name={say.who === 'bot' ? c.name : t('ustadSays')} text={tl(say.text)} />}
        <Board
          fen={chess.fen()}
          orientation={orientation}
          movable={thinking ? null : game.playerColor}
          onMove={playerMove}
          lastMove={lastMv ? [lastMv.from, lastMv.to] : null}
          showLegal={profile.settings.showLegal}
          showThreats={profile.settings.showThreats}
          label="game board"
        />
        <div className="player-strip me">
          <Portrait id="zakomi" mood={chess.inCheck() && chess.turn() === game.playerColor ? 'surprised' : 'focus'} size={44} />
          <div className="grow">
            <b>{profile.name}</b> <span className="muted small">({game.playerColor === 'w' ? t('white') : t('black')})</span>
          </div>
          {clocks && <div className={`clock ${chess.turn() === game.playerColor ? 'run' : ''}`} data-testid="my-clock">{fmtClock(clocks[game.playerColor])}</div>}
        </div>
        <div className="row wrap">
          <Btn kind="ghost" onClick={() => setFlip(!flip)}>⇅ {t('flip')}</Btn>
          {game.training && <Btn kind="ghost" onClick={undo} disabled={thinking || game.moves.length === 0}>↶ {t('undo')}</Btn>}
          <Btn kind="danger" testId="resign" onClick={() => window.confirm(t('confirmResign')) && resign()}>{t('resign')}</Btn>
        </div>
        <ol className="movelist" data-testid="movelist">
          {moveRows.map((r, i) => (
            <li key={i}>
              <span className="mn">{i + 1}.</span> <span>{r[0]}</span> <span>{r[1] ?? ''}</span>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
