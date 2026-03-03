import { create } from 'zustand';
import { User, UserStatus } from '@/types/user';
import { userService } from '@/services/userService';
import toast from 'react-hot-toast';

interface UserState {
  users: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;

  fetchAllUsers: () => Promise<void>;
  createUser: (data: any) => Promise<boolean>;
  updateUser: (data: any) => Promise<boolean>;
  updateStatus: (userId: number, status: UserStatus) => Promise<boolean>;
  deleteUser: (userId: number) => Promise<boolean>;
  setSelectedUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  selectedUser: null,
  loading: false,
  error: null,

  fetchAllUsers: async () => {
    set({ loading: true, error: null });
    try {
      const data = await userService.getAllUsers();
      set({ users: data, loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không tải được danh sách người dùng';
      set({ error: msg, loading: false });
      toast.error(msg);
    }
  },

  createUser: async (data) => {
    try {
      const newUser = await userService.createUser(data);
      set((state) => ({ users: [...state.users, newUser] }));
      toast.success('Tạo người dùng thành công');
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Tạo thất bại');
      return false;
    }
  },

  updateUser: async (data) => {
    try {
      const updated = await userService.updateUser(data);
      set((state) => ({
        users: state.users.map((u) => (u.userId === updated.userId ? updated : u)),
        selectedUser: updated,
      }));
      toast.success('Cập nhật thành công');
      return true;
    } catch (err: any) {
      toast.error('Cập nhật thất bại');
      return false;
    }
  },

  updateStatus: async (userId, status) => {
    try {
      await userService.updateStatus(userId, status);
      set((state) => ({
        users: state.users.map((u) =>
          u.userId === userId ? { ...u, status } : u
        ),
        selectedUser:
          state.selectedUser?.userId === userId
            ? { ...state.selectedUser, status }
            : state.selectedUser,
      }));
      toast.success(`Trạng thái: ${status}`);
      return true;
    } catch (err) {
      toast.error('Cập nhật trạng thái thất bại');
      return false;
    }
  },

  deleteUser: async (userId) => {
    try {
      await userService.deleteUser(userId);
      set((state) => ({
        users: state.users.filter((u) => u.userId !== userId),
        selectedUser: null,
      }));
      toast.success('Xóa người dùng thành công');
      return true;
    } catch (err) {
      toast.error('Xóa thất bại');
      return false;
    }
  },

  setSelectedUser: (user) => set({ selectedUser: user }),
}));