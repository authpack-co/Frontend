/**
 * Recentra o viewBox de cada vetor de vendor/icons/ na caixa real do desenho.
 *
 * O viewBox que vem do simple-icons não promete que a arte esteja centrada
 * nele — a do Figma, por exemplo, encosta à esquerda. Como o chip é quadrado e
 * o <img> usa object-fit, esse desvio aparece como um glifo torto dentro do
 * tile, e em 26px não dá para corrigir no olho.
 *
 * Aqui o próprio Chromium mede a bbox com getBBox() e o viewBox vira um
 * quadrado centrado nela. Roda uma vez e o resultado fica versionado; o
 * pipeline de build não depende disto.
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), 'vendor', 'icons');
const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage();

for (const file of files) {
  const svg = readFileSync(path.join(dir, file), 'utf8');
  await page.setContent(`<div id="h">${svg}</div>`);
  const box = await page.evaluate(() => {
    const root = document.querySelector('#h svg');
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of root.querySelectorAll('path, circle, rect, polygon, ellipse')) {
      const b = el.getBBox();
      if (!b.width && !b.height) continue;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    }
    return { x0, y0, x1, y1 };
  });

  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  const side = Math.max(w, h);
  const cx = box.x0 + w / 2;
  const cy = box.y0 + h / 2;
  const vb = [cx - side / 2, cy - side / 2, side, side]
    .map((n) => Number(n.toFixed(3)))
    .join(' ');

  const out = svg.replace(/viewBox="[^"]*"/, `viewBox="${vb}"`);
  writeFileSync(path.join(dir, file), out);
  console.log(`${file.padEnd(12)} ${w.toFixed(1)}x${h.toFixed(1)} → viewBox="${vb}"`);
}

await browser.close();
