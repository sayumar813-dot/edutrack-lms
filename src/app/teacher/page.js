'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/services/apiClient';
import Sidebar from '@/components/Sidebar';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import NotificationBell from '@/components/NotificationBell';

export default function TeacherPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('attendance');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Form & Filter state
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'teacher') {
        router.push('/');
      } else {
        loadTeacherData();
      }
    }
  }, [user, authLoading, router]);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      const [cData, subData, summaryRes] = await Promise.all([
        apiClient('/api/admin/classes'),
        apiClient('/api/admin/subjects'),
        apiClient('/api/attendance/summary'),
      ]);

      setClasses(cData.classes || []);
      setSubjects(subData.subjects || []);
      setAnalytics(summaryRes.analytics || null);

      if (cData.classes && cData.classes.length > 0) {
        setSelectedClass(cData.classes[0]._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadStudentsAndSubjects(selectedClass);
    }
  }, [selectedClass]);

  const loadStudentsAndSubjects = async (classId) => {
    try {
      const [sData, subData, attData] = await Promise.all([
        apiClient(`/api/admin/students?classId=${classId}`),
        apiClient(`/api/admin/subjects?classId=${classId}`),
        selectedSubject
          ? apiClient(`/api/attendance?classId=${classId}&subjectId=${selectedSubject}&date=${attendanceDate}`)
          : Promise.resolve({ records: [] }),
      ]);

      setStudents(sData.students || []);
      setSubjects(subData.subjects || []);

      // Auto-select first subject if none selected
      if (!selectedSubject && subData.subjects && subData.subjects.length > 0) {
        setSelectedSubject(subData.subjects[0]._id);
      }

      const initialAttendance = {};
      (sData.students || []).forEach((st) => {
        const existingRecord = (attData.records || []).find((r) => r.studentId._id === st._id || r.studentId === st._id);
        initialAttendance[st._id] = existingRecord ? existingRecord.status : 'present';
      });

      setAttendanceData(initialAttendance);
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };


  const handleStatusChange = (studentId, status) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || !attendanceDate) {
      setError('Please select a class, subject, and date.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const records = Object.keys(attendanceData).map((studentId) => ({
        studentId,
        status: attendanceData[studentId],
      }));

      await apiClient('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          classId: selectedClass,
          subjectId: selectedSubject,
          date: attendanceDate,
          records,
        }),
      });

      setMessage('Attendance submitted and updated successfully!');
      
      // Refresh teacher real-time analytics
      const summaryRes = await apiClient('/api/attendance/summary');
      setAnalytics(summaryRes.analytics || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const summaryRes = await apiClient(`/api/attendance/summary?classId=${selectedClass}`);
      const records = summaryRes.records || [];

      if (records.length === 0) {
        alert('No attendance records to export for this class.');
        return;
      }

      const headers = ['Date', 'Student Name', 'Roll No', 'Subject', 'Status'];
      const rows = records.map((r) => [
        r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : String(r.date)) : 'N/A',
        `"${r.studentId?.userId?.name || 'N/A'}"`,
        `"${r.studentId?.rollNo || 'N/A'}"`,
        `"${r.subjectId?.name || 'N/A'}"`,
        r.status,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Teacher_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading Teacher Portal...</p>
        </div>
      </div>
    );
  }

  // Filter subjects for the selected class
  const classSubjects = subjects.filter((sub) => {
    if (!sub.classId) return false;
    const subClassId = typeof sub.classId === 'object' ? sub.classId._id : sub.classId;
    return subClassId?.toString() === selectedClass?.toString();
  });

  const tQ = searchQuery.toLowerCase().trim();
  const filteredStudents = tQ ? students.filter(st => (st.userId?.name || st.name || '').toLowerCase().includes(tQ) || (st.rollNo || '').toLowerCase().includes(tQ)) : students;
  const filteredClasses = tQ ? classes.filter(c => (c.name || '').toLowerCase().includes(tQ)) : classes;

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="app-main">
        
        {/* Top Bar with Search & Profile */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            <input
              className="input-field"
              placeholder="Search resources, students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px', paddingRight: searchQuery ? '36px' : '14px', padding: '10px 14px 10px 40px', borderRadius: '20px', fontSize: '13px' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-btn"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <NotificationBell />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-color)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px' }}>
                {user?.name?.charAt(0) || 'T'}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>{user?.name || 'Dr. Sarah Jenkins'}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Lead Instructor</p>
              </div>
            </div>
          </div>
        </div>

        {/* Good Morning Welcome Header */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.8px', marginBottom: '6px' }}>
            Good morning, {user?.name?.split(' ')[0] || 'Teacher'}.
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Here is your academic overview for today.
          </p>
        </div>

        {/* Today's Schedule Row */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              Today's Schedule
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {classSubjects.length === 0 ? (
              <div className="glass-card" style={{ padding: '20px', gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active classes or subjects scheduled for today.
              </div>
            ) : (
              classSubjects.map((sub, i) => (
                <div
                  key={sub._id || i}
                  className="glass-card"
                  style={{
                    padding: '18px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px', background: 'var(--subcard-bg)', color: 'var(--text-muted)' }}>
                      09:00 AM - 10:30 AM
                    </span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>{sub.name}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Class Lecture</p>
                </div>
              ))
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(249, 76, 102, 0.15)', color: '#ff4d4d', padding: '14px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(249, 76, 102, 0.3)' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ background: 'rgba(43, 212, 158, 0.15)', color: 'var(--secondary-color)', padding: '14px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(43, 212, 158, 0.3)' }}>
            {message}
          </div>
        )}

        {/* TAB 1: MARK ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div key="attendance" className="tab-content-animate">
            <div className="glass-card" style={{ padding: '28px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>
                Select Class, Subject & Date
              </h2>

              <div className="form-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Class</label>
                  <select className="input-field" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Subject</label>
                  <select className="input-field" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                    <option value="">Select Subject</option>
                    {classSubjects.map((sub) => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Date</label>
                  <input type="date" className="input-field" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Student Attendance Marking Roster */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)' }}>
                  Student Attendance Roster ({students.length})
                </h2>

                <button
                  onClick={handleSubmitAttendance}
                  disabled={submitting || students.length === 0}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #2bd49e 0%, #0d9488 100%)' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Attendance'}
                </button>
              </div>

              {filteredStudents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No students found matching your criteria.</p>
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '14px' }}>
                        <th style={{ padding: '12px' }}>Roll No</th>
                        <th style={{ padding: '12px' }}>Student Name</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((st) => {
                        const currentStatus = attendanceData[st._id] || 'present';
                        return (
                          <tr key={st._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '14px 12px', fontWeight: '700', color: 'var(--primary-color)' }}>{st.rollNo}</td>
                            <td style={{ padding: '14px 12px', fontWeight: '600' }}>{st.userId?.name || 'Student'}</td>
                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '8px', background: 'var(--input-bg)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(st._id, 'present')}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    background: currentStatus === 'present' ? '#2bd49e' : 'transparent',
                                    color: currentStatus === 'present' ? '#ffffff' : 'var(--text-muted)',
                                  }}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(st._id, 'late')}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    background: currentStatus === 'late' ? '#ffb703' : 'transparent',
                                    color: currentStatus === 'late' ? '#000000' : 'var(--text-muted)',
                                  }}
                                >
                                  Late
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(st._id, 'absent')}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    background: currentStatus === 'absent' ? '#ff4d4d' : 'transparent',
                                    color: currentStatus === 'absent' ? '#ffffff' : 'var(--text-muted)',
                                  }}
                                >
                                  Absent
                                </button>
                              </div>
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

        {/* TAB 2: MY CLASSES & SUBJECTS */}
        {activeTab === 'subjects' && (
          <div key="subjects" className="tab-content-animate glass-card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>
              Assigned Classes & Subjects Directory
            </h2>
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {filteredClasses.map((c) => (
                <div key={c._id} style={{ background: 'var(--subcard-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-color)', marginBottom: '10px' }}>{c.name}</h3>

                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Subjects ({c.subjects?.length || 0})
                  </span>
                  {c.subjects && c.subjects.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {c.subjects.map((sub, idx) => (
                        <span key={idx} style={{ background: 'rgba(0, 243, 255, 0.12)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(0, 243, 255, 0.25)' }}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No subjects assigned</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CLASS REPORTS & CSV EXPORT */}
        {activeTab === 'reports' && (
          <div key="reports" className="tab-content-animate">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)' }}>
                Real-Time Class Attendance Analytics & Export
              </h2>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="btn-primary"
                  style={{ padding: '10px 18px', fontSize: '13px' }}
                >
                  Export Class Report to CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600' }}
                >
                  Print Report
                </button>
              </div>
            </div>

            {/* Real-time SVG Visual Charts */}
            <AnalyticsCharts analytics={analytics} />
          </div>
        )}

        {/* TAB 4: ASSIGNMENTS HUB */}
        {activeTab === 'assignments' && (
          <div key="assignments" className="tab-content-animate">
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '24px' }}>
              Assignments Hub
            </h2>

            {/* Create Assignment Form */}
            <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '20px' }}>
                Publish New Assignment
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Title</label>
                  <input className="input-field" placeholder="e.g. Chapter 3 — Algebra Problems" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Class</label>
                  <select className="input-field" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                    {classes.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Subject</label>
                  <select className="input-field" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                    <option value="">Select Subject</option>
                    {classSubjects.map((sub) => (<option key={sub._id} value={sub._id}>{sub.name}</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Due Date</label>
                  <input className="input-field" type="date" min={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Description / Instructions</label>
                <textarea className="input-field" rows={3} placeholder="Describe the task and expected deliverables..." style={{ resize: 'vertical' }} />
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn-primary" style={{ padding: '10px 24px' }}>Publish Assignment</button>
                <button style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600' }}>
                  Attach File
                </button>
              </div>
            </div>

            {/* Recent Assignments List */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '20px' }}>
                Recent Assignments — Submission Tracker
              </h3>
              {[
                { title: 'Algebra Problem Set', subject: 'Mathematics', dueDate: '2026-08-10', submitted: 14, total: 22, status: 'Active' },
                { title: 'Essay: Photosynthesis', subject: 'Biology', dueDate: '2026-08-08', submitted: 22, total: 22, status: 'Closed' },
                { title: 'Lab Report — Newton Laws', subject: 'Physics', dueDate: '2026-08-15', submitted: 5, total: 22, status: 'Active' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <p style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>{a.title}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{a.subject} · Due: {a.dueDate}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-color)' }}>{a.submitted}/{a.total}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Submitted</p>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: a.status === 'Active' ? 'rgba(43,212,158,0.15)' : 'rgba(255,255,255,0.08)', color: a.status === 'Active' ? '#2bd49e' : 'var(--text-muted)' }}>
                      {a.status}
                    </span>
                    <button style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(0,243,255,0.1)', color: 'var(--primary-color)', border: '1px solid rgba(0,243,255,0.2)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      Grade
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: GRADEBOOK & EXAMINATIONS */}
        {activeTab === 'gradebook' && (
          <div key="gradebook" className="tab-content-animate">
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '24px' }}>
              Gradebook &amp; Examinations
            </h2>

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              {[
                { label: 'Class Average', value: '74.2%', sub: 'All subjects combined', color: '#2bd49e' },
                { label: 'Highest Score', value: '98/100', sub: 'Alice Johnson — Math', color: '#00f3ff' },
                { label: 'Pending Marks', value: '3', sub: 'Subjects to enter', color: '#ffb703' },
                { label: 'Exams Scheduled', value: '2', sub: 'Next 7 days', color: '#9c27b0' },
              ].map((kpi, i) => (
                <div key={i} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '28px', fontWeight: '900', color: kpi.color }}>{kpi.value}</p>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', margin: '4px 0 2px' }}>{kpi.label}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Marks Entry Grid */}
            <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                  Direct Marks Entry Grid
                </h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <select className="input-field" style={{ padding: '8px 12px', fontSize: '13px' }}>
                    <option>Quiz — Week 3</option>
                    <option>Midterm — 2026-08</option>
                    <option>Final — 2026-10</option>
                  </select>
                  <select className="input-field" style={{ padding: '8px 12px', fontSize: '13px' }}>
                    {classSubjects.map((s) => (<option key={s._id}>{s.name}</option>))}
                    <option>Mathematics</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,243,255,0.06)' }}>
                      {['Roll No', 'Student Name', 'Quiz (20)', 'Midterm (40)', 'Final (40)', 'Total', 'Grade'].map((h) => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { roll: '001', name: 'Alice Johnson', quiz: 18, mid: 35, final: 37 },
                      { roll: '002', name: 'Bob Smith', quiz: 14, mid: 28, final: 30 },
                      { roll: '003', name: 'Carol White', quiz: 16, mid: 32, final: 36 },
                      { roll: '004', name: 'David Lee', quiz: 10, mid: 20, final: 24 },
                    ].map((s, i) => {
                      const total = s.quiz + s.mid + s.final;
                      const grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : 'F';
                      const gradeColor = total >= 70 ? '#2bd49e' : total >= 60 ? '#ffb703' : '#ff4d4d';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>{s.roll}</td>
                          <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{s.name}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <input type="number" defaultValue={s.quiz} max={20} min={0} style={{ width: '60px', padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-main)', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <input type="number" defaultValue={s.mid} max={40} min={0} style={{ width: '60px', padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-main)', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <input type="number" defaultValue={s.final} max={40} min={0} style={{ width: '60px', padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-main)', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{total}/100</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', background: `${gradeColor}22`, color: gradeColor }}>{grade}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button className="btn-primary" style={{ padding: '10px 24px' }}>Save Marks</button>
                <button style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600' }}>
                  Export Gradebook CSV
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
