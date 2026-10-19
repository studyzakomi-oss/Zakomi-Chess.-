import { useState } from 'react';
import { useT } from '../store';
import { go } from '../router';
import { Btn, Screen } from '../components/common';
import { Chess, uciOf } from '../../core/chess/game';

export function ImportPgn() {
  const { t } = useT();
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [color, setColor] = useState<'w' | 'b'>('w');
  return (
    <Screen title={t('importPgn')} onBack={() => go('play')}>
      <textarea className="pgn" value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="1. e4 e5 2. Nf3 ..." dir="ltr" data-testid="pgn-input" />
      <div className="lang-row">
        {(['w', 'b'] as const).map((c) => (
          <button key={c} className={`chip ${color === c ? 'on' : ''}`} onClick={() => setColor(c)}>
            {t('you')}: {c === 'w' ? t('white') : t('black')}
          </button>
        ))}
      </div>
      {err && <p className="banner error">{err}</p>}
      <Btn
        testId="pgn-analyse"
        onClick={() => {
          try {
            const c = new Chess();
            c.loadPgn(text);
            const hist = c.history({ verbose: true });
            if (!hist.length) throw new Error('empty');
            const startFen = hist[0].before;
            sessionStorage.setItem('zcd.import', JSON.stringify({ id: `import-${Date.now()}`, startFen, moves: hist.map(uciOf), playerColor: color }));
            go('analysis/import');
          } catch {
            setErr(t('pgnInvalid'));
          }
        }}
      >
        {t('analyse')}
      </Btn>
    </Screen>
  );
}
