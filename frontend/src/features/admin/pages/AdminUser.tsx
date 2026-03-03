import { useEffect, useState } from "react";
import { useUserStore } from "@/store/userStore";
import { Shield, Lock, Unlock, Filter, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const roleLabels: Record<string, string> = {
  customer: "Khách hàng",
  admin: "Quản trị viên",
  staff: "Nhân viên",
  warehouse: "Kho",
};

const statusLabels: Record<string, string> = {
  active: "Hoạt động",
  inactive: "Không hoạt động",
  banned: "Bị khóa",
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-emerald-100", text: "text-emerald-800" },
  inactive: { bg: "bg-amber-100", text: "text-amber-800" },
  banned: { bg: "bg-rose-100", text: "text-rose-800" },
};

export default function AdminUser() {
  const { users, loading, fetchAllUsers, updateStatus } = useUserStore();
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const handleViewDetail = (userId: number) => {
    navigate(`/admin/users/${userId}`);
  };

  const filteredUsers = users.filter((user) => {
    const matchRole = filterRole === "all" || user.role === filterRole;
    const matchStatus = filterStatus === "all" || user.status === filterStatus;
    return matchRole && matchStatus;
  });

  const handleBan = async (userId: number) => {
    if (!confirm("Bạn chắc chắn muốn **khóa** tài khoản này?")) return;
    await updateStatus(userId, "banned");
  };

  const handleUnban = async (userId: number) => {
    if (!confirm("Bạn chắc chắn muốn **mở khóa** tài khoản này?")) return;
    await updateStatus(userId, "active");
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-8" />
        <div className="flex gap-4 mb-6">
          <div className="h-10 w-44 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-44 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl shadow border">
          <div className="h-12 bg-gray-50 border-b" />
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 border-b last:border-none px-6 flex items-center gap-4"
            >
              <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-56 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-800">
            Quản lý người dùng
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-white p-5 rounded-xl border shadow-sm">
        <div className="min-w-[180px]">
          <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Shield size={16} /> Vai trò
          </label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="customer">Khách hàng</option>
            <option value="admin">Quản trị viên</option>
            <option value="staff">Nhân viên</option>
            <option value="warehouse">Kho</option>
          </select>
        </div>

        <div className="min-w-[180px]">
          <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Filter size={16} /> Trạng thái
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
            <option value="banned">Bị khóa</option>
          </select>
        </div>

        <div className="flex-1 min-w-[240px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tìm kiếm
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tên, email, số điện thoại..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tên
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  SĐT
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Điểm
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-gray-500"
                  >
                    Không tìm thấy người dùng nào phù hợp bộ lọc
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.userId}
                    className="hover:bg-indigo-50/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900" onClick={() => handleViewDetail(user.userId)}>
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.phone || "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      {roleLabels[user.role]}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[user.status].bg} ${statusStyles[user.status].text}`}
                      >
                        {statusLabels[user.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      {user.points ?? 0}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium space-x-4">
                      {user.status === "banned" ? (
                        <button
                          onClick={() => handleUnban(user.userId)}
                          className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 transition"
                        >
                          <Unlock size={16} />
                          Mở khóa
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(user.userId)}
                          className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-800 transition"
                        >
                          <Lock size={16} />
                          Khóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
