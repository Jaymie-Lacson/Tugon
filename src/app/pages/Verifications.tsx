import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, RefreshCw, ShieldAlert, Upload, Ban, Clock3 } from 'lucide-react';
import {
  officialReportsApi,
  type ApiPendingVerification,
  type ApiVerificationDecision,
} from '../services/officialReportsApi';
import { usePendingVerifications, officialReportsKeys } from '../hooks/useOfficialReportsQueries';
import CardSkeleton from '../components/ui/CardSkeleton';
import TextSkeleton from '../components/ui/TextSkeleton';
import { VerificationsSkeleton } from '../components/ui/PageSkeletons';
import { Button } from '../components/ui/button';
import { OfficialPageHeader } from '../components/OfficialPageHeader';

const REJECTION_REASONS = [
  'Blurry / unreadable image',
  'Invalid document type',
  'Mismatched resident information',
  'Duplicate / already verified',
  'Suspected fraudulent upload',
] as const;

function isPreviewableImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith('data:image/') || /^https?:\/\//i.test(value);
}

export default function Verifications() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading: loading, error: queryError } = usePendingVerifications();
  const rows = data?.verifications ?? [];
  const error = queryError?.message ?? null;
  const initialLoadPending = loading && !data;

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [reasonByUser, setReasonByUser] = useState<Record<string, string>>({});
  const [notesByUser, setNotesByUser] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  useEffect(() => {
    if (!previewUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewUrl(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [previewUrl]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitDecision = async (citizenUserId: string, decision: ApiVerificationDecision) => {
    const reason = reasonByUser[citizenUserId] ?? '';
    const notes = notesByUser[citizenUserId] ?? '';
    const needsReason = decision === 'REJECT' || decision === 'REQUEST_REUPLOAD' || decision === 'BAN_ACCOUNT';
    if (needsReason && !reason) {
      setSubmitError(t('official.verifications.selectReasonFirst'));
      return;
    }
    setSubmittingId(citizenUserId);
    setSubmitError(null);
    try {
      await officialReportsApi.reviewVerification(citizenUserId, {
        decision,
        reason: needsReason ? reason : undefined,
        notes: notes || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: officialReportsKeys.verifications() });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit verification decision.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (initialLoadPending) {
    return <VerificationsSkeleton />;
  }

  return (
    <div className="page-content min-h-full bg-background px-4 py-4 md:px-5">
      <OfficialPageHeader
        title={t('official.verifications.pageTitle')}
        subtitle={t('official.verifications.pageSubtitle')}
        actions={(
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="gap-1.5 text-xs font-bold"
          >
            <RefreshCw size={14} /> {t('common.refresh')}
          </Button>
        )}
      />

      {(error ?? submitError) && (
        <div role="alert" className="mb-3 border-l-4 border-[var(--severity-critical)] bg-[var(--error-container)] px-3 py-2.5 text-xs font-semibold text-[var(--severity-critical)]">
          {error ?? submitError}
        </div>
      )}

      <span className="mb-3 flex w-fit items-center gap-2 font-mono text-[11px] font-bold text-primary">
        <Clock3 size={12} /> {t('official.verifications.pendingCount', { count: rows.length })}
      </span>

      {loading ? (
        <TextSkeleton rows={3} title={false} />
      ) : rows.length === 0 ? (
        <div className="border border-border bg-card p-4 text-[13px] text-[var(--on-surface-variant)]">
          {t('official.verifications.noPending')}
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => {
            const isBusy = submittingId === row.citizenUserId;
            return (
              <div key={row.citizenUserId} className="overflow-hidden border border-t-2 border-t-[#D97706] border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-3">
                  <div>
                    <div className="font-extrabold text-foreground text-sm">{row.fullName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {row.phoneNumber} • {row.barangayName ?? row.barangayCode ?? 'Unknown barangay'}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-extrabold uppercase text-[#D97706]">
                    {row.verificationStatus}
                  </span>
                </div>

                <div className="grid gap-3 bg-card px-4 py-3.5">
                  {row.idImageUrl ? (
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isPreviewableImageUrl(row.idImageUrl)) {
                            setSubmitError(t('official.verifications.previewNotViewable'));
                            return;
                          }
                          setPreviewTitle(`${t('official.verifications.residentIdPreview')} - ${row.fullName}`);
                          setPreviewUrl(row.idImageUrl);
                        }}
                        className="inline-flex w-fit cursor-pointer items-center gap-1.5 border border-border bg-card px-3 py-2 text-xs font-bold text-primary"
                      >
                        <Upload size={13} /> {t('official.verifications.previewUploadedId')}
                      </button>
                      <a
                        href={row.idImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit items-center gap-1.5 border border-border bg-card px-3 py-2 text-xs font-bold text-[var(--on-surface)] no-underline"
                      >
                        {t('official.verifications.openInNewTab')}
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-[var(--secondary)]">{t('official.verifications.noIdImage')}</div>
                  )}

                  <div className="grid gap-2.5 border border-border bg-card p-3">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--outline)]">{t('official.verifications.reasonLabel')}</label>
                    <select
                      aria-label="Verification decision reason"
                      value={reasonByUser[row.citizenUserId] ?? ''}
                      onChange={(event) => setReasonByUser((prev) => ({ ...prev, [row.citizenUserId]: event.target.value }))}
                      className="w-full border border-border bg-card px-2.5 py-2 text-xs text-[var(--on-surface)] outline-none"
                    >
                      <option value="">{t('official.verifications.selectReason')}</option>
                      {REJECTION_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>

                    <textarea
                      value={notesByUser[row.citizenUserId] ?? ''}
                      onChange={(event) => setNotesByUser((prev) => ({ ...prev, [row.citizenUserId]: event.target.value }))}
                      placeholder={t('official.verifications.optionalNotes')}
                      rows={2}
                      className="box-border w-full resize-y border border-border bg-card px-2.5 py-2 text-xs text-[var(--on-surface)] outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'APPROVE')}
                      size="sm"
                      className="gap-[5px] bg-emerald-600 hover:bg-emerald-700 text-xs font-extrabold"
                    >
                      <CheckCircle2 size={13} /> {t('official.verifications.approve')}
                    </Button>
                    <Button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'REQUEST_REUPLOAD')}
                      size="sm"
                      className="gap-[5px] bg-severity-medium hover:bg-severity-medium/90 text-xs font-extrabold"
                    >
                      <Upload size={13} /> {t('official.verifications.requestReupload')}
                    </Button>
                    <Button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'REJECT')}
                      variant="destructive"
                      size="sm"
                      className="gap-[5px] text-xs font-extrabold"
                    >
                      <XCircle size={13} /> {t('official.verifications.reject')}
                    </Button>
                    <Button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'BAN_ACCOUNT')}
                      variant="destructive"
                      size="sm"
                      className="gap-[5px] bg-[var(--tertiary)] hover:bg-[var(--tertiary)]/90 text-xs font-extrabold"
                    >
                      <Ban size={13} /> {t('official.verifications.banAccount')}
                    </Button>
                  </div>

                  <div className="flex items-start gap-1.5 border-l-[3px] border-border bg-muted/50 px-2.5 py-2 text-[11px] text-muted-foreground">
                    <ShieldAlert size={14} className="shrink-0 mt-px" />
                    {t('official.verifications.banWarning')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={previewTitle}
          onClick={() => setPreviewUrl(null)}
          className="fixed inset-x-0 z-[1000] flex items-center justify-center bg-[rgba(13,28,46,0.58)] p-4 backdrop-blur-[2px] top-[var(--app-vv-top,0px)] bottom-[var(--app-vv-bottom-gap,0px)]"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="grid max-h-[92vh] w-[min(980px,100%)] grid-rows-[auto_1fr] overflow-hidden rounded-2xl bg-card shadow-[0_20px_50px_rgba(13,28,46,0.3)]"
          >
            <div className="flex items-center justify-between bg-[var(--surface-container-low)] px-3 py-2.5 shadow-[inset_0_-1px_0_rgba(197,197,211,0.22)]">
              <div className="text-[13px] font-extrabold text-[var(--on-surface)]">{previewTitle}</div>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="cursor-pointer rounded-lg border-none bg-card px-2.5 py-1.5 text-xs font-bold text-[var(--on-surface-variant)] shadow-[inset_0_0_0_1px_rgba(197,197,211,0.28)]"
              >
                {t('official.verifications.closeBtn')}
              </button>
            </div>

            <div className="overflow-auto bg-[var(--surface-container)] p-3">
              <div className="grid gap-3">
                <div className="text-[11px] font-bold text-[var(--on-surface-variant)]">
                  {t('official.verifications.separatedPreview')}
                </div>

                <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                  <div className="overflow-hidden border border-border bg-card">
                    <div className="border-b border-border bg-muted/50 px-2.5 py-2 text-[11px] font-extrabold text-[var(--on-surface)]">
                      {t('official.verifications.frontId')}
                    </div>
                    <div className="relative h-[300px] overflow-hidden bg-card">
                      <img
                        src={previewUrl}
                        alt={`${previewTitle} - Front`}
                        className="absolute inset-0 w-full h-[200%] object-cover object-[center_top]"
                      />
                    </div>
                  </div>

                  <div className="overflow-hidden border border-border bg-card">
                    <div className="border-b border-border bg-muted/50 px-2.5 py-2 text-[11px] font-extrabold text-[var(--on-surface)]">
                      {t('official.verifications.backId')}
                    </div>
                    <div className="relative h-[300px] overflow-hidden bg-card">
                      <img
                        src={previewUrl}
                        alt={`${previewTitle} - Back`}
                        className="absolute inset-0 w-full h-[200%] object-cover object-[center_bottom]"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[10px] bg-card shadow-[inset_0_0_0_1px_rgba(197,197,211,0.32)]">
                  <div className="bg-[var(--surface-container-low)] px-2.5 py-2 text-[11px] font-extrabold text-[var(--on-surface)] shadow-[inset_0_-1px_0_rgba(197,197,211,0.35)]">
                    {t('official.verifications.fullUploadedFile')}
                  </div>
                  <div className="p-2.5">
                    <img
                      src={previewUrl}
                      alt={previewTitle}
                      className="block w-full max-h-[40vh] object-contain rounded-lg bg-card"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

