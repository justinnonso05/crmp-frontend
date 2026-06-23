'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser, removeToken, setUser } from '@/lib/api';
import { USERS } from '@/lib/endpoints';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setLocalUser] = useState<User | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const u = getUser<User>();
    if (!u) {
      router.replace('/login');
      return;
    }
    setLocalUser(u);
    setFirstName(u.firstName);
    setLastName(u.lastName);
  }, [router]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    
    try {
      const res = await apiFetch<{ user: User }>(USERS.PROFILE, {
        method: 'PUT',
        body: JSON.stringify({ firstName, lastName })
      });
      setUser(res.user);
      setLocalUser(res.user);
      setMessage('Profile updated successfully.');
      // Force a soft refresh to update layout avatar
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    setShowConfirmModal(true);
  }

  async function proceedDeactivate() {
    setShowConfirmModal(false);
    try {
      await apiFetch(USERS.PROFILE, {
        method: 'DELETE'
      });
      removeToken();
      window.location.href = '/login';
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate account.');
    }
  }

  if (!user) return null;

  return (
    <div className="dash-container" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <h1 className="proj-title">Your Profile</h1>
      
      <div className="dash-card" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Personal Information</h2>
        <form onSubmit={handleUpdateProfile} className="auth-form">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <label className="auth-label">Email Address (Read-only)</label>
            <input className="auth-input" type="email" value={user.email} disabled style={{ opacity: 0.7 }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <label className="auth-label">First Name</label>
            <input 
              className="auth-input" 
              type="text" 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)} 
              required
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <label className="auth-label">Last Name</label>
            <input 
              className="auth-input" 
              type="text" 
              value={lastName} 
              onChange={e => setLastName(e.target.value)} 
              required
            />
          </div>
          
          {error && <p className="auth-error">{error}</p>}
          {message && <p style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{message}</p>}
          
          <button type="submit" className="dash-btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </div>

      <div className="dash-card" style={{ 
        marginTop: '3rem', 
        padding: '1.5rem',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        backgroundColor: 'rgba(220, 38, 38, 0.03)',
        borderRadius: '8px'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--error)', fontWeight: 600 }}>Danger Zone</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Deactivating your account will immediately log you out and block future access. Your data will remain to preserve ongoing collaborative projects.
        </p>
        <button 
          onClick={handleDeactivate} 
          className="dash-btn-ghost" 
          style={{ 
            color: 'var(--error)', 
            borderColor: 'rgba(220, 38, 38, 0.3)',
            backgroundColor: 'transparent',
            padding: '0.5rem 1rem',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Deactivate Account
        </button>
      </div>

      {/* ── Custom Confirm Modal ── */}
      {showConfirmModal && (
        <div className="dash-modal-overlay">
          <div className="dash-modal">
            <h3 className="dash-modal-title">Deactivate Account</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
              Are you absolutely sure you want to deactivate your account? You will lose access to all projects immediately.
            </p>
            <div className="dash-modal-actions">
              <button className="dash-btn-ghost" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
              <button 
                className="dash-btn-primary" 
                onClick={proceedDeactivate}
                style={{ backgroundColor: 'var(--error)' }}
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
