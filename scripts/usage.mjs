import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
const day = process.argv[2] || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Use a date in YYYY-MM-DD format (UTC).');
const [attempts, tokens] = await Promise.all([
  redis.get(`codedefense:v1:usage:${day}`),
  redis.hgetall(`codedefense:v1:tokens:${day}`),
]);
console.log(
  JSON.stringify(
    {
      day,
      providerGenerationReservations: attempts || 0,
      usage: tokens || {},
      notice:
        'Token totals omit requests whose usage was not returned. Estimated USD uses owner-configured rates and does not include cache discounts, taxes, or all billing adjustments. Consult the provider billing dashboard.',
    },
    null,
    2,
  ),
);
