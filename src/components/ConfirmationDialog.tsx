import React from 'react';

interface Props {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({ 
  title, 
  message, 
  confirmText = "Xác nhận", 
  cancelText = "Hủy", 
  onConfirm, 
  onCancel 
}: Props) {
  const isDestructive = 
    confirmText.toLowerCase().includes('xóa') || 
    confirmText.toLowerCase().includes('hủy') || 
    confirmText.toLowerCase().includes('từ chối');

  const confirmBtnClass = isDestructive
    ? "px-6 py-2 bg-rose-500 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-600 cursor-pointer transition-colors"
    : "px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700 cursor-pointer transition-colors";

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150 text-left">
        <h2 className="text-lg font-extrabold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end pt-4">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={confirmBtnClass}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
