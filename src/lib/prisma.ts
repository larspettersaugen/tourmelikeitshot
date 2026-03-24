import { PrismaClient } from '@prisma/client';

/** True when DATABASE_URL was never replaced with a real Postgres URL (e.g. still from .env.example). */
function isPlaceholderDatabaseUrl(url: string | undefined): boolean {
  if (url == null || url.trim() === '') return true;
  const u = url.toLowerCase();
  return u.includes('ep-xxxx') || u.includes('user:password@');
}

function assertDatabaseUrlConfigured(): void {
  const url = process.env.DATABASE_URL;
  if (!isPlaceholderDatabaseUrl(url)) return;
  throw new Error(
    [
      'DATABASE_URL is missing or still the .env.example placeholder.',
      'Set your Supabase Postgres connection string in .env or .env.local as DATABASE_URL=... then restart npm run dev.',
      'Do not commit real URLs to git.',
    ].join(' '),
  );
}

const prismaClientSingleton = () => {
  assertDatabaseUrlConfigured();
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
}

function getPrisma(): ReturnType<typeof prismaClientSingleton> {
  // Dev/HMR: reuse one client so we don't open new pools on every reload (Neon pool timeouts).
  if (process.env.NODE_ENV !== 'production') {
    if (!globalThis.prismaGlobal) {
      globalThis.prismaGlobal = prismaClientSingleton();
    }
    return globalThis.prismaGlobal;
  }
  return prismaClientSingleton();
}

export const prisma = getPrisma();
