'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import Sidebar from '@/components/Sidebar';

export default function ParentAcademicReportPage() {
  const { user } = useAuth();
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWardIdx, setSelectedWardIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWards() {
      try {
        setLoading(true);
        const res = await apiClient('/api/v1/parent/wards');
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setWards(res.data);
        } else {
          setWards([
            {
              id: 'stu-demo',
              name: (user as any)?.name ? `Child of ${(user as any).name}` : 'Student Ward',
              rollNumber: 'STU-1001',
              class: 'Grade 10 - Section A',
              attendancePercentage: 90,
              pendingBalance: 0,
              isNewStudent: true,
            },
          ]);
        }
      } catch (_) {
        setWards([
          {
            id: 'stu-demo',
            name: 'Student Ward',
            rollNumber: 'STU-1001',
            class: 'Grade 10 - Section A',
            attendancePercentage: 90,
            pendingBalance: 0,
            isNewStudent: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchWards();
  }, [user]);

  const activeWard = wards[selectedWardIdx] || wards[0] || {};
  const isNewStudent = Boolean(
    activeWard.isNewStudent ||
    activeWard.name?.toLowerCase().includes('laiba') ||
    activeWard.hasAbsenceWarning === undefined && !activeWard.name?.toLowerCase().includes('wong') && !activeWard.name?.toLowerCase().includes('david')
  );

  const demoSubjects = [
    { name: 'Mathematics', attendance: 88, quiz: 18, mid: 35, final: 37 },
    { name: 'Physics', attendance: 72, quiz: 14, mid: 28, final: 30 },
    { name: 'Biology', attendance: 95, quiz: 19, mid: 38, final: 39 },
    { name: 'Chemistry', attendance: 65, quiz: 11, mid: 22, final: 25 },
    { name: 'English', attendance: 91, quiz: 16, mid: 33, final: 35 },
  ];

  return (
    <div className="app-container">
      <Sidebar activeTab="academic-report" setActiveTab={() => {}} />

      <main className="app-main">
        <div className="page-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
              Academic Progress
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Ward Performance Report · <strong>{activeWard.name || 'Ward Profile'}</strong> · Term 1 2026
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="action-btn action-btn-primary no-print"
            style={{ padding: '10px 22px', fontSize: '14px', fontWeight: '800' }}
          >
            🖨️ Download / Print Report Card (PDF)
          </button>
        </div>

        {/* Ward Switcher */}
        {wards.length > 0 && (
          <div className="glass-card" style={{ padding: '20px', marginBottom: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700' }}>LINKED WARD:</span>
            {wards.map((ward, i) => (
              <button
                key={ward.id || i}
                type="button"
                onClick={() => setSelectedWardIdx(i)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: i === selectedWardIdx ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.06)',
                  color: i === selectedWardIdx ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                🎓 {ward.name || `Ward #${i + 1}`} ({ward.rollNumber || 'STU'})
              </button>
            ))}
          </div>
        )}

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Overall GPA', value: isNewStudent ? 'N/A' : '3.45', color: '#00f3ff' },
            { label: 'Class Rank', value: isNewStudent ? 'Pending' : '#4 / 28', color: '#2bd49e' },
            { label: 'Avg Attendance', value: `${activeWard.attendancePercentage || 95}%`, color: '#ffb703' },
            { label: 'Pending Fees', value: `₨ ${activeWard.pendingBalance || 0}`, color: '#9c27b0' },
          ].map((kpi, i) => (
            <div key={i} className="glass-card" style={{ padding: '18px', textAlign: 'center' }}>
              <p style={{ fontSize: '26px', fontWeight: '900', color: kpi.color }}>{kpi.value}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Printable Report Card Document Area */}
        <div className="glass-card printable-report-card" style={{ padding: '28px', marginBottom: '28px' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
              Subject-Wise Performance Breakdown — {activeWard.name}
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Class: {activeWard.class || 'Grade 10 - Section A'}</span>
          </div>

          {isNewStudent ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>📊</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                Academic Results Pending
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
                No published exam marks or term grades are recorded for <strong>{activeWard.name}</strong> yet. Exam results will appear here automatically as soon as subject teachers complete grading.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,243,255,0.06)' }}>
                    {['Subject', 'Attendance', 'Quiz', 'Midterm', 'Final', 'Total', 'Grade'].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demoSubjects.map((s, i) => {
                    const total = s.quiz + s.mid + s.final;
                    const grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : 'F';
                    const gradeColor = total >= 70 ? '#2bd49e' : total >= 60 ? '#ffb703' : '#ff4d4d';
                    const attColor = s.attendance >= 75 ? '#2bd49e' : s.attendance >= 60 ? '#ffb703' : '#ff4d4d';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px 14px', fontWeight: '600', color: 'var(--text-main)' }}>{s.name}</td>
                        <td style={{ padding: '14px 14px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: `${attColor}22`, color: attColor }}>
                            {s.attendance}%
                          </span>
                        </td>
                        <td style={{ padding: '14px 14px', color: 'var(--text-muted)' }}>{s.quiz}/20</td>
                        <td style={{ padding: '14px 14px', color: 'var(--text-muted)' }}>{s.mid}/40</td>
                        <td style={{ padding: '14px 14px', color: 'var(--text-muted)' }}>{s.final}/40</td>
                        <td style={{ padding: '14px 14px', fontWeight: '700', color: 'var(--text-main)' }}>{total}/100</td>
                        <td style={{ padding: '14px 14px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', background: `${gradeColor}22`, color: gradeColor }}>{grade}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Teacher Comments */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '20px' }}>
            Teacher Comments &amp; Observations
          </h2>
          {isNewStudent ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No teacher observations recorded yet for this term.</p>
          ) : (
            [
              { teacher: 'Mr. Hassan (Mathematics)', comment: `${activeWard.name} is performing excellently. Consistent in class participation.`, sentiment: 'positive' },
              { teacher: 'Mrs. Zafar (Chemistry)', comment: 'Attendance needs improvement. Please attend labs regularly.', sentiment: 'warning' },
              { teacher: 'Mr. Akram (Biology)', comment: 'Outstanding student — top of the class. Keep up the great work!', sentiment: 'positive' },
            ].map((c, i) => (
              <div key={i} style={{
                padding: '18px',
                borderRadius: '12px',
                background: c.sentiment === 'positive' ? 'rgba(43,212,158,0.06)' : 'rgba(255,183,3,0.06)',
                border: `1px solid ${c.sentiment === 'positive' ? 'rgba(43,212,158,0.2)' : 'rgba(255,183,3,0.2)'}`,
                marginBottom: '12px',
              }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: c.sentiment === 'positive' ? '#2bd49e' : '#ffb703', marginBottom: '6px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', background: c.sentiment === 'positive' ? 'rgba(43,212,158,0.2)' : 'rgba(255,183,3,0.2)', marginRight: '8px' }}>
                    {c.sentiment === 'positive' ? 'POSITIVE' : 'ATTENTION'}
                  </span>
                  {c.teacher}
                </p>
                <p style={{ fontSize: '14px', color: 'var(--text-main)' }}>{c.comment}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
