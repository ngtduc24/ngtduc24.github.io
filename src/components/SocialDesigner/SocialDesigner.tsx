import React, { useState } from 'react';
import { UserAccount } from '../../types';
import { LayoutTemplate, Settings, PenTool, Lock } from 'lucide-react';
import SettingsMode from './SettingsMode';
import DesignMode from './DesignMode';

interface SocialDesignerProps {
  currentUser: UserAccount;
}

export default function SocialDesigner({ currentUser }: SocialDesignerProps) {
  const [activeTab, setActiveTab] = useState<'design' | 'settings'>('design');
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden min-h-[700px] flex flex-col">
      {/* Header / Tab Navigation */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <LayoutTemplate className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Thiết kế Ảnh Social</h2>
            <p className="text-[10px] text-slate-500">Tạo ảnh đăng tin tức đa nền tảng</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('design')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'design' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Chế độ Thiết kế
          </button>
          <button
            onClick={() => {
              if (isAdmin) setActiveTab('settings');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'settings' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : isAdmin ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 cursor-not-allowed opacity-60'
            }`}
            title={!isAdmin ? "Chỉ quản trị viên mới có thể cài đặt kho khung" : ""}
          >
            {isAdmin ? <Settings className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            Chế độ Cài đặt
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'settings' && isAdmin ? (
          <SettingsMode currentUser={currentUser} />
        ) : (
          <DesignMode currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}
