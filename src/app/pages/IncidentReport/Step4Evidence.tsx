import React, { useRef, useState, useEffect } from 'react';
import { Camera, Mic, MicOff, Square, Trash2, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type { ReportForm } from './types';

export function Step4({
  form,
  setForm,
  validationError,
  showVoiceRecorder,
}: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  validationError?: string;
  showVoiceRecorder: boolean;
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [micError, setMicError] = useState('');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef  = useRef<HTMLAudioElement | null>(null);
  const formRef     = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    if (previewIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - form.photoPreviews.length);
    const previews = files.map(f => URL.createObjectURL(f));
    setForm(p => ({
      ...p,
      photoFiles: [...p.photoFiles, ...files],
      photoPreviews: [...p.photoPreviews, ...previews],
    }));
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    setForm(p => ({
      ...p,
      photoFiles: p.photoFiles.filter((_, i) => i !== idx),
      photoPreviews: p.photoPreviews.filter((_, i) => i !== idx),
    }));
  };

  const startRecording = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        setForm(p => ({ ...p, audioBlob: blob, audioUrl: url }));
        stream.getTracks().forEach(t => t.stop());
      };
      rec.start();
      mediaRecRef.current = rec;
      setRecording(true);
      setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(prev => prev + 1), 1000);
    } catch {
      setMicError(t('citizen.report.step4.micError'));
    }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="pt-[22px] px-0 pb-2">
      <div className="mb-[18px]">
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-[20px] px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">{t('citizen.report.step4.badge')}</div>
        <h2 className="text-[20px] font-extrabold text-foreground mb-1.5 leading-tight">
          {t('citizen.report.step4.heading')}
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {t('citizen.report.step4.desc')}
        </p>
      </div>

      {validationError ? (
        <div className="mb-3 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {validationError}
        </div>
      ) : null}

      {/* Photo Upload */}
      <div className="bg-card rounded-[18px] border border-border p-[18px] mb-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3.5">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-[#EFF6FF] flex items-center justify-center text-primary">
            <Camera size={17} />
          </div>
          <div>
            <div className="font-bold text-[14px] text-foreground">{t('citizen.report.step4.photoTitle')}</div>
            <div className="text-[11px] text-muted-foreground">{t('citizen.report.step4.photoSubtitle')}</div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          id="incident-photo-upload"
          type="file"
          accept="image/*"
          multiple
          title="Upload photo evidence"
          aria-label="Upload photo evidence"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        <div className="flex flex-wrap gap-2.5">
          {form.photoPreviews.map((src, i) => (
            <div key={i} className="w-[84px] h-[84px] rounded-[14px] overflow-hidden relative border-2 border-border shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.10)]">
              <button
                type="button"
                onClick={() => setPreviewIndex(i)}
                className="p-0 m-0 w-full h-full border-none bg-transparent cursor-zoom-in"
              >
                <img src={src} alt={`evidence-${i}`} className="w-full h-full object-cover" decoding="async" />
              </button>
              <button
                onClick={() => removePhoto(i)}
                className="incident-step4-photo-remove-btn"
                aria-label={`Remove photo ${i + 1}`}
                title={`Remove photo ${i + 1}`}
              >
                <X size={11} />
              </button>
              <div className="incident-step4-photo-index-badge">
                {i + 1}
              </div>
            </div>
          ))}

          {form.photoPreviews.length < 4 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="incident-step4-photo-add-btn"
            >
              <Camera size={24} color="#94A3B8" />
              <span className="incident-step4-photo-add-text">
                {form.photoPreviews.length === 0 ? t('citizen.report.step4.addPhoto') : t('citizen.report.step4.addMore')}
              </span>
            </button>
          )}
        </div>

        {form.photoPreviews.length > 0 && (
          <div className="mt-2.5 text-[11px] text-muted-foreground flex items-center gap-[5px]">
            <CheckCircle2 size={12} color="#059669" />
            {form.photoPreviews.length > 1
              ? t('citizen.report.step4.photosAttachedPlural', { count: form.photoPreviews.length })
              : t('citizen.report.step4.photosAttached', { count: form.photoPreviews.length })}
            {form.photoPreviews.length < 4 && ` - ${t('citizen.report.step4.photosRemaining', { count: 4 - form.photoPreviews.length })}`}
          </div>
        )}
      </div>

      {/* Voice Recording */}
      {showVoiceRecorder ? (
        <div className="bg-card rounded-[18px] border border-border p-[18px] shadow-sm">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-[34px] h-[34px] rounded-[10px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED]">
              <Mic size={17} />
            </div>
            <div>
              <div className="font-bold text-[14px] text-foreground">{t('citizen.report.step4.voiceTitle')}</div>
              <div className="text-[11px] text-muted-foreground">{t('citizen.report.step4.voiceSubtitle')}</div>
            </div>
          </div>

          {micError && (
            <div className="bg-[#FEF2F2] rounded-[10px] p-[10px_12px] mb-3 flex gap-2 items-start">
              <MicOff size={14} color="var(--severity-critical)" className="incident-step4-mic-error-icon" />
              <span className="text-xs text-severity-critical leading-[1.5]">{micError}</span>
            </div>
          )}

          {!form.audioUrl ? (
            <div className={`incident-step4-recorder-shell ${recording ? 'is-recording' : 'is-idle'}`}>
              {recording ? (
                <>
                  <div className="incident-step4-waveform">
                    {Array.from({ length: 18 }, (_, i) => (
                      <div key={i} className="incident-step4-wavebar" />
                    ))}
                  </div>
                  <div className="text-center">
                    <div className="text-[28px] font-black text-severity-critical tabular-nums tracking-[0.04em] font-mono">
                      {fmt(recTime)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-[5px]">
                      <span className="incident-step4-recording-dot" />
                      {t('citizen.report.step4.recordingInProgress')}
                    </div>
                  </div>
                  <button onClick={stopRecording} className="incident-step4-rec-stop-btn">
                    <Square size={14} fill="white" /> {t('citizen.report.step4.stopRecording')}
                  </button>
                </>
              ) : (
                <>
                  <div className="w-[60px] h-[60px] rounded-full bg-muted flex items-center justify-center">
                    <Mic size={26} color="#94A3B8" />
                  </div>
                  <div className="text-center">
                    <div className="text-[14px] font-bold text-foreground">{t('citizen.report.step4.recordVoiceNote')}</div>
                    <div className="text-xs text-muted-foreground mt-[3px]">{t('citizen.report.step4.tapToRecord')}</div>
                  </div>
                  <button onClick={startRecording} className="incident-step4-rec-start-btn">
                    <Mic size={14} /> {t('citizen.report.step4.startRecording')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="bg-[#EFF6FF] rounded-[14px] p-[14px_16px] border-[1.5px] border-[#93C5FD] flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#DBEAFE] flex items-center justify-center text-primary shrink-0">
                <Mic size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] text-foreground mb-1.5">
                  {t('citizen.report.step4.voiceAttached')}
                </div>
                <audio
                  ref={audioElRef}
                  src={form.audioUrl}
                  controls
                  className="incident-step4-audio-player"
                />
              </div>
              <button
                onClick={() => setForm(p => ({ ...p, audioBlob: null, audioUrl: null }))}
                className="bg-[#FEE2E2] border-none rounded-lg p-2 cursor-pointer text-severity-critical shrink-0 flex items-center"
                aria-label="Remove voice recording"
                title="Remove voice recording"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-muted/50 rounded-[14px] border border-border p-[12px_14px] text-muted-foreground text-xs leading-relaxed">
          {t('citizen.report.step4.voiceUnavailable')}
        </div>
      )}

      {previewIndex !== null ? (
        <div className="citizen-photo-preview-overlay" onClick={() => setPreviewIndex(null)}>
          <button
            className="citizen-photo-preview-close"
            type="button"
            onClick={() => setPreviewIndex(null)}
            aria-label="Close photo preview"
          >
            <X size={16} />
          </button>
          <div className="citizen-photo-preview-stage" onClick={(event) => event.stopPropagation()}>
            <img
              className="citizen-photo-preview-image"
              src={form.photoPreviews[previewIndex]}
              alt={`preview-${previewIndex + 1}`}
              decoding="async"
            />
            <div className="citizen-photo-preview-count">
              {t('citizen.report.step4.photoPreviewCount', { current: previewIndex + 1, total: form.photoPreviews.length })}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes wave-bar {
          from { transform: scaleY(0.5); }
          to   { transform: scaleY(1.2); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
