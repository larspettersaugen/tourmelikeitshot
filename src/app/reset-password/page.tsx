'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

const MIN_LEN = 10;

function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts recovery tokens in the URL hash; the client auto-exchanges them.
    // Wait for the session to be established from the recovery link.
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // Also check if already in a session (user clicked link and session is active)
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setReady(true);
    });
  }, [supabase.auth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < MIN_LEN) {
      setError(`Password must be at least ${MIN_LEN} characters`);
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message || 'Could not reset password');
      return;
    }
    router.push('/login?reset=1');
    router.refresh();
  }

  if (!ready) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-stage-muted text-sm">Verifying reset link…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-white">Choose a new password</h1>
        <p className="text-stage-muted text-center text-sm mb-8">Use a strong password you don&apos;t use elsewhere.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={MIN_LEN}
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-stage-accent"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-zinc-300 mb-1">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              minLength={MIN_LEN}
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-stage-accent"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-stage-accent hover:bg-stage-accentHover text-stage-accentFg font-semibold disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
          <p className="text-center">
            <Link href="/login" className="text-sm text-stage-muted hover:text-zinc-300">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}
