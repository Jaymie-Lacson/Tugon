import React, { useState, useEffect } from 'react';
import { User, Shield, Globe, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSearchParams } from 'react-router';
import { getAuthSession } from '../utils/authSession';
import { useTranslation, SUPPORTED_LOCALES, LOCALE_LABELS } from '../i18n';
import type { Locale } from '../i18n';
import { OfficialPageHeader } from '../components/OfficialPageHeader';

function SettingRow({ label, description, value }: { label: string; description?: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--outline-variant)]/35 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[var(--on-surface)]">{label}</div>
        {description && <div className="mt-0.5 text-[11px] text-[var(--on-surface-variant)]">{description}</div>}
      </div>
      <div className="text-right text-xs font-semibold text-[var(--on-surface)]">{value}</div>
    </div>
  );
}

type SettingsCategory = 'account' | 'access' | 'language' | 'appearance';

export default function Settings() {
  const { locale, setLocale, t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = getAuthSession();
  const currentUser = session?.user;
  
  const tabParam = searchParams.get('tab') as SettingsCategory | null;
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(
    (tabParam && ['account', 'access', 'language', 'appearance'].includes(tabParam)) ? tabParam : 'account'
  );

  useEffect(() => {
    if (tabParam && ['account', 'access', 'language', 'appearance'].includes(tabParam) && tabParam !== activeCategory) {
      setActiveCategory(tabParam);
    }
  }, [tabParam]);

  const handleCategoryChange = (id: SettingsCategory) => {
    setActiveCategory(id);
    setSearchParams({ tab: id }, { replace: true });
  };

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

  const SidebarItem = ({ id, icon: Icon, label }: { id: SettingsCategory, icon: any, label: string }) => {
    const isActive = activeCategory === id;
    return (
      <button
        type="button"
        onClick={() => handleCategoryChange(id)}
        className={`w-full flex items-center gap-2.5 border-b border-[var(--outline-variant)]/25 px-4 py-3.5 text-left transition-colors ${
          isActive 
            ? 'bg-primary/5 text-primary' 
            : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)] hover:text-[var(--on-surface)]'
        }`}
      >
        <Icon size={15} className={isActive ? "text-primary" : "text-inherit"} />
        <span className={`text-[13px] ${isActive ? "font-bold" : "font-medium"}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="page-content p-4 px-5 min-h-full">
      <OfficialPageHeader title="Settings" subtitle={settingsSubtitle} />

      <div className="flex gap-4 flex-wrap items-start max-md:flex-col max-md:gap-3">
        <div className="w-[220px] shrink-0 overflow-hidden rounded-xl bg-[var(--surface-container-lowest)] max-md:w-full">
          <SidebarItem id="account" icon={User} label="Account" />
          <SidebarItem id="access" icon={Shield} label="Access Status" />
          <SidebarItem id="language" icon={Globe} label={t('settings.language')} />
          <SidebarItem id="appearance" icon={Monitor} label="Appearance" />
        </div>

        <div className="max-md:min-w-0 max-md:w-full flex-1 min-w-[280px] rounded-xl bg-[var(--surface-container-lowest)] px-6 py-5">
          {activeCategory === 'account' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-4 text-[15px] font-bold text-[var(--on-surface)]">User Profile</div>
              <div className="mb-3.5 text-[11px] text-[var(--on-surface-variant)]">
                This page only shows account details backed by your authenticated session.
              </div>

              <div className="mb-5 flex items-center gap-4 bg-[var(--surface-container-low)] p-3.5 px-4">
                <div className="flex size-14 shrink-0 items-center justify-center bg-[var(--primary)] text-xl font-bold text-white">
                  {initials}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-[var(--on-surface)]">{fullName}</div>
                  <div className="text-xs text-[var(--on-surface-variant)]">{roleLabel} · {areaLabel}</div>
                  <div className="mt-1">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                      {role}
                    </span>
                  </div>
                </div>
              </div>

              <SettingRow label="Full Name" value={fullName} />
              <SettingRow label="Role" value={roleLabel} />
              <SettingRow label="Contact Number" value={phoneLabel} />
              <SettingRow label="Assigned Area" value={areaLabel} />
            </div>
          )}

          {activeCategory === 'access' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-4 text-[15px] font-bold text-[var(--on-surface)]">Access Status</div>
              <div className="mb-3.5 text-[11px] text-[var(--on-surface-variant)]">
                Your current authorization levels and system access.
              </div>
              <SettingRow label="Phone Verification" description="Verification requirement for account security" value={phoneVerifiedLabel} />
              <SettingRow label="ID Verification" description="Current identity verification workflow state" value={verificationLabel} />
              <SettingRow label="Account" description="Enforcement state from access control" value={accountStatusLabel} />
            </div>
          )}

          {activeCategory === 'language' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-4 text-[15px] font-bold text-[var(--on-surface)]">{t('settings.language')}</div>
              <div className="mb-3.5 text-[11px] text-[var(--on-surface-variant)]">{t('settings.languageDesc')}</div>
              <div className="flex gap-2">
                {SUPPORTED_LOCALES.map((loc: Locale) => (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                      locale === loc
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
                    }`}
                  >
                    <Globe size={12} className="mr-1.5 inline-block" />
                    {LOCALE_LABELS[loc]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeCategory === 'appearance' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-4 text-[15px] font-bold text-[var(--on-surface)]">Appearance</div>
              <div className="mb-3.5 text-[11px] text-[var(--on-surface-variant)]">Choose how TUGON looks on your device.</div>
              <div className="flex gap-2 flex-wrap">
                {(['system', 'light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors capitalize ${
                      theme === t
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
                    }`}
                  >
                    {t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
