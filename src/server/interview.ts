import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  analysisSchema,
  configSchema,
  evaluationSchema,
  questionsSchema,
  type ApiInput,
  type Feedback,
  type PracticeSession,
  type Question,
  type PublicQuestion,
} from '@/lib/schemas';
import { validateSource, verifyAnalysis, verifyEvidence, verifyQuestions } from '@/lib/source';
import { finalScore, score } from '@/lib/scoring';
import { AppError, settings } from './config';
import { redis, PREFIX, TTL } from './redis';
import { structured } from './ai';
import { ANALYZE, EVALUATE, GENERATE } from './prompts';

export type PrivateSession = PracticeSession & {
  owner: string;
  questions: Question[];
  pendingFollowUp: Question | null;
};
export function publicQuestion(q: Question): PublicQuestion {
  const { id, text, concept, difficulty, evidence } = q;
  return { id, text, concept, difficulty, evidence };
}
export function publicSession(s: PrivateSession): PracticeSession {
  const {
    id,
    code,
    context,
    analysis,
    config,
    demo,
    createdAt,
    expiresAt,
    index,
    total,
    stage,
    current,
    hint,
    records,
  } = s;
  return {
    id,
    code,
    context,
    analysis,
    config,
    demo,
    createdAt,
    expiresAt,
    index,
    total,
    stage,
    current,
    hint,
    records,
  };
}
function payload(s: PrivateSession) {
  return {
    code: s.code,
    numberedSource: s.code
      .split('\n')
      .map((l, i) => `${i + 1}: ${l}`)
      .join('\n'),
    context: s.context,
    analysis: s.analysis,
    config: s.config,
  };
}
async function load(id: string, owner: string) {
  const s = await redis().get<PrivateSession>(`${PREFIX}session:${id}`);
  if (!s || s.owner !== owner || Date.parse(s.expiresAt) <= Date.now())
    throw new AppError(
      404,
      'This live session has expired or belongs to another browser. Your local report is still available. Start a new interview to continue.',
      'expired',
    );
  return s;
}
async function save(s: PrivateSession) {
  const seconds = Math.max(1, Math.floor((Date.parse(s.expiresAt) - Date.now()) / 1000));
  await redis().set(`${PREFIX}session:${s.id}`, s, { ex: Math.min(seconds, TTL) });
  return publicSession(s);
}
export function feedback(e: ReturnType<typeof evaluationSchema.parse>, q: Question): Feedback {
  const { correctness, understanding, reasoning, explanation, missing, modelAnswer } = e;
  return {
    correctness,
    understanding,
    reasoning,
    explanation,
    missing,
    modelAnswer,
    score: score(e),
    expected: q.expected,
    rubric: q.rubric,
  };
}
function skippedFeedback(q: Question): Feedback {
  return {
    correctness: 0,
    understanding: 0,
    reasoning: 0,
    explanation: 'Skipped. Review the expected points, then try explaining them in your own words.',
    missing: q.expected,
    modelAnswer: q.expected.join(' '),
    expected: q.expected,
    rubric: q.rubric,
    score: 0,
  };
}

export async function act(
  input: ApiInput,
  owner: string,
  ip: string,
): Promise<PracticeSession | { deleted: true }> {
  if (input.action === 'analyze') {
    const code = validateSource(input.code, settings().maxCode);
    const analysis = await structured(
      analysisSchema,
      'code_analysis',
      ANALYZE,
      {
        code,
        numberedSource: code
          .split('\n')
          .map((l, i) => `${i + 1}: ${l}`)
          .join('\n'),
        context: input.context,
      },
      owner,
      ip,
      (v) => verifyAnalysis(code, v),
    );
    const s: PrivateSession = {
      id: randomUUID(),
      owner,
      code,
      context: input.context,
      analysis,
      config: configSchema.parse({}),
      demo: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + TTL * 1000).toISOString(),
      index: 0,
      total: 0,
      stage: 'analysis',
      current: null,
      hint: null,
      records: [],
      questions: [],
      pendingFollowUp: null,
    };
    return save(s);
  }
  const s = await load(input.id, owner);
  if (input.action === 'delete') {
    await redis().del(`${PREFIX}session:${s.id}`);
    return { deleted: true };
  }
  if (input.action === 'resume') return publicSession(s);
  if (input.action === 'restart') {
    return save({
      ...s,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      stage: 'analysis',
      questions: [],
      pendingFollowUp: null,
      records: [],
      index: 0,
      total: 0,
      current: null,
      hint: null,
    });
  }
  if (input.action === 'retry') {
    if (s.stage !== 'complete') throw new AppError(409, 'Finish this interview first.', 'state');
    const weak = s.records.filter((r) => r.finalScore < 8).map((r) => r.question.id);
    const selected = s.questions.filter((q) => weak.includes(q.id));
    if (!selected.length) throw new AppError(409, 'No questions need retrying.', 'state');
    const next: PrivateSession = {
      ...s,
      id: randomUUID(),
      questions: selected,
      records: [],
      index: 0,
      total: selected.length,
      stage: 'question',
      current: publicQuestion(selected[0]),
      pendingFollowUp: null,
      hint: null,
      createdAt: new Date().toISOString(),
    };
    return save(next);
  }
  if (input.action === 'start') {
    if (s.stage !== 'analysis') return publicSession(s);
    s.config = input.config;
    const result = await structured(
      questionsSchema,
      'interview_questions',
      GENERATE,
      payload(s),
      owner,
      ip,
      (v) => ({ questions: verifyQuestions(s.code, s.analysis, v.questions, input.config.count) }),
      10000,
    );
    s.questions = result.questions;
    s.total = s.questions.length;
    s.current = publicQuestion(s.questions[0]);
    s.stage = 'question';
    return save(s);
  }
  const q = s.questions[s.index];
  if (!q)
    throw new AppError(
      409,
      'This interview has no active question. Resume or start a new session.',
      'state',
    );
  if (input.action === 'hint') {
    if (s.stage === 'question') s.hint = q.hint;
    else if (s.stage === 'followup') s.hint = s.pendingFollowUp?.hint || null;
    return save(s);
  }
  if (input.action === 'skip') {
    if (s.stage === 'question') {
      s.records.push({
        question: publicQuestion(q),
        answer: '',
        feedback: skippedFeedback(q),
        skipped: true,
        initialScore: 0,
        finalScore: 0,
      });
      s.stage = 'feedback';
    } else if (s.stage === 'followup') {
      const pending = s.pendingFollowUp!;
      s.records.at(-1)!.followUp = {
        question: publicQuestion(pending),
        answer: '',
        feedback: skippedFeedback(pending),
        skipped: true,
      };
      s.pendingFollowUp = null;
      s.current = publicQuestion(q);
      s.stage = 'feedback';
      s.hint = null;
    }
    return save(s);
  }
  if (input.action === 'next') {
    if (s.stage !== 'feedback')
      throw new AppError(409, 'Answer or skip the current question first.', 'state');
    if (s.pendingFollowUp) {
      s.stage = 'followup';
      s.current = publicQuestion(s.pendingFollowUp);
      s.hint = null;
    } else {
      s.index++;
      s.hint = null;
      if (s.index >= s.total) {
        s.stage = 'complete';
        s.current = null;
      } else {
        s.stage = 'question';
        s.current = publicQuestion(s.questions[s.index]);
      }
    }
    return save(s);
  }
  if (input.action === 'answer') {
    const followUp = s.stage === 'followup';
    if ((s.stage !== 'question' && !followUp) || input.followUp !== followUp)
      throw new AppError(
        409,
        'This answer was already submitted or the question changed. Resume your session.',
        'state',
      );
    const current = followUp ? s.pendingFollowUp! : q;
    if (input.questionId !== current.id)
      throw new AppError(409, 'The active question changed. Resume your session.', 'state');
    const e = await structured(
      evaluationSchema,
      'answer_evaluation',
      EVALUATE,
      {
        ...payload(s),
        current,
        answer: input.answer,
        allowFollowUp: !followUp,
        initialAnswer: followUp ? s.records.at(-1)?.answer : null,
      },
      owner,
      ip,
      (v) => {
        if (
          v.followUp &&
          (followUp ||
            !verifyEvidence(s.code, v.followUp.evidence) ||
            !s.analysis.concepts.some((c) => c.name === v.followUp!.concept) ||
            s.questions.some((q) => q.id === v.followUp!.id))
        )
          throw new Error('Invalid follow-up');
        return v;
      },
      3500,
    );
    const f = feedback(e, current);
    if (followUp) {
      const record = s.records.at(-1)!;
      record.followUp = { question: publicQuestion(current), answer: input.answer, feedback: f };
      record.finalScore = finalScore(record.initialScore, f.score);
      s.pendingFollowUp = null;
      s.current = publicQuestion(q);
    } else {
      s.records.push({
        question: publicQuestion(q),
        answer: input.answer,
        feedback: f,
        skipped: false,
        initialScore: f.score,
        finalScore: f.score,
      });
      s.pendingFollowUp = e.followUp;
    }
    s.stage = 'feedback';
    s.hint = null;
    return save(s);
  }
  throw new AppError(400, 'Unknown action.');
}
