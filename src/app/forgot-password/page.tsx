'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (resetError) {
        setError('Something went wrong. Try again later.');
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Something went wrong. Try again later.');
    }
    setLoading(false);
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-white">Reset password</h1>
        <p className="text-stage-muted text-center text-sm mb-8">
          Enter your email and we&apos;ll send you a link if an account exists.
        </p>
        {done ? (
          <div className="rounded-lg border border-stage-border bg-stage-card p-4 text-sm text-zinc-300 space-y-4">
            <p>
              If an account exists for that email, we sent instructions. Check your inbox and spam folder. The link
              expires in one hour.
            </p>
            <Link href="/login" className="block text-center text-stage-accent hover:underline font-medium">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-stage-accent"
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-stage-accent hover:bg-stage-accentHover text-stage-accentFg font-semibold disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center">
              <Link href="/login" className="text-sm text-stage-muted hover:text-zinc-300">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <p className="text-stage-muted">Loading…</p>
        </main>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
