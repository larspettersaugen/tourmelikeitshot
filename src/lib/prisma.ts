import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

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
