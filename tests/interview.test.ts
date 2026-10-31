import { beforeEach, describe, it, expect, vi } from 'vitest';
import { createDemo } from '@/lib/demo';
import { configSchema, type Evaluation, type Question } from '@/lib/schemas';
const { db, model, values } = vi.hoisted(() => ({
  db: new Map<string, unknown>(),
  model: vi.fn(),
  values: [] as unknown[],
}));
vi.mock('@/server/redis', () => ({
  PREFIX: 'test:',
  TTL: 86400,
  redis: () => ({
    get: async (k: string) => structuredClone(db.get(k) ?? null),
    set: async (k: string, v: unknown) => {
      db.set(k, structuredClone(v));
    },
    del: async (k: string) => db.delete(k),
  }),
}));
vi.mock('@/server/ai', () => ({
  structured: async (...args: unknown[]) => {
    model(...args);
    const value = values.shift();
    if (value instanceof Error) throw value;
    const schema = args[0] as { parse: (v: unknown) => unknown };
    const validate = args[6] as ((v: unknown) => unknown) | undefined;
    const parsed = schema.parse(value);
    return validate ? validate(parsed) : parsed;
  },
}));
import { act } from '@/server/interview';
import type { PracticeSession } from '@/lib/schemas';
const demo = () => createDemo();
const question = (i = 0): Question => ({
  id: `q${i}`,
  text: `Explain the remainder operation, variant ${i}.`,
  concept: 'Modulo and integer division',
  difficulty: 'Normal TA',
  evidence: demo().analysis.concepts[3].evidence,
  expected: ['The remainder extracts the last digit for nonnegative input.'],
  rubric: '4 technical,4 reasoning,2 consequences',
  hint: 'What remains after division?',
});
const evaluation = (points = 10, followUp: Question | null = null): Evaluation => ({
  correctness: points === 10 ? 4 : points === 6 ? 3 : 0,
  understanding: points === 10 ? 4 : points === 6 ? 2 : 0,
  reasoning: points === 10 ? 2 : points === 6 ? 1 : 0,
  explanation: 'Reasoning checked.',
  missing: points < 10 ? ['Explain the remainder.'] : [],
  modelAnswer: 'It extracts the final decimal digit.',
  followUp,
});
async function analyze() {
  values.push(demo().analysis);
  return (await act(
    {
      action: 'analyze',
      code: demo().code,
      context: demo().context,
      consent: true,
      challenge: 'token',
    },
    'owner',
    'ip',
  )) as PracticeSession;
}
async function start() {
  const s = await analyze();
  values.push({ questions: Array.from({ length: 5 }, (_, i) => question(i)) });
  return (await act(
    { action: 'start', id: s.id, config: configSchema.parse({ count: 5 }), challenge: 'token' },
    'owner',
    'ip',
  )) as PracticeSession;
}
beforeEach(() => {
  db.clear();
  values.length = 0;
  model.mockClear();
});
describe('server interview lifecycle with mocked AI and ephemeral store', () => {
  it('starts a new analyzed session without reusing completed-state cache or exposing keys', async () => {
    const s = await start();
    const next = (await act({ action: 'restart', id: s.id }, 'owner', 'ip')) as PracticeSession;
    expect(next.id).not.toBe(s.id);
    expect(next.stage).toBe('analysis');
    expect(next.records).toEqual([]);
    expect(next.current).toBeNull();
    expect(model).toHaveBeenCalledTimes(2);
  });
  it('retains initial assessment and reveals key points when a follow-up is skipped', async () => {
    const s = await start();
    values.push(evaluation(6, { ...question(9), id: 'follow', text: 'Explain an edge case.' }));
    await act(
      {
        action: 'answer',
        id: s.id,
        questionId: 'q0',
        answer: 'Remainder',
        followUp: false,
        challenge: 'token',
      },
      'owner',
      'ip',
    );
    await act({ action: 'next', id: s.id }, 'owner', 'ip');
    const result = (await act({ action: 'skip', id: s.id }, 'owner', 'ip')) as PracticeSession;
    expect(result.records[0]).toMatchObject({
      initialScore: 6,
      finalScore: 6,
      followUp: { skipped: true },
    });
    expect(result.records[0].followUp?.feedback.expected).not.toHaveLength(0);
  });
  it('analyzes code and keeps hidden questions and owner out of public responses', async () => {
    const s = await start();
    expect(s.current).not.toHaveProperty('expected');
    expect(s).not.toHaveProperty('questions');
    expect(s).not.toHaveProperty('owner');
    expect(JSON.stringify(s)).not.toContain('The remainder extracts');
    expect(s.records).toEqual([]);
    expect(Date.parse(s.expiresAt) - Date.parse(s.createdAt)).toBe(86400000);
  });
  it('enforces session ownership', async () => {
    const s = await start();
    await expect(act({ action: 'resume', id: s.id }, 'attacker', 'ip')).rejects.toThrow(
      'another browser',
    );
  });
  it.each([10, 6, 0])(
    'stores a %i-point initial answer with private key released only after response',
    async (points) => {
      const s = await start();
      values.push(evaluation(points));
      const result = (await act(
        {
          action: 'answer',
          id: s.id,
          questionId: 'q0',
          answer: 'Some answer',
          followUp: false,
          challenge: 'token',
        },
        'owner',
        'ip',
      )) as PracticeSession;
      expect(result.records[0].initialScore).toBe(points);
      expect(result.records[0].feedback.expected[0]).toContain('last digit');
      expect(result.records[0].answer).toBe('Some answer');
    },
  );
  it('allows at most one follow-up, retains the initial score, then advances', async () => {
    const s = await start();
    values.push(evaluation(6, { ...question(99), id: 'follow1', text: 'What happens for zero?' }));
    await act(
      {
        action: 'answer',
        id: s.id,
        questionId: 'q0',
        answer: 'Remainder',
        followUp: false,
        challenge: 'token',
      },
      'owner',
      'ip',
    );
    let next = (await act({ action: 'next', id: s.id }, 'owner', 'ip')) as PracticeSession;
    expect(next.stage).toBe('followup');
    expect(next.current).not.toHaveProperty('expected');
    values.push(evaluation(10));
    next = (await act(
      {
        action: 'answer',
        id: s.id,
        questionId: 'follow1',
        answer: 'Zero has remainder zero.',
        followUp: true,
        challenge: 'token',
      },
      'owner',
      'ip',
    )) as PracticeSession;
    expect(next.records[0]).toMatchObject({ initialScore: 6, finalScore: 8 });
    expect(model.mock.calls.at(-1)?.[3]).toHaveProperty('allowFollowUp', false);
    next = (await act({ action: 'next', id: s.id }, 'owner', 'ip')) as PracticeSession;
    expect(next.index).toBe(1);
    expect(next.current?.id).toBe('q1');
  });
  it('rejects duplicate or out-of-order answers before calling AI', async () => {
    const s = await start();
    await expect(
      act(
        {
          action: 'answer',
          id: s.id,
          questionId: 'q4',
          answer: 'x',
          followUp: false,
          challenge: 'token',
        },
        'owner',
        'ip',
      ),
    ).rejects.toThrow('changed');
    expect(model).toHaveBeenCalledTimes(2);
    values.push(evaluation());
    const input = {
      action: 'answer' as const,
      id: s.id,
      questionId: 'q0',
      answer: 'x',
      followUp: false,
      challenge: 'token',
    };
    await act(input, 'owner', 'ip');
    await expect(act(input, 'owner', 'ip')).rejects.toThrow('already submitted');
    expect(model).toHaveBeenCalledTimes(3);
  });
  it('preserves progress on AI failures and can resume', async () => {
    const s = await start();
    values.push(new Error('provider unavailable'));
    await expect(
      act(
        {
          action: 'answer',
          id: s.id,
          questionId: 'q0',
          answer: 'x',
          followUp: false,
          challenge: 'token',
        },
        'owner',
        'ip',
      ),
    ).rejects.toThrow();
    const restored = (await act({ action: 'resume', id: s.id }, 'owner', 'ip')) as PracticeSession;
    expect(restored.stage).toBe('question');
    expect(restored.records).toHaveLength(0);
    expect(restored.code).toBe(s.code);
  });
  it('can reveal a hint without a provider call', async () => {
    const s = await start();
    const result = (await act({ action: 'hint', id: s.id }, 'owner', 'ip')) as PracticeSession;
    expect(result.hint).toContain('remains');
    expect(model).toHaveBeenCalledTimes(2);
  });
  it('completes all main questions, creates an independent retry, and deletes server state', async () => {
    let s = await start();
    for (let i = 0; i < 5; i++) {
      await act({ action: 'skip', id: s.id }, 'owner', 'ip');
      s = (await act({ action: 'next', id: s.id }, 'owner', 'ip')) as PracticeSession;
    }
    expect(s.stage).toBe('complete');
    const retry = (await act({ action: 'retry', id: s.id }, 'owner', 'ip')) as PracticeSession;
    expect(retry.id).not.toBe(s.id);
    expect(retry.records).toEqual([]);
    expect(retry.current?.id).toBe('q0');
    await act({ action: 'delete', id: retry.id }, 'owner', 'ip');
    await expect(act({ action: 'resume', id: retry.id }, 'owner', 'ip')).rejects.toThrow();
  });
  it('refuses generated questions with invented source concepts', async () => {
    const s = await analyze();
    values.push({
      questions: Array.from({ length: 5 }, (_, i) => ({ ...question(i), concept: 'Recursion' })),
    });
    await expect(
      act(
        { action: 'start', id: s.id, config: configSchema.parse({ count: 5 }), challenge: 'token' },
        'owner',
        'ip',
      ),
    ).rejects.toThrow('detected concept');
  });
});
