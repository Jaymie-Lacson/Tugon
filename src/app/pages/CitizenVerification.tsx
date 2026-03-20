import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ShieldAlert, UploadCloud, XCircle } from 'lucide-react';
import { profileVerificationApi, type CitizenVerificationState } from '../services/profileVerificationApi';
import { getAuthSession, patchAuthSessionUser } from '../utils/authSession';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE_MB = 8;

function statusMeta(state: CitizenVerificationState | null) {
  if (!state) {
    return {
      label: 'Not Submitted',
      color: '#475569',
      bg: '#F8FAFC',
      icon: <Clock3 size={14} />,
    };
  }

  if (state.isBanned) {
    return {
      label: 'Restricted',
      color: '#991B1B',
      bg: '#FEE2E2',
      icon: <ShieldAlert size={14} />,
    };
  }

  if (state.isVerified) {
    return {
      label: 'Verified',
      color: '#065F46',
      bg: '#DCFCE7',
      icon: <CheckCircle2 size={14} />,
    };
  }

  if (state.verificationStatus === 'REJECTED') {
    return {
      label: 'Rejected',
      color: '#9A3412',
      bg: '#FFEDD5',
      icon: <XCircle size={14} />,
    };
  }

  if (state.verificationStatus === 'REUPLOAD_REQUESTED') {
    return {
      label: 'Re-upload Required',
      color: '#92400E',
      bg: '#FEF3C7',
      icon: <XCircle size={14} />,
    };
  }

  if (state.verificationStatus === 'PENDING') {
    return {
      label: 'Pending Review',
      color: '#92400E',
      bg: '#FEF3C7',
      icon: <Clock3 size={14} />,
    };
  }

  return {
    label: 'Not Submitted',
    color: '#475569',
    bg: '#F8FAFC',
    icon: <Clock3 size={14} />,
  };
}

export default function CitizenVerification() {
  const [status, setStatus] = useState<CitizenVerificationState | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const session = getAuthSession();

  const meta = useMemo(() => statusMeta(status), [status]);

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

  const onSelectFile = (file: File | null) => {
    setMessage(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a JPG, PNG, WEBP, HEIC, or HEIF image.');
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const submit = async () => {
    if (!selectedFile) {
      setError('Please choose an ID image first.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await profileVerificationApi.submitMyId(selectedFile);
      setMessage(payload.message);
      await load();
      setSelectedFile(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to upload ID image.');
    } finally {
      setSubmitting(false);
    }
  };

  const isRestricted = Boolean(status?.isBanned || session?.user.isBanned);

  return (
    <div style={{ minHeight: '100dvh', background: '#F1F5F9', padding: '18px 14px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 14 }}>
        <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22, color: '#1E293B' }}>Resident ID Verification</h1>
          <p style={{ marginTop: 6, marginBottom: 0, color: '#64748B', fontSize: 13 }}>
            Submit one valid ID photo for barangay review. You can still report incidents while your account is pending.
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 700, fontSize: 12 }}>
            {meta.icon} {meta.label}
          </div>

          {loading ? (
            <p style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>Loading verification status...</p>
          ) : (
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
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

              {status?.idImageUrl ? (
                <a
                  href={status.idImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ width: 'fit-content', textDecoration: 'none', color: '#1E3A8A', fontSize: 12, fontWeight: 700 }}
                >
                  View your latest uploaded ID
                </a>
              ) : null}
            </div>
          )}
        </section>

        <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 16 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <label htmlFor="citizen-id-upload" style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              Upload Valid ID
            </label>

            <input
              id="citizen-id-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              disabled={isRestricted || submitting}
              onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
            />

            <div style={{ fontSize: 12, color: '#64748B' }}>
              Accepted: JPG, PNG, WEBP, HEIC, HEIF. Max size: {MAX_FILE_SIZE_MB}MB.
            </div>

            {selectedFile ? (
              <div style={{ fontSize: 12, color: '#334155' }}>
                Selected file: <strong>{selectedFile.name}</strong>
              </div>
            ) : null}

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
              disabled={!selectedFile || isRestricted || submitting}
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
                cursor: !selectedFile || isRestricted || submitting ? 'not-allowed' : 'pointer',
                opacity: !selectedFile || isRestricted || submitting ? 0.65 : 1,
              }}
            >
              <UploadCloud size={15} /> {submitting ? 'Uploading...' : 'Submit ID for Review'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
