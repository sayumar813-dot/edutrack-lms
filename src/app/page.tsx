'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function LoginPage() {
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal States
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const { user, login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'ADMIN') window.location.href = '/admin';
      else if (user.role === 'teacher' || user.role === 'TEACHER') window.location.href = '/teacher';
      else if (user.role === 'student' || user.role === 'STUDENT') window.location.href = '/student';
      else if (user.role === 'parent' || user.role === 'PARENT') window.location.href = '/parent/ward-profile';
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await login(email, password, role);
      if (res.mustResetPassword) {
        window.location.href = '/change-password';
      } else {
        const targetRole = res.role?.toLowerCase();
        if (targetRole === 'admin') window.location.href = '/admin';
        else if (targetRole === 'teacher') window.location.href = '/teacher';
        else if (targetRole === 'student') window.location.href = '/student';
        else if (targetRole === 'parent') window.location.href = '/parent/ward-profile';
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const rolesList = [
    { id: 'admin', label: 'Admin' },
    { id: 'teacher', label: 'Teacher' },
    { id: 'student', label: 'Student' },
    { id: 'parent', label: 'Parent' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '24px', position: 'relative', overflow: 'hidden', background: 'var(--bg-color)' }}>
      
      {/* Background Glow */}
      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(122, 28, 40, 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(43, 212, 158, 0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="theme-toggle-btn"
        style={{ position: 'absolute', top: '24px', right: '24px', padding: '8px 18px', fontSize: '13px', zIndex: 10, background: 'var(--card-bg)' }}
      >
        <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
      </button>

      {/* Main Container */}
      <div style={{ width: '100%', maxWidth: '460px', position: 'relative', zIndex: 1 }}>
        
        {/* ScholarFlow Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary-color) 0%, #0088ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ffffff', fontWeight: '900', fontSize: '24px', boxShadow: '0 8px 24px rgba(122,28,40,0.3)' }}>
            S
          </div>
          <h1 style={{ fontSize: '34px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.8px', marginBottom: '6px' }}>
            ScholarFlow
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>
            Academic Command Center &amp; Portal
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: '36px 32px', borderRadius: '24px', boxShadow: 'var(--shadow-hover)' }}>
          
          {error && (
            <div style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '22px', border: '1px solid rgba(255, 77, 77, 0.25)', fontWeight: '600' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} autoComplete="off">
            
            {/* Role Selector Pills */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                SELECT PORTAL ROLE
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', background: 'var(--input-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                {rolesList.map((r) => {
                  const active = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      style={{
                        padding: '9px 4px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: active ? 'var(--primary-color)' : 'transparent',
                        color: active ? '#ffffff' : 'var(--text-muted)',
                        boxShadow: active ? '0 2px 8px rgba(122, 28, 40, 0.3)' : 'none',
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                INSTITUTIONAL EMAIL
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, color: 'var(--text-muted)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  type="email"
                  className="input-field"
                  placeholder="user@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: '42px' }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => { setResetSent(false); setShowForgotModal(true); }}
                  style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--primary-color)', fontWeight: '700', cursor: 'pointer' }}
                >
                  Forgot?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, color: 'var(--text-muted)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '42px', paddingRight: '56px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px', borderRadius: '4px' }} />
              Keep me signed in on this device
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px', marginTop: '4px', borderRadius: '14px' }}
            >
              {submitting ? 'AUTHENTICATING...' : `SIGN IN AS ${role.toUpperCase()}`}
            </button>
          </form>

          {/* Interactive Assistance Link */}
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            Need technical assistance?{' '}
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Contact System Administrator
            </button>
          </div>

        </div>

        {/* Footer */}
        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', opacity: 0.7 }}>
          © 2026 ScholarFlow ERP Systems. Secured with Enterprise Encryption.
        </p>

      </div>

      {/* IT SUPPORT MODAL */}
      {showSupportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '32px', borderRadius: '24px', textAlign: 'left', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-color)', margin: 0 }}>
                IT System Administrator
              </h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-main)', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
              If you have forgotten your credentials or require role permission changes, please contact the institution IT Helpdesk:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--input-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Administrator Email</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-color)' }}>admin@edutrack.com</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>IT Support Helpline</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>+92 (42) 111-338-435</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Office Hours</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Monday – Friday: 08:00 AM – 05:00 PM</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '32px', borderRadius: '24px', textAlign: 'left', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Reset Your Password
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {resetSent ? (
              <div>
                <div style={{ background: 'rgba(43,212,158,0.12)', color: '#2bd49e', padding: '16px', borderRadius: '16px', border: '1px solid rgba(43,212,158,0.3)', marginBottom: '20px', fontSize: '14px', lineHeight: 1.5 }}>
                  Reset instructions have been dispatched to <strong>{resetEmail || 'your email'}</strong>. Please check your inbox.
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setResetSent(true); }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                  Enter your registered institutional email address to receive password reset instructions:
                </p>
                <input
                  type="email"
                  className="input-field"
                  placeholder="user@institution.edu"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  style={{ marginBottom: '20px' }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                >
                  Send Reset Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
