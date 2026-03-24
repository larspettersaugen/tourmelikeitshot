import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

/**
 * Ensures local dev login accounts exist in both Supabase Auth and Prisma.
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env.
 */
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const devUsers = [
    { email: 'admin@tour.local', password: 'tour1234', name: 'Admin', role: 'admin' },
    { email: 'editor@tour.local', password: 'editor123edit', name: 'Editor', role: 'editor' },
    { email: 'viewer@tour.local', password: 'viewer123view', name: 'Viewer', role: 'viewer' },
  ];

  for (const u of devUsers) {
    const { error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name },
    });
    if (error && !error.message?.includes('already been registered')) {
      console.warn(`  Supabase auth: ${u.email} - ${error.message}`);
    }

    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, password: null, name: u.name, role: u.role },
    });
  }

  console.log('Seed done (dev users). Login: admin@tour.local / tour1234 (see docs/DEV_ACCOUNTS.md)');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
