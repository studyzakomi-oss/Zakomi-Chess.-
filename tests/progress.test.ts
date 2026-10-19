import { describe, expect, it } from 'vitest';
import { newProfile, saveProfile, loadProfile, exportBackup, importBackup, migrate, type KV } from '../src/storage/profile';
import { WORLDS, LEVELS_BY_ID } from '../src/content/curriculum';
import { isLevelUnlocked, patchLevel, evaluateLevelPass, recordPuzzle, currentLevel, rateGame, scoreFor, buildDailySession, pickMasteryQuestions, reviewNotebook } from '../src/core/training/progress';
import { PUZZLES_BY_ID, ALL_PUZZLES } from '../src/content/index';
import { seededRng } from '../src/core/engine/botMove';
import { buildReport } from '../src/core/diagnostic/report';

function memKV(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

describe('save / restore', () => {
  it('round-trips through storage and backups', () => {
    const kv = memKV();
    const p = { ...newProfile(1), name: 'Zakomi' };
    saveProfile(kv, p);
    expect(loadProfile(kv)?.name).toBe('Zakomi');
    expect(importBackup(exportBackup(p)).createdAt).toBe(1);
    expect(() => importBackup('{"app":"other"}')).toThrow();
    expect(() => migrate({ version: 99, rating: { r: 1 } })).toThrow();
  });
  it('corrupt storage does not crash', () => {
    const kv = memKV();
    kv.setItem('zcd.profile.v1', '{not json');
    expect(loadProfile(kv)).toBeNull();
  });
});

describe('level gating', () => {
  const w1 = WORLDS[0];
  it('only the first level is open at the start', () => {
    const p = newProfile();
    expect(isLevelUnlocked(p, w1, w1.levels[0])).toBe(true);
    expect(isLevelUnlocked(p, w1, w1.levels[1])).toBe(false);
    expect(isLevelUnlocked(p, WORLDS[1], w1.levels[0])).toBe(false);
  });
  it('passing needs both the mastery threshold and the match', () => {
    const lv = LEVELS_BY_ID['w1-l1'];
    let p = patchLevel(newProfile(), lv.id, { masteryBest: 0.6, matchPlayed: true });
    p = evaluateLevelPass(p, lv);
    expect(p.levels[lv.id].passed).toBe(false);
    p = evaluateLevelPass(patchLevel(p, lv.id, { masteryBest: 0.8 }), lv);
    expect(p.levels[lv.id].passed).toBe(true);
    expect(isLevelUnlocked(p, w1, w1.levels[1])).toBe(true);
    expect(currentLevel(p, WORLDS)?.level.id).toBe('w1-l2');
  });
  it('mastery tests prefer unseen questions', () => {
    const lv = LEVELS_BY_ID['w1-l1'];
    const qs = pickMasteryQuestions(lv, seededRng(1));
    expect(qs.length).toBe(5);
    expect(qs.slice(0, 5).filter((q) => lv.exercises.includes(q)).length).toBeLessThanOrEqual(1);
  });
});

describe('training records', () => {
  it('failed puzzles go to the notebook and resolve after 3 good reviews', () => {
    let p = recordPuzzle(newProfile(0), PUZZLES_BY_ID['d-tac-fork'], { ok: false, hints: 0, ms: 1000, context: 'daily' }, 0);
    expect(p.notebook.length).toBe(1);
    expect(p.skills['tactic.fork']?.attempts).toBe(1);
    const id = p.notebook[0].id;
    for (let i = 0; i < 3; i++) p = reviewNotebook(p, id, true, i * 1e9);
    expect(p.notebook[0].resolved).toBe(true);
  });
  it('daily session targets weak skills', () => {
    const p = recordPuzzle(newProfile(0), PUZZLES_BY_ID['d-tac-pin'], { ok: false, hints: 0, ms: 1000, context: 'daily' }, 0);
    const s = buildDailySession(p, ALL_PUZZLES, 1000);
    expect(s.skills).toContain('tactic.pin');
    expect(s.puzzles.length).toBeGreaterThan(0);
  });
  it('rating moves with results', () => {
    const r = { r: 1000, rd: 300, vol: 0.06 };
    expect(rateGame(r, 1000, scoreFor('1-0', 'w')).r).toBeGreaterThan(1000);
    expect(rateGame(r, 1000, scoreFor('1-0', 'b')).r).toBeLessThan(1000);
    expect(scoreFor('1/2-1/2', 'b')).toBe(0.5);
  });
  it('report says puzzle-only when no games were played', () => {
    expect(buildReport(newProfile()).puzzleOnly).toBe(true);
  });
});
