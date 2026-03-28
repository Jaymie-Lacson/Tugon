import React from 'react';
import { Settings as SettingsIcon, User, Shield } from 'lucide-react';
import { getAuthSession } from '../utils/authSession';

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
      <div className="mb-5">
        <div className="flex items-center gap-2.5 mb-1">
          <SettingsIcon size={20} className="text-primary" />
          <h1 className="text-slate-800 text-xl font-bold">Settings</h1>
        </div>
        <p className="text-slate-500 text-xs">{settingsSubtitle}</p>
      </div>

      <div className="flex gap-4 flex-wrap items-start max-md:flex-col max-md:gap-3">
        <div className="w-[220px] shrink-0 bg-white rounded-xl shadow-card overflow-hidden max-md:w-full">
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-50">
            <User size={15} className="text-primary" />
            <span className="text-[13px] font-bold text-primary">Account</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-50">
            <Shield size={15} className="text-primary" />
            <span className="text-[13px] font-bold text-primary">Access Status</span>
          </div>
        </div>

        <div className="flex-1 min-w-[280px] bg-white rounded-xl shadow-card px-6 py-5 max-md:min-w-0 max-md:w-full">
          <div className="text-[15px] font-bold text-slate-800 mb-4">User Profile</div>
          <div className="mb-3.5 text-[11px] text-slate-500">
            This page only shows account details backed by your authenticated session.
          </div>

          <div className="flex items-center gap-4 mb-5 p-3.5 px-4 bg-slate-50 rounded-[10px]">
            <div className="size-14 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-bold text-white text-xl shrink-0">
              {initials}
            </div>
            <div>
              <div className="font-bold text-slate-800 text-[15px]">{fullName}</div>
              <div className="text-slate-500 text-xs">{roleLabel} · {areaLabel}</div>
              <div className="mt-1">
                <span className="bg-blue-100 text-primary text-[10px] font-semibold px-2 py-0.5 rounded">
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
        </div>
      </div>
    </div>
  );
}
