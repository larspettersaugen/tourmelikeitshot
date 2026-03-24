/**
 * ESM entry so Node resolves @google/stitch-sdk (package is ESM-only).
 *
 *   npm run stitch:fetch
 *
 * Requires STITCH_API_KEY in .env.local (see scripts/fetch-stitch-screen.ts header).
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { stitch } from '@google/stitch-sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvFiles() {
  for (const f of ['.env.local', '.env']) {
    try {
      const text = readFileSync(join(root, f), 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
    } catch {
      /* missing */
    }
  }
}

loadEnvFiles();

const PROJECT_ID = process.env.STITCH_PROJECT_ID ?? '16355217856079053150';
const SCREEN_ID =
  process.env.STITCH_SCREEN_ID ?? 'dee37b25120a4f1db8dd8bc5758e817a';
const OUTPUT_SLUG = process.env.STITCH_OUTPUT_SLUG ?? 'dashboard-the-hub';

async function downloadToFile(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`GET failed ${res.status}: ${url.slice(0, 80)}…`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
}

async function main() {
  if (!process.env.STITCH_API_KEY?.trim()) {
    console.error(
      [
        'Missing STITCH_API_KEY.',
        'In Stitch: Settings → API Keys → Create key.',
        'Add to .env.local: STITCH_API_KEY="your-key"',
      ].join('\n'),
    );
    process.exit(1);
  }

  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Screen:  ${SCREEN_ID}`);

  const project = stitch.project(PROJECT_ID);
  const screen = await project.getScreen(SCREEN_ID);

  const htmlUrl = await screen.getHtml();
  const imageUrl = await screen.getImage();

  console.log('HTML URL (expires):', htmlUrl.slice(0, 100) + '…');
  console.log('Image URL (expires):', imageUrl.slice(0, 100) + '…');

  const outDir = join(root, 'design', 'stitch', PROJECT_ID);
  const htmlPath = join(outDir, `${OUTPUT_SLUG}.html`);
  const pngPath = join(outDir, `${OUTPUT_SLUG}.png`);

  await downloadToFile(htmlUrl, htmlPath);
  await downloadToFile(imageUrl, pngPath);

  console.log('\nSaved:');
  console.log(' ', htmlPath);
  console.log(' ', pngPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
