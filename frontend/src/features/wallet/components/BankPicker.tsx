import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import type { SupportedBank } from '@/services/wallet.service';

interface BankPickerProps {
  banks: SupportedBank[];
  value: string;
  onChange: (bankCode: string) => void;
  disabled?: boolean;
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export const BankPicker = ({ banks, value, onChange, disabled = false }: BankPickerProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.code === value) ?? null,
    [banks, value]
  );

  const filteredBanks = useMemo(() => {
    if (!query.trim()) return banks;

    const normalizedQuery = normalizeText(query);

    return banks.filter((bank) => {
      const haystack = [
        bank.code,
        bank.name,
        bank.shortName,
        ...(bank.keywords ?? []),
      ]
        .filter(Boolean)
        .map((item) => normalizeText(String(item)))
        .join(' ');

      return haystack.includes(normalizedQuery);
    });
  }, [banks, query]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(timer);
    }
    setQuery('');
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl border-2 border-gray-100 bg-white px-4 py-3 text-left text-sm font-bold text-gray-700 outline-none transition-all hover:border-orange-200 focus:border-orange-400 disabled:cursor-not-allowed disabled:bg-gray-50"
      >
        <div className="min-w-0">
          {selectedBank ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-gray-800">{selectedBank.shortName}</p>
              <p className="truncate text-xs font-bold text-gray-400">{selectedBank.name}</p>
            </div>
          ) : (
            <span className="text-sm font-bold text-gray-400">Chọn ngân hàng</span>
          )}
        </div>
        <ChevronDown size={18} className={`ml-3 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl shadow-gray-200">
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <Search size={16} className="text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm ngân hàng theo tên, viết tắt hoặc mã..."
                className="w-full bg-transparent text-sm font-bold text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filteredBanks.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-black text-gray-500">Không tìm thấy ngân hàng phù hợp</p>
                <p className="mt-1 text-xs font-bold text-gray-400">Hãy thử tìm theo mã như `VCB`, `ACB`, `BIDV`...</p>
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const selected = bank.code === value;

                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => {
                      onChange(bank.code);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                      selected ? 'bg-orange-50 text-orange-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-black">{bank.shortName}</p>
                      <p className="mt-0.5 text-xs font-bold text-gray-400">{bank.name}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {bank.code}
                      </span>
                      {selected && <Check size={16} className="text-orange-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
