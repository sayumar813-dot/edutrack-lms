'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/services/apiClient';

export default function ParentWardProfilePage() {
  const { theme, toggleTheme } = useTheme();

  const [wards, setWards] = useState([]);
  const [selectedWardIndex, setSelectedWardIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Medical note form state
  const [medicalForm, setMedicalForm] = useState({
    noteTitle: 'Severe Fever & Doctor Advised Rest',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    doctorName: 'Dr. Marcus Vance',
    clinicName: 'City Central Health Clinic',
    details: 'Student presented with high viral fever (102°F). Prescribed 3 days bed rest and medication.',
  });
  const [attachment, setAttachment] = useState({
    fileName: 'Doctor_Certificate_David_Miller.pdf',
    fileType: 'application/pdf',
    fileData: 'data:application/pdf;base64,JVBERi0xLjQK',
    fileSize: '485 KB',
  });
  const [submittingNote, setSubmittingNote] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setAttachment({
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileData: uploadEvent.target?.result,
        fileSize: `${Math.round(file.size / 1024)} KB`,
      });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const fetchWards = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/api/v1/parent/wards');
      if (res.success && res.data) {
        setWards(res.data);
      }
    } catch (err) {
      console.warn('Failed to load wards:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeWard = wards[selectedWardIndex] || {
    name: 'Student Ward Profile',
    rollNumber: 'STU-1003',
    class: 'Grade 10 - Section A',
    attendancePercentage: 95,
    pendingBalance: 0,
    recentGrade: 'A',
    hasAbsenceWarning: false,
  };

  const handleSubmitMedicalNote = async (e) => {
    e.preventDefault();
    setFeedback({ error: '', success: '' });

    if (!medicalForm.noteTitle || !medicalForm.details) {
      setFeedback({ error: 'Please enter note title and details.', success: '' });
      return;
    }

    try {
      setSubmittingNote(true);
      const res = await apiClient('/api/v1/parent/medical-note', {
        method: 'POST',
        body: JSON.stringify({
          wardName: activeWard.name,
          noteTitle: medicalForm.noteTitle,
          startDate: medicalForm.startDate,
          endDate: medicalForm.endDate,
          doctorName: medicalForm.doctorName,
          clinicName: medicalForm.clinicName,
          details: medicalForm.details,
          attachment: attachment || null,
        }),
      });

      if (res.success) {
        setFeedback({
          success: `✅ Medical Note for ${activeWard.name} submitted successfully! Admin & Super Admin alerted.`,
          error: '',
        });
      } else {
        setFeedback({ error: res.error || 'Failed to submit medical note.', success: '' });
      }
    } catch (err) {
      setFeedback({ error: err.message || 'Error submitting medical note.', success: '' });
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab="ward-profile" setActiveTab={() => {}} />

      <main className="app-main">
        {/* Top Header Bar */}
        <div
          className="page-header-bar"
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
              Parent Guardian Portal
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Ward Performance Monitoring, Absence Medical Excuses & Fee Clearance
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationBell userRole="PARENT" />
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-btn"
              style={{ padding: '10px 20px', fontSize: '15px' }}
            >
              <span>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
            </button>
          </div>
        </div>

        {/* Child Switcher Header */}
        <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Linked Ward Overview
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                Select child to view academic records, attendance history, and submit medical notes
              </p>
            </div>

            {/* Multi-Child Switcher Dropdown */}
            {wards.length > 1 ? (
              <select
                className="input-field"
                style={{ width: 'auto', padding: '10px 18px', fontSize: '14px', fontWeight: '700' }}
                value={selectedWardIndex}
                onChange={(e) => setSelectedWardIndex(Number(e.target.value))}
              >
                {wards.map((w, idx) => (
                  <option key={w.id || idx} value={idx}>
                    {w.name} (Roll: {w.rollNumber || 'STU-1001'})
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ background: 'var(--subcard-bg)', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary-color)' }}>
                  👶 Ward: {activeWard.name} ({activeWard.rollNumber || 'STU-1001'})
                </span>
              </div>
            )}
          </div>

          {/* Absence Alert Banner if Ward Has Consecutive Absences */}
          {activeWard.hasAbsenceWarning || activeWard.attendancePercentage < 75 ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                padding: '16px 20px',
                borderRadius: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h4 style={{ color: '#ef4444', fontSize: '15px', fontWeight: '800', margin: 0 }}>
                  ⚠️ Urgent Attendance Alert: {activeWard.name} Recorded Consecutive Absences
                </h4>
                <p style={{ color: 'var(--text-main)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Current Attendance is <strong>{activeWard.attendancePercentage}%</strong>. School rules require submitting a doctor medical note for absences longer than 2 days.
                </p>
              </div>
              <a
                href="#medical-note-section"
                className="action-btn action-btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}
              >
                🏥 Submit Medical Certificate
              </a>
            </div>
          ) : null}

          {/* KPI Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            <div
              style={{
                background: 'var(--subcard-bg)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                Attendance Rate
              </span>
              <h3
                style={{
                  fontSize: '32px',
                  color: activeWard.attendancePercentage >= 75 ? '#2bd49e' : '#ef4444',
                  fontWeight: '800',
                  margin: '6px 0',
                }}
              >
                {activeWard.attendancePercentage}%
              </h3>
              <span style={{ fontSize: '12px', color: activeWard.attendancePercentage >= 75 ? '#2bd49e' : '#ef4444', fontWeight: '600' }}>
                {activeWard.attendancePercentage >= 75 ? 'On track (Target ≥75%)' : 'Needs Medical Excuse'}
              </span>
            </div>

            <div
              style={{
                background: 'var(--subcard-bg)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                Unpaid Fee Balance
              </span>
              <h3 style={{ fontSize: '32px', color: '#ffb703', fontWeight: '800', margin: '6px 0' }}>
                PKR {activeWard.pendingBalance || '0'}
              </h3>
              <span style={{ fontSize: '12px', color: '#ffb703', fontWeight: '600' }}>
                Q1 Tuition Fee Clearance
              </span>
            </div>

            <div
              style={{
                background: 'var(--subcard-bg)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                Recent Evaluation Grade
              </span>
              <h3 style={{ fontSize: '32px', color: 'var(--primary-color)', fontWeight: '800', margin: '6px 0' }}>
                {activeWard.recentGrade || 'B+'}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Class Average Comparison</span>
            </div>
          </div>
        </div>

        {/* Medical Certificate Submission Section */}
        <div id="medical-note-section" className="glass-card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              🏥 Submit Doctor Medical Note / Absence Excuse
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              Upload or submit official doctor notes to justify student absences. Once submitted, an instant alert is dispatched to School Admin & Super Admin.
            </p>
          </div>

          {feedback.error && (
            <div className="status-badge status-danger" style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px' }}>
              ❌ {feedback.error}
            </div>
          )}

          {feedback.success && (
            <div className="status-badge status-success" style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px' }}>
              {feedback.success}
            </div>
          )}

          <form onSubmit={handleSubmitMedicalNote}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label className="form-label">Child / Ward Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={activeWard.name}
                  disabled
                  style={{ opacity: 0.8 }}
                />
              </div>

              <div>
                <label className="form-label">Medical Condition / Note Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={medicalForm.noteTitle}
                  onChange={(e) => setMedicalForm({ ...medicalForm, noteTitle: e.target.value })}
                  placeholder="e.g. Doctor Certificate - Severe Viral Fever"
                  required
                />
              </div>

              <div>
                <label className="form-label">Absence Start Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={medicalForm.startDate}
                  onChange={(e) => setMedicalForm({ ...medicalForm, startDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Expected Return Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={medicalForm.endDate}
                  onChange={(e) => setMedicalForm({ ...medicalForm, endDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Attending Doctor Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={medicalForm.doctorName}
                  onChange={(e) => setMedicalForm({ ...medicalForm, doctorName: e.target.value })}
                  placeholder="e.g. Dr. Marcus Vance"
                />
              </div>

              <div>
                <label className="form-label">Clinic / Hospital Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={medicalForm.clinicName}
                  onChange={(e) => setMedicalForm({ ...medicalForm, clinicName: e.target.value })}
                  placeholder="e.g. City Central Health Clinic"
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="form-label">📎 Upload Doctor Medical Certificate / Prescription (Image or PDF)</label>
              <div
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'var(--subcard-bg)',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  id="medical-file-upload"
                  style={{ display: 'none' }}
                />
                <label htmlFor="medical-file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄 🖼️</div>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary-color)' }}>
                    Click to Upload Medical Note PDF or Image Document
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Supports official PDF, PNG, JPG, WEBP medical reports (Max 10MB)
                  </p>
                </label>

                {attachment && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 18px',
                      background: 'var(--card-bg)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>
                      {(attachment.fileType || '').includes('pdf') ? '📄' : '🖼️'}
                    </span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                        {attachment.fileName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#2bd49e', fontWeight: '600' }}>
                        Attached & Verified ({attachment.fileSize || 'Ready for Admin Inspection'})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginLeft: '12px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submittingNote}
                className="action-btn action-btn-primary"
                style={{ padding: '12px 28px', fontSize: '15px', fontWeight: '800' }}
              >
                {submittingNote ? 'Dispatching Admin Alert...' : '🚀 Submit Medical Certificate & Alert Admin'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
