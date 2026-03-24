/**
 * Set a Supabase Auth user's password (service role).
 *
 *   node scripts/set-supabase-user-password.mjs <email> <new-password>
 *
 * Loads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env / .env.local
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    try {
      const text = readFileSync(join(root, f), 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!m) continue;
        let val = m[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[m[1]] === undefined) process.env[m[1]] = val;
      }
    } catch {
      /* missing */
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const password = process.argv[3];

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!email || !password) {
  console.error('Usage: node scripts/set-supabase-user-password.mjs <email> <new-password>');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let page = 1;
let target = null;
while (!target && page < 50) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  target = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (data.users.length < 200) break;
  page += 1;
}

if (!target) {
  console.error(`No Supabase Auth user found for: ${email}`);
  process.exit(1);
}

const { error: upd } = await supabase.auth.admin.updateUserById(target.id, { password });
if (upd) {
  console.error(upd);
  process.exit(1);
}

console.log(`Updated password for ${email} (id ${target.id})`);
