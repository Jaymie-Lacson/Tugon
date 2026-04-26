import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
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
          Privacy Policy
        </h1>
        <p className="mb-8 text-sm text-[var(--on-surface-variant)]">Effective January 2026</p>

        <div className="space-y-7 text-sm leading-relaxed text-[var(--on-surface-variant)]">
          <section>
            <h2 className="mb-2 text-base font-bold text-[var(--on-surface)]">Information We Collect</h2>
            <p>
              TUGON collects the minimum information required to process incident reports: your full name, phone number, and barangay assignment. Location data is only collected when you submit an incident report, and is used solely for routing the report to the appropriate barangay.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-[var(--on-surface)]">How We Use Your Data</h2>
            <p>
              Your data is used to create and maintain incident records, verify your identity for account access, and communicate report updates via SMS. We do not sell or share your data with third parties outside of the relevant barangay government units.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-[var(--on-surface)]">Data Retention</h2>
            <p>
              Incident records are retained for a minimum of three (3) years in accordance with local government records retention policies. Account data is retained for the duration of your active account.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-[var(--on-surface)]">Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal data by contacting the barangay office directly. Deletion requests for incident reports may be limited by legal record-keeping obligations.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-[var(--on-surface)]">Contact</h2>
            <p>
              For privacy concerns, contact the barangay hall of your registered barangay (251, 252, or 256) in Tondo, Manila.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
