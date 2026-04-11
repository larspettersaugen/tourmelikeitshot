'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserIdentity } from '@supabase/supabase-js';

export function GoogleAccountLink() {
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasGoogle, setHasGoogle] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setHasGoogle(
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !!process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED,
    );
    loadIdentities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadIdentities() {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.getUserIdentities();
      if (err) throw err;
      setIdentities(data?.identities ?? []);
    } catch {
      setError('Could not load linked accounts.');
    } finally {
      setLoading(false);
    }
  }

  const googleIdentity = identities.find((i) => i.provider === 'google');
  const hasEmailProvider = identities.some((i) => i.provider === 'email');
  const canUnlink = identities.length > 1;

  async function handleLink() {
    setError('');
    setActionLoading(true);
    try {
      const { error: err } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard/profile`,
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not start Google linking.',
      );
      setActionLoading(false);
    }
  }

  async function handleUnlink() {
    if (!googleIdentity) return;
    if (
      !confirm(
        'Unlink Google from your account? You can still sign in with your email and password.',
      )
    )
      return;
    setError('');
    setActionLoading(true);
    try {
      const { error: err } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (err) throw err;
      await loadIdentities();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not unlink Google.',
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (!hasGoogle && !loading) return null;

  return (
    <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
      <div className="p-6">
        <h3 className="text-sm font-semibold text-white mb-4">
          Connected accounts
        </h3>

        {loading ? (
          <p className="text-sm text-stage-muted">Loading…</p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-full bg-white flex items-center justify-center">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Google</p>
                {googleIdentity ? (
                  <p className="text-xs text-stage-muted truncate">
                    {(googleIdentity.identity_data?.email as string) ||
                      'Connected'}
                  </p>
                ) : (
                  <p className="text-xs text-stage-muted">Not connected</p>
                )}
              </div>
            </div>

            {googleIdentity ? (
              <button
                type="button"
                onClick={handleUnlink}
                disabled={actionLoading || !canUnlink}
                title={
                  !canUnlink
                    ? 'Cannot unlink your only sign-in method'
                    : hasEmailProvider
                      ? 'You can still sign in with email & password'
                      : undefined
                }
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-400/30 text-red-400 hover:bg-red-400/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Unlinking…' : 'Unlink'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLink}
                disabled={actionLoading}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-stage-border text-white hover:bg-stage-surface disabled:opacity-50"
              >
                {actionLoading ? 'Linking…' : 'Link'}
              </button>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      </div>
    </div>
  );
}
