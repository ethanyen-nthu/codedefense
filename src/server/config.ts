import 'server-only';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'request_failed',
  ) {
    super(message);
  }
}
export function numberEnv(name: string, fallback: number, min = 1, max = 1000000) {
  const raw = process.env[name];
  const n = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new AppError(
      503,
      'Live practice is temporarily unavailable. Try the demo.',
      'configuration',
    );
  return n;
}
export function settings() {
  return {
    maxCode: numberEnv('MAX_CODE_CHARS', 30000, 100, 30000),
    globalDaily: numberEnv('DAILY_GLOBAL_REQUEST_CAP', 300),
    sessionDaily: numberEnv('DAILY_SESSION_REQUEST_CAP', 25),
    ipDaily: numberEnv('DAILY_IP_REQUEST_CAP', 60),
    concurrent: numberEnv('MAX_CONCURRENT_AI_REQUESTS', 3, 1, 20),
    maxOutput: numberEnv('MAX_OUTPUT_TOKENS', 10000, 1000, 12000),
    maxInput: numberEnv('MAX_INPUT_TOKENS', 24000, 1000, 64000),
  };
}
export function readiness() {
  const required = [
    'OPENAI_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SESSION_SECRET',
    'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
    'TURNSTILE_SECRET_KEY',
    'APP_ORIGIN',
  ];
  return (
    required.every((k) => Boolean(process.env[k])) &&
    (process.env.SESSION_SECRET?.length || 0) >= 32
  );
}
export function requireReady() {
  settings();
  if (!readiness())
    throw new AppError(
      503,
      'Live AI is not configured yet. Your code is saved on this device; the demo is available.',
      'unavailable',
    );
}
