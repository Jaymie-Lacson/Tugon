import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Filter, Users, Shield, Lock,
  Edit2, CheckCircle2, XCircle, Clock,
  ChevronLeft, ChevronRight, UserCheck, UserX, Eye, Download,
  X,
} from 'lucide-react';
import { SAUser } from '../../data/superAdminData';
import { OfficialPageInitialLoader } from '../../components/OfficialPageInitialLoader';
import { superAdminApi, type ApiAdminUser } from '../../services/superAdminApi';
import type { Role } from '../../services/authApi';

const PRIMARY = '#1E3A8A';

const ROLE_CONFIG = {
  'Super Admin': { color: '#1E3A8A', bg: '#DBEAFE', icon: <Shield size={11} /> },
  'Barangay Admin': { color: '#1D4ED8', bg: '#DBEAFE', icon: <Users size={11} /> },
  'Viewer': { color: '#374151', bg: '#F3F4F6', icon: <Eye size={11} /> },
} as const;

type SupportedUiRole = keyof typeof ROLE_CONFIG;

const STATUS_CONFIG = {
  active: { color: '#059669', bg: '#D1FAE5', label: 'Active', icon: <CheckCircle2 size={11} /> },
  inactive: { color: '#6B7280', bg: '#F3F4F6', label: 'Inactive', icon: <Clock size={11} /> },
} as const;

type SupportedUiStatus = keyof typeof STATUS_CONFIG;

const ROLES = ['All Roles', 'Super Admin', 'Barangay Admin', 'Viewer'] as const;
const STATUSES = ['All Status', 'active', 'inactive'] as const;
const BARANGAYS = ['All Barangays', 'Brgy. 251', 'Brgy. 252', 'Brgy. 256'] as const;

const PAGE_SIZE = 8;

type SAUserRow = Omit<SAUser, 'role' | 'status'> & {
  role: SupportedUiRole;
  status: SupportedUiStatus;
  backendUserId?: string;
  backendRole?: Role;
  backendBarangayCode?: string | null;
};

function formatLastActive(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return `${Math.floor(diffMin / 1440)}d ago`;
}

function mapApiRoleToUiRole(role: ApiAdminUser['role']): SupportedUiRole {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'OFFICIAL') return 'Barangay Admin';
  return 'Viewer';
}

function mapApiUserToSaUser(user: ApiAdminUser, index: number): SAUserRow {
  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const role = mapApiRoleToUiRole(user.role);
  const avatarColor =
    role === 'Super Admin' ? '#7C3AED' : role === 'Barangay Admin' ? '#1D4ED8' : '#6B7280';

  return {
    id: index + 1,
    name: user.fullName,
    initials: initials || 'U',
    email: user.phoneNumber,
    role,
    barangay: user.barangayCode ? `Brgy. ${user.barangayCode}` : 'All Barangays',
    status: user.isPhoneVerified ? 'active' : 'inactive',
    lastActive: user.updatedAt,
    avatarColor,
    backendUserId: user.id,
    backendRole: user.role,
    backendBarangayCode: user.barangayCode,
  };
}

function mapUiRoleToApiRole(role: SupportedUiRole): Role {
  if (role === 'Super Admin') return 'SUPER_ADMIN';
  if (role === 'Viewer') return 'CITIZEN';
  return 'OFFICIAL';
}

function extractBarangayCode(value: string): string | undefined {
  const match = value.match(/\d{3}/);
  return match ? match[0] : undefined;
}

function normalizePhoneNumberInput(value: string): string {
  return value.replace(/\D/g, '');
}

type ModalMode = 'view' | 'edit' | 'create';

interface UserModalSubmitPayload {
  fullName: string;
  phoneNumber: string;
  password: string;
  role: SupportedUiRole;
  barangay: string;
  status: SupportedUiStatus;
}

interface UserModalProps {
  user: SAUserRow | null;
  onClose: () => void;
  mode: ModalMode;
  saving?: boolean;
  error?: string | null;
  onSubmit?: (payload: UserModalSubmitPayload) => void;
}

function UserModal({ user, onClose, mode, saving = false, error = null, onSubmit }: UserModalProps) {
  const [formData, setFormData] = useState({
    fullName: user?.name ?? '',
    phoneNumber: user?.email ?? '',
    password: '',
    role: user?.role ?? 'Viewer',
    barangay: user?.barangay ?? 'Brgy. 251',
    status: user?.status ?? 'active',
  });

  const title = mode === 'create' ? 'Create User' : mode === 'edit' ? 'Edit User' : 'User Details';
  const isReadOnlyMode = mode === 'view';
  const isCreateMode = mode === 'create';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 500,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'modal-in 0.2s ease',
      }}>
        {/* Modal header */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#1E3A8A', borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="#BFDBFE" />
            </div>
            <div>
              <div style={{ color: '#E2E8F0', fontSize: 15, fontWeight: 700 }}>{title}</div>
              {user && (
                <div style={{ color: '#64748B', fontSize: 11 }}>ID: USR-{String(user.id).padStart(4, '0')}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#94A3B8" />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Avatar */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '12px 14px', background: '#F9FAFB', borderRadius: 10 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: user.avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: 'white', fontSize: 16, flexShrink: 0,
              }}>{user.initials}</div>
              <div>
                <div style={{ color: '#0F172A', fontSize: 16, fontWeight: 700 }}>{user.name}</div>
                <div style={{ color: '#6B7280', fontSize: 12 }}>{user.email}</div>
                <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>Last active: {formatLastActive(user.lastActive)}</div>
              </div>
            </div>
          )}

          {error ? (
            <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: 12, padding: '8px 10px' }}>
              {error}
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!isReadOnlyMode ? (
              <>
                <div>
                  <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name</label>
                  <input
                    value={formData.fullName}
                    onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))}
                    disabled={mode === 'edit'}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: mode === 'edit' ? '#F9FAFB' : 'white' }}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone Number</label>
                  <input
                    value={formData.phoneNumber}
                    onChange={e => setFormData(f => ({ ...f, phoneNumber: e.target.value }))}
                    disabled={mode === 'edit'}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: mode === 'edit' ? '#F9FAFB' : 'white' }}
                    placeholder="09xxxxxxxxx"
                  />
                </div>
                {isCreateMode ? (
                  <div>
                    <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Initial Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                      placeholder="At least 8 characters"
                    />
                  </div>
                ) : null}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Role</label>
                    <select
                      value={formData.role}
                      onChange={e => setFormData(f => ({ ...f, role: e.target.value as SupportedUiRole }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white', cursor: 'pointer' }}
                    >
                      {(['Super Admin', 'Barangay Admin', 'Viewer'] as const).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Barangay</label>
                    <select
                      value={formData.barangay}
                      onChange={e => setFormData(f => ({ ...f, barangay: e.target.value }))}
                      disabled={formData.role === 'Super Admin'}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white', cursor: 'pointer' }}
                    >
                      {['Brgy. 251', 'Brgy. 252', 'Brgy. 256'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Status</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['active', 'inactive'] as const).map(s => {
                      const sc = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          onClick={() => setFormData(f => ({ ...f, status: s }))}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                            border: `2px solid ${formData.status === s ? sc.color : '#E5E7EB'}`,
                            background: formData.status === s ? sc.bg : 'transparent',
                            color: formData.status === s ? sc.color : '#6B7280',
                            fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          }}
                        >
                          {sc.icon} {sc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {mode === 'edit' ? (
                  <div style={{ color: '#6B7280', fontSize: 11 }}>
                    Name and phone edits are disabled in this phase. Use role, barangay, and status reassignment only.
                  </div>
                ) : null}
              </>
            ) : (
              user && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Role', value: user.role },
                    { label: 'Barangay', value: user.barangay },
                    { label: 'Status', value: user.status },
                    { label: 'Last Active', value: formatLastActive(user.lastActive) },
                  ].map(f => (
                    <div key={f.label} style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ color: '#9CA3AF', fontSize: 10, marginBottom: 3 }}>{f.label}</div>
                      <div style={{ color: '#0F172A', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}
          >
            {mode === 'view' ? 'Close' : 'Cancel'}
          </button>
          {!isReadOnlyMode && (
            <button
              onClick={() => {
                onSubmit?.({
                  fullName: formData.fullName,
                  phoneNumber: formData.phoneNumber,
                  password: formData.password,
                  role: formData.role,
                  barangay: formData.barangay,
                  status: formData.status,
                });
              }}
              disabled={saving}
              style={{ padding: '9px 18px', border: 'none', borderRadius: 8, background: PRIMARY, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, color: 'white', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : isCreateMode ? 'Create User' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes modal-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

export default function SAUsers() {
  const [usersData, setUsersData] = useState<SAUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [barangayFilter, setBarangayFilter] = useState('All Barangays');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ user: SAUserRow | null; mode: ModalMode } | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    return usersData.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'All Roles' || u.role === roleFilter;
      const matchStatus = statusFilter === 'All Status' || u.status === statusFilter;
      const matchBrgy = barangayFilter === 'All Barangays' || u.barangay === barangayFilter;
      return matchSearch && matchRole && matchStatus && matchBrgy;
    });
  }, [usersData, search, roleFilter, statusFilter, barangayFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const counts = {
    total: usersData.length,
    active: usersData.filter(u => u.status === 'active').length,
    inactive: usersData.filter(u => u.status === 'inactive').length,
  };

  const loadUsers = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const payload = await superAdminApi.getUsers();
      setUsersData(payload.users.map((user, index) => mapApiUserToSaUser(user, index)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load users.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleBulkStatusUpdate = async (nextStatus: SupportedUiStatus) => {
    if (selectedIds.size === 0) {
      return;
    }

    setLoading(true);
    setApiError(null);
    try {
      const selectedUsers = usersData.filter((user) => selectedIds.has(user.id));

      await Promise.all(
        selectedUsers
          .filter((user) => Boolean(user.backendUserId))
          .map(async (user) => {
            const role = user.backendRole ?? mapUiRoleToApiRole(user.role);
            const fallbackBarangay = extractBarangayCode(user.barangay);
            await superAdminApi.updateUserRole(user.backendUserId as string, {
              role,
              barangayCode: role === 'SUPER_ADMIN' ? undefined : (user.backendBarangayCode ?? fallbackBarangay),
              isPhoneVerified: nextStatus === 'active',
            });
          }),
      );

      setSelectedIds(new Set());
      await loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update selected users.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && usersData.length === 0) {
    return <OfficialPageInitialLoader label="Loading super admin users" />;
  }

  const handleEditUser = async (payload: UserModalSubmitPayload) => {
    if (!modal || modal.mode !== 'edit' || !modal.user?.backendUserId) {
      setModalError('Selected user cannot be edited from backend source.');
      return;
    }

    const apiRole = mapUiRoleToApiRole(payload.role);
    const barangayCode = extractBarangayCode(payload.barangay);

    if (apiRole !== 'SUPER_ADMIN' && !barangayCode) {
      setModalError('Barangay is required when assigning citizen or official roles.');
      return;
    }

    setModalSaving(true);
    setModalError(null);
    setApiError(null);
    try {
      const updated = await superAdminApi.updateUserRole(modal.user.backendUserId, {
        role: apiRole,
        barangayCode,
        isPhoneVerified: payload.status === 'active',
      });

      setUsersData((current) =>
        current.map((item, index) =>
          item.backendUserId === updated.user.id ? mapApiUserToSaUser(updated.user, index) : item,
        ),
      );
      setModal(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user role.';
      setModalError(message);
    } finally {
      setModalSaving(false);
    }
  };

  const handleCreateUser = async (payload: UserModalSubmitPayload) => {
    const apiRole = mapUiRoleToApiRole(payload.role);
    const barangayCode = extractBarangayCode(payload.barangay);
    const normalizedPhoneNumber = normalizePhoneNumberInput(payload.phoneNumber);

    if (!payload.fullName.trim()) {
      setModalError('Full name is required.');
      return;
    }

    if (normalizedPhoneNumber.length < 10 || normalizedPhoneNumber.length > 11) {
      setModalError('Phone number must contain 10 to 11 digits.');
      return;
    }

    if (payload.password.length < 8) {
      setModalError('Initial password must be at least 8 characters.');
      return;
    }

    if (apiRole !== 'SUPER_ADMIN' && !barangayCode) {
      setModalError('Barangay is required when assigning citizen or official roles.');
      return;
    }

    setModalSaving(true);
    setModalError(null);
    setApiError(null);
    try {
      await superAdminApi.createUser({
        fullName: payload.fullName.trim(),
        phoneNumber: normalizedPhoneNumber,
        password: payload.password,
        role: apiRole,
        barangayCode,
        isPhoneVerified: payload.status === 'active',
      });
      setPage(1);
      await loadUsers();
      setModal(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create user.';
      setModalError(message);
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#F0F4FF', minHeight: '100%' }}>
      {/* Header */}
      <div className="sa-users-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 10 }}>
        <div>
          <h1 style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, margin: 0 }}>User Management</h1>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0, marginTop: 2 }}>
            Manage accounts, roles & permissions across all barangays
          </p>
        </div>
        <div className="sa-users-header-actions" style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => {
              void loadUsers();
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'white', border: '1px solid #E5E7EB', borderRadius: 8,
              padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151',
            }}
          >
            <Download size={13} color="#6B7280" /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              setApiError(null);
              setModalError(null);
              setModalSaving(false);
              setModal({ user: null, mode: 'create' });
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: PRIMARY, border: 'none', borderRadius: 8,
              padding: '8px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'white',
            }}
          >
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {apiError ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px', color: '#B91C1C', fontSize: 12 }}>
          {apiError}
        </div>
      ) : null}

      {/* Stats chips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Users', value: counts.total, color: PRIMARY, icon: <Users size={16} color={PRIMARY} /> },
          { label: 'Active', value: counts.active, color: '#059669', icon: <CheckCircle2 size={16} color="#059669" /> },
          { label: 'Inactive', value: counts.inactive, color: '#6B7280', icon: <Clock size={16} color="#6B7280" /> },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'white', borderRadius: 10, padding: '12px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
            display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 130,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ color: '#0F172A', fontSize: 20, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="sa-users-filter-bar" style={{
        background: 'white', borderRadius: 12, padding: '14px 16px', marginBottom: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users..."
            style={{
              width: '100%', padding: '8px 10px 8px 32px',
              border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <Filter size={14} color="#9CA3AF" />

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, outline: 'none', background: 'white', cursor: 'pointer', color: '#374151' }}
        >
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, outline: 'none', background: 'white', cursor: 'pointer', color: '#374151' }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s === 'All Status' ? 'All Status' : STATUS_CONFIG[s as SupportedUiStatus].label}</option>)}
        </select>

        {/* Barangay filter */}
        <select
          value={barangayFilter}
          onChange={e => { setBarangayFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, outline: 'none', background: 'white', cursor: 'pointer', color: '#374151' }}
        >
          {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Results count */}
        <span style={{ color: '#9CA3AF', fontSize: 12, marginLeft: 'auto' }}>
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div style={{
          background: '#0F172A', borderRadius: 10, padding: '10px 16px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>{selectedIds.size} selected</span>
          <button
            onClick={() => {
              void handleBulkStatusUpdate('active');
            }}
            style={{ padding: '5px 12px', background: '#0F766E', border: 'none', borderRadius: 6, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <UserCheck size={12} /> Activate
          </button>
          <button
            onClick={() => {
              void handleBulkStatusUpdate('inactive');
            }}
            style={{ padding: '5px 12px', background: '#B4730A', border: 'none', borderRadius: 6, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <UserX size={12} /> Deactivate
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} color="#64748B" />
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{
        background: 'white', borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
        marginBottom: 14,
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F3F4F6' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', width: 32 }}>
                  <input type="checkbox" style={{ cursor: 'pointer', accentColor: PRIMARY }} />
                </th>
                {['User', 'Role', 'Barangay', 'Status', 'Last Active', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#6B7280', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ color: '#9CA3AF', fontSize: 13 }}>No users found matching your filters.</div>
                  </td>
                </tr>
              ) : paginated.map((user, i) => {
                const rc = ROLE_CONFIG[user.role];
                const sc = STATUS_CONFIG[user.status];
                const isSelected = selectedIds.has(user.id);
                return (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: i < paginated.length - 1 ? '1px solid #F9FAFB' : 'none',
                      background: isSelected ? '#EFF6FF' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#FAFAFA'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(user.id)}
                        style={{ cursor: 'pointer', accentColor: PRIMARY }}
                      />
                    </td>

                    {/* User */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: user.avatarColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, color: 'white', fontSize: 12, flexShrink: 0,
                        }}>{user.initials}</div>
                        <div>
                          <div style={{ color: '#0F172A', fontWeight: 600, fontSize: 13 }}>{user.name}</div>
                          <div style={{ color: '#9CA3AF', fontSize: 11 }}>{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: rc.bg, color: rc.color,
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                        whiteSpace: 'nowrap',
                      }}>
                        {rc.icon} {user.role}
                      </div>
                    </td>

                    {/* Barangay */}
                    <td style={{ padding: '12px 14px', color: '#374151', fontSize: 12, fontWeight: 500 }}>{user.barangay}</td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: sc.bg, color: sc.color,
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                      }}>
                        {sc.icon} {sc.label}
                      </div>
                    </td>

                    {/* Last active */}
                    <td style={{ padding: '12px 14px', color: '#6B7280', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={11} color="#9CA3AF" />
                        {formatLastActive(user.lastActive)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => {
                            setModalError(null);
                            setModalSaving(false);
                            setModal({ user, mode: 'view' });
                          }}
                          title="View"
                          style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Eye size={13} color="#6B7280" />
                        </button>
                        <button
                          onClick={() => {
                            setModalError(null);
                            setModalSaving(false);
                            setModal({ user, mode: 'edit' });
                          }}
                          title="Edit"
                          style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Edit2 size={13} color="#6B7280" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA',
        }}>
          <div style={{ color: '#9CA3AF', fontSize: 12 }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                width: 30, height: 30, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white',
                cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronLeft size={14} color="#374151" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: 30, height: 30, border: `1px solid ${page === p ? PRIMARY : '#E5E7EB'}`,
                  borderRadius: 6, background: page === p ? PRIMARY : 'white',
                  cursor: 'pointer', fontSize: 12, fontWeight: page === p ? 700 : 400,
                  color: page === p ? 'white' : '#374151',
                }}
              >{p}</button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                width: 30, height: 30, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white',
                cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronRight size={14} color="#374151" />
            </button>
          </div>
        </div>
      </div>

      {/* Role permissions reference */}
      <div style={{
        background: 'white', borderRadius: 14, padding: '18px 20px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Lock size={15} color={PRIMARY} />
          <div style={{ color: '#0F172A', fontSize: 14, fontWeight: 700 }}>Role Permissions Matrix</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: 11, fontWeight: 600 }}>Permission</th>
                {Object.keys(ROLE_CONFIG).map(r => (
                  <th key={r} style={{ padding: '8px 12px', textAlign: 'center', color: '#9CA3AF', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['View Incidents', true, true, true],
                ['Create Incidents', false, true, false],
                ['Manage Incidents', false, true, false],
                ['View Analytics', true, true, false],
                ['System Settings', true, false, false],
                ['Manage Users', true, true, false],
                ['Export Reports', true, true, false],
              ].map(([label, ...perms]) => (
                <tr key={String(label)} style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <td style={{ padding: '8px 12px', color: '#374151', fontWeight: 500 }}>{label}</td>
                  {perms.map((p, i) => (
                    <td key={i} style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {p
                        ? <CheckCircle2 size={15} color="#059669" />
                        : <XCircle size={15} color="#D1D5DB" />
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <UserModal
          user={modal.user}
          mode={modal.mode}
          onClose={() => {
            setModalError(null);
            setModalSaving(false);
            setModal(null);
          }}
          saving={modalSaving}
          error={modalError}
          onSubmit={(payload) => {
            if (modal.mode === 'create') {
              void handleCreateUser(payload);
              return;
            }
            void handleEditUser(payload);
          }}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .sa-users-header {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .sa-users-header-actions {
            width: 100%;
          }

          .sa-users-header-actions button {
            flex: 1;
            min-height: 40px;
            justify-content: center;
          }

          .sa-users-filter-bar {
            flex-direction: column;
            align-items: stretch !important;
          }

          .sa-users-filter-bar > span {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
