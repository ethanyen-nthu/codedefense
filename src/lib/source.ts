import { codeSchema, MAX_FILE_BYTES, type Evidence } from './schemas';
export function normalizeSource(code: string) {
  return code.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
}
export function validateSource(code: string) {
  const result = codeSchema.safeParse(normalizeSource(code));
  if (!result.success) throw new Error(result.error.issues[0].message);
  return result.data;
}
export async function readSourceFile(file: Pick<File, 'name' | 'size' | 'arrayBuffer'>) {
  if (!/\.(cpp|txt)$/i.test(file.name)) throw new Error('Choose a .cpp or .txt source file.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Files must be at most 120 KB.');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new Error('Save the file as UTF-8 text first.');
  }
  return validateSource(text);
}
export function sourceSlice(code: string, start: number, end: number) {
  return code
    .split('\n')
    .slice(start - 1, end)
    .join('\n');
}
export function verifyEvidence(code: string, e: Evidence) {
  return (
    e.start >= 1 &&
    e.end >= e.start &&
    e.end <= code.split('\n').length &&
    sourceSlice(code, e.start, e.end) === e.snippet
  );
}
