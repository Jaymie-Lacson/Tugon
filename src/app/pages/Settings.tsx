import React, { useState } from 'react';
import {
  Settings as SettingsIcon, User, Bell, Shield, Database, Wifi,
  Monitor, Globe, Key, Save, ToggleLeft, ToggleRight, ChevronRight,
} from 'lucide-react';

const SECTIONS = [
  { id: 'profile', label: 'User Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'integrations', label: 'Integrations', icon: Wifi },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: value ? '#1E3A8A' : '#CBD5E1', padding: 0,
        display: 'flex', alignItems: 'center',
      }}
    >
      {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid #F1F5F9', gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState('profile');
  const [notifs, setNotifs] = useState({ critical: true, high: true, medium: false, sms: false, email: true, push: true });
  const [sys, setSys] = useState({ darkMode: false, autoRefresh: true, soundAlerts: true, compactView: false });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: '16px 20px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <SettingsIcon size={20} color="#1E3A8A" />
          <h1 style={{ color: '#1E293B', fontSize: 20, fontWeight: 700 }}>Settings</h1>
        </div>
        <p style={{ color: '#64748B', fontSize: 12 }}>System configuration — TUGON Incident Management System</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <div style={{
          width: 200, flexShrink: 0, background: 'white', borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden',
        }}>
          {SECTIONS.map(sec => {
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: active ? '#EFF6FF' : 'transparent',
                  borderLeft: active ? '3px solid #1E3A8A' : '3px solid transparent',
                  borderBottom: '1px solid #F8FAFC',
                  transition: 'background 0.15s',
                }}
              >
                <sec.icon size={15} color={active ? '#1E3A8A' : '#94A3B8'} />
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#1E3A8A' : '#475569', flex: 1 }}>
                  {sec.label}
                </span>
                {active && <ChevronRight size={13} color="#1E3A8A" />}
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div style={{ flex: 1, minWidth: 280, background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '20px 24px' }}>
          {activeSection === 'profile' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 16 }}>User Profile</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '14px 16px', background: '#F8FAFC', borderRadius: 10 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, color: 'white', fontSize: 20, flexShrink: 0,
                }}>JR</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 15 }}>Juan R. Reyes</div>
                  <div style={{ color: '#64748B', fontSize: 12 }}>MDRRMO Officer · Municipality of Tugon</div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ background: '#DBEAFE', color: '#1E3A8A', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                      ADMIN
                    </span>
                  </div>
                </div>
              </div>
              {[
                { label: 'Full Name', value: 'Juan R. Reyes' },
                { label: 'Position', value: 'MDRRMO Officer' },
                { label: 'Email', value: 'jreyes@tugon.gov.ph' },
                { label: 'Contact', value: '+63 917 123 4567' },
                { label: 'Assigned Area', value: 'Municipality of Tugon, Region IV-A' },
              ].map(field => (
                <div key={field.label} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {field.label}
                  </label>
                  <input
                    defaultValue={field.value}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: '1px solid #E2E8F0', fontSize: 13, color: '#1E293B',
                      background: 'white', boxSizing: 'border-box', outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {activeSection === 'notifications' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>Notification Settings</div>
              <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 16 }}>Configure how and when you receive alerts</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Alert Severity</div>
              <SettingRow label="Critical Incidents" description="Immediate alerts for life-threatening events">
                <Toggle value={notifs.critical} onChange={v => setNotifs({ ...notifs, critical: v })} />
              </SettingRow>
              <SettingRow label="High Priority Incidents" description="Alerts for high-severity incidents">
                <Toggle value={notifs.high} onChange={v => setNotifs({ ...notifs, high: v })} />
              </SettingRow>
              <SettingRow label="Medium Priority Incidents" description="Notifications for medium-severity events">
                <Toggle value={notifs.medium} onChange={v => setNotifs({ ...notifs, medium: v })} />
              </SettingRow>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 16 }}>Channels</div>
              <SettingRow label="Email Notifications" description="Send alerts to jreyes@tugon.gov.ph">
                <Toggle value={notifs.email} onChange={v => setNotifs({ ...notifs, email: v })} />
              </SettingRow>
              <SettingRow label="SMS Alerts" description="Send SMS to registered mobile number">
                <Toggle value={notifs.sms} onChange={v => setNotifs({ ...notifs, sms: v })} />
              </SettingRow>
              <SettingRow label="Push Notifications" description="In-browser push notifications">
                <Toggle value={notifs.push} onChange={v => setNotifs({ ...notifs, push: v })} />
              </SettingRow>
            </div>
          )}

          {activeSection === 'security' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>Security Settings</div>
              <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 16 }}>Manage access controls and authentication</div>
              <div style={{ padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>Account Secured</div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>Two-factor authentication is enabled. Last login: March 6, 2026 at 07:45 AM PHT</div>
              </div>
              {[
                { label: 'Change Password', desc: 'Update your account password', icon: Key },
                { label: 'Two-Factor Authentication', desc: 'Currently enabled via authenticator app', icon: Shield },
                { label: 'Active Sessions', desc: '1 active session on this device', icon: Monitor },
                { label: 'API Access Keys', desc: 'Manage integration tokens', icon: Key },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
                  borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={16} color="#1E3A8A" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{item.desc}</div>
                  </div>
                  <ChevronRight size={15} color="#CBD5E1" />
                </div>
              ))}
            </div>
          )}

          {activeSection === 'system' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>System Preferences</div>
              <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 16 }}>Customize the TUGON interface behavior</div>
              <SettingRow label="Auto-Refresh Data" description="Automatically refresh incident data every 30 seconds">
                <Toggle value={sys.autoRefresh} onChange={v => setSys({ ...sys, autoRefresh: v })} />
              </SettingRow>
              <SettingRow label="Sound Alerts" description="Play audio for critical incident notifications">
                <Toggle value={sys.soundAlerts} onChange={v => setSys({ ...sys, soundAlerts: v })} />
              </SettingRow>
              <SettingRow label="Compact View" description="Reduce spacing in tables and lists">
                <Toggle value={sys.compactView} onChange={v => setSys({ ...sys, compactView: v })} />
              </SettingRow>
              <SettingRow label="Dark Mode" description="Switch to dark color scheme (coming soon)">
                <Toggle value={sys.darkMode} onChange={v => setSys({ ...sys, darkMode: v })} />
              </SettingRow>
              <div style={{ marginTop: 16, padding: '12px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>SYSTEM INFO</div>
                {[
                  { label: 'Version', value: 'TUGON v2.4.1' },
                  { label: 'Last Updated', value: 'March 6, 2026' },
                  { label: 'Region', value: 'Region IV-A (CALABARZON)' },
                  { label: 'Data Retention', value: '365 days' },
                ].map(info => (
                  <div key={info.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{info.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{info.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>Integrations</div>
              <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 16 }}>Connected government systems and data sources</div>
              {[
                { name: 'NDRRMC Data Feed', desc: 'National Disaster Risk Reduction & Management Council', status: 'connected', color: '#059669' },
                { name: 'PAGASA Weather API', desc: 'Weather and typhoon tracking data', status: 'connected', color: '#059669' },
                { name: 'BFP Dispatch System', desc: 'Bureau of Fire Protection dispatch integration', status: 'connected', color: '#059669' },
                { name: 'PNP Command System', desc: 'Philippine National Police command interface', status: 'pending', color: '#B4730A' },
                { name: 'DOH Health Surveillance', desc: 'Department of Health epidemiology alerts', status: 'disconnected', color: '#B91C1C' },
              ].map(integ => (
                <div key={integ.name} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
                  borderBottom: '1px solid #F1F5F9',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Wifi size={16} color="#1E3A8A" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{integ.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{integ.desc}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, flexShrink: 0,
                    background: integ.status === 'connected' ? '#D1FAE5' : integ.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                    color: integ.color, textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {integ.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              style={{
                background: saved ? '#059669' : '#1E3A8A',
                color: 'white', border: 'none', borderRadius: 8,
                padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.3s',
              }}
            >
              <Save size={14} />
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
