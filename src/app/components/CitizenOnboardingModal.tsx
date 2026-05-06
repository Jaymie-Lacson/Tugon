import React, { useState, useEffect } from 'react';
import { ShieldCheck, MapPin, FileText, ArrowRight, X } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { getAuthSession } from '../utils/authSession';

const ONBOARDING_KEY = 'tugon.citizen.onboarding.seen';

const steps = [
  {
    icon: <ShieldCheck size={32} className="text-primary" />,
    title: 'Welcome to TUGON',
    description: 'Your community incident reporting platform for Barangays 251, 252, and 256 in Tondo, Manila.',
  },
  {
    icon: <FileText size={32} className="text-primary" />,
    title: 'Verify your identity',
    description: 'Upload a valid government ID so officials can confirm you are a resident. This is required before you can submit reports.',
  },
  {
    icon: <MapPin size={32} className="text-primary" />,
    title: 'Report incidents',
    description: 'Once verified, you can report community incidents by pinning their location on the map and uploading evidence.',
  },
];

export function CitizenOnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const session = getAuthSession();
    if (!session || session.user.role !== 'CITIZEN') return;
    if (session.user.isVerified) return;
    if (localStorage.getItem(ONBOARDING_KEY)) return;
    setOpen(true);
  }, []);

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOpen(false);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl p-0">
        {/* Step indicator */}
        <div className="flex gap-1.5 px-6 pt-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="Close onboarding"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center px-6 pb-2 pt-6 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-accent">
            {current.icon}
          </div>
          <h3 className="text-lg font-bold text-foreground">{current.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.description}</p>
        </div>

        {/* Action */}
        <div className="flex items-center justify-between px-6 pb-6 pt-4">
          <button
            onClick={handleClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {step < steps.length - 1 ? 'Next' : 'Get started'}
            <ArrowRight size={16} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
