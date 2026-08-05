'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/services/apiClient';
import Sidebar from '@/components/Sidebar';

export default function TeacherPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('attendance');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceSheet, setAttendanceSheet] = useState({}); // { studentId: 'present'|'absent'|'late' }

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        router.push('/');
      } else {
        loadInitialData();
      }
    }
  }, [user, authLoading, router]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [cData, subData, sData] = await Promise.all([
        apiClient('/api/admin/classes'),
        apiClient('/api/admin/subjects'),
        apiClient('/api/admin/students'),
      ]);

      const fetchedClasses = cData.classes || [];
      const fetchedSubjects = subData.subjects || [];

      setClasses(fetchedClasses);
      setSubjects(fetchedSubjects);
      setStudents(sData.students || []);

      if (fetchedClasses.length > 0) {
        setSelectedClass(fetchedClasses[0]._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const classStudents = students.filter(s => {
    if (!selectedClass) return false;
    const sClassId = s.classId?._id ? s.classId._id.toString() : s.classId?.toString();
    return sClassId === selectedClass.toString();
  });

  const filteredSubjects = subjects.filter(sub => {
    if (!selectedClass) return false;
    const subClassId = sub.classId?._id ? sub.classId._id.toString() : sub.classId?.toString();
    return subClassId === selectedClass.toString();
  });

  const handleStatusChange = (studentId, status) => {
    setAttendanceSheet(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!selectedClass || !selectedSubject) {
      setError('Please select both a class and a subject.');
      return;
    }

    if (classStudents.length === 0) {
      setError('No enrolled students found in this class.');
      return;
    }

    const records = classStudents.map(student => ({
      studentId: student._id,
      status: attendanceSheet[student._id] || 'present',
    }));

    setSubmitting(true);
    try {
      await apiClient('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          classId: selectedClass,
          subjectId: selectedSubject,
          date: attendanceDate,
          records,
        }),
      });

      setMessage(`Attendance saved successfully for ${attendanceDate}!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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

        {message && (
          <div style={{ background: 'rgba(43, 212, 158, 0.15)', color: 'var(--secondary-color)', padding: '14px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(43, 212, 158, 0.3)' }}>
            {message}
          </div>
        )}

        {/* TAB 1: MARK ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="glass-card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Mark Today's Attendance</h2>

            <form onSubmit={handleSaveAttendance}>
              <div className="form-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Select Assigned Class</label>
                  <select
                    className="input-field"
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setSelectedSubject('');
                    }}
                    required
                  >
                    <option value="">-- Choose Class --</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Select Subject</label>
                  <select
                    className="input-field"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={!selectedClass || filteredSubjects.length === 0}
                    required
                  >
                    <option value="">
                      {filteredSubjects.length === 0 ? '-- No Subjects Found for Class --' : '-- Choose Subject --'}
                    </option>
                    {filteredSubjects.map((sub) => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Attendance Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {selectedClass && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: 'var(--text-main)' }}>
                    Student Roster ({classStudents.length})
                  </h3>

                  {classStudents.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px', background: 'var(--input-bg)', borderRadius: '10px' }}>
                      No students currently enrolled in this class.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                      {classStudents.map((s) => {
                        const currentStatus = attendanceSheet[s._id] || 'present';
                        return (
                          <div
                            key={s._id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: 'var(--input-bg)',
                              padding: '12px 18px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{s.userId?.name || 'Student'}</strong>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>Roll #{s.rollNo}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              {['present', 'absent', 'late'].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(s._id, st)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    textTransform: 'capitalize',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    background:
                                      currentStatus === st
                                        ? st === 'present' ? '#2bd49e' : st === 'absent' ? '#ff4d4d' : '#ffb703'
                                        : 'rgba(255,255,255,0.08)',
                                    color: currentStatus === st ? '#ffffff' : 'var(--text-muted)',
                                    transition: 'var(--transition)',
                                  }}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button type="submit" className="btn-primary" disabled={submitting || classStudents.length === 0}>
                    {submitting ? 'Saving...' : '💾 Save Attendance Sheet'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 2: MY CLASSES & SUBJECTS */}
        {activeTab === 'subjects' && (
          <div className="glass-card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>
              My Assigned Classes & Subjects ({classes.length})
            </h2>

            {classes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>You are not assigned to any classes yet.</p>
            ) : (
              <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {classes.map((c) => {
                  const cSubs = subjects.filter(sub => {
                    const subClassId = sub.classId?._id ? sub.classId._id.toString() : sub.classId?.toString();
                    return subClassId === c._id.toString();
                  });

                  return (
                    <div key={c._id} style={{ background: 'var(--input-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-color)', marginBottom: '10px' }}>{c.name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '14px' }}>
                        Enrolled Students: <strong>{students.filter(s => (s.classId?._id || s.classId)?.toString() === c._id.toString()).length}</strong>
                      </p>

                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                          Class Subjects ({cSubs.length})
                        </span>
                        {cSubs.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {cSubs.map((sub) => (
                              <span key={sub._id} style={{ background: 'rgba(0, 243, 255, 0.12)', color: 'var(--primary-color)', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(0, 243, 255, 0.25)' }}>
                                📚 {sub.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No subjects added to this class yet.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
