import React, { useState, useEffect } from 'react';
import { MapPin, FileText, User, Clock, Info, Camera, Mic, X, MoreHorizontal } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { CATEGORIES } from './shared';
import type { ReportForm } from './types';

export function Step5({
  form,
  reporterName,
  reporterBarangayCode,
}: {
  form: ReportForm;
  reporterName: string;
  reporterBarangayCode: string | null;
}) {
  const { t } = useTranslation();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const cat = CATEGORIES.find(c => c.type === form.category);
  const Icon = cat?.icon ?? MoreHorizontal;
  const categoryClass =
    form.category === 'Pollution'
      ? 'is-pollution'
      : form.category === 'Noise'
        ? 'is-noise'
        : form.category === 'Crime'
          ? 'is-crime'
          : form.category === 'Road Hazard'
            ? 'is-road-hazard'
            : 'is-other';

  const details = [
    {
      label: t('citizen.report.step5.fieldCategory'),
      icon: <Icon size={14} />,
      value: cat ? `${cat.label} - ${form.subcategory ?? t('citizen.report.step5.subcategoryNotSet')}` : t('citizen.report.step5.categoryNotSet'),
      accentClass: 'is-category',
    },
    {
      label: t('citizen.report.step5.fieldLocation'),
      icon: <MapPin size={14} />,
      value: form.address || (form.pin ? `${form.pin.barangay}, ${form.pin.district}` : t('citizen.report.step5.locationNotSet')),
      accentClass: 'is-location',
    },
    {
      label: t('citizen.report.step5.fieldDescription'),
      icon: <FileText size={14} />,
      value: form.description || t('citizen.report.step5.noDescription'),
      accentClass: 'is-description',
    },
    {
      label: t('citizen.report.step5.fieldAffected'),
      icon: <User size={14} />,
      value: form.affectedCount ? t('citizen.report.step5.affectedValue', { count: form.affectedCount }) : t('citizen.report.step5.affectedNotSpecified'),
      accentClass: 'is-affected',
    },
    {
      label: t('citizen.report.step5.fieldEvidence'),
      icon: <Camera size={14} />,
      value: [
        form.photoPreviews.length > 0
          ? (form.photoPreviews.length > 1
            ? t('citizen.report.step5.photoCountPlural', { count: form.photoPreviews.length })
            : t('citizen.report.step5.photoCount', { count: form.photoPreviews.length }))
          : null,
        form.audioUrl ? t('citizen.report.step5.voiceRecording') : null,
      ].filter(Boolean).join(' - ') || t('citizen.report.step5.noEvidence'),
      accentClass: 'is-evidence',
    },
    {
      label: t('citizen.report.step5.fieldReporter'),
      icon: <User size={14} />,
      value: `${reporterName} - ${reporterBarangayCode ? `Barangay ${reporterBarangayCode}` : t('citizen.report.step5.barangayNotSet')}`,
      accentClass: 'is-neutral',
    },
    {
      label: t('citizen.report.step5.fieldDateTime'),
      icon: <Clock size={14} />,
      value: new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' }),
      accentClass: 'is-neutral',
    },
  ];

  useEffect(() => {
    if (previewIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex]);

  return (
    <div className="pt-[22px] px-4 pb-2">
      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 bg-[var(--secondary-fixed)] rounded-[20px] px-3 py-1 text-[var(--severity-medium)] text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">{t('citizen.report.step5.badge')}</div>
        <h2 className="text-[20px] font-extrabold text-foreground mb-1.5 leading-tight">
          {t('citizen.report.step5.heading')}
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {t('citizen.report.step5.desc')}
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-card rounded-[20px] border-[1.5px] border-border overflow-hidden mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        <div className={`incident-step5-card-head ${categoryClass}`}>
          <div className={`incident-step5-card-icon ${categoryClass}`}>
            <Icon size={24} />
          </div>
          <div>
            <div className="font-extrabold text-[17px] text-foreground leading-tight">
              {(cat?.label ?? t('citizen.report.step5.categoryNotSet'))} {t('citizen.report.step5.reportSuffix')}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t('citizen.report.step5.submittedBy', { name: reporterName, date: new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) })}
            </div>
          </div>
          {form.severity && (
            <div
              className={[
                'incident-step5-severity-pill',
                form.severity === 'critical'
                  ? 'is-critical'
                  : form.severity === 'high'
                    ? 'is-high'
                    : form.severity === 'medium'
                      ? 'is-medium'
                      : 'is-low',
              ].join(' ')}
            >
              {form.severity}
            </div>
          )}
        </div>

        {details.map(({ label, icon, value, accentClass }, idx, arr) => (
          <div key={label} className={`incident-step5-detail-row${idx < arr.length - 1 ? ' has-divider' : ''}`}>
            <div className={`incident-step5-detail-icon ${accentClass}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.07em] mb-[3px]">
                {label}
              </div>
              <div className="text-[13px] text-foreground font-medium leading-[1.5] break-words">
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {form.photoPreviews.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-[0.07em]">
            {t('citizen.report.step5.attachedPhotos')}
          </div>
          <div className="flex gap-2">
            {form.photoPreviews.map((src, i) => (
              <div key={i} className="w-[68px] h-[68px] rounded-xl overflow-hidden border-2 border-border shrink-0 relative">
                <button
                  type="button"
                  onClick={() => setPreviewIndex(i)}
                  className="w-full h-full border-none p-0 m-0 bg-transparent cursor-zoom-in"
                  aria-label={`Preview attached photo ${i + 1}`}
                  title={`Preview attached photo ${i + 1}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
                <div className="incident-step5-photo-overlay" />
                <div className="incident-step5-photo-badge">{i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--severity-medium-bg)] rounded-[14px] p-3.5 border border-[var(--secondary-fixed-dim)] mb-1 flex gap-2.5 items-start">
        <Info size={15} color="var(--severity-medium)" className="incident-step5-disclaimer-icon" />
        <p className="text-xs text-[var(--severity-medium)] leading-[1.65] m-0">
          {t('citizen.report.step5.disclaimer')}
        </p>
      </div>

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
              alt={`review-preview-${previewIndex + 1}`}
            />
            <div className="citizen-photo-preview-count">
              {t('citizen.report.step5.photoPreviewCount', { current: previewIndex + 1, total: form.photoPreviews.length })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

