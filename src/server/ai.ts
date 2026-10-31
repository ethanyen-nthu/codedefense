import 'server-only';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { AppError, settings } from './config';
import { reserveUsage, trackUsage } from './redis';
import { SYSTEM } from './prompts';

export async function structured<T>(
  schema: z.ZodType<T>,
  name: string,
  instruction: string,
  payload: unknown,
  owner: string,
  ip: string,
  validate: (value: T) => T = (v) => v,
  outputTokens = 4500,
): Promise<T> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 35000, maxRetries: 0 });
  for (let attempt = 0; attempt < 2; attempt++) {
    // Each actual provider attempt, including retries, consumes shared quota.
    await reserveUsage(owner, ip);
    try {
      const prompt = {
        model: process.env.OPENAI_MODEL || 'gpt-6.1-sol',
        instructions: `${SYSTEM}\n${instruction}${attempt ? '\nPrevious response was invalid. Carefully satisfy the schema and exact source evidence.' : ''}`,
        input: JSON.stringify(payload),
        text: { format: zodTextFormat(schema, name) },
      };
      const counted = await client.responses.inputTokens.count(prompt, { timeout: 8000 });
      if (!Number.isInteger(counted.input_tokens)) throw new Error('Invalid token count');
      if (counted.input_tokens > settings().maxInput)
        throw new AppError(
          413,
          'This interview context is too long for the configured input-token limit. Shorten your code or assignment context.',
          'token_limit',
        );
      const response = await client.responses.parse({
        ...prompt,
        store: false,
        max_output_tokens: Math.min(outputTokens, settings().maxOutput),
      });
      if (response.usage)
        await trackUsage(response.usage.input_tokens, response.usage.output_tokens);
      if (response.status !== 'completed' || !response.output_parsed)
        throw new Error('Invalid model output');
      return validate(schema.parse(response.output_parsed));
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (
        error instanceof OpenAI.APIError &&
        error.status &&
        [400, 401, 403, 404, 429].includes(error.status)
      )
        break;
      // Transport timeouts are not retried: their billed completion status is unknown.
      if (error instanceof OpenAI.APIConnectionError) break;
    }
  }
  throw new AppError(
    502,
    'The AI could not return a reliable response. Your progress is safe. Please retry.',
    'ai_response',
  );
}
