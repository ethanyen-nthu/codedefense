import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('docs', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.emulateMedia({ reducedMotion: 'reduce' });
const shot = async (name) => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  return page.screenshot({ path: `docs/${name}.png`, fullPage: true });
};
const theme = async (value) => page.getByLabel('Color theme').selectOption(value);
await page.goto('http://127.0.0.1:3000');
await page.getByRole('heading', { name: 'Understand your code. Ace your TA demo.' }).waitFor();
await theme('light');
await shot('home-desktop');
await theme('dark');
await shot('home-dark');
await page.getByRole('button', { name: 'Start Practicing', exact: true }).click();
await page.getByRole('button', { name: 'Armstrong number', exact: true }).click();
await page.getByRole('textbox', { name: 'C++ source editor' }).waitFor();
await page.getByLabel('Lab assignment title').fill('Armstrong number — scripted QA sample');
await shot('editor-desktop');
await theme('light');
await shot('editor-light');
await page.getByRole('button', { name: 'Save program', exact: true }).click();
await page.getByRole('button', { name: 'Analyze Locally', exact: true }).click();
await page.getByLabel('Main questions').selectOption('5');
await page.getByText('Coursework filters & repeatable order', { exact: true }).click();
await page.getByLabel('Question-order seed').fill('codeta-interface-review');
await shot('analysis-light');
await theme('dark');
await shot('analysis-dark');
await page.getByRole('button', { name: 'Begin Interview' }).click();
await page
  .getByLabel('Your answer')
  .fill(
    'Sample explanation for interface review. I would identify the actual condition and explain each relevant path.',
  );
await shot('interview-desktop');
await theme('light');
await shot('interview-light');
await page.setViewportSize({ width: 390, height: 844 });
await shot('interview-mobile-light');
await theme('dark');
await shot('interview-mobile');
await page.setViewportSize({ width: 820, height: 1180 });
await shot('interview-tablet');
await page.setViewportSize({ width: 1440, height: 1000 });
await page.getByRole('button', { name: 'Compare My Answer', exact: true }).click();
await page.getByText('Explain More Simply', { exact: true }).click();
await shot('feedback-dark');
await theme('light');
await shot('feedback-light');
for (let i = 0; i < 5; i++) {
  if (i) {
    await page
      .getByLabel('Your answer')
      .fill(
        'Scripted sample response for layout verification, not an automatically graded student answer.',
      );
    await page.getByRole('button', { name: 'Compare My Answer', exact: true }).click();
  }
  await page
    .getByRole('button', {
      name: i === 0 ? 'Partially understood / 部分理解' : 'Understood completely / 完全理解',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: /Next Question|View Practice Report/ }).click();
}
await page.getByRole('heading', { name: 'Your code. Better understood.' }).waitFor();
await shot('report-desktop');
await theme('dark');
await shot('report-dark');
await page.pdf({
  path: 'docs/sample-study-report.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
});
await page.getByRole('button', { name: 'History', exact: true }).click();
await shot('history-dark');
await theme('light');
await shot('history-light');
await page.getByRole('button', { name: 'Programs', exact: true }).click();
await shot('programs-light');
await theme('dark');
await shot('programs-dark');
await page.getByRole('button', { name: 'Review', exact: true }).click();
await shot('review-dark');
await theme('light');
await shot('review-light');
await page.getByRole('button', { name: 'Privacy', exact: true }).click();
await shot('privacy-light');
await theme('dark');
await shot('privacy-dark');
await page.getByRole('button', { name: 'How it works', exact: true }).click();
await shot('how-dark');
await theme('light');
await shot('how-light');
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
console.log(
  'Captured CodeTA light/dark desktop/mobile/tablet screens and scripted printable sample; no page errors.',
);
