import { sessionSchema, type PracticeSession } from './schemas';
import { verifyEvidence } from './source';
export const HISTORY_KEY = 'codedefense-free-history-v2',
  DRAFT_KEY = 'codedefense-free-draft-v2',
  ACTIVE_KEY = 'codedefense-free-active-v2';
const MAX_IMPORT = 5 * 1024 * 1024;
export function validateSession(value: unknown): PracticeSession {
  const s = sessionSchema.parse(value);
  if (
    s.index > s.questions.length ||
    s.records.length > s.questions.length ||
    s.questions.some((q) => !verifyEvidence(s.code, q.evidence)) ||
    s.analysis.constructs.some((c) => !verifyEvidence(s.code, c.evidence))
  )
    throw new Error('A session has invalid source evidence or progress.');
  if (
    s.stage === 'complete' &&
    (s.records.length !== s.questions.length || s.index !== s.questions.length)
  )
    throw new Error('An incomplete session cannot be imported as complete.');
  if (
    s.stage !== 'complete' &&
    (s.index >= s.questions.length ||
      s.records.length !== (s.stage === 'question' ? s.index : s.index + 1))
  )
    throw new Error('Session progress does not match the current question.');
  return s;
}
export function loadHistory(): PracticeSession[] {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(list)
      ? list.slice(0, 15).flatMap((value) => {
          try {
            return [validateSession(value)];
          } catch {
            return [];
          }
        })
      : [];
  } catch {
    return [];
  }
}
export function saveHistory(s: PracticeSession) {
  const list = [s, ...loadHistory().filter((p) => p.id !== s.id)].slice(0, 15);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}
export function removeSession(id: string) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter((s) => s.id !== id)));
  if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
}
export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem(ACTIVE_KEY);
}
export function exportHistory() {
  return { format: 'codedefense-free', version: 2, sessions: loadHistory() };
}
export function importHistory(text: string) {
  if (new TextEncoder().encode(text).length > MAX_IMPORT)
    throw new Error('History files must be at most 5 MB.');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This is not a readable JSON history file.');
  }
  if (
    data?.format !== 'codedefense-free' ||
    data.version !== 2 ||
    !Array.isArray(data.sessions) ||
    data.sessions.length > 15
  )
    throw new Error(
      'Choose a CodeDefense Free v2 export with at most 15 sessions. Older AI reports are kept separately.',
    );
  const incoming = data.sessions.map(validateSession),
    ids = new Set(incoming.map((s: PracticeSession) => s.id));
  if (ids.size !== incoming.length) throw new Error('The import contains duplicate session IDs.');
  const combined = [...incoming, ...loadHistory().filter((s) => !ids.has(s.id))].slice(0, 15);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(combined));
  return incoming.length;
}
export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function legacyHistory() {
  try {
    return JSON.parse(localStorage.getItem('codedefense-history-v1') || '[]');
  } catch {
    return [];
  }
}
