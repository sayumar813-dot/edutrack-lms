'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/services/apiClient';
import Sidebar from '@/components/Sidebar';
import AnalyticsCharts from '@/components/AnalyticsCharts';

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
        new Date(r.date).toISOString().split('T')[0],
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

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="app-main">
        
        {/* Top Header Bar */}
        <div className="page-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
              Teacher Portal
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Attendance Marking, Real-Time Class Analytics & Reports
            </p>
          </div>

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

        {message && (
          <div style={{ background: 'rgba(43, 212, 158, 0.15)', color: 'var(--secondary-color)', padding: '14px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(43, 212, 158, 0.3)' }}>
            {message}
          </div>
        )}

        {/* TAB 1: MARK ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div>
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

              {students.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No students found in the selected class.</p>
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
                      {students.map((st) => {
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
          <div className="glass-card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>
              Assigned Classes & Subjects Directory
            </h2>
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {classes.map((c) => (
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
          <div>
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

      </main>
    </div>
  );
}
