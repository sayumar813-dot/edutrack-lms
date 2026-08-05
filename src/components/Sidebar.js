'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Header Bar with Hamburger Menu */}
      <div
        className="mobile-header-bar"
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'var(--sidebar-bg)',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 999,
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            ☰
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            LMS <span style={{ color: 'var(--primary-color)' }}>System</span>
          </h2>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--primary-color)', fontWeight: '700', textTransform: 'uppercase' }}>
          {user?.role}
        </div>
      </div>

      {/* Backdrop overlay for mobile sidebar */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`sidebar-desktop ${mobileOpen ? 'open' : ''}`}
        style={{
          width: '280px',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border-color)',
          minHeight: '100vh',
          padding: '28px 20px',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        {/* Sidebar Header Branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#ffffff', padding: '6px', borderRadius: '14px', border: '1px solid rgba(0, 243, 255, 0.3)', display: 'inline-flex', width: '44px', height: '44px', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0, 243, 255, 0.2)' }}>
              <img src="/logo.png" alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1.2' }}>
                LMS <span style={{ color: 'var(--primary-color)' }}>System</span>
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>Academy Portal</span>
            </div>
          </div>

          {/* Close button inside mobile menu */}
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              ✖
            </button>
          )}
        </div>

        {/* User Profile Card */}
        <div style={{ background: 'var(--glass-bg)', padding: '16px 20px', borderRadius: '16px', marginBottom: '28px', border: '1px solid var(--border-color)', backdropFilter: 'blur(10px)', transition: 'var(--transition)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color) 0%, #0088ff 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '18px', boxShadow: '0 4px 12px rgba(0, 243, 255, 0.3)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>{user?.name || 'User'}</h4>
              <p style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
                {user?.role || 'PORTAL'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links Group */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '14px', paddingLeft: '8px' }}>
            NAVIGATION
          </div>

          {user?.role === 'admin' && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'dashboard', label: 'Dashboard & Graphs', icon: '📊' },
                { id: 'teachers', label: 'Manage Teachers', icon: '👨‍🏫' },
                { id: 'students', label: 'Manage Students', icon: '🎓' },
                { id: 'classes', label: 'Manage Classes', icon: '🏫' },
                { id: 'subjects', label: 'Manage Subjects', icon: '📚' },
                { id: 'reports', label: 'Reports & Export', icon: '📄' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`sidebar-nav-btn ${activeTab === item.id ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          )}

          {user?.role === 'teacher' && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'attendance', label: 'Mark Attendance', icon: '📝' },
                { id: 'subjects', label: 'My Classes & Subjects', icon: '📚' },
                { id: 'reports', label: 'Class Reports & CSV', icon: '📈' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`sidebar-nav-btn ${activeTab === item.id ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          )}

          {user?.role === 'student' && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'my-attendance', label: 'My Attendance', icon: '📜' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`sidebar-nav-btn ${activeTab === item.id ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Change Password & Logout Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
          <Link
            href="/change-password"
            className="sidebar-nav-btn"
            style={{ textDecoration: 'none', color: 'var(--text-muted)' }}
          >
            <span style={{ fontSize: '18px' }}>🔑</span>
            <span>Change Password</span>
          </Link>

          <button
            onClick={handleLogout}
            className="sidebar-nav-btn danger"
            style={{ width: '100%', background: 'rgba(249, 76, 102, 0.1)', color: '#ff4d4d', border: '1px solid rgba(249, 76, 102, 0.2)' }}
          >
            <span style={{ fontSize: '18px' }}>🚪</span>
            <span>Logout</span>
          </button>
        </div>

      </aside>
    </>
  );
}
