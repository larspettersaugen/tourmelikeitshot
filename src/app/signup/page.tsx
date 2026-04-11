'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { navigateAfterClientAuth } from '@/lib/navigate-after-client-auth';
import { ThemeToggle } from '@/components/ThemeToggle';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password' | 'not-found'>('email');
  const [firstName, setFirstName] = useState('');
  const router = useRouter();

  async function handleCheckEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }
      if (!data.found) {
        setStep('not-found');
      } else if (data.hasAccount) {
        router.push(`/login?email=${encodeURIComponent(email)}`);
        return;
      } else {
        setFirstName(data.firstName || '');
        setStep('password');
      }
    } catch {
      setError('Something went wrong');
    }
    setLoading(false);
  }

  async function handleSignup(e: React.FormEvent) {
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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      navigateAfterClientAuth('/dashboard');
    } catch {
      setError('Account created but sign-in failed. Try signing in manually.');
      setLoading(false);
    }
  }

  if (step === 'not-found') {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">No profile found</h1>
          <p className="text-stage-muted text-sm mb-6">
            There is no profile registered for{' '}
            <span className="text-white">{email}</span>. Ask your tour
            administrator to add you to the system first.
          </p>
          <button
            onClick={() => {
              setStep('email');
              setError('');
            }}
            className="text-stage-accent hover:underline text-sm"
          >
            Try a different email
          </button>
          <div className="mt-4">
            <Link
              href="/login"
              className="text-stage-muted hover:text-zinc-300 text-sm underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (step === 'password') {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-2 text-white">
            Set your password
          </h1>
          <p className="text-stage-muted text-center text-sm mb-6">
            Hi {firstName || 'there'}, create a password to access your account.
          </p>
          <form onSubmit={handleSignup} className="space-y-4">
            <p className="text-sm text-zinc-400">
              Email: <span className="text-white">{email}</span>
            </p>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
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
              <label
                htmlFor="confirm"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
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
          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-stage-muted hover:text-zinc-300 text-sm underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
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
        <h1 className="text-2xl font-bold text-center mb-2 text-white">
          Set up your account
        </h1>
        <p className="text-stage-muted text-center text-sm mb-8">
          Enter the email your administrator registered for you.
        </p>
        <form onSubmit={handleCheckEmail} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-300 mb-1"
            >
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
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-stage-muted hover:text-zinc-300 text-sm underline-offset-2 hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-stage-surface">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-center mb-2 text-white">
              Set up your account
            </h1>
            <p className="text-stage-muted text-center">Loading…</p>
          </div>
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
