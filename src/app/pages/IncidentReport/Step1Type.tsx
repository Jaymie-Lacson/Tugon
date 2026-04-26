import React, { useRef } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { getCategoryTaxonomy, MEDIATION_WARNING, REPORT_TAXONOMY } from '../../data/reportTaxonomy';
import type { ReportSubcategory } from '../../data/reportTaxonomy';
import { CATEGORIES } from './shared';
import type { ReportForm, IncidentCategory, Severity } from './types';

function getCategoryThemeClasses(type: IncidentCategory) {
  if (type === 'Pollution') {
    return {
      selectedCard: 'bg-[#0F766E] border-[#0F766E]',
      unselectedHalo: 'bg-[#CCFBF1]',
      unselectedIcon: 'bg-[#CCFBF1] text-[#0F766E]',
    };
  }
  if (type === 'Noise') {
    return {
      selectedCard: 'bg-[#7C3AED] border-[#7C3AED]',
      unselectedHalo: 'bg-[#EDE9FE]',
      unselectedIcon: 'bg-[#EDE9FE] text-[#7C3AED]',
    };
  }
  if (type === 'Crime') {
    return {
      selectedCard: 'bg-primary border-primary dark:bg-[#1e3a8a] dark:border-[#1e3a8a]',
      unselectedHalo: 'bg-[#DBEAFE]',
      unselectedIcon: 'bg-[#DBEAFE] text-primary',
    };
  }
  if (type === 'Road Hazard') {
    return {
      selectedCard: 'bg-[var(--severity-medium)] border-[var(--severity-medium)]',
      unselectedHalo: 'bg-[#FEF3C7]',
      unselectedIcon: 'bg-[#FEF3C7] text-[var(--severity-medium)]',
    };
  }
  return {
    selectedCard: 'bg-[#475569] border-[#475569]',
    unselectedHalo: 'bg-muted',
    unselectedIcon: 'bg-muted text-muted-foreground',
  };
}

function getSeverityButtonClasses(level: Severity, selected: boolean) {
  const base = 'rounded-xl py-2.5 px-1 border-2 text-[10px] font-bold text-center tracking-[0.01em] transition-all duration-200';

  if (level === 'low') {
    return [
      base,
      selected
        ? 'border-[#059669] bg-[#D1FAE5] text-[#059669] shadow-[0_2px_10px_rgba(5,150,105,0.19)]'
        : 'border-[#6EE7B7] bg-card text-[#059669]',
    ].join(' ');
  }
  if (level === 'medium') {
    return [
      base,
      selected
        ? 'border-[var(--severity-medium)] bg-[#FEF3C7] text-[var(--severity-medium)] shadow-[0_2px_10px_rgba(180,115,10,0.19)]'
        : 'border-[#FCD34D] bg-card text-[var(--severity-medium)]',
    ].join(' ');
  }
  if (level === 'high') {
    return [
      base,
      selected
        ? 'border-[#C2410C] bg-[#FFEDD5] text-[#C2410C] shadow-[0_2px_10px_rgba(194,65,12,0.19)]'
        : 'border-[#FB923C] bg-card text-[#C2410C]',
    ].join(' ');
  }
  return [
    base,
    selected
      ? 'border-[var(--severity-critical)] bg-[#FEE2E2] text-[var(--severity-critical)] shadow-[0_2px_10px_rgba(185,28,28,0.19)]'
      : 'border-[#FCA5A5] bg-card text-[var(--severity-critical)]',
  ].join(' ');
}

function Step1({ form, setForm }: { form: ReportForm; setForm: React.Dispatch<React.SetStateAction<ReportForm>> }) {
  const { t } = useTranslation();
  const severitySectionRef = useRef<HTMLDivElement | null>(null);
  const subcategorySectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToSection = (target: React.RefObject<HTMLDivElement | null>) => {
    window.setTimeout(() => {
      target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  return (
    <div className="incident-step2 pt-[22px] px-4 pb-2">
      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] dark:bg-[var(--primary-fixed)] rounded-lg px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">
          {t('citizen.report.step1.badge')}
        </div>
        <h2 className="text-[20px] font-extrabold text-foreground mb-1.5 leading-tight">
          {t('citizen.report.step1.heading')}
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {t('citizen.report.step1.desc')}
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 gap-[10px] mb-3.5">
        {CATEGORIES.map(({ type, label, icon: Icon, descKey }) => {
          const sel = form.category === type;
          const theme = getCategoryThemeClasses(type);
          return (
            <button
              key={type}
              onClick={() => {
                const taxonomy = getCategoryTaxonomy(type);
                setForm((p) => ({
                  ...p,
                  category: type,
                  subcategory: taxonomy?.subcategories[0] ?? null,
                  requiresMediation: taxonomy?.requiresMediation ?? false,
                  mediationWarning: taxonomy?.requiresMediation ? MEDIATION_WARNING : null,
                }));
                scrollToSection(severitySectionRef);
              }}
              className={[
                'relative overflow-hidden min-h-[124px] rounded-xl border-2 pt-3.5 px-3 pb-3 text-left flex flex-col items-start gap-2.5 transition-all duration-200 ease-out',
                sel
                  ? `${theme.selectedCard} text-white shadow-[0_8px_16px_rgba(15,23,42,0.14)]`
                  : 'bg-card border-border text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
              ].join(' ')}
            >
              {!sel && (
                <div className={`absolute -top-5 -right-5 size-[70px] rounded-xl opacity-35 ${theme.unselectedHalo}`} />
              )}
              {sel && (
                <div className="absolute top-2.5 right-2.5 size-[22px] rounded-[7px] bg-white/25 border-[1.5px] border-white/50 flex items-center justify-center">
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
              )}
              <div
                className={[
                  'size-[46px] rounded-[13px] flex items-center justify-center shrink-0',
                  sel ? 'bg-white/20 text-white' : theme.unselectedIcon,
                ].join(' ')}
              >
                <Icon size={22} />
              </div>
              <div className="relative z-[1]">
                <div className={['mb-[3px] text-sm font-extrabold leading-[1.2]', sel ? 'text-white' : 'text-foreground'].join(' ')}>
                  {label}
                </div>
                <div className={['text-[10px] leading-[1.45]', sel ? 'text-white/80' : 'text-muted-foreground'].join(' ')}>
                  {t(descKey)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Severity Row */}
      <div
        ref={severitySectionRef}
        className={[
          'overflow-hidden transition-all duration-300 ease-out',
          form.category ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
      >
        <div className="bg-muted/50 rounded-2xl p-4 border border-border">
          <div className="font-bold text-[13px] text-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} color="var(--severity-medium)" /> {t('citizen.report.step1.severityPrompt')}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { k: 'low' as Severity,      labelKey: 'citizen.report.severity.minor' },
              { k: 'medium' as Severity,   labelKey: 'citizen.report.severity.moderate' },
              { k: 'high' as Severity,     labelKey: 'citizen.report.severity.serious' },
              { k: 'critical' as Severity, labelKey: 'citizen.report.severity.critical' },
            ].map(s => {
              const sel = form.severity === s.k;
              return (
                <button
                  key={s.k}
                  onClick={() => {
                    setForm(p => ({ ...p, severity: s.k }));
                    scrollToSection(subcategorySectionRef);
                  }}
                  className={getSeverityButtonClasses(s.k, sel)}
                >
                  {t(s.labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {form.category ? (
        <div ref={subcategorySectionRef} className="mt-3 bg-card border border-border rounded-[14px] p-3.5">
          <label htmlFor="incident-subcategory-select" className="block font-bold text-xs text-foreground mb-2">
            {t('citizen.report.step1.subcategoryLabel')}
          </label>
          <select
            id="incident-subcategory-select"
            title="Select incident subcategory"
            value={form.subcategory ?? ''}
            onChange={(event) => setForm((p) => ({ ...p, subcategory: event.target.value as ReportSubcategory }))}
            className="w-full rounded-[10px] border border-border p-[10px_12px] text-xs text-foreground"
          >
            {(REPORT_TAXONOMY.find((item) => item.category === form.category)?.subcategories ?? []).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          {form.requiresMediation ? (
            <div className="mt-2.5 text-[11px] text-primary bg-[#EFF6FF] dark:bg-[var(--primary-fixed)] border border-[#BFDBFE] dark:border-[var(--primary)] rounded-[10px] py-2 px-2.5 leading-[1.5]">
              {MEDIATION_WARNING}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Step1WithValidation({
  form,
  setForm,
  validationError,
}: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  validationError?: string;
}) {
  return (
    <>
      <Step1 form={form} setForm={setForm} />
      {validationError ? (
        <div className="mx-4 mb-2.5 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {validationError}
        </div>
      ) : null}
    </>
  );
}
