import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { userService, type UpdateUserPayload } from '@/services/user.service';
import { addressService, type Address } from '@/services/address.service';
import api from '@/services/api';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, MapPin, Shield, LogOut, Pencil, Check, X,
  Navigation, Star, Loader2, Crown, Award,
  Plus, Trash2, Home, CheckCircle2, Camera, ChevronRight, Search,
} from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────
const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

const MEMBERSHIP = {
  bronze:   { label: 'Bronze',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  icon: <Award size={13} /> },
  silver:   { label: 'Silver',   color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200',  icon: <Star size={13} /> },
  gold:     { label: 'Gold',     color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: <Star size={13} className="fill-current" /> },
  platinum: { label: 'Platinum', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', icon: <Crown size={13} /> },
};
const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên', staff: 'Nhân viên', warehouse: 'Kho hàng', customer: 'Khách hàng',
};

// ─── VN Admin API types ───────────────────────────────────────────────────────
interface VNUnit { code: string; name: string; }

// ─── Location Dropdown ────────────────────────────────────────────────────────
const LocationDropdown = ({
  provinces, districts, wards,
  selectedProvince, selectedDistrict, selectedWard,
  onSelectProvince, onSelectDistrict, onSelectWard,
  loading,
}: {
  provinces: VNUnit[]; districts: VNUnit[]; wards: VNUnit[];
  selectedProvince: VNUnit | null; selectedDistrict: VNUnit | null; selectedWard: VNUnit | null;
  onSelectProvince: (p: VNUnit) => void; onSelectDistrict: (d: VNUnit) => void; onSelectWard: (w: VNUnit) => void;
  loading: boolean;
}) => {
  type Tab = 'province' | 'district' | 'ward';
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('province');
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Display text
  const displayText = [selectedWard?.name, selectedDistrict?.name, selectedProvince?.name].filter(Boolean).join(', ') || '';

  const getList = (): VNUnit[] => {
    const q = search.toLowerCase();
    const src = tab === 'province' ? provinces : tab === 'district' ? districts : wards;
    return q ? src.filter(i => i.name.toLowerCase().includes(q)) : src;
  };

  const TAB_LABELS: Record<Tab, string> = { province: 'Tỉnh/Thành phố', district: 'Quận/Huyện', ward: 'Phường/Xã' };

  const handleSelect = (item: VNUnit) => {
    if (tab === 'province') { onSelectProvince(item); setTab('district'); setSearch(''); }
    else if (tab === 'district') { onSelectDistrict(item); setTab('ward'); setSearch(''); }
    else { onSelectWard(item); setOpen(false); setSearch(''); }
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button type="button" onClick={() => { setOpen(!open); setTab(!selectedProvince ? 'province' : !selectedDistrict ? 'district' : 'ward'); setSearch(''); }}
        className="w-full flex items-center justify-between border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-blue-400 focus:border-blue-400 focus:outline-none transition-colors bg-white text-left">
        <span className={displayText ? 'text-slate-800' : 'text-slate-400'}>
          {displayText || 'Tỉnh/Thành phố, Quận/Huyện, Phường/Xã'}
        </span>
        {loading ? <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" /> : <ChevronRight size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {(['province', 'district', 'ward'] as Tab[]).map((t) => {
              const isActive = tab === t;
              const isDisabled = (t === 'district' && !selectedProvince) || (t === 'ward' && !selectedDistrict);
              return (
                <button key={t} type="button" disabled={isDisabled}
                  onClick={() => { setTab(t); setSearch(''); }}
                  className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
                    isActive ? 'border-red-500 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600 disabled:opacity-30'
                  }`}>
                  {TAB_LABELS[t]}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`Tìm ${TAB_LABELS[tab].toLowerCase()}...`}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-blue-400 focus:outline-none" />
            </div>
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {getList().length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">Không tìm thấy kết quả</p>
            ) : getList().map((item) => {
              const isSelected = (tab === 'province' && selectedProvince?.code === item.code) ||
                (tab === 'district' && selectedDistrict?.code === item.code) ||
                (tab === 'ward' && selectedWard?.code === item.code);
              return (
                <button key={item.code} type="button" onClick={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 ${isSelected ? 'text-red-600 font-bold bg-red-50' : 'text-slate-700'}`}>
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Map Preview ──────────────────────────────────────────────────────────────
const MapPreview = ({ address }: { address: string }) => {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || address.length < 10) { setCoords(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=vi`);
        const data = await res.json();
        if (data[0]) setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
        else setCoords(null);
      } catch { setCoords(null); }
      finally { setLoading(false); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [address]);

  if (!address || address.length < 10) return null;

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-slate-200 mt-3">
      {loading ? (
        <div className="h-32 flex items-center justify-center bg-slate-50 gap-2">
          <Loader2 size={16} className="text-blue-400 animate-spin" />
          <span className="text-xs text-slate-400">Đang tìm trên bản đồ...</span>
        </div>
      ) : coords ? (
        <iframe
          title="map"
          width="100%" height="160"
          frameBorder="0" scrolling="no"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.003},${coords.lat - 0.003},${coords.lon + 0.003},${coords.lat + 0.003}&layer=mapnik&marker=${coords.lat},${coords.lon}`}
          className="w-full"
        />
      ) : null}
    </div>
  );
};

// ─── Address Form Data ────────────────────────────────────────────────────────
interface AddressFormData {
  fullName: string; phone: string;
  addressLine: string; ward: string; district: string; city: string;
  isDefault: boolean;
}
const EMPTY_FORM: AddressFormData = { fullName: '', phone: '', addressLine: '', ward: '', district: '', city: '', isDefault: false };

// ─── Address Modal ────────────────────────────────────────────────────────────
const AddressModal = ({ editing, onSave, onClose }: {
  editing?: Address; onSave: (data: AddressFormData) => Promise<void>; onClose: () => void;
}) => {
  type Mode = 'manual' | 'gps';
  const [mode, setMode] = useState<Mode>('manual');
  const [form, setForm] = useState<AddressFormData>({
    ...EMPTY_FORM,
    ...(editing ? { fullName: editing.fullName, phone: editing.phone, addressLine: editing.addressLine, ward: editing.ward, district: editing.district, city: editing.city, isDefault: editing.isDefault } : {}),
  });
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // VN admin units
  const [provinces, setProvinces] = useState<VNUnit[]>([]);
  const [districts, setDistricts] = useState<VNUnit[]>([]);
  const [wards, setWards] = useState<VNUnit[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<VNUnit | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<VNUnit | null>(null);
  const [selectedWard, setSelectedWard] = useState<VNUnit | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Load provinces on mount
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(r => r.json())
      .then((data: { code: string; name: string }[]) => setProvinces(data.map(p => ({ code: String(p.code), name: p.name }))))
      .catch(() => toast.error('Không thể tải danh sách tỉnh/thành'));
  }, []);

  // Load districts when province selected
  const handleSelectProvince = async (p: VNUnit) => {
    setSelectedProvince(p);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]); setWards([]);
    setForm(prev => ({ ...prev, city: p.name, district: '', ward: '' }));
    setLoadingUnits(true);
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${p.code}?depth=2`);
      const data = await res.json();
      setDistricts((data.districts || []).map((d: any) => ({ code: String(d.code), name: d.name })));
    } catch { toast.error('Không thể tải quận/huyện'); }
    finally { setLoadingUnits(false); }
  };

  const handleSelectDistrict = async (d: VNUnit) => {
    setSelectedDistrict(d);
    setSelectedWard(null);
    setWards([]);
    setForm(prev => ({ ...prev, district: d.name, ward: '' }));
    setLoadingUnits(true);
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/d/${d.code}?depth=2`);
      const data = await res.json();
      setWards((data.wards || []).map((w: any) => ({ code: String(w.code), name: w.name })));
    } catch { toast.error('Không thể tải phường/xã'); }
    finally { setLoadingUnits(false); }
  };

  const handleSelectWard = (w: VNUnit) => {
    setSelectedWard(w);
    setForm(prev => ({ ...prev, ward: w.name }));
  };

  // GPS — dùng provinces.open-api.vn/api/?q= search để match chính xác
  const getGps = () => {
    if (!navigator.geolocation) { toast.error('Trình duyệt không hỗ trợ GPS'); return; }
    setGpsLoading(true);

    // Bỏ prefix hành chính để lấy tên thuần
    const stripPrefix = (s: string) =>
      s.replace(/^(Tỉnh|Thành phố|TP\.|Quận|Huyện|Thị xã|TX\.|Phường|Xã|Thị trấn|TT\.)\s*/i, '').trim();

    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Search API provinces.open-api.vn — tìm theo tên, trả về kết quả chính xác
    const searchProvince = async (query: string): Promise<VNUnit | undefined> => {
      const cleaned = stripPrefix(query);
      // Thử match local trước
      const localMatch = provinces.find(p =>
        normalize(p.name) === normalize(query) ||
        normalize(p.name) === normalize(cleaned) ||
        normalize(p.name).includes(normalize(cleaned)) ||
        normalize(cleaned).includes(normalize(p.name))
      );
      if (localMatch) return localMatch;

      // Fallback: search API
      try {
        const res = await fetch(`https://provinces.open-api.vn/api/p/search/?q=${encodeURIComponent(cleaned)}`);
        const data = await res.json();
        if (data[0]) return { code: String(data[0].code), name: data[0].name };
      } catch {}
      return undefined;
    };

    const searchDistrict = async (distList: VNUnit[], ...candidates: string[]): Promise<VNUnit | undefined> => {
      for (const raw of candidates) {
        if (!raw) continue;
        const cleaned = stripPrefix(raw);
        const found = distList.find(d =>
          normalize(d.name) === normalize(raw) ||
          normalize(d.name) === normalize(cleaned) ||
          normalize(stripPrefix(d.name)) === normalize(cleaned) ||
          normalize(d.name).includes(normalize(cleaned)) ||
          normalize(cleaned).includes(normalize(stripPrefix(d.name)))
        );
        if (found) return found;
      }
      return undefined;
    };

    const searchWard = (wardList: VNUnit[], ...candidates: string[]): VNUnit | undefined => {
      for (const raw of candidates) {
        if (!raw) continue;
        const cleaned = stripPrefix(raw);
        const found = wardList.find(w =>
          normalize(w.name) === normalize(raw) ||
          normalize(w.name) === normalize(cleaned) ||
          normalize(stripPrefix(w.name)) === normalize(cleaned) ||
          normalize(w.name).includes(normalize(cleaned)) ||
          normalize(cleaned).includes(normalize(stripPrefix(w.name)))
        );
        if (found) return found;
      }
      return undefined;
    };

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=vi&zoom=18&addressdetails=1`);
          const data = await res.json();
          const addr = data.address || {};
          console.log('🗺️ GPS raw:', JSON.stringify(addr, null, 2));

          const line = [addr.house_number, addr.road, addr.pedestrian].filter(Boolean).join(' ');

          // Luôn fill addressLine ngay
          setForm(prev => ({ ...prev, addressLine: line || prev.addressLine }));

          // ── Tất cả field có thể chứa thông tin hành chính ──
          const allFields = {
            state: addr.state || '',
            province: addr.province || '',
            city: addr.city || '',
            town: addr.town || '',
            county: addr.county || '',
            district: addr.district || '',
            city_district: addr.city_district || '',
            municipality: addr.municipality || '',
            suburb: addr.suburb || '',
            quarter: addr.quarter || '',
            neighbourhood: addr.neighbourhood || '',
            village: addr.village || '',
            hamlet: addr.hamlet || '',
          };
          console.log('📍 All fields:', allFields);

          // ── 1. Match tỉnh/thành phố ──
          let matchedProvince: VNUnit | undefined;
          for (const candidate of [allFields.state, allFields.province, allFields.city, allFields.town]) {
            if (!candidate) continue;
            matchedProvince = await searchProvince(candidate);
            if (matchedProvince) break;
          }
          console.log('✅ Province:', matchedProvince);

          if (!matchedProvince) {
            setForm(prev => ({ ...prev, city: allFields.state || allFields.city, district: allFields.county || allFields.district, ward: allFields.suburb || allFields.quarter }));
            toast('Đã điền địa chỉ từ GPS, vui lòng kiểm tra lại', { icon: '⚠️' });
            setGpsLoading(false);
            return;
          }

          setSelectedProvince(matchedProvince);
          setSelectedDistrict(null);
          setSelectedWard(null);
          setForm(prev => ({ ...prev, city: matchedProvince!.name }));
          setLoadingUnits(true);

          try {
            // ── 2. Load quận/huyện (depth=2) ──
            const distRes = await fetch(`https://provinces.open-api.vn/api/p/${matchedProvince.code}?depth=2`);
            const distData = await distRes.json();
            const distList: VNUnit[] = (distData.districts || []).map((d: any) => ({ code: String(d.code), name: d.name }));
            setDistricts(distList);
            setWards([]);

            // Thử match quận từ các field Nominatim
            let matchedDistrict = await searchDistrict(
              distList,
              allFields.county, allFields.district, allFields.city_district,
              allFields.town, allFields.municipality
            );

            // ── Nếu không match được quận → tìm ngược từ phường ──
            // Nominatim VN hay bỏ cấp quận, chỉ trả city = "Phường X"
            // => Load depth=3 toàn tỉnh, tìm phường nằm trong quận nào
            if (!matchedDistrict) {
              const wardHint = allFields.city || allFields.suburb || allFields.quarter || allFields.neighbourhood || allFields.village || '';
              if (wardHint) {
                console.log('🔍 Quận không tìm thấy, thử tìm ngược từ phường:', wardHint);
                try {
                  const deepRes = await fetch(`https://provinces.open-api.vn/api/p/${matchedProvince.code}?depth=3`);
                  const deepData = await deepRes.json();
                  const cleanedHint = stripPrefix(wardHint);

                  for (const dist of (deepData.districts || [])) {
                    const foundWard = (dist.wards || []).find((w: any) =>
                      normalize(w.name) === normalize(wardHint) ||
                      normalize(w.name) === normalize(cleanedHint) ||
                      normalize(stripPrefix(w.name)) === normalize(cleanedHint)
                    );
                    if (foundWard) {
                      matchedDistrict = { code: String(dist.code), name: dist.name };
                      // Cũng set luôn wards cho quận này
                      const wardList: VNUnit[] = (dist.wards || []).map((w: any) => ({ code: String(w.code), name: w.name }));
                      setWards(wardList);
                      setSelectedDistrict(matchedDistrict);
                      setForm(prev => ({ ...prev, district: matchedDistrict!.name }));

                      const matchedWard: VNUnit = { code: String(foundWard.code), name: foundWard.name };
                      setSelectedWard(matchedWard);
                      setForm(prev => ({ ...prev, ward: matchedWard.name }));

                      console.log('✅ Found via reverse ward search — District:', matchedDistrict, 'Ward:', matchedWard);
                      toast.success('Đã tự động điền đầy đủ địa chỉ từ GPS');
                      return; // Done!
                    }
                  }
                } catch (e) { console.warn('depth=3 search failed:', e); }
              }

              // Nếu vẫn không tìm được
              setForm(prev => ({ ...prev, district: allFields.county || allFields.district || stripPrefix(allFields.city), ward: allFields.suburb || allFields.quarter || '' }));
              toast('Đã điền tỉnh/thành từ GPS, vui lòng chọn quận/huyện', { icon: '⚠️' });
              return;
            }

            console.log('✅ District:', matchedDistrict);
            setSelectedDistrict(matchedDistrict);
            setForm(prev => ({ ...prev, district: matchedDistrict!.name }));

            // ── 3. Load & match phường/xã ──
            const wardRes = await fetch(`https://provinces.open-api.vn/api/d/${matchedDistrict.code}?depth=2`);
            const wardData = await wardRes.json();
            const wardList: VNUnit[] = (wardData.wards || []).map((w: any) => ({ code: String(w.code), name: w.name }));
            setWards(wardList);

            // Thử match phường — thử cả allFields.city vì Nominatim hay cho phường vào field city
            const matchedWard = searchWard(
              wardList,
              allFields.quarter, allFields.suburb, allFields.neighbourhood,
              allFields.village, allFields.hamlet, allFields.city
            );
            console.log('✅ Ward:', matchedWard);

            if (matchedWard) {
              setSelectedWard(matchedWard);
              setForm(prev => ({ ...prev, ward: matchedWard.name }));
              toast.success('Đã tự động điền đầy đủ địa chỉ từ GPS');
            } else {
              setForm(prev => ({ ...prev, ward: allFields.suburb || allFields.quarter || allFields.neighbourhood || '' }));
              toast('Đã điền tỉnh/quận từ GPS, vui lòng chọn phường/xã', { icon: '⚠️' });
            }
          } finally {
            setLoadingUnits(false);
          }
        } catch (err) {
          console.error('GPS error:', err);
          toast.error('Không thể lấy địa chỉ từ GPS');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        toast.error('Không thể truy cập vị trí. Hãy cho phép quyền GPS.');
        setGpsLoading(false);
      }
    );
  };
  const handleSubmit = async () => {
  if (!form.fullName.trim()) { toast.error('Vui lòng nhập họ và tên'); return; }
  if (!form.phone.trim()) { toast.error('Vui lòng nhập số điện thoại'); return; }
  
  // ✅ Check form.city/district/ward thay vì selectedProvince/District/Ward
  if (!form.city.trim()) { toast.error('Vui lòng chọn tỉnh/thành phố'); return; }
  if (!form.district.trim()) { toast.error('Vui lòng chọn quận/huyện'); return; }
  if (!form.ward.trim()) { toast.error('Vui lòng chọn phường/xã'); return; }
  if (!form.addressLine.trim()) { toast.error('Vui lòng nhập địa chỉ cụ thể'); return; }
  
  setSaving(true);
  try { await onSave(form); }
  finally { setSaving(false); }

};

  const fullAddress = [form.addressLine, form.ward, form.district, form.city].filter(Boolean).join(', ');
  const inputCls = "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-blue-400 focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-3xl z-10">
          <h3 className="text-base font-bold text-slate-800">{editing ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={17} className="text-slate-400" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Họ tên + SĐT */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Họ và tên *</label>
              <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Nguyễn Văn A" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Số điện thoại *</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="0901 234 567" className={inputCls} />
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2">
            {([
              { id: 'manual', label: '📝 Nhập tay' },
              { id: 'gps',    label: '📍 GPS' },
            ] as { id: Mode; label: string }[]).map(({ id, label }) => (
              <button key={id} type="button" onClick={() => setMode(id)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* GPS mode */}
          {mode === 'gps' && (
            <button type="button" onClick={getGps} disabled={gpsLoading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-blue-300 text-blue-600 font-bold text-sm hover:bg-blue-50 disabled:opacity-60 transition-all">
              {gpsLoading ? <><Loader2 size={18} className="animate-spin" /> Đang xác định vị trí...</> : <><Navigation size={18} /> Lấy vị trí hiện tại</>}
            </button>
          )}

          {/* Dropdown Tỉnh/Quận/Phường */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tỉnh/Thành phố, Quận/Huyện, Phường/Xã *</label>
            <LocationDropdown
              provinces={provinces} districts={districts} wards={wards}
              selectedProvince={selectedProvince} selectedDistrict={selectedDistrict} selectedWard={selectedWard}
              onSelectProvince={handleSelectProvince} onSelectDistrict={handleSelectDistrict} onSelectWard={handleSelectWard}
              loading={loadingUnits}
            />
          </div>

          {/* Địa chỉ cụ thể */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Địa chỉ cụ thể *</label>
            <textarea value={form.addressLine} onChange={e => setForm(p => ({ ...p, addressLine: e.target.value }))}
              placeholder="Số nhà, tên đường, ngõ, ngách..."
              rows={2} className={`${inputCls} resize-none`} />
          </div>

          {/* Map preview — hiện khi có đủ thông tin */}
          {fullAddress.length > 15 && <MapPreview address={fullAddress} />}

          {/* Loại địa chỉ / default */}
          <div onClick={() => setForm(p => ({ ...p, isDefault: !p.isDefault }))}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer select-none transition-all ${form.isDefault ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${form.isDefault ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isDefault ? 'right-1' : 'left-1'}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Đặt làm địa chỉ mặc định</p>
              <p className="text-xs text-slate-400">Được tự động chọn khi thanh toán</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white flex gap-3 px-6 pb-6 pt-3 border-t border-slate-100 rounded-b-3xl">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">Hủy</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Đang lưu...' : (editing ? 'Lưu thay đổi' : 'Thêm địa chỉ')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Address Card ─────────────────────────────────────────────────────────────
const AddressCard = ({ address, onEdit, onDelete, onSetDefault }: {
  address: Address; onEdit: () => void; onDelete: () => void; onSetDefault: () => void;
}) => (
  <div className={`relative p-4 rounded-2xl border-2 transition-all ${address.isDefault ? 'border-blue-300 bg-blue-50/30' : 'border-slate-100 hover:border-slate-200'}`}>
    {address.isDefault && (
      <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full uppercase">
        <Home size={10} /> Mặc định
      </span>
    )}
    <div className="pr-24">
      <p className="font-bold text-sm text-slate-800">{address.fullName}</p>
      <p className="text-xs text-slate-500 mt-0.5">{address.phone}</p>
      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{address.addressLine}, {address.ward}, {address.district}, {address.city}</p>
    </div>
    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
      <button onClick={onEdit} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
        <Pencil size={11} /> Sửa
      </button>
      {!address.isDefault && <>
        <span className="text-slate-200">|</span>
        <button onClick={onSetDefault} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">
          <CheckCircle2 size={11} /> Đặt mặc định
        </button>
        <span className="text-slate-200">|</span>
        <button onClick={onDelete} className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
          <Trash2 size={11} /> Xóa
        </button>
      </>}
    </div>
  </div>
);

// ─── Upload Button ────────────────────────────────────────────────────────────
const UploadBtn = ({ onUpload, className }: { onUpload: (file: File) => Promise<void>; className?: string }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { await onUpload(file); } finally { setUploading(false); if (ref.current) ref.current.value = ''; }
  };
  return (
    <label className={`cursor-pointer ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full transition-colors">
        {uploading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
      </div>
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handle} disabled={uploading} />
    </label>
  );
};

// ─── Editable Field ───────────────────────────────────────────────────────────
const EditableField = ({ label, value, icon, onSave, type = 'text', placeholder, readOnly }: {
  label: string; value: string; icon: React.ReactNode;
  onSave?: (val: string) => Promise<void>; type?: string; placeholder?: string; readOnly?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(value); }, [value]);
  const handleSave = async () => {
    if (!onSave || draft.trim() === value) { setEditing(false); return; }
    setSaving(true); try { await onSave(draft.trim()); setEditing(false); } finally { setSaving(false); }
  };
  return (
    <div className="group flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 text-slate-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        {editing ? (
          <input type={type} value={draft} autoFocus onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
            placeholder={placeholder} className="w-full border-2 border-blue-400 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none" />
        ) : (
          <p className="text-sm font-semibold text-slate-800 truncate">
            {value || <span className="text-slate-300 font-normal italic">Chưa cập nhật</span>}
          </p>
        )}
      </div>
      {!readOnly ? (
        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
              <button onClick={() => { setDraft(value); setEditing(false); }} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"><X size={13} /></button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Pencil size={13} /></button>
          )}
        </div>
      ) : <span className="text-[10px] text-slate-300 font-medium shrink-0">Không thể thay đổi</span>}
    </div>
  );
};

// ─── Main ProfilePage ─────────────────────────────────────────────────────────
export const ProfilePage = () => {
  const { user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | undefined>();
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');


  useEffect(() => {
    if (!user) return;
    const u = user as any;
    setAvatarUrl(u.avatarUrl || u.avatar_url || '');
    setBannerUrl(u.bannerUrl || u.banner_url || '');
    addressService.getMyAddresses().then(setAddresses).catch(() => toast.error('Không thể tải địa chỉ')).finally(() => setLoadingAddresses(false));
  }, [user]);

  if (!user) return null;

  const u = user as any;
  const displayName = user.fullName || u.name || 'Người dùng';
  const userRole = u.role || 'customer';
  const userPoints = u.points || 0;
  const membership = MEMBERSHIP[(u.membershipLevel as keyof typeof MEMBERSHIP)] || MEMBERSHIP.bronze;
  const initials = displayName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase();

  const updateField = async (field: string, value: string) => {
    try {
      const updated = await userService.updateUser(u.userId, { [field]: value } as UpdateUserPayload);
      setAuth({ ...user, ...updated } as typeof user, useAuthStore.getState().token!);
      toast.success('Cập nhật thành công');
    } catch { toast.error('Không thể cập nhật'); throw new Error('failed'); }
  };

  const uploadAvatar = async (file: File) => {
    const formData = new FormData(); formData.append('image', file);
    const res = await api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setAvatarUrl(res.data.avatarUrl);
    setAuth({ ...user, avatarUrl: res.data.avatarUrl } as typeof user, useAuthStore.getState().token!);
    toast.success('Đã cập nhật ảnh đại diện');
  };

  const uploadBanner = async (file: File) => {
    const formData = new FormData(); formData.append('image', file);
    const res = await api.post('/users/me/banner', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setBannerUrl(res.data.bannerUrl);
    toast.success('Đã cập nhật ảnh bìa');
  };

  const handleSaveAddress = async (data: AddressFormData) => {
    try {
      if (editingAddress) { await addressService.update(editingAddress.addressId, data); toast.success('Đã cập nhật địa chỉ'); }
      else { await addressService.create(data); toast.success('Đã thêm địa chỉ mới'); }
      setShowModal(false); setEditingAddress(undefined);
      setAddresses(await addressService.getMyAddresses());
    } catch { toast.error('Không thể lưu địa chỉ'); }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm('Xóa địa chỉ này?')) return;
    try { await addressService.delete(id); setAddresses(prev => prev.filter(a => a.addressId !== id)); toast.success('Đã xóa'); }
    catch { toast.error('Không thể xóa'); }
  };

  const handleSetDefault = async (id: number) => {
    try { await addressService.setDefault(id); setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.addressId === id }))); toast.success('Đã đặt làm mặc định'); }
    catch { toast.error('Không thể cập nhật'); }
  };

  const handleLogout = async () => {
    setLoggingOut(true); await new Promise(r => setTimeout(r, 400));
    clearAuth(); toast.success('Đã đăng xuất'); navigate('/login');
  };


  return (
    <Layout>
      {showModal && <AddressModal editing={editingAddress} onSave={handleSaveAddress} onClose={() => { setShowModal(false); setEditingAddress(undefined); }} />}

      <div className="min-h-screen bg-slate-50/60">
        <div className="container mx-auto px-4 py-10 max-w-2xl space-y-5">

          {/* ── Hero Card ── */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="relative h-28 group">
              {bannerUrl ? (
                <img src={getUrl(bannerUrl)} alt="banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}>
                  <div className="w-full h-full opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <UploadBtn onUpload={uploadBanner} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-10 mb-4">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={getUrl(avatarUrl)} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-blue-600 select-none">{initials}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <UploadBtn onUpload={uploadAvatar} />
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${membership.bg} ${membership.color} ${membership.border}`}>
                  {membership.icon} {membership.label}
                </div>
              </div>
              <h1 className="text-xl font-black text-slate-800">{displayName}</h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-slate-400">{ROLE_LABELS[userRole] || 'Khách hàng'}</span>
                {userPoints > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Star size={11} className="fill-current" /> {userPoints.toLocaleString()} điểm
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-300 mt-2">Di chuột vào ảnh bìa hoặc avatar để thay đổi</p>
            </div>
          </div>

          {/* ── Thông tin cá nhân ── */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">Thông tin cá nhân</h2>
            </div>
            <div className="px-6">
              <EditableField label="Họ và tên" value={displayName} icon={<User size={15} />} placeholder="Nguyễn Văn A" onSave={val => updateField('name', val)} />
              <EditableField label="Email" value={user.email} icon={<Mail size={15} />} type="email" placeholder="email@example.com" onSave={val => updateField('email', val)} />
              <EditableField label="Số điện thoại" value={u.phone || ''} icon={<Phone size={15} />} type="tel" placeholder="0901 234 567" onSave={val => updateField('phone', val)} />
              <EditableField label="Vai trò" value={ROLE_LABELS[userRole] || 'Khách hàng'} icon={<Shield size={15} />} readOnly />
            </div>
          </div>

          {/* ── Địa chỉ ── */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-700">Địa chỉ của tôi</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">{addresses.length} địa chỉ đã lưu</p>
              </div>
              <button onClick={() => { setEditingAddress(undefined); setShowModal(true); }}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors">
                <Plus size={13} /> Thêm địa chỉ
              </button>
            </div>
            <div className="p-4 space-y-3">
              {loadingAddresses ? (
                <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                  <Loader2 size={16} className="animate-spin" /><span className="text-sm">Đang tải...</span>
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-10">
                  <MapPin size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-400">Chưa có địa chỉ nào</p>
                  <button onClick={() => setShowModal(true)} className="mt-4 flex items-center gap-2 mx-auto text-sm font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors">
                    <Plus size={14} /> Thêm địa chỉ đầu tiên
                  </button>
                </div>
              ) : addresses.map(addr => (
                <AddressCard key={addr.addressId} address={addr}
                  onEdit={() => { setEditingAddress(addr); setShowModal(true); }}
                  onDelete={() => handleDeleteAddress(addr.addressId)}
                  onSetDefault={() => handleSetDefault(addr.addressId)} />
              ))}
            </div>
          </div>

          {/* ── Ví TechMart ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-800 uppercase italic flex items-center gap-2">
                👛 Ví TechMart
              </h2>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">Số dư hiện tại</p>
                <p className="text-2xl font-black text-orange-600">
                  {(user?.walletBalance ?? 0).toLocaleString('vi-VN')}₫
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/wallet')}
              className="mt-4 w-full py-3 rounded-2xl border-2 border-orange-400 text-orange-600 font-black text-sm hover:bg-orange-50 transition-all">
              Quản lý ví & Nạp tiền →
            </button>
          </div>

          {/* ── Đăng xuất ── */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button onClick={handleLogout} disabled={loggingOut}
              className="w-full flex items-center gap-3 px-6 py-4 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 group">
              <div className="w-9 h-9 bg-red-50 group-hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors">
                {loggingOut ? <Loader2 size={15} className="animate-spin text-red-400" /> : <LogOut size={15} className="text-red-400" />}
              </div>
              <span className="text-sm font-bold">{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
            </button>
          </div>

        </div>
      </div>
    </Layout>
  );
};
