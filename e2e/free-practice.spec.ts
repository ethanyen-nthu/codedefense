import { test, expect, type Page } from '@playwright/test';
import { EXAMPLES } from '../src/lib/examples';
async function editor(page: Page, code = EXAMPLES[0].code) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Practicing', exact: true }).click();
  await page.getByRole('textbox', { name: 'C++ source editor' }).fill(code);
}
async function begin(page: Page, mc = false, count = 5) {
  await editor(page);
  await page.getByRole('button', { name: 'Analyze Locally' }).click();
  await expect(page.getByRole('heading', { name: 'Code Understanding Report' })).toBeVisible();
  await page.getByLabel('Main questions').selectOption(String(count));
  if (mc) await page.getByLabel('Interview mode').selectOption('Quick Multiple Choice');
  await page.getByText('Coursework filters & repeatable order', { exact: true }).click();
  await page.getByLabel('Question-order seed').fill('browser-check');
  await page.getByRole('button', { name: 'Begin Interview' }).click();
}
async function history(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'History', exact: true }).click();
}
test('real local parser detects each requested program and rejects malformed source', async ({
  page,
}) => {
  const requests: { url: string; method: string }[] = [];
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));
  for (const [index, concepts] of [
    [0, ['while', 'modulo', 'variable', 'integer-division']],
    [1, ['switch', 'case', 'break']],
    [2, ['recursion', 'function', 'parameter']],
  ] as [number, string[]][]) {
    await editor(page, EXAMPLES[index].code);
    await page.getByRole('button', { name: 'Analyze Locally' }).click();
    await expect(page.getByRole('heading', { name: 'Code Understanding Report' })).toBeVisible();
    for (const c of concepts)
      await expect(page.locator('.chips').getByText(c, { exact: true })).toBeVisible();
  }
  await editor(page, 'int main( { int n = ;');
  await page.getByRole('button', { name: 'Analyze Locally' }).click();
  await expect(page.getByText('Repair syntax before practicing')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begin Interview' })).toBeDisabled();
  expect(requests.some((r) => r.method !== 'GET')).toBe(false);
  expect(requests.every((r) => new URL(r.url).origin === 'http://127.0.0.1:3000')).toBe(true);
  expect(requests.some((r) => r.url.includes('/api/'))).toBe(false);
});
test('ten written answers, self-assessment, follow-up and report stay separate from objective grades', async ({
  page,
}) => {
  await begin(page, false, 10);
  await expect(page.getByRole('button', { name: 'Compare My Answer' })).toBeDisabled();
  await expect(page.getByText('Reference explanation', { exact: true })).toHaveCount(0);
  await page.getByLabel('Your answer').fill('這是我的解釋，先比較規則與實際程式。');
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByLabel('Your answer')).toHaveValue('這是我的解釋，先比較規則與實際程式。');
  for (let i = 0; i < 10; i++) {
    if (i)
      await page.getByLabel('Your answer').fill('A clear explanation of the highlighted code.');
    await page.getByRole('button', { name: 'Compare My Answer' }).click();
    await expect(page.getByText('Reference explanation', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Next Question|View Practice Report/ }),
    ).toBeDisabled();
    await page
      .getByRole('button', {
        name: i === 0 ? 'Partially understood / 部分理解' : 'Understood completely / 完全理解',
        exact: true,
      })
      .click();
    await page.getByRole('button', { name: /Next Question|View Practice Report/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Your code. Better understood.' })).toBeVisible();
  await expect(page.getByText('No MC answers')).toBeVisible();
  await expect(page.locator('.report-stats')).toContainText('9');
  await expect(page.getByRole('heading', { name: 'Written self-assessment' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry Weak Questions' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('max', '1');
});
test('multiple choice uses its actual key and one optional follow-up', async ({ page }) => {
  await begin(page, true);
  let hadFollow = false;
  for (let i = 0; i < 5; i++) {
    const key = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('codedefense-free-history-v2') || '[]')[0];
      return s.questions[s.index].correctIndex as number;
    });
    await page.locator(`input[name="answer-choice"][value="${key}"]`).check();
    await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    if (
      !hadFollow &&
      (await page.getByRole('button', { name: 'Practice one follow-up' }).count())
    ) {
      hadFollow = true;
      await page.getByRole('button', { name: 'Practice one follow-up' }).click();
      await page.getByLabel('Your answer').fill('A follow-up explanation.');
      await page.getByRole('button', { name: 'Compare My Answer' }).click();
      await page
        .getByRole('button', { name: 'Need more practice / 需要練習', exact: true })
        .click();
      await expect(page.getByRole('button', { name: 'Practice one follow-up' })).toHaveCount(0);
    }
    await page.getByRole('button', { name: /Next Question|View Practice Report/ }).click();
  }
  await expect(page.getByText('5 correct / 5 recorded multiple-choice questions')).toBeVisible();
  await expect(page.locator('.score-number')).toContainText('100');
  expect(hadFollow).toBe(true);
});
test('local uploads reject bad files and preserve the current source', async ({ page }) => {
  await editor(page);
  const input = page.getByLabel('Upload C++ source file');
  await input.setInputFiles({
    name: 'valid.cpp',
    mimeType: 'text/plain',
    buffer: Buffer.from('// 你好\nint main(){return 0;}'),
  });
  await expect(page.getByRole('textbox', { name: 'C++ source editor' })).toContainText('你好');
  for (const [name, buffer, expected] of [
    ['bad.exe', Buffer.from('bad'), '.cpp'],
    ['big.cpp', Buffer.alloc(120001, 65), '120 KB'],
  ] as [string, Buffer, string][]) {
    await input.setInputFiles({ name, mimeType: 'application/octet-stream', buffer });
    await expect(page.locator('.error-banner')).toContainText(expected);
    await expect(page.getByRole('textbox', { name: 'C++ source editor' })).toContainText('你好');
  }
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Clear code', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'C++ source editor' })).toBeEmpty();
});
test('history export, import, individual deletion and clear-all', async ({ page, isMobile }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Next Question', exact: true }).click();
  await history(page, isMobile);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export History', exact: true }).click();
  const file = await (await downloading).path();
  expect(file).not.toBeNull();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Clear All History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No sessions yet.' })).toBeVisible();
  await page.getByLabel('Import history file').setInputFiles(file!);
  await expect(page.locator('.history-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1');
  await history(page, isMobile);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /Delete session/ }).click();
  await expect(page.locator('.history-card')).toHaveCount(0);
});
test('mobile source highlighting and keyboard entry work without horizontal overflow', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.hero-description')).not.toContainText(/\bAI\b/);
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await begin(page);
  if (isMobile) {
    await page.getByRole('button', { name: 'Source code', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Submitted C++ source' })).toBeVisible();
    await expect(page.locator('.relevant-line').first()).toBeVisible();
    await page.getByRole('button', { name: 'Question', exact: true }).click();
  }
  await expect(page.getByLabel('Your answer')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('static routing has a real privacy page and no backend endpoint', async ({ page }) => {
  const response = await page.goto('/privacy');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Your code, your choice.' })).toBeVisible();
  expect((await page.request.get('/api/practice')).status()).toBe(404);
  expect((await page.request.get('/unknown-page')).status()).toBe(404);
});
test('core practice works offline after the self-hosted assets are cached', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Start Practicing', exact: true }).click();
  await page.getByRole('button', { name: 'Armstrong number', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze Locally' }).click();
  await expect(page.getByRole('heading', { name: 'Code Understanding Report' })).toBeVisible();
  await page.getByRole('button', { name: 'Begin Interview' }).click();
  await expect(page.getByLabel('Your answer')).toBeVisible();
  await context.setOffline(false);
});
