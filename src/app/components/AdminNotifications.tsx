import React from 'react';
import { Bell } from 'lucide-react';

export type AdminNotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

interface AdminNotificationsProps {
  open: boolean;
  loading: boolean;
  unreadCount: number;
  items: AdminNotificationItem[];
  panelLabel: string;
  panelTop?: number;
  panelRight?: number;
  panelZIndex?: number;
  onToggle: () => void;
  onItemClick: (item: AdminNotificationItem) => void;
  onMarkAllRead: () => void;
}

function formatNotificationTimestamp(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 'Just now';
  }

  const elapsedMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsedMs < minute) {
    return 'Just now';
  }
  if (elapsedMs < hour) {
    return `${Math.floor(elapsedMs / minute)}m ago`;
  }
  if (elapsedMs < day) {
    return `${Math.floor(elapsedMs / hour)}h ago`;
  }

  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminNotifications({
  open,
  loading,
  unreadCount,
  items,
  panelLabel,
  panelTop = 44,
  panelRight = 0,
  panelZIndex = 2300,
  onToggle,
  onItemClick,
  onMarkAllRead,
}: AdminNotificationsProps) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Open notifications"
        title="Open notifications"
        aria-expanded={open}
        aria-haspopup="menu"
        className="icon-btn-square"
        onClick={onToggle}
        style={{
          lineHeight: 0,
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        <Bell size={18} color="white" />
        {unreadCount > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: 'var(--severity-critical)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '1px solid rgba(255,255,255,0.35)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={panelLabel}
          style={{
            position: 'absolute',
            top: panelTop,
            right: panelRight,
            width: 320,
            maxHeight: 360,
            overflowY: 'auto',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
            border: '1px solid #E2E8F0',
            zIndex: panelZIndex,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <span style={{ color: '#1E293B', fontSize: 12, fontWeight: 700 }}>Notifications</span>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              style={{
                border: 'none',
                background: 'transparent',
                color: unreadCount === 0 ? '#94A3B8' : 'var(--primary)',
                fontSize: 11,
                fontWeight: 700,
                cursor: unreadCount === 0 ? 'default' : 'pointer',
              }}
            >
              Mark all read
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 12, color: '#64748B', fontSize: 12 }}>Loading notifications...</div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div style={{ padding: 12, color: '#64748B', fontSize: 12 }}>No notifications yet.</div>
          ) : null}

          {!loading
            ? items.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onItemClick(item);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      border: 'none',
                      borderBottom: '1px solid #F1F5F9',
                      background: isUnread ? '#EFF6FF' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#1E293B', fontSize: 12, fontWeight: 700, flex: 1 }}>{item.title}</span>
                      {isUnread ? (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--severity-critical)', flexShrink: 0 }} />
                      ) : null}
                    </div>
                    <div style={{ color: '#334155', fontSize: 12, lineHeight: 1.35 }}>{item.message}</div>
                    <div style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>
                      {formatNotificationTimestamp(item.createdAt)}
                    </div>
                  </button>
                );
              })
            : null}
        </div>
      ) : null}
    </div>
  );
}
