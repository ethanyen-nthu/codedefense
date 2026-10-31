import { QUESTION_BANK } from './question-bank';
import {
  configSchema,
  type Analysis,
  type AssignmentContext,
  type InterviewConfig,
  type PracticeSession,
  type Question,
  type Assessment,
} from './schemas';
export function random(seed: string) {
  let n = 2166136261;
  for (const c of seed) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(list: T[], rng: () => number) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function generateQuestions(analysis: Analysis, config: InterviewConfig): Question[] {
  if (analysis.diagnostics.length)
    throw new Error('Repair the reported syntax errors before starting an interview.');
  const rng = random(config.seed),
    maxLevel = config.difficulty === 'Beginner' ? 1 : config.difficulty === 'Normal TA' ? 2 : 3;
  const candidates = QUESTION_BANK.filter(
    (t) =>
      t.level <= maxLevel &&
      analysis.constructs.some(
        (c) =>
          c.kind === t.kind &&
          !(
            t.kind === 'modulo' &&
            t.prompt.includes('decimal digit processing') &&
            c.detail !== 'divisor:10'
          ) &&
          !(
            t.kind === 'break' &&
            t.prompt.includes('switch case') &&
            c.detail !== 'target:switch'
          ) &&
          !(
            t.kind === 'continue' &&
            t.prompt.includes('switch nested') &&
            c.detail !== 'switch-loop'
          ) &&
          !(c.kind === 'for' && c.detail.startsWith('Range-based')) &&
          !(
            t.kind === 'variable' &&
            t.prompt.includes('primitive') &&
            ![
              'int',
              'double',
              'char',
              'bool',
              'long',
              'short',
              'unsigned',
              'signed',
              'long long',
            ].includes(c.detail)
          ),
      ),
  );
  const preferred =
    config.mode === 'Explain My Code'
      ? 'explain'
      : config.mode === 'Debugging Challenge'
        ? 'debug'
        : null;
  const ordered = shuffle(candidates, rng).sort(
    (a, b) => Number(b.style === preferred) - Number(a.style === preferred),
  );
  // Round-robin categories prevents a large number of declarations from crowding out loops/operators.
  const groups = new Map<string, typeof ordered>();
  for (const t of ordered) groups.set(t.kind, [...(groups.get(t.kind) || []), t]);
  const chosen: typeof ordered = [];
  while (chosen.length < config.count && [...groups.values()].some((g) => g.length)) {
    for (const group of groups.values()) {
      if (chosen.length >= config.count) break;
      const t = group.shift();
      if (t) chosen.push(t);
    }
  }
  return chosen.map((t) => {
    const supported = analysis.constructs.filter(
        (c) =>
          c.kind === t.kind &&
          !(
            t.kind === 'modulo' &&
            t.prompt.includes('decimal digit processing') &&
            c.detail !== 'divisor:10'
          ) &&
          !(
            t.kind === 'break' &&
            t.prompt.includes('switch case') &&
            c.detail !== 'target:switch'
          ) &&
          !(
            t.kind === 'continue' &&
            t.prompt.includes('switch nested') &&
            c.detail !== 'switch-loop'
          ) &&
          !(c.kind === 'for' && c.detail.startsWith('Range-based')) &&
          !(
            t.kind === 'variable' &&
            t.prompt.includes('primitive') &&
            ![
              'int',
              'double',
              'char',
              'bool',
              'long',
              'short',
              'unsigned',
              'signed',
              'long long',
            ].includes(c.detail)
          ),
      ),
      c = supported[Math.floor(rng() * supported.length)];
    const fill = (text: string) =>
      text.replaceAll('{name}', c.name).replaceAll('{line}', String(c.evidence.start));
    const reference = fill(t.reference),
      options = shuffle(
        [{ text: reference, correct: true }, ...t.wrong.map((text) => ({ text, correct: false }))],
        rng,
      );
    return {
      id: `${t.id}:${c.evidence.start}`,
      templateId: t.id,
      text: fill(t.prompt),
      concept: t.kind,
      evidence: c.evidence,
      hint: 'Read the highlighted source and identify the construct. Separate the language rule from assumptions about inputs and runtime behavior.',
      expected: [
        reference,
        'Relate this rule to the cited source and state any relevant assumptions.',
      ],
      explanation: reference,
      choices: options.map((o) => o.text),
      correctIndex: options.findIndex((o) => o.correct),
      followUp: t.follow
        ? {
            text: t.follow[0],
            explanation: t.follow[1],
            expected: [
              t.follow[1],
              'Connect the explanation to the highlighted source without assuming an unverified output.',
            ],
          }
        : null,
    };
  });
}
export function createSession(
  code: string,
  analysis: Analysis,
  context: AssignmentContext,
  input: InterviewConfig,
): PracticeSession {
  const config = configSchema.parse({ ...input, seed: input.seed || crypto.randomUUID() }),
    questions = generateQuestions(analysis, config);
  if (!questions.length)
    throw new Error(
      'No reviewed questions fit the detected constructs and difficulty. Try Normal TA or add more source code.',
    );
  return {
    version: 2,
    id: crypto.randomUUID(),
    code,
    context,
    analysis,
    config,
    questions,
    createdAt: new Date().toISOString(),
    index: 0,
    stage: 'question',
    records: [],
    draft: '',
    draftChoice: null,
    hint: false,
  };
}
export function submit(session: PracticeSession, skip = false): PracticeSession {
  const s = structuredClone(session),
    q = s.questions[s.index];
  if (s.stage === 'followup') {
    if (!skip && !s.draft.trim()) throw new Error('Write your follow-up explanation first.');
    s.records.at(-1)!.followUp = { answer: skip ? '' : s.draft, assessment: null, skipped: skip };
    s.stage = 'followup-feedback';
  } else if (s.stage === 'question') {
    const mc = s.config.mode === 'Quick Multiple Choice';
    if (!skip && (mc ? s.draftChoice === null : !s.draft.trim()))
      throw new Error(mc ? 'Choose an answer first.' : 'Write an answer first.');
    s.records.push({
      question: q,
      answer: skip ? '' : s.draft,
      choice: skip ? null : s.draftChoice,
      correct: mc ? !skip && s.draftChoice === q.correctIndex : null,
      assessment: null,
      skipped: skip,
      followUp: null,
    });
    s.stage = 'feedback';
  } else throw new Error('This response is already recorded.');
  s.draft = '';
  s.draftChoice = null;
  s.hint = false;
  return s;
}
export function assess(session: PracticeSession, value: Assessment): PracticeSession {
  const s = structuredClone(session),
    r = s.records.at(-1);
  if (!r) throw new Error('Submit an answer first.');
  if (s.stage === 'followup-feedback' && r.followUp && !r.followUp.skipped)
    r.followUp.assessment = value;
  else if (s.stage === 'feedback' && !r.skipped && s.config.mode !== 'Quick Multiple Choice')
    r.assessment = value;
  else throw new Error('No written response is awaiting self-assessment.');
  return s;
}
export function canAdvance(s: PracticeSession) {
  const r = s.records.at(-1);
  return Boolean(
    r &&
    (s.stage === 'feedback'
      ? r.skipped || s.config.mode === 'Quick Multiple Choice' || r.assessment
      : s.stage === 'followup-feedback'
        ? r.followUp?.skipped || r.followUp?.assessment
        : false),
  );
}
export function advance(session: PracticeSession): PracticeSession {
  if (!canAdvance(session))
    throw new Error('Compare your answer and record your self-assessment first.');
  const s = structuredClone(session);
  s.index++;
  s.stage = s.index >= s.questions.length ? 'complete' : 'question';
  s.hint = false;
  return s;
}
export function followUp(session: PracticeSession): PracticeSession {
  const r = session.records.at(-1);
  if (session.stage !== 'feedback' || !canAdvance(session) || !r?.question.followUp || r.followUp)
    throw new Error('Only one supported follow-up is available after this answer.');
  return { ...session, stage: 'followup', draft: '', draftChoice: null, hint: false };
}
export function isWeak(r: PracticeSession['records'][number]) {
  return (
    r.skipped ||
    r.correct === false ||
    (r.correct === null && r.assessment !== 'complete') ||
    Boolean(r.followUp && (r.followUp.skipped || r.followUp.assessment !== 'complete'))
  );
}
export function retryWeak(s: PracticeSession): PracticeSession {
  const questions = s.records.filter(isWeak).map((r) => r.question);
  if (!questions.length) throw new Error('No weak questions were recorded.');
  return {
    ...s,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    questions,
    index: 0,
    stage: 'question',
    records: [],
    draft: '',
    draftChoice: null,
    hint: false,
  };
}
export function summarize(s: PracticeSession) {
  const auto = s.records.filter((r) => r.correct !== null),
    written = s.records.filter((r) => r.correct === null && !r.skipped);
  const correct = auto.filter((r) => !r.skipped && r.choice === r.question.correctIndex).length;
  return {
    completed: s.records.filter((r) => !r.skipped).length,
    skipped: s.records.filter((r) => r.skipped).length,
    autoTotal: auto.length,
    autoCorrect: correct,
    autoScore: auto.length ? Math.round((correct / auto.length) * 100) : null,
    complete: written.filter((r) => r.assessment === 'complete').length,
    partial: written.filter((r) => r.assessment === 'partial').length,
    notYet: written.filter((r) => r.assessment === 'not-yet').length,
    unassessed: written.filter((r) => r.assessment === null).length,
    concepts: [...new Set(s.records.map((r) => r.question.concept))],
    weak: [...new Set(s.records.filter(isWeak).map((r) => r.question.concept))],
  };
}
