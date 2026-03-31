// frontend/src/features/admin/pages/AdminBanners.tsx

import { useState, useEffect, useRef } from 'react';
import { bannerService } from '@/services/banner.service';
import { Banner, BannerPosition } from '@/types/banner.type';
import { 
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, 
  ImageIcon, X, Save, Loader2, GripVertical
} from 'lucide-react';

const POSITION_LABELS: Record<BannerPosition, string> = {
  home_slider: 'Slider trang chủ (to)',
  home_middle: 'Giữa trang chủ (nhỏ)',
  home_bottom: 'Cuối trang chủ',
  sidebar: 'Sidebar',
};

const POSITION_COLORS: Record<BannerPosition, string> = {
  home_slider: 'bg-blue-100 text-blue-700',
  home_middle: 'bg-orange-100 text-orange-700',
  home_bottom: 'bg-green-100 text-green-700',
  sidebar: 'bg-purple-100 text-purple-700',
};

// --- FORM MODAL ---
interface BannerFormProps {
  banner?: Banner | null;
  onClose: () => void;
  onSaved: () => void;
}

const BannerForm = ({ banner, onClose, onSaved }: BannerFormProps) => {
  const isEdit = !!banner;
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: banner?.title || '',
    linkUrl: banner?.linkUrl || '',
    position: banner?.position || 'home_slider' as BannerPosition,
    displayOrder: banner?.displayOrder ?? 0,
    isActive: banner?.isActive !== false,
    validFrom: banner?.validFrom ? banner.validFrom.slice(0, 10) : '',
    validTo: banner?.validTo ? banner.validTo.slice(0, 10) : '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(banner?.imageUrl ? 
    (banner.imageUrl.startsWith('/') ? `http://localhost:5001${banner.imageUrl}` : banner.imageUrl) 
    : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('Vui lòng nhập tiêu đề banner');
    if (!preview && !imageFile) return setError('Vui lòng chọn ảnh banner');

    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('linkUrl', form.linkUrl);
      fd.append('position', form.position);
      fd.append('displayOrder', String(form.displayOrder));
      fd.append('isActive', String(form.isActive));
      if (form.validFrom) fd.append('validFrom', form.validFrom);
      if (form.validTo) fd.append('validTo', form.validTo);
      if (imageFile) fd.append('image', imageFile);

      if (isEdit && banner) {
        await bannerService.update(banner.bannerId, fd);
      } else {
        await bannerService.create(fd);
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-800 uppercase italic tracking-tight">
            {isEdit ? 'Sửa Banner' : 'Thêm Banner Mới'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-bold">
              {error}
            </div>
          )}

          {/* Upload ảnh */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              Ảnh Banner *
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-blue-400 ${
                preview ? 'border-blue-300' : 'border-gray-200 hover:bg-blue-50'
              }`}
            >
              {preview ? (
                <div className="relative group">
                  <img src={preview} alt="preview" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-black text-sm uppercase tracking-widest">Đổi ảnh</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                  <span className="text-sm font-bold text-gray-400">Nhấn để chọn ảnh (JPG, PNG, WebP - tối đa 5MB)</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* Tiêu đề */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Tiêu đề *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="VD: iPhone 15 Pro Max - Giảm 2 triệu"
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              Đường dẫn khi click
            </label>
            <input
              type="text"
              value={form.linkUrl}
              onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="/products/iphone-15-pro-max"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Vị trí */}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Vị trí</label>
              <select
                value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value as BannerPosition }))}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(POSITION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Thứ tự */}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Thứ tự hiển thị</label>
              <input
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Hiển thị từ</label>
              <input
                type="date"
                value={form.validFrom}
                onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Hiển thị đến</label>
              <input
                type="date"
                value={form.validTo}
                onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div>
              <p className="text-sm font-black text-gray-700">Kích hoạt banner</p>
              <p className="text-xs text-gray-400">Banner sẽ hiển thị ngay trên trang chủ</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-6 py-3 rounded-2xl border border-gray-200 font-black text-sm text-gray-600 hover:bg-gray-50 transition-colors uppercase tracking-tight">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 transition-colors uppercase tracking-tight disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo banner'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export const AdminBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await bannerService.getAll();
      setBanners(data);
    } catch (err) {
      console.error('Lỗi tải banner:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleToggle = async (banner: Banner) => {
    try {
      const updated = await bannerService.toggle(banner.bannerId);
      setBanners(prev => prev.map(b => b.bannerId === updated.bannerId ? updated : b));
    } catch (err) {
      console.error('Lỗi toggle:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xác nhận xóa banner này?')) return;
    setDeletingId(id);
    try {
      await bannerService.delete(id);
      setBanners(prev => prev.filter(b => b.bannerId !== id));
    } catch (err) {
      console.error('Lỗi xóa:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingBanner(null);
    fetchBanners();
  };

  const getImageUrl = (url: string) =>
    url.startsWith('/') ? `http://localhost:5001${url}` : url;

  // Group by position
  const grouped = banners.reduce((acc, b) => {
    if (!acc[b.position]) acc[b.position] = [];
    acc[b.position].push(b);
    return acc;
  }, {} as Record<string, Banner[]>);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Quản lý Banner</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">{banners.length} banner · {banners.filter(b => b.isActive).length} đang hiển thị</p>
        </div>
        <button
          onClick={() => { setEditingBanner(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-tight hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
        >
          <Plus size={18} /> Thêm Banner
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-3xl h-32 border border-gray-100" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
          <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-bold text-lg">Chưa có banner nào</p>
          <p className="text-gray-300 text-sm mt-1">Nhấn "Thêm Banner" để tạo banner đầu tiên</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(Object.keys(POSITION_LABELS) as BannerPosition[]).map(pos => {
            const items = grouped[pos] || [];
            if (items.length === 0) return null;
            return (
              <div key={pos}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${POSITION_COLORS[pos]}`}>
                    {POSITION_LABELS[pos]}
                  </span>
                  <span className="text-xs text-gray-400 font-bold">{items.length} banner</span>
                </div>

                <div className="space-y-3">
                  {items.map((banner: Banner) => (
                    <div
                      key={banner.bannerId}
                      className={`bg-white rounded-3xl border p-4 flex items-center gap-5 transition-all hover:shadow-md ${
                        banner.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'
                      }`}
                    >
                      <GripVertical size={20} className="text-gray-200 flex-shrink-0" />

                      {/* Ảnh preview */}
                      <div className="w-28 h-16 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                        <img
                          src={getImageUrl(banner.imageUrl)}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/200x100/e5e7eb/9ca3af?text=No+Image';
                          }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-800 text-sm uppercase tracking-tight truncate">{banner.title}</p>
                        {banner.linkUrl && (
                          <p className="text-xs text-blue-500 font-bold mt-0.5 truncate">{banner.linkUrl}</p>
                        )}
                        <p className="text-xs text-gray-400 font-bold mt-1">Thứ tự: {banner.displayOrder}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(banner)}
                          title={banner.isActive ? 'Đang hiển thị - Click để ẩn' : 'Đang ẩn - Click để hiển thị'}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all ${
                            banner.isActive
                              ? 'bg-green-50 text-green-600 hover:bg-green-100'
                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {banner.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          {banner.isActive ? 'Hiện' : 'Ẩn'}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => { setEditingBanner(banner); setShowForm(true); }}
                          className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Sửa banner"
                        >
                          <Pencil size={16} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(banner.bannerId)}
                          disabled={deletingId === banner.bannerId}
                          className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                          title="Xóa banner"
                        >
                          {deletingId === banner.bannerId
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Trash2 size={16} />
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <BannerForm
          banner={editingBanner}
          onClose={() => { setShowForm(false); setEditingBanner(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
