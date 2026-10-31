import { storedSessionSchema, type PracticeSession } from './schemas';
const KEY = 'codedefense-history-v1';
export const DRAFT_KEY = 'codedefense-draft-v1';
// Only public, already-revealed feedback is persisted for live sessions.
export function loadHistory(): PracticeSession[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value)
      ? value.slice(0, 15).flatMap((s) => {
          const result = storedSessionSchema.safeParse(s);
          return result.success ? [result.data] : [];
        })
      : [];
  } catch {
    return [];
  }
}
export function saveHistory(session: PracticeSession) {
  const list = [session, ...loadHistory().filter((s) => s.id !== session.id)].slice(0, 15);
  localStorage.setItem(KEY, JSON.stringify(list));
}
export function deleteHistory() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(DRAFT_KEY);
}
export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
