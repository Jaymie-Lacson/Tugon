import React from 'react';
import { Bell } from 'lucide-react';

export type CitizenNotificationItem = {
  icon: React.ReactNode;
  color: string;
  bg: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
};

interface CitizenNotificationBellTriggerProps {
  unreadCount: number;
  onClick: () => void;
}

export function CitizenNotificationBellTrigger({ unreadCount, onClick }: CitizenNotificationBellTriggerProps) {
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Notifications"
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 10,
        width: 38,
        height: 38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#fff',
      }}
    >
      <Bell size={18} />
      {unreadCount > 0 ? (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 999,
            background: '#B91C1C',
            color: '#FFFFFF',
            border: '1.5px solid #1E3A8A',
            fontSize: 10,
            lineHeight: '16px',
            fontWeight: 700,
            padding: '0 4px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
          aria-hidden="true"
        >
          {unreadLabel}
        </span>
      ) : null}
    </button>
  );
}

interface CitizenNotificationsPanelProps<T extends CitizenNotificationItem> {
  open: boolean;
  unreadCount: number;
  items: T[];
  onItemClick?: (item: T) => void;
}

export function CitizenNotificationsPanel<T extends CitizenNotificationItem>({
  open,
  unreadCount,
  items,
  onItemClick,
}: CitizenNotificationsPanelProps<T>) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 66,
        right: 16,
        width: 300,
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        zIndex: 100,
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 14 }}>Notifications</span>
        <span
          style={{
            background: '#B91C1C',
            color: '#fff',
            borderRadius: 20,
            padding: '1px 7px',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {unreadCount > 0 ? `${unreadCount} New` : 'No New'}
        </span>
      </div>
      {items.map((item, index) => {
        const content = (
          <>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: item.bg,
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#1E293B' }}>{item.title}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{item.desc}</div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{item.time}</div>
            </div>
          </>
        );

        const commonStyle: React.CSSProperties = {
          width: '100%',
          border: 'none',
          borderBottom: index < items.length - 1 ? '1px solid #F8FAFC' : 'none',
          background: item.unread ? '#FFFBEB' : '#fff',
          padding: '12px 16px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          textAlign: 'left',
        };

        if (onItemClick) {
          return (
            <button
              key={`${item.title}-${index}`}
              type="button"
              onClick={() => onItemClick(item)}
              style={{
                ...commonStyle,
                cursor: 'pointer',
              }}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={`${item.title}-${index}`} style={commonStyle}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
