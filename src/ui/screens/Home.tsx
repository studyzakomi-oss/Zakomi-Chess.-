import { useStore, useT } from '../store';
import { go } from '../router';
import { Btn, Card, Bar, Speaker, RatingText } from '../components/common';
import { Portrait } from '../components/Portrait';
import { WORLDS } from '../../content/curriculum';
import { currentLevel, masteredCount, worldPercent } from '../../core/training/progress';
import { CHARACTERS } from '../../content/characters';

export function Home() {
  const { profile } = useStore();
  const { t, tl } = useT();
  const cur = currentLevel(profile, WORLDS);
  const w1 = WORLDS[0];
  const pct = worldPercent(profile, w1);
  const mastered = masteredCount(profile);
  const ustadMsg = !profile.onboarding.completed
    ? CHARACTERS.ustad.lines.greet![0]
    : cur
      ? cur.level.ustadIntro
      : CHARACTERS.ustad.lines.win![0];

  return (
    <div className="screen home">
      <header className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <Portrait id="zakomi" mood={profile.onboarding.completed ? 'happy' : 'neutral'} size={120} className="hero-portrait" />
        <div>
          <div className="brand">ZAKOMI <span>CHESS DIMENSIONS</span></div>
          <div className="muted">{t('tagline')}</div>
          <div className="hello">{profile.name}</div>
        </div>
        <button className="icon-btn settings-btn" onClick={() => go('settings')} aria-label={t('settings')}>⚙</button>
      </header>
      <main className="screen-body">
        {profile.activeGame && (
          <Card className="resume">
            <b>{t('resumeGame')}</b>
            <div className="row">
              <Btn onClick={() => go('match')} testId="resume-game">{t('resumeGame')}</Btn>
            </div>
          </Card>
        )}
        <Card>
          <div className="stats">
            <div>
              <div className="label">{t('currentWorld')}</div>
              <div className="value">{cur ? `${cur.world.index}. ${tl(cur.world.title)}` : '—'}</div>
            </div>
            <div>
              <div className="label">{t('currentLevel')}</div>
              <div className="value">{cur ? tl(cur.level.title) : t('campaignDone')}</div>
            </div>
            <div>
              <div className="label">{t('rating')}</div>
              <div className="value" data-testid="home-rating">
                {profile.onboarding.completed || profile.ratingHistory.length ? <RatingText rating={profile.rating} /> : t('ratingUnknown')}
              </div>
            </div>
            <div>
              <div className="label">{t('masteredSkills')}</div>
              <div className="value">{mastered}</div>
            </div>
          </div>
          <div className="label">{t('campaign')} — {w1.name}</div>
          <Bar value={pct} />
        </Card>
        <Speaker who="ustad" name={t('ustadSays')} text={tl(ustadMsg)} />
        <div className="actions">
          <Btn
            testId="btn-continue"
            onClick={() => go(!profile.onboarding.completed ? 'onboarding' : cur ? `level/${cur.level.id}` : 'worlds')}
          >
            ▶ {t('continue')}
          </Btn>
          <Btn kind="soft" testId="btn-daily" onClick={() => go('train')}>★ {t('dailyTraining')}</Btn>
          <Btn kind="soft" testId="btn-play" onClick={() => go('play')}>♞ {t('playMatch')}</Btn>
        </div>
        <nav className="grid-nav">
          <Btn kind="ghost" onClick={() => go('worlds')}>🪐 {t('worlds')}</Btn>
          <Btn kind="ghost" onClick={() => go('notebook')}>📓 {t('notebook')}</Btn>
          <Btn kind="ghost" onClick={() => go('progress')}>📈 {t('progress')}</Btn>
          <Btn kind="ghost" onClick={() => go('report')}>🧭 {t('report')}</Btn>
        </nav>
      </main>
    </div>
  );
}
