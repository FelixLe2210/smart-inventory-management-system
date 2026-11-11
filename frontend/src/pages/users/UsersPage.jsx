import { useCallback, useEffect, useMemo, useState } from 'react';
import { userApi } from '../../api/userApi';
import { getCurrentUser } from '../../api/httpClient';
import ToastNotification from '../../components/common/ToastNotification';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  ROLE_OPTIONS,
  filterUsers,
  isSelf,
  primaryRole,
  roleLabel,
  summarizeUsers,
  userErrorMessage,
} from '../../utils/userAdmin';

/** Người dùng và vai trò: ADMIN xem danh sách tài khoản, đổi vai trò, khóa hoặc mở khóa. */
export default function UsersPage() {
  const currentUser = getCurrentUser();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState({ visible: false, text: '', icon: 'check_circle' });
  const [confirm, setConfirm] = useState({ open: false, user: null, active: true });

  const showToast = useCallback((text, icon = 'check_circle') => {
    setToast({ visible: true, text, icon });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3200);
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await userApi.getAll();
      if (!Array.isArray(data)) throw new Error('Máy chủ trả về danh sách tài khoản không hợp lệ.');
      setUsers(data);
    } catch (err) {
      setLoadError(userErrorMessage(err, 'Không tải được danh sách tài khoản.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const replaceUser = (updated) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

  const handleRoleChange = async (user, role) => {
    if (role === primaryRole(user) && user.roles.length === 1) return;
    setBusyId(user.id);
    try {
      const updated = await userApi.changeRole(user.id, role);
      replaceUser(updated);
      showToast(`Đã đổi ${user.username} thành ${roleLabel(role)}. Có hiệu lực ở lần đăng nhập sau của họ.`);
    } catch (err) {
      showToast(userErrorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const applyStatus = async () => {
    const { user, active } = confirm;
    setConfirm({ open: false, user: null, active: true });
    if (!user) return;
    setBusyId(user.id);
    try {
      const updated = await userApi.changeStatus(user.id, active);
      replaceUser(updated);
      showToast(active ? `Đã mở khóa ${user.username}` : `Đã khóa ${user.username}`, active ? 'lock_open' : 'lock');
    } catch (err) {
      showToast(userErrorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(
    () => filterUsers(users, { search, role: roleFilter, status: statusFilter }),
    [users, search, roleFilter, statusFilter],
  );
  const summary = useMemo(() => summarizeUsers(users), [users]);
  const hasFilter = search || roleFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="flex flex-col w-full">
      <div className="w-full px-margin py-space-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Người dùng và vai trò</h1>
          <p className="text-secondary font-body-sm text-body-sm">
            Người tự đăng ký mặc định chỉ được xem. Nâng vai trò ở đây để họ vận hành kho hoặc quản lý danh mục.
          </p>
        </div>
        <button
          id="btn-refresh-users"
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors self-start md:self-auto"
          onClick={async () => {
            await fetchUsers();
            showToast('Đã làm mới danh sách tài khoản', 'sync');
          }}
        >
          <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
          <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
        </button>
      </div>

      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-space-md">
          <SummaryCard label="Tổng tài khoản" value={summary.total} />
          {ROLE_OPTIONS.map((r) => (
            <SummaryCard key={r.value} label={r.label} value={summary.byRole[r.value]} hint={r.hint} />
          ))}
        </div>
        {summary.disabled > 0 && (
          <p className="text-secondary font-body-sm text-body-sm flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">lock</span>
            {summary.disabled} tài khoản đang bị khóa, không đăng nhập được.
          </p>
        )}

        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex items-center w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên đăng nhập, email, số điện thoại..."
              aria-label="Tìm tài khoản"
              className="w-full h-9 pl-9 pr-8 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm focus:bg-surface-container-lowest transition-colors border border-transparent focus:border-primary/30"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Lọc theo vai trò"
              className="h-9 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm text-on-surface cursor-pointer border border-transparent focus:border-primary/30"
            >
              <option value="all">Mọi vai trò</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái"
              className="h-9 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm text-on-surface cursor-pointer border border-transparent focus:border-primary/30"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="disabled">Đã khóa</option>
            </select>
            {hasFilter && (
              <button
                onClick={() => {
                  setSearch('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-body-sm transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {loadError && (
          <div role="alert" className="p-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button onClick={fetchUsers} className="underline font-body-sm-medium">Thử lại</button>
          </div>
        )}

        <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 text-secondary font-label-default text-label-default border-b border-outline-variant/40">
                  <th className="py-3 px-4 min-w-[180px]">Tài khoản</th>
                  <th className="py-3 px-4 min-w-[200px]">Email</th>
                  <th className="py-3 px-4 min-w-[140px]">Số điện thoại</th>
                  <th className="py-3 px-4 min-w-[170px]">Vai trò</th>
                  <th className="py-3 px-4 min-w-[130px]">Trạng thái</th>
                  <th className="py-3 px-4 min-w-[140px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filtered.map((u) => {
                  const self = isSelf(u, currentUser);
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id} className={u.active ? '' : 'bg-surface-container-low/40 text-secondary'}>
                      <td className="py-3 px-4 font-body-sm-medium text-body-sm-medium">
                        {u.username}
                        {self && <span className="ml-2 px-1.5 py-0.5 rounded bg-surface-container text-secondary text-label-sm">Bạn</span>}
                      </td>
                      <td className="py-3 px-4 font-body-sm text-body-sm">{u.email}</td>
                      <td className="py-3 px-4 font-body-sm text-body-sm">{u.phone || '—'}</td>
                      <td className="py-3 px-4">
                        <select
                          value={primaryRole(u)}
                          disabled={self || busy}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          aria-label={`Vai trò của ${u.username}`}
                          title={self ? 'Bạn không thể tự đổi vai trò của mình' : undefined}
                          className="h-9 px-2 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm text-on-surface border border-transparent focus:border-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {!ROLE_OPTIONS.some((r) => r.value === primaryRole(u)) && (
                            <option value={primaryRole(u)}>{roleLabel(primaryRole(u))}</option>
                          )}
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-label-sm ${
                            u.active ? 'bg-tertiary-container/40 text-tertiary' : 'bg-error-container/60 text-error'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{u.active ? 'check_circle' : 'lock'}</span>
                          {u.active ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          disabled={self || busy}
                          onClick={() => setConfirm({ open: true, user: u, active: !u.active })}
                          title={self ? 'Bạn không thể tự khóa tài khoản của mình' : undefined}
                          className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm-medium text-body-sm-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {u.active ? 'Khóa' : 'Mở khóa'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center text-secondary font-body-sm text-body-sm">
                      {users.length === 0
                        ? 'Chưa có tài khoản nào.'
                        : 'Không có tài khoản nào khớp bộ lọc. Bấm Đặt lại để xem tất cả.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-secondary font-body-sm text-body-sm border-t border-outline-variant/30">
            Hiển thị {filtered.length} trên {users.length} tài khoản. Vai trò mới có hiệu lực khi người đó đăng nhập lại.
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirm.open}
        icon={confirm.active ? 'lock_open' : 'lock'}
        title={confirm.active ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?'}
        message={
          confirm.active
            ? `${confirm.user?.username} sẽ đăng nhập và dùng hệ thống trở lại.`
            : `${confirm.user?.username} sẽ không đăng nhập được nữa. Bạn có thể mở khóa lại bất cứ lúc nào.`
        }
        confirmLabel={confirm.active ? 'Mở khóa' : 'Khóa tài khoản'}
        confirmVariant={confirm.active ? 'primary' : 'error'}
        onConfirm={applyStatus}
        onCancel={() => setConfirm({ open: false, user: null, active: true })}
      />
      <ToastNotification visible={toast.visible} text={toast.text} icon={toast.icon} />
    </div>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-1" title={hint}>
      <span className="font-label-default text-label-default text-secondary">{label}</span>
      <span className="font-display text-display text-on-surface font-bold">{value}</span>
    </div>
  );
}
