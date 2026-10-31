import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { AppError } from './config';

export const COOKIE = 'cd_anonymous';
export function signature(value: string) {
  return createHmac('sha256', process.env.SESSION_SECRET || 'demo-only-no-live-access')
    .update(value)
    .digest('hex');
}
export function issueIdentity() {
  const id = randomUUID();
  return `${id}.${signature(id)}`;
}
export function identity(cookie: string | undefined) {
  if (!cookie)
    throw new AppError(401, 'Refresh the page to establish a secure practice session.', 'identity');
  const [id, sig] = cookie.split('.');
  const expected = signature(id || '');
  if (
    !/^[0-9a-f-]{36}$/.test(id || '') ||
    !sig ||
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    throw new AppError(401, 'Refresh the page to establish a secure practice session.', 'identity');
  return id;
}
export function safeOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== allowed || request.headers.get('sec-fetch-site') === 'cross-site')
    throw new AppError(403, 'Please use CodeDefense from its own website.', 'origin');
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new AppError(415, 'Send a JSON request.', 'content_type');
}
export function ipHash(request: Request) {
  // Vercel overwrites this header at its edge. Never use a client-supplied proxy header on another host.
  const ip = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()
    : process.env.NODE_ENV !== 'production'
      ? 'local-development'
      : null;
  if (!ip) throw new AppError(503, 'Live practice requires trusted proxy configuration.', 'proxy');
  return signature(`ip:${ip}`);
}
export async function boundedJson(request: Request) {
  const limit = 250_000;
  if (Number(request.headers.get('content-length')) > limit)
    throw new AppError(413, 'The submitted request is too large.', 'size');
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'Request body is required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new AppError(413, 'The submitted request is too large.', 'size');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AppError(400, 'The request could not be read.', 'json');
  }
}
export async function verifyChallenge(token: string) {
  if (!token) throw new AppError(403, 'Complete the security check first.', 'challenge');
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json();
    const hostname = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).hostname : undefined;
    if (
      !response.ok ||
      !result.success ||
      result.action !== 'practice' ||
      (hostname && result.hostname !== hostname)
    )
      throw new Error();
  } catch {
    throw new AppError(
      403,
      'The security check expired or failed. Please try it again.',
      'challenge',
    );
  }
}
