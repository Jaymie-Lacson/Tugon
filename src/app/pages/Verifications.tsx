import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, ShieldAlert, Upload, Ban, Clock3 } from 'lucide-react';
import {
  officialReportsApi,
  type ApiPendingVerification,
  type ApiVerificationDecision,
} from '../services/officialReportsApi';
import { OfficialPageInitialLoader } from '../components/OfficialPageInitialLoader';

const REJECTION_REASONS = [
  'Blurry / unreadable image',
  'Invalid document type',
  'Mismatched resident information',
  'Duplicate / already verified',
  'Suspected fraudulent upload',
] as const;

function isPreviewableImageUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return value.startsWith('data:image/') || /^https?:\/\//i.test(value);
}

export default function Verifications() {
  const [rows, setRows] = useState<ApiPendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [reasonByUser, setReasonByUser] = useState<Record<string, string>>({});
  const [notesByUser, setNotesByUser] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Resident ID Preview');

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewUrl(null);
      }
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

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!initialLoadPending) {
      return;
    }

    if (!loading) {
      setInitialLoadPending(false);
    }
  }, [initialLoadPending, loading]);

  const submitDecision = async (citizenUserId: string, decision: ApiVerificationDecision) => {
    const reason = reasonByUser[citizenUserId] ?? '';
    const notes = notesByUser[citizenUserId] ?? '';
    const needsReason = decision === 'REJECT' || decision === 'REQUEST_REUPLOAD' || decision === 'BAN_ACCOUNT';
    if (needsReason && !reason) {
      setError('Please select a rejection reason before submitting this action.');
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
    return <OfficialPageInitialLoader label="Loading verification page" />;
  }

  return (
    <div style={{ padding: '16px 20px', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: '#1E293B', fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Resident ID Verification Queue</h1>
          <p style={{ color: '#64748B', fontSize: 12 }}>
            Review pending resident IDs for your barangay only. Actions are logged for audit.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          style={{
            border: '1px solid #CBD5E1',
            background: '#fff',
            borderRadius: 10,
            padding: '8px 12px',
            fontWeight: 700,
            fontSize: 12,
            color: '#334155',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px', color: '#B91C1C', fontSize: 12, fontWeight: 700 }}>
          {error}
        </div>
      ) : null}

      <div style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#1E3A8A' }}>
        <Clock3 size={12} /> Pending: {rows.length}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#64748B' }}>Loading verification queue...</div>
      ) : rows.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px', color: '#64748B', fontSize: 13 }}>
          No pending resident ID submissions in your barangay.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((row) => {
            const isBusy = submittingId === row.citizenUserId;
            return (
              <section key={row.citizenUserId} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#1E293B', fontSize: 14 }}>{row.fullName}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      {row.phoneNumber} • {row.barangayName ?? row.barangayCode ?? 'Unknown barangay'}
                    </div>
                  </div>
                  <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 999, padding: '3px 9px', fontSize: 10, fontWeight: 800 }}>
                    {row.verificationStatus}
                  </span>
                </div>

                <div style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
                  {row.idImageUrl ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isPreviewableImageUrl(row.idImageUrl)) {
                            setError('Uploaded ID preview is not directly viewable yet. Please refresh after storage URL normalization.');
                            return;
                          }

                          setPreviewTitle(`Resident ID - ${row.fullName}`);
                          setPreviewUrl(row.idImageUrl);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          width: 'fit-content',
                          color: '#1E3A8A',
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Upload size={13} /> Preview uploaded ID
                      </button>
                      <a
                        href={row.idImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          width: 'fit-content',
                          textDecoration: 'none',
                          color: '#334155',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Open in new tab
                      </a>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#B45309', fontWeight: 700 }}>No ID image currently attached.</div>
                  )}

                  <div style={{ display: 'grid', gap: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Reason (required for reject/re-upload/ban)</label>
                    <select
                      aria-label="Verification decision reason"
                      value={reasonByUser[row.citizenUserId] ?? ''}
                      onChange={(event) => setReasonByUser((prev) => ({ ...prev, [row.citizenUserId]: event.target.value }))}
                      style={{
                        width: '100%',
                        border: '1px solid #CBD5E1',
                        borderRadius: 8,
                        padding: '9px 10px',
                        fontSize: 12,
                        color: '#1E293B',
                        background: '#fff',
                      }}
                    >
                      <option value="">Select reason</option>
                      {REJECTION_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>

                    <textarea
                      value={notesByUser[row.citizenUserId] ?? ''}
                      onChange={(event) => setNotesByUser((prev) => ({ ...prev, [row.citizenUserId]: event.target.value }))}
                      placeholder="Optional internal notes"
                      rows={2}
                      style={{
                        width: '100%',
                        border: '1px solid #CBD5E1',
                        borderRadius: 8,
                        padding: '9px 10px',
                        fontSize: 12,
                        color: '#1E293B',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'APPROVE')}
                      style={{
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <CheckCircle2 size={13} /> Approve
                    </button>

                    <button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'REQUEST_REUPLOAD')}
                      style={{
                        background: '#B4730A',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Upload size={13} /> Request Re-upload
                    </button>

                    <button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'REJECT')}
                      style={{
                        background: '#B91C1C',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <XCircle size={13} /> Reject
                    </button>

                    <button
                      disabled={isBusy}
                      onClick={() => void submitDecision(row.citizenUserId, 'BAN_ACCOUNT')}
                      style={{
                        background: '#7F1D1D',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Ban size={13} /> Ban Account
                    </button>
                  </div>

                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#9A3412', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    Use Ban Account only for grave offenses or repeated false claims.
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {previewUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={previewTitle}
          onClick={() => setPreviewUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.74)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(980px, 100%)',
              maxHeight: '92vh',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 12,
              boxShadow: '0 20px 50px rgba(15,23,42,0.35)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateRows: 'auto 1fr',
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #E2E8F0',
                background: '#F8FAFC',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{previewTitle}</div>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                style={{
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: 12, overflow: 'auto', background: '#0B1220' }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ color: '#E2E8F0', fontSize: 11, fontWeight: 700 }}>
                  Separated preview for review: top section is treated as Front ID, bottom section as Back ID.
                </div>

                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                  <div style={{ border: '1px solid #334155', borderRadius: 10, background: '#0F172A', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #334155', color: '#CBD5E1', fontSize: 11, fontWeight: 800 }}>
                      Front ID
                    </div>
                    <div style={{ position: 'relative', height: 300, overflow: 'hidden', background: '#FFFFFF' }}>
                      <img
                        src={previewUrl}
                        alt={`${previewTitle} - Front`}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '200%',
                          objectFit: 'cover',
                          objectPosition: 'top center',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ border: '1px solid #334155', borderRadius: 10, background: '#0F172A', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #334155', color: '#CBD5E1', fontSize: 11, fontWeight: 800 }}>
                      Back ID
                    </div>
                    <div style={{ position: 'relative', height: 300, overflow: 'hidden', background: '#FFFFFF' }}>
                      <img
                        src={previewUrl}
                        alt={`${previewTitle} - Back`}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '200%',
                          objectFit: 'cover',
                          objectPosition: 'bottom center',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid #334155', borderRadius: 10, background: '#0F172A', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #334155', color: '#CBD5E1', fontSize: 11, fontWeight: 800 }}>
                    Full uploaded file
                  </div>
                  <div style={{ padding: 10 }}>
                    <img
                      src={previewUrl}
                      alt={previewTitle}
                      style={{
                        display: 'block',
                        width: '100%',
                        maxHeight: '40vh',
                        objectFit: 'contain',
                        borderRadius: 8,
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
