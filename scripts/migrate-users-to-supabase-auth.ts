/**
 * One-time migration: creates Supabase Auth users for all existing Prisma Users.
 * Existing users will need to use "Forgot password" to set a new Supabase Auth password.
 *
 * Usage:
 *   npx tsx scripts/migrate-users-to-supabase-auth.ts
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv(): void {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.+?)"?\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2];
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  console.log(`Found ${users.length} Prisma users to migrate.\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: { name: user.name },
    });

    if (error) {
      if (error.message?.includes('already been registered')) {
        console.log(`  SKIP ${user.email} (already in Supabase Auth)`);
        skipped++;
      } else {
        console.error(`  FAIL ${user.email}: ${error.message}`);
        errors++;
      }
    } else {
      console.log(`  OK   ${user.email} → ${data.user.id}`);
      created++;
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${errors} errors.`);
  console.log('Users must use "Forgot password" to set their Supabase Auth password.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
