'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Clean SVG icon set — sized at 18x18 for standard clarity
const icons = {
  overview:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  alerts:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  teachers:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  students:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  classes:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  subjects:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  sessions:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  fees:        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  audit:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  reports:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  attendance:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  assignments: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  gradebook:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  timetable:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  homework:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  results:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  ward:        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  feeparent:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  academic:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  logout:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  password:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
};

const NavBtn = ({ item, activeTab, onClick }) => (
  <button
    onClick={() => onClick(item.id)}
    className={`sidebar-nav-btn ${activeTab === item.id ? 'active' : ''}`}
  >
    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {icons[item.icon]}
    </span>
    <span>{item.label}</span>
  </button>
);

const NavLink = ({ href, label, icon, isActive }) => (
  <Link
    href={href}
    className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
    style={{ textDecoration: 'none' }}
  >
    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {icons[icon]}
    </span>
    <span>{label}</span>
  </Link>
);

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

  const isSuperAdmin = user?.isSuperAdmin || (user?.roles || []).includes('SUPER_ADMIN') || user?.role === 'super_admin';

  const adminNav = [
    { id: 'dashboard',    label: 'Overview',                icon: 'overview' },
    { id: 'alert-engine', label: 'Alerts & Escalations',    icon: 'alerts' },
    { id: 'teachers',     label: 'Teachers & Faculty',      icon: 'teachers' },
    { id: 'students',     label: 'Student Records',         icon: 'students' },
    { id: 'classes',      label: 'Classes & Sections',      icon: 'classes' },
    { id: 'subjects',     label: 'Subject Listing',         icon: 'subjects' },
    { id: 'sessions',     label: 'Academic Terms',          icon: 'sessions' },
    { id: 'fees',         label: 'Fee Management',          icon: 'fees' },
    { id: 'audit-logs',   label: 'Audit Logs',              icon: 'audit' },
    { id: 'reports',      label: 'System Reports',          icon: 'reports' },
  ];

  const teacherNav = [
    { id: 'attendance',  label: 'Mark Attendance', icon: 'attendance' },
    { id: 'subjects',    label: 'Assigned Classes',icon: 'classes' },
    { id: 'assignments', label: 'Assignments',     icon: 'assignments' },
    { id: 'gradebook',   label: 'Grades & Exams',  icon: 'gradebook' },
    { id: 'reports',     label: 'Class Reports',   icon: 'reports' },
  ];

  const studentNav = [
    { id: 'my-attendance', label: 'Attendance History', icon: 'attendance' },
    { id: 'timetable',     label: 'Class Schedule',    icon: 'timetable' },
    { id: 'homework',      label: 'Homework Tasks',    icon: 'homework' },
    { id: 'results',       label: 'Academic Results',  icon: 'results' },
  ];

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'U';
  const roleLabel = isSuperAdmin
    ? 'Super Admin'
    : { admin: 'Administrator', teacher: 'Instructor', student: 'Student', parent: 'Guardian' }[user?.role] || 'User';

  return (
    <>
      {/* Mobile Header Bar */}
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
            style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', padding: '4px' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>ScholarFlow</h2>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--primary-color)', fontWeight: '700', textTransform: 'uppercase' }}>{isSuperAdmin ? 'SUPER ADMIN' : user?.role}</span>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-desktop ${mobileOpen ? 'open' : ''}`}
        style={{
          width: '270px',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border-color)',
          height: '100vh',
          maxHeight: '100vh',
          padding: '26px 18px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '26px', paddingLeft: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--primary-color)', borderRadius: '12px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              {icons.students}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>ScholarFlow</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Academic Hub</span>
            </div>
          </div>
          {mobileOpen && (
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* User Profile Card */}
        <div style={{ background: 'var(--subcard-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '14px 16px', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: isSuperAdmin ? '#9333ea' : 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</p>
            <p style={{ fontSize: '13px', color: isSuperAdmin ? '#a855f7' : 'var(--primary-color)', margin: '2px 0 0 0', fontWeight: '700' }}>
              {roleLabel} {isSuperAdmin && '👑'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '8px' }}>Main Navigation</p>

          {(user?.role === 'admin' || user?.role === 'super_admin' || isSuperAdmin) && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {adminNav.map(item => <NavBtn key={item.id} item={item} activeTab={activeTab} onClick={handleNavClick} />)}
            </nav>
          )}

          {user?.role === 'teacher' && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {teacherNav.map(item => <NavBtn key={item.id} item={item} activeTab={activeTab} onClick={handleNavClick} />)}
            </nav>
          )}

          {user?.role === 'student' && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {studentNav.map(item => <NavBtn key={item.id} item={item} activeTab={activeTab} onClick={handleNavClick} />)}
            </nav>
          )}

          {user?.role === 'parent' && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <NavLink href="/parent/ward-profile"    label="Ward Overview"     icon="ward"      isActive={false} />
              <NavLink href="/parent/fees"            label="Tuition & Fees"    icon="feeparent" isActive={false} />
              <NavLink href="/parent/academic-report" label="Academic Progress" icon="academic"  isActive={false} />
            </nav>
          )}
        </div>

        {/* Bottom Actions */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link href="/change-password" className="sidebar-nav-btn" style={{ textDecoration: 'none' }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>{icons.password}</span>
            <span>Change Password</span>
          </Link>
          <button onClick={handleLogout} className="sidebar-nav-btn" style={{ width: '100%', color: '#ef4444' }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>{icons.logout}</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
