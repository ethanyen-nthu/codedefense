import { beforeAll, beforeEach, it, expect, vi } from 'vitest';
import path from 'node:path';
import { analyzeCpp, initializeParser } from '@/lib/analyzer';
import { EXAMPLES } from '@/lib/examples';
import { createSession } from '@/lib/engine';
import { configSchema, emptyContext, type PracticeSession } from '@/lib/schemas';
import {
  loadHistory,
  saveHistory,
  removeSession,
  clearHistory,
  exportHistory,
  importHistory,
  HISTORY_KEY,
  DRAFT_KEY,
  legacyHistory,
} from '@/lib/storage';
let session: PracticeSession;
const values = new Map<string, string>();
beforeAll(async () => {
  await initializeParser({
    coreWasm: path.resolve('public/parser/tree-sitter.wasm'),
    cppWasm: path.resolve('public/parser/tree-sitter-cpp.wasm'),
  });
  session = createSession(
    EXAMPLES[0].code,
    await analyzeCpp(EXAMPLES[0].code),
    emptyContext,
    configSchema.parse({}),
  );
});
beforeEach(() => {
  values.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
});
it('persists progress and unfinished answer drafts', () => {
  saveHistory({ ...session, draft: '未完成的回答' });
  expect(loadHistory()[0].draft).toBe('未完成的回答');
});
it('round-trips export/import and deduplicates session IDs', () => {
  saveHistory(session);
  const text = JSON.stringify(exportHistory());
  clearHistory();
  expect(importHistory(text)).toBe(1);
  expect(loadHistory()).toEqual([session]);
  importHistory(text);
  expect(loadHistory()).toHaveLength(1);
});
it('rejects malformed, older, oversized and forged-evidence imports atomically', () => {
  saveHistory(session);
  for (const text of ['{', '{}', 'x'.repeat(5 * 1024 * 1024 + 1)])
    expect(() => importHistory(text)).toThrow();
  const forged = structuredClone(exportHistory());
  forged.sessions[0].questions[0].evidence.snippet = 'invented';
  expect(() => importHistory(JSON.stringify(forged))).toThrow();
  expect(loadHistory()).toEqual([session]);
});
it('retains at most fifteen records and supports individual deletion', () => {
  for (let i = 0; i < 17; i++) saveHistory({ ...session, id: crypto.randomUUID() });
  expect(loadHistory()).toHaveLength(15);
  removeSession(loadHistory()[0].id);
  expect(loadHistory()).toHaveLength(14);
});
it('clears free data while preserving legacy records separately', () => {
  values.set('codedefense-history-v1', JSON.stringify([{ legacy: true }]));
  saveHistory(session);
  values.set(DRAFT_KEY, 'source');
  clearHistory();
  expect(values.has(HISTORY_KEY)).toBe(false);
  expect(values.has(DRAFT_KEY)).toBe(false);
  expect(legacyHistory()).toEqual([{ legacy: true }]);
});
