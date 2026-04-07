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
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = React.useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 1023px)').matches;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  const [mobilePanelTop, setMobilePanelTop] = React.useState(panelTop + 8);

  React.useEffect(() => {
    if (!open || !isMobileViewport) {
      return;
    }

    const updateMobilePanelTop = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      setMobilePanelTop(Math.max(12, Math.round(rect.bottom + 8)));
    };

    updateMobilePanelTop();
    window.addEventListener('resize', updateMobilePanelTop);
    window.addEventListener('scroll', updateMobilePanelTop, { passive: true });

    return () => {
      window.removeEventListener('resize', updateMobilePanelTop);
      window.removeEventListener('scroll', updateMobilePanelTop);
    };
  }, [isMobileViewport, open]);

  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    panel.style.zIndex = String(panelZIndex);
    panel.style.top = `${isMobileViewport ? mobilePanelTop : panelTop}px`;

    if (isMobileViewport) {
      panel.style.right = '';
    } else {
      panel.style.right = `${panelRight}px`;
    }
  }, [isMobileViewport, mobilePanelTop, panelRight, panelTop, panelZIndex, open]);

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <button
          type="button"
          aria-label="Open notifications"
          title="Open notifications"
          aria-expanded="true"
          aria-haspopup="dialog"
          className="icon-btn-square inline-flex cursor-pointer items-center justify-center rounded-lg border-none bg-[rgba(255,255,255,0.1)] p-0 leading-none"
          onClick={onToggle}
        >
          <Bell size={18} color="var(--on-surface)" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] border border-[rgba(255,255,255,0.35)] bg-[var(--severity-critical)] px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      ) : (
        <button
          type="button"
          aria-label="Open notifications"
          title="Open notifications"
          aria-expanded="false"
          aria-haspopup="dialog"
          className="icon-btn-square inline-flex cursor-pointer items-center justify-center rounded-lg border-none bg-[rgba(255,255,255,0.1)] p-0 leading-none"
          onClick={onToggle}
        >
          <Bell size={18} color="var(--on-surface)" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] border border-[rgba(255,255,255,0.35)] bg-[var(--severity-critical)] px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      )}

      {open ? (
        <div
          ref={panelRef}
          role="region"
          aria-label={panelLabel}
          className={`max-h-[360px] overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.2)] ${
            isMobileViewport
              ? 'fixed left-1/2 z-[2300] w-[min(360px,calc(100vw-16px))] -translate-x-1/2'
              : 'absolute z-[2300] w-80'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-3 py-2.5">
            <span className="text-xs font-bold text-[#1E293B]">Notifications</span>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className={`border-none bg-transparent text-[11px] font-bold ${
                unreadCount === 0
                  ? 'cursor-default text-[#94A3B8]'
                  : 'cursor-pointer text-[var(--primary)]'
              }`}
            >
              Mark all read
            </button>
          </div>

          {loading ? (
            <div className="p-3 text-xs text-[#64748B]">Loading notifications...</div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="p-3 text-xs text-[#64748B]">No notifications yet.</div>
          ) : null}

          {!loading
            ? items.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onItemClick(item);
                    }}
                    className={`w-full cursor-pointer border-none border-b border-[#F1F5F9] px-3 py-2.5 text-left ${
                      isUnread ? 'bg-[#EFF6FF]' : 'bg-white'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex-1 text-xs font-bold text-[#1E293B]">{item.title}</span>
                      {isUnread ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--severity-critical)]" />
                      ) : null}
                    </div>
                    <div className="text-xs leading-[1.35] text-[#334155]">{item.message}</div>
                    <div className="mt-1 text-[11px] text-[#64748B]">
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
