/**
 * Neon + Vercel: first serverless invocation often hits a cold DB or waking compute.
 * Prisma then throws PrismaClientInitializationError ("Can't reach database server" / P1001).
 */
const TRANSIENT_MARKERS = [
  "Can't reach database server",
  'P1001',
  'Server has closed the connection',
  'Connection terminated unexpectedly',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'Timed out fetching',
] as const;

export function isTransientDbError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_MARKERS.some((m) => msg.includes(m));
}

export async function runWithTransientDbRetry<T>(
  fn: () => Promise<T>,
  opts?: { maxAttempts?: number; delayMs?: number; logLabel?: string }
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  const delayMs = opts?.delayMs ?? 1500;
  const label = opts?.logLabel ?? 'db-retry';
  let last: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isTransientDbError(e) || i === maxAttempts - 1) throw e;
      console.warn(`[${label}] transient DB error (attempt ${i + 1}/${maxAttempts}), retrying in ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw last;
}
