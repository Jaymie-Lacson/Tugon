import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation, LanguageToggle } from '../../i18n';
import {
  ChevronLeft, Check, FileText, Phone, Clock, CheckCircle2,
} from 'lucide-react';
import { CitizenPageLayout } from '../../components/CitizenPageLayout';
import { CitizenDesktopNav } from '../../components/CitizenDesktopNav';
import { CitizenMobileMenu } from '../../components/CitizenMobileMenu';
import { CitizenNotificationBellTrigger, CitizenNotificationsPanel } from '../../components/CitizenNotifications';
import { RoleHomeLogo } from '../../components/RoleHomeLogo';
import { useCitizenReportNotifications } from '../../hooks/useCitizenReportNotifications';
import { citizenReportsApi } from '../../services/citizenReportsApi';
import { clearAuthSession, getAuthSession } from '../../utils/authSession';
import { ThemeToggle } from '../../components/ThemeToggle';
import {
  STEP_LABEL_KEYS,
  STEP_REQUIREMENTS,
  compressImageToDataUrl,
  blobToDataUrl,
  toLegacyIncidentType,
} from './shared';
import { Step1WithValidation } from './Step1Type';
import { Step2 } from './Step2Location';
import { Step3 } from './Step3Description';
import { Step4 } from './Step4Evidence';
import { Step5 } from './Step5Review';
import type { ReportForm } from './types';

function StepIndicator({ current }: { current: number }) {
  const { t } = useTranslation();
  return (
    <div className="citizen-web-strip z-40 bg-card border-b border-border pt-3 pb-0 px-4 lg:px-5">
      <div className="citizen-web-strip-inner flex items-start">
        {STEP_LABEL_KEYS.map((labelKey, i) => {
          const label = t(labelKey);
          const s = i + 1;
          const done = s < current;
          const active = s === current;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'size-8 shrink-0 rounded-[9px] flex items-center justify-center text-xs font-bold transition-all duration-300 ease-out',
                    done
                      ? 'bg-primary text-primary-foreground border-[2.5px] border-primary'
                      : active
                        ? 'bg-primary text-primary-foreground border-[2.5px] border-[#60A5FA]'
                        : 'bg-muted text-muted-foreground border-2 border-border',
                  ].join(' ')}
                >
                  {done ? <Check size={14} strokeWidth={3} /> : s}
                </div>
                <span
                  className={[
                    'text-[9px] whitespace-nowrap tracking-[0.02em]',
                    active ? 'font-bold text-primary' : done ? 'font-medium text-muted-foreground' : 'font-medium text-muted-foreground/50',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABEL_KEYS.length - 1 && (
                <div className="flex-1 h-[2.5px] mt-[14px] mx-[3px] rounded overflow-hidden bg-muted">
                  <div className={['h-full bg-primary transition-[width] duration-300 ease-out', done ? 'w-full' : 'w-0'].join(' ')} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function SuccessScreen({ onDone, reportId }: { onDone: () => void; reportId: string }) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); onDone(); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onDone]);

  const steps = [
    { labelKey: 'citizen.report.success.step1', done: true },
    { labelKey: 'citizen.report.success.step2', done: true },
    { labelKey: 'citizen.report.success.step3', done: true },
    { labelKey: 'citizen.report.success.step4', done: false },
  ];

  return (
    <div className="incident-success-overlay">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="incident-success-blob incident-success-blob-primary" />
        <div className="incident-success-blob incident-success-blob-alert" />
      </div>

      <div className="incident-success-content w-full max-w-[420px] flex flex-col items-center">
        <div className="incident-success-icon-wrap">
          <CheckCircle2 size={54} color="#4ADE80" strokeWidth={1.5} />
        </div>

        <div className="font-black text-[28px] text-white mb-2 text-center leading-[1.15]">
          {t('citizen.report.success.heading')}
        </div>
        <div className="text-[14px] text-[#93C5FD] mb-6 text-center leading-[1.65] max-w-[320px]">
          {t('citizen.report.success.subtext')}
        </div>

        <div className="w-full bg-white/[0.08] border-[1.5px] border-white/[0.18] rounded-[18px] p-[18px_20px] mb-[22px] text-center backdrop-blur-[10px]">
          <div className="text-[10px] text-[#93C5FD] font-bold tracking-[0.12em] uppercase mb-1.5">
            {t('citizen.report.success.reportIdLabel')}
          </div>
          <div className="text-[28px] font-black text-white tracking-[0.06em] tabular-nums">
            {reportId}
          </div>
          <div className="text-[11px] text-white/50 mt-1.5">
            {t('citizen.report.success.reportIdHint')}
          </div>
        </div>

        <div className="w-full bg-white/[0.06] rounded-2xl p-4 mb-[22px] border border-white/[0.10]">
          <div className="text-[11px] font-bold text-[#93C5FD] tracking-[0.08em] uppercase mb-3">
            {t('citizen.report.success.responseStatusLabel')}
          </div>
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-2.5${i < steps.length - 1 ? ' mb-2.5' : ''}`}>
              <div className={`incident-success-step-dot ${s.done ? 'is-done' : 'is-pending'}`}>
                {s.done
                  ? <Check size={12} color="#4ADE80" strokeWidth={3} />
                  : <Clock size={11} color="rgba(255,255,255,0.3)" />
                }
              </div>
              <span className={`incident-success-step-label ${s.done ? 'is-done' : 'is-pending'}`}>
                {t(s.labelKey)}
              </span>
            </div>
          ))}
        </div>

        <div className="w-full bg-[rgba(185,28,28,0.15)] border border-[rgba(185,28,28,0.3)] rounded-xl p-[12px_14px] mb-[22px] flex items-center gap-2.5">
          <Phone size={16} color="#FCA5A5" className="incident-success-note-icon" />
          <span className="text-xs text-[#FCA5A5] leading-[1.5]">
            {t('citizen.report.success.emergencyNote')}
          </span>
        </div>

        <button
          onClick={onDone}
          className="w-full bg-white border-none rounded-2xl p-4 text-primary font-extrabold text-[15px] cursor-pointer transition-opacity duration-150 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
        >
          {t('citizen.report.success.backBtn', { countdown })}
        </button>
      </div>

      <style>{`
        @keyframes successPop {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SubmissionLoadingOverlay() {
  const { t } = useTranslation();
  return (
    <div
      className="incident-submit-overlay"
      aria-live="polite"
      aria-busy="true"
      aria-label="Submitting report"
    >
      <div className="grid gap-3 justify-items-center text-center">
        <div
          role="status"
          aria-label="Submitting report"
          className="w-[108px] h-[108px] rounded-full bg-white/[0.92] shadow-[0_18px_40px_rgba(15,23,42,0.24)] relative flex items-center justify-center"
        >
          <span aria-hidden="true" className="incident-submit-spinner-ring" />
          <img
            src="/favicon.svg"
            alt="TUGON"
            className="w-[42px] h-[42px] block drop-shadow-[0_2px_3px_rgba(15,23,42,0.15)]"
          />
        </div>
        <p className="m-0 text-[#DBEAFE] text-[13px] font-bold tracking-[0.02em]">
          {t('citizen.report.submitting')}
        </p>
      </div>
      <style>{`@keyframes incidentSubmitSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function IncidentReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = getAuthSession();
  const fullName = session?.user.fullName?.trim() || 'Citizen User';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CU';
  const [step, setStep]             = useState(1);
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedReportId, setSubmittedReportId] = useState('');
  const [notifOpen, setNotifOpen]   = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { notificationItems: reportNotificationItems, markAllNotificationsRead } = useCitizenReportNotifications();
  const contentRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const notificationItems = useMemo(() => {
    if (submitted) {
      const submittedItem = {
        icon: <FileText size={14} />,
        color: 'var(--primary)',
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
      if (target?.closest('.citizen-web-header')) return;
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

  const stepValidationMessage = STEP_REQUIREMENTS[step]?.(form) ?? null;
  const canProceed = !stepValidationMessage;
  const voiceAllowed = (form.category === 'Noise') || (form.subcategory?.toLowerCase().includes('noise') ?? false);
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const enableInlineEvidenceUpload = String(viteEnv?.VITE_ENABLE_EVIDENCE_INLINE_UPLOAD ?? '1') !== '0';

  useEffect(() => {
    if (voiceAllowed) return;
    setForm((prev) => {
      if (!prev.audioBlob && !prev.audioUrl) return prev;
      return { ...prev, audioBlob: null, audioUrl: null };
    });
  }, [voiceAllowed]);

  const submitReport = async () => {
    if (!form.category || !form.subcategory) {
      setSubmitError('Category and subcategory are required.');
      return;
    }

    if (!form.pin) {
      setSubmitError('Drop a map pin inside a supported barangay boundary to continue.');
      setStep(2);
      return;
    }

    setSubmitError('');
    setSubmitting(true);

    try {
      const pinValidation = await citizenReportsApi.validateReportPin(form.pin.lat, form.pin.lng);
      if (!pinValidation.isAllowed) {
        setStep(2);
        throw new Error(
          pinValidation.message || 'Your pin must be inside a supported barangay boundary (251, 252, or 256).',
        );
      }

      const photoPayloads: Array<{ fileName: string; mimeType: string; dataUrl: string }> = [];
      let encodedAudio: { fileName: string; mimeType: string; dataUrl: string } | null = null;

      if (enableInlineEvidenceUpload) {
        const MAX_EVIDENCE_PAYLOAD_BYTES = 450_000;
        let runningEvidenceBytes = 0;

        for (const file of form.photoFiles.slice(0, 2)) {
          const compressedDataUrl = await compressImageToDataUrl(file);
          const candidateSize = compressedDataUrl.length;
          if (runningEvidenceBytes + candidateSize > MAX_EVIDENCE_PAYLOAD_BYTES) continue;

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
        photoCount: enableInlineEvidenceUpload ? photoPayloads.length : selectedPhotoCount,
        hasAudio: Boolean(form.audioBlob),
        photos: enableInlineEvidenceUpload ? photoPayloads : undefined,
        audio: enableInlineEvidenceUpload ? encodedAudio : null,
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
    if (!canProceed && step < 5) return;
    if (step < 5) {
      setSubmitError('');
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
      {submitting && !submitted ? <SubmissionLoadingOverlay /> : null}

      <CitizenPageLayout
        activeNavKey="report"
        beforeMain={<StepIndicator current={step} />}
        afterMain={
          <>
            <div className="citizen-report-footer mt-auto px-4 lg:px-5">
              <div className="citizen-report-footer-actions">
                {step > 1 && (
                  <button onClick={goBack} className="citizen-report-back-btn">
                    <ChevronLeft size={16} /> {t('common.back')}
                  </button>
                )}
                <button
                  onClick={goNext}
                  disabled={submitting || (!canProceed && step < 5)}
                  className={[
                    'citizen-report-next-btn',
                    step === 1 ? 'is-single' : 'is-wide',
                    submitting || (!canProceed && step < 5)
                      ? 'is-disabled'
                      : step === 5
                        ? 'is-submit'
                        : 'is-default',
                  ].join(' ')}
                >
                  {submitting ? (
                    <>{t('citizen.report.submitting')}</>
                  ) : step === 5 ? (
                    <>{t('citizen.report.step5.confirm')}</>
                  ) : step === 4 ? (
                    <>{t('citizen.report.footer.continueToReview')} {'->'}</>
                  ) : (
                    <>{t('citizen.report.footer.continue')} {'->'}</>
                  )}
                </button>
              </div>
            </div>
          </>
        }
      >
        <h1 className="sr-only">{t('citizen.report.title')}</h1>
        {submitError && (
          <div role="alert" className="citizen-content-shell px-4 lg:px-5 mt-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-severity-critical text-xs p-[10px_12px]">
            {submitError}
          </div>
        )}
        <div className="citizen-report-content-wrap px-4 lg:px-5 flex flex-col flex-1 pb-8">
          <div className="flex-1">
            {stepContent[step]}
          </div>
        </div>
        <style>{`
          @media (min-width: 901px) {
            .citizen-report-content-wrap {
              max-width: 980px;
              margin: 0 auto;
              width: 100%;
            }
          }
        `}</style>
      </CitizenPageLayout>
    </>
  );
}
