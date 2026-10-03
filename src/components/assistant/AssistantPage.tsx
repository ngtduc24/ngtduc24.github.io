import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowLeft, ChevronLeft, Home, BookOpen, HelpCircle } from 'lucide-react';
import { usePhoneMaybe } from '../phone/PhoneShell';
import './assistant.css';
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
  const phone = usePhoneMaybe();
  const [mode, setMode] = useState<'knowledge' | 'system'>('knowledge');
  useEffect(() => {
    if (!phone) return;
    document.documentElement.classList.add('ph-own-head');
    return () => document.documentElement.classList.remove('ph-own-head');
  }, [!!phone]); // eslint-disable-line react-hooks/exhaustive-deps

  // Điện thoại: phủ kín màn hình, đầu trang liền khối có 2 chế độ, phần hội thoại cuộn riêng, ô nhập nổi ở đáy.
  if (phone) return (
    <div className="as-page" data-no-pull>
      <div className="as-hd">
        <div className="as-nv">
          <button type="button" onClick={phone.back} aria-label="Quay lại"><ChevronLeft /></button>
          <b>Trợ lý</b>
          <button type="button" onClick={() => phone.open('dashboard')} aria-label="Về Trang chủ"><Home /></button>
        </div>
        <div className="as-who">
          <span className="as-bot"><Sparkles /><i /></span>
          <span><h2>{mode === 'knowledge' ? 'Trợ lý giáo dục' : 'Trợ lý hệ thống'}</h2><p>{mode === 'knowledge' ? 'Hỏi đáp dựa trên bài giảng, câu hỏi và bài tập được chia sẻ công khai' : 'Hướng dẫn cách dùng và chỉ đường tới các chức năng EduGo'}</p></span>
        </div>
        <div className="as-mode">
          <button type="button" className={mode === 'knowledge' ? 'on' : ''} onClick={() => setMode('knowledge')}><BookOpen />Học liệu</button>
          <button type="button" className={mode === 'system' ? 'on' : ''} onClick={() => setMode('system')}><HelpCircle />Hướng dẫn dùng EduGo</button>
        </div>
      </div>
      <div className="as-wrap">
        <AssistantChat key={mode} currentUser={currentUser} settings={settings} onSwitchTab={onSwitchTab} mode={mode} phone />
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <button onClick={onBack} title="Quay lại trang chủ" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-brand-light hover:text-brand">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-light text-brand"><Sparkles className="h-6 w-6" /></span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Trợ lý giáo dục</h1>
          <p className="text-sm font-medium text-slate-500">Hỏi đáp kiến thức bài học dựa trên bài giảng, câu hỏi và bài tập được chia sẻ công khai.</p>
        </div>
      </div>

      <div className="mx-auto flex h-[68vh] max-h-[680px] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <AssistantChat currentUser={currentUser} settings={settings} onSwitchTab={onSwitchTab} mode="knowledge" />
      </div>
    </div>
  );
}
