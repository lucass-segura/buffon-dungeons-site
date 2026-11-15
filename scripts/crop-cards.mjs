// One-off asset script (not part of the shipped bundle):
//   SHOTS=<screenshots folder> node scripts/crop-cards.mjs
// Crops real card sprites from the game's 2560x1440 screenshots, rounds their corners and packs them into
// two 4x2 atlases (sharp + soft "far" variant) in src/assets/cards/. Needs `sharp` (a devDependency).
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Folder with the game's smoke-test screenshots (the LÖVE save directory), e.g.
//   SHOTS="$HOME/Library/Application Support/LOVE/buffon-dungeons" node scripts/crop-cards.mjs
const SHOTS = process.env.SHOTS;
if (!SHOTS) throw new Error('Set SHOTS to the folder with the game screenshots');
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/assets/cards');
const K = 1.28; // boxes below are measured on the 2000x1125 preview of the 2560x1440 screenshots
const CELL = { w: 100, h: 140 };

// [file, x1, y1, x2, y2, label]
const CARDS = [
  ['gm-d1-deck-viewer.png', 765, 325, 838, 429, 'gold six of spades'],
  ['gm-d1-deck-viewer.png', 1319, 318, 1395, 419, 'cyan queen of spades'],
  ['gm-d1-deck-viewer.png', 1413, 447, 1486, 549, 'cyan king of hearts'],
  ['gm-d1-deck-viewer.png', 1133, 715, 1204, 816, 'ten of diamonds'],
  ['gm-d1-deck-viewer.png', 955, 576, 1028, 678, 'rainbow eight of clubs'],
  ['gm-d1-deck-viewer.png', 1500, 715, 1571, 816, 'ace of diamonds'],
  ['gm-s1-shop-idle.png', 937, 66, 1060, 240, 'joker Foco'],
  ['gm-s1-shop-idle.png', 1090, 66, 1213, 240, 'joker Timador de Diamantes'],
];

const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL.w}" height="${CELL.h}"><rect width="${CELL.w}" height="${CELL.h}" rx="9" fill="#fff"/></svg>`,
);

const cells = [];
for (const [file, x1, y1, x2, y2] of CARDS) {
  const box = { left: Math.round(x1 * K), top: Math.round(y1 * K), width: Math.round((x2 - x1) * K), height: Math.round((y2 - y1) * K) };
  const card = await sharp(path.join(SHOTS, file))
    .extract(box)
    .resize(CELL.w, CELL.h, { fit: 'fill', kernel: 'lanczos3' })
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  cells.push(card);
}

async function atlas(buffers, name, blur) {
  const layers = [];
  for (let i = 0; i < buffers.length; i++) {
    let input = buffers[i];
    if (blur) {
      // blur on a padded canvas, then crop back, so the card edge fades instead of being clipped
      const padded = await sharp(input).extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } }).blur(blur).png().toBuffer();
      input = await sharp(padded).extract({ left: 6, top: 6, width: CELL.w, height: CELL.h }).png().toBuffer();
    }
    layers.push({ input, left: (i % 4) * CELL.w, top: Math.floor(i / 4) * CELL.h });
  }
  await sharp({ create: { width: CELL.w * 4, height: CELL.h * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .webp(blur ? { quality: 60, alphaQuality: 80 } : { quality: 90, alphaQuality: 100, smartSubsample: false })
    .toFile(path.join(OUT, name));
}

await atlas(cells, 'atlas.webp', 0);
await atlas(cells, 'atlas-blur.webp', 2.2);
console.log('wrote', CARDS.length, 'cards');
