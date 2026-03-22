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
    const verificationItem = !status?.isVerified && !status?.isBanned
      ? [{
        icon: meta.icon,
        color: meta.color,
        bg: meta.bg,
        title: 'Verification Update',
        desc: meta.helper,
        time: 'Account',
        unread: true,
        action: 'open-verification' as const,
      }]
      : [];

    const items = [...verificationItem, ...reportNotificationItems].slice(0, 4);
    if (items.length > 0) {
      return items;
    }

    return [{
      icon: <Info size={14} />,
      color: '#1E3A8A',
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
      navigate('/citizen/my-reports');
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
          className="citizen-web-header"
          style={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%)',
            display: 'flex',
            alignItems: 'center',
            height: 60,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 50,
            boxShadow: '0 2px 12px rgba(30,58,138,0.4)',
          }}
        >
          <div
            className="citizen-web-header-inner"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '0 var(--citizen-content-gutter)',
              height: '100%',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Citizen Portal"
                style={{ height: 38, width: 'auto', display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              <div style={{ position: 'relative' }}>
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
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #B4730A, #D97706)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {initials}
                </button>

                {profileMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Profile actions"
                    style={{
                      position: 'absolute',
                      top: 44,
                      right: 0,
                      width: 190,
                      background: '#fff',
                      borderRadius: 12,
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      zIndex: 110,
                    }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate('/citizen?tab=profile');
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '11px 12px',
                        background: '#fff',
                        border: 'none',
                        borderBottom: '1px solid #F1F5F9',
                        color: '#1E293B',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
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
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '11px 12px',
                        background: '#fff',
                        border: 'none',
                        color: '#B91C1C',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
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
      <div className="citizen-content-shell" style={{ paddingTop: 16, paddingBottom: 24 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 12 }}>
          <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, color: '#1E293B' }}>Resident ID Verification</h1>
                <p style={{ marginTop: 6, marginBottom: 0, color: '#64748B', fontSize: 13 }}>
                  Submit one valid ID photo for barangay review. You can still report incidents while your account is pending.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/citizen?tab=profile')}
                style={{
                  border: '1px solid #BFDBFE',
                  borderRadius: 10,
                  background: '#EFF6FF',
                  color: '#1E3A8A',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                Back to Profile <ChevronRight size={12} />
              </button>
            </div>
          </section>

          <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 16 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 700, fontSize: 12 }}>
              {meta.icon} {meta.label}
            </div>

            {loading ? (
              <p style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>Loading verification status...</p>
            ) : (
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 12, color: '#64748B' }}>{meta.helper}</div>

                {status?.rejectionReason ? (
                  <div style={{ background: '#FFEDD5', border: '1px solid #FDBA74', borderRadius: 10, padding: '9px 11px', color: '#9A3412', fontSize: 12 }}>
                    Rejection reason: {status.rejectionReason}
                  </div>
                ) : null}

                {status?.bannedReason ? (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '9px 11px', color: '#991B1B', fontSize: 12 }}>
                    Account restriction reason: {status.bannedReason}
                  </div>
                ) : null}

                {latestUploadedPreviewUrl ? (
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: 10,
                      background: '#F8FAFC',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Latest Uploaded ID Preview</div>
                    <img
                      src={latestUploadedPreviewUrl}
                      alt="Latest uploaded resident ID"
                      style={{
                        width: '100%',
                        maxWidth: 360,
                        borderRadius: 10,
                        border: '1px solid #E2E8F0',
                        objectFit: 'cover',
                        background: '#fff',
                      }}
                    />
                    <a
                      href={latestUploadedPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ width: 'fit-content', textDecoration: 'none', color: '#1E3A8A', fontSize: 12, fontWeight: 700 }}
                    >
                      Open full image in new tab
                    </a>
                  </div>
                ) : status?.idImageUrl ? (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '9px 11px', color: '#92400E', fontSize: 12, lineHeight: 1.55 }}>
                    Preview is currently unavailable for this uploaded ID on your environment.
                    Configure private storage preview signing (see steps below) or use a public ID bucket to enable image preview.
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section
            style={{
              background: '#fff',
              borderRadius: 14,
              border: '1px solid #E2E8F0',
              padding: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 10 }}>
              Accepted Valid IDs in the Philippines
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10, lineHeight: 1.55 }}>
              For faster review, upload one clear and readable government-issued ID. Make sure the photo and full name are visible.
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  border: '1px solid #BBF7D0',
                  borderRadius: 12,
                  padding: 10,
                  background: '#F0FDF4',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
                  Accepted IDs
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
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
                      style={{
                        border: '1px solid #DCFCE7',
                        borderRadius: 10,
                        padding: '7px 9px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <CheckCircle2 size={14} color="#16A34A" /> {idLabel}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  border: '1px solid #FECACA',
                  borderRadius: 12,
                  padding: 10,
                  background: '#FEF2F2',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>
                  Not Accepted IDs
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
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
                      style={{
                        border: '1px solid #FEE2E2',
                        borderRadius: 10,
                        padding: '7px 9px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <XCircle size={14} color="#DC2626" /> {idLabel}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.55 }}>
              Do not upload blurred, cropped, or edited images. Submissions with unreadable details may be rejected and require re-upload.
            </div>
          </section>

          <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 16 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                Upload Valid ID (Front and Back)
              </label>

              <input
                ref={frontFileInputRef}
                id="citizen-id-upload-front"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                disabled={!canUploadVerification || submitting}
                onChange={(event) => onSelectFile('front', event.target.files?.[0] ?? null)}
                style={{ display: 'none' }}
              />

              <input
                ref={backFileInputRef}
                id="citizen-id-upload-back"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                disabled={!canUploadVerification || submitting}
                onChange={(event) => onSelectFile('back', event.target.files?.[0] ?? null)}
                style={{ display: 'none' }}
              />

              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 12,
                  background: '#F8FAFC',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {!frontIdFile ? (
                      <button
                        type="button"
                        disabled={!canUploadVerification || submitting}
                        onClick={() => frontFileInputRef.current?.click()}
                        style={{
                          border: '1px solid #BFDBFE',
                          borderRadius: 10,
                          background: '#EFF6FF',
                          color: '#1E3A8A',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '9px 12px',
                          cursor: !canUploadVerification || submitting ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          opacity: !canUploadVerification || submitting ? 0.65 : 1,
                          width: 'fit-content',
                        }}
                      >
                        <Paperclip size={14} /> Select Front ID Image
                      </button>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          border: '1px solid #E2E8F0',
                          borderRadius: 10,
                          background: '#fff',
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 600 }}>
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
                          style={{
                            border: 'none',
                            borderRadius: 8,
                            background: '#E2E8F0',
                            color: '#334155',
                            width: 24,
                            height: 24,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                          aria-label="Clear front ID file"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}

                    {!frontIdFile ? (
                      <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                        Front image not selected
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: 'grid', gap: 6 }}>
                    {!backIdFile ? (
                      <button
                        type="button"
                        disabled={!canUploadVerification || submitting}
                        onClick={() => backFileInputRef.current?.click()}
                        style={{
                          border: '1px solid #BFDBFE',
                          borderRadius: 10,
                          background: '#EFF6FF',
                          color: '#1E3A8A',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '9px 12px',
                          cursor: !canUploadVerification || submitting ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          opacity: !canUploadVerification || submitting ? 0.65 : 1,
                          width: 'fit-content',
                        }}
                      >
                        <Paperclip size={14} /> Select Back ID Image
                      </button>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          border: '1px solid #E2E8F0',
                          borderRadius: 10,
                          background: '#fff',
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 600 }}>
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
                          style={{
                            border: 'none',
                            borderRadius: 8,
                            background: '#E2E8F0',
                            color: '#334155',
                            width: 24,
                            height: 24,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                          aria-label="Clear back ID file"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}

                    {!backIdFile ? (
                      <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                        Back image not selected
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Accepted: JPG, PNG, WEBP, HEIC, HEIF. Max size: {MAX_FILE_SIZE_MB}MB each. Both front and back images are required.
                </div>

                {!canUploadVerification && currentVerificationStatus !== 'REJECTED' && currentVerificationStatus !== 'REUPLOAD_REQUESTED' ? (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '9px 11px', color: '#92400E', fontSize: 12, lineHeight: 1.55 }}>
                    You already submitted your ID verification. Upload is disabled until officials reject or request a re-upload.
                  </div>
                ) : null}

                {frontIdPreviewUrl || backIdPreviewUrl ? (
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: 10,
                      background: '#fff',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Selected Image Previews</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                      {frontIdPreviewUrl ? (
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Front ID</div>
                          <img
                            src={frontIdPreviewUrl}
                            alt="Selected front ID image preview"
                            style={{
                              width: '100%',
                              borderRadius: 10,
                              border: '1px solid #E2E8F0',
                              objectFit: 'cover',
                              background: '#fff',
                            }}
                          />
                        </div>
                      ) : null}
                      {backIdPreviewUrl ? (
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Back ID</div>
                          <img
                            src={backIdPreviewUrl}
                            alt="Selected back ID image preview"
                            style={{
                              width: '100%',
                              borderRadius: 10,
                              border: '1px solid #E2E8F0',
                              objectFit: 'cover',
                              background: '#fff',
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              {error ? (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '9px 11px', color: '#B91C1C', fontSize: 12 }}>
                  {error}
                </div>
              ) : null}

              {message ? (
                <div style={{ background: '#ECFDF3', border: '1px solid #A7F3D0', borderRadius: 10, padding: '9px 11px', color: '#065F46', fontSize: 12 }}>
                  {message}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void submit()}
                disabled={!frontIdFile || !backIdFile || !canUploadVerification || submitting}
                style={{
                  border: 'none',
                  borderRadius: 10,
                  background: '#1E3A8A',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '10px 14px',
                  width: 'fit-content',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
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
