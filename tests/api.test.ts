import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { act, burst, verify, cache } = vi.hoisted(() => ({
  act: vi.fn(),
  burst: vi.fn(),
  verify: vi.fn(),
  cache: new Map<string, unknown>(),
}));
vi.mock('@/server/interview', () => ({ act }));
vi.mock('@/server/redis', () => ({
  PREFIX: 'test:',
  burstLimit: burst,
  withLease: async (_o: string, fn: () => Promise<unknown>) => fn(),
  redis: () => ({
    get: async (k: string) => cache.get(k),
    set: async (k: string, v: unknown) => cache.set(k, v),
  }),
}));
vi.mock('@/server/security', async () => {
  const actual = await vi.importActual<typeof import('@/server/security')>('@/server/security');
  return { ...actual, verifyChallenge: verify };
});
import { GET, POST } from '@/app/api/practice/route';
import { issueIdentity } from '@/server/security';
import { createDemo } from '@/lib/demo';
beforeEach(() => {
  cache.clear();
  act.mockReset();
  burst.mockReset().mockResolvedValue(undefined);
  verify.mockReset().mockResolvedValue(undefined);
  for (const k of [
    'OPENAI_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
    'TURNSTILE_SECRET_KEY',
  ])
    vi.stubEnv(k, 'test-only-not-a-credential');
  vi.stubEnv('SESSION_SECRET', 's'.repeat(40));
  vi.stubEnv('APP_ORIGIN', 'https://code.test');
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('VERCEL', '');
});
afterEach(() => vi.unstubAllEnvs());
function request(
  body: unknown,
  origin = 'https://code.test',
  cookie = `cd_anonymous=${issueIdentity()}`,
) {
  return new NextRequest('https://code.test/api/practice', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json', cookie },
    body: JSON.stringify(body),
  });
}
const valid = () => ({
  action: 'analyze',
  code: createDemo().code,
  context: createDemo().context,
  consent: true,
  challenge: 'token',
});
it('status creates an HttpOnly strict anonymous cookie without model requests', async () => {
  const r = await GET(new NextRequest('https://code.test/api/practice'));
  expect(r.status).toBe(200);
  expect(r.headers.get('set-cookie')).toContain('HttpOnly');
  expect(r.headers.get('set-cookie')).toContain('SameSite=strict');
  expect(act).not.toHaveBeenCalled();
});
it('missing credentials return a safe 503 with zero AI calls', async () => {
  vi.stubEnv('OPENAI_API_KEY', '');
  const r = await POST(request(valid()));
  expect(r.status).toBe(503);
  expect(act).not.toHaveBeenCalled();
});
it('rejects cross-origin calls', async () => {
  const r = await POST(request(valid(), 'https://attacker.test'));
  expect(r.status).toBe(403);
  expect(act).not.toHaveBeenCalled();
});
it('rejects forged grading data and empty answers before reaching service', async () => {
  for (const extra of [{ score: 10 }, { answer: ' ' }]) {
    const r = await POST(
      request({
        action: 'answer',
        id: crypto.randomUUID(),
        questionId: 'q0',
        answer: 'ok',
        followUp: false,
        challenge: 'token',
        ...extra,
      }),
    );
    expect(r.status).toBe(400);
  }
  expect(act).not.toHaveBeenCalled();
});
it('hides internal infrastructure details on failure', async () => {
  act.mockRejectedValue(new Error('SECRET-provider-body'));
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const r = await POST(request(valid()));
  expect(r.status).toBe(503);
  expect(JSON.stringify(await r.json())).not.toContain('SECRET');
  expect(JSON.stringify(spy.mock.calls)).not.toContain('SECRET');
  spy.mockRestore();
});
it('deduplicates repeated expensive submissions, retrieving authoritative current state', async () => {
  const s = createDemo();
  act.mockResolvedValue(s);
  const body = valid(),
    cookie = `cd_anonymous=${issueIdentity()}`;
  function req() {
    return request(body, 'https://code.test', cookie);
  }
  expect((await POST(req())).status).toBe(200);
  expect((await POST(req())).status).toBe(200);
  expect(act).toHaveBeenCalledTimes(2);
  expect(act.mock.calls[1][0]).toEqual({ action: 'resume', id: s.id });
  expect(verify).toHaveBeenCalledTimes(1);
});
