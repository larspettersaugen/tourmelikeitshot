'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

function InviteAcceptForm() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [personName, setPersonName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setFetchError(data.error);
        else if (data.hasExistingPassword) {
          const q = new URLSearchParams();
          if (data.email?.trim()) q.set('email', data.email.trim());
          q.set('fromInvite', '1');
          router.replace(`/login?${q.toString()}`);
        } else {
          setPersonName(data.personName);
          setEmail(data.email);
        }
      })
      .catch(() => setFetchError('Failed to load invite'));
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to set password');
        setLoading(false);
        return;
      }
      if (!email) throw new Error('No email for sign in');
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  if (fetchError) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-white mb-2">Invalid invite</h1>
          <p className="text-stage-muted">{fetchError}</p>
          <a href="/login" className="mt-4 inline-block text-stage-accent hover:underline">
            Go to login
          </a>
        </div>
      </main>
    );
  }

  if (!personName) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <p className="text-stage-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-white">Set your password</h1>
        <p className="text-stage-muted text-center text-sm mb-6">
          Hi {personName}, create a password to access your profile.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {email && (
            <p className="text-sm text-zinc-400">
              Email: <span className="text-white">{email}</span>
            </p>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-stage-accent"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-zinc-300 mb-1">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-stage-accent"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-stage-accent hover:bg-stage-accentHover text-stage-accentFg font-semibold disabled:opacity-50"
          >
            {loading ? 'Setting up…' : 'Create account'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
          <div className="absolute top-4 right-4 z-10">
            <ThemeToggle />
          </div>
          <p className="text-stage-muted">Loading…</p>
        </main>
      }
    >
      <InviteAcceptForm />
    </Suspense>
  );
}
