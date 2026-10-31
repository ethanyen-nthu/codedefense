import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import {
  boundedJson,
  identity,
  issueIdentity,
  ipHash,
  safeOrigin,
  verifyChallenge,
} from '@/server/security';
import { readiness, requireReady, settings } from '@/server/config';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
beforeEach(() => vi.stubEnv('SESSION_SECRET', 'x'.repeat(40)));
describe('anonymous request security', () => {
  it('accepts a signed identity and rejects a modified one', () => {
    const value = issueIdentity();
    expect(identity(value)).toHaveLength(36);
    expect(() => identity(value.slice(0, -1) + 'z')).toThrow();
    expect(() => identity(undefined)).toThrow();
  });
  it('blocks cross-origin requests', () => {
    expect(() =>
      safeOrigin(
        new Request('https://code.test/api/practice', {
          headers: { origin: 'https://evil.test', 'content-type': 'application/json' },
        }),
      ),
    ).toThrow();
    expect(() =>
      safeOrigin(
        new Request('https://code.test/api/practice', {
          headers: { origin: 'https://code.test', 'content-type': 'application/json' },
        }),
      ),
    ).not.toThrow();
  });
  it('fails closed for missing live credentials', () => {
    for (const name of ['OPENAI_API_KEY', 'UPSTASH_REDIS_REST_URL', 'TURNSTILE_SECRET_KEY'])
      vi.stubEnv(name, '');
    expect(readiness()).toBe(false);
    expect(() => requireReady()).toThrow();
  });
  it('rejects nonsensical usage configuration', () => {
    vi.stubEnv('DAILY_GLOBAL_REQUEST_CAP', 'not-a-number');
    expect(() => settings()).toThrow();
  });
  it('requires a trusted production IP header', () => {
    vi.stubEnv('VERCEL', '1');
    expect(() => ipHash(new Request('https://code.test'))).toThrow();
    const hash = ipHash(
      new Request('https://code.test', { headers: { 'x-vercel-forwarded-for': '192.0.2.1' } }),
    );
    expect(hash).not.toContain('192.0.2.1');
    expect(hash).toHaveLength(64);
  });
  it('rejects large streamed bodies even without content-length', async () => {
    const request = new Request('https://code.test', { method: 'POST', body: 'x'.repeat(250001) });
    await expect(boundedJson(request)).rejects.toThrow('large');
  });
  it('rejects malformed JSON', async () =>
    await expect(
      boundedJson(new Request('https://code.test', { method: 'POST', body: '{' })),
    ).rejects.toThrow('read'));
  it('requires Turnstile success and expected action/hostname', async () => {
    vi.stubEnv('APP_ORIGIN', 'https://code.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, action: 'wrong', hostname: 'code.test' }),
      }),
    );
    await expect(verifyChallenge('token')).rejects.toThrow();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, action: 'practice', hostname: 'code.test' }),
      }),
    );
    await expect(verifyChallenge('token')).resolves.toBeUndefined();
  });
});
