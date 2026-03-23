/**
 * Migrate deploy with retries (Neon cold start / transient P1001).
 * Invoked from vercel.json after `npx prisma generate` and before `npx next build --webpack`.
 */
import { execSync } from 'node:child_process';

const opts = { stdio: 'inherit', env: process.env, shell: true };
const max = 5;
const delaySec = 15;

function sleep(seconds) {
  execSync(process.platform === 'win32' ? `powershell -Command "Start-Sleep -s ${seconds}"` : `sleep ${seconds}`, {
    stdio: 'ignore',
    shell: true,
  });
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required for prisma migrate deploy (set in Vercel Environment Variables).');
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  console.error('DIRECT_URL is required for Prisma migrate on Neon (non-pooler URL). See DEPLOY.md.');
  process.exit(1);
}

for (let attempt = 1; attempt <= max; attempt++) {
  console.log(`prisma migrate deploy (attempt ${attempt}/${max})...`);
  try {
    execSync('npx prisma migrate deploy', opts);
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
