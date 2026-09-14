/**
 * Renderiza cada peça no tamanho final. A loja recusa o que não bater exato
 * (1280x800 no carrossel, 440x280 no tile, 1400x560 no marquee), e
 * deviceScaleFactor 1 é deliberado: render em 2x reduzido depois só amolece o
 * texto, então o desenho já nasce no tamanho de entrega.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = (name) => path.join(dir, '..', name);

const targets = [
  ...[1, 2, 3, 4, 5].map((i) => ({
    html: `slide-${i}.html`, png: `niango-${i}.png`, w: 1280, h: 800,
  })),
  { html: 'promo-tile.html', png: 'niango-promo-440x280.png', w: 440, h: 280 },
  { html: 'promo-marquee.html', png: 'niango-marquee-1400x560.png', w: 1400, h: 560 },
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

for (const t of targets) {
  const page = await browser.newPage({
    viewport: { width: t.w, height: t.h }, deviceScaleFactor: 1,
  });
  await page.goto('file://' + path.join(dir, t.html));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({
    path: out(t.png), clip: { x: 0, y: 0, width: t.w, height: t.h },
  });
  await page.close();
  console.log(`ok ${t.png} (${t.w}x${t.h})`);
}

await browser.close();
