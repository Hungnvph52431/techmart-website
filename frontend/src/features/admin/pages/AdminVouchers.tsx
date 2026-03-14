import { useEffect, useState } from 'react';
import { voucherService, Voucher, CreateVoucherPayload } from '@/services/voucher.service';
import { Ticket, Plus, X, Save, Loader2, AlertCircle, Trash2 } from 'lucide-react';

export const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. State form chuẩn cấu trúc TechMart
  const [formData, setFormData] = useState<CreateVoucherPayload>({
    code: '',
    description: '',
    discount_type: 'fixed_amount',
    discount_value: 0,
    min_order_value: 0,
    max_discount_amount: 0,
    usage_limit: 100,
    per_user_limit: 1,
    valid_from: '',
    valid_to: '',
    is_active: 1
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await voucherService.getAll();
      setVouchers(data);
    } catch (err) { 
      console.error("Lỗi lấy danh sách Voucher:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, []);

  // 2. Validation: Chặn dữ liệu sai trước khi gửi lên Server
  const validateForm = () => {
    if (!formData.code.trim()) return "Mã Code không được bỏ trống!";
    if (!formData.description.trim()) return "Mô tả không được bỏ trống!";
    if (formData.discount_value <= 0) return "Giá trị giảm phải lớn hơn 0!";
    if (formData.min_order_value < 0) return "Đơn tối thiểu không được là số âm!";
    
    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      return "Giảm theo phần trăm không được vượt quá 100%!";
    }

    if (!formData.valid_from || !formData.valid_to) return "Vui lòng chọn thời gian hiệu lực!";
    if (new Date(formData.valid_from) >= new Date(formData.valid_to)) {
      return "Thời gian kết thúc phải sau thời gian bắt đầu!";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      const payloadToSubmit = {
        ...formData,
        // Ép về 0 nếu là tiền mặt để MySQL ENUM không báo lỗi
        max_discount_amount: formData.discount_type === 'percentage' ? formData.max_discount_amount : 0
      };

      await voucherService.create(payloadToSubmit);
      setIsModalOpen(false);
      loadData();
      alert("Tạo mã Voucher thành công!");
      
      setFormData({
        code: '', description: '', discount_type: 'fixed_amount', discount_value: 0,
        min_order_value: 0, max_discount_amount: 0, usage_limit: 100,
        per_user_limit: 1, valid_from: '', valid_to: '', is_active: 1
      });
    } catch (error) {
      setErrorMsg("Lỗi từ Server. Vui lòng kiểm tra lại kết nối hoặc cấu trúc Database!");
    }
  };

  const handleDelete = async (id: number, code: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn mã voucher ${code} này không?`)) {
      try {
        await voucherService.delete(id);
        alert("Đã xóa thành công!");
        loadData();
      } catch (error) {
        alert("Có lỗi xảy ra khi xóa Voucher!");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner tiêu đề thiết kế mới */}
      <div className="bg-blue-600 p-8 rounded-3xl shadow-xl text-white flex justify-between items-center border-b-4 border-blue-700">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 italic">
            <Ticket size={36} /> QUẢN LÝ VOUCHER
          </h1>
          <p className="text-blue-100 font-medium mt-1">Hệ thống mã khuyến mãi TechMart 2026</p>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setErrorMsg(''); }} 
          className="bg-white text-blue-600 px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-gray-100 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={24} strokeWidth={3} /> THÊM MỚI
        </button>
      </div>

      {/* Bảng danh sách mã đã được tối ưu hiển thị */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center text-blue-600 font-bold italic">
            <Loader2 className="animate-spin mr-2" /> Đang lấy dữ liệu từ hệ thống...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b">
                <tr>
                  <th className="p-5 text-gray-500 font-bold uppercase text-[11px] tracking-widest">Mã / Mô tả</th>
                  <th className="p-5 text-gray-500 font-bold uppercase text-[11px] tracking-widest">Giảm giá</th>
                  <th className="p-5 text-gray-500 font-bold uppercase text-[11px] tracking-widest">Điều kiện</th>
                  <th className="p-5 text-gray-500 font-bold uppercase text-[11px] tracking-widest">Hiệu lực</th>
                  <th className="p-5 text-gray-500 font-bold uppercase text-[11px] tracking-widest text-center">Trạng thái</th>
                  <th className="p-5 text-gray-500 font-bold uppercase text-[11px] tracking-widest text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vouchers.map((v) => (
                  <tr key={v.coupon_id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-5">
                      <div className="font-mono font-black text-blue-600 text-lg uppercase">{v.code}</div>
                      <div className="text-xs text-gray-400 mt-1 max-w-[200px] truncate">{v.description}</div>
                    </td>
                    <td className="p-5 font-bold text-gray-800">
                      {v.discount_type === 'percentage' ? `${v.discount_value}%` : `${Number(v.discount_value).toLocaleString()}đ`}
                      {v.discount_type === 'percentage' && v.max_discount_amount && (
                        <div className="text-[10px] text-gray-400 font-normal italic">Tối đa: {Number(v.max_discount_amount).toLocaleString()}đ</div>
                      )}
                    </td>
                    <td className="p-5">
                      <div className="text-sm font-semibold">Đơn từ: {Number(v.min_order_value).toLocaleString()}đ</div>
                      <div className="text-xs text-gray-400 italic">Dùng: {v.used_count}/{v.usage_limit}</div>
                    </td>
                    <td className="p-5 text-xs font-medium">
                      <div className="text-green-600">Từ: {v.valid_from ? new Date(v.valid_from).toLocaleDateString('vi-VN') : '---'}</div>
                      <div className="text-red-500">Đến: {v.valid_to ? new Date(v.valid_to).toLocaleDateString('vi-VN') : '---'}</div>
                    </td>
                    
                    {/* Cột Trạng thái: ĐÃ FIX LỖI TRÙNG NHÃN */}
                    <td className="p-5 text-center">
                      {v.valid_to && new Date(v.valid_to).getTime() < new Date().getTime() ? (
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-gray-200 text-gray-500 border border-gray-300 shadow-sm">
                          Đã hết hạn
                        </span>
                      ) : v.is_active ? (
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-green-100 text-green-700 border border-green-200 shadow-sm">
                          Đang chạy
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-red-100 text-red-600 border border-red-200 shadow-sm">
                          Đã dừng
                        </span>
                      )}
                    </td>

                    {/* Cột Thao tác: Nút xóa thiết kế đồng nhất */}
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => handleDelete(v.coupon_id, v.code)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                        title="Xóa vĩnh viễn"
                      >
                        <Trash2 size={20} strokeWidth={2.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cấu hình Voucher mới */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl my-8 animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50 rounded-t-[32px]">
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Thiết lập mã giảm giá</h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-200 p-2 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} /> {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Mã Code *</label>
                  <input className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="VD: SALES_TET" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Trạng thái</label>
                  <select className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 focus:bg-white outline-none" value={formData.is_active} onChange={e => setFormData({...formData, is_active: Number(e.target.value)})}>
                    <option value={1}>Kích hoạt ngay</option>
                    <option value={0}>Tạm khóa mã</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Mô tả ngắn *</label>
                <input className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-medium focus:border-blue-500 focus:bg-white outline-none transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Giảm giá cực sốc dịp Tết 2026..." />
              </div>

              <div className="grid grid-cols-2 gap-6 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 shadow-inner">
                <div>
                  <label className="block text-xs font-black text-blue-800 uppercase mb-2 ml-1">Loại Giảm</label>
                  <select className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value as any})}>
                    <option value="fixed_amount">Tiền mặt (VNĐ)</option>
                    <option value="percentage">Phần trăm (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-blue-800 uppercase mb-2 ml-1">Giá trị giảm *</label>
                  <input type="number" className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={formData.discount_value || ''} onChange={e => setFormData({...formData, discount_value: Number(e.target.value)})} />
                </div>
                
                {formData.discount_type === 'percentage' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-blue-800 uppercase mb-2 ml-1">Giảm tối đa (VNĐ)</label>
                    <input type="number" className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={formData.max_discount_amount || ''} onChange={e => setFormData({...formData, max_discount_amount: Number(e.target.value)})} placeholder="Để 0 nếu không giới hạn" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Đơn tối thiểu *</label>
                  <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={formData.min_order_value || ''} onChange={e => setFormData({...formData, min_order_value: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Tổng lượt dùng *</label>
                  <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={formData.usage_limit || ''} onChange={e => setFormData({...formData, usage_limit: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Lượt/User *</label>
                  <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={formData.per_user_limit || ''} onChange={e => setFormData({...formData, per_user_limit: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Bắt đầu từ *</label>
                  <input type="datetime-local" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={formData.valid_from || ''} onChange={e => setFormData({...formData, valid_from: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Kết thúc vào *</label>
                  <input type="datetime-local" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={formData.valid_to || ''} onChange={e => setFormData({...formData, valid_to: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2 italic uppercase">
                <Save size={24} /> Lưu Voucher Hệ Thống
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};