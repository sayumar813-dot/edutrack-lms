'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/services/apiClient';
import Sidebar from '@/components/Sidebar';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', phone: '', password: '' });
  const [newStudent, setNewStudent] = useState({ name: '', email: '', rollNo: '', classId: '', guardianPhone: '', password: '' });
  const [newClass, setNewClass] = useState({ name: '', teacherId: '' });
  const [newSubject, setNewSubject] = useState({ name: '', classId: '' });

  // Class Edit state
  const [editingClass, setEditingClass] = useState(null); // { id, name, teacherId }

  // Modal & Alert states
  const [createdAccount, setCreatedAccount] = useState(null); // { role, name, email, tempPassword }
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        loadData();
      }
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tData, sData, cData, subData] = await Promise.all([
        apiClient('/api/admin/teachers'),
        apiClient('/api/admin/students'),
        apiClient('/api/admin/classes'),
        apiClient('/api/admin/subjects'),
      ]);

      setTeachers(tData.teachers || []);
      setStudents(sData.students || []);
      setClasses(cData.classes || []);
      setSubjects(subData.subjects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await apiClient('/api/admin/teachers', {
        method: 'POST',
        body: JSON.stringify(newTeacher),
      });

      setCreatedAccount({
        role: 'Teacher',
        name: newTeacher.name,
        email: newTeacher.email,
        tempPassword: res.tempPassword,
      });

      setNewTeacher({ name: '', email: '', phone: '', password: '' });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTeacher = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove teacher ${name}? This will revoke their access immediately.`)) {
      return;
    }
    setError('');
    setMessage('');
    try {
      await apiClient(`/api/admin/teachers?id=${id}`, { method: 'DELETE' });
      setMessage(`Teacher ${name} account removed. Immediate access revoked.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await apiClient('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify(newStudent),
      });

      setCreatedAccount({
        role: 'Student',
        name: newStudent.name,
        email: newStudent.email,
        tempPassword: res.tempPassword,
      });

      setNewStudent({ name: '', email: '', rollNo: '', classId: '', guardianPhone: '', password: '' });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove student ${name}? This will revoke their access immediately.`)) {
      return;
    }
    setError('');
    setMessage('');
    try {
      await apiClient(`/api/admin/students?id=${id}`, { method: 'DELETE' });
      setMessage(`Student ${name} account removed. Immediate access revoked.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await apiClient('/api/admin/classes', {
        method: 'POST',
        body: JSON.stringify(newClass),
      });
      setNewClass({ name: '', teacherId: '' });
      setMessage('Class created successfully!');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await apiClient('/api/admin/classes', {
        method: 'PUT',
        body: JSON.stringify(editingClass),
      });
      setEditingClass(null);
      setMessage('Class updated successfully!');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteClass = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete class ${name}? This will unassign its subjects.`)) {
      return;
    }
    setError('');
    setMessage('');
    try {
      await apiClient(`/api/admin/classes?id=${id}`, { method: 'DELETE' });
      setMessage(`Class ${name} deleted successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await apiClient('/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify(newSubject),
      });
      setNewSubject({ name: '', classId: '' });
      setMessage('Subject added successfully!');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading Admin Portal...</p>
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
              Admin Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Academy Management & System Control
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

        {/* Account Created Password Alert Banner */}
        {createdAccount && (
          <div style={{ background: 'rgba(43, 212, 158, 0.15)', border: '1px solid rgba(43, 212, 158, 0.4)', borderRadius: '16px', padding: '20px', marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--secondary-color)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              🎉 {createdAccount.role} Account Created Successfully!
            </h3>
            <p style={{ color: 'var(--text-main)', fontSize: '14px', marginBottom: '12px' }}>
              Account for <strong>{createdAccount.name}</strong> ({createdAccount.email}) is active and ready to log in immediately.
            </p>
            <div style={{ background: 'var(--card-bg)', padding: '12px 16px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Account Password:</span>
              <strong style={{ fontSize: '18px', color: 'var(--primary-color)', fontFamily: 'monospace' }}>{createdAccount.tempPassword}</strong>
            </div>
            <button
              onClick={() => setCreatedAccount(null)}
              style={{ display: 'block', marginTop: '14px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
            >
              Dismiss Banner
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '36px', color: 'var(--primary-color)', fontWeight: '700' }}>{teachers.length}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Total Teachers</p>
              </div>
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '36px', color: 'var(--secondary-color)', fontWeight: '700' }}>{students.length}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Total Students</p>
              </div>
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '36px', color: '#ffb703', fontWeight: '700' }}>{classes.length}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Active Classes</p>
              </div>
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '36px', color: '#ff4d6d', fontWeight: '700' }}>{subjects.length}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Total Subjects</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE TEACHERS */}
        {activeTab === 'teachers' && (
          <div>
            <div className="glass-card" style={{ padding: '28px', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Add New Teacher</h2>
              <form onSubmit={handleCreateTeacher} className="form-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Teacher Full Name"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  className="input-field"
                  placeholder="Teacher Email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Phone Number (Optional)"
                  value={newTeacher.phone}
                  onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Custom Password (Optional)"
                  value={newTeacher.password}
                  onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                />
                <button type="submit" className="btn-primary" style={{ height: '48px' }}>
                  + Add Teacher
                </button>
              </form>
            </div>

            <div className="glass-card" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Teacher Directory ({teachers.length})</h2>
              {teachers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No teachers registered yet.</p>
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '14px' }}>
                        <th style={{ padding: '12px' }}>Name</th>
                        <th style={{ padding: '12px' }}>Email</th>
                        <th style={{ padding: '12px' }}>Phone</th>
                        <th style={{ padding: '12px' }}>Joined Date</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((t) => (
                        <tr key={t._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '14px 12px', fontWeight: '600' }}>{t.userId?.name || 'N/A'}</td>
                          <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>{t.userId?.email || 'N/A'}</td>
                          <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>{t.phone || 'N/A'}</td>
                          <td style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            {t.userId?.createdAt ? new Date(t.userId.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteTeacher(t._id, t.userId?.name)}
                              style={{
                                background: 'rgba(249, 76, 102, 0.15)',
                                border: '1px solid rgba(249, 76, 102, 0.4)',
                                color: '#ff4d4d',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px',
                              }}
                            >
                              🗑️ Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MANAGE STUDENTS */}
        {activeTab === 'students' && (
          <div>
            <div className="glass-card" style={{ padding: '28px', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Add New Student</h2>
              <form onSubmit={handleCreateStudent} className="form-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Student Name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  className="input-field"
                  placeholder="Student Email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Roll No"
                  value={newStudent.rollNo}
                  onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                  required
                />
                <select
                  className="input-field"
                  value={newStudent.classId}
                  onChange={(e) => setNewStudent({ ...newStudent, classId: e.target.value })}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Guardian Phone"
                  value={newStudent.guardianPhone}
                  onChange={(e) => setNewStudent({ ...newStudent, guardianPhone: e.target.value })}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Custom Password (Optional)"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                />
                <button type="submit" className="btn-primary" style={{ height: '48px' }}>
                  + Add Student
                </button>
              </form>
            </div>

            <div className="glass-card" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Student Roster ({students.length})</h2>
              {students.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No students enrolled yet.</p>
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '14px' }}>
                        <th style={{ padding: '12px' }}>Roll No</th>
                        <th style={{ padding: '12px' }}>Name</th>
                        <th style={{ padding: '12px' }}>Email</th>
                        <th style={{ padding: '12px' }}>Class</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '14px 12px', fontWeight: '700', color: 'var(--primary-color)' }}>{s.rollNo}</td>
                          <td style={{ padding: '14px 12px', fontWeight: '600' }}>{s.userId?.name || 'N/A'}</td>
                          <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>{s.userId?.email || 'N/A'}</td>
                          <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>{s.classId?.name || 'N/A'}</td>
                          <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteStudent(s._id, s.userId?.name)}
                              style={{
                                background: 'rgba(249, 76, 102, 0.15)',
                                border: '1px solid rgba(249, 76, 102, 0.4)',
                                color: '#ff4d4d',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px',
                              }}
                            >
                              🗑️ Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MANAGE CLASSES */}
        {activeTab === 'classes' && (
          <div>
            {/* Create or Edit Class Form */}
            <div className="glass-card" style={{ padding: '28px', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>
                {editingClass ? '✏️ Edit Class' : 'Create Class'}
              </h2>
              <form onSubmit={editingClass ? handleUpdateClass : handleCreateClass} className="form-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Class Name (e.g. Grade 10-A)"
                  value={editingClass ? editingClass.name : newClass.name}
                  onChange={(e) => editingClass ? setEditingClass({ ...editingClass, name: e.target.value }) : setNewClass({ ...newClass, name: e.target.value })}
                  required
                />
                <select
                  className="input-field"
                  value={editingClass ? (editingClass.teacherId || '') : newClass.teacherId}
                  onChange={(e) => editingClass ? setEditingClass({ ...editingClass, teacherId: e.target.value }) : setNewClass({ ...newClass, teacherId: e.target.value })}
                >
                  <option value="">Assign Class Teacher (Optional)</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.userId?.name || 'Teacher'}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-primary" style={{ height: '48px', flex: 1 }}>
                    {editingClass ? '💾 Save Changes' : '+ Create Class'}
                  </button>
                  {editingClass && (
                    <button
                      type="button"
                      onClick={() => setEditingClass(null)}
                      style={{ height: '48px', padding: '0 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Class Directory Cards with Subjects Pills */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Class Directory ({classes.length})</h2>
              {classes.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No classes created yet.</p>
              ) : (
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {classes.map((c) => (
                    <div key={c._id} style={{ background: 'var(--input-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-color)' }}>{c.name}</h3>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setEditingClass({ id: c._id, name: c.name, teacherId: c.teacherId?._id || c.teacherId || '' })}
                              style={{ background: 'rgba(0, 243, 255, 0.15)', border: '1px solid rgba(0, 243, 255, 0.3)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClass(c._id, c.name)}
                              style={{ background: 'rgba(249, 76, 102, 0.15)', border: '1px solid rgba(249, 76, 102, 0.3)', color: '#ff4d4d', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '14px' }}>
                          👨‍🏫 <strong>Teacher:</strong> {c.teacherId?.userId?.name || 'Unassigned'}
                        </p>

                        {/* Multiple Subjects Pills */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                            Class Subjects ({c.subjects?.length || 0})
                          </span>
                          {c.subjects && c.subjects.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {c.subjects.map((sub, idx) => (
                                <span key={idx} style={{ background: 'rgba(0, 243, 255, 0.12)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(0, 243, 255, 0.25)' }}>
                                  📚 {sub}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', italic: 'true' }}>No subjects added yet</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MANAGE SUBJECTS */}
        {activeTab === 'subjects' && (
          <div>
            <div className="glass-card" style={{ padding: '28px', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Create Subject</h2>
              <form onSubmit={handleCreateSubject} className="form-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Subject Name (e.g. Mathematics)"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  required
                />
                <select
                  className="input-field"
                  value={newSubject.classId}
                  onChange={(e) => setNewSubject({ ...newSubject, classId: e.target.value })}
                  required
                >
                  <option value="">Assign to Class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <button type="submit" className="btn-primary" style={{ height: '48px' }}>
                  + Add Subject
                </button>
              </form>
            </div>

            <div className="glass-card" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Subject Directory ({subjects.length})</h2>
              {subjects.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No subjects added yet.</p>
              ) : (
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  {subjects.map((sub) => (
                    <div key={sub._id} style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--secondary-color)' }}>{sub.name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
                        Class: {sub.classId?.name || 'Unassigned'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
