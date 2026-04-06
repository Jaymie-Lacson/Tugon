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
  open?: boolean;
  onClick: () => void;
}

export function CitizenNotificationBellTrigger({ unreadCount, open = false, onClick }: CitizenNotificationBellTriggerProps) {
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open notifications"
      title="Open notifications"
      data-state={open ? 'open' : 'closed'}
      aria-haspopup="menu"
      className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg bg-white/[0.12] text-white"
    >
      <Bell size={18} />
      {unreadCount > 0 ? (
        <span
          className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white/35 bg-[var(--severity-critical)] px-1 text-[10px] font-bold leading-none text-white"
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
  onMarkAllRead?: () => void;
  onItemClick?: (item: T) => void;
}

export function CitizenNotificationsPanel<T extends CitizenNotificationItem>({
  open,
  unreadCount,
  items,
  onMarkAllRead,
  onItemClick,
}: CitizenNotificationsPanelProps<T>) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-label="Notifications"
      className="absolute left-4 right-4 top-11 z-[2300] max-h-[360px] w-auto overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.2)] sm:left-auto sm:right-4 sm:w-80"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
        <span className="text-[12px] font-bold text-slate-800">Notifications</span>
        <button
          type="button"
          onClick={() => {
            onMarkAllRead?.();
          }}
          disabled={unreadCount === 0}
          className="rounded-md border-0 bg-transparent px-1.5 py-1 text-[11px] font-bold text-[var(--primary)] transition-colors hover:bg-slate-100 hover:text-[var(--primary-container)] active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/35 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent"
        >
          Mark all read
        </button>
      </div>

      {items.length === 0 ? (
        <div className="px-3 py-3 text-[12px] text-slate-500">No notifications yet.</div>
      ) : null}

      {items.map((item, index) => {
        const isUnread = item.unread;

        const rowClassName = [
          'flex w-full items-start px-4 py-3 text-left',
          index < items.length - 1 ? 'border-b border-slate-100' : '',
          isUnread ? 'bg-blue-50' : 'bg-white',
          onItemClick ? 'cursor-pointer border-0' : 'cursor-default',
        ].join(' ');

        const content = (
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex-1 text-[13px] font-bold text-slate-800 sm:text-[14px]">
                {item.title}
              </span>
              {isUnread && (
                <span className="size-3 shrink-0 rounded-full bg-[var(--severity-critical)]" />
              )}
            </div>
            <div className="text-[12px] leading-[1.35] text-slate-700 sm:text-[13px]">{item.desc}</div>
            <div className="mt-1.5 text-[11px] text-slate-500 sm:text-[12px]">{item.time}</div>
            </div>
        );

        if (onItemClick) {
          return (
            <button
              key={`${item.title}-${index}`}
              type="button"
              onClick={() => onItemClick(item)}
              className={rowClassName}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={`${item.title}-${index}`} className={rowClassName}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
