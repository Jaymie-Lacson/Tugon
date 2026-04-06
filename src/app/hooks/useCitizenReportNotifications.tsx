import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Info } from 'lucide-react';
import { citizenReportsApi } from '../services/citizenReportsApi';
import { getAuthSession } from '../utils/authSession';

export type CitizenReportNotificationItem = {
  icon: React.ReactNode;
  color: string;
  bg: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  action: 'open-my-reports' | 'open-home';
  reportId?: string;
};

function timeAgo(timestamp: string): string {
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) {
    return 'Recently';
  }

  const diffMs = Date.now() - value;
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getNotificationReadStorageKey(): string {
  const session = getAuthSession();
  const userId = session?.user.id ?? 'anonymous';
  return `tugon:citizen-notifications:last-read:${userId}`;
}

function getLastReadTimestamp(): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  const raw = window.localStorage.getItem(getNotificationReadStorageKey());
  if (!raw) {
    return 0;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setLastReadTimestamp(value: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getNotificationReadStorageKey(), String(value));
}

export function useCitizenReportNotifications() {
  const [items, setItems] = useState<CitizenReportNotificationItem[]>([]);

  const markAllNotificationsRead = useCallback(() => {
    setLastReadTimestamp(Date.now());
    setItems((current) => current.map((item) => ({ ...item, unread: false })));
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const payload = await citizenReportsApi.getMyReports();
      const lastReadTimestamp = getLastReadTimestamp();

        const activeItems = payload.reports
          .filter((report) => report.status === 'Submitted' || report.status === 'Under Review' || report.status === 'In Progress')
          .slice(0, 2)
          .map((report) => {
            const updatedAtTimestamp = new Date(report.updatedAt).getTime();
            const isNewSinceLastRead = Number.isFinite(updatedAtTimestamp) && updatedAtTimestamp > lastReadTimestamp;

            return {
              icon: <Clock3 size={14} />,
              color: 'var(--primary)',
              bg: '#DBEAFE',
              title: 'Report In Progress',
              desc: `${report.id} is currently ${report.status.toLowerCase()}.`,
              time: timeAgo(report.updatedAt),
              unread: isNewSinceLastRead,
              action: 'open-my-reports' as const,
              reportId: report.id,
            };
          });

        const resolvedItems = payload.reports
          .filter((report) => report.status === 'Resolved' || report.status === 'Closed' || report.status === 'Unresolvable')
          .slice(0, 1)
          .map((report) => ({
            icon: <CheckCircle2 size={14} />,
            color: report.status === 'Unresolvable' ? 'var(--severity-critical)' : '#059669',
            bg: report.status === 'Unresolvable' ? '#FEE2E2' : '#D1FAE5',
            title: report.status === 'Unresolvable' ? 'Report Unresolvable' : 'Report Resolved',
            desc: `${report.id} has reached ${report.status}.`,
            time: timeAgo(report.updatedAt),
            unread: false,
            action: 'open-my-reports' as const,
            reportId: report.id,
          }));

      setItems([...activeItems, ...resolvedItems].slice(0, 3));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();

    const disconnect = citizenReportsApi.connectMyReportsStream(() => {
      void loadNotifications();
    });

    return () => {
      disconnect();
    };
  }, [loadNotifications]);

  const notificationItems = useMemo<CitizenReportNotificationItem[]>(() => {
    if (items.length > 0) {
      return items;
    }

    return [{
      icon: <Info size={14} />,
      color: 'var(--primary)',
      bg: '#DBEAFE',
      title: 'No new alerts',
      desc: 'You are all caught up for now.',
      time: 'Live',
      unread: false,
      action: 'open-home',
    }];
  }, [items]);

  const unreadNotificationCount = notificationItems.filter((item) => item.unread).length;

  return {
    notificationItems,
    unreadNotificationCount,
    markAllNotificationsRead,
  };
}
