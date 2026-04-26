import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Phone } from 'lucide-react';

const HOTLINES = [
  {
    label: 'National Emergency Hotline',
    number: '911',
    note: 'Police · Fire · Medical',
    highlight: true,
  },
  {
    label: 'Philippine National Police (PNP)',
    number: '117',
    note: null,
    highlight: false,
  },
  {
    label: 'Bureau of Fire Protection (BFP)',
    number: '160',
    note: null,
    highlight: false,
  },
  {
    label: 'Philippine Red Cross',
    number: '143',
    note: null,
    highlight: false,
  },
  {
    label: 'NDRRMC Operations Center',
    number: '8911-1406',
    note: 'National Disaster Risk Reduction and Management Council',
    highlight: false,
  },
];

export default function Emergency() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--surface)] px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <h1 className="mb-1.5 text-[26px] font-black tracking-[-0.03em] text-[var(--on-surface)]">
          Emergency Contacts
        </h1>
        <p className="mb-8 text-sm text-[var(--on-surface-variant)]">
          For life-threatening situations, call 911 immediately. Do not use TUGON for emergencies.
        </p>

        <div className="space-y-3">
          {HOTLINES.map(h => (
            <a
              key={h.label}
              href={`tel:${h.number.replace(/[^0-9+]/g, '')}`}
              className={`flex items-center gap-4 rounded-xl p-4 no-underline transition-colors ${
                h.highlight
                  ? 'bg-red-700 hover:bg-red-800'
                  : 'border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] hover:bg-[var(--surface-container-low)]'
              }`}
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                  h.highlight ? 'bg-white/20' : 'bg-[var(--surface-container)]'
                }`}
              >
                <Phone size={17} className={h.highlight ? 'text-white' : 'text-[var(--primary)]'} />
              </div>
              <div className="flex-1">
                <div
                  className={`text-sm font-semibold ${
                    h.highlight ? 'text-white' : 'text-[var(--on-surface)]'
                  }`}
                >
                  {h.label}
                </div>
                {h.note && (
                  <div
                    className={`mt-0.5 text-[11px] ${
                      h.highlight ? 'text-red-100' : 'text-[var(--on-surface-variant)]'
                    }`}
                  >
                    {h.note}
                  </div>
                )}
              </div>
              <div
                className={`font-mono text-[18px] font-black tracking-tight ${
                  h.highlight ? 'text-white' : 'text-[var(--on-surface)]'
                }`}
              >
                {h.number}
              </div>
            </a>
          ))}
        </div>

        <p className="mt-8 text-[11px] leading-relaxed text-[var(--on-surface-variant)]">
          For non-emergency barangay concerns, use TUGON to file an incident report. Your report will be reviewed by barangay personnel during office hours.
        </p>
      </div>
    </div>
  );
}
