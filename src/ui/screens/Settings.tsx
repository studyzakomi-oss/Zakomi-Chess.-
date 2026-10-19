import { useRef, useState } from 'react';
import { useStore, useT } from '../store';
import { go } from '../router';
import { Btn, Card, Screen, Toggle } from '../components/common';
import { LANG_NAMES } from '../../i18n/ui';
import type { Lang } from '../../content/types';
import { exportBackup, importBackup, newProfile, type Settings as S } from '../../storage/profile';
import { createDiagnostic } from '../../core/diagnostic/diagnostic';

export function Settings() {
  const { profile, update, replace } = useStore();
  const { t } = useT();
  const s = profile.settings;
  const set = (patch: Partial<S>) => update((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  function download() {
    const blob = new Blob([exportBackup(profile)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zakomi-chess-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Screen title={t('settings')} onBack={() => go('home')}>
      <Card>
        <div className="label">{t('language')}</div>
        <div className="lang-row">
          {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
            <button key={l} className={`chip ${s.lang === l ? 'on' : ''}`} onClick={() => set({ lang: l })} data-testid={`lang-${l}`}>
              {LANG_NAMES[l]}
            </button>
          ))}
        </div>
        <div className="label">{t('theme')}</div>
        <div className="lang-row">
          {(['dark', 'light'] as const).map((th) => (
            <button key={th} className={`chip ${s.theme === th ? 'on' : ''}`} onClick={() => set({ theme: th })}>
              {t(th)}
            </button>
          ))}
        </div>
        <Toggle checked={s.sound} onChange={(v) => set({ sound: v })} label={t('sound')} />
        <Toggle checked={s.showLegal} onChange={(v) => set({ showLegal: v })} label={t('showLegal')} />
        <Toggle checked={s.showThreats} onChange={(v) => set({ showThreats: v })} label={t('showThreats')} />
        <div className="label">{t('diffPref')}</div>
        <div className="lang-row">
          {(['easier', 'adaptive', 'harder'] as const).map((d) => (
            <button key={d} className={`chip ${s.difficulty === d ? 'on' : ''}`} onClick={() => set({ difficulty: d })}>
              {t(`diff.${d}`)}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <h3>{t('backup')}</h3>
        <p className="muted small">{t('backupNote')}</p>
        <div className="row wrap">
          <Btn kind="soft" onClick={download}>{t('exportBackup')}</Btn>
          <Btn kind="soft" onClick={() => file.current?.click()}>{t('importBackup')}</Btn>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                replace(importBackup(await f.text()));
                setMsg(t('importOk'));
              } catch {
                setMsg(t('importFail'));
              }
            }}
          />
        </div>
        {msg && <p className="banner info">{msg}</p>}
      </Card>
      <Card>
        <div className="row wrap">
          <Btn
            kind="ghost"
            onClick={() => {
              update((p) => ({ ...p, onboarding: { ...p.onboarding, diagnostic: createDiagnostic(p.onboarding.experience ?? 'rules'), placementGameIds: [] } }));
              go('diagnostic');
            }}
          >
            {t('redoDiagnostic')}
          </Btn>
          <Btn kind="danger" onClick={() => window.confirm(t('confirmReset')) && (replace({ ...newProfile(), settings: s }), go('home'))}>
            {t('resetAll')}
          </Btn>
        </div>
      </Card>
      <Card>
        <h3>{t('about')}</h3>
        <p className="small">{t('aboutText')}</p>
      </Card>
    </Screen>
  );
}
