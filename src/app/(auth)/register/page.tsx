'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { AUTH } from '@/lib/endpoints';

interface RegisterResponse {
  message: string;
  userId: string;
}

const ROLE_OPTIONS = [
  { value: 'PI',               label: 'Principal Investigator' },
  { value: 'CO_INVESTIGATOR',  label: 'Co-Investigator' },
  { value: 'ASSISTANT',        label: 'Research Assistant / Student' },
  { value: 'REVIEWER',         label: 'Reviewer' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    password:  '',
    confirm:   '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { firstName, lastName, email, password, confirm } = form;
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch<RegisterResponse>(AUTH.REGISTER, {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      // Redirect to login with a success hint
      router.push('/login?registered=1');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card-wrap">
      <div className="auth-card auth-card--wide">

        {/* Header */}
        <div className="auth-header">
          <p className="auth-eyebrow">Join ResearchHub</p>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">
            Start collaborating with your research team today.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>

          {/* Name row */}
          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="firstName" className="auth-label">First name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="Ada"
                value={form.firstName}
                onChange={handleChange}
                className="auth-input"
                disabled={loading}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="lastName" className="auth-label">Last name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Lovelace"
                value={form.lastName}
                onChange={handleChange}
                className="auth-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email" className="auth-label">Email address</label>
            <input
              id="reg-email"
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

          {/* Password row */}
          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="reg-password" className="auth-label">Password</label>
              <input
                id="reg-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                className="auth-input"
                disabled={loading}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="confirm" className="auth-label">Confirm password</label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={handleChange}
                className="auth-input"
                disabled={loading}
              />
            </div>
          </div>

          {/* Role note */}
          <p className="auth-role-note">
            Your role will be assigned by the Principal Investigator when you are added to a project. You can always create your own projects as PI.
          </p>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
            id="register-submit"
          >
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link href="/login" className="auth-link">Sign in</Link>
        </p>
      </div>

      {/* Right decorative panel */}
      <div className="auth-deco" aria-hidden>
        <div className="auth-deco-grid" />
        <div className="auth-deco-roles">
          {ROLE_OPTIONS.map(r => (
            <div key={r.value} className="auth-deco-role-pill">
              <span className="auth-deco-role-dot" />
              {r.label}
            </div>
          ))}
        </div>
        <p className="auth-deco-attr">Roles within a project</p>
      </div>
    </div>
  );
}
