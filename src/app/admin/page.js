'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/services/apiClient';
import Sidebar from '@/components/Sidebar';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import NotificationBell from '@/components/NotificationBell';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [reportRecords, setReportRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Report Filter states
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form states
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', phone: '', password: '' });
  const [newStudent, setNewStudent] = useState({ name: '', email: '', rollNo: '', classId: '', guardianPhone: '', password: '' });
  const [newClass, setNewClass] = useState({ name: '', teacherId: '' });
  const [newSubject, setNewSubject] = useState({ name: '', classId: '', teacherId: '' });
  const [assigningTeacher, setAssigningTeacher] = useState({}); // subjectId → teacherId being set

  // Fee Invoice Form & Ledger State
  const [newInvoice, setNewInvoice] = useState({ studentId: '', title: '', amount: '', dueDate: '' });
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState('');
  const [invoiceError, setInvoiceError] = useState('');
  const [feeLedger, setFeeLedger] = useState([]);
  const [feeStats, setFeeStats] = useState({ totalCollected: 0, totalOutstanding: 0, pendingCount: 0, paidCount: 0, totalInvoices: 0 });
  const [payingFee, setPayingFee] = useState(null); // feeId being paid
  const [payAmount, setPayAmount] = useState('');

  // Audit Logs State & Filters
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState('');
  const [auditDateFilter, setAuditDateFilter] = useState('');

  // Timetable State
  const [activeTimetableClass, setActiveTimetableClass] = useState(null);
  const [classTimetables, setClassTimetables] = useState({});
  const [newSlot, setNewSlot] = useState({ day: 'Monday', time: '08:30 AM - 09:30 AM', subject: '', teacher: '', room: '' });

  // Class Edit state
  const [editingClass, setEditingClass] = useState(null);

  // Modal & Alert states
  const [createdAccount, setCreatedAccount] = useState(null);
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
      const [tData, sData, cData, subData, summaryRes] = await Promise.all([
        apiClient('/api/admin/teachers'),
        apiClient('/api/admin/students'),
        apiClient('/api/admin/classes'),
        apiClient('/api/admin/subjects'),
        apiClient('/api/attendance/summary'),
      ]);

      setTeachers(tData.teachers || []);
      setStudents(sData.students || []);
      setClasses(cData.classes || []);
      setSubjects(subData.subjects || []);
      setAnalytics(summaryRes.analytics || null);
      setReportRecords(summaryRes.records || []);

      try {
        const auditRes = await apiClient('/api/v1/audit-logs');
        if (auditRes.success && auditRes.logs) setAuditLogs(auditRes.logs);
      } catch (aErr) {}

      try {
        const feeRes = await apiClient('/api/admin/fees');
        if (feeRes.success && feeRes.fees) {
          setFeeLedger(feeRes.fees);
          if (feeRes.stats) setFeeStats(feeRes.stats);
        }
      } catch (fErr) { console.warn('Fees load error:', fErr.message); }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyReportFilter = async (e) => {
    e?.preventDefault();
    try {
      setLoading(true);
      let queryUrl = '/api/attendance/summary?';
      if (filterClass) queryUrl += `classId=${filterClass}&`;
      if (filterSubject) queryUrl += `subjectId=${filterSubject}&`;
      if (startDate) queryUrl += `startDate=${startDate}&`;
      if (endDate) queryUrl += `endDate=${endDate}&`;

      const summaryRes = await apiClient(queryUrl);
      setAnalytics(summaryRes.analytics || null);
      setReportRecords(summaryRes.records || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (e) => {
    e?.preventDefault();
    setInvoiceError('');
    setInvoiceSuccess('');

    if (!newInvoice.studentId) return setInvoiceError('Please select a student.');
    if (!newInvoice.title.trim()) return setInvoiceError('Please enter an invoice title.');
    if (!newInvoice.amount || Number(newInvoice.amount) <= 0) return setInvoiceError('Please enter a valid amount.');
    if (!newInvoice.dueDate) return setInvoiceError('Please select a due date.');

    try {
      setSubmittingInvoice(true);
      const stObj = students.find((s) => (s._id || s.id) === newInvoice.studentId);
      const studentName = stObj?.userId?.name || stObj?.name || 'Student';

      await apiClient('/api/admin/fees', {
        method: 'POST',
        body: JSON.stringify({
          studentId: newInvoice.studentId,   // this is student_profiles.id
          title: newInvoice.title.trim(),
          amount: Number(newInvoice.amount),
          dueDate: newInvoice.dueDate,
        }),
      });

      setInvoiceSuccess(`✅ Invoice "${newInvoice.title.trim()}" issued to ${studentName}!`);
      setNewInvoice({ studentId: '', title: '', amount: '', dueDate: '' });
      // Reload ledger with live data
      const feeRes = await apiClient('/api/admin/fees');
      if (feeRes.success && feeRes.fees) {
        setFeeLedger(feeRes.fees);
        if (feeRes.stats) setFeeStats(feeRes.stats);
      }
    } catch (err) {
      setInvoiceError(err.message || 'Failed to generate fee invoice.');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleMarkFeePaid = async (feeId, outstandingAmount) => {
    const amt = payAmount || outstandingAmount;
    if (!amt || Number(amt) <= 0) return;
    try {
      await apiClient('/api/admin/fees', {
        method: 'PUT',
        body: JSON.stringify({ id: feeId, paymentAmount: Number(amt) }),
      });
      setPayingFee(null);
      setPayAmount('');
      const feeRes = await apiClient('/api/admin/fees');
      if (feeRes.success && feeRes.fees) {
        setFeeLedger(feeRes.fees);
        if (feeRes.stats) setFeeStats(feeRes.stats);
      }
    } catch (err) {
      setInvoiceError(err.message || 'Failed to record payment.');
    }
  };

  const handleDeleteFee = async (feeId) => {
    if (!window.confirm('Delete this fee record?')) return;
    try {
      await apiClient(`/api/admin/fees?id=${feeId}`, { method: 'DELETE' });
      const feeRes = await apiClient('/api/admin/fees');
      if (feeRes.success && feeRes.fees) {
        setFeeLedger(feeRes.fees);
        if (feeRes.stats) setFeeStats(feeRes.stats);
      }
    } catch (err) {
      setInvoiceError(err.message || 'Failed to delete fee record.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    if (typeof dateStr === 'string') {
      return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    }
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch (e) {
      return String(dateStr);
    }
  };

  const handleExportCSV = () => {
    if (!reportRecords || reportRecords.length === 0) {
      alert('No attendance report records available to export.');
      return;
    }

    const headers = ['Date', 'Student Name', 'Roll No', 'Class', 'Subject', 'Status'];
    const rows = reportRecords.map(r => [
      formatDate(r.date),
      `"${r.studentId?.userId?.name || 'N/A'}"`,
      `"${r.studentId?.rollNo || 'N/A'}"`,
      `"${r.classId?.name || 'N/A'}"`,
      `"${r.subjectId?.name || 'N/A'}"`,
      r.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
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
      setNewSubject({ name: '', classId: '', teacherId: '' });
      setMessage('Subject added successfully!');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignTeacher = async (subjectId, teacherId) => {
    try {
      await apiClient('/api/admin/subjects', {
        method: 'PUT',
        body: JSON.stringify({ id: subjectId, teacherId }),
      });
      setMessage('Teacher assigned successfully!');
      setAssigningTeacher({});
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const q = searchQuery.toLowerCase().trim();
  const filteredTeachers = q ? teachers.filter(t => (t.userId?.name || t.name || '').toLowerCase().includes(q) || (t.userId?.email || t.email || '').toLowerCase().includes(q)) : teachers;
  const filteredStudents = q ? students.filter(s => (s.userId?.name || s.name || '').toLowerCase().includes(q) || (s.rollNo || '').toLowerCase().includes(q)) : students;
  const filteredClasses = q ? classes.filter(c => (c.name || '').toLowerCase().includes(q)) : classes;
  const filteredSubjects = q ? subjects.filter(s => (s.name || '').toLowerCase().includes(q)) : subjects;
  const filteredFeeLedger = q
    ? feeLedger.filter(f =>
        (f.student || '').toLowerCase().includes(q) ||
        (f.invoice || '').toLowerCase().includes(q) ||
        (f.rollNo || '').toLowerCase().includes(q) ||
        (f.studentEmail || '').toLowerCase().includes(q)
      )
    : feeLedger;
  
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesQuery = !q || log.user.toLowerCase().includes(q) || log.action.toLowerCase().includes(q) || log.resource.toLowerCase().includes(q) || log.ip.includes(q);
    const matchesAction = !auditActionFilter || log.action.toLowerCase().includes(auditActionFilter.toLowerCase());
    const matchesRole = !auditRoleFilter || log.role.toLowerCase() === auditRoleFilter.toLowerCase();
    const matchesDate = !auditDateFilter || log.ts.startsWith(auditDateFilter);
    return matchesQuery && matchesAction && matchesRole && matchesDate;
  });

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading Admin Portal & Real-time Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="app-main">
        
        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', width: '340px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            <input
              className="input-field"
              placeholder="Search teachers, students, classes, fees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px', paddingRight: searchQuery ? '36px' : '14px', borderRadius: '20px', fontSize: '14px' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}
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
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>{user?.name || 'Administrator'}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Super Admin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Header with Export Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.8px', marginBottom: '6px' }}>
              Overview
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
              Institution performance metrics and recent activities.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '12px' }}
          >
            📥 Export Report
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
              {createdAccount.role} Account Created Successfully!
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

        {/* TAB 1: OVERVIEW DASHBOARD WITH REAL-TIME GRAPHS */}
        {activeTab === 'dashboard' && (
          <div key="dashboard" className="tab-content-animate">
            
            {/* Real-time Summary Cards */}
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="glass-card" style={{ padding: '22px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>TOTAL ENROLLMENT</span>
                  <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(122, 28, 40, 0.08)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>+</span>
                </div>
                <h3 style={{ fontSize: '32px', color: 'var(--text-main)', fontWeight: '900', margin: '0 0 6px 0' }}>{students.length.toLocaleString()}</h3>
                <p style={{ color: 'var(--primary-color)', fontSize: '12px', fontWeight: '700', margin: 0 }}>Active Enrolled Students</p>
              </div>

              <div className="glass-card" style={{ padding: '22px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>ACTIVE FACULTY</span>
                  <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(43, 212, 158, 0.1)', color: '#2bd49e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✓</span>
                </div>
                <h3 style={{ fontSize: '32px', color: 'var(--text-main)', fontWeight: '900', margin: '0 0 6px 0' }}>{teachers.length}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Assigned Instructors</p>
              </div>

              <div className="glass-card" style={{ padding: '22px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>TERM REVENUE</span>
                  <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 243, 255, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>₨</span>
                </div>
                <h3 style={{ fontSize: '32px', color: 'var(--text-main)', fontWeight: '900', margin: '0 0 6px 0' }}>
                  ₨ {feeLedger.reduce((sum, f) => sum + (parseInt((f.amount || '').replace(/[^0-9]/g, '')) || 0), 0).toLocaleString()}
                </h3>
                <p style={{ color: '#2bd49e', fontSize: '12px', fontWeight: '700', margin: 0 }}>Total Invoiced</p>
              </div>
            </div>

            {/* Layout with Charts + Recent Activity Side Column */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div style={{ flex: '1', minWidth: 0 }}>
                <AnalyticsCharts analytics={analytics} />
              </div>

              {/* Recent Activity Card */}
              <div className="glass-card" style={{ padding: '24px', height: 'fit-content' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Recent Activity</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {auditLogs.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', margin: '16px 0' }}>
                      No recent system activity recorded yet.
                    </p>
                  ) : (
                    auditLogs.slice(0, 5).map((act, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--subcard-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: 'var(--primary-color)', flexShrink: 0 }}>
                          {act.action?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                            <strong>{act.user}</strong> {act.action} {act.resource}
                          </p>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{act.ts}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: REPORTS & ANALYTICS EXPORT */}
        {activeTab === 'reports' && (
          <div key="reports" className="tab-content-animate">
            <div className="glass-card" style={{ padding: '28px', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>
                Filter & Generate Attendance Reports
              </h2>

              <div className="form-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Class Filter</label>
                  <select
                    className="input-field"
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Subject Filter</label>
                  <select
                    className="input-field"
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                  >
                    <option value="">All Subjects</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Start Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>End Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleApplyReportFilter}
                  className="btn-primary"
                  style={{ height: '44px', padding: '0 24px' }}
                >
                  Filter Report
                </button>
                
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="btn-primary"
                  style={{ height: '44px', padding: '0 24px', background: 'linear-gradient(135deg, #2bd49e 0%, #0d9488 100%)' }}
                >
                  Export Report to CSV
                </button>

                <button
                  type="button"
                  onClick={handlePrintReport}
                  style={{ height: '44px', padding: '0 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600' }}
                >
                  Print Official Report
                </button>
              </div>
            </div>

            {/* Real-time Visual Charts inside Report View */}
            <AnalyticsCharts analytics={analytics} />

            {/* Reports Data Log Table */}
            <div className="glass-card" style={{ padding: '28px' }}>
              {reportRecords.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No attendance records match the selected filters.</p>
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '14px' }}>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px' }}>Student</th>
                        <th style={{ padding: '12px' }}>Roll No</th>
                        <th style={{ padding: '12px' }}>Class</th>
                        <th style={{ padding: '12px' }}>Subject</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRecords.map((r) => {
                        const statusColor = r.status === 'present' ? '#2bd49e' : r.status === 'absent' ? '#ff4d4d' : '#ffb703';
                        return (
                          <tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '14px 12px', fontWeight: '600' }}>{formatDate(r.date)}</td>
                            <td style={{ padding: '14px 12px', fontWeight: '600', color: 'var(--text-main)' }}>{r.studentId?.userId?.name || 'Student'}</td>
                            <td style={{ padding: '14px 12px', color: 'var(--primary-color)', fontWeight: '700' }}>{r.studentId?.rollNo || 'N/A'}</td>
                            <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>{r.classId?.name || 'N/A'}</td>
                            <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>{r.subjectId?.name || 'N/A'}</td>
                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                              <span style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40`, padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>
                                {r.status}
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

        {/* TAB 3: MANAGE TEACHERS */}
        {activeTab === 'teachers' && (
          <div key="teachers" className="tab-content-animate">
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
                      {filteredTeachers.map((t) => (
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
                              Remove
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

        {/* TAB 4: MANAGE STUDENTS */}
        {activeTab === 'students' && (
          <div key="students" className="tab-content-animate">
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
                      {filteredStudents.map((s) => (
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
                              Remove
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

        {/* TAB 5: MANAGE CLASSES */}
        {activeTab === 'classes' && (
          <div key="classes" className="tab-content-animate">
            {/* Create or Edit Class Form */}
            <div className="glass-card" style={{ padding: '28px', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>
                {editingClass ? 'Edit Class' : 'Create Class'}
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
                    {editingClass ? 'Save Changes' : '+ Create Class'}
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
                  {filteredClasses.map((c) => (
                    <div key={c._id} style={{ background: 'var(--input-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-color)' }}>{c.name}</h3>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setActiveTimetableClass(c)}
                              style={{ background: 'rgba(43, 212, 158, 0.15)', border: '1px solid rgba(43, 212, 158, 0.3)', color: '#2bd49e', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                            >
                              Timetable
                            </button>
                            <button
                              onClick={() => setEditingClass({ id: c._id, name: c.name, teacherId: c.teacherId?._id || c.teacherId || '' })}
                              style={{ background: 'rgba(0, 243, 255, 0.15)', border: '1px solid rgba(0, 243, 255, 0.3)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClass(c._id, c.name)}
                              style={{ background: 'rgba(249, 76, 102, 0.15)', border: '1px solid rgba(249, 76, 102, 0.3)', color: '#ff4d4d', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '14px' }}>
                          <strong>Teacher:</strong> {c.teacherId?.userId?.name || 'Unassigned'}
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
                                  {sub}
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

        {/* TAB 6: MANAGE SUBJECTS */}
        {activeTab === 'subjects' && (
          <div key="subjects" className="tab-content-animate">
            <div className="glass-card" style={{ padding: '28px', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Create Subject</h2>
              <form onSubmit={handleCreateSubject} className="form-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
                  <option value="">— Assign to Class —</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <select
                  className="input-field"
                  value={newSubject.teacherId}
                  onChange={(e) => setNewSubject({ ...newSubject, teacherId: e.target.value })}
                >
                  <option value="">— Assign Teacher (optional) —</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.userId?.name || 'Unnamed Teacher'}</option>
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
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {filteredSubjects.map((sub) => {
                    const isAssigning = assigningTeacher[sub._id] !== undefined;
                    const currentTeacher = teachers.find(t => t._id === (sub.teacherId?._id || sub.teacherId));
                    return (
                      <div key={sub._id} style={{ background: 'var(--subcard-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--secondary-color)' }}>{sub.name}</h3>

                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                          Class: {sub.classId?.name || 'Unassigned'}
                        </p>
                        <p style={{ fontSize: '12px', marginTop: '6px', color: currentTeacher ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                          Teacher: {currentTeacher ? (currentTeacher.userId?.name || 'Teacher') : 'No teacher assigned'}
                        </p>

                        {/* Inline teacher reassign */}
                        {isAssigning ? (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <select
                              className="input-field"
                              style={{ fontSize: '12px', padding: '6px 10px', flex: 1 }}
                              value={assigningTeacher[sub._id]}
                              onChange={(e) => setAssigningTeacher({ ...assigningTeacher, [sub._id]: e.target.value })}
                            >
                              <option value="">— Unassign —</option>
                              {teachers.map((t) => (
                                <option key={t._id} value={t._id}>{t.userId?.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssignTeacher(sub._id, assigningTeacher[sub._id])}
                              style={{ background: '#2bd49e', color: '#000', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                            >Save</button>
                            <button
                              onClick={() => setAssigningTeacher(prev => { const n={...prev}; delete n[sub._id]; return n; })}
                              style={{ background: 'var(--border-color)', color: 'var(--text-muted)', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
                            >✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssigningTeacher({ ...assigningTeacher, [sub._id]: sub.teacherId?._id || sub.teacherId || '' })}
                            style={{ marginTop: '10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '5px 12px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', width: '100%' }}
                          >
                            {currentTeacher ? 'Change Teacher' : 'Assign Teacher'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: ACADEMIC SESSIONS */}
        {activeTab === 'sessions' && (
          <div key="sessions" className="tab-content-animate">
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '24px' }}>
              📅 Academic Session Management
            </h2>

            {/* Create Session */}
            <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '20px' }}>
                Create New Academic Session
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Session Name</label>
                  <input className="input-field" placeholder="e.g. 2026 – 2027" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Start Date</label>
                  <input className="input-field" type="date" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>End Date</label>
                  <input className="input-field" type="date" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Status</label>
                  <select className="input-field">
                    <option>Active</option>
                    <option>Upcoming</option>
                    <option>Archived</option>
                  </select>
                </div>
              </div>
              <button className="btn-primary" style={{ marginTop: '20px', padding: '10px 24px' }}>
                Create Session
              </button>
            </div>

            {/* Sessions List */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '20px' }}>
                All Academic Sessions
              </h3>
              {[
                { name: '2026 – 2027', start: 'Aug 1, 2026', end: 'Jul 31, 2027', status: 'Active', students: 342 },
                { name: '2025 – 2026', start: 'Aug 1, 2025', end: 'Jul 31, 2026', status: 'Archived', students: 318 },
                { name: '2024 – 2025', start: 'Aug 1, 2024', end: 'Jul 31, 2025', status: 'Archived', students: 295 },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.status === 'Active' ? 'rgba(43,212,158,0.3)' : 'var(--border-color)'}`, marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>{s.name}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{s.start} → {s.end} · {s.students} students enrolled</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: s.status === 'Active' ? 'rgba(43,212,158,0.15)' : 'rgba(255,255,255,0.08)', color: s.status === 'Active' ? '#2bd49e' : 'var(--text-muted)' }}>
                      {s.status}
                    </span>
                    {s.status !== 'Active' && (
                      <button style={{ padding: '7px 14px', borderRadius: '10px', background: 'rgba(0,243,255,0.1)', color: 'var(--primary-color)', border: '1px solid rgba(0,243,255,0.2)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        Set as Active
                      </button>
                    )}
                    <button style={{ padding: '7px 14px', borderRadius: '10px', background: 'rgba(255,77,77,0.1)', color: '#ff4d4d', border: '1px solid rgba(255,77,77,0.2)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: FEE MANAGEMENT */}
        {activeTab === 'fees' && (
          <div key="fees" className="tab-content-animate">
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '24px' }}>
              Fee Management &amp; Invoicing
            </h2>

            {/* KPI Row — Live from Supabase */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              {[
                { label: 'Total Collected', value: `₨ ${(feeStats.totalCollected || 0).toLocaleString()}`, sub: 'Total payments received', color: '#2bd49e' },
                { label: 'Outstanding', value: `₨ ${(feeStats.totalOutstanding || 0).toLocaleString()}`, sub: `${feeStats.pendingCount || 0} invoices pending`, color: '#ff4d4d' },
                { label: 'Invoices Paid', value: String(feeStats.paidCount || 0), sub: 'Fully cleared', color: '#ffb703' },
                { label: 'Total Invoices', value: String(feeStats.totalInvoices || 0), sub: 'All time', color: '#00f3ff' },
              ].map((kpi, i) => (
                <div key={i} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '24px', fontWeight: '900', color: kpi.color }}>{kpi.value}</p>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', margin: '4px 0 2px' }}>{kpi.label}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Generate Invoice */}
            <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '20px' }}>
                Generate Fee Invoice
              </h3>

              {invoiceSuccess && (
                <div style={{ background: 'rgba(43, 212, 158, 0.15)', color: '#2bd49e', border: '1px solid rgba(43, 212, 158, 0.3)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                  {invoiceSuccess}
                </div>
              )}

              {invoiceError && (
                <div style={{ background: 'rgba(255, 77, 77, 0.15)', color: '#ff4d4d', border: '1px solid rgba(255, 77, 77, 0.3)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                  {invoiceError}
                </div>
              )}

              <form onSubmit={handleGenerateInvoice}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Student</label>
                    <select
                      className="input-field"
                      value={newInvoice.studentId}
                      onChange={(e) => setNewInvoice({ ...newInvoice, studentId: e.target.value })}
                      required
                    >
                      <option value="">— Select Student —</option>
                      {students.length === 0 && <option disabled>No students registered yet</option>}
                      {students.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.userId?.name || s.name || 'Student'}{s.rollNo ? ` (Roll: ${s.rollNo})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Invoice Title</label>
                    <input
                      className="input-field"
                      placeholder="e.g. Monthly Tuition — August 2026"
                      value={newInvoice.title}
                      onChange={(e) => setNewInvoice({ ...newInvoice, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Amount (PKR)</label>
                    <input
                      className="input-field"
                      type="number"
                      placeholder="e.g. 15000"
                      value={newInvoice.amount}
                      onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Due Date</label>
                    <input
                      className="input-field"
                      type="date"
                      value={newInvoice.dueDate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submittingInvoice}
                  className="btn-primary"
                  style={{ marginTop: '20px', padding: '10px 24px' }}
                >
                  {submittingInvoice ? 'Generating Invoice...' : 'Generate & Send Invoice'}
                </button>
              </form>
            </div>

            {/* Fee Ledger */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Payment Ledger</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filteredFeeLedger.length} record{filteredFeeLedger.length !== 1 ? 's' : ''}</span>
              </div>

              {filteredFeeLedger.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>🧾</div>
                  No fee invoices found. Generate one above.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,243,255,0.06)' }}>
                        {['Student', 'Roll No', 'Invoice', 'Amount', 'Paid', 'Due Date', 'Status', 'Actions'].map((h) => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFeeLedger.map((row) => {
                        const sc = { PAID: '#2bd49e', PARTIAL: '#ffb703', UNPAID: '#ff4d4d', OVERDUE: '#ff4d4d' }[row.status] || '#ffb703';
                        const displayStatus = { PAID: 'Paid', PARTIAL: 'Partial', UNPAID: 'Pending', OVERDUE: 'Overdue' }[row.status] || row.status;
                        const outstanding = Number(row.amount || 0) - Number(row.paidAmount || 0);
                        return (
                          <tr key={row._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{row.student}</td>
                            <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{row.rollNo || '—'}</td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '13px' }}>{row.invoice}</td>
                            <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-main)' }}>₨ {Number(row.amount || 0).toLocaleString()}</td>
                            <td style={{ padding: '12px 14px', fontSize: '13px', color: row.paidAmount > 0 ? '#2bd49e' : 'var(--text-muted)' }}>₨ {Number(row.paidAmount || 0).toLocaleString()}</td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '13px' }}>{row.due ? row.due.split('T')[0] : '—'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: `${sc}22`, color: sc, whiteSpace: 'nowrap' }}>{displayStatus}</span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {row.status !== 'PAID' && (
                                payingFee === row._id ? (
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <input
                                      type="number"
                                      placeholder={`Max ₨${outstanding.toLocaleString()}`}
                                      value={payAmount}
                                      onChange={(e) => setPayAmount(e.target.value)}
                                      style={{ width: '120px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '12px' }}
                                    />
                                    <button onClick={() => handleMarkFeePaid(row._id, outstanding)} style={{ background: '#2bd49e', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>✓</button>
                                    <button onClick={() => { setPayingFee(null); setPayAmount(''); }} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                                  </div>
                                ) : (
                                  <button onClick={() => { setPayingFee(row._id); setPayAmount(''); }} style={{ background: 'rgba(0,243,255,0.1)', color: '#00f3ff', border: '1px solid rgba(0,243,255,0.3)', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>Record Payment</button>
                                )
                              )}
                              <button onClick={() => handleDeleteFee(row._id)} style={{ background: 'rgba(255,77,77,0.1)', color: '#ff4d4d', border: '1px solid rgba(255,77,77,0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', marginLeft: '4px' }}>🗑</button>
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

        {/* TAB: AUDIT LOGS */}
        {activeTab === 'audit-logs' && (
          <div key="audit-logs" className="tab-content-animate">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                System Audit &amp; Security Logs
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: '700', background: 'rgba(122,28,40,0.12)', padding: '4px 12px', borderRadius: '12px' }}>
                {filteredAuditLogs.length} Total Logs
              </span>
            </div>

            {/* Filter bar */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="input-field"
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '13px', flex: '1', minWidth: '160px' }}
              >
                <option value="">All Actions</option>
                <option value="Login">Login</option>
                <option value="Create">Create</option>
                <option value="Update">Update</option>
                <option value="Delete">Delete</option>
                <option value="Mark Attendance">Mark Attendance</option>
                <option value="Fee Invoice">Fee Invoice</option>
              </select>

              <select
                className="input-field"
                value={auditRoleFilter}
                onChange={(e) => setAuditRoleFilter(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '13px', flex: '1', minWidth: '160px' }}
              >
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Teacher">Teacher</option>
                <option value="Student">Student</option>
              </select>

              <input
                className="input-field"
                type="date"
                value={auditDateFilter}
                onChange={(e) => setAuditDateFilter(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '13px', flex: '1', minWidth: '160px' }}
              />

              {(auditActionFilter || auditRoleFilter || auditDateFilter) && (
                <button
                  type="button"
                  onClick={() => { setAuditActionFilter(''); setAuditRoleFilter(''); setAuditDateFilter(''); }}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Audit log table */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,243,255,0.06)' }}>
                      {['Timestamp', 'User', 'Role', 'Action', 'Resource', 'IP Address', 'Status'].map((h) => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                          No audit log records match your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', background: !log.ok ? 'rgba(255,77,77,0.04)' : 'transparent' }}>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{log.ts}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>{log.user}</td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{log.role}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                              background: log.action === 'Login Failed' ? 'rgba(255,77,77,0.15)' : log.action === 'Delete' ? 'rgba(255,183,3,0.15)' : 'rgba(0,243,255,0.1)',
                              color: log.action === 'Login Failed' ? '#ff4d4d' : log.action === 'Delete' ? '#ffb703' : 'var(--primary-color)',
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.resource}</td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: log.ok ? 'var(--text-muted)' : '#ff4d4d', fontFamily: 'monospace' }}>{log.ip}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: log.ok ? '#2bd49e' : '#ff4d4d', display: 'inline-block' }} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TIMETABLE SCHEDULE BUILDER MODAL */}
        {activeTimetableClass && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', borderRadius: '24px', position: 'relative' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary-color)', margin: 0 }}>
                    Weekly Timetable &amp; Schedule Manager
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                    Assigning class schedule for <strong>{activeTimetableClass.name}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTimetableClass(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
                >
                  ✕
                </button>
              </div>

              {/* Add New Slot Form */}
              <div style={{ background: 'var(--input-bg)', padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '14px' }}>
                  + Add New Schedule Slot
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Day</label>
                    <select
                      className="input-field"
                      value={newSlot.day}
                      onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                      style={{ padding: '8px 10px', fontSize: '13px' }}
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Time Slot</label>
                    <input
                      className="input-field"
                      placeholder="e.g. 08:30 AM - 09:30 AM"
                      value={newSlot.time}
                      onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                      style={{ padding: '8px 10px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Subject</label>
                    <input
                      className="input-field"
                      placeholder="e.g. Mathematics"
                      value={newSlot.subject}
                      onChange={(e) => setNewSlot({ ...newSlot, subject: e.target.value })}
                      style={{ padding: '8px 10px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Instructor</label>
                    <input
                      className="input-field"
                      placeholder="e.g. Dr. Sarah"
                      value={newSlot.teacher}
                      onChange={(e) => setNewSlot({ ...newSlot, teacher: e.target.value })}
                      style={{ padding: '8px 10px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Room / Venue</label>
                    <input
                      className="input-field"
                      placeholder="e.g. Room 402"
                      value={newSlot.room}
                      onChange={(e) => setNewSlot({ ...newSlot, room: e.target.value })}
                      style={{ padding: '8px 10px', fontSize: '13px' }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newSlot.subject || !newSlot.time) return;
                    const classIdKey = activeTimetableClass._id || 'default';
                    const currentList = classTimetables[classIdKey] || classTimetables.default || [];
                    const updated = [...currentList, { id: 't_' + Date.now(), ...newSlot }];
                    setClassTimetables({ ...classTimetables, [classIdKey]: updated });
                    setNewSlot({ day: 'Monday', time: '08:30 AM - 09:30 AM', subject: '', teacher: '', room: '' });
                  }}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '13px', width: '100%' }}
                >
                  Add Timetable Slot
                </button>
              </div>

              {/* Weekly Timetable Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px' }}>
                      <th style={{ padding: '10px' }}>Day</th>
                      <th style={{ padding: '10px' }}>Time Slot</th>
                      <th style={{ padding: '10px' }}>Subject</th>
                      <th style={{ padding: '10px' }}>Instructor</th>
                      <th style={{ padding: '10px' }}>Venue</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((classTimetables[activeTimetableClass._id] || classTimetables.default || [])).map((slot) => (
                      <tr key={slot.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: '700', color: 'var(--primary-color)', fontSize: '13px' }}>{slot.day}</td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>{slot.time}</td>
                        <td style={{ padding: '12px 10px', fontWeight: '600', color: 'var(--text-main)', fontSize: '13px' }}>{slot.subject}</td>
                        <td style={{ padding: '12px 10px', fontSize: '13px', color: 'var(--text-muted)' }}>{slot.teacher || 'Unassigned'}</td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>{slot.room || 'TBD'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const classIdKey = activeTimetableClass._id || 'default';
                              const currentList = classTimetables[classIdKey] || classTimetables.default || [];
                              const updated = currentList.filter(s => s.id !== slot.id);
                              setClassTimetables({ ...classTimetables, [classIdKey]: updated });
                            }}
                            style={{ background: 'rgba(255,77,77,0.15)', border: '1px solid rgba(255,77,77,0.3)', color: '#ff4d4d', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTimetableClass(null)}
                  className="btn-primary"
                  style={{ padding: '10px 24px', fontSize: '13px' }}
                >
                  Save &amp; Publish Timetable
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
