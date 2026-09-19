import React, { useState, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Quote, 
  Heading2, 
  Plus, 
  Trash2, 
  ExternalLink, 
  FileCheck2, 
  Sparkles,
  Info
} from 'lucide-react';
import { TaskCompletionReport, UserAccount } from '../types';

interface Props {
  title: string;
  itemType: 'task' | 'subtask';
  parentTaskName?: string;
  initialReport?: TaskCompletionReport;
  currentUser: UserAccount;
  onClose: () => void;
  onSubmit: (report: TaskCompletionReport) => Promise<void> | void;
}

export default function TaskCompletionModal({
  title,
  itemType,
  parentTaskName,
  initialReport,
  currentUser,
  onClose,
  onSubmit,
}: Props) {
  const [summary, setSummary] = useState(
    initialReport?.summary || 
    `### Kết quả hoàn thành công việc:\n- Đã hoàn tất các hạng mục theo đúng yêu cầu đề ra.\n- Đã kiểm tra và nghiệm thu kỹ lưỡng trước khi bàn giao.\n\n### Ghi chú bổ sung:\n`
  );
  const [deliverables, setDeliverables] = useState<string[]>(
    initialReport?.deliverables && initialReport.deliverables.length > 0
      ? initialReport.deliverables
      : ['']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Chèn định dạng vào vị trí con trỏ chuột
  const applyFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = '';
    if (selectedText.length > 0) {
      replacement = `${prefix}${selectedText}${suffix}`;
    } else {
      replacement = `${prefix}${suffix}`;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setSummary(newText);

    setTimeout(() => {
      textarea.focus();
      const cursorPosition = selectedText.length > 0 ? start + replacement.length : start + prefix.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  const handleAddDeliverable = () => {
    setDeliverables([...deliverables, '']);
  };

  const handleUpdateDeliverable = (index: number, val: string) => {
    const updated = [...deliverables];
    updated[index] = val;
    setDeliverables(updated);
  };

  const handleRemoveDeliverable = (index: number) => {
    const updated = deliverables.filter((_, i) => i !== index);
    setDeliverables(updated.length > 0 ? updated : ['']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      alert('Vui lòng nhập nội dung báo cáo kết quả hoàn thành công việc.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanDeliverables = deliverables
        .map(d => d.trim())
        .filter(d => d.length > 0);

      const report: TaskCompletionReport = {
        id: initialReport?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)),
        summary: summary.trim(),
        deliverables: cleanDeliverables,
        completedAt: initialReport?.completedAt || new Date().toISOString(),
        completedBy: currentUser.id,
        completedByName: currentUser.fullName || currentUser.username,
        completedByRole: currentUser.role,
      };

      await onSubmit(report);
      onClose();
    } catch (error) {
      console.error('Lỗi khi lưu báo cáo hoàn thành:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-brand via-brand to-brand-hover text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <FileCheck2 className="w-5 h-5 text-brand-light" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-brand-light">
                  {itemType === 'task' ? 'Task chính' : 'Việc nhỏ'}
                </span>
                <span className="text-xs text-emerald-100/90 font-medium">Báo cáo hoàn thành</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight line-clamp-1" title={title}>
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="Đóng (hoặc click ra ngoài)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 text-xs">
          {parentTaskName && itemType === 'subtask' && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center gap-2.5 text-slate-600">
              <Info className="w-4 h-4 text-brand shrink-0" />
              <div className="text-xs">
                Thuộc task: <strong className="text-slate-800">{parentTaskName}</strong>
              </div>
            </div>
          )}

          {/* User info & Timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-brand-light/60 border border-brand-light/70 rounded-2xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand text-white font-bold flex items-center justify-center text-xs uppercase shadow-xs">
                {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
              </div>
              <div>
                <span className="text-[10px] text-brand-hover block font-semibold">Người báo cáo & nghiệm thu</span>
                <span className="text-xs font-bold text-slate-800">{currentUser.fullName} (@{currentUser.username})</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-brand-hover block font-semibold">Thời điểm ghi nhận</span>
              <span className="text-xs font-bold text-slate-700">{new Date().toLocaleString('vi-VN')}</span>
            </div>
          </div>

          {/* Professional Rich Content Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                Nội dung báo cáo công việc hoàn thành
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Hỗ trợ Markdown chuẩn</span>
            </div>

            {/* Toolbar */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all bg-white shadow-2xs">
              <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-600">
                <button
                  type="button"
                  onClick={() => applyFormatting('### ')}
                  className="p-1.5 hover:bg-white hover:text-brand-hover rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                  title="Tiêu đề (H3)"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                  <span>Tiêu đề</span>
                </button>
                <div className="h-4 w-px bg-slate-300 mx-0.5" />
                <button
                  type="button"
                  onClick={() => applyFormatting('**', '**')}
                  className="p-1.5 hover:bg-white hover:text-brand-hover rounded-lg transition-colors cursor-pointer"
                  title="In đậm (Bold)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('*', '*')}
                  className="p-1.5 hover:bg-white hover:text-brand-hover rounded-lg transition-colors cursor-pointer"
                  title="In nghiêng (Italic)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-px bg-slate-300 mx-0.5" />
                <button
                  type="button"
                  onClick={() => applyFormatting('- ')}
                  className="p-1.5 hover:bg-white hover:text-brand-hover rounded-lg transition-colors cursor-pointer"
                  title="Danh sách gạch đầu dòng"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('1. ')}
                  className="p-1.5 hover:bg-white hover:text-brand-hover rounded-lg transition-colors cursor-pointer"
                  title="Danh sách đánh số"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('> ')}
                  className="p-1.5 hover:bg-white hover:text-brand-hover rounded-lg transition-colors cursor-pointer"
                  title="Trích dẫn"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('[', '](https://...)')}
                  className="p-1.5 hover:bg-white hover:text-brand-hover rounded-lg transition-colors cursor-pointer"
                  title="Chèn liên kết"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Nhập chi tiết các hạng mục đã hoàn thành, kết quả đạt được, ghi chú bàn giao..."
                className="w-full p-3.5 text-xs text-slate-800 bg-white placeholder-slate-400 focus:outline-none min-h-[140px] resize-y font-mono leading-relaxed"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400">
              * Nội dung này sẽ được lưu trữ và chỉ <strong>Người giao task</strong>, <strong>Người nhận task</strong> và <strong>Admin</strong> có quyền xem.
            </p>
          </div>

          {/* Deliverables / Link bàn giao nghiệm thu */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-brand" />
                Đường dẫn sản phẩm & tài liệu bàn giao (Deliverables)
              </label>
              <button
                type="button"
                onClick={handleAddDeliverable}
                className="text-[11px] font-bold text-brand-hover hover:text-brand-hover flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm liên kết
              </button>
            </div>

            <div className="space-y-2">
              {deliverables.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={item}
                      onChange={(e) => handleUpdateDeliverable(index, e.target.value)}
                      placeholder="https://drive.google.com/... hoặc https://figma.com/..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                  </div>
                  {deliverables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliverable(index)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Xóa link này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              Ví dụ: Link Google Drive tài liệu, File thiết kế Figma, GitHub pull request, hoặc Video nghiệm thu.
            </p>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold shadow-md shadow-brand/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận hoàn thành & Lưu báo cáo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
