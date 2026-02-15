import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserAuthentication } from '@ohif/ui-next';
import { useAppConfig } from '@state';

type LoginResponse = { token: string };
type AuthApi = {
  setUser?: (user: unknown) => void;
};

function getRedirectTo(location: ReturnType<typeof useLocation>) {
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect');
  return redirect && redirect.startsWith('/') ? redirect : '/';
}

function getBackendUrl(appConfig: unknown): string {
  const root = appConfig as Record<string, unknown>;
  const dental = root?.dental as Record<string, unknown> | undefined;
  const simpleLogin = dental?.simpleLogin as Record<string, unknown> | undefined;
  const fromConfig = simpleLogin?.backendUrl;
  const fromStorage = (() => {
    try {
      return window.localStorage.getItem('ohif.dentalBackend.url');
    } catch {
      return null;
    }
  })();
  let test = String(fromConfig || fromStorage || 'http://localhost:4010');
  console.log('test->', test);
  return test;
}

async function loginRequest(backendUrl: string, username: string, password: string) {
  const res = await fetch(`${backendUrl.replace(/\/+$/, '')}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Login failed (${res.status})`);
  }

  return (await res.json()) as LoginResponse;
}

export default function SimpleLogin() {
  const [appConfig] = useAppConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const authContext: unknown = useUserAuthentication();
  const authApi = (Array.isArray(authContext) ? authContext[1] : null) as AuthApi | null;

  const redirectTo = useMemo(() => getRedirectTo(location), [location]);
  const backendUrl = useMemo(() => getBackendUrl(appConfig), [appConfig]);

  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('demo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { token } = await loginRequest(backendUrl, username, password);
      try {
        window.localStorage.setItem('ohif.dentalBackend.url', backendUrl);
        window.localStorage.setItem('ohif.dentalBackend.token', token);
        window.localStorage.setItem('ohif.simpleLogin.user', JSON.stringify({ username, token }));
      } catch {
        // no-op
      }

      if (authApi?.setUser) {
        authApi.setUser({ username, access_token: token });
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-lg border border-white/10 bg-[#0b1b2a] p-6"
      >
        <div className="text-lg font-semibold">Sign in</div>
        <div className="mt-1 text-sm text-white/70">
          Enter credentials to access the study list.
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="text-sm">
            <div className="mb-1 text-white/80">Username</div>
            <input
              className="border-white/15 w-full rounded-md border bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-400/60"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-white/80">Password</div>
            <input
              className="border-white/15 w-full rounded-md border bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-400/60"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
        </div>

        {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
