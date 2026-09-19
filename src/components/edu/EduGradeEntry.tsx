import React from 'react';
import { ClipboardList, Sparkles } from 'lucide-react';
import { UserAccount } from '../../types';

interface EduGradeEntryProps {
  currentUser: UserAccount;
}

/**
 * Trang Nhập điểm. Hiện đặt chỗ chờ mô tả chi tiết chức năng từ người dùng,
 * giao diện bám theo giao diện chung của hệ thống.
 */
export default function EduGradeEntry({ currentUser }: EduGradeEntryProps) {
  return (
    <div className="animate-fadeIn">
      <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <ClipboardList className="h-8 w-8" />
        </div>
        <h2 className="mt-5 font-display text-xl font-black text-slate-900">Nhập điểm</h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
          Chức năng nhập điểm đang được chuẩn bị. Bạn hãy mô tả cách nhập điểm mong muốn, hệ thống sẽ dựng phần thao tác chi tiết ở bước tiếp theo.
        </p>
        <div className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-2xl border border-brand/15 bg-brand-light/50 px-4 py-3 text-left">
          <Sparkles className="h-4 w-4 shrink-0 text-brand" />
          <p className="text-[11px] font-semibold text-slate-600">Gợi ý: nhập điểm theo bảng danh sách sinh viên của từng lớp và cột điểm, hoặc nhập hàng loạt từ file Excel.</p>
        </div>
      </div>
    </div>
  );
}
