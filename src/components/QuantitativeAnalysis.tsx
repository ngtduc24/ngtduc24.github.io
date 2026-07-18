import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, BarChart3, Database, Sparkles, Settings2, X, Lock, Plus, Trash2 } from 'lucide-react';

import DataManagement from './QuantitativeAnalysis/DataManagement';
import Preprocessing from './QuantitativeAnalysis/Preprocessing';
import Analysis from './QuantitativeAnalysis/Analysis';
import Results from './QuantitativeAnalysis/Results';
import { QuantitativeProvider } from './QuantitativeAnalysis/QuantitativeContext';
import SettingsView from './QuantitativeAnalysis/Settings';
import { AppSettings, UserAccount } from '../types';
import { saveDefaultSettingsToSupabase } from '../lib/data';
import { useNotifications } from './NotificationContext';
import { uploadImageToCloudinary } from '../lib/upload';
import MediaSourcePicker from './MediaSourcePicker';
interface Props {
  settings?: AppSettings;
  onRefreshSettings?: () => Promise<void>;
  users?: UserAccount[];
  currentUser?: UserAccount;
  onSaveUser?: (user: UserAccount) => Promise<void>;
  isUserAdmin?: boolean;
}

import { Sparkles as IconSparkles, BookOpen as IconBookOpen, FolderKanban as IconFolderKanban, BarChart3 as IconBarChart3, Star as IconStar, Rocket as IconRocket, ClipboardList as IconClipboardList, FileText as IconFileText, Users as IconUsers, Calendar as IconCalendar, Globe as IconGlobe, GraduationCap as IconGraduationCap } from 'lucide-react';

const BANNER_ICONS: Record<string, any> = {
  Sparkles: IconSparkles,
  BookOpen: IconBookOpen,
  FolderKanban: IconFolderKanban,
  BarChart3: IconBarChart3,
  Star: IconStar,
  Rocket: IconRocket,
  ClipboardList: IconClipboardList,
  FileText: IconFileText,
  Users: IconUsers,
  Calendar: IconCalendar,
  Globe: IconGlobe,
  GraduationCap: IconGraduationCap
};

export default function QuantitativeAnalysis({ users = [], currentUser, onSaveUser = async () => {}, isUserAdmin = false, settings, onRefreshSettings }: Props = {}) {
  const { addNotification } = useNotifications();
  
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (tabsScrollRef.current) {
        // Only prevent default if we actually have horizontal scroll available
        // to not block vertical scroll entirely if not needed, 
        // but simplest is just preventing it if we want to translate Y to X.
        const isScrollable = tabsScrollRef.current.scrollWidth > tabsScrollRef.current.clientWidth;
        if (isScrollable && e.deltaY !== 0) {
          e.preventDefault();
          tabsScrollRef.current.scrollLeft += e.deltaY;
        }
      }
    };
    
    const elem = tabsScrollRef.current;
    if (elem) {
      elem.addEventListener('wheel', handleWheel, { passive: false });
      return () => elem.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const [activeTab, setActiveTab] = useState('data-management');
  const [showBannerSettings, setShowBannerSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [bannerTitle, setBannerTitle] = useState(settings?.quantBannerTitle || '');
  const [bannerDesc, setBannerDesc] = useState(settings?.quantBannerDescription || '');
  const [bannerLabel, setBannerLabel] = useState(settings?.quantBannerLabel || '');
  const [bannerImg, setBannerImg] = useState(settings?.quantBannerImage || '');
  const [bannerIcon, setBannerIcon] = useState(settings?.quantBannerIcon || 'BarChart3');
  const ChipIcon = BANNER_ICONS[settings?.quantBannerIcon || ''] || BANNER_ICONS['BarChart3'];
  
  useEffect(() => {
    if (settings) {
      setBannerTitle(settings.quantBannerTitle || '');
      setBannerDesc(settings.quantBannerDescription || '');
      setBannerLabel(settings.quantBannerLabel || '');
      setBannerImg(settings.quantBannerImage || '');
      setBannerIcon(settings.quantBannerIcon || 'BarChart3');
    }
  }, [settings]);

  useEffect(() => {
    if (showBannerSettings && settings) {
      setBannerTitle(settings.quantBannerTitle || '');
      setBannerDesc(settings.quantBannerDescription || '');
      setBannerLabel(settings.quantBannerLabel || '');
      setBannerImg(settings.quantBannerImage || '');
    }
  }, [showBannerSettings, settings]);
  
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await saveDefaultSettingsToSupabase({
        ...settings,
        quantBannerTitle: bannerTitle,
        quantBannerDescription: bannerDesc,
        quantBannerLabel: bannerLabel,
        quantBannerImage: bannerImg,
        quantBannerIcon: bannerIcon,
      });
      if (onRefreshSettings) await onRefreshSettings();
      setShowBannerSettings(false);
      addNotification("Đã lưu cài đặt Banner!", "success");
    } catch(err) {
      addNotification("Lỗi lưu cấu hình: " + (err as Error).message, "error");
    }
  };
  
  const tabs = [
    { id: 'data-management', label: 'Quản lý Dữ liệu', icon: Database },
    { id: 'preprocessing', label: 'Tiền xử lý', icon: Settings },
    { id: 'analysis', label: 'Phân tích Thống kê', icon: Play },
    { id: 'results', label: 'Kết quả & Báo cáo', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt', icon: Settings2 },
  ];

  return (
    <QuantitativeProvider>
      <div className="space-y-6 animate-fadeIn pb-12">
      {showBannerSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <button onClick={() => setShowBannerSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-6">Cài đặt Banner Module Định Lượng</h3>
            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Biểu tượng</label>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(BANNER_ICONS).map(([iconName, IconComp]) => (
                    <button key={iconName} type="button" onClick={() => setBannerIcon(iconName)} title={iconName} className={bannerIcon === iconName ? "p-2 rounded-lg border border-emerald-600 bg-emerald-50 text-emerald-700 flex items-center justify-center" : "p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"}>
                      <IconComp className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Tiêu đề</label>
                <input type="text" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Nhãn phụ (Badge)</label>
                <input type="text" value={bannerLabel} onChange={e => setBannerLabel(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Mô tả</label>
                <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase flex justify-between items-center">
                  <span>Ảnh bìa</span>
                  {bannerImg && (
                    <button type="button" onClick={() => setBannerImg('')} className="text-rose-500 hover:text-rose-600 text-[10px] flex items-center gap-1">
                      <X className="w-3 h-3" /> Xóa ảnh (Dùng màu nền)
                    </button>
                  )}
                </label>
                <MediaSourcePicker onSelect={setBannerImg} accept="image/*" resourceType="image" folder="module-banners/quantitative" label="Chọn ảnh bìa" disabled={isUploading} />
                {bannerImg && <img src={bannerImg} alt="Preview" className="h-16 rounded-xl object-cover mt-2" />}
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setShowBannerSettings(false)} className="px-4 py-2 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-100">Hủy</button>
                <button type="submit" disabled={isUploading} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-bold shadow-sm">{isUploading ? 'Đang tải...' : 'Lưu cài đặt'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
        {/* Banner */}
        <div className="bg-brand rounded-3xl p-8 text-white relative overflow-hidden shadow-lg animate-fadeIn" style={{ ...(settings?.quantBannerImage ? { backgroundImage: `url(${settings.quantBannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) }}>
        {settings?.quantBannerImage && <div className="absolute inset-0 bg-black/40" />}
          {isUserAdmin && (
            <button onClick={() => setShowBannerSettings(true)} className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer">
              <Settings className="w-5 h-5" />
            </button>
          )}
          <div className="absolute top-14 right-4 z-20">
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors shrink-0 relative z-10"
          >
            <Settings2 className="w-4 h-4" />
            Cài đặt & Phân quyền
          </button>
          </div>
          {/* Banner Settings Removed */}

          <div className="flex flex-col items-start gap-4">
            {/* Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs relative z-10">
              <ChipIcon className="w-3.5 h-3.5 text-brand-light" />
              <span>{settings?.quantBannerLabel || "QUANTITATIVE ANALYSIS SUITE"}</span>
            </div>

            {/* Title & Description */}
            <div className="space-y-1 relative z-10">
              <h1 className="text-3xl font-extrabold tracking-tight">{settings?.quantBannerTitle || "Phân tích số liệu định lượng"}</h1>
              <p className="text-xs text-white/90 opacity-90 max-w-lg">{settings?.quantBannerDescription || "Hệ thống phân tích số liệu chuyên sâu mô phỏng SPSS. Hỗ trợ Data View, Variable View, Transform, Mô hình hóa và Báo cáo."}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div ref={tabsScrollRef} className="flex overflow-x-auto scrollbar-none gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id 
                  ? "bg-white text-brand shadow-xs border border-slate-200/60" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[400px]">
          {activeTab === 'data-management' && <DataManagement />}
          {activeTab === 'preprocessing' && <Preprocessing />}
          {activeTab === 'analysis' && <Analysis onAnalysisComplete={() => setActiveTab('results')} />}
          {activeTab === 'results' && <Results />}
          {activeTab === 'settings' && <SettingsView users={users} currentUser={currentUser!} onSaveUser={onSaveUser} isUserAdmin={isUserAdmin} settings={settings} onRefreshSettings={onRefreshSettings} />}
        </div>
      </div>

    </QuantitativeProvider>
  );
}
