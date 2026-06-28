'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser, removeToken, setUser } from '@/lib/api';
import { USERS } from '@/lib/endpoints';
import { SearchableDropdown } from '@/components/SearchableDropdown';

import institutionsData from '@/data/institutions.json';
import facultiesData from '@/data/faculties.json';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  university?: string;
  faculty?: string;
  department?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setLocalUser]        = useState<User | null>(null);
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty]       = useState('');
  const [department, setDepartment] = useState('');
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState('');
  const [error, setError]           = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const u = getUser<User>();
    if (!u) { router.replace('/login'); return; }
    setLocalUser(u);
    setFirstName(u.firstName ?? '');
    setLastName(u.lastName ?? '');
    setUniversity(u.university ?? '');
    setFaculty(u.faculty ?? '');
    setDepartment(u.department ?? '');
  }, [router]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    setSaving(true); setMessage(''); setError('');
    try {
      const res = await apiFetch<{ user: User }>(USERS.PROFILE, {
        method: 'PUT',
        body: JSON.stringify({ firstName, lastName, university, faculty, department }),
      });
      setUser(res.user);
      setLocalUser(res.user);
      setMessage('Profile updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function proceedDeactivate() {
    setShowConfirm(false);
    try {
      await apiFetch(USERS.PROFILE, { method: 'DELETE' });
      removeToken();
      window.location.href = '/login';
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate account.');
    }
  }

  const departmentOptions =
    faculty
      ? facultiesData.faculties.find(f => f.name === faculty)?.departments.map(d => ({ id: d.id, name: d.name })) ?? []
      : [];

  if (!user) return null;

  return (
    <div style={{ padding: '0.75rem 1.5rem 2rem', display: 'flex', justifyContent: 'center' }}>
      <div className="auth-card auth-card--wide" style={{ maxWidth: '560px', width: '100%' }}>

        {/* Header */}
        <div className="auth-header">
          <p className="auth-eyebrow">Account</p>
          <h1 className="auth-title">Your Profile</h1>
          <p className="auth-subtitle">Update your personal information and institution details.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleUpdateProfile} className="auth-form" noValidate>

          {/* Email — read only */}
          <div className="auth-field">
            <label htmlFor="profile-email" className="auth-label">Email address (read-only)</label>
            <input
              id="profile-email"
              className="auth-input"
              type="email"
              value={user.email}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>

          {/* Name row */}
          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="profile-firstname" className="auth-label">First name</label>
              <input
                id="profile-firstname"
                className="auth-input"
                type="text"
                placeholder="Ada"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); setError(''); }}
                disabled={saving}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="profile-lastname" className="auth-label">Last name</label>
              <input
                id="profile-lastname"
                className="auth-input"
                type="text"
                placeholder="Lovelace"
                value={lastName}
                onChange={e => { setLastName(e.target.value); setError(''); }}
                disabled={saving}
              />
            </div>
          </div>

          {/* University */}
          <SearchableDropdown
            label="University / Institution"
            options={institutionsData as { id: string | number; name: string }[]}
            value={university}
            onChange={val => { setUniversity(val); setFaculty(''); setDepartment(''); }}
            placeholder="Select institution"
            disabled={saving}
          />

          {/* Faculty + Department */}
          <div className="auth-row">
            <SearchableDropdown
              label="Faculty"
              options={facultiesData.faculties.map(f => ({ id: f.id, name: f.name }))}
              value={faculty}
              onChange={val => { setFaculty(val); setDepartment(''); }}
              placeholder="Select faculty"
              disabled={saving || !university}
            />
            <SearchableDropdown
              label="Department"
              options={departmentOptions}
              value={department}
              onChange={setDepartment}
              placeholder="Select department"
              disabled={saving || !faculty}
            />
          </div>

          {error   && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <button
            type="submit"
            className="auth-btn"
            disabled={saving}
            id="profile-submit"
          >
            {saving ? 'Saving…' : 'Save changes →'}
          </button>
        </form>

        {/* Danger zone */}
        <div className="auth-form" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(26,26,24,0.1)' }}>
          <p className="auth-eyebrow" style={{ color: 'rgba(185,28,28,0.8)', marginBottom: '0.5rem' }}>Danger zone</p>
          <p className="auth-subtitle" style={{ marginBottom: '1rem' }}>
            Deactivating your account will immediately log you out. Your data will be preserved to protect ongoing projects.
          </p>
          <button
            type="button"
            className="auth-btn"
            onClick={() => setShowConfirm(true)}
            style={{ background: 'transparent', color: 'rgb(185,28,28)', border: '1px solid rgba(185,28,28,0.4)' }}
          >
            Deactivate Account
          </button>
        </div>
      </div>

      {/* Confirm deactivation modal */}
      {showConfirm && (
        <div className="dash-modal-overlay">
          <div className="dash-modal">
            <h3 className="dash-modal-title">Deactivate Account</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
              Are you absolutely sure? You will lose access to all your projects immediately.
            </p>
            <div className="dash-modal-actions">
              <button className="dash-btn-ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button
                className="auth-btn"
                onClick={proceedDeactivate}
                style={{ background: 'rgb(185,28,28)', border: 'none' }}
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
