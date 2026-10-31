import { codeSchema, MAX_FILE_BYTES, type Analysis, type Question } from './schemas';

export function normalizeSource(code: string) {
  return code.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
}
export function validateSource(code: string, max = 30_000) {
  const normalized = normalizeSource(code);
  const result = codeSchema.safeParse(normalized);
  if (!result.success) throw new Error(result.error.issues[0].message);
  if (normalized.length > max)
    throw new Error(`Keep source code within ${max.toLocaleString()} characters.`);
  return normalized;
}
export async function readSourceFile(
  file: Pick<File, 'name' | 'size' | 'arrayBuffer'>,
  max = 30_000,
) {
  if (!/\.(cpp|txt)$/i.test(file.name)) throw new Error('Choose a .cpp or .txt source file.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Files must be at most 120 KB.');
  const bytes = await file.arrayBuffer();
  let content: string;
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Save your source as UTF-8 text first.');
  }
  return validateSource(content, max);
}
export function sourceSlice(code: string, start: number, end: number) {
  return code
    .split('\n')
    .slice(start - 1, end)
    .join('\n');
}
export function verifyEvidence(
  code: string,
  value: { start: number; end: number; snippet: string },
) {
  return (
    value.start <= value.end &&
    value.end <= code.split('\n').length &&
    sourceSlice(code, value.start, value.end) === value.snippet
  );
}
export function verifyAnalysis(code: string, analysis: Analysis) {
  if (
    ![...analysis.concepts.map((c) => c.evidence), ...analysis.review.map((r) => r.evidence)].every(
      (e) => verifyEvidence(code, e),
    )
  )
    throw new Error('Source evidence did not match.');
  if (new Set(analysis.concepts.map((c) => c.name.toLowerCase())).size !== analysis.concepts.length)
    throw new Error('Duplicate concepts.');
  return analysis;
}
export function verifyQuestions(
  code: string,
  analysis: Analysis,
  questions: Question[],
  count: number,
) {
  if (
    questions.length !== count ||
    new Set(questions.map((q) => q.id)).size !== count ||
    new Set(questions.map((q) => q.text.trim().toLowerCase())).size !== count
  )
    throw new Error('Invalid question set.');
  for (const q of questions)
    if (!verifyEvidence(code, q.evidence) || !analysis.concepts.some((c) => c.name === q.concept))
      throw new Error('Question must reference a detected concept and exact source lines.');
  return questions;
}
