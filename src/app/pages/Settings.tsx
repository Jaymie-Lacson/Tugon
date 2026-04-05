import React from 'react';
import { Settings as SettingsIcon, User, Shield, Globe } from 'lucide-react';
import { getAuthSession } from '../utils/authSession';
import { useTranslation, SUPPORTED_LOCALES, LOCALE_LABELS } from '../i18n';
import type { Locale } from '../i18n';

function SettingRow({ label, description, value }: { label: string; description?: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-slate-800">{label}</div>
        {description && <div className="text-[11px] text-slate-400 mt-0.5">{description}</div>}
      </div>
      <div className="text-xs text-slate-700 font-semibold text-right">{value}</div>
    </div>
  );
}

export default function Settings() {
  const { locale, setLocale, t } = useTranslation();
  const session = getAuthSession();
  const currentUser = session?.user;

  const fullName = currentUser?.fullName?.trim() || 'Official User';
  const role = currentUser?.role ?? 'OFFICIAL';
  const roleLabel =
    role === 'SUPER_ADMIN'
      ? 'Super Admin'
      : role === 'OFFICIAL'
        ? 'Barangay Official'
        : 'Citizen';
  const areaLabel = currentUser?.barangayCode
    ? `Barangay ${currentUser.barangayCode}, Tondo, Manila`
    : 'No assigned barangay';
  const phoneLabel = currentUser?.phoneNumber || 'No contact number on file';
  const regionLabel = currentUser?.barangayCode
    ? `Barangay ${currentUser.barangayCode} (Tondo, Manila)`
    : 'No assigned barangay';
  const settingsSubtitle = `${roleLabel} account details for ${regionLabel}`;
  const verificationLabel = currentUser?.verificationStatus ?? 'PENDING';
  const phoneVerifiedLabel = currentUser?.isPhoneVerified ? 'Verified' : 'Not verified';
  const accountStatusLabel = currentUser?.isBanned ? 'Restricted' : 'Active';
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'TU';

  return (
    <div className="p-4 px-5 min-h-full">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h1 className="text-[#0F172A] text-xl font-bold">Settings</h1>
        <p className="text-slate-400 text-xs mt-0.5">{settingsSubtitle}</p>
      </div>

      <div className="flex gap-4 flex-wrap items-start max-md:flex-col max-md:gap-3">
        <div className="w-[220px] shrink-0 bg-white overflow-hidden max-md:w-full">
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-50">
            <User size={15} className="text-primary" />
            <span className="text-[13px] font-bold text-primary">Account</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-50">
            <Shield size={15} className="text-primary" />
            <span className="text-[13px] font-bold text-primary">Access Status</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-50">
            <Globe size={15} className="text-primary" />
            <span className="text-[13px] font-bold text-primary">{t('settings.language')}</span>
          </div>
        </div>

        <div className="flex-1 min-w-[280px] bg-white px-6 py-5 max-md:min-w-0 max-md:w-full">
          <div className="text-[15px] font-bold text-slate-800 mb-4">User Profile</div>
          <div className="mb-3.5 text-[11px] text-slate-500">
            This page only shows account details backed by your authenticated session.
          </div>

          <div className="flex items-center gap-4 mb-5 p-3.5 px-4 bg-slate-50">
            <div className="size-14 flex shrink-0 items-center justify-center bg-[#0F172A] font-bold text-white text-xl">
              {initials}
            </div>
            <div>
              <div className="font-bold text-[#0F172A] text-[15px]">{fullName}</div>
              <div className="text-slate-500 text-xs">{roleLabel} · {areaLabel}</div>
              <div className="mt-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#2563EB]">
                  {role}
                </span>
              </div>
            </div>
          </div>

          <SettingRow label="Full Name" value={fullName} />
          <SettingRow label="Role" value={roleLabel} />
          <SettingRow label="Contact Number" value={phoneLabel} />
          <SettingRow label="Assigned Area" value={areaLabel} />

          <div className="mt-[18px] mb-2 text-xs font-bold text-slate-500 uppercase tracking-[0.06em]">
            Access Status
          </div>
          <SettingRow label="Phone Verification" description="Verification requirement for account security" value={phoneVerifiedLabel} />
          <SettingRow label="ID Verification" description="Current identity verification workflow state" value={verificationLabel} />
          <SettingRow label="Account" description="Enforcement state from access control" value={accountStatusLabel} />

          <div className="mt-[18px] mb-2 text-xs font-bold text-slate-500 uppercase tracking-[0.06em]">
            {t('settings.language')}
          </div>
          <div className="py-3.5 border-b border-slate-100">
            <div className="text-[13px] font-semibold text-slate-800 mb-1">{t('settings.language')}</div>
            <div className="text-[11px] text-slate-400 mb-3">{t('settings.languageDesc')}</div>
            <div className="flex gap-2">
              {SUPPORTED_LOCALES.map((loc: Locale) => (
                <button
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    locale === loc
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Globe size={12} className="mr-1.5 inline-block" />
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
