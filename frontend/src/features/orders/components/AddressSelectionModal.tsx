import React, { useState } from 'react';
import { type Address } from "@/services/address.service";

interface Props {
  open: boolean;
  addresses: Address[];
  currentFormAddress: string; 
  onClose: () => void;
  onSelect: (address: Address) => void;
  onAddNew: () => void;
}

export const AddressSelectionModal: React.FC<Props> = ({ open, addresses, currentFormAddress, onClose, onSelect, onAddNew }) => {
  const [tempSelectedId, setTempSelectedId] = useState<number | null>(null);

  if (!open) return null;

  const handleConfirm = () => {
    const selected = addresses.find(a => a.addressId === tempSelectedId);
    if (selected) onSelect(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-black uppercase tracking-widest text-gray-800">Địa Chỉ Của Tôi</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {addresses.length === 0 && (
             <p className="text-center text-gray-500 py-4">Bạn chưa có địa chỉ nào được lưu.</p>
          )}
          {addresses.map((addr) => {
            const isCurrent = currentFormAddress === addr.addressLine;
            const isChecked = tempSelectedId ? tempSelectedId === addr.addressId : isCurrent;

            return (
              <div key={addr.addressId} className="flex items-start gap-4 p-4 border rounded-2xl cursor-pointer hover:bg-gray-50" onClick={() => setTempSelectedId(addr.addressId)}>
                <input 
                  type="radio" 
                  name="address_selection" 
                  checked={isChecked}
                  onChange={() => setTempSelectedId(addr.addressId)}
                  className="mt-1.5 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" 
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-gray-800 border-r border-gray-300 pr-3">{addr.fullName}</span>
                    <span className="text-gray-500 text-sm">{addr.phone}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{addr.addressLine}</p>
                  <p className="text-sm text-gray-600">{`${addr.ward}, ${addr.district ? addr.district + ', ' : ''}${addr.city}`}</p>
                  {addr.isDefault && (
                    <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-500 rounded-sm">
                      Mặc định
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-3xl">
          <button onClick={onAddNew} className="flex items-center gap-2 text-blue-600 border border-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50">
            <span className="text-lg">+</span> Thêm Địa Chỉ Mới
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200">Hủy</button>
            <button onClick={handleConfirm} className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700">Xác nhận</button>
          </div>
        </div>
      </div>
    </div>
  );
};