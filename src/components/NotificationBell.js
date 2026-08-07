'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const dropdownRef = useRef(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const roleParam = user?.role ? `?role=${user.role}` : '';
      const res = await fetch(`/api/v1/notifications${roleParam}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error loading real notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  const removeNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!open) loadNotifications();
          setOpen(!open);
        }}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'var(--subcard-bg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-main)',
          position: 'relative',
          transition: 'all 0.2s ease',
        }}
        title="Real-time Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: 'var(--primary-color)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '800',
            borderRadius: '10px',
            padding: '2px 6px',
            lineHeight: 1,
            boxShadow: '0 2px 6px rgba(122, 28, 40, 0.4)',
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Menu */}
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '48px',
          width: '320px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-hover)',
          zIndex: 9999,
          padding: '16px',
          animation: 'pageEntrance 0.2s ease forwards',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>System Notifications</h4>
              {unreadCount > 0 && (
                <span style={{ background: 'rgba(122,28,40,0.15)', color: 'var(--primary-color)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {loading ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', margin: 0 }}>Loading alerts...</p>
            ) : notifications.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                No active notifications
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: n.unread ? 'var(--subcard-bg)' : 'transparent',
                    border: '1px solid var(--border-color)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h5 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>{n.title}</h5>
                    <button
                      type="button"
                      onClick={() => removeNotification(n.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', padding: '0 0 0 6px' }}
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 6px 0', lineHeight: 1.3 }}>{n.desc}</p>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>{n.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
