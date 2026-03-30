import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { CheckCircle2, XCircle, RefreshCw, ShieldAlert, Upload, Ban, Clock3 } from 'lucide-react';
import {
  officialReportsApi,
  type ApiPendingVerification,
  type ApiVerificationDecision,
} from '../services/officialReportsApi';
import CardSkeleton from '../components/ui/CardSkeleton';
import TextSkeleton from '../components/ui/TextSkeleton';

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
  const [rows, setRows] = useState<ApiPendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await officialReportsApi.getPendingVerifications();
      setRows(payload.verifications);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load pending verifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!initialLoadPending) return;
    if (!loading) setInitialLoadPending(false);
  }, [initialLoadPending, loading]);

  const submitDecision = async (citizenUserId: string, decision: ApiVerificationDecision) => {
    const reason = reasonByUser[citizenUserId] ?? '';
    const notes = notesByUser[citizenUserId] ?? '';
    const needsReason = decision === 'REJECT' || decision === 'REQUEST_REUPLOAD' || decision === 'BAN_ACCOUNT';
    if (needsReason && !reason) {
      setError(t('official.verifications.selectReasonFirst'));
      return;
    }
    setSubmittingId(citizenUserId);
    setError(null);
    try {
      await officialReportsApi.reviewVerification(citizenUserId, {
        decision,
        reason: needsReason ? reason : undefined,
        notes: notes || undefined,
      });
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit verification decision.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (initialLoadPending) {
    return (
      <div className="p-4 px-5 min-h-full">
        <CardSkeleton count={3} lines={3} showImage={false} gridClassName="grid grid-cols-1 gap-3" />
      </div>
    );
  }

  return (
    <div className="p-4 px-5 min-h-full">
      <div className="flex items-start justify-between gap-3 mb-3.5 flex-wrap">
        <div>
          <h1 className="text-slate-800 text-xl font-bold mb-0.5">{t('official.verifications.pageTitle')}</h1>
          <p className="text-slate-500 text-xs">
            {t('official.verifications.pageSubtitle')}
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="border border-slate-300 bg-white rounded-[10px] px-3 py-2 font-bold text-xs text-slate-700 inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-[10px] px-3 py-2.5 text-destructive text-xs font-bold">
          {error}
        </div>
      )}

      <div className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-[5px] text-[11px] font-bold text-primary">
        <Clock3 size={12} /> {t('official.verifications.pendingCount', { count: rows.length })}
      </div>

      {loading ? (
        <TextSkeleton rows={3} title={false} />
      ) : rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-500 text-[13px]">
          {t('official.verifications.noPending')}
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => {
            const isBusy = submittingId === row.citizenUserId;
            return (
              <section key={row.citizenUserId} className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="px-3.5 py-3 border-b border-slate-100 flex justify-between items-center gap-2 flex-wrap">
                  <div>
                    <div className="font-extrabold text-slate-800 text-sm">{row.fullName}</div>
                    <div className="text-[11px] text-slate-500">
                      {row.phoneNumber} • {row.barangayName ?? row.barangayCode ?? 'Unknown barangay'}
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-800 rounded-full px-2 py-[3px] text-[10px] font-extrabold">
                    {row.verificationStatus}
                  </span>
                </div>

                <div className="px-3.5 py-3 grid gap-2.5">
                  {row.idImageUrl ? (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isPreviewableImageUrl(row.idImageUrl)) {
                            setError(t('official.verifications.previewNotViewable'));
                            return;
                          }
                          setPreviewTitle(`${t('official.verifications.residentIdPreview')} - ${row.fullName}`);
                          setPreviewUrl(row.idImageUrl);
                        }}
                        className="inline-flex items-center gap-1.5 w-fit text-primary bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        <Upload size={13} /> {t('official.verifications.previewUploadedId')}
                      </button>
                      <a
                        href={row.idImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 w-fit no-underline text-slate-700 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      >
                        {t('official.verifications.openInNewTab')}
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 font-bold">{t('official.verifications.noIdImage')}</div>
                  )}

                  <div className="grid gap-2">
                    <label className="text-[11px] font-bold text-slate-600">{t('official.verifications.reasonLabel')}</label>
                    <select
                      aria-label="Verification decision reason"
                      value={reasonByUser[row.citizenUserId] ?? ''}
                      onChange={(event) => setReasonByUser((prev) => ({ ...prev, [row.citizenUserId]: event.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 bg-white"
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 resize-y box-border"
                    />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'APPROVE')}
                      className="bg-emerald-600 text-white border-none rounded-lg px-3 py-2 text-xs font-extrabold inline-flex items-center gap-[5px] cursor-pointer disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 size={13} /> {t('official.verifications.approve')}
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'REQUEST_REUPLOAD')}
                      className="bg-severity-medium text-white border-none rounded-lg px-3 py-2 text-xs font-extrabold inline-flex items-center gap-[5px] cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Upload size={13} /> {t('official.verifications.requestReupload')}
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'REJECT')}
                      className="bg-destructive text-white border-none rounded-lg px-3 py-2 text-xs font-extrabold inline-flex items-center gap-[5px] cursor-pointer disabled:cursor-not-allowed"
                    >
                      <XCircle size={13} /> {t('official.verifications.reject')}
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'BAN_ACCOUNT')}
                      className="bg-red-900 text-white border-none rounded-lg px-3 py-2 text-xs font-extrabold inline-flex items-center gap-[5px] cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Ban size={13} /> {t('official.verifications.banAccount')}
                    </button>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-2 text-[11px] text-orange-800 flex items-start gap-1.5">
                    <ShieldAlert size={14} className="shrink-0 mt-px" />
                    {t('official.verifications.banWarning')}
                  </div>
                </div>
              </section>
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
          className="fixed inset-0 z-[1000] bg-slate-900/[0.74] flex items-center justify-center p-4"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-[min(980px,100%)] max-h-[92vh] bg-white border border-slate-300 rounded-xl shadow-[0_20px_50px_rgba(15,23,42,0.35)] overflow-hidden grid grid-rows-[auto_1fr]"
          >
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-200 bg-slate-50">
              <div className="text-[13px] font-extrabold text-slate-900">{previewTitle}</div>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
              >
                {t('official.verifications.closeBtn')}
              </button>
            </div>

            <div className="p-3 overflow-auto bg-[#0B1220]">
              <div className="grid gap-3">
                <div className="text-slate-200 text-[11px] font-bold">
                  {t('official.verifications.separatedPreview')}
                </div>

                <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                  <div className="border border-slate-700 rounded-[10px] bg-slate-900 overflow-hidden">
                    <div className="px-2.5 py-2 border-b border-slate-700 text-slate-300 text-[11px] font-extrabold">
                      {t('official.verifications.frontId')}
                    </div>
                    <div className="relative h-[300px] overflow-hidden bg-white">
                      <img
                        src={previewUrl}
                        alt={`${previewTitle} - Front`}
                        className="absolute inset-0 w-full h-[200%] object-cover object-[center_top]"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-700 rounded-[10px] bg-slate-900 overflow-hidden">
                    <div className="px-2.5 py-2 border-b border-slate-700 text-slate-300 text-[11px] font-extrabold">
                      {t('official.verifications.backId')}
                    </div>
                    <div className="relative h-[300px] overflow-hidden bg-white">
                      <img
                        src={previewUrl}
                        alt={`${previewTitle} - Back`}
                        className="absolute inset-0 w-full h-[200%] object-cover object-[center_bottom]"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-700 rounded-[10px] bg-slate-900 overflow-hidden">
                  <div className="px-2.5 py-2 border-b border-slate-700 text-slate-300 text-[11px] font-extrabold">
                    {t('official.verifications.fullUploadedFile')}
                  </div>
                  <div className="p-2.5">
                    <img
                      src={previewUrl}
                      alt={previewTitle}
                      className="block w-full max-h-[40vh] object-contain rounded-lg bg-white"
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
