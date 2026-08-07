'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/context/ThemeContext';

export default function ParentWardProfilePage() {
  const [selectedWard, setSelectedWard] = useState('student-1');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-container">
      <Sidebar activeTab="ward-profile" setActiveTab={() => {}} />

      <main className="app-main">
        {/* Top Header Bar */}
        <div className="page-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
              Parent Portal
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Ward Performance Monitoring, Attendance Alerts & Progress Cards
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

        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Ward Performance Overview
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                Monitor academic progress, attendance stats, and fee clearance for your linked children
              </p>
            </div>

            {/* Multi-Child Switcher */}
            <select
              className="input-field"
              style={{ width: 'auto', padding: '10px 18px', fontSize: '14px', fontWeight: '700' }}
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
            >
              <option value="student-1">Alex Johnson (Roll: 101-A)</option>
              <option value="student-2">Sarah Johnson (Roll: 804-B)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: 'var(--subcard-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Attendance Rate</span>
              <h3 style={{ fontSize: '32px', color: '#2bd49e', fontWeight: '800', margin: '6px 0' }}>92%</h3>
              <span style={{ fontSize: '12px', color: '#2bd49e', fontWeight: '600' }}>On track (Target ≥75%)</span>
            </div>

            <div style={{ background: 'var(--subcard-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Unpaid Fee Balance</span>
              <h3 style={{ fontSize: '32px', color: '#ffb703', fontWeight: '800', margin: '6px 0' }}>$250.00</h3>
              <span style={{ fontSize: '12px', color: '#ffb703', fontWeight: '600' }}>Term 2 Tuition Due</span>
            </div>

            <div style={{ background: 'var(--subcard-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Latest GPA</span>
              <h3 style={{ fontSize: '32px', color: 'var(--primary-color)', fontWeight: '800', margin: '6px 0' }}>3.85</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Midterm Evaluation</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
