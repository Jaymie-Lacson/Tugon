import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Filter, Users, Shield,
  Edit2, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, UserCheck, UserX, Eye, Download,
  X,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import CardSkeleton from '../../components/ui/CardSkeleton';
import TableSkeleton from '../../components/ui/TableSkeleton';
import TextSkeleton from '../../components/ui/TextSkeleton';
import { superAdminApi, type ApiAdminUser } from '../../services/superAdminApi';
import type { Role } from '../../services/authApi';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';

const PRIMARY = 'var(--primary)';

const ROLE_CONFIG = {
  'Super Admin': { color: 'var(--primary)', bg: 'var(--primary-fixed)', icon: <Shield size={11} /> },
  'Barangay Admin': { color: 'var(--primary-container)', bg: 'var(--primary-fixed)', icon: <Users size={11} /> },
  'Viewer': { color: 'var(--on-surface-variant)', bg: 'var(--surface-container-low)', icon: <Eye size={11} /> },
} as const;

type SupportedUiRole = keyof typeof ROLE_CONFIG;

const STATUS_CONFIG = {
  active: { color: 'var(--severity-low)', bg: 'var(--severity-low-bg)', label: 'Active', icon: <CheckCircle2 size={11} /> },
  inactive: { color: 'var(--outline)', bg: 'var(--surface-container-low)', label: 'Inactive', icon: <Clock size={11} /> },
} as const;

type SupportedUiStatus = keyof typeof STATUS_CONFIG;

const ROLES = ['All Roles', 'Super Admin', 'Barangay Admin', 'Viewer'] as const;
const STATUSES = ['All Status', 'active', 'inactive'] as const;
const BARANGAYS = ['All Barangays', 'Brgy. 251', 'Brgy. 252', 'Brgy. 256'] as const;

const PAGE_SIZE = 8;

function getToneBackgroundClass(color: string) {
  switch (color) {
    case 'var(--primary)':
      return 'bg-[var(--primary-fixed)]';
    case 'var(--severity-low)':
      return 'bg-[var(--severity-low-bg)]';
    case 'var(--outline)':
      return 'bg-surface-container-high';
    case 'var(--primary-container)':
      return 'bg-surface-container-high';
    case '#7C3AED':
      return 'bg-[rgba(124,58,237,0.12)]';
    default:
      return 'bg-surface-container-high';
  }
}

function getAvatarBackgroundClass(color: string) {
  switch (color) {
    case '#7C3AED':
      return 'bg-[#7C3AED]';
    case '#1D4ED8':
      return 'bg-[#1D4ED8]';
    case '#6B7280':
      return 'bg-[#6B7280]';
    default:
      return 'bg-slate-500';
  }
}

function getRoleBadgeClass(role: SupportedUiRole) {
  if (role === 'Super Admin') return 'bg-[var(--primary-fixed)] text-primary';
  if (role === 'Barangay Admin') return 'bg-[var(--primary-fixed)] text-[var(--primary-container)]';
  return 'bg-surface-container-low text-[var(--on-surface-variant)]';
}

function getStatusBadgeClass(status: SupportedUiStatus) {
  return status === 'active'
    ? 'bg-[var(--severity-low-bg)] text-[var(--severity-low)]'
    : 'bg-surface-container-low text-[var(--outline)]';
}

type SAUserRow = {
  id: number;
  name: string;
  initials: string;
  email: string;
  barangay: string;
  lastActive: string;
  avatarColor: string;
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: user?.name ?? '',
    phoneNumber: user?.email ?? '',
    password: '',
    role: user?.role ?? 'Viewer',
    barangay: user?.barangay ?? 'Brgy. 251',
    status: user?.status ?? 'active',
  });

  const title = mode === 'create' ? t('superadmin.users.createUser') : mode === 'edit' ? t('superadmin.users.editUser') : t('superadmin.users.userDetails');
  const isReadOnlyMode = mode === 'view';
  const isCreateMode = mode === 'create';

  return (
    <div className="fixed inset-0 z-[100] bg-[rgba(0,0,0,0.5)] flex items-center justify-center p-5">
      <div
        className="bg-white rounded-2xl w-full max-w-[500px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[modal-in_0.2s_ease]"
      >
        {/* Modal header */}
        <div className="px-5 py-[18px] border-b border-[#F3F4F6] flex items-center justify-between bg-primary rounded-t-2xl">
          <div className="flex items-center gap-[10px]">
            <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.15)] flex items-center justify-center">
              <Users size={16} className="text-[var(--primary-fixed-dim)]" />
            </div>
            <div>
              <div className="text-[#E2E8F0] text-[15px] font-bold">{title}</div>
              {user && (
                <div className="text-[#64748B] text-[11px]">ID: USR-{String(user.id).padStart(4, '0')}</div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            title={t('common.close')}
            aria-label={t('common.close')}
            className="bg-[rgba(255,255,255,0.07)] border-0 rounded-lg w-[30px] h-[30px] cursor-pointer flex items-center justify-center"
          >
              <X size={16} className="text-[var(--outline-variant)]" />
          </button>
        </div>

        <div className="p-5">
          {/* Avatar */}
          {user && (
            <div className="flex items-center gap-[14px] mb-5 px-[14px] py-3 bg-[#F9FAFB] rounded-[10px]">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shrink-0 ${getAvatarBackgroundClass(user.avatarColor)}`}
              >{user.initials}</div>
              <div>
                <div className="text-[#0F172A] text-base font-bold">{user.name}</div>
                <div className="text-[#6B7280] text-xs">{user.email}</div>
                <div className="text-[#9CA3AF] text-[11px] mt-[2px]">{t('superadmin.users.lastActive', { time: formatLastActive(user.lastActive) })}</div>
              </div>
            </div>
          )}

          {error ? (
            <div className="mb-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-severity-critical text-xs px-[10px] py-2">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-[14px]">
            {!isReadOnlyMode ? (
              <>
                <div>
                  <label className="text-[#374151] text-xs font-semibold block mb-[6px]">{t('superadmin.users.fullName')}</label>
                  <input
                    value={formData.fullName}
                    onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))}
                    disabled={mode === 'edit'}
                    className={`w-full px-3 py-[9px] border border-[#E5E7EB] rounded-lg text-[13px] outline-none box-border ${mode === 'edit' ? 'bg-[#F9FAFB]' : 'bg-white'}`}
                    placeholder={t('superadmin.users.fullNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="text-[#374151] text-xs font-semibold block mb-[6px]">{t('superadmin.users.phoneNumber')}</label>
                  <input
                    value={formData.phoneNumber}
                    onChange={e => setFormData(f => ({ ...f, phoneNumber: e.target.value }))}
                    disabled={mode === 'edit'}
                    className={`w-full px-3 py-[9px] border border-[#E5E7EB] rounded-lg text-[13px] outline-none box-border ${mode === 'edit' ? 'bg-[#F9FAFB]' : 'bg-white'}`}
                    placeholder="09xxxxxxxxx"
                  />
                </div>
                {isCreateMode ? (
                  <div>
                    <label className="text-[#374151] text-xs font-semibold block mb-[6px]">{t('superadmin.users.initialPassword')}</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-3 py-[9px] border border-[#E5E7EB] rounded-lg text-[13px] outline-none box-border bg-white"
                      placeholder={t('superadmin.users.passwordPlaceholder')}
                    />
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#374151] text-xs font-semibold block mb-[6px]">{t('superadmin.users.roleLabel')}</label>
                    <select
                      value={formData.role}
                      onChange={e => setFormData(f => ({ ...f, role: e.target.value as SupportedUiRole }))}
                      title={t('superadmin.users.roleLabel')}
                      className="w-full px-3 py-[9px] border border-[#E5E7EB] rounded-lg text-[13px] outline-none bg-white cursor-pointer"
                    >
                      {(['Super Admin', 'Barangay Admin', 'Viewer'] as const).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[#374151] text-xs font-semibold block mb-[6px]">{t('superadmin.users.barangay')}</label>
                    <select
                      value={formData.barangay}
                      onChange={e => setFormData(f => ({ ...f, barangay: e.target.value }))}
                      disabled={formData.role === 'Super Admin'}
                      title={t('superadmin.users.barangay')}
                      className="w-full px-3 py-[9px] border border-[#E5E7EB] rounded-lg text-[13px] outline-none bg-white cursor-pointer"
                    >
                      {['Brgy. 251', 'Brgy. 252', 'Brgy. 256'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[#374151] text-xs font-semibold block mb-[6px]">{t('superadmin.users.status')}</label>
                  <div className="flex gap-2">
                    {(['active', 'inactive'] as const).map(s => {
                      const sc = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          onClick={() => setFormData(f => ({ ...f, status: s }))}
                          className={`flex-1 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold capitalize flex items-center justify-center gap-[5px] border-2 ${
                            formData.status === s
                              ? `${getStatusBadgeClass(s)} ${s === 'active' ? 'border-[var(--severity-low)]' : 'border-[var(--outline)]'}`
                              : 'border-[#E5E7EB] bg-transparent text-[var(--outline)]'
                          }`}
                        >
                          {sc.icon} {sc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {mode === 'edit' ? (
                  <div className="text-[#6B7280] text-[11px]">
                    {t('superadmin.users.editDisabledHint')}
                  </div>
                ) : null}
              </>
            ) : (
              user && (
                <div className="grid grid-cols-2 gap-[10px]">
                  {[
                    { label: t('superadmin.users.role'), value: user.role },
                    { label: t('superadmin.users.barangay'), value: user.barangay },
                    { label: t('superadmin.users.status'), value: user.status },
                    { label: t('superadmin.users.lastActiveLabel'), value: formatLastActive(user.lastActive) },
                  ].map(f => (
                    <div key={f.label} className="bg-[#F9FAFB] rounded-lg px-3 py-[10px]">
                      <div className="text-[#9CA3AF] text-[10px] mb-[3px]">{f.label}</div>
                      <div className="text-[#0F172A] text-[13px] font-semibold capitalize">{f.value}</div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-[14px] border-t border-[#F3F4F6] flex justify-end gap-[10px]">
          <button
            onClick={onClose}
            className="px-[18px] py-[9px] border border-[#E5E7EB] rounded-lg bg-white cursor-pointer text-[13px] font-semibold text-[#374151]"
          >
            {mode === 'view' ? t('common.close') : t('common.cancel')}
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
              className={`px-[18px] py-[9px] border-0 rounded-lg bg-primary text-white text-[13px] font-semibold ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100'}`}
            >
              {saving ? t('common.saving') : isCreateMode ? t('superadmin.users.createUser') : t('superadmin.users.saveChanges')}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes modal-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

export default function SAUsers() {
  const { t } = useTranslation();
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
    return (
      <div className="p-5 min-h-full">
        <TextSkeleton rows={2} title={false} />
        <div className="mt-3">
          <CardSkeleton
            count={3}
            lines={2}
            showImage={false}
            gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          />
        </div>
        <div className="mt-3">
          <TableSkeleton rows={8} columns={5} showHeader />
        </div>
      </div>
    );
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
    <div className="p-5 bg-background min-h-full">
      {/* Header */}
      <div className="sa-users-header flex items-center justify-between mb-[18px] gap-[10px]">
        <div>
          <h1 className="text-foreground text-[22px] font-bold m-0">{t('superadmin.users.title')}</h1>
          <p className="text-muted-foreground text-xs m-0 mt-[2px]">
            {t('superadmin.users.subtitle')}
          </p>
        </div>
        <div className="sa-users-header-actions flex gap-[10px]">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void loadUsers(); }}
            className="gap-[6px] text-xs font-semibold"
          >
            <Download size={13} /> {loading ? t('common.refreshing') : t('common.refresh')}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setApiError(null);
              setModalError(null);
              setModalSaving(false);
              setModal({ user: null, mode: 'create' });
            }}
            className="gap-[6px] text-xs font-semibold"
          >
            <Plus size={14} /> {t('superadmin.users.addUser')}
          </Button>
        </div>
      </div>

      {apiError ? (
        <div className="mb-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] px-3 py-[10px] text-severity-critical text-xs">
          {apiError}
        </div>
      ) : null}

      {/* Stats chips */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { label: t('superadmin.users.totalUsers'), value: counts.total, color: PRIMARY, icon: <Users size={16} className="text-primary" /> },
          { label: t('superadmin.users.active'), value: counts.active, color: 'var(--severity-low)', icon: <CheckCircle2 size={16} className="text-[var(--severity-low)]" /> },
          { label: t('superadmin.users.inactive'), value: counts.inactive, color: 'var(--outline)', icon: <Clock size={16} className="text-[var(--outline)]" /> },
        ].map(stat => (
          <Card key={stat.label} className="flex-1 min-w-[130px]">
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center ${getToneBackgroundClass(stat.color)}`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-foreground text-[20px] font-bold">{stat.value}</div>
                <div className="text-muted-foreground text-[11px]">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters bar */}
      <Card className="sa-users-filter-bar mb-[14px]">
        <CardContent className="px-4 py-[14px] flex items-center gap-[10px] flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-[11px] top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('superadmin.users.searchPlaceholder')}
            className="pl-8 h-9 text-[13px]"
          />
        </div>

        <Filter size={14} className="text-[var(--outline-variant)]" />

        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          title={t('superadmin.users.role')}
          className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs outline-none bg-white cursor-pointer text-[#374151]"
        >
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          title={t('superadmin.users.status')}
          className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs outline-none bg-white cursor-pointer text-[#374151]"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s === 'All Status' ? 'All Status' : STATUS_CONFIG[s as SupportedUiStatus].label}</option>)}
        </select>

        <select
          value={barangayFilter}
          onChange={e => { setBarangayFilter(e.target.value); setPage(1); }}
          title={t('superadmin.users.barangay')}
          className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs outline-none bg-white cursor-pointer text-[#374151]"
        >
          {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <span className="text-muted-foreground text-xs ml-auto">
          {filtered.length !== 1 ? t('superadmin.users.userCountPlural', { count: filtered.length }) : t('superadmin.users.userCount', { count: filtered.length })}
        </span>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="bg-[#0F172A] rounded-[10px] px-4 py-[10px] mb-3 flex items-center gap-3 flex-wrap">
          <span className="text-[#E2E8F0] text-[13px] font-semibold">{t('superadmin.users.selectedCount', { count: selectedIds.size })}</span>
          <button
            onClick={() => { void handleBulkStatusUpdate('active'); }}
            className="px-3 py-[5px] bg-[#0F766E] border-0 rounded-[6px] text-white text-xs font-semibold cursor-pointer flex items-center gap-[5px]"
          >
            <UserCheck size={12} /> {t('superadmin.users.activate')}
          </button>
          <button
            onClick={() => { void handleBulkStatusUpdate('inactive'); }}
            className="px-3 py-[5px] bg-severity-medium border-0 rounded-[6px] text-white text-xs font-semibold cursor-pointer flex items-center gap-[5px]"
          >
            <UserX size={12} /> {t('superadmin.users.deactivate')}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            title={t('common.close')}
            aria-label={t('common.close')}
            className="ml-auto max-sm:ml-0 bg-transparent border-0 cursor-pointer"
          >
            <X size={16} className="text-[var(--outline)]" />
          </button>
        </div>
      )}

      {/* Table */}
      <Card className="mb-[14px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  title="Select all users"
                  aria-label="Select all users"
                  className="cursor-pointer accent-[var(--primary)]"
                />
              </TableHead>
              {[t('superadmin.users.tableUser'), t('superadmin.users.role'), t('superadmin.users.barangay'), t('superadmin.users.status'), t('superadmin.users.lastActiveLabel'), t('superadmin.users.actions')].map(h => (
                <TableHead key={h} className="text-[11px] font-bold tracking-[0.03em] uppercase">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-[40px] text-center">
                    <div className="text-muted-foreground text-[13px]">{t('superadmin.users.noUsersFound')}</div>
                  </TableCell>
                </TableRow>
              ) : paginated.map((user) => {
                const rc = ROLE_CONFIG[user.role];
                const sc = STATUS_CONFIG[user.status];
                const isSelected = selectedIds.has(user.id);
                return (
                  <TableRow
                    key={user.id}
                    data-state={isSelected ? 'selected' : undefined}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(user.id)}
                        title={`Select ${user.name}`}
                        aria-label={`Select ${user.name}`}
                        className="cursor-pointer accent-[var(--primary)]"
                      />
                    </TableCell>

                    {/* User */}
                    <TableCell>
                      <div className="flex items-center gap-[10px]">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 ${getAvatarBackgroundClass(user.avatarColor)}`}
                        >{user.initials}</div>
                        <div>
                          <div className="text-foreground font-semibold text-[13px]">{user.name}</div>
                          <div className="text-muted-foreground text-[11px]">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <Badge variant="secondary" className={`gap-[5px] text-[11px] font-semibold ${getRoleBadgeClass(user.role)}`}>
                        {rc.icon} {user.role}
                      </Badge>
                    </TableCell>

                    {/* Barangay */}
                    <TableCell className="text-foreground text-xs font-medium">{user.barangay}</TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant="outline" className={`gap-[5px] text-[11px] font-semibold rounded-full ${getStatusBadgeClass(user.status)}`}>
                        {sc.icon} {sc.label}
                      </Badge>
                    </TableCell>

                    {/* Last active */}
                    <TableCell className="text-muted-foreground text-xs">
                      <div className="flex items-center gap-[5px]">
                        <Clock size={11} className="text-muted-foreground" />
                        {formatLastActive(user.lastActive)}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-[6px]">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setModalError(null);
                            setModalSaving(false);
                            setModal({ user, mode: 'view' });
                          }}
                          title="View"
                          className="size-7"
                        >
                          <Eye size={13} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setModalError(null);
                            setModalSaving(false);
                            setModal({ user, mode: 'edit' });
                          }}
                          title="Edit"
                          className="size-7"
                        >
                          <Edit2 size={13} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex flex-col gap-2 px-4 py-3 border-t border-border bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground text-xs">
            {t('superadmin.users.showingRange', { from: Math.min((page - 1) * PAGE_SIZE + 1, filtered.length), to: Math.min(page * PAGE_SIZE, filtered.length), total: filtered.length })}
          </div>
          <div className="flex items-center gap-[6px] self-end sm:self-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              title="Previous page"
              aria-label="Previous page"
              className="size-[30px]"
            >
              <ChevronLeft size={14} />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <Button
                key={p}
                variant={page === p ? 'default' : 'outline'}
                size="icon"
                onClick={() => setPage(p)}
                className="size-[30px] text-xs"
              >{p}</Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              title="Next page"
              aria-label="Next page"
              className="size-[30px]"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>

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
