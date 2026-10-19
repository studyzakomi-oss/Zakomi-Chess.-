import { useStore, useT } from '../store';
import { go } from '../router';
import { Btn, Card, Screen } from '../components/common';
import { Board } from '../components/Board';
import { ERROR_TYPE_NAMES } from '../../core/coach/coach';
import { PUZZLES_BY_ID } from '../../content/index';
import { Drill } from './Training';

export function Notebook() {
  const { profile } = useStore();
  const { t, tl, lang } = useT();
  const now = Date.now();
  const items = [...profile.notebook].sort((a, b) => Number(a.resolved) - Number(b.resolved) || a.due - b.due);
  return (
    <Screen title={t('notebook')} onBack={() => go('home')}>
      {items.length === 0 && <p className="muted">{t('notebookEmpty')}</p>}
      {items.map((n) => (
        <Card key={n.id} className="nb-item">
          <div className="nb-board"><Board fen={n.fen} orientation={n.fen.split(' ')[1] === 'b' ? 'b' : 'w'} /></div>
          <div className="grow">
            <div>
              {n.source === 'game' ? `${n.playedSan ?? ''} → ${n.bestSan ?? '?'}` : tl(PUZZLES_BY_ID[n.puzzleId!]?.prompt)}
            </div>
            {n.errorType && <span className="tag">{ERROR_TYPE_NAMES[n.errorType][lang]}</span>}
            <div className="muted small">
              {n.resolved ? `✓ ${t('resolved')}` : n.due <= now ? t('dueNow') : t('dueOn', { d: new Date(n.due).toLocaleDateString(lang) })} · {n.successes}/3
            </div>
            {!n.resolved && <Btn kind="soft" onClick={() => go(`drill/${n.id}`)} testId="nb-review">{t('review')}</Btn>}
          </div>
        </Card>
      ))}
    </Screen>
  );
}

export function DrillScreen({ id }: { id: string }) {
  const { t } = useT();
  return (
    <Screen title={t('notebook')} onBack={() => go('notebook')}>
      <Drill entryId={id} onFinish={() => go('notebook')} />
    </Screen>
  );
}
