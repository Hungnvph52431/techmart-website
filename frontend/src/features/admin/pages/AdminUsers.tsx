import { useEffect, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import { Users, UserPlus, Edit2, Trash2, Search, Filter, X } from 'lucide-react';
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
    const response = await userService.getAllUsers(filters);

    setUsers(response); 
    
  } catch (error) {
    console.error('Failed to fetch users:', error);
    toast.error('Không thể tải danh sách người dùng');
  } finally {
    setLoading(false);
  }
};

    const handleSearch = () => {
        setFilters((previous) => ({
            ...previous,
            search: searchTerm.trim() || undefined,
        }));
    };

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
        if (!window.confirm(`Bạn có chắc muốn xóa người dùng ${name}?`)) {
            return;
        }

        try {
            setDeleteLoading(userId);
            const result = await userService.deleteUser(userId);

            if (result.action === 'deleted') {
                toast.success('Xóa người dùng thành công');
            } else {
                toast.success('Người dùng có đơn hàng liên quan, đã được chuyển sang trạng thái không hoạt động');
            }

            await fetchUsers();
        } catch (error: unknown) {
            console.error('Failed to delete user:', error);
            const errorMessage =
                typeof error === 'object' && error !== null && 'response' in error
                    ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message ??
                        'Không thể xóa người dùng')
                    : 'Không thể xóa người dùng';
            toast.error(errorMessage);
        } finally {
            setDeleteLoading(null);
        }
    };

    const handleStatusChange = async (userId: number, status: UserStatus) => {
        try {
            await userService.updateUser(userId, { status });
            toast.success('Cập nhật trạng thái thành công');
            await fetchUsers();
        } catch (error: unknown) {
            console.error('Failed to update user status:', error);
            toast.error('Không thể cập nhật trạng thái');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-xl text-gray-600">Đang tải...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-600" />
                    <h1 className="text-3xl font-bold text-gray-800">Quản lý người dùng</h1>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    <UserPlus className="w-5 h-5" />
                    Thêm người dùng
                </button>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Search className="w-4 h-4 inline mr-1" /> Tìm kiếm
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
                                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                                    if (event.key === 'Enter') {
                                        handleSearch();
                                    }
                                }}
                                placeholder="Tìm theo tên, email, số điện thoại..."
                                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleSearch}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                Tìm kiếm
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Filter className="w-4 h-4 inline mr-1" /> Vai trò
                        </label>
                        <select
                            value={filters.role ?? ''}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                const value = event.target.value as UserRole | '';
                                setFilters((previous) => ({
                                    ...previous,
                                    role: value || undefined,
                                }));
                            }}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tất cả</option>
                            <option value="customer">Khách hàng</option>
                            <option value="admin">Quản trị viên</option>
                            <option value="staff">Nhân viên</option>
                            <option value="warehouse">Kho</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Filter className="w-4 h-4 inline mr-1" /> Trạng thái
                        </label>
                        <select
                            value={filters.status ?? ''}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                const value = event.target.value as UserStatus | '';
                                setFilters((previous) => ({
                                    ...previous,
                                    status: value || undefined,
                                }));
                            }}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tất cả</option>
                            <option value="active">Hoạt động</option>
                            <option value="inactive">Không hoạt động</option>
                            <option value="banned">Bị cấm</option>
                        </select>
                    </div>
                </div>

                {(filters.search || filters.role || filters.status) && (
                    <div className="mt-4 flex items-center gap-2">
                        <button
                            onClick={handleClearFilters}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                        >
                            <X className="w-4 h-4" /> Xóa bộ lọc
                        </button>
                        <span className="text-sm text-gray-500">Tìm thấy {users.length} người dùng</span>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Người dùng
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Vai trò
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Trạng thái
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thành viên
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Điểm
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ngày tạo
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.userId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                        {user.phone && <div className="text-xs text-gray-400">{user.phone}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {roleLabels[user.role]}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={user.status}
                                            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                                void handleStatusChange(user.userId, event.target.value as UserStatus);
                                            }}
                                            className={`px-2 py-1 text-xs font-semibold rounded-full border-0 ${statusColors[user.status]}`}
                                        >
                                            <option value="active">Hoạt động</option>
                                            <option value="inactive">Không hoạt động</option>
                                            <option value="banned">Bị cấm</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {membershipLabels[user.membershipLevel]}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {user.points}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleOpenModal(user)}
                                            className="text-blue-600 hover:text-blue-900 mr-4 inline-flex items-center gap-1"
                                        >
                                            <Edit2 className="w-4 h-4" /> Sửa
                                        </button>
                                        <button
                                            onClick={() => {
                                                void handleDelete(user.userId, user.name);
                                            }}
                                            disabled={deleteLoading === user.userId}
                                            className="text-red-600 hover:text-red-900 disabled:opacity-50 inline-flex items-center gap-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            {deleteLoading === user.userId ? 'Đang xóa...' : 'Xóa'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {users.length === 0 && <div className="p-8 text-center text-gray-500">Chưa có người dùng nào.</div>}
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

interface UserModalProps {
    user: User | null;
    onClose: () => void;
    onSuccess: () => void;
}

interface UserFormData {
    email: string;
    password: string;
    name: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
    points: number;
    membershipLevel: MembershipLevel;
}

const UserModal = ({ user, onClose, onSuccess }: UserModalProps) => {
    const [formData, setFormData] = useState<UserFormData>({
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

        if (!formData.email || !formData.name || (!user && !formData.password)) {
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        try {
            setSaving(true);
            if (user) {
                await userService.updateUser(user.userId, {
                    email: formData.email.trim().toLowerCase(),
                    name: formData.name.trim(),
                    phone: formData.phone.trim() || undefined,
                    role: formData.role,
                    status: formData.status,
                    points: formData.points,
                    membershipLevel: formData.membershipLevel,
                });
                toast.success('Cập nhật người dùng thành công');
            } else {
                await userService.createUser({
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password.trim(),
                    name: formData.name.trim(),
                    phone: formData.phone.trim() || undefined,
                    role: formData.role,
                });
                toast.success('Tạo người dùng thành công');
            }
            onSuccess();
        } catch (error: unknown) {
            console.error('Failed to save user:', error);
            const errorMessage =
                typeof error === 'object' && error !== null && 'response' in error
                    ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message ??
                        'Không thể lưu thông tin người dùng')
                    : 'Không thể lưu thông tin người dùng';
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
                <div className="relative w-full max-w-2xl p-6 bg-white shadow-xl rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">
                            {user ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                        setFormData((previous) => ({ ...previous, email: event.target.value }));
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            {!user && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mật khẩu <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                            setFormData((previous) => ({ ...previous, password: event.target.value }));
                                        }}
                                        autoComplete="current-password"
                                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tên người dùng <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                        setFormData((previous) => ({ ...previous, name: event.target.value }));
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                        setFormData((previous) => ({ ...previous, phone: event.target.value }));
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                                <select
                                    value={formData.role}
                                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                        setFormData((previous) => ({
                                            ...previous,
                                            role: event.target.value as UserRole,
                                        }));
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="customer">Khách hàng</option>
                                    <option value="admin">Quản trị viên</option>
                                    <option value="staff">Nhân viên</option>
                                    <option value="warehouse">Kho</option>
                                </select>
                            </div>

                            {user && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                                        <select
                                            value={formData.status}
                                            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                                setFormData((previous) => ({
                                                    ...previous,
                                                    status: event.target.value as UserStatus,
                                                }));
                                            }}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="active">Hoạt động</option>
                                            <option value="inactive">Không hoạt động</option>
                                            <option value="banned">Bị cấm</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cấp độ thành viên</label>
                                        <select
                                            value={formData.membershipLevel}
                                            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                                setFormData((previous) => ({
                                                    ...previous,
                                                    membershipLevel: event.target.value as MembershipLevel,
                                                }));
                                            }}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="bronze">Đồng</option>
                                            <option value="silver">Bạc</option>
                                            <option value="gold">Vàng</option>
                                            <option value="platinum">Bạch kim</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Điểm tích lũy</label>
                                        <input
                                            type="number"
                                            value={formData.points}
                                            onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                                setFormData((previous) => ({
                                                    ...previous,
                                                    points: Number(event.target.value) || 0,
                                                }));
                                            }}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            min={0}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center justify-end mt-6 gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};