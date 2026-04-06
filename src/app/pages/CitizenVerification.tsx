import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../i18n';
import { useNavigate } from 'react-router';
import {
  CheckCircle2,
  Clock3,
  Info,
  ShieldAlert,
  UploadCloud,
  XCircle,
  Paperclip,
  X,
  ChevronRight,
} from 'lucide-react';
import { CitizenPageLayout } from '../components/CitizenPageLayout';
import { CitizenDesktopNav } from '../components/CitizenDesktopNav';
import { CitizenMobileMenu } from '../components/CitizenMobileMenu';
import { CitizenNotificationBellTrigger, CitizenNotificationsPanel } from '../components/CitizenNotifications';
import { RoleHomeLogo } from '../components/RoleHomeLogo';
import CardSkeleton from '../components/ui/CardSkeleton';
import TextSkeleton from '../components/ui/TextSkeleton';
import { useCitizenReportNotifications } from '../hooks/useCitizenReportNotifications';
import { profileVerificationApi, type CitizenVerificationState } from '../services/profileVerificationApi';
import { clearAuthSession, getAuthSession, patchAuthSessionUser } from '../utils/authSession';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE_MB = 8;

function isAllowedImageFile(file: File): boolean {
  if (ALLOWED_TYPES.includes(file.type)) {
    return true;
  }

  if (!file.type) {
    const lower = file.name.toLowerCase();
    return lower.endsWith('.jpg')
      || lower.endsWith('.jpeg')
      || lower.endsWith('.png')
      || lower.endsWith('.webp')
      || lower.endsWith('.heic')
      || lower.endsWith('.heif');
  }

  return false;
}

function statusMeta(state: CitizenVerificationState | null, t: (key: string) => string) {
  if (!state) {
    return {
      label: t('citizen.verification.statusNotSubmitted'),
      color: '#475569',
      bg: '#F8FAFC',
      badgeClass: 'border-slate-300 bg-slate-50 text-slate-600',
      icon: <Clock3 size={14} />,
      helper: t('citizen.verification.helperNotSubmitted'),
    };
  }

  if (state.isBanned) {
    return {
      label: t('citizen.verification.statusRestricted'),
      color: '#991B1B',
      bg: '#FEE2E2',
      badgeClass: 'border-red-300 bg-red-100 text-red-800',
      icon: <ShieldAlert size={14} />,
      helper: t('citizen.verification.helperRestricted'),
    };
  }

  if (state.isVerified) {
    return {
      label: t('citizen.verification.approved'),
      color: '#065F46',
      bg: '#DCFCE7',
      badgeClass: 'border-emerald-300 bg-emerald-100 text-emerald-800',
      icon: <CheckCircle2 size={14} />,
      helper: t('citizen.verification.helperApproved'),
    };
  }

  if (state.verificationStatus === 'PENDING') {
    return {
      label: t('citizen.verification.statusPending'),
      color: '#92400E',
      bg: '#FEF3C7',
      badgeClass: 'border-amber-300 bg-amber-100 text-amber-800',
      icon: <Clock3 size={14} />,
      helper: t('citizen.verification.helperPending'),
    };
  }

  if (state.verificationStatus === 'REJECTED' || state.verificationStatus === 'REUPLOAD_REQUESTED') {
    return {
      label: t('citizen.verification.statusReupload'),
      color: '#9A3412',
      bg: '#FFEDD5',
      badgeClass: 'border-orange-300 bg-orange-100 text-orange-800',
      icon: <XCircle size={14} />,
      helper: t('citizen.verification.helperReupload'),
    };
  }

  return {
    label: t('citizen.verification.statusNotSubmitted'),
    color: '#475569',
    bg: '#F8FAFC',
    badgeClass: 'border-slate-300 bg-slate-50 text-slate-600',
    icon: <Clock3 size={14} />,
    helper: t('citizen.verification.helperNotSubmitted'),
  };
}

function isPreviewableImageUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return value.startsWith('data:image/') || /^https?:\/\//i.test(value);
}

function shortFileName(name: string, max = 28): string {
  if (name.length <= max) {
    return name;
  }
  return `${name.slice(0, max)}....`;
}

type CitizenNotificationItem = {
  icon: React.ReactNode;
  color: string;
  bg: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  action: 'open-my-reports' | 'open-verification' | 'open-home';
  reportId?: string;
};

export default function CitizenVerification() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = getAuthSession();

  const [status, setStatus] = useState<CitizenVerificationState | null>(null);
  const [frontIdFile, setFrontIdFile] = useState<File | null>(null);
  const [backIdFile, setBackIdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { notificationItems: reportNotificationItems } = useCitizenReportNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const frontFileInputRef = useRef<HTMLInputElement | null>(null);
  const backFileInputRef = useRef<HTMLInputElement | null>(null);

  const fullName = session?.user.fullName?.trim() || 'Citizen';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CU';

  const meta = useMemo(() => statusMeta(status, t), [status, t]);
  const frontIdPreviewUrl = useMemo(() => {
    if (!frontIdFile) {
      return null;
    }
    return URL.createObjectURL(frontIdFile);
  }, [frontIdFile]);

  const backIdPreviewUrl = useMemo(() => {
    if (!backIdFile) {
      return null;
    }
    return URL.createObjectURL(backIdFile);
  }, [backIdFile]);

  const handleSignOut = React.useCallback(() => {
    clearAuthSession();
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (frontIdPreviewUrl) {
        URL.revokeObjectURL(frontIdPreviewUrl);
      }
      if (backIdPreviewUrl) {
        URL.revokeObjectURL(backIdPreviewUrl);
      }
    };
  }, [frontIdPreviewUrl, backIdPreviewUrl]);

  const latestUploadedPreviewUrl = useMemo(() => {
    if (!status) {
      return null;
    }

    if (isPreviewableImageUrl(status.idImagePreviewUrl)) {
      return status.idImagePreviewUrl as string;
    }

    if (isPreviewableImageUrl(status.idImageUrl)) {
      return status.idImageUrl as string;
    }

    return null;
  }, [status]);

  const notificationItems = useMemo<CitizenNotificationItem[]>(() => {
    const hasPendingVerificationNotification =
      status?.verificationStatus === 'PENDING'
      || status?.verificationStatus === 'REJECTED'
      || status?.verificationStatus === 'REUPLOAD_REQUESTED';

    const verificationItem = !status?.isVerified && !status?.isBanned
      ? [{
        icon: meta.icon,
        color: meta.color,
        bg: meta.bg,
        title: t('citizen.verification.notifTitle'),
        desc: meta.helper,
        time: t('citizen.dashboard.accountTime'),
        unread: hasPendingVerificationNotification,
        action: 'open-verification' as const,
      }]
      : [];

    const items = [...verificationItem, ...reportNotificationItems].slice(0, 4);
    if (items.length > 0) {
      return items;
    }

    return [{
      icon: <Info size={14} />,
      color: 'var(--primary)',
      bg: '#DBEAFE',
      title: t('citizen.dashboard.noNewAlerts'),
      desc: t('citizen.dashboard.allCaughtUp'),
      time: t('citizen.verification.live'),
      unread: false,
      action: 'open-home',
    }];
  }, [meta.bg, meta.color, meta.helper, meta.icon, reportNotificationItems, status?.isBanned, status?.isVerified]);

  const unreadNotificationCount = notificationItems.filter((item) => item.unread).length;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await profileVerificationApi.getMyStatus();
      setStatus(payload.verification);

      patchAuthSessionUser({
        isVerified: payload.verification.isVerified,
        verificationStatus: payload.verification.verificationStatus,
        verificationRejectionReason: payload.verification.rejectionReason,
        idImageUrl: payload.verification.idImageUrl,
        isBanned: payload.verification.isBanned,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load verification status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleNotificationClick = (item: CitizenNotificationItem) => {
    if (item.action === 'open-my-reports') {
      if (item.reportId) {
        navigate(`/citizen/my-reports?reportId=${encodeURIComponent(item.reportId)}`);
      } else {
        navigate('/citizen/my-reports');
      }
    } else if (item.action === 'open-verification') {
      navigate('/citizen/verification');
    } else {
      navigate('/citizen');
    }

    setNotifOpen(false);
    setProfileMenuOpen(false);
  };

  useEffect(() => {
    const handleOutsideHeaderTap = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.citizen-web-header')) {
        return;
      }
      setNotifOpen(false);
      setProfileMenuOpen(false);
    };

    const handleAnyScroll = () => {
      setNotifOpen(false);
      setProfileMenuOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsideHeaderTap);
    document.addEventListener('scroll', handleAnyScroll, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideHeaderTap);
      document.removeEventListener('scroll', handleAnyScroll, true);
    };
  }, []);

  const onSelectFile = (slot: 'front' | 'back', file: File | null) => {
    setMessage(null);
    if (!file) {
      if (slot === 'front') {
        setFrontIdFile(null);
      } else {
        setBackIdFile(null);
      }
      return;
    }

    if (!isAllowedImageFile(file)) {
      setError(t('citizen.verification.invalidFileType'));
      if (slot === 'front') {
        setFrontIdFile(null);
      } else {
        setBackIdFile(null);
      }
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(t('citizen.verification.fileTooLarge').replace('{{maxSize}}', String(MAX_FILE_SIZE_MB)));
      if (slot === 'front') {
        setFrontIdFile(null);
      } else {
        setBackIdFile(null);
      }
      return;
    }

    setError(null);
    if (slot === 'front') {
      setFrontIdFile(file);
    } else {
      setBackIdFile(file);
    }
  };

  const submit = async () => {
    if (!canUploadVerification) {
      setError(t('citizen.verification.cannotUpload'));
      return;
    }

    if (!frontIdFile || !backIdFile) {
      setError(t('citizen.verification.bothRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await profileVerificationApi.submitMyId(frontIdFile, backIdFile);
      setMessage(payload.message);
      await load();
      setFrontIdFile(null);
      setBackIdFile(null);
      if (frontFileInputRef.current) {
        frontFileInputRef.current.value = '';
      }
      if (backFileInputRef.current) {
        backFileInputRef.current.value = '';
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to upload ID image.');
    } finally {
      setSubmitting(false);
    }
  };

  const isRestricted = Boolean(status?.isBanned || session?.user.isBanned);
  const currentVerificationStatus = status?.verificationStatus ?? null;
  const canUploadVerification = !isRestricted && (
    currentVerificationStatus === null
    || currentVerificationStatus === 'REJECTED'
    || currentVerificationStatus === 'REUPLOAD_REQUESTED'
  );

  return (
    <CitizenPageLayout
      hideVerificationPrompt
      header={
        <header
          className="citizen-web-header bg-primary flex items-center h-[60px] shrink-0 sticky top-0 z-50 shadow-[0_2px_8px_rgba(15,23,42,0.14)]"
        >
          <div
            className="citizen-web-header-inner flex items-center justify-between gap-3 h-full relative box-border"
          >
            <div className="flex items-center gap-[10px]">
              <RoleHomeLogo to="/citizen" ariaLabel="Go to citizen home" alt="TUGON Citizen Portal" />
            </div>

            <div className="flex items-center gap-[10px]">
              <CitizenMobileMenu
                activeKey="profile"
                onNavigate={(key) => {
                  if (key === 'report') navigate('/citizen/report');
                  else if (key === 'myreports') navigate('/citizen/my-reports');
                  else if (key === 'map') navigate('/citizen?tab=map');
                  else if (key === 'profile') navigate('/citizen?tab=profile');
                  else navigate('/citizen');
                }}
              />
              <CitizenNotificationBellTrigger
                unreadCount={unreadNotificationCount}
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileMenuOpen(false);
                }}
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                  }}
                  aria-label="Open profile actions"
                  aria-haspopup="menu"
                  className="w-11 h-11 rounded-md border border-white/20 bg-white/10 flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
                >
                  {initials}
                </button>

                {profileMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Profile actions"
                    className="absolute top-11 right-0 w-[190px] bg-white rounded-md shadow-sm border border-[var(--outline-variant)] overflow-hidden z-[110]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate('/citizen?tab=profile');
                      }}
                      className="w-full text-left px-3 py-[11px] bg-white border-0 border-b border-slate-100 text-slate-800 text-[13px] font-semibold cursor-pointer"
                    >
                      {t('citizen.dashboard.openProfilePage')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-left px-3 py-[11px] bg-white border-0 text-severity-critical text-[13px] font-semibold cursor-pointer"
                    >
                      {t('common.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <CitizenNotificationsPanel
              open={notifOpen}
              unreadCount={unreadNotificationCount}
              items={notificationItems}
              onItemClick={handleNotificationClick}
            />
          </div>
        </header>
      }
      beforeMain={<CitizenDesktopNav activeKey="profile" />}
      mainOnClick={() => {
        if (notifOpen) {
          setNotifOpen(false);
        }
      }}
      mainOnScroll={() => {
        if (notifOpen) {
          setNotifOpen(false);
        }
      }}
      mobileMainPaddingBottom={16}
      desktopMainPaddingBottom={16}
      desktopMainMaxWidth={1320}
    >
      <div className="citizen-content-shell pt-4 pb-6">
        <div className="max-w-[960px] mx-auto grid gap-3">
          <section className="bg-white rounded-lg border border-[var(--outline-variant)] p-4">
            <div className="flex items-center justify-between gap-[10px] flex-wrap">
              <div>
                <h1 className="m-0 text-[22px] font-semibold text-[var(--on-surface)]">{t('citizen.verification.pageTitle')}</h1>
                <p className="mt-1.5 mb-0 text-[var(--on-surface-variant)] text-[13px]">
                  {t('citizen.verification.pageSubtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/citizen?tab=profile')}
                className="border border-[var(--primary-fixed-dim)] rounded-md bg-[var(--primary-fixed)] text-primary text-xs font-semibold px-[10px] py-2 cursor-pointer inline-flex items-center gap-[5px]"
              >
                {t('citizen.verification.backToProfile')} <ChevronRight size={12} />
              </button>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-[var(--outline-variant)] p-4">
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-[10px] py-[6px] text-xs font-semibold ${meta.badgeClass}`}
            >
              {meta.icon} {meta.label}
            </div>

            {loading ? (
              <div className="mt-3 grid gap-[10px]">
                <TextSkeleton rows={2} title={false} className="rounded-lg" />
                <CardSkeleton
                  count={2}
                  lines={2}
                  showImage={false}
                  gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2"
                />
              </div>
            ) : (
              <div className="mt-3 grid gap-[10px]">
                <div className="text-xs text-slate-500">{meta.helper}</div>

                {status?.rejectionReason ? (
                  <div className="bg-[#FFEDD5] border border-[#FDBA74] rounded-md px-[11px] py-[9px] text-[#9A3412] text-xs">
                    {t('citizen.verification.rejectionReason').replace('{{reason}}', status.rejectionReason)}
                  </div>
                ) : null}

                {status?.bannedReason ? (
                  <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-md px-[11px] py-[9px] text-[#991B1B] text-xs">
                    {t('citizen.verification.restrictionReason').replace('{{reason}}', status.bannedReason)}
                  </div>
                ) : null}

                {latestUploadedPreviewUrl ? (
                  <div className="border border-[var(--outline-variant)] rounded-lg p-[10px] bg-[var(--surface-container-low)] grid gap-2">
                    <div className="text-xs font-semibold text-[var(--on-surface)]">{t('citizen.verification.latestIdPreview')}</div>
                    <img
                      src={latestUploadedPreviewUrl}
                      alt="Latest uploaded resident ID"
                      className="w-full max-w-[360px] rounded-md border border-[var(--outline-variant)] object-contain bg-[var(--surface-container-low)]"
                    />
                    <a
                      href={latestUploadedPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-fit no-underline text-primary text-xs font-semibold"
                    >
                      {t('citizen.verification.openFullImage')}
                    </a>
                  </div>
                ) : status?.idImageUrl ? (
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-md px-[11px] py-[9px] text-[#92400E] text-xs leading-[1.55]">
                    {t('citizen.verification.previewUnavailable')}
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg border border-[var(--outline-variant)] p-4">
            <div className="text-sm font-semibold text-[var(--on-surface)] mb-[10px]">
              {t('citizen.verification.acceptedIdsTitle')}
            </div>
            <div className="text-xs text-slate-500 mb-[10px] leading-[1.55]">
              {t('citizen.verification.acceptedIdsDesc')}
            </div>
            <div
              className="mb-[10px] grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[10px]"
            >
              <div className="border border-[#BBF7D0] rounded-lg p-[10px] bg-[#F0FDF4]">
                <div className="text-xs font-semibold text-[#166534] mb-2">
                  {t('citizen.verification.acceptedIdsLabel')}
                </div>
                <div className="grid gap-[6px]">
                  {[
                    'Philippine National ID (PhilSys)',
                    'Philippine Passport',
                    "Driver's License (LTO)",
                    'UMID (SSS/GSIS)',
                    'PRC ID',
                    'Postal ID',
                    "Voter's ID / Voter's Certificate",
                    'Senior Citizen ID',
                    'PWD ID',
                  ].map((idLabel) => (
                    <div
                      key={idLabel}
                      className="border border-[#DCFCE7] rounded-md px-[9px] py-[7px] text-xs font-semibold text-[var(--on-surface)] bg-white flex items-center gap-[7px]"
                    >
                      <CheckCircle2 size={14} color="#16A34A" /> {idLabel}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#FECACA] rounded-lg p-[10px] bg-[#FEF2F2]">
                <div className="text-xs font-semibold text-[#991B1B] mb-2">
                  {t('citizen.verification.notAcceptedIdsLabel')}
                </div>
                <div className="grid gap-[6px]">
                  {[
                    'School ID',
                    'Company / Work ID',
                    'Barangay Clearance',
                    'Expired Government ID',
                    'Photocopy or screenshot of an ID',
                    'Edited, blurred, or partially cropped ID image',
                  ].map((idLabel) => (
                    <div
                      key={idLabel}
                      className="border border-[#FEE2E2] rounded-md px-[9px] py-[7px] text-xs font-semibold text-[var(--on-surface)] bg-white flex items-center gap-[7px]"
                    >
                      <XCircle size={14} color="#DC2626" /> {idLabel}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500 leading-[1.55]">
              {t('citizen.verification.uploadWarning')}
            </div>
          </section>

          <section className="bg-white rounded-lg border border-[var(--outline-variant)] p-4">
            <div className="grid gap-3">
              <label className="text-xs font-semibold text-[var(--on-surface)]">
                {t('citizen.verification.uploadLabel')}
              </label>

              <label htmlFor="citizen-id-upload-front" className="sr-only">
                Front ID image file
              </label>
              <input
                ref={frontFileInputRef}
                id="citizen-id-upload-front"
                type="file"
                title="Upload front ID image"
                aria-label="Upload front ID image"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                disabled={!canUploadVerification || submitting}
                onChange={(event) => onSelectFile('front', event.target.files?.[0] ?? null)}
                className="hidden"
              />

              <label htmlFor="citizen-id-upload-back" className="sr-only">
                Back ID image file
              </label>
              <input
                ref={backFileInputRef}
                id="citizen-id-upload-back"
                type="file"
                title="Upload back ID image"
                aria-label="Upload back ID image"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                disabled={!canUploadVerification || submitting}
                onChange={(event) => onSelectFile('back', event.target.files?.[0] ?? null)}
                className="hidden"
              />

              <div className="border border-[var(--outline-variant)] rounded-lg p-3 bg-[var(--surface-container-low)] grid gap-[10px]">
                <div className="grid gap-[10px]">
                  <div className="grid gap-[6px]">
                    {!frontIdFile ? (
                      <button
                        type="button"
                        disabled={!canUploadVerification || submitting}
                        onClick={() => frontFileInputRef.current?.click()}
                        className="inline-flex w-fit items-center gap-[6px] rounded-md border border-[var(--primary-fixed-dim)] bg-[var(--primary-fixed)] px-3 py-[9px] text-xs font-semibold text-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.65]"
                      >
                        <Paperclip size={14} /> {t('citizen.verification.selectFront')}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-2 border border-[var(--outline-variant)] rounded-md bg-white px-[10px] py-2">
                        <div className="text-xs text-[var(--on-surface)] font-semibold">
                          {t('citizen.verification.frontFile').replace('{{name}}', shortFileName(frontIdFile.name))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFrontIdFile(null);
                            if (frontFileInputRef.current) {
                              frontFileInputRef.current.value = '';
                            }
                          }}
                          className="border-0 rounded-lg bg-slate-200 text-slate-700 w-6 h-6 inline-flex items-center justify-center cursor-pointer shrink-0"
                          aria-label="Clear front ID file"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}

                    {!frontIdFile ? (
                      <div className="text-xs text-slate-500 font-medium">
                        {t('citizen.verification.frontNotSelected')}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-[6px]">
                    {!backIdFile ? (
                      <button
                        type="button"
                        disabled={!canUploadVerification || submitting}
                        onClick={() => backFileInputRef.current?.click()}
                        className="inline-flex w-fit items-center gap-[6px] rounded-md border border-[var(--primary-fixed-dim)] bg-[var(--primary-fixed)] px-3 py-[9px] text-xs font-semibold text-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.65]"
                      >
                        <Paperclip size={14} /> {t('citizen.verification.selectBack')}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-2 border border-[var(--outline-variant)] rounded-md bg-white px-[10px] py-2">
                        <div className="text-xs text-[var(--on-surface)] font-semibold">
                          {t('citizen.verification.backFile').replace('{{name}}', shortFileName(backIdFile.name))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBackIdFile(null);
                            if (backFileInputRef.current) {
                              backFileInputRef.current.value = '';
                            }
                          }}
                          className="border-0 rounded-lg bg-slate-200 text-slate-700 w-6 h-6 inline-flex items-center justify-center cursor-pointer shrink-0"
                          aria-label="Clear back ID file"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}

                    {!backIdFile ? (
                      <div className="text-xs text-slate-500 font-medium">
                        {t('citizen.verification.backNotSelected')}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  {t('citizen.verification.fileConstraints').replace('{{maxSize}}', String(MAX_FILE_SIZE_MB))}
                </div>

                {!canUploadVerification && currentVerificationStatus !== 'REJECTED' && currentVerificationStatus !== 'REUPLOAD_REQUESTED' ? (
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-md px-[11px] py-[9px] text-[#92400E] text-xs leading-[1.55]">
                    {t('citizen.verification.uploadDisabled')}
                  </div>
                ) : null}

                {frontIdPreviewUrl || backIdPreviewUrl ? (
                  <div className="border border-[var(--outline-variant)] rounded-lg p-[10px] bg-white grid gap-2">
                    <div className="text-xs font-semibold text-[var(--on-surface)]">{t('citizen.verification.selectedPreviews')}</div>
                    <div
                      className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[10px]"
                    >
                      {frontIdPreviewUrl ? (
                        <div className="grid gap-[6px]">
                          <div className="text-[11px] font-semibold text-[var(--on-surface-variant)]">{t('citizen.verification.frontIdLabel')}</div>
                          <img
                            src={frontIdPreviewUrl}
                            alt="Selected front ID image preview"
                            className="w-full rounded-md border border-[var(--outline-variant)] object-cover bg-white"
                          />
                        </div>
                      ) : null}
                      {backIdPreviewUrl ? (
                        <div className="grid gap-[6px]">
                          <div className="text-[11px] font-semibold text-[var(--on-surface-variant)]">{t('citizen.verification.backIdLabel')}</div>
                          <img
                            src={backIdPreviewUrl}
                            alt="Selected back ID image preview"
                            className="w-full rounded-md border border-[var(--outline-variant)] object-cover bg-white"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-md px-[11px] py-[9px] text-severity-critical text-xs">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="bg-[#ECFDF3] border border-[#A7F3D0] rounded-md px-[11px] py-[9px] text-[#065F46] text-xs">
                  {message}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void submit()}
                disabled={!frontIdFile || !backIdFile || !canUploadVerification || submitting}
                className="inline-flex w-fit items-center gap-[6px] rounded-md border-0 bg-primary px-[14px] py-[10px] text-[13px] font-semibold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.65]"
              >
                <UploadCloud size={15} /> {submitting ? t('citizen.verification.uploading') : t('citizen.verification.submitBtn')}
              </button>
            </div>
          </section>

        </div>
      </div>
    </CitizenPageLayout>
  );
}
