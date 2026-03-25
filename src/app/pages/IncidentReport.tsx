import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import {
  ChevronLeft, Check, MapPin, Navigation,
  Flame, Wind, Volume2, AlertCircle, AlertTriangle, MoreHorizontal,
  Camera, Mic, MicOff, Square, Trash2,
  FileText, User, Clock, CheckCircle2, Info, X, Phone,
} from 'lucide-react';
import { CitizenPageLayout } from '../components/CitizenPageLayout';
import { CitizenDesktopNav } from '../components/CitizenDesktopNav';
import { CitizenMobileMenu } from '../components/CitizenMobileMenu';
import { CitizenNotificationBellTrigger, CitizenNotificationsPanel } from '../components/CitizenNotifications';
import { useCitizenReportNotifications } from '../hooks/useCitizenReportNotifications';
import { citizenReportsApi } from '../services/citizenReportsApi';
import { clearAuthSession, getAuthSession } from '../utils/authSession';
import {
  getCategoryTaxonomy,
  MEDIATION_WARNING,
  REPORT_TAXONOMY,
  type ReportCategory,
  type ReportSubcategory,
} from '../data/reportTaxonomy';
import {
  OUTSIDE_REGISTERED_BARANGAY_LABEL,
  validateIncidentReportStep,
} from '../utils/incidentReportValidation';

/* MAIN EXPORT */
export default function IncidentReport() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const fullName = session?.user.fullName?.trim() || 'Citizen User';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CU';
  const [step, setStep]         = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedReportId, setSubmittedReportId] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { notificationItems: reportNotificationItems } = useCitizenReportNotifications();
  const contentRef              = useRef<HTMLDivElement>(null);

  const handleNotificationClick = React.useCallback((item: { action?: 'open-my-reports' | 'open-home'; reportId?: string }) => {
    if (item.action === 'open-my-reports') {
      if (item.reportId) {
        navigate(`/citizen/my-reports?reportId=${encodeURIComponent(item.reportId)}`);
      } else {
        navigate('/citizen/my-reports');
      }
    } else {
      navigate('/citizen');
    }

    setNotifOpen(false);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
  }, [navigate]);

  const handleSignOut = React.useCallback(() => {
    clearAuthSession();
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  const [form, setForm] = useState<ReportForm>({
    category: null, subcategory: null, requiresMediation: false, mediationWarning: null,
    severity: null, pin: null, address: '',
    description: '', quickTags: [], affectedCount: null,
    photoPreviews: [], photoFiles: [],
    audioUrl: null, audioBlob: null,
  });

  // Scroll content area to top on step change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const notificationItems = useMemo(() => {
    if (submitted) {
      const submittedItem = {
        icon: <FileText size={14} />,
        color: '#1E3A8A',
        bg: '#DBEAFE',
        title: 'Report submitted',
        desc: submittedReportId ? `Ticket ${submittedReportId} has been created.` : 'Your incident report was submitted successfully.',
        time: 'Just now',
        unread: true,
        action: 'open-my-reports' as const,
        reportId: submittedReportId || undefined,
      };

      return [submittedItem, ...reportNotificationItems].slice(0, 4);
    }

    return reportNotificationItems;
  }, [reportNotificationItems, submitted, submittedReportId]);

  const unreadNotificationCount = notificationItems.filter((item) => item.unread).length;

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

  const stepValidationMessage = validateIncidentReportStep(step, {
    category: form.category,
    subcategory: form.subcategory,
    severity: form.severity,
    pin: form.pin,
    isPinWithinSupportedBarangay: isPinWithinSupportedBarangay(form.pin),
    address: form.address,
    description: form.description,
    photoPreviews: form.photoPreviews,
  });
  const canProceed = !stepValidationMessage;
  const voiceAllowed = (form.category === 'Noise') || (form.subcategory?.toLowerCase().includes('noise') ?? false);
  const enableMultipartEvidenceUpload = String(import.meta.env.VITE_ENABLE_MULTIPART_EVIDENCE_UPLOAD ?? '1') !== '0';
  const nextButtonStateClass = (submitting || (!canProceed && step < 5))
    ? 'is-disabled'
    : step === 5
      ? 'is-submit'
      : 'is-default';
  const nextButtonWidthClass = step === 1 ? 'is-single' : 'is-wide';

  useEffect(() => {
    if (voiceAllowed) {
      return;
    }

    setForm((prev) => {
      if (!prev.audioBlob && !prev.audioUrl) {
        return prev;
      }
      return {
        ...prev,
        audioBlob: null,
        audioUrl: null,
      };
    });
  }, [voiceAllowed]);

  const submitReport = async () => {
    if (!form.category || !form.subcategory) {
      setSubmitError('Category and subcategory are required.');
      return;
    }

    setSubmitError('');
    setSubmitting(true);

    try {
      const photoPayloads: Array<{ fileName: string; mimeType: string; dataUrl: string }> = [];
      let encodedAudio: { fileName: string; mimeType: string; dataUrl: string } | null = null;

      if (!enableMultipartEvidenceUpload) {
        const MAX_EVIDENCE_PAYLOAD_BYTES = 450_000;
        let runningEvidenceBytes = 0;

        for (const file of form.photoFiles.slice(0, 2)) {
          const compressedDataUrl = await compressImageToDataUrl(file);
          const candidateSize = compressedDataUrl.length;
          if (runningEvidenceBytes + candidateSize > MAX_EVIDENCE_PAYLOAD_BYTES) {
            continue;
          }

          photoPayloads.push({
            fileName: file.name,
            mimeType: 'image/jpeg',
            dataUrl: compressedDataUrl,
          });
          runningEvidenceBytes += candidateSize;
        }

        if (photoPayloads.length === 0) {
          throw new Error('Selected photos are too large to upload. Please attach at least one smaller photo.');
        }

        if (form.audioBlob) {
          const audioDataUrl = await blobToDataUrl(form.audioBlob);
          if (runningEvidenceBytes + audioDataUrl.length <= MAX_EVIDENCE_PAYLOAD_BYTES) {
            encodedAudio = {
              fileName: 'voice-note.webm',
              mimeType: form.audioBlob.type || 'audio/webm',
              dataUrl: audioDataUrl,
            };
          }
        }
      }

      const selectedPhotoCount = form.photoFiles.length;

      const response = await citizenReportsApi.submitReport({
        category: form.category,
        subcategory: form.subcategory,
        type: toLegacyIncidentType(form.category),
        requiresMediation: form.requiresMediation,
        mediationWarning: form.mediationWarning,
        latitude: form.pin?.lat ?? Number.NaN,
        longitude: form.pin?.lng ?? Number.NaN,
        location: form.address.trim() || `${form.pin?.barangay ?? 'Unknown location'}`,
        description: form.description.trim(),
        severity: form.severity ?? 'medium',
        affectedCount: form.affectedCount,
        photoCount: enableMultipartEvidenceUpload ? selectedPhotoCount : photoPayloads.length,
        hasAudio: Boolean(form.audioBlob),
        photos: !enableMultipartEvidenceUpload ? photoPayloads : undefined,
        audio: !enableMultipartEvidenceUpload ? encodedAudio : null,
        photoFiles: enableMultipartEvidenceUpload ? form.photoFiles.slice(0, 2) : undefined,
        audioFile: enableMultipartEvidenceUpload && form.audioBlob
          ? new File([form.audioBlob], 'voice-note.webm', {
              type: form.audioBlob.type || 'audio/webm',
            })
          : null,
      });

      setSubmittedReportId(response.report.id);
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit report right now.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = async () => {
    if (!canProceed && step < 5) {
      return;
    }

    if (step < 5) {
      setStep(s => s + 1);
      return;
    }

    await submitReport();
  };

  const goBack = () => {
    if (step > 1) setStep(s => s - 1);
    else navigate('/citizen');
  };

  const stepContent: Record<number, React.ReactNode> = {
    1: <Step1WithValidation form={form} setForm={setForm} validationError={step === 1 ? stepValidationMessage || undefined : undefined} />,
    2: <Step2 form={form} setForm={setForm} validationError={step === 2 ? stepValidationMessage || undefined : undefined} />,
    3: <Step3 form={form} setForm={setForm} validationError={step === 3 ? stepValidationMessage || undefined : undefined} />,
    4: <Step4 form={form} setForm={setForm} showVoiceRecorder={voiceAllowed} validationError={step === 4 ? stepValidationMessage || undefined : undefined} />,
    5: <Step5 form={form} reporterName={fullName} reporterBarangayCode={session?.user.barangayCode ?? null} />,
  };

  return (
    <>
      {submitted && <SuccessScreen reportId={submittedReportId} onDone={() => navigate('/citizen')} />}

      <CitizenPageLayout
        header={
          <header
            className="citizen-web-header citizen-report-header"
          >
            <div
              className="citizen-web-header-inner citizen-report-header-inner"
            >
              <button
                onClick={() => navigate('/citizen')}
                className="citizen-report-home-btn"
                aria-label="Go to citizen home"
              >
                <img
                  src="/tugon-header-logo.svg"
                  alt="TUGON Citizen Portal"
                  className="citizen-report-home-logo"
                />
              </button>

              <div className="citizen-report-header-actions">
                <CitizenMobileMenu
                  activeKey="report"
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
                    setNotifOpen((prev) => !prev);
                    setProfileMenuOpen(false);
                    setMobileMenuOpen(false);
                  }}
                />
                <div className="citizen-report-profile-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen((prev) => !prev);
                      setNotifOpen(false);
                      setMobileMenuOpen(false);
                    }}
                    aria-label="Open profile actions"
                    aria-haspopup="menu"
                    className="citizen-report-profile-btn"
                  >
                    {initials}
                  </button>

                  {profileMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Profile actions"
                      className="citizen-report-profile-menu"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/citizen?tab=profile');
                        }}
                        className="citizen-report-profile-menu-item"
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
                        className="citizen-report-profile-menu-item citizen-report-profile-menu-item-danger"
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
        beforeMain={
          <>
            <CitizenDesktopNav activeKey="report" />
            <StepIndicator current={step} />
          </>
        }
        afterMain={
          <>
            <div className="citizen-report-footer">
              <div className="citizen-report-footer-actions">
              {step > 1 && (
                <button
                  onClick={goBack}
                  className="citizen-report-back-btn"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}

              <button
                onClick={goNext}
                disabled={submitting || (!canProceed && step < 5)}
                className={`citizen-report-next-btn ${nextButtonStateClass} ${nextButtonWidthClass}`}
              >
                {submitting ? (
                  <>Submitting...</>
                ) : step === 5 ? (
                  <>Submit Report</>
                ) : step === 4 ? (
                  <>Continue to Review {'->'}</>
                ) : (
                  <>Continue {'->'}</>
                )}
              </button>
              </div>
            </div>
          </>
        }
        mobileMainPaddingBottom={96}
        desktopMainPaddingBottom={24}
        desktopMainMaxWidth={1320}
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
      >
        {submitError && step === 5 && (
          <div className="citizen-content-shell citizen-report-submit-error">
            {submitError}
          </div>
        )}
        <div className="citizen-report-content-wrap">
          {stepContent[step]}
        </div>
      </CitizenPageLayout>
    </>
  );
}

