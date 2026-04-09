#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(projectRoot, 'prisma/schema.prisma');
const nextDir = path.join(projectRoot, '.next');
const nextServerDir = path.join(nextDir, 'server');

process.chdir(projectRoot);

/** Free port 3000 so a leftover `next dev` or orphan from nodemon cannot cause EADDRINUSE. */
killDevPorts();

/** Avoid stale Next still holding .next while we delete it (ENOENT build-manifest / turbopack runtime). */
function killDevPorts() {
  try {
    execSync(
      'lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null; lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null; lsof -ti:8080 2>/dev/null | xargs kill -9 2>/dev/null; true',
      { shell: '/bin/sh', stdio: 'ignore' }
    );
  } catch {
    /* ignore */
  }
}

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

// Webpack matches `next build --webpack` and avoids Turbopack dev cache corruption after .next wipes.
execSync('npx next dev -p 3000 --webpack', { stdio: 'inherit' });
