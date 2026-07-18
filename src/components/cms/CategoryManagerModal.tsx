import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { PortfolioCategory, savePortfolioCategories } from '../../lib/portfolioData';
import { useConfirmation } from '../ConfirmationContext';

interface CategoryManagerModalProps {
  categories: PortfolioCategory[];
  setCategories: (categories: PortfolioCategory[]) => void;
  onClose: () => void;
  onSave?: (items: PortfolioCategory[]) => void;
  onCategoryUpdate?: (oldName: string, newName: string) => void;
  onCategoryDelete?: (name: string) => void;
}

export default function CategoryManagerModal({
  categories,
  setCategories,
  onClose,
  onSave,
  onCategoryUpdate,
  onCategoryDelete
}: CategoryManagerModalProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const { confirm } = useConfirmation();

  const handleSave = (updated: PortfolioCategory[]) => {
    setCategories(updated);
    if (onSave) {
      onSave(updated);
    } else {
      savePortfolioCategories(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-slate-800">Quản lý Danh mục</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
              <input
                defaultValue={cat.name}
                onBlur={(e) => {
                  const newName = e.target.value.trim();
                  if (!newName || newName === cat.name) return;
                  const updated = categories.map(c => c.id === cat.id ? { ...c, name: newName } : c);
                  handleSave(updated);
                  if (onCategoryUpdate) {
                    onCategoryUpdate(cat.name, newName);
                  }
                }}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none w-full border-b border-transparent focus:border-brand transition-colors"
              />
              <button
                type="button"
                onClick={async () => {
                  if (await confirm({ title: 'Xác nhận xóa', message: 'Bạn có chắc chắn muốn xóa chuyên mục này?', confirmText: 'Xóa' })) {
                    const updated = categories.filter(c => c.id !== cat.id);
                    handleSave(updated);
                    if (onCategoryDelete) {
                      onCategoryDelete(cat.name);
                    }
                  }
                }}
                className="ml-2 rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {categories.length === 0 && <div className="text-center text-xs text-slate-400 py-4">Chưa có danh mục nào.</div>}
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!newCategoryName.trim()) return;
          const newCat: PortfolioCategory = { id: `cat_${Date.now()}`, name: newCategoryName.trim() };
          const updated = [...categories, newCat];
          handleSave(updated);
          setNewCategoryName('');
        }} className="mt-5 flex gap-2 pt-5 border-t border-slate-100">
          <input
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="Tên danh mục mới..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button type="submit" className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover">Thêm</button>
        </form>
      </div>
    </div>
  );
}
