import { beforeAll, describe, it, expect } from 'vitest';
import path from 'node:path';
import { analyzeCpp, initializeParser } from '@/lib/analyzer';
import { EXAMPLES } from '@/lib/examples';
import { QUESTION_BANK } from '@/lib/question-bank';
import { configSchema, emptyContext, type Analysis } from '@/lib/schemas';
import {
  createSession,
  generateQuestions,
  submit,
  assess,
  advance,
  followUp,
  summarize,
  retryWeak,
} from '@/lib/engine';
import { verifyEvidence } from '@/lib/source';
let analysis: Analysis;
beforeAll(async () => {
  await initializeParser({
    coreWasm: path.resolve('public/parser/tree-sitter.wasm'),
    cppWasm: path.resolve('public/parser/tree-sitter-cpp.wasm'),
  });
  analysis = await analyzeCpp(EXAMPLES[0].code);
});
const begin = (mc = false) =>
  createSession(
    EXAMPLES[0].code,
    analysis,
    emptyContext,
    configSchema.parse({
      seed: 'repeatable',
      mode: mc ? 'Quick Multiple Choice' : 'Standard TA Interview',
    }),
  );
describe('reviewed source-grounded question selection', () => {
  it('does not select decimal-digit or switch-break templates for modulo-two and loop-break source', async () => {
    const code = 'int main(){int n=5; while(n){n=n%2;break;} return 0;}';
    const a = await analyzeCpp(code);
    for (let i = 0; i < 20; i++) {
      const qs = generateQuestions(
        a,
        configSchema.parse({ count: 15, seed: String(i), difficulty: 'Strict TA' }),
      );
      expect(
        qs.some(
          (q) => q.text.includes('decimal digit processing') || q.text.includes('switch case'),
        ),
      ).toBe(false);
    }
  });
  it('has at least 80 distinct reviewed templates and unambiguous choices', () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(80);
    expect(new Set(QUESTION_BANK.map((t) => t.id)).size).toBe(QUESTION_BANK.length);
    expect(new Set(QUESTION_BANK.map((t) => t.prompt)).size).toBe(QUESTION_BANK.length);
    for (const t of QUESTION_BANK) {
      expect(new Set([t.reference, ...t.wrong]).size).toBe(4);
      expect(t.wrong).toHaveLength(3);
    }
  });
  it('generates 15 unique templates with exact line references and only present constructs', () => {
    const qs = generateQuestions(analysis, configSchema.parse({ count: 15, seed: 'a' }));
    expect(qs).toHaveLength(15);
    expect(new Set(qs.map((q) => q.templateId)).size).toBe(15);
    for (const q of qs) {
      expect(verifyEvidence(EXAMPLES[0].code, q.evidence)).toBe(true);
      expect(analysis.constructs.some((c) => c.kind === q.concept)).toBe(true);
      expect(q.choices[q.correctIndex]).toBe(q.explanation);
      expect(q.concept).not.toBe('switch');
    }
  });
  it('supports reproducible seeded ordering and meaningful mode priorities', () => {
    const c = configSchema.parse({ seed: 'fixed' });
    expect(generateQuestions(analysis, c)).toEqual(generateQuestions(analysis, c));
    expect(generateQuestions(analysis, { ...c, seed: 'different' })).not.toEqual(
      generateQuestions(analysis, c),
    );
    expect(generateQuestions(analysis, { ...c, mode: 'Debugging Challenge' })).not.toEqual(
      generateQuestions(analysis, { ...c, mode: 'Explain My Code' }),
    );
  });
  it('never pads a small program with missing constructs', async () => {
    const a = await analyzeCpp('int main(){}');
    const qs = generateQuestions(
      a,
      configSchema.parse({ count: 15, difficulty: 'Beginner', seed: 'x' }),
    );
    expect(qs.length).toBeLessThan(15);
    expect(qs.every((q) => a.constructs.some((c) => c.kind === q.concept))).toBe(true);
  });
  it('blocks an interview on malformed syntax', async () => {
    const a = await analyzeCpp('int main( {');
    expect(() => generateQuestions(a, configSchema.parse({}))).toThrow('syntax');
  });
});
describe('trustworthy assessment and state transitions', () => {
  it('written answers receive no automatic score, even if they contain expected keywords', () => {
    const s = submit({ ...begin(), draft: 'This is wrong but remainder integer condition.' });
    expect(s.records[0].correct).toBeNull();
    expect(s.records[0].assessment).toBeNull();
    expect(summarize(s).autoScore).toBeNull();
    expect(() => advance(s)).toThrow('self-assessment');
  });
  it.each(['complete', 'partial', 'not-yet'] as const)(
    'records self-assessment %s separately',
    (value) => {
      const s = assess(submit({ ...begin(), draft: 'My explanation' }), value);
      expect(s.records[0].assessment).toBe(value);
      expect(summarize(s).autoScore).toBeNull();
      expect(advance(s).index).toBe(1);
    },
  );
  it('grades MC answers by exact key, not written words', () => {
    const s = begin(true),
      q = s.questions[0];
    const correct = submit({ ...s, draftChoice: q.correctIndex });
    expect(summarize(correct)).toMatchObject({ autoCorrect: 1, autoScore: 100, complete: 0 });
    const wrong = submit({ ...s, draftChoice: (q.correctIndex + 1) % 4 });
    expect(summarize(wrong).autoScore).toBe(0);
  });
  it('rejects blank/duplicate responses and limits follow-ups to one', () => {
    let s = begin();
    expect(() => submit(s)).toThrow();
    s.questions = [s.questions.find((q) => q.followUp)!];
    s = assess(submit({ ...s, draft: 'Explain' }), 'partial');
    s = followUp(s);
    s = assess(submit({ ...s, draft: 'Further reasoning' }), 'complete');
    expect(() => followUp(s)).toThrow('one');
    expect(advance(s).stage).toBe('complete');
  });
  it('a written follow-up never modifies the automatic main MC score', () => {
    let s = begin(true);
    s.questions = [s.questions.find((q) => q.followUp)!];
    s = submit({ ...s, draftChoice: s.questions[0].correctIndex });
    s = followUp(s);
    s = assess(submit({ ...s, draft: 'A written follow-up' }), 'not-yet');
    expect(summarize(s).autoScore).toBe(100);
    expect(summarize(s).weak.length).toBeGreaterThan(0);
  });
  it('completes ten questions, counts skips, and creates an independent weak retry', () => {
    let s = begin(true);
    for (let i = 0; i < 10; i++) {
      s = submit(s, true);
      s = advance(s);
    }
    expect(s.stage).toBe('complete');
    expect(summarize(s)).toMatchObject({ skipped: 10, autoTotal: 10, autoScore: 0, completed: 0 });
    const retry = retryWeak(s);
    expect(retry.id).not.toBe(s.id);
    expect(retry.records).toEqual([]);
    expect(retry.questions).toHaveLength(10);
  });
});
