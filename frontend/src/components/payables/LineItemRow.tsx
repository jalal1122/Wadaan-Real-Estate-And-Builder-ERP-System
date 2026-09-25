import React from 'react';
import { formatPKR } from '@/lib/formatters';
import { Trash2 } from 'lucide-react';

export interface LineItemState {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface LineItemRowProps {
  item: LineItemState;
  index: number;
  isOnlyItem: boolean;
  onChange: (id: string, field: keyof LineItemState, value: any) => void;
  onDelete: (id: string) => void;
}

export const LineItemRow: React.FC<LineItemRowProps> = ({
  item,
  index,
  isOnlyItem,
  onChange,
  onDelete,
}) => {
  return (
    <div
      data-testid={`line-item-row-${index}`}
      className="grid grid-cols-12 gap-2 items-center py-2 border-b border-slate-100 last:border-b-0 text-xs"
    >
      {/* Description */}
      <div className="col-span-6">
        <input
          type="text"
          placeholder="Item or service description (e.g. Portland Cement Grade 53)"
          value={item.description}
          onChange={(e) => onChange(item.id, 'description', e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden"
        />
      </div>

      {/* Quantity */}
      <div className="col-span-2">
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Qty"
          value={item.quantity || ''}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            onChange(item.id, 'quantity', isNaN(val) ? 0 : val);
          }}
          className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden text-right"
        />
      </div>

      {/* Unit Price */}
      <div className="col-span-2">
        <input
          type="number"
          min="0"
          step="any"
          placeholder="Unit Price"
          value={item.unitPrice || ''}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onChange(item.id, 'unitPrice', isNaN(val) ? 0 : val);
          }}
          className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-200 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden text-right"
        />
      </div>

      {/* Line Total */}
      <div className="col-span-1 text-right font-mono font-medium text-slate-800 truncate pr-1">
        {formatPKR(item.lineTotal)}
      </div>

      {/* Delete Action */}
      <div className="col-span-1 flex justify-center">
        <button
          type="button"
          aria-label="Remove line item"
          disabled={isOnlyItem}
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
