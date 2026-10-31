import 'server-only';
import { Redis } from '@upstash/redis';
import { randomUUID } from 'node:crypto';
import { AppError, settings } from './config';

export function redis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    retry: { retries: 0 },
  });
}
export const TTL = 60 * 60 * 24;
export const PREFIX = 'codedefense:v1:';
// Check every bucket before consuming any. Redis EVAL makes this atomic across instances.
export const QUOTA_LUA = `
for i,key in ipairs(KEYS) do
  if tonumber(redis.call('GET',key) or '0') >= tonumber(ARGV[i]) then return 0 end
end
for _,key in ipairs(KEYS) do redis.call('INCR',key); redis.call('EXPIRE',key,172800) end
return 1`;
export async function reserveUsage(owner: string, ip: string) {
  const s = settings(),
    day = new Date().toISOString().slice(0, 10);
  const allowed = await redis().eval(
    QUOTA_LUA,
    [`${PREFIX}usage:${day}`, `${PREFIX}usage:${day}:${owner}`, `${PREFIX}usage:${day}:ip:${ip}`],
    [s.globalDaily, s.sessionDaily, s.ipDaily],
  );
  if (allowed !== 1)
    throw new AppError(
      429,
      'Today’s AI practice limit has been reached. Continue with the demo or return tomorrow (UTC).',
      'daily_limit',
    );
}
export async function burstLimit(owner: string, ip: string) {
  const minute = Math.floor(Date.now() / 60000);
  const ok = await redis().eval(
    QUOTA_LUA,
    [`${PREFIX}burst:${minute}:${owner}`, `${PREFIX}burst:${minute}:ip:${ip}`],
    [40, 80],
  );
  if (ok !== 1) throw new AppError(429, 'Too many requests. Please wait a minute.', 'rate_limit');
}
export const ACQUIRE_LUA = `
redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1])
if redis.call('ZCARD',KEYS[1]) >= tonumber(ARGV[3]) or redis.call('EXISTS',KEYS[2]) == 1 then return 0 end
redis.call('ZADD',KEYS[1],ARGV[2],ARGV[4]); redis.call('EXPIRE',KEYS[1],240)
redis.call('SET',KEYS[2],ARGV[4],'EX',200); return 1`;
export async function withLease<T>(owner: string, work: () => Promise<T>): Promise<T> {
  const token = randomUUID(),
    key = `${PREFIX}lock:${owner}`;
  const ok = await redis().eval(
    ACQUIRE_LUA,
    [`${PREFIX}active`, key],
    [Date.now(), Date.now() + 200000, settings().concurrent, token],
  );
  if (ok !== 1)
    throw new AppError(409, 'Another request is still working. Please wait and retry.', 'busy');
  try {
    return await work();
  } finally {
    await redis()
      .eval(
        `redis.call('ZREM',KEYS[1],ARGV[1]); if redis.call('GET',KEYS[2]) == ARGV[1] then redis.call('DEL',KEYS[2]) end; return 1`,
        [`${PREFIX}active`, key],
        [token],
      )
      .catch(() => {});
  }
}
export async function trackUsage(input: number, output: number) {
  const key = `${PREFIX}tokens:${new Date().toISOString().slice(0, 10)}`;
  await redis().eval(
    `redis.call('HINCRBY',KEYS[1],'input',ARGV[1]); redis.call('HINCRBY',KEYS[1],'output',ARGV[2]); redis.call('EXPIRE',KEYS[1],604800); return 1`,
    [key],
    [input, output],
  );
  const inputRate = Number(process.env.INPUT_USD_PER_MILLION),
    outputRate = Number(process.env.OUTPUT_USD_PER_MILLION);
  if (
    process.env.INPUT_USD_PER_MILLION &&
    process.env.OUTPUT_USD_PER_MILLION &&
    Number.isFinite(inputRate) &&
    Number.isFinite(outputRate) &&
    inputRate >= 0 &&
    outputRate >= 0
  ) {
    const estimate = (input * inputRate + output * outputRate) / 1000000;
    await redis().eval(
      `redis.call('HINCRBYFLOAT',KEYS[1],'estimated_usd',ARGV[1]); redis.call('EXPIRE',KEYS[1],604800); return 1`,
      [key],
      [estimate],
    );
  }
}
