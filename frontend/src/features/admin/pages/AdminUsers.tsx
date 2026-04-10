import { useEffect, useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Users, UserPlus, Edit2, Trash2, Search, X, ChevronLeft, ChevronRight, AlertTriangle, Eye, EyeOff, Check } from 'lucide-react';
import {
    userService,
    type User,
    type UserFilters,
    type UserRole,
    type UserStatus,
    type MembershipLevel,
} from '@/services/user.service';
import { useAuthStore } from '@/store/authStore';

const PAGE_SIZE = 15;

const roleLabels: Record<UserRole, string> = {
    admin: 'Quản trị viên',
    customer: 'Khách hàng',
    staff: 'Nhân viên',
    warehouse: 'Kho (cũ)',
    shipper: 'Shipper',
};

const membershipLabels: Record<MembershipLevel, string> = {
    bronze: 'Đồng',
    silver: 'Bạc',
    gold: 'Vàng',
    platinum: 'Bạch kim',
};

const statusColors: Record<UserStatus, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    banned: 'bg-red-100 text-red-800',
};

// ── Confirm Delete Modal ──────────────────────────────────────────────────────
const ConfirmDeleteModal = ({
    user,
    onConfirm,
    onCancel,
    loading,
}: {
    user: User;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} className="text-red-600" />
                </div>
                <h3 className="font-bold text-slate-800">Xóa người dùng</h3>
            </div>
            <p className="text-sm text-slate-600 mb-1">
                Bạn có chắc muốn xóa <strong>"{user.name}"</strong>?
            </p>
            <p className="text-xs text-slate-400 mb-5">
                Nếu người dùng có đơn hàng, tài khoản sẽ bị tạm ngưng thay vì xóa.
            </p>
            <div className="flex gap-2 justify-end">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                    Hủy
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
                >
                    {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
            </div>
        </div>
    </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
export const AdminUsers = () => {
    const currentUser = useAuthStore((s) => s.user);
    const isAdmin = currentUser?.role === 'admin';

    const [users, setUsers] = useState<User[]>([]);
    const [filters, setFilters] = useState<UserFilters>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
    const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);
    const [page, setPage] = useState(1);

    // ── Debounce search 400ms ─────────────────────────────────────────────────
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            setFilters((prev) => ({ ...prev, search: value.trim() || undefined }));
        }, 400);
    };

    useEffect(() => { void fetchUsers(); }, [filters]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAllUsers(filters);
            setUsers(data);
        } catch {
            toast.error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilters({});
        setPage(1);
    };

    // ── Permission-checked actions ────────────────────────────────────────────
    const handleStatusChange = async (userId: number, status: UserStatus) => {
        if (!isAdmin) { toast.error('Chỉ Quản trị viên mới có quyền này'); return; }
        try {
            await userService.updateUser(userId, { status });
            toast.success('Cập nhật trạng thái thành công');
            setUsers((prev) => prev.map((u) => u.userId === userId ? { ...u, status } : u));
        } catch {
            toast.error('Không thể cập nhật trạng thái');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDeleteUser) return;
        if (!isAdmin) { toast.error('Chỉ Quản trị viên mới có quyền này'); return; }
        const { userId, name } = confirmDeleteUser;
        setDeleteLoading(userId);
        try {
            const result = await userService.deleteUser(userId);
            if (result.action === 'deactivated') {
                toast.success(`"${name}" có đơn hàng, đã chuyển sang Tạm ngưng`);
                setUsers((prev) => prev.map((u) => u.userId === userId ? { ...u, status: 'inactive' } : u));
            } else {
                toast.success(`Đã xóa "${name}"`);
                setUsers((prev) => prev.filter((u) => u.userId !== userId));
            }
        } catch {
            toast.error('Lỗi khi xóa người dùng');
        } finally {
            setDeleteLoading(null);
            setConfirmDeleteUser(null);
        }
    };

    // ── Pagination (client-side) ──────────────────────────────────────────────
    const totalPages = Math.ceil(users.length / PAGE_SIZE);
    const pagedUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    if (loading && users.length === 0) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-xl text-blue-600 font-bold animate-pulse uppercase italic">Đang tải dữ liệu người dùng...</div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Confirm delete modal */}
            {confirmDeleteUser && (
                <ConfirmDeleteModal
                    user={confirmDeleteUser}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setConfirmDeleteUser(null)}
                    loading={deleteLoading === confirmDeleteUser.userId}
                />
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Người dùng</h1>
                        <p className="text-xs text-gray-400 font-medium">{users.length} tài khoản</p>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { setEditingUser(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                    >
                        <UserPlus size={20} /> Thêm mới
                    </button>
                )}
            </div>

            {/* Bộ lọc */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-2 flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Tìm tên, email, SĐT..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    </div>
                    {(searchTerm || filters.role || filters.status) && (
                        <button onClick={handleClearFilters} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all" title="Xóa bộ lọc">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <select
                    value={filters.role ?? ''}
                    onChange={(e) => { setPage(1); setFilters((prev) => ({ ...prev, role: (e.target.value as UserRole) || undefined })); }}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-600"
                >
                    <option value="">Tất cả vai trò</option>
                    <option value="customer">Khách hàng</option>
                    <option value="staff">Nhân viên</option>
                    <option value="shipper">Shipper</option>
                    <option value="warehouse">Kho (cũ)</option>
                    <option value="admin">Quản trị viên</option>
                </select>

                <select
                    value={filters.status ?? ''}
                    onChange={(e) => { setPage(1); setFilters((prev) => ({ ...prev, status: (e.target.value as UserStatus) || undefined })); }}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-600"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                    <option value="banned">Bị cấm</option>
                </select>
            </div>

            {/* Bảng */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-6 py-4 text-left">Người dùng</th>
                                <th className="px-6 py-4 text-left">Vai trò</th>
                                <th className="px-6 py-4 text-left">Trạng thái</th>
                                <th className="px-6 py-4 text-left">Hạng & Điểm</th>
                                {isAdmin && <th className="px-6 py-4 text-right">Thao tác</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {pagedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm font-medium">
                                        Không tìm thấy người dùng nào
                                    </td>
                                </tr>
                            ) : pagedUsers.map((user) => (
                                <tr key={user.userId} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">{user.name}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">{user.email}</div>
                                        {user.phone && <div className="text-[10px] text-gray-400">{user.phone}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg uppercase">
                                            {roleLabels[user.role]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {isAdmin ? (
                                            <select
                                                value={user.status}
                                                onChange={(e) => void handleStatusChange(user.userId, e.target.value as UserStatus)}
                                                className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border-none focus:ring-2 focus:ring-blue-500 ${statusColors[user.status]}`}
                                            >
                                                <option value="active">Hoạt động</option>
                                                <option value="inactive">Tạm ngưng</option>
                                                <option value="banned">Bị cấm</option>
                                            </select>
                                        ) : (
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${statusColors[user.status]}`}>
                                                {user.status === 'active' ? 'Hoạt động' : user.status === 'inactive' ? 'Tạm ngưng' : 'Bị cấm'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-gray-700">{membershipLabels[user.membershipLevel]}</div>
                                        <div className="text-[10px] text-orange-500 font-black italic">{user.points} điểm</div>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => { setEditingUser(user); setShowModal(true); }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteUser(user)}
                                                    disabled={deleteLoading === user.userId}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                        <span className="text-xs text-gray-400 font-medium">
                            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, users.length)} / {users.length} người dùng
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, idx) =>
                                    p === '...' ? (
                                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">...</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p as number)}
                                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                                                page === p
                                                    ? 'bg-blue-600 text-white'
                                                    : 'hover:bg-gray-100 text-gray-600'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <UserModal
                    user={editingUser}
                    onClose={() => { setShowModal(false); setEditingUser(null); }}
                    onSuccess={() => { setShowModal(false); setEditingUser(null); void fetchUsers(); }}
                />
            )}
        </div>
    );
};

// ── Password rules (giống RegisterPage) ──────────────────────────────────────
const passwordRules = [
    { label: 'Từ 8 đến 20 ký tự', test: (p: string) => p.length >= 8 && p.length <= 20 },
    { label: 'Có số, chữ hoa, chữ thường', test: (p: string) => /[0-9]/.test(p) && /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { label: 'Có ký tự đặc biệt !@#$^*()_', test: (p: string) => /[!@#$^*()_]/.test(p) },
];

// ── UserModal ─────────────────────────────────────────────────────────────────
const UserModal = ({ user, onClose, onSuccess }: { user: User | null; onClose: () => void; onSuccess: () => void }) => {
    const [formData, setFormData] = useState({
        email:           user?.email           ?? '',
        password:        '',
        name:            user?.name            ?? '',
        phone:           user?.phone           ?? '',
        role:            (user?.role === 'admin' ? 'admin' : user?.role) ?? 'customer',
        status:          user?.status          ?? 'active',
        membershipLevel: user?.membershipLevel ?? 'bronze',
        points:          user?.points          ?? 0,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [saving, setSaving] = useState(false);

    const set = (field: string, value: any) => setFormData((prev) => ({ ...prev, [field]: value }));

    const allRulesPass = passwordRules.every((r) => r.test(formData.password));

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user && !allRulesPass) {
            setPasswordTouched(true);
            toast.error('Mật khẩu chưa đạt yêu cầu');
            return;
        }
        setSaving(true);
        try {
            if (user) {
                await userService.updateUser(user.userId, formData);
                toast.success('Đã cập nhật tài khoản');
            } else {
                await userService.createUser(formData as any);
                toast.success('Đã tạo tài khoản mới');
            }
            onSuccess();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Lỗi khi lưu dữ liệu');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none';
    const labelCls = 'text-xs font-bold text-gray-500 uppercase tracking-wide px-1';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-black text-gray-800 uppercase italic tracking-tight">
                        {user ? 'Sửa thông tin' : 'Tạo tài khoản'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-1">
                        <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                        <input type="email" value={formData.email} onChange={(e) => set('email', e.target.value)}
                            className={inputCls} required />
                    </div>

                    {/* Password — chỉ khi tạo mới, có rules giống RegisterPage */}
                    {!user && (
                        <div className="space-y-2">
                            <label className={labelCls}>Mật khẩu <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => { set('password', e.target.value); setPasswordTouched(true); }}
                                    className={`${inputCls} pr-12`}
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {/* Rules hiển thị khi đã bắt đầu gõ */}
                            {passwordTouched && (
                                <ul className="space-y-1 px-1">
                                    {passwordRules.map((rule) => {
                                        const passes = rule.test(formData.password);
                                        return (
                                            <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${passes ? 'text-emerald-600' : 'text-red-400'}`}>
                                                <Check size={11} className={passes ? 'opacity-100' : 'opacity-30'} />
                                                {rule.label}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Tên */}
                    <div className="space-y-1">
                        <label className={labelCls}>Tên hiển thị <span className="text-red-500">*</span></label>
                        <input type="text" value={formData.name} onChange={(e) => set('name', e.target.value)}
                            className={inputCls} required />
                    </div>

                    {/* SĐT */}
                    <div className="space-y-1">
                        <label className={labelCls}>Số điện thoại</label>
                        <input type="tel" value={formData.phone} onChange={(e) => set('phone', e.target.value)}
                            className={inputCls} />
                    </div>

                    {/* Role + Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className={labelCls}>Vai trò</label>
                            {/* Nếu đang sửa tài khoản admin thì lock, không cho đổi */}
                            {user?.role === 'admin' ? (
                                <div className={`${inputCls} text-gray-400 cursor-not-allowed`}>Quản trị viên</div>
                            ) : (
                                <select value={formData.role} onChange={(e) => set('role', e.target.value)} className={inputCls}>
                                    <option value="customer">Khách hàng</option>
                                    <option value="staff">Nhân viên</option>
                                    <option value="shipper">Shipper</option>
                                </select>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Trạng thái</label>
                            <select value={formData.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                                <option value="active">Hoạt động</option>
                                <option value="inactive">Tạm ngưng</option>
                                <option value="banned">Bị cấm</option>
                            </select>
                        </div>
                    </div>

                    {/* Membership + Points — chỉ khi sửa */}
                    {user && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className={labelCls}>Hạng thành viên</label>
                                <select value={formData.membershipLevel} onChange={(e) => set('membershipLevel', e.target.value)} className={inputCls}>
                                    <option value="bronze">Đồng</option>
                                    <option value="silver">Bạc</option>
                                    <option value="gold">Vàng</option>
                                    <option value="platinum">Bạch kim</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Điểm tích lũy</label>
                                <input type="number" min={0} value={formData.points}
                                    onChange={(e) => set('points', Number(e.target.value))}
                                    className={inputCls} />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors">
                            Hủy
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-[2] px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg transition-all disabled:opacity-50">
                            {saving ? 'Đang lưu...' : (user ? 'Lưu thay đổi' : 'Tạo tài khoản')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
