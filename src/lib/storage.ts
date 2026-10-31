import { sessionSchema, contextSchema, codeSchema, type PracticeSession } from './schemas';
import { z } from 'zod';
import { verifyEvidence } from './source';
export const HISTORY_KEY = 'codedefense-free-history-v2',
  DRAFT_KEY = 'codedefense-free-draft-v2',
  ACTIVE_KEY = 'codedefense-free-active-v2';
const MAX_IMPORT = 5 * 1024 * 1024;
const UNREAD_KEY = 'codeta-unread-history-backup-v1';
function preserveUnread() {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return;
  let readable = false;
  try {
    const parsed = JSON.parse(raw);
    readable =
      Array.isArray(parsed) &&
      parsed.every((v) => {
        try {
          validateSession(v);
          return true;
        } catch {
          return false;
        }
      });
  } catch {}
  if (!readable && !localStorage.getItem(UNREAD_KEY)) localStorage.setItem(UNREAD_KEY, raw);
}
export function unreadHistory() {
  return localStorage.getItem(UNREAD_KEY);
}
export function validateSession(value: unknown): PracticeSession {
  const s = sessionSchema.parse(value);
  const original = value as { records: Record<string, unknown>[] };
  s.records.forEach((record, i) => {
    if (!('difficulty' in original.records[i])) record.difficulty = s.config.difficulty;
  });
  if (
    s.index > s.questions.length ||
    s.records.length > s.questions.length ||
    s.records.some(
      (r, i) =>
        JSON.stringify(r.question) !== JSON.stringify(s.questions[i]) ||
        !verifyEvidence(s.code, r.question.evidence),
    ) ||
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
  preserveUnread();
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
  preserveUnread();
  return {
    format: 'codeta',
    version: 3,
    sessions: loadHistory(),
    programs: loadPrograms(),
    preservedUnreadHistory: unreadHistory(),
  };
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
    !(
      (data?.format === 'codedefense-free' && data.version === 2) ||
      (data?.format === 'codeta' && data.version === 3)
    ) ||
    !Array.isArray(data.sessions) ||
    data.sessions.length > 15
  )
    throw new Error(
      'Choose a CodeTA v3 or CodeDefense Free v2 export with at most 15 sessions. Older AI reports are kept separately.',
    );
  const incoming = data.sessions.map(validateSession),
    ids = new Set(incoming.map((s: PracticeSession) => s.id));
  if (ids.size !== incoming.length) throw new Error('The import contains duplicate session IDs.');
  const combined = [...incoming, ...loadHistory().filter((s) => !ids.has(s.id))].slice(0, 15);
  // Validate every program before any writes. Roll back the first key if quota rejects the second.
  const programs =
    data.programs === undefined
      ? loadPrograms()
      : mergePrograms(programsSchema.parse(data.programs), loadPrograms());
  const previous = localStorage.getItem(HISTORY_KEY);
  preserveUnread();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(combined));
  try {
    localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
  } catch (error) {
    if (previous === null) localStorage.removeItem(HISTORY_KEY);
    else localStorage.setItem(HISTORY_KEY, previous);
    throw error;
  }
  return incoming.length;
}
export const PROGRAMS_KEY = 'codeta-programs-v1';
const programSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(150),
  code: codeSchema,
  context: contextSchema,
  updatedAt: z.iso.datetime(),
});
const programsSchema = z.array(programSchema).max(20);
export type SavedProgram = z.infer<typeof programSchema>;
export function loadPrograms(): SavedProgram[] {
  try {
    return programsSchema.parse(JSON.parse(localStorage.getItem(PROGRAMS_KEY) || '[]'));
  } catch {
    return [];
  }
}
function mergePrograms(incoming: SavedProgram[], current: SavedProgram[]) {
  const ids = new Set(incoming.map((p) => p.id));
  if (ids.size !== incoming.length) throw new Error('Duplicate saved program IDs.');
  const result = [...incoming, ...current.filter((p) => !ids.has(p.id))];
  if (result.length > 20)
    throw new Error(
      'This import would exceed 20 saved programs. Export and remove an unneeded program first.',
    );
  return result;
}
export function saveProgram(program: SavedProgram) {
  const valid = programSchema.parse(program);
  localStorage.setItem(PROGRAMS_KEY, JSON.stringify(mergePrograms([valid], loadPrograms())));
}
export function deleteProgram(id: string) {
  localStorage.setItem(PROGRAMS_KEY, JSON.stringify(loadPrograms().filter((p) => p.id !== id)));
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
