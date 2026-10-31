import { beforeAll, beforeEach, it, expect, vi } from 'vitest';
import path from 'node:path';
import { analyzeCpp, initializeParser } from '@/lib/analyzer';
import { QUESTION_BANK } from '@/lib/question-bank';
import { configSchema, emptyContext, difficulties, type Analysis } from '@/lib/schemas';
import {
  createSession,
  generateQuestions,
  submit,
  assess,
  advance,
  changeDifficulty,
  summarize,
  weakTopics,
} from '@/lib/engine';
import { EXAMPLES } from '@/lib/examples';
import {
  importHistory,
  exportHistory,
  saveHistory,
  loadHistory,
  saveProgram,
  loadPrograms,
  deleteProgram,
  HISTORY_KEY,
  PROGRAMS_KEY,
} from '@/lib/storage';
let analysis: Analysis;
const values = new Map<string, string>();
beforeAll(async () => {
  await initializeParser({
    coreWasm: path.resolve('public/parser/tree-sitter.wasm'),
    cppWasm: path.resolve('public/parser/tree-sitter-cpp.wasm'),
  });
  analysis = await analyzeCpp(EXAMPLES[0].code);
});
beforeEach(() => {
  values.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
});
const begin = (adaptive = false) =>
  createSession(
    EXAMPLES[0].code,
    analysis,
    emptyContext,
    configSchema.parse({ seed: 'codeta-tests', adaptive, count: 10 }),
  );
it('ships 155 distinct reviewed prompts with single keys and useful simplified explanations', () => {
  expect(QUESTION_BANK).toHaveLength(155);
  expect(new Set(QUESTION_BANK.map((t) => t.prompt)).size).toBe(155);
  expect(new Set(QUESTION_BANK.map((t) => t.id)).size).toBe(155);
  for (const t of QUESTION_BANK) {
    expect(new Set([t.reference, ...t.wrong]).size).toBe(4);
    expect(t.reference.length).toBeGreaterThan(30);
  }
});
it.each(difficulties)('selects appropriate, distinct, supported questions at %s', (difficulty) => {
  const qs = generateQuestions(
    analysis,
    configSchema.parse({ difficulty, count: 15, seed: 'level' }),
  );
  expect(qs.length).toBeGreaterThan(0);
  const level = difficulties.indexOf(difficulty) + 1;
  expect(qs.every((q) => q.level <= level)).toBe(true);
  expect(qs.some((q) => q.level === level)).toBe(true);
  expect(qs.every((q) => analysis.constructs.some((c) => c.kind === q.concept))).toBe(true);
  for (const q of qs) {
    expect(q.choices[q.correctIndex]).toBe(q.explanation);
    expect(q.choiceExplanations).toHaveLength(4);
    expect(q.simple.length).toBeGreaterThan(15);
    expect(q.text).not.toMatch(/\{(?:line|name|expression|left|condition)\}/);
  }
});
it('uses actual condition and copy evidence without guessing a variable purpose', async () => {
  const a = await analyzeCpp('int main(){int n=23;int backup=n;while(n>0){n/=10;}return backup;}');
  const loop = a.constructs.find((c) => c.kind === 'while')!;
  expect(loop.features).toMatchObject({ condition: 'n>0', left: 'n', right: '0' });
  expect(loop.features?.tags).toContain('positive-condition');
  expect(
    a.constructs.find((c) => c.kind === 'initialization' && c.name === 'backup')?.features?.tags,
  ).toContain('value-copy');
  const absent = await analyzeCpp('int main(){double n=2;while(n>0){n-=1;}return 0;}');
  expect(absent.constructs.find((c) => c.kind === 'while')?.features?.tags).not.toContain(
    'positive-condition',
  );
});
it('does not select reference, accumulator, switch-break or digit-specific questions without evidence', async () => {
  const a = await analyzeCpp('int f(int x){int y=2;while(x){x=x%2;break;}return y;}');
  for (let i = 0; i < 20; i++) {
    const qs = generateQuestions(
      a,
      configSchema.parse({ difficulty: 'Challenge', count: 15, seed: String(i) }),
    );
    const templates = qs.map((q) => QUESTION_BANK.find((t) => t.id === q.templateId)!);
    expect(
      templates.some((t) =>
        t.requires?.some((tag) =>
          ['reference-parameter', 'accumulator', 'mod10', 'break-switch'].includes(tag),
        ),
      ),
    ).toBe(false);
  }
});
it('deduplicates learning objectives and honors exclusions and fixed-trace mode', () => {
  const qs = generateQuestions(
    analysis,
    configSchema.parse({
      count: 15,
      excluded: ['modulo', 'integer-division'],
      difficulty: 'Challenge',
    }),
  );
  expect(qs.some((q) => q.concept === 'modulo' || q.concept === 'integer-division')).toBe(false);
  const families = qs
    .map((q) => QUESTION_BANK.find((t) => t.id === q.templateId)?.family)
    .filter(Boolean);
  expect(new Set(families).size).toBe(families.length);
  const trace = generateQuestions(
    analysis,
    configSchema.parse({ mode: 'Code Tracing', count: 15 }),
  );
  expect(trace.length).toBeGreaterThan(0);
  expect(trace.length).toBeLessThan(15);
  expect(
    trace.every((q) => q.format === 'Code Tracing' && q.grounding === 'Verified example'),
  ).toBe(true);
});
it('preserves answered question snapshots, scores, and follow-up eligibility when difficulty changes', () => {
  let s = begin();
  s = assess(submit({ ...s, draft: 'Original reasoning' }), 'partial');
  const saved = structuredClone(s.records),
    question = structuredClone(s.questions[0]);
  s = changeDifficulty(s, 'Strict TA');
  expect(s.records).toEqual(saved);
  expect(s.questions[0]).toEqual(question);
  expect(s.difficultyChanges).toEqual([
    { after: 1, from: 'Normal TA', to: 'Strict TA', reason: 'chosen' },
  ]);
  expect(s.questions.slice(1).every((q) => q.templateId !== question.templateId)).toBe(true);
  s = advance(s);
  expect(s.index).toBe(1);
  expect(summarize(s).partial).toBe(1);
});
it('keeps automatic MC scores stable across difficulty changes', () => {
  let s = createSession(
    EXAMPLES[0].code,
    analysis,
    emptyContext,
    configSchema.parse({ mode: 'Quick Multiple Choice', seed: 'mc' }),
  );
  s = submit({ ...s, draftChoice: s.questions[0].correctIndex });
  const changed = changeDifficulty(s, 'Challenge');
  expect(summarize(changed)).toMatchObject({ autoScore: 100, autoCorrect: 1, complete: 0 });
  expect(changed.records[0].difficulty).toBe('Normal TA');
});
it('does not adapt without explicit opt-in; adapts weak responses and logs hint signals when enabled', () => {
  const normal = assess(submit({ ...begin(), draft: 'answer', hint: true }), 'complete');
  expect(advance(normal).config.difficulty).toBe('Normal TA');
  expect(() => changeDifficulty(normal, 'Beginner', 'adaptive')).toThrow('Enable');
  const enabled = assess(submit({ ...begin(true), draft: 'answer', hint: true }), 'complete');
  const next = advance(enabled);
  expect(next.config.difficulty).toBe('Beginner');
  expect(next.records).toEqual(enabled.records);
  expect(next.difficultyChanges[0].reason).toBe('adaptive');
  expect(summarize(next).hints).toBe(1);
  expect(weakTopics([next])[0].weak).toBe(1);
});
it('raises enabled adaptive practice only after three strong hint-free responses', () => {
  let s = begin(true);
  for (let i = 0; i < 3; i++) {
    s = advance(assess(submit({ ...s, draft: 'self assessed' }), 'complete'));
    if (i < 2) expect(s.config.difficulty).toBe('Normal TA');
  }
  expect(s.config.difficulty).toBe('Strict TA');
  expect(s.records).toHaveLength(3);
});
it('migrates original Free v2 records with defaults while preserving source, answer, key, and legacy storage', () => {
  const old = JSON.parse(
    JSON.stringify(assess(submit({ ...begin(), draft: 'Original answer' }), 'partial')),
  );
  delete old.difficultyChanges;
  delete old.config.adaptive;
  delete old.config.excluded;
  delete old.config.preset;
  for (const q of [...old.questions, ...old.records.map((r: { question: unknown }) => r.question)])
    for (const k of ['level', 'format', 'grounding', 'simple', 'choiceExplanations']) delete q[k];
  for (const r of old.records) {
    delete r.hintsUsed;
    delete r.difficulty;
  }
  values.set('codedefense-history-v1', 'untouched');
  importHistory(JSON.stringify({ format: 'codedefense-free', version: 2, sessions: [old] }));
  const result = loadHistory()[0];
  expect(result.code).toBe(old.code);
  expect(result.records[0].answer).toBe('Original answer');
  expect(result.records[0].assessment).toBe('partial');
  expect(result.questions[0].correctIndex).toBe(old.questions[0].correctIndex);
  expect(result.config.adaptive).toBe(false);
  expect(values.get('codedefense-history-v1')).toBe('untouched');
});
it('round-trips saved programs, deduplicates IDs, and rejects invalid programs before writing history', () => {
  const p = {
    id: crypto.randomUUID(),
    name: 'My program',
    code: EXAMPLES[0].code,
    context: emptyContext,
    updatedAt: new Date().toISOString(),
  };
  saveProgram(p);
  saveProgram({ ...p, name: 'Updated' });
  saveHistory(begin());
  expect(loadPrograms()).toHaveLength(1);
  const exported = exportHistory();
  expect(exported.format).toBe('codeta');
  const before = values.get(HISTORY_KEY);
  expect(() =>
    importHistory(JSON.stringify({ ...exported, programs: [{ ...p, code: '\u0000' }] })),
  ).toThrow();
  expect(values.get(HISTORY_KEY)).toBe(before);
  values.delete(PROGRAMS_KEY);
  importHistory(JSON.stringify(exported));
  expect(loadPrograms()[0].name).toBe('Updated');
  deleteProgram(p.id);
  expect(loadPrograms()).toEqual([]);
});
it.each(EXAMPLES)('parses the actual beginner program: $name', async (example) => {
  const a = await analyzeCpp(example.code);
  expect(a.diagnostics).toEqual([]);
  expect(generateQuestions(a, configSchema.parse({})).length).toBeGreaterThan(0);
});
it('preserves unreadable original history in an exportable backup before saving new sessions',()=>{
  const original=JSON.stringify([{unrecognized:'Keep this original record'}]);
  values.set(HISTORY_KEY,original);saveHistory(begin());
  expect(exportHistory().preservedUnreadHistory).toBe(original);
  expect(loadHistory()).toHaveLength(1);
});
it('a coursework preset changes priority without inventing or bypassing excluded concepts',()=>{
  const base=configSchema.parse({seed:'preset',count:5,excluded:['recursion','array']});
  const plain=generateQuestions(analysis,base),preset=generateQuestions(analysis,{...base,preset:true});
  expect(preset).not.toEqual(plain);
  expect(preset.every(q=>!base.excluded.includes(q.concept))).toBe(true);
});
