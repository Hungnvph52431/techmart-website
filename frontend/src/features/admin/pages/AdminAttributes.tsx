import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAttributeService } from '@/services/admin/attribute.service';
import { adminCategoryService } from '@/services/admin/category.service';
import {
  AdminAttribute, AdminAttributeInputType,
  AdminCategory, CategoryAttributeAssignment,
} from '@/features/admin/types/catalog';
import { Plus, Pencil, Trash2, X, Check, Tag, Link2, ChevronDown, ChevronUp } from 'lucide-react';

const INPUT_TYPES: AdminAttributeInputType[] = ['text', 'textarea', 'number', 'boolean', 'select', 'multi_select', 'color'];

const INPUT_TYPE_LABELS: Record<string, string> = {
  text: 'Văn bản', textarea: 'Đoạn văn', number: 'Số',
  boolean: 'Có/Không', select: 'Chọn 1', multi_select: 'Chọn nhiều', color: 'Màu sắc',
};

const SCOPE_LABELS: Record<string, { label: string; color: string }> = {
  variant: { label: 'Biến thể', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  product: { label: 'Sản phẩm', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const emptyForm: Omit<AdminAttribute, 'attributeId'> = {
  name: '', code: '', inputType: 'text', scope: 'product',
  isRequired: false, isFilterable: false, isVariantAxis: false,
  displayOrder: 0, isActive: true, options: [],
};

// ─── Attribute Form Panel ────────────────────────────────────────────────────
const AttributeFormPanel = ({
  editingId, form, setForm, onSubmit, onCancel, submitting,
}: {
  editingId: number | null;
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitting: boolean;
}) => {
  const needsOptions = ['select', 'multi_select', 'color'].includes(form.inputType);

  const handleOptionChange = (index: number, field: 'label' | 'value' | 'colorHex', value: string) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? { ...opt, [field]: value } : opt),
    }));
  };

  const addOption = () => setForm(prev => ({
    ...prev,
    options: [...prev.options, { label: '', value: '', colorHex: '', displayOrder: prev.options.length, isActive: true }],
  }));

  const removeOption = (index: number) => setForm(prev => ({
    ...prev, options: prev.options.filter((_, i) => i !== index),
  }));

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-blue-600">
        <h2 className="text-base font-bold text-white">
          {editingId ? '✏️ Chỉnh sửa thuộc tính' : '➕ Tạo thuộc tính mới'}
        </h2>
        <button onClick={onCancel} className="text-blue-200 hover:text-white transition-colors"><X size={18} /></button>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tên */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Tên thuộc tính <span className="text-red-500">*</span>
            </label>
            <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="VD: Màu sắc, Dung lượng..."
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-blue-400 focus:outline-none"
              required />
          </div>

          {/* Mã code */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Mã code <span className="text-red-500">*</span>
            </label>
            <input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
              placeholder="VD: color, storage, ram..."
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-blue-400 focus:outline-none"
              required />
            <p className="text-xs text-slate-400">Dùng để nhận diện nội bộ, không nên thay đổi sau khi tạo</p>
          </div>

          {/* Kiểu dữ liệu */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Kiểu dữ liệu</label>
            <select value={form.inputType} onChange={(e) => setForm(p => ({ ...p, inputType: e.target.value as AdminAttributeInputType }))}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-blue-400 focus:outline-none bg-white">
              {INPUT_TYPES.map((t) => (
                <option key={t} value={t}>{INPUT_TYPE_LABELS[t]} ({t})</option>
              ))}
            </select>
          </div>

          {/* Phạm vi */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Phạm vi áp dụng</label>
            <div className="grid grid-cols-2 gap-3">
              {(['product', 'variant'] as const).map((scope) => (
                <button key={scope} type="button"
                  onClick={() => setForm(p => ({ ...p, scope }))}
                  className={`py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.scope === scope
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  {scope === 'product' ? '📦 Sản phẩm' : '🎨 Biến thể'}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              {form.scope === 'variant' ? 'Dùng để tạo biến thể (màu sắc, dung lượng...)' : 'Thông số chung của sản phẩm (màn hình, RAM...)'}
            </p>
          </div>
        </div>

        {/* Tuỳ chọn bổ sung */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { key: 'isRequired', label: '⚠️ Bắt buộc nhập', desc: 'Phải có giá trị khi tạo sản phẩm' },
            { key: 'isFilterable', label: '🔍 Có thể lọc', desc: 'Hiển thị trong bộ lọc sản phẩm' },
            { key: 'isVariantAxis', label: '🎛️ Trục biến thể', desc: 'Dùng làm trục tạo biến thể sản phẩm' },
          ] as const).map(({ key, label, desc }) => (
            <div key={key} onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
              className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer select-none transition-all ${
                form[key] ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
              }`}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                form[key] ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
              }`}>
                {form[key] && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Danh sách lựa chọn (chỉ hiện khi select/color) */}
        {needsOptions && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-700">Danh sách lựa chọn</h3>
                <p className="text-xs text-slate-400">Thêm các giá trị mà admin/khách có thể chọn</p>
              </div>
              <button type="button" onClick={addOption}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
                <Plus size={12} /> Thêm lựa chọn
              </button>
            </div>

            {form.options.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-sm text-slate-400">Chưa có lựa chọn nào. Bấm "Thêm lựa chọn" để bắt đầu.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                  <div className="col-span-5 text-xs font-bold text-slate-400 uppercase">Nhãn hiển thị</div>
                  <div className="col-span-4 text-xs font-bold text-slate-400 uppercase">Giá trị lưu</div>
                  {form.inputType === 'color' && <div className="col-span-2 text-xs font-bold text-slate-400 uppercase">Màu HEX</div>}
                  <div className="col-span-1" />
                </div>
                {form.options.map((option, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 bg-white border border-slate-100 rounded-xl">
                    <input value={option.label} onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                      placeholder="VD: Đen, 256GB..." className="col-span-5 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                    <input value={option.value} onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                      placeholder="VD: black, 256gb..." className="col-span-4 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-400 focus:outline-none" />
                    {form.inputType === 'color' ? (
                      <div className="col-span-2 flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg border-2 border-slate-200 shrink-0" style={{ backgroundColor: option.colorHex || '#eee' }} />
                        <input value={option.colorHex || ''} onChange={(e) => handleOptionChange(index, 'colorHex', e.target.value)}
                          placeholder="#000000" className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-2 text-xs font-mono focus:border-blue-400 focus:outline-none" />
                      </div>
                    ) : <div className="col-span-2" />}
                    <button type="button" onClick={() => removeOption(index)}
                      className="col-span-1 flex justify-center p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 flex-1 justify-center bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all">
            <Check size={16} />
            {submitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Tạo thuộc tính')}
          </button>
          <button type="button" onClick={onCancel}
            className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export const AdminAttributes = () => {
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<CategoryAttributeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);
  const [mappingExpanded, setMappingExpanded] = useState(true);

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => {
    if (selectedCategoryId) fetchAssignments(selectedCategoryId);
    else setAssignments([]);
  }, [selectedCategoryId]);

  const assignmentMap = useMemo(() =>
    assignments.reduce<Record<number, CategoryAttributeAssignment>>((acc, item) => {
      acc[item.attributeId] = item; return acc;
    }, {}), [assignments]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [attrData, catData] = await Promise.all([adminAttributeService.getAll(), adminCategoryService.getAll()]);
      setAttributes(attrData); setCategories(catData);
      const firstParent = catData.find(c => !c.parentId);
      if (firstParent) setSelectedCategoryId(firstParent.categoryId);
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  };

  const fetchAssignments = async (categoryId: number) => {
    try { setAssignments(await adminAttributeService.getCategoryAssignments(categoryId)); }
    catch { toast.error('Không thể tải mapping thuộc tính'); }
  };

  const handleEdit = (attribute: AdminAttribute) => {
    setEditingId(attribute.attributeId);
    setForm({ name: attribute.name, code: attribute.code, inputType: attribute.inputType, scope: attribute.scope,
      isRequired: attribute.isRequired, isFilterable: attribute.isFilterable, isVariantAxis: attribute.isVariantAxis,
      displayOrder: attribute.displayOrder, isActive: attribute.isActive, options: attribute.options || [] });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, options: form.options.map((opt, i) => ({ ...opt, displayOrder: i })) };
    try {
      setSubmitting(true);
      if (editingId) { await adminAttributeService.update(editingId, payload); toast.success('Cập nhật thành công'); }
      else { await adminAttributeService.create(payload); toast.success('Tạo thuộc tính thành công'); }
      setEditingId(null); setForm({ ...emptyForm }); setShowForm(false);
      fetchInitialData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Không thể lưu thuộc tính'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (attributeId: number, name: string) => {
    if (!confirm(`Xóa thuộc tính "${name}"?`)) return;
    try {
      await adminAttributeService.remove(attributeId);
      toast.success(`Đã xóa "${name}"`); fetchInitialData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Không thể xóa'); }
  };

  const toggleAssignment = (attributeId: number, checked: boolean) => {
    setAssignments(prev => {
      if (checked && !prev.find(a => a.attributeId === attributeId) && selectedCategoryId)
        return [...prev, { categoryAttributeId: 0, categoryId: selectedCategoryId, attributeId, isRequired: false, isVariantAxis: false, displayOrder: prev.length }];
      if (!checked) return prev.filter(a => a.attributeId !== attributeId);
      return prev;
    });
  };

  const updateAssignment = (attributeId: number, field: 'isRequired' | 'isVariantAxis', value: boolean) =>
    setAssignments(prev => prev.map(a => a.attributeId === attributeId ? { ...a, [field]: value } : a));

  const saveAssignments = async () => {
    if (!selectedCategoryId) return;
    try {
      setSavingMapping(true);
      await adminAttributeService.assignCategoryAttributes(selectedCategoryId,
        assignments.map((a, i) => ({ attributeId: a.attributeId, isRequired: a.isRequired, isVariantAxis: a.isVariantAxis, displayOrder: i })));
      toast.success('Đã lưu cấu hình thuộc tính cho danh mục');
      fetchAssignments(selectedCategoryId);
    } catch (error: any) { toast.error(error.response?.data?.message || 'Không thể lưu'); }
    finally { setSavingMapping(false); }
  };

  const selectedCategoryName = categories.find(c => c.categoryId === selectedCategoryId)?.name || '';
  const assignedCount = assignments.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Thuộc tính sản phẩm</h1>
          <p className="text-sm text-slate-500 mt-1">Định nghĩa thông số kỹ thuật và gán cho từng danh mục</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800">{attributes.length}</div>
            <div className="text-xs text-slate-400">Thuộc tính</div>
          </div>
          {!showForm && (
            <button onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(true); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm">
              <Plus size={16} /> Tạo thuộc tính
            </button>
          )}
        </div>
      </div>

      {/* Form tạo/sửa */}
      {showForm && (
        <AttributeFormPanel editingId={editingId} form={form} setForm={setForm}
          onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditingId(null); setForm({ ...emptyForm }); }}
          submitting={submitting} />
      )}

      {/* Gán thuộc tính theo danh mục */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setMappingExpanded(v => !v)}
        >
          <div className="flex items-center gap-3">
            <Link2 size={18} className="text-violet-500" />
            <div>
              <h2 className="text-base font-bold text-slate-800">Gán thuộc tính theo danh mục</h2>
              <p className="text-xs text-slate-400">Quy định danh mục nào dùng thuộc tính nào khi tạo sản phẩm</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedCategoryName && (
              <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                {selectedCategoryName} · {assignedCount} thuộc tính
              </span>
            )}
            {mappingExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </div>
        </div>

        {mappingExpanded && (
          <div className="border-t border-slate-100">
            {/* Chọn danh mục */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide shrink-0">Chọn danh mục:</label>
              <select value={selectedCategoryId || ''} onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                className="border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold focus:border-violet-400 focus:outline-none bg-white">
                {categories.filter(cat => !cat.parentId).map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400">Tick vào thuộc tính muốn áp dụng cho danh mục này, rồi bấm Lưu.</p>
            </div>

            {/* Bảng mapping */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide w-12">Bật</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Thuộc tính</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Phạm vi</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wide">Bắt buộc</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wide">Trục biến thể</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((attr) => {
                  const assignment = assignmentMap[attr.attributeId];
                  const enabled = Boolean(assignment);
                  return (
                    <tr key={attr.attributeId} className={`border-b border-slate-50 transition-colors ${enabled ? 'bg-violet-50/40' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-3">
                        <input type="checkbox" checked={enabled}
                          onChange={(e) => toggleAssignment(attr.attributeId, e.target.checked)}
                          className="w-4 h-4 accent-violet-600 cursor-pointer" />
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-semibold text-sm text-slate-800">{attr.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{attr.code}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${SCOPE_LABELS[attr.scope]?.color}`}>
                          {SCOPE_LABELS[attr.scope]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <input type="checkbox" checked={assignment?.isRequired || false} disabled={!enabled}
                          onChange={(e) => updateAssignment(attr.attributeId, 'isRequired', e.target.checked)}
                          className="w-4 h-4 accent-violet-600 cursor-pointer disabled:opacity-30" />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <input type="checkbox" checked={assignment?.isVariantAxis || false} disabled={!enabled}
                          onChange={(e) => updateAssignment(attr.attributeId, 'isVariantAxis', e.target.checked)}
                          className="w-4 h-4 accent-violet-600 cursor-pointer disabled:opacity-30" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {assignedCount > 0 ? `${assignedCount} thuộc tính đang được bật cho "${selectedCategoryName}"` : 'Chưa có thuộc tính nào được bật cho danh mục này'}
              </p>
              <button onClick={saveAssignments} disabled={savingMapping}
                className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-900 disabled:opacity-50 transition-all">
                <Check size={14} />
                {savingMapping ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danh sách thuộc tính */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <Tag size={18} className="text-blue-500" />
          <h2 className="text-base font-bold text-slate-800">Danh sách thuộc tính</h2>
          <span className="ml-auto text-xs font-semibold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">{attributes.length} thuộc tính</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Đang tải...</p>
          </div>
        ) : attributes.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <Tag size={36} className="text-slate-200" />
            <p className="text-slate-400 font-semibold">Chưa có thuộc tính nào</p>
            <p className="text-slate-300 text-sm">Bấm "Tạo thuộc tính" để bắt đầu</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Tên / Mã code</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Kiểu dữ liệu</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Phạm vi</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wide">Lựa chọn</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wide">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {attributes.map((attr) => (
                <tr key={attr.attributeId} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-sm text-slate-800">{attr.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{attr.code}</div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                      {INPUT_TYPE_LABELS[attr.inputType] || attr.inputType}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${SCOPE_LABELS[attr.scope]?.color}`}>
                      {SCOPE_LABELS[attr.scope]?.label}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {(attr.options?.length || 0) > 0 ? (
                      <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                        {attr.options?.length} lựa chọn
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(attr)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Pencil size={12} /> Sửa
                      </button>
                      <button onClick={() => handleDelete(attr.attributeId, attr.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};