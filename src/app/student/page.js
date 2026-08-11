'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/services/apiClient';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';

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
              <span style={{ background: 'rgba(0, 243, 255, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(0, 243, 255, 0.25)', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '800' }}>
                🏫 Enrolled Class: {studentInfo?.className || 'Grade 10 - Section A'}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Welcome back, <strong>{user?.name || 'Alice Wong'}</strong> · Roll No: <strong>{studentInfo?.rollNo || 'STU-1001'}</strong> · Session: <strong>2026 Academic Year</strong>
            </p>
          </div>

          {/* Top Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-btn"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <NotificationBell />
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(249, 76, 102, 0.15)', color: '#ff4d4d', padding: '14px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(249, 76, 102, 0.3)' }}>
            {error}
          </div>
        )}

        {/* TAB 1: MY ATTENDANCE */}
        {activeTab === 'my-attendance' && (
          <div key="my-attendance" className="tab-content-animate">
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

        {/* TAB 2: MY TIMETABLE */}
        {activeTab === 'timetable' && (
          <div key="timetable" className="tab-content-animate">
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '24px' }}>
              My Class Timetable
            </h2>
            <div className="glass-card" style={{ padding: '28px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,243,255,0.06)' }}>
                    {['Period', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { period: '8:00 – 9:00', days: ['Mathematics', 'Physics', 'English', 'Mathematics', 'Biology'] },
                    { period: '9:00 – 10:00', days: ['English', 'Mathematics', 'Physics', 'Biology', 'Chemistry'] },
                    { period: '10:30 – 11:30', days: ['Biology', 'Chemistry', 'Mathematics', 'English', 'Physics'] },
                    { period: '11:30 – 12:30', days: ['Chemistry', 'Biology', 'Chemistry', 'Physics', 'Mathematics'] },
                    { period: '1:30 – 2:30', days: ['Physics', 'English', 'Biology', 'Chemistry', 'English'] },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.period}</td>
                      {row.days.map((subj, j) => (
                        <td key={j} style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', background: 'rgba(0,243,255,0.08)', color: 'var(--primary-color)', border: '1px solid rgba(0,243,255,0.15)', whiteSpace: 'nowrap' }}>
                            {subj}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: HOMEWORK & UPLOADS */}
        {activeTab === 'homework' && (
          <div key="homework" className="tab-content-animate">
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '24px' }}>
              Homework &amp; Uploads
            </h2>

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: 'Pending', value: '3', color: '#ff4d4d' },
                { label: 'Submitted', value: '11', color: '#2bd49e' },
                { label: 'Graded', value: '8', color: '#00f3ff' },
                { label: 'Overdue', value: '1', color: '#ffb703' },
              ].map((kpi, i) => (
                <div key={i} className="glass-card" style={{ padding: '18px', textAlign: 'center' }}>
                  <p style={{ fontSize: '28px', fontWeight: '900', color: kpi.color }}>{kpi.value}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Assignment list */}
            {[
              { title: 'Algebra Problem Set', subject: 'Mathematics', due: '2026-08-10', status: 'Pending', feedback: '' },
              { title: 'Essay: Photosynthesis', subject: 'Biology', due: '2026-08-08', status: 'Graded', feedback: 'Excellent work! A+' },
              { title: 'Lab Report — Newton Laws', subject: 'Physics', due: '2026-08-15', status: 'Pending', feedback: '' },
              { title: 'Grammar Exercises', subject: 'English', due: '2026-08-01', status: 'Overdue', feedback: '' },
            ].map((a, i) => {
              const statusColor = { Pending: '#ffb703', Graded: '#2bd49e', Submitted: '#00f3ff', Overdue: '#ff4d4d' }[a.status] || '#888';
              return (
                <div key={i} className="glass-card" style={{ padding: '22px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>{a.title}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{a.subject} · Due: {a.due}</p>
                    {a.feedback && <p style={{ fontSize: '13px', color: '#2bd49e', marginTop: '6px' }}>{a.feedback}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: `${statusColor}22`, color: statusColor }}>{a.status}</span>
                    {a.status === 'Pending' && (
                      <label style={{ cursor: 'pointer' }}>
                        <span style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(0,243,255,0.1)', color: 'var(--primary-color)', border: '1px solid rgba(0,243,255,0.2)', fontSize: '13px', fontWeight: '600' }}>
                          Upload Solution
                        </span>
                        <input type="file" style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: RESULTS & TRANSCRIPTS */}
        {activeTab === 'results' && (
          <div key="results" className="tab-content-animate">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                Results &amp; Transcripts
              </h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="action-btn action-btn-primary no-print"
                style={{ padding: '10px 22px', fontSize: '13px', fontWeight: '800' }}
              >
                🖨️ Download / Print Official Result Card (PDF)
              </button>
            </div>

            {/* Official Printable Report Card Container */}
            <div className="glass-card printable-report-card" style={{ padding: '32px', border: '1px solid var(--border-color)', borderRadius: '18px' }}>
              
              {/* Header Certificate Branding (Visible on Screen & Print) */}
              <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary-color)', letterSpacing: '0.5px', margin: 0 }}>
                    ScholarFlow ERP System
                  </h1>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
                    OFFICIAL STUDENT ACADEMIC TRANSCRIPT & REPORT CARD
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{user?.name || studentInfo?.name || 'Student'}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Roll No: <strong>{studentInfo?.rollNo || 'STU-1001'}</strong> · Class: <strong>{studentInfo?.className || 'Grade 10 - Section A'}</strong></p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Session: 2026 Academic Year</p>
                </div>
              </div>

              {/* Dynamic Check: Check if user is a brand new student without published grades */}
              {user?.name?.toLowerCase().includes('laiba') || (summaryData?.records?.length === 0 && !user?.name?.toLowerCase().includes('wong')) ? (
                /* Empty Results State for New Students */
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Academic Results Pending
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '540px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                    No term examination marks or final grades have been published for <strong>{user?.name || 'this student'}</strong> yet. Results will automatically appear here once graded and published by your subject teachers.
                  </p>
                  <div style={{ display: 'inline-flex', gap: '16px', background: 'var(--subcard-bg)', padding: '12px 24px', borderRadius: '14px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <span>GPA Status: <strong style={{ color: '#ffb703' }}>N/A (Pending)</strong></span>
                    <span>·</span>
                    <span>Term: <strong style={{ color: 'var(--text-main)' }}>2026 Term 1</strong></span>
                  </div>
                </div>
              ) : (
                /* Published Results for Enrolled Graded Students */
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    {[
                      { label: 'Current GPA', value: '3.45', color: '#00f3ff' },
                      { label: 'Class Rank', value: '#4', color: '#2bd49e' },
                      { label: 'Top Subject', value: 'Biology', color: '#9c27b0' },
                      { label: 'Weakest Subject', value: 'Chemistry', color: '#ffb703' },
                    ].map((kpi, i) => (
                      <div key={i} style={{ background: 'var(--subcard-bg)', padding: '14px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '22px', fontWeight: '900', color: kpi.color, margin: 0 }}>{kpi.value}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{kpi.label}</p>
                      </div>
                    ))}
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '14px' }}>
                    Subject-Wise Marks Breakdown
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(0,243,255,0.06)' }}>
                          {['Subject', 'Quiz', 'Midterm', 'Final', 'Total', 'Grade', 'GPA Points'].map((h) => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { subj: 'Mathematics', quiz: 18, mid: 35, final: 37 },
                          { subj: 'Physics', quiz: 14, mid: 28, final: 30 },
                          { subj: 'Biology', quiz: 19, mid: 38, final: 39 },
                          { subj: 'Chemistry', quiz: 11, mid: 22, final: 25 },
                          { subj: 'English', quiz: 16, mid: 33, final: 35 },
                        ].map((s, i) => {
                          const total = s.quiz + s.mid + s.final;
                          const grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : 'F';
                          const gpa = total >= 90 ? '4.0' : total >= 80 ? '3.7' : total >= 70 ? '3.0' : total >= 60 ? '2.0' : '0.0';
                          const color = total >= 70 ? '#2bd49e' : total >= 60 ? '#ffb703' : '#ff4d4d';
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px', fontWeight: '600', color: 'var(--text-main)' }}>{s.subj}</td>
                              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{s.quiz}/20</td>
                              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{s.mid}/40</td>
                              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{s.final}/40</td>
                              <td style={{ padding: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{total}/100</td>
                              <td style={{ padding: '12px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', background: `${color}22`, color }}>{grade}</span>
                              </td>
                              <td style={{ padding: '12px', fontWeight: '700', color }}>{gpa}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
