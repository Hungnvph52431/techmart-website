import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useUserStore } from '@/store/userStore';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  LockOpenIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const roleConfig = {
  customer: { label: 'Khách hàng', color: 'bg-blue-100 text-blue-800', icon: UserIcon },
  admin: { label: 'Quản trị viên', color: 'bg-purple-100 text-purple-800', icon: ShieldCheckIcon },
  staff: { label: 'Nhân viên', color: 'bg-indigo-100 text-indigo-800', icon: UserGroupIcon },
  warehouse: { label: 'Kho', color: 'bg-teal-100 text-teal-800', icon: UserGroupIcon },
};

const statusConfig = {
  active: { label: 'Hoạt động', color: 'bg-green-100 text-green-800', icon: LockOpenIcon },
  inactive: { label: 'Không hoạt động', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  banned: { label: 'Bị khóa', color: 'bg-red-100 text-red-800', icon: LockClosedIcon },
};

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { selectedUser, fetchAllUsers, setSelectedUser } = useUserStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const numId = Number(userId);
    const found = useUserStore.getState().users.find((u) => u.userId === numId);
    if (found) {
      setSelectedUser(found);
      setLoading(false);
    } else {
      fetchAllUsers().then(() => {
        const updated = useUserStore.getState().users.find((u) => u.userId === numId);
        if (updated) setSelectedUser(updated);
        setLoading(false);
      });
    }
  }, [userId, fetchAllUsers, setSelectedUser]);

  const handleBack = () => navigate(-1);

  if (loading || !selectedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin người dùng...</p>
        </div>
      </div>
    );
  }

  const Role = roleConfig[selectedUser.role] || { label: 'Không xác định', color: 'bg-gray-100 text-gray-800', icon: UserIcon };
  const Status = statusConfig[selectedUser.status] || { label: 'Không xác định', color: 'bg-gray-100 text-gray-800', icon: ClockIcon };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-3 rounded-full bg-white shadow hover:bg-gray-100 transition"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Thông tin người dùng
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                ID: {selectedUser.userId} • {selectedUser.email}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold ${Status.color}`}
          >
            <Status.icon className="h-5 w-5 mr-2" />
            {Status.label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-7 border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-gray-800">
                <UserIcon className="h-6 w-6 text-indigo-600" />
                Thông tin cá nhân
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1 font-medium">Họ và tên</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 font-medium">Email</p>
                  <p className="text-lg font-medium flex items-center gap-2 text-gray-800">
                    <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                    {selectedUser.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 font-medium">Số điện thoại</p>
                  <p className="text-lg font-medium flex items-center gap-2 text-gray-800">
                    <PhoneIcon className="h-5 w-5 text-gray-500" />
                    {selectedUser.phone || 'Chưa cập nhật'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 font-medium">Vai trò</p>
                  <span
                    className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium ${Role.color}`}
                  >
                    <Role.icon className="h-4 w-4 mr-2" />
                    {Role.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Points & Membership */}
            <div className="bg-white rounded-2xl shadow-sm p-7 border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-gray-800">
                <StarIcon className="h-6 w-6 text-yellow-500" />
                Điểm thưởng & Cấp bậc thành viên
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1 font-medium">Điểm hiện tại</p>
                  <p className="text-3xl font-bold text-indigo-700">
                    {selectedUser.points.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 font-medium">Cấp bậc</p>
                  <span className="inline-flex px-5 py-2 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 font-semibold text-lg">
                    {selectedUser.membershipLevel.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-7 border border-gray-100 sticky top-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-gray-800">
                <ClockIcon className="h-6 w-6 text-indigo-600" />
                Hoạt động
              </h2>

              <div className="space-y-5 text-gray-700">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                    Ngày tạo
                  </span>
                  <span className="font-medium">
                    {format(new Date(selectedUser.createdAt), 'dd/MM/yyyy', { locale: vi })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                    Cập nhật cuối
                  </span>
                  <span className="font-medium">
                    {format(new Date(selectedUser.updatedAt), 'dd/MM/yyyy', { locale: vi })}
                  </span>
                </div>
                {selectedUser.lastLogin && (
                  <div className="flex justify-between items-center py-2">
                    <span className="flex items-center gap-2">
                      <ClockIcon className="h-5 w-5 text-gray-500" />
                      Đăng nhập cuối
                    </span>
                    <span className="font-medium">
                      {format(new Date(selectedUser.lastLogin), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-4">Thao tác nhanh</p>
                <div className="flex flex-col gap-3">
                  {selectedUser.status === 'banned' ? (
                    <button
                      onClick={() => {
                        if (confirm('Mở khóa tài khoản này?')) {
                          useUserStore.getState().updateStatus(selectedUser.userId, 'active');
                          toast.success('Đã mở khóa');
                        }
                      }}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
                    >
                      <LockOpenIcon className="h-5 w-5" />
                      Mở khóa tài khoản
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm('Bạn chắc chắn muốn khóa tài khoản này?')) {
                          useUserStore.getState().updateStatus(selectedUser.userId, 'banned');
                          toast.success('Đã khóa tài khoản');
                        }
                      }}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
                    >
                      <LockClosedIcon className="h-5 w-5" />
                      Khóa tài khoản
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}