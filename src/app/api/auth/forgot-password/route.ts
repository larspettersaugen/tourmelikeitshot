import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runWithTransientDbRetry } from '@/lib/transient-db-retry';
import { sendPasswordResetEmail } from '@/lib/password-reset-email';
import {
  generateResetToken,
  getPasswordResetBaseUrl,
  hashResetToken,
  RESET_MAX_PER_WINDOW,
  RESET_RATE_WINDOW_MS,
  RESET_TOKEN_TTL_MS,
} from '@/lib/password-reset';

/** Same JSON for every outcome that should not reveal whether the email exists. */
const GENERIC = {
  ok: true,
  message: 'If an account exists for that email, we sent password reset instructions.',
};

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  let emailRaw = '';
  try {
    const body = (await req.json()) as { email?: string };
    emailRaw = String(body.email ?? '').trim().toLowerCase();
  } catch {
    return NextResponse.json(GENERIC);
  }

  // Small jitter to reduce timing-based enumeration
  await new Promise((r) => setTimeout(r, 250 + Math.floor(Math.random() * 250)));

  if (!emailRaw || !looksLikeEmail(emailRaw)) {
    return NextResponse.json(GENERIC);
  }

  try {
    return await runWithTransientDbRetry(
      async () => {
        const user = await prisma.user.findUnique({
          where: { email: emailRaw },
          select: { id: true, email: true, password: true },
        });

        // OAuth-only accounts have no password — behave like unknown email (generic message)
        if (!user?.password) {
          return NextResponse.json(GENERIC);
        }

        const since = new Date(Date.now() - RESET_RATE_WINDOW_MS);
        const recentCount = await prisma.passwordResetToken.count({
          where: { userId: user.id, createdAt: { gte: since } },
        });
        if (recentCount >= RESET_MAX_PER_WINDOW) {
          return NextResponse.json(GENERIC);
        }

        await prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        });

        const rawToken = generateResetToken();
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
        await prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt },
        });

        const base = getPasswordResetBaseUrl(req);
        if (!base) {
          console.error('[forgot-password] No NEXTAUTH_URL / PUBLIC_APP_URL / Host — cannot build reset link');
          return NextResponse.json(GENERIC);
        }

        const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
        const sendResult = await sendPasswordResetEmail(user.email, resetUrl);
        if (!sendResult.sent) {
          // Always log (Vercel logs) — client still gets GENERIC (no email enumeration).
          console.error('[forgot-password] Resend did not send:', sendResult.error ?? 'unknown');
          if (process.env.NODE_ENV === 'development') {
            console.warn('[forgot-password] Dev-only reset URL:', resetUrl);
          }
        }

        return NextResponse.json(GENERIC);
      },
      { maxAttempts: 4, delayMs: 1500, logLabel: 'forgot-password' }
    );
  } catch (err) {
    // Uncaught Prisma errors (e.g. missing PasswordResetToken table, DB down) became 500 and showed "Something went wrong" with no server log context.
    console.error('[forgot-password] Request failed:', err);
    return NextResponse.json(
      { ok: false, message: 'Something went wrong. Try again later.' },
      { status: 503 }
    );
  }
}
