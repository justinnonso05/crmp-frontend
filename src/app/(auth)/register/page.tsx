'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, setToken, setUser } from '@/lib/api';
import { AUTH } from '@/lib/endpoints';
import { SearchableDropdown } from '@/components/SearchableDropdown';

import institutionsData from '@/data/institutions.json';
import facultiesData from '@/data/faculties.json';

interface RegisterResponse {
  message: string;
  user: Record<string, unknown>;
  token: string;
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
    university: '',
    faculty:    '',
    department: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm,  setShowConfirm]    = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { firstName, lastName, email, password, confirm, university, faculty, department } = form;
    if (!firstName || !lastName || !email || !password || !university || !faculty || !department) {
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
      const data = await apiFetch<RegisterResponse>(AUTH.REGISTER, {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, password, university, faculty, department }),
      });
      setToken(data.token);
      setUser(data.user);
      // Redirect to dashboard with a success hint
      router.push('/dashboard?registered=1');
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

          {/* Tenancy fields */}
          <SearchableDropdown
            label="University / Institution"
            options={institutionsData as { id: string | number; name: string }[]}
            value={form.university}
            onChange={(val) => setForm(prev => ({ ...prev, university: val, faculty: '', department: '' }))}
            placeholder="Select institution"
            disabled={loading}
          />

          <div className="auth-row">
            <SearchableDropdown
              label="Faculty"
              options={facultiesData.faculties.map(f => ({ id: f.id, name: f.name }))}
              value={form.faculty}
              onChange={(val) => setForm(prev => ({ ...prev, faculty: val, department: '' }))}
              placeholder="Select faculty"
              disabled={loading || !form.university}
            />

            <SearchableDropdown
              label="Department"
              options={
                form.faculty
                  ? facultiesData.faculties.find(f => f.name === form.faculty)?.departments.map(d => ({ id: d.id, name: d.name })) || []
                  : []
              }
              value={form.department}
              onChange={(val) => setForm(prev => ({ ...prev, department: val }))}
              placeholder="Select department"
              disabled={loading || !form.faculty}
            />
          </div>

          {/* Password row */}
          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="reg-password" className="auth-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="confirm" className="auth-label">Confirm password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={handleChange}
                  className="auth-input"
                  disabled={loading}
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                    color: 'rgba(26,26,24,0.45)', lineHeight: 1, fontSize: '1rem',
                  }}
                >
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
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
