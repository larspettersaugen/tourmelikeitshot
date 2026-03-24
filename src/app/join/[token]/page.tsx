'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const TYPE_LABELS: Record<string, string> = {
  musician: 'Musician',
  superstar: 'Superstar',
  crew: 'Crew',
  tour_manager: 'Tour manager',
  productionmanager: 'Production manager',
  driver: 'Driver',
};

function BetaJoinForm() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [status, setStatus] = useState<'loading' | 'ready' | 'invalid' | 'disabled'>('loading');
  const [personTypes, setPersonTypes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [type, setType] = useState('crew');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    const pathToken = Array.isArray(token) ? token[0] : token;
    fetch(`/api/join/${encodeURIComponent(pathToken)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.personTypes)) {
          setPersonTypes(data.personTypes);
          if (data.personTypes.includes('crew')) setType('crew');
          else if (data.personTypes[0]) setType(data.personTypes[0]);
          setStatus('ready');
        } else if (data.code === 'disabled') {
          setStatus('disabled');
        } else {
          setStatus('invalid');
        }
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

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
    const pathToken = Array.isArray(token) ? token[0] : token;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/join/${encodeURIComponent(pathToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setSubmitting(false);
        return;
      }
      const signEmail = data.email || email.trim().toLowerCase();
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signEmail,
        password,
      });
      if (signInError) {
        setError('Account created. Sign in on the login page.');
        setSubmitting(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong');
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <p className="text-stage-muted">Loading…</p>
      </main>
    );
  }

  if (status === 'disabled') {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-white mb-2">Beta signup unavailable</h1>
          <p className="text-stage-muted text-sm">
            Self-service signup is not enabled on this server. Ask your tour admin for an invite link.
          </p>
          <Link href="/login" className="mt-4 inline-block text-stage-accent hover:underline text-sm">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  if (status === 'invalid') {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-white mb-2">Invalid beta link</h1>
          <p className="text-stage-muted text-sm">This link is wrong or no longer valid.</p>
          <Link href="/login" className="mt-4 inline-block text-stage-accent hover:underline text-sm">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-white">Join beta</h1>
        <p className="text-stage-muted text-center text-sm mb-6">
          Create your profile and sign in. You’ll have viewer access to try the app.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="join-name" className="block text-sm font-medium text-zinc-300 mb-1">
              Name
            </label>
            <input
              id="join-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-stage-accent"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="join-email" className="block text-sm font-medium text-zinc-300 mb-1">
              Email
            </label>
            <input
              id="join-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-stage-accent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="join-type" className="block text-sm font-medium text-zinc-300 mb-1">
              Role
            </label>
            <select
              id="join-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white focus:outline-none focus:ring-2 focus:ring-stage-accent"
            >
              {personTypes.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="join-password" className="block text-sm font-medium text-zinc-300 mb-1">
              Password
            </label>
            <input
              id="join-password"
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
            <label htmlFor="join-confirm" className="block text-sm font-medium text-zinc-300 mb-1">
              Confirm password
            </label>
            <input
              id="join-confirm"
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
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-stage-accent hover:bg-stage-accentHover text-stage-accentFg font-semibold disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-stage-muted text-xs">
          Already have an account?{' '}
          <Link href="/login" className="text-stage-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function BetaJoinPage() {
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
      <BetaJoinForm />
    </Suspense>
  );
}
