'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function LoginPage() {
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user, login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') window.location.href = '/admin';
      else if (user.role === 'teacher') window.location.href = '/teacher';
      else if (user.role === 'student') window.location.href = '/student';
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await login(email, password, role);
      if (res.mustResetPassword) {
        window.location.href = '/change-password';
      } else {
        if (res.role === 'admin') window.location.href = '/admin';
        else if (res.role === 'teacher') window.location.href = '/teacher';
        else if (res.role === 'student') window.location.href = '/student';
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '20px', position: 'relative' }}>
      
      {/* Top Right Floating Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="theme-toggle-btn"
        style={{ position: 'absolute', top: '24px', right: '24px', padding: '10px 18px', fontSize: '15px' }}
      >
        <span>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
      </button>

      <div className="glass-card login-card" style={{ width: '100%', maxWidth: '440px', padding: '40px 30px', textAlign: 'center' }}>
        
        {/* Custom Logo Card */}
        <div style={{ background: '#ffffff', padding: '12px', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 0 20px rgba(0, 243, 255, 0.15)', border: '1px solid rgba(0, 243, 255, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '90px', height: '90px', marginBottom: '15px' }}>
          <img src="/logo.png" alt="LMS Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>

        <h1 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: '700', color: 'var(--text-main)' }}>
          LMS <span style={{ color: 'var(--primary-color)' }}>System</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '30px' }}>
          SaaS Learning & Academy Portal
        </p>

        {/* Role Selector Group */}
        <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '4px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
          {['admin', 'teacher', 'student'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: '8px',
                border: 'none',
                background: role === r ? 'var(--primary-color)' : 'transparent',
                color: role === r ? '#ffffff' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '15px',
                textTransform: 'capitalize',
                cursor: 'pointer',
                transition: 'var(--transition)',
                boxShadow: role === r ? '0 4px 12px rgba(0, 243, 255, 0.3)' : 'none',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(249, 76, 102, 0.15)', color: '#ff4d4d', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px', border: '1px solid rgba(249, 76, 102, 0.3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} autoComplete="off">
          <input
            type="email"
            className="input-field"
            placeholder={`${role.charAt(0).toUpperCase() + role.slice(1)} Email Address`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="new-email"
          />

          {/* Password Input with Eye Peak Icon Toggle */}
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '48px' }}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: 'var(--text-muted)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={showPassword ? 'Hide Password' : 'Show Password'}
            >
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {submitting ? 'Authenticating...' : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
          Secured by EduTrack JWT Authentication
        </div>

      </div>
    </div>
  );
}
