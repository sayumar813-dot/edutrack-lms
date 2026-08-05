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
  const [subjectFilter, setSubjectFilter] = useState('');
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
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)' }}>Loading Student Portal...</p>
        </div>
      </div>
    );
  }

  const { stats, attendanceLog = [], subjectBreakdown = [], studentInfo } = summaryData || {};

  // Filter attendance log by selected subject
  const filteredLog = subjectFilter
    ? attendanceLog.filter(item => item.subjectId?.name === subjectFilter)
    : attendanceLog;

  const attendancePct = stats?.percentage || 0;
  const pctColor = attendancePct >= 75 ? '#2bd49e' : attendancePct >= 60 ? '#ffb703' : '#ff4d4d';

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="app-main">
        
        {/* Top Header Bar */}
        <div className="page-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
                Student Portal
              </h1>
              {studentInfo && (
                <span style={{ background: 'rgba(0, 243, 255, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(0, 243, 255, 0.25)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                  {studentInfo.className}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Welcome back, <strong>{user?.name}</strong> {studentInfo?.rollNo ? `(Roll No: ${studentInfo.rollNo})` : ''}
            </p>
          </div>

          {/* Top Right Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn"
            style={{ padding: '10px 20px', fontSize: '15px' }}
          >
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
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
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '18px', marginBottom: '28px' }}>
              
              {/* Overall Attendance Card with Progress Indicator */}
              <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Score</span>
                  <h3 style={{ fontSize: '38px', color: pctColor, fontWeight: '800', margin: '4px 0 8px' }}>
                    {attendancePct}%
                  </h3>
                </div>
                {/* Progress bar */}
                <div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--progress-track)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${attendancePct}%`, height: '100%', background: pctColor, transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    {attendancePct >= 75 ? 'On track (≥75% required)' : 'Low attendance warning'}
                  </span>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Days Present</span>
                <h3 style={{ fontSize: '38px', color: '#2bd49e', fontWeight: '800', margin: '4px 0 4px' }}>
                  {stats?.present || 0}
                </h3>
                <span style={{ fontSize: '12px', color: '#2bd49e', fontWeight: '600' }}>Classes attended</span>
              </div>

              <div className="glass-card" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Days Absent</span>
                <h3 style={{ fontSize: '38px', color: '#ff4d4d', fontWeight: '800', margin: '4px 0 4px' }}>
                  {stats?.absent || 0}
                </h3>
                <span style={{ fontSize: '12px', color: '#ff4d4d', fontWeight: '600' }}>Classes missed</span>
              </div>

              <div className="glass-card" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Days Late</span>
                <h3 style={{ fontSize: '38px', color: '#ffb703', fontWeight: '800', margin: '4px 0 4px' }}>
                  {stats?.late || 0}
                </h3>
                <span style={{ fontSize: '12px', color: '#ffb703', fontWeight: '600' }}>Arrived late</span>
              </div>
            </div>

            {/* Subject-Wise Performance Breakdown */}
            {subjectBreakdown.length > 0 && (
              <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>
                  Subject-Wise Attendance
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  {subjectBreakdown.map((sub, idx) => {
                    const subColor = sub.percentage >= 75 ? '#2bd49e' : sub.percentage >= 60 ? '#ffb703' : '#ff4d4d';
                    return (
                      <div key={idx} style={{ background: 'var(--subcard-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>{sub.subjectName}</span>
                          <span style={{ fontWeight: '800', fontSize: '16px', color: subColor }}>{sub.percentage}%</span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--progress-track)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{ width: `${sub.percentage}%`, height: '100%', background: subColor }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>P: <strong style={{ color: '#2bd49e' }}>{sub.present}</strong></span>
                          <span>L: <strong style={{ color: '#ffb703' }}>{sub.late}</strong></span>
                          <span>A: <strong style={{ color: '#ff4d4d' }}>{sub.absent}</strong></span>
                          <span>Total: <strong>{sub.total}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {/* Attendance History Log Table */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                  Personal Attendance Record ({filteredLog.length})
                </h2>

                {/* Subject Filter */}
                {subjectBreakdown.length > 0 && (
                  <select
                    className="input-field"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    style={{ width: 'auto', minWidth: '180px', padding: '8px 14px', fontSize: '13px' }}
                  >
                    <option value="">All Subjects</option>
                    {subjectBreakdown.map((s, idx) => (
                      <option key={idx} value={s.subjectName}>{s.subjectName}</option>
                    ))}
                  </select>
                )}
              </div>

              {filteredLog.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
                  No attendance records found {subjectFilter ? `for "${subjectFilter}"` : ''}.
                </p>
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px' }}>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px' }}>Class</th>
                        <th style={{ padding: '12px' }}>Subject</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLog.map((item) => {
                        const statusColor = item.status === 'present' ? '#2bd49e' : item.status === 'absent' ? '#ff4d4d' : '#ffb703';
                        return (
                          <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '14px 12px', fontWeight: '600' }}>
                              {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                              {item.classId?.name || studentInfo?.className || 'Class'}
                            </td>
                            <td style={{ padding: '14px 12px', color: 'var(--text-main)', fontWeight: '600' }}>
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
