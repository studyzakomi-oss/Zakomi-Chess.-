import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadProfile, newProfile, saveProfile, type KV, type Profile } from '../storage/profile';
import { translate } from '../i18n/ui';
import type { L } from '../content/types';

function safeStorage(): KV {
  try {
    const k = '__zcd_probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  }
}

export const kv = safeStorage();

interface Store {
  profile: Profile;
  update: (fn: (p: Profile) => Profile) => void;
  replace: (p: Profile) => void;
  /** Writes immediately (used before navigation that must not lose state). */
  flush: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => loadProfile(kv) ?? newProfile());
  const latest = useRef(profile);
  latest.current = profile;
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveProfile(kv, latest.current), 250);
  }, [profile]);

  useEffect(() => {
    const save = () => saveProfile(kv, latest.current);
    const vis = () => document.visibilityState === 'hidden' && save();
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  useEffect(() => {
    const { lang, theme } = profile.settings;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.theme = theme;
  }, [profile.settings]);

  const update = useCallback((fn: (p: Profile) => Profile) => setProfile((p) => ({ ...fn(p), lastActive: Date.now() })), []);
  const replace = useCallback((p: Profile) => setProfile(p), []);
  const flush = useCallback(() => saveProfile(kv, latest.current), []);
  const value = useMemo(() => ({ profile, update, replace, flush }), [profile, update, replace, flush]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export function useT() {
  const { profile } = useStore();
  const lang = profile.settings.lang;
  return useMemo(
    () => ({
      lang,
      t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
      tl: (x: L | undefined) => (x ? x[lang] || x.en : ''),
    }),
    [lang],
  );
}
