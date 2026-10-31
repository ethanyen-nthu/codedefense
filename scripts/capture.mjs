import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('docs', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto('http://127.0.0.1:3000');
await page.getByRole('heading', { name: 'Know your code. Defend your logic.' }).waitFor();
await page.screenshot({ path: 'docs/home-desktop.png', fullPage: true });
await page.getByRole('button', { name: 'Start Practicing', exact: true }).click();
await page.getByRole('button', { name: 'Example', exact: true }).click();
await page.getByRole('textbox', { name: 'C++ source editor' }).waitFor();
await page.screenshot({ path: 'docs/editor-desktop.png', fullPage: true });
await page.getByRole('button', { name: 'Analyze Locally', exact: true }).click();
await page.getByLabel('Main questions').selectOption('5');
await page.getByLabel('Question-order seed').fill('interface-review');
await page.getByRole('button', { name: 'Begin Interview' }).click();
await page
  .getByLabel('Your answer')
  .fill(
    'Using a zero divisor is not valid for built-in integer remainder. I would check that it is nonzero first.',
  );
await page.screenshot({ path: 'docs/interview-desktop.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'docs/interview-mobile.png', fullPage: true });
await page.setViewportSize({ width: 820, height: 1180 });
await page.screenshot({ path: 'docs/interview-tablet.png', fullPage: true });
await page.setViewportSize({ width: 1440, height: 1000 });
for (let i = 0; i < 5; i++) {
  if (i)
    await page
      .getByLabel('Your answer')
      .fill('I would explain the language rule and relate it to the cited source.');
  await page.getByRole('button', { name: 'Compare My Answer', exact: true }).click();
  await page
    .getByRole('button', {
      name: i === 0 ? 'I understood partially / 部分理解' : 'I understood completely / 完全理解',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: /Next Question|View Practice Report/ }).click();
}
await page.getByRole('heading', { name: 'Your code. Better understood.' }).waitFor();
await page.screenshot({ path: 'docs/report-desktop.png', fullPage: true });
await page.pdf({
  path: 'docs/sample-study-report.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
});
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
console.log(
  'Captured Free Edition desktop/mobile/tablet and printable self-assessment report; no page errors.',
);
