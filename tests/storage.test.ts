import { beforeEach, it, expect, vi } from 'vitest';
import { deleteHistory, loadHistory, saveHistory, DRAFT_KEY } from '@/lib/storage';
import { createDemo } from '@/lib/demo';
const data = new Map<string, string>();
beforeEach(() => {
  data.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
});
it('persists recent sessions and deduplicates by id', () => {
  const s = createDemo();
  saveHistory(s);
  saveHistory({ ...s, index: 2 });
  expect(loadHistory()).toHaveLength(1);
  expect(loadHistory()[0].index).toBe(2);
});
it('limits browser history to 15 sessions', () => {
  for (let i = 0; i < 20; i++) saveHistory(createDemo());
  expect(loadHistory()).toHaveLength(15);
});
it('ignores malformed local history', () => {
  data.set('codedefense-history-v1', '{bad');
  expect(loadHistory()).toEqual([]);
});
it('deletes history and draft data', () => {
  saveHistory(createDemo());
  data.set(DRAFT_KEY, 'draft');
  deleteHistory();
  expect(loadHistory()).toEqual([]);
  expect(data.has(DRAFT_KEY)).toBe(false);
});
