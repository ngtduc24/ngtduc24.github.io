import React from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { UserAccount, AppSettings } from '../../types';
import AssistantChat from './AssistantChat';

interface Props {
  currentUser: UserAccount;
  settings: AppSettings;
  onSwitchTab: (tab: string) => void;
  onBack: () => void;
}

// Trang Trợ lý ảo dạng chức năng riêng, hỏi đáp và hướng dẫn về hệ thống.
export default function AssistantPage({ currentUser, settings, onSwitchTab, onBack }: Props) {
  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <button onClick={onBack} title="Quay lại trang chủ" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-brand-light hover:text-brand">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-light text-brand"><Sparkles className="h-6 w-6" /></span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Trợ lý ảo</h1>
          <p className="text-sm font-medium text-slate-500">Hỏi đáp kiến thức bài học dựa trên bài giảng, câu hỏi và bài tập được chia sẻ công khai.</p>
        </div>
      </div>

      <div className="mx-auto flex h-[68vh] max-h-[680px] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <AssistantChat currentUser={currentUser} settings={settings} onSwitchTab={onSwitchTab} mode="knowledge" />
      </div>
    </div>
  );
}
