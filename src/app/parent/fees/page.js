'use client';

import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/context/ThemeContext';
import NotificationBell from '@/components/NotificationBell';

export default function ParentFeesPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-container">
      <Sidebar activeTab="fees" setActiveTab={() => {}} />

      <main className="app-main">
        {/* Top Header Bar */}
        <div className="page-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
              Parent Fee Portal
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Online Tuition Clearance, Outstanding Invoices & Stored Digital Receipts
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

        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
            Fee Clearance & Online Invoicing
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px' }}>
            View pending tuition balance, initiate instant payments, and download stored official receipts
          </p>

          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <th style={{ padding: '12px' }}>Invoice Title</th>
                  <th style={{ padding: '12px' }}>Due Date</th>
                  <th style={{ padding: '12px' }}>Total Amount</th>
                  <th style={{ padding: '12px' }}>Paid Amount</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 12px', fontWeight: '700', color: 'var(--text-main)' }}>Term 2 Tuition & Lab Fee</td>
                  <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>2026-03-15</td>
                  <td style={{ padding: '14px 12px', fontWeight: '700' }}>$500.00</td>
                  <td style={{ padding: '14px 12px', color: '#2bd49e', fontWeight: '700' }}>$250.00</td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{ background: 'rgba(255, 183, 3, 0.15)', color: '#ffb703', border: '1px solid rgba(255, 183, 3, 0.3)', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
                      PARTIAL
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                      Pay Remaining ($250)
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
