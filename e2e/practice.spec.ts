import { test, expect, type Page } from '@playwright/test';
import { createDemo, startDemo, demoAction } from '../src/lib/demo';
import { configSchema, type PracticeSession } from '../src/lib/schemas';

async function mockSecurity(page: Page) {
  await page.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: 'window.turnstile={render:function(el,opts){setTimeout(function(){opts.callback("test-only-token")},0);return "widget";},remove:function(){}};',
      }),
  );
}

test('live UI sends actual source and retains an answer across grading failure', async ({
  page,
}) => {
  await mockSecurity(page);
  let state: PracticeSession | null = null;
  let failed = false;
  const submitted: Record<string, unknown>[] = [];
  await page.route('**/api/practice', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { live: true, maxCode: 30000, siteKey: 'test-sitekey' } });
      return;
    }
    const input = route.request().postDataJSON();
    submitted.push(input);
    if (input.action === 'analyze') {
      state = { ...createDemo(), demo: false, code: input.code, context: input.context };
    }
    if (input.action === 'start') {
      state = { ...startDemo(state!, configSchema.parse(input.config)), demo: false };
    }
    if (input.action === 'answer') {
      if (!failed) {
        failed = true;
        await route.fulfill({
          status: 502,
          json: {
            error:
              'The AI could not return a reliable response. Your progress is safe. Please retry.',
          },
        });
        return;
      }
      state = { ...demoAction({ ...state!, demo: true }, 'answer', input.answer), demo: false };
    }
    await route.fulfill({ json: state });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Practicing', exact: true }).click();
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await page.getByLabel('Lab assignment title').fill('Source contract test');
  await page.getByLabel('I agree to send this code').check();
  await page.getByRole('button', { name: 'Analyze My Code' }).click();
  await expect(page.getByRole('heading', { name: 'Code Understanding Report' })).toBeVisible();
  expect(submitted[0].code).toContain('sum += temp % 10');
  expect(submitted[0].context).toHaveProperty('title', 'Source contract test');
  await page.getByLabel('Main questions').selectOption('5');
  await page.getByRole('button', { name: 'Begin Interview' }).click();
  await expect(page.getByText('A clear answer could be')).toHaveCount(0);
  await page.getByLabel('Your answer').fill('除以十的餘數就是個位數');
  await page.getByRole('button', { name: 'Submit Answer' }).click();
  await expect(page.locator('.error-banner')).toContainText('progress is safe');
  await expect(page.getByLabel('Your answer')).toHaveValue('除以十的餘數就是個位數');
  await page.getByRole('button', { name: 'Submit Answer' }).click();
  await expect(page.getByText('A clear answer could be')).toBeVisible();
  const answerPayload = submitted.find((p) => p.action === 'answer')!;
  expect(answerPayload).not.toHaveProperty('score');
  expect(answerPayload).not.toHaveProperty('expected');
});

test('optional dictation produces editable text without submitting', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeSpeech {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
      onerror = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          this.onresult?.({ results: [[{ transcript: 'A spoken explanation.' }]] });
          this.onend?.();
        }, 0);
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: FakeSpeech, configurable: true });
  });
  await begin(page);
  await page.getByRole('button', { name: 'Dictate answer', exact: true }).click();
  await expect(page.getByLabel('Your answer')).toHaveValue('A spoken explanation.');
  await expect(page.getByRole('button', { name: 'Submit Answer' })).toBeVisible();
  await expect(page.getByText('A clear answer could be')).toHaveCount(0);
  await page.getByLabel('Your answer').fill('I edited the transcript.');
  await expect(page.getByLabel('Your answer')).toHaveValue('I edited the transcript.');
});
async function begin(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try Demo', exact: true }).click();
  await page.getByLabel('Main questions').selectOption('5');
  await page.getByRole('button', { name: 'Begin Interview' }).click();
}
test('home, privacy, editor, and keyboard access are real flows', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Know your code. Defend your logic.' }),
  ).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByRole('button', { name: 'Start Practicing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Start with what you wrote.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyze My Code' })).toBeDisabled();
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'C++ source editor' })).toContainText('while');
  await page.getByRole('button', { name: 'Privacy details' }).click();
  await expect(page.getByRole('heading', { name: 'Your code, your choice.' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('demo answer, hint, follow-up, reload recovery, and final report', async ({ page }) => {
  await begin(page);
  await expect(
    page.getByRole('heading', { name: 'Why does temp % 10 extract a digit here?' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Answer' })).toBeDisabled();
  await expect(page.getByText('A clear answer could be')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await expect(page.getByText('Look at the highlighted lines.', { exact: false })).toBeVisible();
  await page.getByLabel('Your answer').fill('remainder');
  await page.getByRole('button', { name: 'Submit Answer' }).click();
  await expect(page.getByText('A clear answer could be')).toBeVisible();
  await page.reload();
  await expect(page.getByText('A clear answer could be')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Next Question' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Explain the reasoning behind your answer to:',
      exact: false,
    }),
  ).toBeVisible();
  await page.getByLabel('Your answer').fill('The remainder is the last digit.');
  await page.getByRole('button', { name: 'Submit Answer' }).click();
  await expect(page.getByText('Initial 6/10 · follow-up 10/10 · final 8/10 (mean)')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Next Question' }).click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await page
      .getByRole('button', { name: /Continue to Next Question|Continue \/ View Report/ })
      .click();
  }
  await expect(page.getByRole('heading', { name: 'Your code. Better understood.' })).toBeVisible();
  await expect(page.locator('.score-number')).toContainText('16/ 100');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Practice Report' }).click();
  expect((await download).suggestedFilename()).toMatch(/codedefense-report.*\.json$/);
  await page.getByRole('button', { name: 'Retry Incorrect Questions' }).click();
  await expect(page.getByRole('progressbar', { name: 'Interview progress' })).toHaveAttribute(
    'max',
    '4',
  );
  await expect(
    page.getByRole('heading', { name: 'Why use temp instead of changing number?' }),
  ).toBeVisible();
});
test('valid upload, rejected executable and oversized files, clear confirmation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Practicing', exact: true }).click();
  const input = page.getByLabel('Upload C++ source file');
  await input.setInputFiles({
    name: 'valid.cpp',
    mimeType: 'text/plain',
    buffer: Buffer.from('int main() { // 你好\n return 0;\n}'),
  });
  await expect(page.getByRole('textbox', { name: 'C++ source editor' })).toContainText('你好');
  await input.setInputFiles({
    name: 'bad.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('not source'),
  });
  await expect(page.locator('.error-banner')).toContainText('Choose a .cpp or .txt');
  await input.setInputFiles({
    name: 'huge.cpp',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(120001, 65),
  });
  await expect(page.locator('.error-banner')).toContainText('120 KB');
  await expect(page.getByRole('textbox', { name: 'C++ source editor' })).toContainText('你好');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Clear code', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'C++ source editor' })).toBeEmpty();
});
test('browser history export and deletion', async ({ page, isMobile }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Workspace', exact: true }).click();
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Digit sum', exact: true })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Progress' }).click();
  expect((await downloading).suggestedFilename()).toBe('codedefense-progress.json');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete History', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your first practice starts here.' }),
  ).toBeVisible();
  await page.reload();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('codedefense-history-v1') || '[]')),
  ).toEqual([]);
});
test('source switching and narrow layouts have no horizontal overflow', async ({
  page,
  isMobile,
}) => {
  await begin(page);
  if (isMobile) {
    await page.getByRole('button', { name: 'Source code', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Submitted C++ source' })).toBeVisible();
    await expect(page.locator('.relevant-line').first()).toContainText('temp % 10');
    await page.getByRole('button', { name: 'Question', exact: true }).click();
    await expect(page.getByLabel('Your answer')).toBeVisible();
  }
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
});
test('missing live credentials fail closed through HTTP', async ({ page }) => {
  await page.goto('/');
  const response = await page.request.post('/api/practice', {
    headers: { origin: 'http://127.0.0.1:3000' },
    data: { action: 'analyze', code: 'int main(){}' },
  });
  expect(response.status()).toBe(503);
  expect(await response.text()).not.toContain('api_key');
});
test('API failure preserves source and context', async ({ page }) => {
  await page.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: 'window.turnstile={render:function(el,opts){setTimeout(function(){opts.callback("test-only-token")},0);return "widget";},remove:function(){}};',
      }),
  );
  await page.route('**/api/practice', async (route) => {
    if (route.request().method() === 'GET')
      await route.fulfill({ json: { live: true, maxCode: 30000, siteKey: 'test-only-sitekey' } });
    else
      await route.fulfill({
        status: 502,
        json: {
          error:
            'The AI could not return a reliable response. Your progress is safe. Please retry.',
        },
      });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Practicing', exact: true }).click();
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await page.getByLabel('Lab assignment title').fill('My assignment');
  await page.getByLabel('I agree to send this code').check();
  await page.getByRole('button', { name: 'Analyze My Code' }).click();
  await expect(page.locator('.error-banner')).toContainText('reliable response');
  await expect(page.getByRole('textbox', { name: 'C++ source editor' })).toContainText('temp');
  await expect(page.getByLabel('Lab assignment title')).toHaveValue('My assignment');
});
