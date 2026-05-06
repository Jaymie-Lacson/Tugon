import React from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type { ReportForm } from './types';

export function Step3({
  form,
  setForm,
  validationError,
}: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  validationError?: string;
}) {
  const { t } = useTranslation();
  const MAX = 500;
  const QUICK_TAGS = [
    { key: 'citizen.report.tag.peopleDanger',    en: 'People in danger' },
    { key: 'citizen.report.tag.propertyDamage',  en: 'Property damage' },
    { key: 'citizen.report.tag.roadBlocked',     en: 'Road blocked' },
    { key: 'citizen.report.tag.spreadingRapidly',en: 'Spreading rapidly' },
    { key: 'citizen.report.tag.multipleVictims', en: 'Multiple victims' },
    { key: 'citizen.report.tag.ongoingSituation',en: 'Ongoing situation' },
    { key: 'citizen.report.tag.needsEvacuation', en: 'Needs evacuation' },
    { key: 'citizen.report.tag.structuralDamage',en: 'Structural damage' },
    { key: 'citizen.report.tag.childrenInvolved',en: 'Children involved' },
    { key: 'citizen.report.tag.elderlyAtRisk',   en: 'Elderly at risk' },
  ];

  const toggleTag = (tag: string) => {
    setForm((p) => {
      if (p.quickTags.includes(tag)) {
        return { ...p, quickTags: p.quickTags.filter((item) => item !== tag) };
      }
      return { ...p, quickTags: [...p.quickTags, tag] };
    });
  };

  return (
    <div className="pt-[22px] px-0 pb-2">
      <div className="mb-[18px]">
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-[20px] px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">{t('citizen.report.step3.badge')}</div>
        <h2 className="text-[20px] font-extrabold text-foreground mb-1.5 leading-tight">
          {t('citizen.report.step3.heading')}
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {t('citizen.report.step3.desc')}
        </p>
      </div>

      <div className="bg-[var(--severity-medium-bg)] rounded-xl p-[12px_14px] border border-[var(--secondary-fixed-dim)] mb-[18px] flex gap-2.5 items-start">
        <Info size={14} color="var(--severity-medium)" className="shrink-0 mt-px" />
        <div className="text-xs text-[var(--severity-medium)] leading-relaxed">
          <strong>{t('citizen.report.step3.tipLabel')}</strong> {t('citizen.report.step3.tipBody')}
        </div>
      </div>

      <div className="mb-[18px]">
        <div className="flex justify-between mb-[7px]">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.07em]">
            {t('citizen.report.step3.fieldLabel')}
          </label>
          <span
            className={[
              'text-[11px] font-semibold tabular-nums',
              form.description.length >= MAX * 0.9
                ? 'text-[var(--severity-critical)]'
                : form.description.length >= MAX * 0.7
                  ? 'text-[var(--severity-medium)]'
                  : 'text-muted-foreground',
            ].join(' ')}
          >
            {form.description.length}/{MAX}
          </span>
        </div>
        <textarea
          value={form.description}
          onChange={e => { if (e.target.value.length <= MAX) setForm(p => ({ ...p, description: e.target.value })); }}
          placeholder={t('citizen.report.step3.textareaPlaceholder')}
          rows={6}
          className={[
            'w-full p-[13px_14px] rounded-[14px] border-[1.5px] text-[13px] font-roboto outline-none resize-none box-border text-foreground leading-[1.65] transition-colors bg-card focus:border-primary',
            form.description.length >= MAX * 0.9 ? 'border-[#FCA5A5]' : 'border-border',
          ].join(' ')}
        />
      </div>

      <div className="mb-5">
        <div className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-[0.07em]">
          {t('citizen.report.step3.quickTagsLabel')}
        </div>
        <div className="flex flex-wrap gap-[7px]">
          {QUICK_TAGS.map(tag => {
            const added = form.quickTags.includes(tag.en);
            return (
              <button
                key={tag.en}
                onClick={() => toggleTag(tag.en)}
                className={[
                  'py-1.5 px-[11px] rounded-[20px] border-[1.5px] text-[11px] font-semibold transition-all duration-200',
                  added
                    ? 'border-primary bg-[#EFF6FF] text-primary shadow-[0_1px_4px_rgba(30,58,138,0.12)]'
                    : 'border-border bg-muted/50 text-muted-foreground',
                ].join(' ')}
              >
                {added ? 'Selected ' : '+ '}{t(tag.key)}
              </button>
            );
          })}
        </div>

        {form.quickTags.length > 0 ? (
          <div className="mt-2.5 text-[11px] text-primary font-semibold">
            {t('citizen.report.step3.selectedTags', { tags: form.quickTags.join(', ') })}
          </div>
        ) : null}
      </div>

      {validationError ? (
        <div className="mb-3.5 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {validationError}
        </div>
      ) : null}

      <div>
        <label className="text-[11px] font-bold text-muted-foreground block mb-2 uppercase tracking-[0.07em]">
          {t('citizen.report.step3.affectedLabel')}
        </label>
        <div className="incident-affected-grid grid grid-cols-4 gap-2">
          {[
            { val: '1-5',  label: '1-5',  sublabelKey: 'citizen.report.step3.affected.few' },
            { val: '6-20', label: '6-20', sublabelKey: 'citizen.report.step3.affected.several' },
            { val: '21-50',label: '21-50',sublabelKey: 'citizen.report.step3.affected.many' },
            { val: '50+',  label: '50+',  sublabelKey: 'citizen.report.step3.affected.large' },
          ].map(opt => {
            const sel = form.affectedCount === opt.val;
            return (
              <button
                key={opt.val}
                onClick={() => setForm(p => ({ ...p, affectedCount: sel ? null : opt.val }))}
                className={[
                  'py-3 px-1 rounded-xl border-2 text-center transition-all duration-200',
                  sel
                    ? 'border-primary bg-[#EFF6FF] shadow-[0_2px_8px_rgba(30,58,138,0.15)]'
                    : 'border-border bg-card',
                ].join(' ')}
              >
                <div className={['text-sm font-extrabold', sel ? 'text-primary' : 'text-foreground'].join(' ')}>{opt.label}</div>
                <div className={['mt-0.5 text-[9px] font-semibold', sel ? 'text-[#3B82F6]' : 'text-muted-foreground'].join(' ')}>{t(opt.sublabelKey)}</div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 520px) {
          .incident-affected-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}
