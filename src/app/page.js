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
  const [showQuickFill, setShowQuickFill] = useState(false);

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

  const handleQuickFill = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      setEmail('admin@edutrack.com');
      setPassword('Admin@12345');
    } else if (selectedRole === 'teacher') {
      setEmail('ali.hassan@demo.edutrack.com');
      setPassword('Demo@12345');
    } else if (selectedRole === 'student') {
      setEmail('student@demo.edutrack.com');
      setPassword('Demo@12345');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Ambient Glow Orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 243, 255, 0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(43, 212, 158, 0.15) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      {/* Top Right Floating Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="theme-toggle-btn"
        style={{ position: 'absolute', top: '24px', right: '24px', padding: '10px 20px', fontSize: '14px', zIndex: 10 }}
      >
        <span>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
      </button>

      {/* Login Card */}
      <div className="glass-card login-card" style={{ width: '100%', maxWidth: '460px', padding: '44px 36px', textAlign: 'center', position: 'relative', zIndex: 1, boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)', borderRadius: '24px' }}>
        
        {/* Animated Brand Logo Container */}
        <div style={{ background: '#ffffff', padding: '12px', borderRadius: '22px', boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 0 25px rgba(0, 243, 255, 0.25)', border: '2px solid rgba(0, 243, 255, 0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '88px', height: '88px', marginBottom: '18px', transition: 'all 0.3s ease' }}>
          <img src="/logo.png" alt="LMS Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>

        <h1 style={{ fontSize: '32px', marginBottom: '6px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          LMS <span style={{ color: 'var(--primary-color)' }}>System</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px', fontWeight: '500' }}>
          Single-Academy SaaS Management Portal
        </p>

        {/* Modern Role Selector Tabs */}
        <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '5px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--border-color)', gap: '4px' }}>
          {[
            { id: 'admin', label: 'Admin', icon: '👑' },
            { id: 'teacher', label: 'Teacher', icon: '👨‍🏫' },
            { id: 'student', label: 'Student', icon: '🎓' },
          ].map((item) => {
            const isActive = role === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setRole(item.id)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, var(--primary-color) 0%, #0088ff 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: isActive ? '700' : '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? '0 6px 18px rgba(0, 243, 255, 0.35)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ background: 'rgba(249, 76, 102, 0.15)', color: '#ff4d4d', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', border: '1px solid rgba(249, 76, 102, 0.35)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} autoComplete="off">
          
          {/* Email Field with Icon */}
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: 'var(--text-muted)' }}>✉️</span>
            <input
              type="email"
              className="input-field"
              placeholder={`${role.charAt(0).toUpperCase() + role.slice(1)} Email Address`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ paddingLeft: '44px' }}
              autoComplete="new-email"
            />
          </div>

          {/* Password Field with Toggle Eye Icon */}
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: 'var(--text-muted)' }}>🔒</span>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingLeft: '44px', paddingRight: '48px' }}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: 'var(--text-muted)',
                padding: '6px',
                borderRadius: '8px',
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
            style={{ width: '100%', height: '50px', fontSize: '16px', fontWeight: '700', borderRadius: '14px', marginTop: '6px' }}
          >
            {submitting ? 'Authenticating...' : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>
        </form>

        {/* Quick Demo Credentials Helper */}
        <div style={{ marginTop: '22px' }}>
          <button
            type="button"
            onClick={() => setShowQuickFill(!showQuickFill)}
            style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>⚡ Quick Demo Credentials</span>
            <span style={{ fontSize: '10px' }}>{showQuickFill ? '▲' : '▼'}</span>
          </button>

          {showQuickFill && (
            <div style={{ marginTop: '12px', background: 'var(--subcard-bg)', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[
                { id: 'admin', label: '👑 Admin' },
                { id: 'teacher', label: '👨‍🏫 Teacher' },
                { id: 'student', label: '🎓 Student' },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleQuickFill(d.id)}
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
          Secured by EduTrack JWT Authentication
        </div>

      </div>
    </div>
  );
}
