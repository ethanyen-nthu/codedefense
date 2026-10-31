import { test, expect, type Page } from '@playwright/test';
import { EXAMPLES } from '../src/lib/examples';
async function nav(page: Page, name: string, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name, exact: true }).click();
}
async function setup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try an Example', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Code Understanding Report' })).toBeVisible();
}
test('five difficulty levels, topic filters and bounded trace pool are visible and functional', async ({
  page,
}) => {
  await setup(page);
  for (const [name, description] of [
    ['Fundamentals', 'Identify syntax'],
    ['Beginner', 'Explain loops'],
    ['Normal TA', 'Explain your decisions'],
    ['Strict TA', 'Challenge assumptions'],
    ['Challenge', 'Justify correctness'],
  ]) {
    await page.getByRole('combobox', { name: 'Difficulty', exact: true }).selectOption(name);
    await expect(page.getByText(description, { exact: false }).first()).toBeVisible();
    await expect(page.locator('.level-example')).not.toBeEmpty();
  }
  await page.getByText('Coursework filters & repeatable order', { exact: true }).click();
  await page.getByLabel('NTHU beginner C++11 preset').check();
  await page.locator('.concept-filter').getByText('modulo', { exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Interview mode', exact: true })
    .selectOption('Code Tracing');
  await expect(page.locator('.interview-config>.notice')).toContainText('smaller interview');
  await page.getByRole('button', { name: 'Begin Interview', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Verified');
  const s = await page.evaluate(
    () => JSON.parse(localStorage.getItem('codedefense-free-history-v2') || '[]')[0],
  );
  expect(
    s.questions.every(
      (q: { concept: string; grounding: string }) =>
        q.concept !== 'modulo' && q.grounding === 'Verified example',
    ),
  ).toBe(true);
});
test('manual difficulty change preserves an answered response and focuses the next question', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Begin Interview' }).click();
  await expect(page.locator('.question-title')).toBeFocused();
  await page.getByLabel('Your answer').fill('My original explanation');
  await page.getByRole('button', { name: 'Compare My Answer' }).click();
  await page.getByText('Explain More Simply', { exact: true }).click();
  await expect(page.locator('.simple-explanation')).toContainText('Prewritten');
  await page.getByRole('button', { name: 'Partially understood / 部分理解', exact: true }).click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('codedefense-free-history-v2') || '[]')[0].records[0],
  );
  await page.getByText('Change remaining difficulty', { exact: true }).click();
  await page
    .getByRole('combobox', { name: 'New difficulty', exact: true })
    .selectOption('Strict TA');
  await page.getByRole('button', { name: 'Apply to remaining questions' }).click();
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem('codedefense-free-history-v2') || '[]')[0],
  );
  expect(after.records[0]).toEqual(before);
  expect(after.difficultyChanges[0].to).toBe('Strict TA');
  await page.getByRole('button', { name: 'Next Question', exact: true }).click();
  await expect(page.locator('.question-title')).toBeFocused();
  await page.getByLabel('Your answer').fill('草稿仍然保留');
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByLabel('Your answer')).toHaveValue('草稿仍然保留');
});
test('adaptive mode is explicit and records a lower level after a hint', async ({ page }) => {
  await setup(page);
  await expect(page.getByLabel('Adaptive Practice', { exact: true })).not.toBeChecked();
  await page.getByLabel('Adaptive Practice', { exact: true }).check();
  await page.getByRole('button', { name: 'Begin Interview' }).click();
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await page.getByLabel('Your answer').fill('Practice response');
  await page.getByRole('button', { name: 'Compare My Answer' }).click();
  await page.getByRole('button', { name: 'Understood completely / 完全理解', exact: true }).click();
  await page.getByRole('button', { name: 'Next Question', exact: true }).click();
  await expect(page.locator('.interview-heading')).toContainText('Beginner');
  const s = await page.evaluate(
    () => JSON.parse(localStorage.getItem('codedefense-free-history-v2') || '[]')[0],
  );
  expect(s.records[0].hintsUsed).toBe(true);
  expect(s.records[0].difficulty).toBe('Normal TA');
  expect(s.difficultyChanges[0].reason).toBe('adaptive');
});
test('light, dark and system themes persist and style the editor with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Color theme').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.getByLabel('Color theme')).toHaveValue('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Start Practicing' }).click();
  await expect(page.getByRole('textbox', { name: 'C++ source editor' })).toBeVisible();
  const light = await page
    .locator('.cm-editor')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.getByLabel('Color theme').selectOption('dark');
  const dark = await page
    .locator('.cm-editor')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(dark).not.toBe(light);
  await expect(page.locator('.screen')).toHaveCSS('animation-name', 'none');
  await page.getByLabel('Color theme').selectOption('system');
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Color theme').selectOption('dark');
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.editor-panel')).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(page.locator('.editor-panel')).toHaveCSS('color','rgb(17, 17, 17)');
});
test('saved programs survive reload, export/import and deletion; weak review starts focused practice', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Practicing' }).click();
  await page.getByRole('textbox', { name: 'C++ source editor' }).fill(EXAMPLES[3].code);
  await page.getByLabel('Lab assignment title').fill('My digit sum');
  await page.getByRole('button', { name: 'Save program', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Program saved');
  await nav(page, 'Programs', isMobile);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My digit sum' })).toBeVisible();
  await page.getByRole('button', { name: 'Open program' }).click();
  await expect(page.getByRole('textbox', { name: 'C++ source editor' })).toContainText('sum');
  await page.getByRole('button', { name: 'Analyze Locally' }).click();
  await page.getByRole('button', { name: 'Begin Interview' }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Next Question', exact: true }).click();
  await nav(page, 'Review', isMobile);
  await expect(page.getByRole('heading', { name: 'Make the next session count.' })).toBeVisible();
  await page.locator('.topic-grid .btn').first().click();
  await expect(page.getByLabel('Your answer')).toBeVisible();
  await nav(page, 'History', isMobile);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export History' }).click();
  const file = await (await download).path();
  expect(file).not.toBeNull();
  await nav(page, 'Programs', isMobile);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete program My digit sum' }).click();
  await expect(page.getByRole('heading', { name: 'No saved programs yet.' })).toBeVisible();
  await nav(page, 'History', isMobile);
  await page.getByLabel('Import history file').setInputFiles(file!);
  await nav(page, 'Programs', isMobile);
  await expect(page.getByRole('heading', { name: 'My digit sum' })).toBeVisible();
});
