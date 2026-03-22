#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(projectRoot, 'prisma/schema.prisma');
const nextDir = path.join(projectRoot, '.next');
const nextServerDir = path.join(nextDir, 'server');

process.chdir(projectRoot);

execSync('npx prisma generate', { stdio: 'inherit' });

const schemaExists = fs.existsSync(schemaPath);
const nextExists = fs.existsSync(nextDir);
const nextServerExists = fs.existsSync(nextServerDir);

let clearNext = !nextExists || !nextServerExists;
if (!clearNext && schemaExists) {
  clearNext = fs.statSync(schemaPath).mtimeMs > fs.statSync(nextServerDir).mtimeMs;
}
// Stale .next often causes "no CSS" in dev (wrong chunks). Refresh when deps or lockfile change.
if (!clearNext && nextServerExists) {
  const serverMtime = fs.statSync(nextServerDir).mtimeMs;
  for (const rel of ['package.json', 'package-lock.json', 'next.config.js', 'tailwind.config.ts', 'postcss.config.mjs']) {
    const f = path.join(projectRoot, rel);
    if (fs.existsSync(f) && fs.statSync(f).mtimeMs > serverMtime) {
      clearNext = true;
      break;
    }
  }
}

if (clearNext) {
  fs.rmSync(nextDir, { recursive: true, force: true });
}

execSync('npx next dev -p 3000', { stdio: 'inherit' });
