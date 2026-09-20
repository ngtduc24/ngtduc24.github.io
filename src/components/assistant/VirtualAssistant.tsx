import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { UserAccount, AppSettings } from '../../types';
import AssistantChat from './AssistantChat';

interface Props {
  currentUser: UserAccount;
  settings: AppSettings;
  onSwitchTab: (tab: string) => void;
}

// Nút nổi góc phải mở khung chat trợ lý. Admin có thể tắt nút này trong Cấu hình hệ thống.
export default function VirtualAssistant({ currentUser, settings, onSwitchTab }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Trợ lý ảo"
          className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 transition-transform hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[95] flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 bg-brand px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20"><Sparkles className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-bold leading-tight">Trợ lý ảo</p>
                <p className="text-[10px] text-white/80 leading-tight">Tìm bài giảng, câu hỏi và hướng dẫn</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15"><X className="h-5 w-5" /></button>
          </div>
          <AssistantChat currentUser={currentUser} settings={settings} onSwitchTab={onSwitchTab} onAfterNavigate={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
