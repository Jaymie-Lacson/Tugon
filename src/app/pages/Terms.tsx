import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
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
          Terms of Use
        </h1>
        <p className="mb-8 text-sm text-[var(--on-surface-variant)]">Effective January 2026</p>

        <div className="space-y-7 text-sm leading-relaxed text-[var(--on-surface-variant)]">
          <section>
            <h2 className="mb-2 text-base font-bold text-[var(--on-surface)]">Eligibility</h2>
            <p>
              TUGON is available to residents of Barangays 251, 252, and 256 in Tondo I/II, Manila. You must register with an active Philippine mobile number and a valid barangay assignment to use the system.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-[var(--on-surface)]">Proper Use</h2>
            <p>
              TUGON is intended for reporting genuine incidents within its defined categories: Pollution, Noise, Crime, Road Hazard, and Other. Filing false, duplicate, or malicious reports is prohibited and may result in account suspension.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-[var(--on-surface)]">Evidence Submissions</h2>
            <p>
              Photos and voice recordings submitted as evidence must relate directly to the incident being reported. Uploading content that is offensive, defamatory, or unrelated to the report is grounds for account action.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-[var(--on-surface)]">Official Records</h2>
            <p>
              All submitted reports become part of the official barangay incident record. TUGON supplements — but does not replace — the traditional barangay blotter. For urgent matters, contact your barangay hall directly.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-[var(--on-surface)]">Account Responsibility</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. Do not share your password with others. Report suspected unauthorized access to the barangay office immediately.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
