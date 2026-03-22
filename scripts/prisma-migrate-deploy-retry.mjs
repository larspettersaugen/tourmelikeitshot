/**
 * Retry `prisma migrate deploy` for Neon cold start / transient P1001.
 * Node is more reliable than bash on some CI images.
 */
import { execSync } from 'node:child_process';

const max = 5;
const delaySec = 15;

function sleep(seconds) {
  execSync(process.platform === 'win32' ? `powershell -Command "Start-Sleep -s ${seconds}"` : `sleep ${seconds}`, {
    stdio: 'ignore',
  });
}

for (let attempt = 1; attempt <= max; attempt++) {
  console.log(`prisma migrate deploy (attempt ${attempt}/${max})...`);
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
    process.exit(0);
  } catch {
    if (attempt < max) {
      console.log(`Waiting ${delaySec}s before retry (Neon cold start / transient network)...`);
      sleep(delaySec);
    }
  }
}

console.error('prisma migrate deploy failed after all retries');
process.exit(1);
