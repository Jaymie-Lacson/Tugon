import React, { useEffect, useMemo, useRef, useState } from 'react';
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

function statusMeta(state: CitizenVerificationState | null) {
  if (!state) {
    return {
      label: 'Not Submitted',
      color: '#475569',
      bg: '#F8FAFC',
      icon: <Clock3 size={14} />,
      helper: 'Submit one valid ID so officials can review your account.',
    };
  }

  if (state.isBanned) {
    return {
      label: 'Restricted',
      color: '#991B1B',
      bg: '#FEE2E2',
      icon: <ShieldAlert size={14} />,
      helper: 'This account is currently restricted.',
    };
  }

  if (state.isVerified) {
    return {
      label: 'Verified',
      color: '#065F46',
      bg: '#DCFCE7',
      icon: <CheckCircle2 size={14} />,
      helper: 'Your resident ID has been approved.',
    };
  }

  if (state.verificationStatus === 'PENDING') {
    return {
      label: 'Pending Review',
      color: '#92400E',
      bg: '#FEF3C7',
      icon: <Clock3 size={14} />,
      helper: 'Your uploaded ID is currently under barangay review.',
    };
  }

  if (state.verificationStatus === 'REJECTED' || state.verificationStatus === 'REUPLOAD_REQUESTED') {
    return {
      label: 'Re-upload Required',
      color: '#9A3412',
      bg: '#FFEDD5',
      icon: <XCircle size={14} />,
      helper: 'Please upload a clearer or valid ID image.',
    };
  }

  return {
    label: 'Not Submitted',
    color: '#475569',
    bg: '#F8FAFC',
    icon: <Clock3 size={14} />,
    helper: 'Submit one valid ID so officials can review your account.',
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const frontFileInputRef = useRef<HTMLInputElement | null>(null);
  const backFileInputRef = useRef<HTMLInputElement | null>(null);

  const fullName = session?.user.fullName?.trim() || 'Citizen';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CU';

  const meta = useMemo(() => statusMeta(status), [status]);
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
        title: 'Verification Update',
        desc: meta.helper,
        time: 'Account',
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
      title: 'No new alerts',
      desc: 'You are all caught up for now.',
      time: 'Live',
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
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleOutsideHeaderTap = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.citizen-web-header')) {
        return;
      }
      setNotifOpen(false);
      setProfileMenuOpen(false);
      setMobileMenuOpen(false);
    };

    const handleAnyScroll = () => {
      setNotifOpen(false);
      setProfileMenuOpen(false);
      setMobileMenuOpen(false);
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
      setError('Please upload a JPG, PNG, WEBP, HEIC, or HEIF image.');
      if (slot === 'front') {
        setFrontIdFile(null);
      } else {
        setBackIdFile(null);
      }
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
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
      setError('You can upload again only when your previous verification is rejected or marked for re-upload.');
      return;
    }

    if (!frontIdFile || !backIdFile) {
      setError('Please upload both the front and back images of your ID.');
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
            style={{ padding: '0 var(--citizen-content-gutter)' }}
          >
            <div className="flex items-center gap-[10px]">
              <RoleHomeLogo to="/citizen" ariaLabel="Go to citizen home" alt="TUGON Citizen Portal" />
            </div>

            <div className="flex items-center gap-[10px]">
              <CitizenMobileMenu
                activeKey="profile"
                open={mobileMenuOpen}
                onToggle={() => {
                  setMobileMenuOpen((prev) => !prev);
                  setNotifOpen(false);
                  setProfileMenuOpen(false);
                }}
                onNavigate={(key) => {
                  setMobileMenuOpen(false);
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
                  setMobileMenuOpen(false);
                }}
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                    setMobileMenuOpen(false);
                  }}
                  aria-label="Open profile actions"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  className="w-9 h-9 rounded-[10px] border-0 bg-severity-medium flex items-center justify-center text-white font-extrabold text-sm cursor-pointer"
                >
                  {initials}
                </button>

                {profileMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Profile actions"
                    className="absolute top-11 right-0 w-[190px] bg-white rounded-xl shadow-[0_8px_18px_rgba(15,23,42,0.12)] border border-slate-200 overflow-hidden z-[110]"
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
                      Open profile page
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-left px-3 py-[11px] bg-white border-0 text-severity-critical text-[13px] font-bold cursor-pointer"
                    >
                      Sign out
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
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }}
      mainOnScroll={() => {
        if (notifOpen) {
          setNotifOpen(false);
        }
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }}
      mobileMainPaddingBottom={16}
      desktopMainPaddingBottom={16}
      desktopMainMaxWidth={1320}
    >
      <div className="citizen-content-shell pt-4 pb-6">
        <div className="max-w-[960px] mx-auto grid gap-3">
          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-[10px] flex-wrap">
              <div>
                <h1 className="m-0 text-[22px] text-slate-800">Resident ID Verification</h1>
                <p className="mt-1.5 mb-0 text-slate-500 text-[13px]">
                  Submit one valid ID photo for barangay review. You can still report incidents while your account is pending.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/citizen?tab=profile')}
                className="border border-blue-200 rounded-[10px] bg-blue-50 text-primary text-xs font-bold px-[10px] py-2 cursor-pointer inline-flex items-center gap-[5px]"
              >
                Back to Profile <ChevronRight size={12} />
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <div
              className="inline-flex items-center gap-2 px-[10px] py-[6px] rounded-lg font-bold text-xs"
              style={{ border: `1px solid ${meta.color}33`, background: meta.bg, color: meta.color }}
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
                  <div className="bg-[#FFEDD5] border border-[#FDBA74] rounded-[10px] px-[11px] py-[9px] text-[#9A3412] text-xs">
                    Rejection reason: {status.rejectionReason}
                  </div>
                ) : null}

                {status?.bannedReason ? (
                  <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-[10px] px-[11px] py-[9px] text-[#991B1B] text-xs">
                    Account restriction reason: {status.bannedReason}
                  </div>
                ) : null}

                {latestUploadedPreviewUrl ? (
                  <div className="border border-slate-200 rounded-xl p-[10px] bg-slate-50 grid gap-2">
                    <div className="text-xs font-bold text-slate-700">Latest Uploaded ID Preview</div>
                    <img
                      src={latestUploadedPreviewUrl}
                      alt="Latest uploaded resident ID"
                      className="w-full max-w-[360px] rounded-[10px] border border-slate-200 object-cover bg-white"
                    />
                    <a
                      href={latestUploadedPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-fit no-underline text-primary text-xs font-bold"
                    >
                      Open full image in new tab
                    </a>
                  </div>
                ) : status?.idImageUrl ? (
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] px-[11px] py-[9px] text-[#92400E] text-xs leading-[1.55]">
                    Preview is currently unavailable for this uploaded ID on your environment.
                    Configure private storage preview signing (see steps below) or use a public ID bucket to enable image preview.
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-bold text-slate-800 mb-[10px]">
              Accepted Valid IDs in the Philippines
            </div>
            <div className="text-xs text-slate-500 mb-[10px] leading-[1.55]">
              For faster review, upload one clear and readable government-issued ID. Make sure the photo and full name are visible.
            </div>
            <div
              className="grid gap-[10px] mb-[10px]"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
            >
              <div className="border border-[#BBF7D0] rounded-xl p-[10px] bg-[#F0FDF4]">
                <div className="text-xs font-bold text-[#166534] mb-2">
                  Accepted IDs
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
                      className="border border-[#DCFCE7] rounded-[10px] px-[9px] py-[7px] text-xs font-semibold text-slate-700 bg-white flex items-center gap-[7px]"
                    >
                      <CheckCircle2 size={14} color="#16A34A" /> {idLabel}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#FECACA] rounded-xl p-[10px] bg-[#FEF2F2]">
                <div className="text-xs font-bold text-[#991B1B] mb-2">
                  Not Accepted IDs
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
                      className="border border-[#FEE2E2] rounded-[10px] px-[9px] py-[7px] text-xs font-semibold text-slate-700 bg-white flex items-center gap-[7px]"
                    >
                      <XCircle size={14} color="#DC2626" /> {idLabel}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500 leading-[1.55]">
              Do not upload blurred, cropped, or edited images. Submissions with unreadable details may be rejected and require re-upload.
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="grid gap-3">
              <label className="text-xs font-bold text-slate-700">
                Upload Valid ID (Front and Back)
              </label>

              <input
                ref={frontFileInputRef}
                id="citizen-id-upload-front"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                disabled={!canUploadVerification || submitting}
                onChange={(event) => onSelectFile('front', event.target.files?.[0] ?? null)}
                className="hidden"
              />

              <input
                ref={backFileInputRef}
                id="citizen-id-upload-back"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                disabled={!canUploadVerification || submitting}
                onChange={(event) => onSelectFile('back', event.target.files?.[0] ?? null)}
                className="hidden"
              />

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 grid gap-[10px]">
                <div className="grid gap-[10px]">
                  <div className="grid gap-[6px]">
                    {!frontIdFile ? (
                      <button
                        type="button"
                        disabled={!canUploadVerification || submitting}
                        onClick={() => frontFileInputRef.current?.click()}
                        className="border border-blue-200 rounded-[10px] bg-blue-50 text-primary text-xs font-bold px-3 py-[9px] inline-flex items-center gap-[6px] w-fit"
                        style={{
                          cursor: !canUploadVerification || submitting ? 'not-allowed' : 'pointer',
                          opacity: !canUploadVerification || submitting ? 0.65 : 1,
                        }}
                      >
                        <Paperclip size={14} /> Select Front ID Image
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-[10px] bg-white px-[10px] py-2">
                        <div className="text-xs text-slate-800 font-semibold">
                          Front: {shortFileName(frontIdFile.name)}
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
                        Front image not selected
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-[6px]">
                    {!backIdFile ? (
                      <button
                        type="button"
                        disabled={!canUploadVerification || submitting}
                        onClick={() => backFileInputRef.current?.click()}
                        className="border border-blue-200 rounded-[10px] bg-blue-50 text-primary text-xs font-bold px-3 py-[9px] inline-flex items-center gap-[6px] w-fit"
                        style={{
                          cursor: !canUploadVerification || submitting ? 'not-allowed' : 'pointer',
                          opacity: !canUploadVerification || submitting ? 0.65 : 1,
                        }}
                      >
                        <Paperclip size={14} /> Select Back ID Image
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-[10px] bg-white px-[10px] py-2">
                        <div className="text-xs text-slate-800 font-semibold">
                          Back: {shortFileName(backIdFile.name)}
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
                        Back image not selected
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Accepted: JPG, PNG, WEBP, HEIC, HEIF. Max size: {MAX_FILE_SIZE_MB}MB each. Both front and back images are required.
                </div>

                {!canUploadVerification && currentVerificationStatus !== 'REJECTED' && currentVerificationStatus !== 'REUPLOAD_REQUESTED' ? (
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] px-[11px] py-[9px] text-[#92400E] text-xs leading-[1.55]">
                    You already submitted your ID verification. Upload is disabled until officials reject or request a re-upload.
                  </div>
                ) : null}

                {frontIdPreviewUrl || backIdPreviewUrl ? (
                  <div className="border border-slate-200 rounded-xl p-[10px] bg-white grid gap-2">
                    <div className="text-xs font-bold text-slate-700">Selected Image Previews</div>
                    <div
                      className="grid gap-[10px]"
                      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
                    >
                      {frontIdPreviewUrl ? (
                        <div className="grid gap-[6px]">
                          <div className="text-[11px] font-bold text-slate-600">Front ID</div>
                          <img
                            src={frontIdPreviewUrl}
                            alt="Selected front ID image preview"
                            className="w-full rounded-[10px] border border-slate-200 object-cover bg-white"
                          />
                        </div>
                      ) : null}
                      {backIdPreviewUrl ? (
                        <div className="grid gap-[6px]">
                          <div className="text-[11px] font-bold text-slate-600">Back ID</div>
                          <img
                            src={backIdPreviewUrl}
                            alt="Selected back ID image preview"
                            className="w-full rounded-[10px] border border-slate-200 object-cover bg-white"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] px-[11px] py-[9px] text-severity-critical text-xs">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="bg-[#ECFDF3] border border-[#A7F3D0] rounded-[10px] px-[11px] py-[9px] text-[#065F46] text-xs">
                  {message}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void submit()}
                disabled={!frontIdFile || !backIdFile || !canUploadVerification || submitting}
                className="border-0 rounded-[10px] bg-primary text-white text-[13px] font-bold px-[14px] py-[10px] w-fit inline-flex items-center gap-[6px]"
                style={{
                  cursor: !frontIdFile || !backIdFile || !canUploadVerification || submitting ? 'not-allowed' : 'pointer',
                  opacity: !frontIdFile || !backIdFile || !canUploadVerification || submitting ? 0.65 : 1,
                }}
              >
                <UploadCloud size={15} /> {submitting ? 'Uploading...' : 'Submit ID for Review'}
              </button>
            </div>
          </section>

        </div>
      </div>
    </CitizenPageLayout>
  );
}
