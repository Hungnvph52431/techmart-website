import { useEffect, useState, type FormEvent } from 'react'; // Dọn dẹp ChangeEvent và KeyboardEvent
import toast from 'react-hot-toast';
import { Users, UserPlus, Edit2, Trash2, Search, X } from 'lucide-react'; // Dọn dẹp Filter icon
import {
    userService,
    type User,
    type UserFilters,
    type UserRole,
    type UserStatus,
    type MembershipLevel,
} from '@/services/user.service';

const roleLabels: Record<UserRole, string> = {
    admin: 'Quản trị viên',
    customer: 'Khách hàng',
    staff: 'Nhân viên',
    warehouse: 'Kho',
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

export const AdminUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filters, setFilters] = useState<UserFilters>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

    useEffect(() => {
        void fetchUsers();
    }, [filters]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAllUsers(filters);
            setUsers(data);
        } catch (error) {
            toast.error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setFilters((prev) => ({
            ...prev,
            search: searchTerm.trim() || undefined,
        }));
    };

    // FIX LỖI 6133: Tận dụng hàm này để xóa bộ lọc nhanh
    const handleClearFilters = () => {
        setSearchTerm('');
        setFilters({});
    };

    const handleOpenModal = (user?: User) => {
        setEditingUser(user ?? null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUser(null);
    };

    const handleDelete = async (userId: number, name: string) => {
        if (!window.confirm(`Bạn có chắc muốn xóa người dùng ${name}?`)) return;
        try {
            setDeleteLoading(userId);
            await userService.deleteUser(userId);
            toast.success('Xóa người dùng thành command');
            fetchUsers();
        } catch (error) {
            toast.error('Lỗi khi xóa người dùng');
        } finally {
            setDeleteLoading(null);
        }
    };

    const handleStatusChange = async (userId: number, status: UserStatus) => {
        try {
            await userService.updateUser(userId, { status });
            toast.success('Cập nhật trạng thái thành công');
            fetchUsers();
        } catch (error) {
            toast.error('Không thể cập nhật trạng thái');
        }
    };

    if (loading && users.length === 0) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-xl text-blue-600 font-bold animate-pulse uppercase italic">Đang tải dữ liệu người dùng...</div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-600" />
                    <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Người dùng</h1>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                    <UserPlus size={20} /> Thêm mới
                </button>
            </div>

            {/* THANH CÔNG CỤ LỌC */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-2 flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Tìm tên, email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    </div>
                    {/* Nút xóa bộ lọc để dùng handleClearFilters */}
                    { (searchTerm || filters.role || filters.status) && (
                        <button onClick={handleClearFilters} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all">
                            <X size={20} />
                        </button>
                    )}
                    <button onClick={handleSearch} className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-bold text-sm hover:bg-gray-900 transition-all">Tìm</button>
                </div>

                <select
                    value={filters.role ?? ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: (e.target.value as UserRole) || undefined }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-600"
                >
                    <option value="">Tất cả vai trò</option>
                    <option value="customer">Khách hàng</option>
                    <option value="admin">Quản trị viên</option>
                    <option value="staff">Nhân viên</option>
                </select>

                <select
                    value={filters.status ?? ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: (e.target.value as UserStatus) || undefined }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-600"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                    <option value="banned">Bị cấm</option>
                </select>
            </div>

            {/* BẢNG DANH SÁCH */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-6 py-4 text-left">Người dùng</th>
                                <th className="px-6 py-4 text-left">Vai trò</th>
                                <th className="px-6 py-4 text-left">Trạng thái</th>
                                <th className="px-6 py-4 text-left">Hạng & Điểm</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map((user) => (
                                <tr key={user.userId} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">{user.name}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg uppercase">
                                            {roleLabels[user.role]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.status}
                                            onChange={(e) => void handleStatusChange(user.userId, e.target.value as UserStatus)}
                                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border-none focus:ring-2 focus:ring-blue-500 ${statusColors[user.status]}`}
                                        >
                                            <option value="active">Hoạt động</option>
                                            <option value="inactive">Tạm ngưng</option>
                                            <option value="banned">Bị cấm</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-gray-700">{membershipLabels[user.membershipLevel]}</div>
                                        <div className="text-[10px] text-orange-500 font-black italic">{user.points} points</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                            <button 
                                                onClick={() => void handleDelete(user.userId, user.name)} 
                                                disabled={deleteLoading === user.userId}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <UserModal
                    user={editingUser}
                    onClose={handleCloseModal}
                    onSuccess={() => {
                        handleCloseModal();
                        void fetchUsers();
                    }}
                />
            )}
        </div>
    );
};

// MODAL Component - Giữ nguyên logic UI Streetwear đã gộp
const UserModal = ({ user, onClose, onSuccess }: any) => {
    const [formData, setFormData] = useState({
        email: user?.email ?? '',
        password: '',
        name: user?.name ?? '',
        phone: user?.phone ?? '',
        role: user?.role ?? 'customer',
        status: user?.status ?? 'active',
        points: user?.points ?? 0,
        membershipLevel: user?.membershipLevel ?? 'bronze',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            setSaving(true);
            if (user) {
                await userService.updateUser(user.userId, formData);
                toast.success('Đã cập nhật');
            } else {
                await userService.createUser(formData as any);
                toast.success('Đã tạo mới');
            }
            onSuccess();
        } catch (error: any) {
            toast.error('Lỗi khi lưu dữ liệu');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-gray-800 uppercase italic tracking-tight">
                        {user ? 'Sửa thông tin' : 'Tạo tài khoản'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <input
                        type="email"
                        placeholder="Email tài khoản"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                    {!user && (
                        <input
                            type="password"
                            placeholder="Mật khẩu bí mật"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    )}
                    <input
                        type="text"
                        placeholder="Tên hiển thị"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold">Hủy</button>
                        <button type="submit" disabled={saving} className="flex-[2] px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg transition-all disabled:opacity-50">
                            {saving ? 'Đang lưu...' : 'Xác nhận'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};