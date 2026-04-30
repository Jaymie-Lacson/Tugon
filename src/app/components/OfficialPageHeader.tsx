import React from 'react';

type OfficialPageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
};

export function OfficialPageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  meta,
  className = '',
}: OfficialPageHeaderProps) {
  return (
    <section
      className={`mb-4 rounded-xl bg-[var(--surface-container-low)] px-4 py-3.5 md:px-5 md:py-4 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--outline)]">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-xl font-bold leading-tight text-[var(--on-surface)] md:text-2xl">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-xs text-[var(--on-surface-variant)] md:text-[13px]">{subtitle}</p>
          ) : null}
          {meta ? <div className="mt-1.5 text-[11px] text-[var(--on-surface-variant)]">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
