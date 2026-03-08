import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAttributeService } from '@/services/admin/attribute.service';
import { adminCategoryService } from '@/services/admin/category.service';
import {
  AdminAttribute,
  AdminAttributeInputType,
  AdminCategory,
  CategoryAttributeAssignment,
} from '@/features/admin/types/catalog';

const INPUT_TYPES: AdminAttributeInputType[] = [
  'text',
  'textarea',
  'number',
  'boolean',
  'select',
  'multi_select',
  'color',
];

const emptyAttributeForm: Omit<AdminAttribute, 'attributeId'> = {
  name: '',
  code: '',
  inputType: 'text',
  scope: 'product',
  isRequired: false,
  isFilterable: false,
  isVariantAxis: false,
  displayOrder: 0,
  isActive: true,
  options: [],
};

export const AdminAttributes = () => {
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<CategoryAttributeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyAttributeForm);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) {
      setAssignments([]);
      return;
    }

    fetchAssignments(selectedCategoryId);
  }, [selectedCategoryId]);

  const assignmentMap = useMemo(
    () =>
      assignments.reduce<Record<number, CategoryAttributeAssignment>>((acc, item) => {
        acc[item.attributeId] = item;
        return acc;
      }, {}),
    [assignments]
  );

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [attributeData, categoryData] = await Promise.all([
        adminAttributeService.getAll(),
        adminCategoryService.getAll(),
      ]);

      setAttributes(attributeData);
      setCategories(categoryData);

      if (categoryData[0]) {
        setSelectedCategoryId(categoryData[0].categoryId);
      }
    } catch (error) {
      console.error('Failed to fetch attributes:', error);
      toast.error('Không thể tải dữ liệu thuộc tính');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (categoryId: number) => {
    try {
      const data = await adminAttributeService.getCategoryAssignments(categoryId);
      setAssignments(data);
    } catch (error) {
      console.error('Failed to fetch category assignments:', error);
      toast.error('Không thể tải mapping thuộc tính');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyAttributeForm);
  };

  const handleEdit = (attribute: AdminAttribute) => {
    setEditingId(attribute.attributeId);
    setForm({
      name: attribute.name,
      code: attribute.code,
      inputType: attribute.inputType,
      scope: attribute.scope,
      isRequired: attribute.isRequired,
      isFilterable: attribute.isFilterable,
      isVariantAxis: attribute.isVariantAxis,
      displayOrder: attribute.displayOrder,
      isActive: attribute.isActive,
      options: attribute.options || [],
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      ...form,
      options: form.options.map((option, index) => ({
        ...option,
        displayOrder: index,
      })),
    };

    try {
      if (editingId) {
        await adminAttributeService.update(editingId, payload);
        toast.success('Cập nhật thuộc tính thành công');
      } else {
        await adminAttributeService.create(payload);
        toast.success('Tạo thuộc tính thành công');
      }

      resetForm();
      fetchInitialData();
    } catch (error: any) {
      console.error('Failed to save attribute:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu thuộc tính');
    }
  };

  const handleDelete = async (attributeId: number) => {
    if (!confirm('Xóa thuộc tính này?')) {
      return;
    }

    try {
      await adminAttributeService.remove(attributeId);
      toast.success('Đã xóa thuộc tính');
      fetchInitialData();
    } catch (error: any) {
      console.error('Failed to delete attribute:', error);
      toast.error(error.response?.data?.message || 'Không thể xóa thuộc tính');
    }
  };

  const handleOptionChange = (
    index: number,
    field: 'label' | 'value' | 'colorHex',
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [field]: value } : option
      ),
    }));
  };

  const toggleAssignment = (attributeId: number, checked: boolean) => {
    setAssignments((prev) => {
      const existing = prev.find((item) => item.attributeId === attributeId);

      if (checked && !existing && selectedCategoryId) {
        return [
          ...prev,
          {
            categoryAttributeId: 0,
            categoryId: selectedCategoryId,
            attributeId,
            isRequired: false,
            isVariantAxis: false,
            displayOrder: prev.length,
          },
        ];
      }

      if (!checked) {
        return prev.filter((item) => item.attributeId !== attributeId);
      }

      return prev;
    });
  };

  const updateAssignment = (
    attributeId: number,
    field: 'isRequired' | 'isVariantAxis',
    value: boolean
  ) => {
    setAssignments((prev) =>
      prev.map((item) =>
        item.attributeId === attributeId ? { ...item, [field]: value } : item
      )
    );
  };

  const saveAssignments = async () => {
    if (!selectedCategoryId) {
      return;
    }

    try {
      await adminAttributeService.assignCategoryAttributes(
        selectedCategoryId,
        assignments.map((item, index) => ({
          attributeId: item.attributeId,
          isRequired: item.isRequired,
          isVariantAxis: item.isVariantAxis,
          displayOrder: index,
        }))
      );
      toast.success('Đã lưu mapping thuộc tính');
      fetchAssignments(selectedCategoryId);
    } catch (error: any) {
      console.error('Failed to save mappings:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu mapping');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Quản lý thuộc tính</h1>
        <p className="text-gray-500 mt-2">
          Quản lý metadata thuộc tính và gán thuộc tính cho từng danh mục.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingId ? 'Cập nhật thuộc tính' : 'Tạo thuộc tính mới'}
          </h2>
          {editingId ? (
            <button type="button" onClick={resetForm} className="text-sm text-gray-500">
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Tên thuộc tính"
            className="border border-gray-300 rounded-lg px-4 py-2"
            required
          />
          <input
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            placeholder="Mã thuộc tính"
            className="border border-gray-300 rounded-lg px-4 py-2"
            required
          />
          <select
            value={form.inputType}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                inputType: event.target.value as AdminAttributeInputType,
              }))
            }
            className="border border-gray-300 rounded-lg px-4 py-2"
          >
            {INPUT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={form.scope}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                scope: event.target.value as AdminAttribute['scope'],
              }))
            }
            className="border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="product">Thuộc tính sản phẩm</option>
            <option value="variant">Thuộc tính biến thể</option>
          </select>
          <input
            type="number"
            value={form.displayOrder}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, displayOrder: Number(event.target.value) }))
            }
            placeholder="Thứ tự"
            className="border border-gray-300 rounded-lg px-4 py-2"
          />
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isRequired}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isRequired: event.target.checked }))
              }
            />
            Bắt buộc
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isFilterable}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isFilterable: event.target.checked }))
              }
            />
            Có thể filter
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isVariantAxis}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isVariantAxis: event.target.checked }))
              }
            />
            Trục biến thể mặc định
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Kích hoạt
          </label>
        </div>

        {['select', 'multi_select', 'color'].includes(form.inputType) ? (
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Danh sách lựa chọn</h3>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    options: [
                      ...prev.options,
                      {
                        label: '',
                        value: '',
                        colorHex: '',
                        displayOrder: prev.options.length,
                        isActive: true,
                      },
                    ],
                  }))
                }
                className="text-sm text-blue-600"
              >
                + Thêm lựa chọn
              </button>
            </div>

            {form.options.map((option, index) => (
              <div key={`option-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  value={option.label}
                  onChange={(event) => handleOptionChange(index, 'label', event.target.value)}
                  placeholder="Nhãn"
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  value={option.value}
                  onChange={(event) => handleOptionChange(index, 'value', event.target.value)}
                  placeholder="Giá trị"
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  value={option.colorHex || ''}
                  onChange={(event) => handleOptionChange(index, 'colorHex', event.target.value)}
                  placeholder="HEX màu"
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      options: prev.options.filter((_, optionIndex) => optionIndex !== index),
                    }))
                  }
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {editingId ? 'Lưu thay đổi' : 'Tạo thuộc tính'}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Gán thuộc tính theo danh mục</h2>
            <p className="text-sm text-gray-500">
              Chọn danh mục rồi bật các thuộc tính áp dụng cho danh mục đó.
            </p>
          </div>
          <select
            value={selectedCategoryId || ''}
            onChange={(event) => setSelectedCategoryId(Number(event.target.value))}
            className="border border-gray-300 rounded-lg px-4 py-2"
          >
            {categories.map((category) => (
              <option key={category.categoryId} value={category.categoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kích hoạt
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Thuộc tính
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Scope
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Bắt buộc
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trục biến thể
                </th>
              </tr>
            </thead>
            <tbody>
              {attributes.map((attribute) => {
                const assignment = assignmentMap[attribute.attributeId];
                const enabled = Boolean(assignment);

                return (
                  <tr key={attribute.attributeId} className="border-b">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) =>
                          toggleAssignment(attribute.attributeId, event.target.checked)
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{attribute.name}</div>
                      <div className="text-xs text-gray-500">{attribute.code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{attribute.scope}</td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={assignment?.isRequired || false}
                        disabled={!enabled}
                        onChange={(event) =>
                          updateAssignment(attribute.attributeId, 'isRequired', event.target.checked)
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={assignment?.isVariantAxis || false}
                        disabled={!enabled}
                        onChange={(event) =>
                          updateAssignment(
                            attribute.attributeId,
                            'isVariantAxis',
                            event.target.checked
                          )
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={saveAssignments}
          className="px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
        >
          Lưu mapping danh mục
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Thuộc tính
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kiểu dữ liệu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Scope
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Số lựa chọn
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {attributes.map((attribute) => (
                <tr key={attribute.attributeId} className="border-b">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{attribute.name}</div>
                    <div className="text-xs text-gray-500">{attribute.code}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{attribute.inputType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{attribute.scope}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {attribute.options?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleEdit(attribute)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(attribute.attributeId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Xóa
                    </button>
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
