import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.TEST_URL || 'http://127.0.0.1:4180/';
const evidence = process.env.EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });

async function openGame(mobile) {
  const context = await browser.newContext({
    viewport: { width: mobile ? 390 : 1280, height: 844 },
    hasTouch: mobile, isMobile: mobile, locale: 'ko-KR',
  });
  // Observe the app's existing public read contract, without changing game state.
  // This adapter does not verify native WebMCP browser availability.
  await context.addInitScript(() => {
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool(tool, { signal }) {
          if (tool.name !== 'read_mario_game') return;
          const read = () => tool.execute({});
          window.__readMario = read;
          signal.addEventListener('abort', () => {
            if (window.__readMario === read) delete window.__readMario;
          });
        },
      },
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  await page.waitForFunction(() => !!window.__readMario);
  await page.getByRole('button', { name: '플레이', exact: true }).click();
  await page.waitForFunction(() => window.__readMario().phase === 'playing');
  return { context, page, errors };
}
const snapshot = (page) => page.evaluate(() => window.__readMario());
const gameTime = async (page, seconds) => {
  const before = await snapshot(page);
  await page.waitForFunction((end) => window.__readMario().time <= end, before.time - seconds);
};
const center = async (locator) => {
  const box = await locator.boundingBox();
  assert.ok(box);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

try {
  const travel = [];
  for (const run of [false, true]) {
    const { context, page, errors } = await openGame(true);
    const runButton = page.getByRole('button', { name: '터치 달리기', exact: true });
    if (run) await runButton.tap();
    assert.equal(await runButton.getAttribute('aria-pressed'), String(run));
    // Let the first physics step initialize progress from the spawn position.
    await gameTime(page, 0.05);
    const cdp = await context.newCDPSession(page);
    const right = await center(page.getByRole('button', { name: '오른쪽', exact: true }));
    const initial = await snapshot(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...right, id: 1 }] });
    await gameTime(page, 0.65);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const end = await snapshot(page);
    travel.push((end.progress - initial.progress) / (initial.time - end.time));
    assert.ok(end.progress > initial.progress);
    await page.getByRole('button', { name: '일시정지', exact: true }).click();
    const paused = await snapshot(page);
    await page.waitForTimeout(250);
    assert.deepEqual(await snapshot(page), paused);
    assert.equal(await runButton.isDisabled(), true);
    await page.getByRole('button', { name: '계속하기', exact: true }).click();
    assert.equal(await runButton.getAttribute('aria-pressed'), String(run));
    await gameTime(page, 0.2);
    assert.equal((await snapshot(page)).phase, 'playing');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (evidence && run) await page.screenshot({ path: join(evidence, 'mario-touch-run.png') });
    assert.deepEqual(errors, []);
    await context.close();
  }
  assert.ok(travel[1] > travel[0] * 1.3, `RUN must move faster: ${travel.join(', ')}`);
  console.log('PASS 390px: real touch movement, RUN speed, toggle state, pause/resume, viewport');

  const { context, page, errors } = await openGame(true);
  await page.locator('canvas').focus();
  await page.keyboard.down('ArrowRight');
  await gameTime(page, 0.15);
  await page.getByRole('button', { name: '오른쪽', exact: true }).tap();
  const afterTouchRelease = await snapshot(page);
  await gameTime(page, 0.2);
  assert.ok((await snapshot(page)).progress > afterTouchRelease.progress + 0.003);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  assert.equal((await snapshot(page)).phase, 'paused');
  await page.getByRole('button', { name: '계속하기', exact: true }).click();
  await gameTime(page, 0.4);
  const settled = await snapshot(page);
  await gameTime(page, 0.35);
  assert.ok((await snapshot(page)).progress - settled.progress < 0.001);
  assert.deepEqual(errors, []);
  await context.close();
  console.log('PASS mixed input: touch release preserves held keyboard direction, pause clears motion');

  const desktop = await openGame(false);
  await gameTime(desktop.page, 0.05);
  const desktopInitial = await snapshot(desktop.page);
  await desktop.page.keyboard.down('ArrowRight');
  await desktop.page.keyboard.press('Space');
  await gameTime(desktop.page, 0.25);
  await desktop.page.keyboard.up('ArrowRight');
  const desktopEnd = await snapshot(desktop.page);
  assert.ok(desktopEnd.progress > desktopInitial.progress + 0.003,
    JSON.stringify({ desktopInitial, desktopEnd, focused: await desktop.page.evaluate(() => document.activeElement.outerHTML) }));
  await desktop.page.keyboard.press('Escape');
  assert.equal((await snapshot(desktop.page)).phase, 'paused');
  if (evidence) await desktop.page.screenshot({ path: join(evidence, 'mario-desktop-paused.png') });
  assert.deepEqual(desktop.errors, []);
  await desktop.context.close();
  console.log('PASS 1280px: keyboard movement/jump, Escape pause, no page errors');
} finally {
  await browser.close();
}
