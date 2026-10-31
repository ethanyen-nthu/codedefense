import { z } from 'zod';
export const HARD_MAX_CODE = 30000,
  MAX_FILE_BYTES = 120000;
export const evidenceSchema = z.object({
  start: z.number().int().positive(),
  end: z.number().int().positive(),
  snippet: z.string().max(30000),
});
export const kinds = [
  'variable',
  'initialization',
  'int',
  'double',
  'char',
  'bool',
  'string',
  'cin',
  'cout',
  'if',
  'else',
  'else-if',
  'switch',
  'case',
  'for',
  'while',
  'do-while',
  'nested-loop',
  'array',
  'function',
  'parameter',
  'return',
  'recursion',
  'arithmetic',
  'comparison',
  'modulo',
  'integer-division',
  'division',
  'and',
  'or',
  'break',
  'continue',
  'scope',
] as const;
export type Kind = (typeof kinds)[number];
export type Evidence = z.infer<typeof evidenceSchema>;
export type Construct = { kind: Kind; name: string; detail: string; evidence: Evidence };
export type Diagnostic = { line: number; column: number; message: string };
export type Analysis = {
  constructs: Construct[];
  diagnostics: Diagnostic[];
  summary: string;
  parser: 'Tree-sitter C++';
  limitations: string[];
};
export const contextSchema = z.object({
  title: z.string().max(150),
  requirements: z.string().max(2000),
  topics: z.string().max(1000),
  restrictions: z.string().max(1000),
  standard: z.literal('C++11'),
});
export const emptyContext: z.infer<typeof contextSchema> = {
  title: '',
  requirements: '',
  topics: '',
  restrictions: '',
  standard: 'C++11',
};
export const configSchema = z.object({
  difficulty: z.enum(['Beginner', 'Normal TA', 'Strict TA']).default('Normal TA'),
  count: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(10),
  mode: z
    .enum([
      'Standard TA Interview',
      'Explain My Code',
      'Debugging Challenge',
      'Quick Multiple Choice',
    ])
    .default('Standard TA Interview'),
  seed: z.string().max(80).default(''),
});
export type InterviewConfig = z.infer<typeof configSchema>;
export type AssignmentContext = z.infer<typeof contextSchema>;
export const questionSchema = z.object({
  id: z.string().max(180),
  templateId: z.string(),
  text: z.string(),
  concept: z.enum(kinds),
  evidence: evidenceSchema,
  hint: z.string(),
  expected: z.array(z.string()),
  explanation: z.string(),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  followUp: z
    .object({ text: z.string(), explanation: z.string(), expected: z.array(z.string()) })
    .nullable(),
});
export type Question = z.infer<typeof questionSchema>;
export const assessmentSchema = z.enum(['complete', 'partial', 'not-yet']);
export type Assessment = z.infer<typeof assessmentSchema>;
export const recordSchema = z.object({
  question: questionSchema,
  answer: z.string().max(4000),
  choice: z.number().int().min(0).max(3).nullable(),
  correct: z.boolean().nullable(),
  assessment: assessmentSchema.nullable(),
  skipped: z.boolean(),
  followUp: z
    .object({
      answer: z.string().max(4000),
      assessment: assessmentSchema.nullable(),
      skipped: z.boolean(),
    })
    .nullable(),
});
export type AnswerRecord = z.infer<typeof recordSchema>;
export const sessionSchema = z.object({
  version: z.literal(2),
  id: z.uuid(),
  code: z.string().max(HARD_MAX_CODE),
  context: contextSchema,
  analysis: z.object({
    constructs: z
      .array(
        z.object({
          kind: z.enum(kinds),
          name: z.string(),
          detail: z.string(),
          evidence: evidenceSchema,
        }),
      )
      .max(1200),
    diagnostics: z.array(z.object({ line: z.number(), column: z.number(), message: z.string() })),
    summary: z.string(),
    parser: z.literal('Tree-sitter C++'),
    limitations: z.array(z.string()),
  }),
  config: configSchema,
  questions: z.array(questionSchema).min(1).max(15),
  createdAt: z.iso.datetime(),
  index: z.number().int().min(0).max(15),
  stage: z.enum(['question', 'feedback', 'followup', 'followup-feedback', 'complete']),
  records: z.array(recordSchema).max(15),
  draft: z.string().max(4000),
  draftChoice: z.number().int().min(0).max(3).nullable(),
  hint: z.boolean(),
});
export type PracticeSession = z.infer<typeof sessionSchema>;
export const codeSchema = z
  .string()
  .min(1, 'Paste some C++ code first.')
  .max(HARD_MAX_CODE, 'Use at most 30,000 characters.')
  .refine((s) => Boolean(s.trim()), 'Paste some C++ code first.')
  .refine(
    (s) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s),
    'Only text source code is accepted.',
  )
  .refine((s) => s.split('\n').length <= 1500, 'Use at most 1,500 lines.');
