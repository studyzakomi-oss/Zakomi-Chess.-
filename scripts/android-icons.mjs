// Renders public/icons/icon.svg into Android launcher PNGs (run after `npx cap add android`).
import { chromium } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';

const svg = readFileSync('public/icons/icon.svg', 'utf8');
const square = svg.replace('rx="112"', 'rx="0"');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
const page = await browser.newPage();
async function render(markup, px, out, round = false, pad = 0) {
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(`<html><body style="margin:0;background:transparent"><div style="width:${px}px;height:${px}px;${round ? 'border-radius:50%;overflow:hidden;' : ''}padding:${pad}px;box-sizing:border-box">${markup.replace('<svg ', `<svg width="${px - 2 * pad}" height="${px - 2 * pad}" `)}</div></body></html>`);
  await page.screenshot({ path: out, omitBackground: true });
}
for (const [d, px] of Object.entries(sizes)) {
  const dir = `android/app/src/main/res/mipmap-${d}`;
  if (!readdirSync('android/app/src/main/res').includes(`mipmap-${d}`)) continue;
  await render(svg, px, `${dir}/ic_launcher.png`);
  await render(square, px, `${dir}/ic_launcher_round.png`, true);
  // Adaptive-icon foreground: 108dp canvas, artwork inside the 72dp safe zone.
  const fg = Math.round((px * 108) / 48);
  await render(square, fg, `${dir}/ic_launcher_foreground.png`, false, Math.round(fg * 0.17));
}
await browser.close();
console.log('icons written');
