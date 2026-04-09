/**
 * Rasterizes the same “H on stage background” motif as src/app/icon.tsx
 * into PNGs for manifest / Apple touch icon. Run after changing colors or letter.
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

function svgForSize(size) {
  const fontSize = Math.round(size * 0.45);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0f0f12"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
    fill="#f59e0b" font-size="${fontSize}" font-weight="700" font-family="system-ui, -apple-system, sans-serif">H</text>
</svg>`;
}

const outputs = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [name, dim] of outputs) {
  const buf = await sharp(Buffer.from(svgForSize(dim))).png().toBuffer();
  writeFileSync(join(publicDir, name), buf);
  console.log('wrote', name);
}
