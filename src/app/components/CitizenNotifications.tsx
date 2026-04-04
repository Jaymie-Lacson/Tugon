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
      className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border border-white/20 bg-white/[0.12] text-white"
    >
      <Bell size={18} />
      {unreadCount > 0 ? (
        <span
          className="absolute -right-1 -top-1 box-border inline-block min-w-[18px] rounded-full border-[1.5px] border-primary bg-severity-critical px-1 text-center text-[10px] font-bold leading-4 text-white"
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
      className="absolute right-4 top-[66px] z-[100] w-[300px] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="text-sm font-bold text-slate-800">Notifications</span>
        <span className="rounded-[20px] bg-severity-critical px-[7px] py-[1px] text-[10px] font-bold text-white">
          {unreadCount > 0 ? `${unreadCount} New` : 'No New'}
        </span>
      </div>
      {items.map((item, index) => {
        const content = (
          <>
            <div
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
              style={{ background: item.bg, color: item.color }}
            >
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-800">{item.title}</div>
              <div className="mt-px text-[11px] text-slate-500">{item.desc}</div>
              <div className="mt-0.5 text-[10px] text-slate-400">{item.time}</div>
            </div>
          </>
        );

        const rowClassName = [
          'flex w-full items-start gap-2.5 px-4 py-3 text-left',
          item.unread ? 'bg-amber-50' : 'bg-white',
          index < items.length - 1 ? 'border-b border-slate-50' : '',
        ].join(' ');

        if (onItemClick) {
          return (
            <button
              key={`${item.title}-${index}`}
              type="button"
              onClick={() => onItemClick(item)}
              className={`${rowClassName} cursor-pointer border-0`}
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
