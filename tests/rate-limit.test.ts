import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const { evalMock } = vi.hoisted(() => ({ evalMock: vi.fn() }));
vi.mock('@upstash/redis', () => ({
  Redis: class {
    eval = evalMock;
  },
}));
import { reserveUsage, burstLimit, withLease, QUOTA_LUA, ACQUIRE_LUA } from '@/server/redis';
beforeEach(() => {
  evalMock.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
it('uses an atomic EVAL for global, browser, and IP daily quotas', async () => {
  evalMock.mockResolvedValue(1);
  await reserveUsage('browser1', 'hashed-ip');
  const [script, keys, limits] = evalMock.mock.calls[0];
  expect(script).toBe(QUOTA_LUA);
  expect(keys).toHaveLength(3);
  expect(keys[1]).toContain('browser1');
  expect(keys[2]).toContain('hashed-ip');
  expect(limits).toEqual([300, 25, 60]);
});
it('denies provider work when any shared daily quota is exhausted', async () => {
  evalMock.mockResolvedValue(0);
  await expect(reserveUsage('browser', 'ip')).rejects.toMatchObject({
    status: 429,
    code: 'daily_limit',
  });
});
it('enforces per-minute session/IP throttles', async () => {
  evalMock.mockResolvedValue(0);
  await expect(burstLimit('browser', 'ip')).rejects.toMatchObject({
    status: 429,
    code: 'rate_limit',
  });
});
it('refuses concurrent work when lease acquisition fails', async () => {
  evalMock.mockResolvedValue(0);
  const work = vi.fn();
  await expect(withLease('browser', work)).rejects.toMatchObject({ status: 409 });
  expect(work).not.toHaveBeenCalled();
  expect(evalMock.mock.calls[0][0]).toBe(ACQUIRE_LUA);
});
it('releases the distributed lease when work fails', async () => {
  evalMock.mockResolvedValue(1);
  await expect(
    withLease('browser', async () => {
      throw new Error('failed');
    }),
  ).rejects.toThrow('failed');
  expect(evalMock).toHaveBeenCalledTimes(2);
  expect(evalMock.mock.calls[1][0]).toContain('ZREM');
});
it('fails closed if Redis is unavailable', async () => {
  evalMock.mockImplementation(async () => {
    throw new Error('redis offline');
  });
  const failure = await reserveUsage('browser', 'ip').then(
    () => null,
    (error: Error) => error.message,
  );
  expect(failure).toBe('redis offline');
});
