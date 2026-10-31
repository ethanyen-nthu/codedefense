import type { AnswerRecord, Evaluation } from './schemas';
export function score(e: Pick<Evaluation, 'correctness' | 'understanding' | 'reasoning'>) {
  return e.correctness + e.understanding + e.reasoning;
}
// The follow-up can demonstrate improved understanding; it never rewrites initial evidence.
export function finalScore(initial: number, followUp?: number) {
  return followUp === undefined ? initial : Math.round(((initial + followUp) / 2) * 10) / 10;
}
export function summarize(records: AnswerRecord[], total: number) {
  const overall = total
    ? Math.round((records.reduce((s, r) => s + r.finalScore, 0) / (total * 10)) * 100)
    : 0;
  const groups = new Map<string, number[]>();
  for (const r of records)
    groups.set(r.question.concept, [...(groups.get(r.question.concept) || []), r.finalScore]);
  const strong: string[] = [],
    weak: string[] = [];
  for (const [name, values] of groups)
    (values.reduce((s, n) => s + n, 0) / values.length >= 8 ? strong : weak).push(name);
  return {
    overall,
    completed: records.filter((r) => !r.skipped).length,
    correct: records.filter((r) => !r.skipped && r.finalScore >= 8).length,
    partial: records.filter((r) => !r.skipped && r.finalScore >= 4 && r.finalScore < 8).length,
    incorrect: records.filter((r) => !r.skipped && r.finalScore < 4).length,
    skipped: records.filter((r) => r.skipped).length,
    strong,
    weak,
    readiness:
      overall >= 85
        ? 'Well Prepared'
        : overall >= 70
          ? 'Almost Ready'
          : overall >= 45
            ? 'Developing'
            : 'Needs Practice',
  };
}
