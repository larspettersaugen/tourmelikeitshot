import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Ensures local dev login accounts exist with known passwords.
 * Does not add tours, people, or projects — use `npm run db:import-sqlite` to
 * restore from prisma/dev.db, or create data in the app.
 */
async function main() {
  const adminPassword = await hash('admin123', 12);
  const editorPassword = await hash('editor123', 12);
  const viewerPassword = await hash('viewer123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@tour.local' },
    update: { password: adminPassword },
    create: { email: 'admin@tour.local', password: adminPassword, name: 'Admin', role: 'admin' },
  });
  await prisma.user.upsert({
    where: { email: 'editor@tour.local' },
    update: { password: editorPassword },
    create: { email: 'editor@tour.local', password: editorPassword, name: 'Editor', role: 'editor' },
  });
  await prisma.user.upsert({
    where: { email: 'viewer@tour.local' },
    update: { password: viewerPassword },
    create: { email: 'viewer@tour.local', password: viewerPassword, name: 'Viewer', role: 'viewer' },
  });

  console.log('Seed done (dev users only). Login: admin@tour.local / admin123');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
