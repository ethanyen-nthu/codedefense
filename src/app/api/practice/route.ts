import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { requestSchema } from '@/lib/schemas';
import { AppError, readiness, requireReady, settings } from '@/server/config';
import {
  boundedJson,
  COOKIE,
  identity,
  ipHash,
  issueIdentity,
  safeOrigin,
  verifyChallenge,
} from '@/server/security';
import { burstLimit, PREFIX, redis, withLease } from '@/server/redis';
import { act } from '@/server/interview';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: NextRequest) {
  let value = request.cookies.get(COOKIE)?.value;
  try {
    identity(value);
  } catch {
    value = issueIdentity();
  }
  let maxCode = 30000,
    live = readiness();
  try {
    maxCode = settings().maxCode;
  } catch {
    live = false;
  }
  const response = NextResponse.json(
    { live, maxCode, siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null },
    { headers },
  );
  response.cookies.set(COOKIE, value!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 86400,
  });
  return response;
}
export async function POST(request: NextRequest) {
  try {
    safeOrigin(request);
    requireReady();
    const owner = identity(request.cookies.get(COOKIE)?.value),
      ip = ipHash(request);
    await burstLimit(owner, ip);
    const parsed = requestSchema.safeParse(await boundedJson(request));
    if (!parsed.success)
      throw new AppError(
        400,
        'Check your code, answer, and interview settings. Empty or oversized input is not accepted.',
        'validation',
      );
    const input = parsed.data;
    // Derive duplicates from the action payload, excluding the one-time Turnstile token.
    const stable = { ...input, ...('challenge' in input ? { challenge: undefined } : {}) };
    const hash = createHash('sha256').update(JSON.stringify(stable)).digest('hex');
    const key = `${PREFIX}duplicate:${owner}:${hash}`;
    return await withLease(owner, async () => {
      // Resume and next are state reads/transitions and must never return a stale cached snapshot.
      const cacheable =
        input.action === 'analyze' || input.action === 'start' || input.action === 'answer';
      if (cacheable) {
        const cachedId = await redis().get<string>(key);
        if (cachedId) {
          const latest = await act({ action: 'resume', id: cachedId }, owner, ip);
          return NextResponse.json(latest, { headers });
        }
      }
      if ('challenge' in input) await verifyChallenge(input.challenge);
      const result = await act(input, owner, ip);
      if (cacheable && 'id' in result) await redis().set(key, result.id, { ex: 300 });
      return NextResponse.json(result, { headers });
    });
  } catch (error) {
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers },
      );
    // Never log request payloads, provider error bodies, credentials, code, or answers.
    console.error('CodeDefense request failed', { category: 'infrastructure' });
    return NextResponse.json(
      {
        error: 'Practice is temporarily unavailable. Your local progress is safe. Please retry.',
        code: 'unavailable',
      },
      { status: 503, headers },
    );
  }
}
