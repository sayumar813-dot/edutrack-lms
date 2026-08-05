'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/services/apiClient';
import Sidebar from '@/components/Sidebar';

export default function StudentPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('my-attendance');
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'student') {
        router.push('/');
      } else {
        loadAttendance();
      }
    }
  }, [user, authLoading, router]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const data = await apiClient('/api/attendance/summary');
      setSummaryData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading Student Portal...</p>
        </div>
      </div>
    );
  }

  const { stats, attendanceLog } = summaryData || {};

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="app-main">
        
        {/* Top Header Bar */}
        <div className="page-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
              Student Portal
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Welcome back, <strong>{user?.name}</strong>!
            </p>
          </div>

          {/* Top Right Permanent Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn"
            style={{ padding: '10px 20px', fontSize: '15px' }}
          >
            <span>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(249, 76, 102, 0.15)', color: '#ff4d4d', padding: '14px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(249, 76, 102, 0.3)' }}>
            {error}
          </div>
        )}

        {/* TAB 1: MY ATTENDANCE */}
        {activeTab === 'my-attendance' && (
          <div>
            {/* Student Personal Stats Cards */}
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '36px' }}>
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '36px', color: 'var(--primary-color)', fontWeight: '700' }}>
                  {stats?.percentage || 0}%
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Overall Attendance</p>
              </div>

              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '36px', color: '#2bd49e', fontWeight: '700' }}>
                  {stats?.present || 0}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Days Present</p>
              </div>

              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '36px', color: '#ff4d4d', fontWeight: '700' }}>
                  {stats?.absent || 0}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Days Absent</p>
              </div>

              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '36px', color: '#ffb703', fontWeight: '700' }}>
                  {stats?.late || 0}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Days Late</p>
              </div>
            </div>

            {/* Attendance History Log Table */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>
                Personal Attendance Record
              </h2>

              {attendanceLog?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No attendance recorded for your profile yet.</p>
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '14px' }}>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px' }}>Subject</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceLog?.map((item) => {
                        const statusColor = item.status === 'present' ? '#2bd49e' : item.status === 'absent' ? '#ff4d4d' : '#ffb703';
                        return (
                          <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '14px 12px', fontWeight: '600' }}>
                              {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>
                              {item.subjectId?.name || 'Subject'}
                            </td>
                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                              <span
                                style={{
                                  background: `${statusColor}20`,
                                  color: statusColor,
                                  border: `1px solid ${statusColor}40`,
                                  padding: '4px 12px',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
