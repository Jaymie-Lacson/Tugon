import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Filter, Users, Shield,
  Edit2, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, UserCheck, UserX, Eye, Download,
  X,
} from 'lucide-react';
import { SearchInput } from '../../components/ui/search-input';
import { useTranslation } from '../../i18n';
import CardSkeleton from '../../components/ui/CardSkeleton';
import TableSkeleton from '../../components/ui/TableSkeleton';
import TextSkeleton from '../../components/ui/TextSkeleton';
import { superAdminApi, type ApiAdminUser } from '../../services/superAdminApi';
import type { Role } from '../../services/authApi';

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

function getAvatarBackgroundClass(color: string) {
  switch (color) {
    case '#7C3AED':
      return 'bg-[#7C3AED]';
    case '#1D4ED8':
      return 'bg-[#1D4ED8]';
    case '#6B7280':
      return 'bg-[#6B7280]';
    default:
      return 'bg-[var(--surface-container-low)]0';
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

function getRoleTextClass(role: SupportedUiRole) {
  if (role === 'Super Admin') return 'text-primary';
  if (role === 'Barangay Admin') return 'text-[var(--primary-container)]';
  return 'text-[var(--on-surface-variant)]';
}

function getStatusTextClass(status: SupportedUiStatus) {
  return status === 'active' ? 'text-[var(--severity-low)]' : 'text-[var(--on-surface-variant)]';
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
        className="bg-card rounded-2xl w-full max-w-[500px] max-h-[calc(100vh-2.5rem)] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[modal-in_0.2s_ease] flex flex-col"
      >
        {/* Modal header */}
        <div className="px-5 py-[18px] border-b border-[var(--outline-variant)] flex items-center justify-between bg-primary rounded-t-2xl">
          <div className="flex items-center gap-[10px]">
            <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.15)] flex items-center justify-center">
              <Users size={16} className="text-[var(--primary-fixed-dim)]" />
            </div>
            <div>
              <div className="text-[var(--on-primary)] text-[15px] font-bold">{title}</div>
              {user && (
                <div className="text-[var(--on-primary-container)] text-[11px]">ID: USR-{String(user.id).padStart(4, '0')}</div>
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

        <div className="p-5 overflow-y-auto">
          {/* Avatar */}
          {user && (
            <div className="flex items-center gap-[14px] mb-5 px-[14px] py-3 bg-[var(--surface-container-low)] rounded-[10px]">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shrink-0 ${getAvatarBackgroundClass(user.avatarColor)}`}
              >{user.initials}</div>
              <div>
                <div className="text-[var(--on-surface)] text-base font-bold">{user.name}</div>
                <div className="text-[var(--on-surface-variant)] text-xs">{user.email}</div>
                <div className="text-[var(--on-surface-variant)] text-[11px] mt-[2px]">{t('superadmin.users.lastActive', { time: formatLastActive(user.lastActive) })}</div>
              </div>
            </div>
          )}

          {error ? (
            <div role="alert" className="mb-3 border-l-4 border-[var(--error)] bg-card px-[10px] py-2 text-severity-critical text-xs font-semibold">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-[14px]">
            {!isReadOnlyMode ? (
              <>
                <div>
                  <label className="text-[var(--on-surface)] text-xs font-semibold block mb-[6px]">{t('superadmin.users.fullName')}</label>
                  <input
                    value={formData.fullName}
                    onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))}
                    disabled={mode === 'edit'}
                    className={`w-full px-3 py-[9px] border border-[var(--outline-variant)] rounded-lg text-[13px] outline-none box-border ${mode === 'edit' ? 'bg-[var(--surface-container-low)]' : 'bg-card'}`}
                    placeholder={t('superadmin.users.fullNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="text-[var(--on-surface)] text-xs font-semibold block mb-[6px]">{t('superadmin.users.phoneNumber')}</label>
                  <input
                    value={formData.phoneNumber}
                    onChange={e => setFormData(f => ({ ...f, phoneNumber: e.target.value }))}
                    disabled={mode === 'edit'}
                    className={`w-full px-3 py-[9px] border border-[var(--outline-variant)] rounded-lg text-[13px] outline-none box-border ${mode === 'edit' ? 'bg-[var(--surface-container-low)]' : 'bg-card'}`}
                    placeholder="09xxxxxxxxx"
                  />
                </div>
                {isCreateMode ? (
                  <div>
                    <label className="text-[var(--on-surface)] text-xs font-semibold block mb-[6px]">{t('superadmin.users.initialPassword')}</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-3 py-[9px] border border-[var(--outline-variant)] rounded-lg text-[13px] outline-none box-border bg-card"
                      placeholder={t('superadmin.users.passwordPlaceholder')}
                    />
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[var(--on-surface)] text-xs font-semibold block mb-[6px]">{t('superadmin.users.roleLabel')}</label>
                    <select
                      value={formData.role}
                      onChange={e => setFormData(f => ({ ...f, role: e.target.value as SupportedUiRole }))}
                      title={t('superadmin.users.roleLabel')}
                      className="w-full px-3 py-[9px] border border-[var(--outline-variant)] rounded-lg text-[13px] outline-none bg-card cursor-pointer"
                    >
                      {(['Super Admin', 'Barangay Admin', 'Viewer'] as const).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[var(--on-surface)] text-xs font-semibold block mb-[6px]">{t('superadmin.users.barangay')}</label>
                    <select
                      value={formData.barangay}
                      onChange={e => setFormData(f => ({ ...f, barangay: e.target.value }))}
                      disabled={formData.role === 'Super Admin'}
                      title={t('superadmin.users.barangay')}
                      className="w-full px-3 py-[9px] border border-[var(--outline-variant)] rounded-lg text-[13px] outline-none bg-card cursor-pointer"
                    >
                      {['Brgy. 251', 'Brgy. 252', 'Brgy. 256'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[var(--on-surface)] text-xs font-semibold block mb-[6px]">{t('superadmin.users.status')}</label>
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
                              : 'border-[var(--outline-variant)] bg-transparent text-[var(--outline)]'
                          }`}
                        >
                          {sc.icon} {sc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {mode === 'edit' ? (
                  <div className="text-[var(--on-surface-variant)] text-[11px]">
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
                    <div key={f.label} className="bg-[var(--surface-container-low)] rounded-lg px-3 py-[10px]">
                      <div className="text-[var(--on-surface-variant)] text-[10px] mb-[3px]">{f.label}</div>
                      <div className="text-[var(--on-surface)] text-[13px] font-semibold capitalize">{f.value}</div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-[14px] border-t border-[var(--outline-variant)] flex justify-end gap-[10px]">
          <button
            onClick={onClose}
            className="px-[18px] py-[9px] border border-[var(--outline-variant)] rounded-lg bg-card cursor-pointer text-[13px] font-semibold text-[var(--on-surface)]"
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
  const [searchLoading, setSearchLoading] = useState(false);
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
      const matchRole = roleFilter === 'All Roles' || u.role === roleFilter;
      const matchStatus = statusFilter === 'All Status' || u.status === statusFilter;
      const matchBrgy = barangayFilter === 'All Barangays' || u.barangay === barangayFilter;
      return matchRole && matchStatus && matchBrgy;
    });
  }, [usersData, roleFilter, statusFilter, barangayFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedIds = paginated.map((user) => user.id);
  const selectedOnPageCount = paginatedIds.filter((id) => selectedIds.has(id)).length;
  const isAllOnPageSelected = paginatedIds.length > 0 && selectedOnPageCount === paginatedIds.length;
  const isPartiallySelected = selectedOnPageCount > 0 && selectedOnPageCount < paginatedIds.length;
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }
    selectAllRef.current.indeterminate = isPartiallySelected;
  }, [isPartiallySelected]);

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

  const searchRef = React.useRef(search);
  searchRef.current = search;

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const currentSearch = searchRef.current.trim();
      const payload = await superAdminApi.getUsers(
        currentSearch ? { search: currentSearch } : undefined,
      );
      setUsersData(payload.users.map((user, index) => mapApiUserToSaUser(user, index)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load users.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const didMountSearchRef = React.useRef(false);
  useEffect(() => {
    if (!didMountSearchRef.current) {
      didMountSearchRef.current = true;
      return;
    }
    setSearchLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        await loadUsers();
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(handle);
    };
  }, [search, loadUsers]);

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
    <div className="page-content p-5 bg-background min-h-full">
      {/* Header */}
      <div className="sa-users-header flex items-center justify-between border-b border-[var(--outline-variant)] pb-4 mb-4 gap-[10px]">
        <div>
          <h1 className="text-[var(--on-surface)] text-[22px] font-bold m-0">{t('superadmin.users.title')}</h1>
          <p className="text-[var(--on-surface-variant)] text-xs m-0 mt-[2px]">
            {t('superadmin.users.subtitle')}
          </p>
        </div>
        <div className="sa-users-header-actions flex gap-[10px]">
          <button
            onClick={() => { void loadUsers(); }}
            className="flex min-h-11 items-center gap-[6px] rounded-lg border border-[var(--outline-variant)] bg-card px-3 py-2 cursor-pointer text-xs font-semibold text-[var(--on-surface)] hover:bg-[var(--surface-container-low)]"
          >
            <Download size={13} /> {loading ? t('common.refreshing') : t('common.refresh')}
          </button>
          <button
            onClick={() => {
              setApiError(null);
              setModalError(null);
              setModalSaving(false);
              setModal({ user: null, mode: 'create' });
            }}
            className="flex min-h-11 items-center gap-[6px] rounded-lg bg-primary border-0 px-3 py-2 cursor-pointer text-xs font-semibold text-white hover:bg-primary/90"
          >
            <Plus size={14} /> {t('superadmin.users.addUser')}
          </button>
        </div>
      </div>

      {apiError ? (
        <div className="mb-3 border-l-4 border-[var(--error)] bg-card px-3 py-2.5 text-[var(--error)] text-xs font-semibold">
          {apiError}
        </div>
      ) : null}

      {/* Stats chips */}
      <div className="grid grid-cols-3 gap-0 border-l border-t border-[var(--outline-variant)] mb-4">
        {[
          { label: t('superadmin.users.totalUsers'), value: counts.total, accent: '#2563EB' },
          { label: t('superadmin.users.active'), value: counts.active, accent: '#16A34A' },
          { label: t('superadmin.users.inactive'), value: counts.inactive, accent: '#6B7280' },
        ].map(stat => (
          <div key={stat.label} className="bg-card px-4 py-3 border-r border-b border-[var(--outline-variant)]">
            <div className="text-[var(--on-surface)] text-[20px] font-bold font-mono">{stat.value}</div>
            <div className="text-[var(--on-surface-variant)] text-xs">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="sa-users-filter-bar mb-[14px] border border-[var(--outline-variant)] bg-card px-3.5 py-3 flex items-center gap-[10px] flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={search}
            onValueChange={(next) => { setSearch(next); setPage(1); }}
            loading={searchLoading}
            shortcut="/"
            placeholder={t('superadmin.users.searchPlaceholder')}
            aria-label={t('superadmin.users.searchPlaceholder')}
          />
        </div>

        <Filter size={14} className="text-[var(--outline-variant)]" />

        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          title={t('superadmin.users.role')}
          className="px-3 py-2 border border-[var(--outline-variant)] rounded-lg text-xs outline-none bg-card cursor-pointer text-[var(--on-surface)]"
        >
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          title={t('superadmin.users.status')}
          className="px-3 py-2 border border-[var(--outline-variant)] rounded-lg text-xs outline-none bg-card cursor-pointer text-[var(--on-surface)]"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s === 'All Status' ? 'All Status' : STATUS_CONFIG[s as SupportedUiStatus].label}</option>)}
        </select>

        <select
          value={barangayFilter}
          onChange={e => { setBarangayFilter(e.target.value); setPage(1); }}
          title={t('superadmin.users.barangay')}
          className="px-3 py-2 border border-[var(--outline-variant)] rounded-lg text-xs outline-none bg-card cursor-pointer text-[var(--on-surface)]"
        >
          {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <span className="text-muted-foreground text-xs ml-auto">
          {filtered.length !== 1 ? t('superadmin.users.userCountPlural', { count: filtered.length }) : t('superadmin.users.userCount', { count: filtered.length })}
        </span>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="bg-[var(--inverse-surface)] rounded-[10px] px-4 py-[10px] mb-3 flex items-center gap-3 flex-wrap">
          <span className="text-[var(--inverse-on-surface)] text-[13px] font-semibold">{t('superadmin.users.selectedCount', { count: selectedIds.size })}</span>
          <button
            onClick={() => { void handleBulkStatusUpdate('active'); }}
            className="px-3 py-[5px] bg-[var(--severity-low)] border-0 rounded-[6px] text-white text-xs font-semibold cursor-pointer flex items-center gap-[5px]"
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
      <div className="mb-[14px] overflow-hidden border border-[var(--outline-variant)] bg-card">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--outline-variant)]">
              <th className="px-3 py-2.5 text-left w-8">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={isAllOnPageSelected}
                  onChange={(event) => {
                    const nextChecked = event.target.checked;
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      paginatedIds.forEach((id) => {
                        if (nextChecked) next.add(id);
                        else next.delete(id);
                      });
                      return next;
                    });
                  }}
                  title="Select all users"
                  aria-label="Select all users"
                  className="cursor-pointer accent-primary"
                />
              </th>
              {[t('superadmin.users.tableUser'), t('superadmin.users.role'), t('superadmin.users.barangay'), t('superadmin.users.status'), t('superadmin.users.lastActiveLabel'), t('superadmin.users.actions')].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-[var(--on-surface-variant)] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-[40px] text-center text-[var(--on-surface-variant)] text-[13px]">
                    {t('superadmin.users.noUsersFound')}
                  </td>
                </tr>
              ) : paginated.map((user) => {
                const rc = ROLE_CONFIG[user.role];
                const sc = STATUS_CONFIG[user.status];
                const isSelected = selectedIds.has(user.id);
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-[var(--outline-variant)] last:border-b-0 ${isSelected ? 'bg-[var(--surface-container-low)]' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(user.id)}
                        title={`Select ${user.name}`}
                        aria-label={`Select ${user.name}`}
                        className="cursor-pointer accent-primary"
                      />
                    </td>

                    {/* User */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-[10px]">
                        <div
                          className={`w-9 h-9 flex items-center justify-center font-bold text-white text-xs shrink-0 ${getAvatarBackgroundClass(user.avatarColor)}`}
                        >{user.initials}</div>
                        <div>
                          <div className="text-[var(--on-surface)] font-semibold text-[13px]">{user.name}</div>
                          <div className="text-[var(--on-surface-variant)] text-[11px]">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-3 py-2.5">
                      <span className={`font-mono text-[10px] font-bold uppercase ${getRoleTextClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Barangay */}
                    <td className="px-3 py-2.5 text-[var(--on-surface)] text-xs font-medium">{user.barangay}</td>

                    {/* Status */}
                    <td className="px-3 py-2.5">
                      <span className={`font-mono text-[10px] font-bold uppercase ${getStatusTextClass(user.status)}`}>
                        {sc.label}
                      </span>
                    </td>

                    {/* Last active */}
                    <td className="px-3 py-2.5 text-[var(--on-surface-variant)] text-xs">
                      <div className="flex items-center gap-[5px]">
                        <Clock size={11} className="text-[var(--on-surface-variant)]" />
                        {formatLastActive(user.lastActive)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-[6px]">
                        <button
                          onClick={() => {
                            setModalError(null);
                            setModalSaving(false);
                            setModal({ user, mode: 'view' });
                          }}
                          title="View"
                          className="size-7 border border-[var(--outline-variant)] bg-card cursor-pointer flex items-center justify-center text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)]"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setModalError(null);
                            setModalSaving(false);
                            setModal({ user, mode: 'edit' });
                          }}
                          title="Edit"
                          className="size-7 border border-[var(--outline-variant)] bg-card cursor-pointer flex items-center justify-center text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)]"
                        >
                          <Edit2 size={13} />
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
        <div className="flex flex-col gap-2 px-4 py-3 border-t border-[var(--outline-variant)] bg-card sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[var(--on-surface-variant)] text-xs">
            {t('superadmin.users.showingRange', { from: Math.min((page - 1) * PAGE_SIZE + 1, filtered.length), to: Math.min(page * PAGE_SIZE, filtered.length), total: filtered.length })}
          </div>
          <div className="flex items-center gap-[6px] self-end sm:self-auto">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              title="Previous page"
              aria-label="Previous page"
              className={`size-[30px] border border-[var(--outline-variant)] bg-card flex items-center justify-center text-[var(--on-surface-variant)] ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--surface-container-low)]'}`}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`size-[30px] border text-xs font-semibold flex items-center justify-center cursor-pointer ${page === p ? 'bg-primary text-white border-primary' : 'border-[var(--outline-variant)] bg-card text-[var(--on-surface)] hover:bg-[var(--surface-container-low)]'}`}
              >{p}</button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              title="Next page"
              aria-label="Next page"
              className={`size-[30px] border border-[var(--outline-variant)] bg-card flex items-center justify-center text-[var(--on-surface-variant)] ${page === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--surface-container-low)]'}`}
            >
              <ChevronRight size={14} />
            </button>
          </div>
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
