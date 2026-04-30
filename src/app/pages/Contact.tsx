import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, MapPin, Phone } from 'lucide-react';
import { useDocumentHead } from '../hooks/useDocumentHead';

const BARANGAYS = [
  {
    name: 'Barangay 251',
    sub: 'Zone 24 — Tondo I/II, Manila',
  },
  {
    name: 'Barangay 252',
    sub: 'Zone 25 — Tondo I/II, Manila',
  },
  {
    name: 'Barangay 256',
    sub: 'Zone 26 — Tondo I/II, Manila',
  },
];

export default function Contact() {
  useDocumentHead({
    title: 'Contact — TUGON',
    description: 'Contact details for Barangays 251, 252, and 256 in Tondo, Manila served by the TUGON portal.',
    canonicalPath: '/contact',
  });
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
          Contact
        </h1>
        <p className="mb-8 text-sm text-[var(--on-surface-variant)]">
          For questions about TUGON or your submitted reports, contact your barangay office directly.
        </p>

        <div className="space-y-4">
          {BARANGAYS.map(b => (
            <div
              key={b.name}
              className="flex items-start gap-3 rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] p-4"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-container)]">
                <MapPin size={16} className="text-[var(--on-primary-container)]" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--on-surface)]">{b.name}</div>
                <div className="mt-0.5 text-[12px] text-[var(--on-surface-variant)]">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Phone size={15} className="text-[var(--primary)]" />
            <span className="text-sm font-bold text-[var(--on-surface)]">For emergencies</span>
          </div>
          <p className="text-sm text-[var(--on-surface-variant)]">
            Do not use TUGON to report life-threatening emergencies. Call{' '}
            <span className="font-bold text-[var(--on-surface)]">911</span> immediately.
          </p>
          <button
            type="button"
            onClick={() => navigate('/emergency')}
            className="mt-3 cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
          >
            View all emergency contacts →
          </button>
        </div>
      </div>
    </div>
  );
}
