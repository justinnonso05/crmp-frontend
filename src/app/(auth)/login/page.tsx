'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, setToken, setUser } from '@/lib/api';
import { AUTH } from '@/lib/endpoints';

interface LoginResponse {
  token: string;
  user: Record<string, unknown>;
  message: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<LoginResponse>(AUTH.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      setToken(data.token);
      setUser(data.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card-wrap">
      <div className="auth-card">

        {/* Header */}
        <div className="auth-header">
          <p className="auth-eyebrow">Researcher Portal</p>
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-subtitle">
            Access your research workspace and collaboration tools.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@institution.edu"
              value={form.email}
              onChange={handleChange}
              className="auth-input"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="auth-input"
                disabled={loading}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                  color: 'rgba(26,26,24,0.45)', lineHeight: 1, fontSize: '1rem',
                }}
              >
                {showPassword ? (
                  // Eye-off icon
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  // Eye icon
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
            id="login-submit"
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        {/* Footer link */}
        <p className="auth-switch">
          New to ResearchHub?{' '}
          <Link href="/register" className="auth-link">Create an account</Link>
        </p>
      </div>

      {/* Right decorative panel */}
      <div className="auth-deco" aria-hidden>
        <div className="auth-deco-grid" />
        <blockquote className="auth-deco-quote">
          "Science advances one collaboration at a time."
        </blockquote>
        <p className="auth-deco-attr">— CRMP Research Platform</p>
      </div>
    </div>
  );
}
