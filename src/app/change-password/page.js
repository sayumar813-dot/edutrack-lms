'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });

      await refreshUser();

      if (user?.role === 'admin') router.push('/admin');
      else if (user?.role === 'teacher') router.push('/teacher');
      else if (user?.role === 'student') router.push('/student');
      else router.push('/');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '40px 30px', textAlign: 'center' }}>
        
        <div style={{ background: 'rgba(0, 243, 255, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', color: 'var(--primary-color)', fontSize: '24px' }}>
          Key
        </div>

        <h1 style={{ fontSize: '24px', marginBottom: '8px', fontWeight: '700' }}>
          Set Your New Password
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Your account was created with a temporary password. Please set a secure permanent password to continue.
        </p>

        {error && (
          <div style={{ background: 'rgba(249, 76, 102, 0.15)', color: '#ff4d4d', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', border: '1px solid rgba(249, 76, 102, 0.3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }} autoComplete="off">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                style={{ paddingRight: '60px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '700',
                  padding: '4px',
                }}
              >
                {showNewPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                style={{ paddingRight: '60px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '700',
                  padding: '4px',
                }}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Updating...' : 'Update Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
