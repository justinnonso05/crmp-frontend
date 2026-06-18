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
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              className="auth-input"
              disabled={loading}
            />
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
