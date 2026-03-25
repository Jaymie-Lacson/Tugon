import React from 'react';
import { Settings as SettingsIcon, User, Shield } from 'lucide-react';
import { getAuthSession } from '../utils/authSession';

function SettingRow({ label, description, value }: { label: string; description?: string; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid #F1F5F9', gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ fontSize: 12, color: '#334155', fontWeight: 600, textAlign: 'right' }}>{value}</div>
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
    <div style={{ padding: '16px 20px', minHeight: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <SettingsIcon size={20} color="#1E3A8A" />
          <h1 style={{ color: '#1E293B', fontSize: 20, fontWeight: 700 }}>Settings</h1>
        </div>
        <p style={{ color: '#64748B', fontSize: 12 }}>{settingsSubtitle}</p>
      </div>

      <div className="settings-layout" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div className="settings-sidebar" style={{
          width: 220,
          flexShrink: 0,
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #F8FAFC' }}>
            <User size={15} color="#1E3A8A" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A' }}>Account</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #F8FAFC' }}>
            <Shield size={15} color="#1E3A8A" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A' }}>Access Status</span>
          </div>
        </div>

        <div className="settings-content" style={{ flex: 1, minWidth: 280, background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '20px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 16 }}>User Profile</div>
          <div style={{ marginBottom: 14, fontSize: 11, color: '#64748B' }}>
            This page only shows account details backed by your authenticated session.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '14px 16px', background: '#F8FAFC', borderRadius: 10 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: 'white',
              fontSize: 20,
              flexShrink: 0,
            }}>{initials}</div>
            <div>
              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 15 }}>{fullName}</div>
              <div style={{ color: '#64748B', fontSize: 12 }}>{roleLabel} · {areaLabel}</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ background: '#DBEAFE', color: '#1E3A8A', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                  {role}
                </span>
              </div>
            </div>
          </div>

          <SettingRow label="Full Name" value={fullName} />
          <SettingRow label="Role" value={roleLabel} />
          <SettingRow label="Contact Number" value={phoneLabel} />
          <SettingRow label="Assigned Area" value={areaLabel} />

          <div style={{ marginTop: 18, marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Access Status
          </div>
          <SettingRow label="Phone Verification" description="Verification requirement for account security" value={phoneVerifiedLabel} />
          <SettingRow label="ID Verification" description="Current identity verification workflow state" value={verificationLabel} />
          <SettingRow label="Account" description="Enforcement state from access control" value={accountStatusLabel} />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .settings-layout {
            flex-direction: column;
            gap: 12px;
          }

          .settings-sidebar,
          .settings-content {
            width: 100% !important;
            min-width: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
