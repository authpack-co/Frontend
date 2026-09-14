import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
const dir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
for (let i = 1; i <= 5; i++) {
  await page.goto('file://' + path.join(dir, `slide-${i}.html`));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(dir, '..', `niango-${i}.png`), clip: { x: 0, y: 0, width: 1280, height: 800 } });
  console.log('ok slide', i);
}
await browser.close();
