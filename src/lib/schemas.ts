import { z } from 'zod';

export const HARD_MAX_CODE = 30_000;
export const MAX_FILE_BYTES = 120_000;
const text = z.string().min(1).max(2400);
export const evidenceSchema = z.object({
  start: z.number().int().min(1),
  end: z.number().int().min(1),
  snippet: z.string().min(1).max(5000),
});
export const conceptSchema = z.object({
  name: z.string().min(1).max(100),
  evidence: evidenceSchema,
});
export const analysisSchema = z.object({
  summary: text,
  concepts: z.array(conceptSchema).min(1).max(20),
  review: z.array(z.object({ explanation: text, evidence: evidenceSchema })).max(8),
  risks: z.array(text).max(8),
  difficulty: z.enum(['Beginner', 'Normal TA', 'Strict TA']),
});
export const configSchema = z.object({
  difficulty: z.enum(['Beginner', 'Normal TA', 'Strict TA']).default('Normal TA'),
  count: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(10),
  mode: z
    .enum(['Standard TA Interview', 'Explain My Code', 'Debugging Challenge', 'Rapid Fire'])
    .default('Standard TA Interview'),
  timer: z.boolean().default(false),
});
export const contextSchema = z.object({
  title: z.string().max(150),
  requirements: z.string().max(2000),
  topics: z.string().max(1000),
  restrictions: z.string().max(1000),
  standard: z.enum(['C++11', 'C++14', 'C++17', 'C++20', 'C++23']),
});
export const questionSchema = z.object({
  id: z.string().min(1).max(80),
  text,
  concept: z.string().min(1).max(100),
  difficulty: z.enum(['Beginner', 'Normal TA', 'Strict TA']),
  evidence: evidenceSchema,
  expected: z.array(text).min(1).max(6),
  rubric: text,
  hint: text,
});
export const questionsSchema = z.object({ questions: z.array(questionSchema).min(1).max(15) });
export const evaluationSchema = z.object({
  correctness: z.number().int().min(0).max(4),
  understanding: z.number().int().min(0).max(4),
  reasoning: z.number().int().min(0).max(2),
  explanation: text,
  missing: z.array(text).max(6),
  modelAnswer: text,
  followUp: questionSchema.nullable(),
});
export const codeSchema = z
  .string()
  .min(1, 'Paste some C++ code first.')
  .max(HARD_MAX_CODE)
  .refine((v) => v.trim().length > 0, 'Paste some C++ code first.')
  .refine(
    (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v),
    'Only text source code is accepted.',
  )
  .refine((v) => v.split('\n').length <= 1500, 'Use at most 1,500 lines.');
export const requestSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('analyze'),
      code: codeSchema,
      context: contextSchema,
      consent: z.literal(true),
      challenge: z.string().max(2048),
    })
    .strict(),
  z
    .object({
      action: z.literal('start'),
      id: z.uuid(),
      config: configSchema,
      challenge: z.string().max(2048),
    })
    .strict(),
  z
    .object({
      action: z.literal('answer'),
      id: z.uuid(),
      questionId: z.string().max(80),
      answer: z.string().trim().min(1, 'Write an answer first.').max(4000),
      followUp: z.boolean(),
      challenge: z.string().max(2048),
    })
    .strict(),
  z
    .object({
      action: z.enum(['hint', 'skip', 'next', 'resume', 'delete', 'retry', 'restart']),
      id: z.uuid(),
    })
    .strict(),
]);
export type Analysis = z.infer<typeof analysisSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
export type InterviewConfig = z.infer<typeof configSchema>;
export type AssignmentContext = z.infer<typeof contextSchema>;
export type ApiInput = z.infer<typeof requestSchema>;
export type PublicQuestion = Omit<Question, 'expected' | 'rubric' | 'hint'>;
export type Feedback = Omit<Evaluation, 'followUp'> & {
  score: number;
  expected: string[];
  rubric: string;
};
export type AnswerRecord = {
  question: PublicQuestion;
  answer: string;
  feedback: Feedback;
  skipped: boolean;
  followUp?: { question: PublicQuestion; answer: string; feedback: Feedback; skipped?: boolean };
  initialScore: number;
  finalScore: number;
};
export type PracticeSession = {
  id: string;
  code: string;
  context: AssignmentContext;
  analysis: Analysis;
  config: InterviewConfig;
  demo: boolean;
  createdAt: string;
  expiresAt: string;
  index: number;
  total: number;
  stage: 'analysis' | 'question' | 'feedback' | 'followup' | 'complete';
  current: PublicQuestion | null;
  hint: string | null;
  records: AnswerRecord[];
  retryQuestionIds?: string[];
};
export const emptyContext: AssignmentContext = {
  title: '',
  requirements: '',
  topics: '',
  restrictions: '',
  standard: 'C++11',
};
const publicQuestionSchema = questionSchema.omit({ expected: true, rubric: true, hint: true });
const feedbackSchema = evaluationSchema
  .omit({ followUp: true })
  .extend({ score: z.number().min(0).max(10), expected: z.array(text).max(6), rubric: text });
const answerRecordSchema = z.object({
  question: publicQuestionSchema,
  answer: z.string().max(4100),
  feedback: feedbackSchema,
  skipped: z.boolean(),
  initialScore: z.number().min(0).max(10),
  finalScore: z.number().min(0).max(10),
  followUp: z
    .object({
      question: publicQuestionSchema,
      answer: z.string().max(4000),
      feedback: feedbackSchema,
      skipped: z.boolean().optional(),
    })
    .optional(),
});
export const storedSessionSchema: z.ZodType<PracticeSession> = z.object({
  id: z.uuid(),
  code: codeSchema,
  context: contextSchema,
  analysis: analysisSchema,
  config: configSchema,
  demo: z.boolean(),
  createdAt: z.string().max(40),
  expiresAt: z.string().max(40),
  index: z.number().int().min(0).max(15),
  total: z.number().int().min(0).max(15),
  stage: z.enum(['analysis', 'question', 'feedback', 'followup', 'complete']),
  current: publicQuestionSchema.nullable(),
  hint: z.string().max(2400).nullable(),
  records: z.array(answerRecordSchema).max(15),
  retryQuestionIds: z.array(z.string()).max(15).optional(),
});
