import { describe, it, expect } from 'vitest';
import { score, finalScore, summarize } from '@/lib/scoring';
import { createDemo, demoAction, retryDemo, startDemo } from '@/lib/demo';
import { configSchema } from '@/lib/schemas';
const begin = () => startDemo(createDemo(), configSchema.parse({ count: 5 }));
describe('deterministic grading and practice reports', () => {
  it('skipping a follow-up retains the initial answer and score', () => {
    let s = demoAction(begin(), 'answer', 'remainder');
    s = demoAction(s, 'next');
    s = demoAction(s, 'skip');
    expect(s.records[0]).toMatchObject({
      answer: 'remainder',
      initialScore: 6,
      finalScore: 6,
      followUp: { skipped: true },
    });
    s = demoAction(s, 'next');
    expect(s.index).toBe(1);
  });
  it('uses a 4+4+2 rubric and retains the initial score', () => {
    expect(score({ correctness: 4, understanding: 4, reasoning: 2 })).toBe(10);
    expect(finalScore(4, 10)).toBe(7);
    expect(finalScore(6)).toBe(6);
  });
  it.each([
    ['The remainder is the last digit.', 10],
    ['remainder', 6],
    ['it makes a sandwich', 0],
  ])('clearly simulated demo feedback for %s', (answer, expected) => {
    const s = demoAction(begin(), 'answer', answer);
    expect(s.records[0].initialScore).toBe(expected);
    expect(s.records[0].feedback.explanation).toContain('Simulated');
  });
  it('never reveals private points in the current question', () => {
    const s = begin();
    expect(s.current).not.toHaveProperty('expected');
    expect(s.records).toHaveLength(0);
  });
  it('rejects blank answers and supports hints', () => {
    expect(() => demoAction(begin(), 'answer', ' ')).toThrow();
    expect(demoAction(begin(), 'hint').hint).toBeTruthy();
  });
  it('limits follow-ups to one and uses the average score', () => {
    let s = demoAction(begin(), 'answer', 'remainder');
    s = demoAction(s, 'next');
    expect(s.stage).toBe('followup');
    s = demoAction(s, 'answer', 'The remainder is the last digit.');
    expect(s.records[0].initialScore).toBe(6);
    expect(s.records[0].finalScore).toBe(8);
    s = demoAction(s, 'next');
    expect(s.stage).toBe('question');
    expect(s.index).toBe(1);
  });
  it('completes an interview, counts skips as zero, and retries the selected weak questions', () => {
    let s = begin();
    for (let i = 0; i < 5; i++) {
      s = demoAction(s, 'skip');
      s = demoAction(s, 'next');
    }
    expect(s.stage).toBe('complete');
    expect(summarize(s.records, s.total)).toMatchObject({
      overall: 0,
      skipped: 5,
      completed: 0,
      readiness: 'Needs Practice',
    });
    const next = retryDemo(s);
    expect(next.id).not.toBe(s.id);
    expect(next.total).toBe(5);
    expect(next.records).toHaveLength(0);
  });
  it('a perfect main answer needs no follow-up', () => {
    const s = demoAction(demoAction(begin(), 'answer', 'remainder last digit'), 'next');
    expect(s.index).toBe(1);
    expect(s.stage).toBe('question');
  });
});
