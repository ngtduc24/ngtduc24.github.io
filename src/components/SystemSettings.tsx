import { uploadImageToCloudinary } from '../lib/upload';
import React, { useState, useEffect } from "react";
import { 
  Palette, 
  AppWindow, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  Save, 
  Loader2, 
  Info, 
  FileText,
  RefreshCw,
  Globe,
  Settings,
  X,
  Database
} from "lucide-react";
import { EyeOff, Eye, RotateCcw, Wrench, Power, Boxes, ImagePlay, Sparkles, Plus, Trash2, BookMarked } from "lucide-react";
import { AppSettings, ModuleOverride, AssistantKnowledgeItem } from "../types";
import { saveDefaultSettingsToSupabase } from "../lib/data";
import { MODULE_REGISTRY } from "../lib/modules";
import { FONT_OPTIONS, DEFAULT_HEADING_FONT, DEFAULT_BODY_FONT } from "../lib/fonts";
import { Type } from "lucide-react";
import BackupManager from './BackupManager';
import MediaSourcePicker from './MediaSourcePicker';

interface SystemSettingsProps {
  settings: AppSettings;
  onRefreshSettings: () => void;
  isAdmin: boolean;
}

export default function SystemSettings({ settings, onRefreshSettings, isAdmin }: SystemSettingsProps) {
  const [formState, setFormState] = useState<AppSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'functions' | 'assistant' | 'maintenance' | 'backup'>('general');

  // Thư viện kiến thức của trợ lý.
  const knowledge: AssistantKnowledgeItem[] = formState.assistantKnowledge || [];
  const addKnowledge = () => setFormState(prev => ({ ...prev, assistantKnowledge: [...(prev.assistantKnowledge || []), { id: `k_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, title: '', keywords: '', content: '' }] }));
  const updateKnowledge = (id: string, patch: Partial<AssistantKnowledgeItem>) => setFormState(prev => ({ ...prev, assistantKnowledge: (prev.assistantKnowledge || []).map(k => k.id === id ? { ...k, ...patch } : k) }));
  const removeKnowledge = (id: string) => setFormState(prev => ({ ...prev, assistantKnowledge: (prev.assistantKnowledge || []).filter(k => k.id !== id) }));

  // Cập nhật tùy chỉnh của một chức năng (tên, mô tả, ảnh icon, ẩn hiện) trong bộ nhớ form.
  const updateOverride = (id: string, patch: Partial<ModuleOverride>) => {
    setFormState(prev => {
      const overrides = { ...(prev.moduleOverrides || {}) };
      overrides[id] = { ...(overrides[id] || {}), ...patch };
      return { ...prev, moduleOverrides: overrides };
    });
  };
  // Trả icon về ảnh mặc định của hệ thống bằng cách xóa ảnh tùy chỉnh của chức năng đó.
  const resetOverrideIcon = (id: string) => {
    setFormState(prev => {
      const overrides = { ...(prev.moduleOverrides || {}) };
      if (overrides[id]) { const { icon, ...rest } = overrides[id]; overrides[id] = rest; }
      return { ...prev, moduleOverrides: overrides };
    });
  };

  useEffect(() => {
    setFormState({ ...settings });
  }, [settings]);

  const colorThemes = [
    {
      id: "green-black",
      name: "Xanh lá & Đen (Mặc định)",
      primary: "#10b981", // emerald-500
      secondary: "#0f172a", // slate-900
      bgClass: "from-emerald-500 to-slate-900"
    },
    {
      id: "purple-indigo",
      name: "Tím & Chàm",
      primary: "#712cf9",
      secondary: "#4f46e5",
      bgClass: "from-purple-600 to-indigo-700"
    },
    {
      id: "blue-cyan",
      name: "Xanh dương & Cyan",
      primary: "#3b82f6",
      secondary: "#0891b2",
      bgClass: "from-blue-600 to-cyan-600"
    },
    {
      id: "red-orange",
      name: "Đỏ & Cam",
      primary: "#ef4444",
      secondary: "#ea580c",
      bgClass: "from-red-600 to-orange-500"
    },
    {
      id: "amber-yellow",
      name: "Vàng hổ phách & Vàng cát",
      primary: "#f59e0b",
      secondary: "#eab308",
      bgClass: "from-amber-500 to-yellow-500"
    }
  ];

  const [isUploading, setIsUploading] = useState(false);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "webAppIcon" | "defaultCoverImage" | "pageCoverImage") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const url = await uploadImageToCloudinary(reader.result as string);
        setFormState(prev => ({
          ...prev,
          [field]: url
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError("Chỉ quản trị viên mới có quyền cập nhật cấu hình hệ thống.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const dataToSave = { ...formState };
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key as keyof AppSettings] === undefined) {
          delete dataToSave[key as keyof AppSettings];
        }
      });
      await saveDefaultSettingsToSupabase(dataToSave as AppSettings);
      setSuccess(true);
      onRefreshSettings();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError("Không thể lưu cấu hình hệ thống: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveBar = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 text-left">
        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 px-4 py-2.5 rounded-xl flex items-center gap-2">
            <Info className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Đã lưu thành công! Đang tải lại cấu hình hệ thống...</span>
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={saving || !isAdmin}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-white shadow-md ${
          saving || !isAdmin ? "bg-slate-400 cursor-not-allowed" : "bg-brand hover:bg-brand-hover shadow-brand/20 hover:scale-102"
        }`}
      >
        {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Đang lưu...</span></>) : (<><Save className="w-4 h-4" /><span>Lưu tất cả thay đổi</span></>)}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="system-settings-panel">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2 font-display">
            <Settings className="w-5 h-5 text-brand" />
            <span>Cấu Hình & Thiết Lập Hệ Thống</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Thay đổi giao diện màu sắc, tiêu đề, logo thương hiệu, và cấu hình hoạt động của ứng dụng.
          </p>
        </div>
        <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/50 self-start md:self-auto">
          Quyền: <strong className="text-brand">Quản trị viên</strong>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-2 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'general'
              ? 'border-brand text-brand bg-brand/5 rounded-t-2xl font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Cấu hình chung & Giao diện</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('functions')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'functions'
              ? 'border-brand text-brand bg-brand/5 rounded-t-2xl font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Cài đặt chức năng</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assistant')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'assistant'
              ? 'border-brand text-brand bg-brand/5 rounded-t-2xl font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Trợ lý</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'maintenance'
              ? 'border-brand text-brand bg-brand/5 rounded-t-2xl font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Bảo trì & Tải trang</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'border-brand text-brand bg-brand/5 rounded-t-2xl font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Sao lưu & Phục hồi dữ liệu</span>
        </button>
      </div>

      {activeTab === 'general' ? (
        <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* 1. ĐỔI MÀU GIAO DIỆN (THEMES) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 text-left">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-4 h-4 text-brand" />
            <span>Đổi màu giao diện chủ đạo (5 màu lựa chọn)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Chọn tông màu thương hiệu cho toàn bộ ứng dụng. Giao diện mặc định là Xanh lá và Đen.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {colorThemes.map((theme) => {
              const isSelected = formState.themeColor === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => setFormState(prev => ({ ...prev, themeColor: theme.id, primaryColor: theme.primary, secondaryColor: theme.secondary }))}
                  className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center cursor-pointer ${
                    isSelected 
                      ? "border-brand bg-brand/5 shadow-xs" 
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {/* Color preview circle */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${theme.bgClass} shadow-inner flex items-center justify-center text-white`}>
                    {isSelected && <Check className="w-5 h-5 drop-shadow-sm" />}
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">{theme.name}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Màu chủ đạo (Primary)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formState.primaryColor || "#712cf9"}
                  onChange={(e) => setFormState(prev => ({ ...prev, primaryColor: e.target.value, themeColor: "custom" }))}
                  className="w-10 h-10 rounded-xl cursor-pointer"
                />
                <input
                  type="text"
                  value={formState.primaryColor || "#712cf9"}
                  onChange={(e) => setFormState(prev => ({ ...prev, primaryColor: e.target.value, themeColor: "custom" }))}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Màu phụ (Secondary)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formState.secondaryColor || "#5b21d3"}
                  onChange={(e) => setFormState(prev => ({ ...prev, secondaryColor: e.target.value, themeColor: "custom" }))}
                  className="w-10 h-10 rounded-xl cursor-pointer"
                />
                <input
                  type="text"
                  value={formState.secondaryColor || "#5b21d3"}
                  onChange={(e) => setFormState(prev => ({ ...prev, secondaryColor: e.target.value, themeColor: "custom" }))}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. CẤU HÌNH THƯƠNG HIỆU */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          
          {/* Left Column: Brand text options */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <AppWindow className="w-4 h-4 text-brand" />
              <span>Cấu hình thông tin ứng dụng</span>
            </h2>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Tiêu đề Web App *</label>
              <input
                type="text"
                required
                value={formState.webAppTitle || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, webAppTitle: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                placeholder="Ví dụ: Smart Research VN"
              />
              <p className="text-[9px] text-slate-400">Tên hiển thị tại Sidebar, Header, và tiêu đề tab trình duyệt.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Khẩu hiệu / Mô tả ngắn</label>
              <input
                type="text"
                value={formState.systemDescription || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, systemDescription: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                placeholder="Hệ thống hỗ trợ tính toán phương pháp nghiên cứu định lượng"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Tiêu đề Banner Trang Tra cứu</label>
              <input
                type="text"
                value={formState.bannerTitle || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, bannerTitle: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                placeholder="Tra Cứu Tạp Chí Khoa Học"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Mô tả Banner Trang Tra cứu</label>
              <textarea
                rows={2}
                value={formState.bannerDescription || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, bannerDescription: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                placeholder="Tìm kiếm tạp chí theo tên, ISSN, điểm số, ngành/lĩnh vực..."
              />
            </div>

          </div>

          {/* Right Column: Icon & Cover files */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand" />
              <span>Thay thế hình ảnh hiển thị</span>
            </h2>

            {/* Icon webapp upload */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">Logo/Icon Web App</label>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-lg overflow-hidden shrink-0">
                  {formState.webAppIcon ? (
                    <img src={formState.webAppIcon} alt="Favicon" className="w-full h-full object-cover" />
                  ) : (
                    <AppWindow className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <MediaSourcePicker onSelect={url => setFormState(prev => ({ ...prev, webAppIcon: url }))} accept="image/*" resourceType="image" folder="system/icons" category="Ảnh cấu hình hệ thống" label="Chọn logo/icon" />
                  <p className="text-[9px] text-slate-400 mt-1">Chọn file ảnh vuông (PNG, JPG) làm favicon/logo ứng dụng.</p>
                </div>
              </div>
            </div>

            {/* Cover default image upload */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">Ảnh bìa tạp chí mặc định</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-12 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                  <img src={formState.defaultCoverImage} alt="Cover" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <MediaSourcePicker onSelect={url => setFormState(prev => ({ ...prev, defaultCoverImage: url }))} accept="image/*" resourceType="image" folder="system/journal-covers" category="Ảnh cấu hình hệ thống" label="Chọn ảnh mặc định" />
                  <p className="text-[9px] text-slate-400 mt-1">Kích thước khuyên dùng: 1200x800px, tối đa 800KB.</p>
                </div>
              </div>
            </div>

            {/* Page Cover Image upload */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Ảnh Bìa Trang Tra cứu</label>
                {formState.pageCoverImage && (
                  <button 
                    type="button" 
                    onClick={() => setFormState(prev => ({ ...prev, pageCoverImage: null }))}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3"/> Xóa ảnh
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-12 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center text-slate-400">
                  {formState.pageCoverImage ? (
                    <img src={formState.pageCoverImage} alt="Page Cover" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <MediaSourcePicker onSelect={url => setFormState(prev => ({ ...prev, pageCoverImage: url }))} accept="image/*" resourceType="image" folder="system/public-search" category="Ảnh cấu hình hệ thống" label="Chọn ảnh trang tra cứu" />
                  <p className="text-[9px] text-slate-400 mt-1">Ảnh nền hiển thị trên trang tra cứu tạp chí công khai.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="rounded-3xl bg-white p-6 text-left shadow-xs ring-1 ring-slate-100">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800"><Settings className="h-4 w-4 text-brand" /> Giao diện Sidebar</h2>
              <p className="mt-1 text-xs text-slate-400">Điều chỉnh độ trong suốt của nền sidebar. Mức thấp giúp nhìn thấy nhẹ nội dung phía sau.</p>
            </div>
            <div className="w-full md:w-[420px]">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500"><span>Độ trong suốt nền</span><span className="rounded-lg bg-brand-light px-2 py-1 text-brand">{Math.round((formState.sidebarOpacity ?? 0.92) * 100)}%</span></div>
              <input type="range" min="55" max="100" step="1" value={Math.round((formState.sidebarOpacity ?? 0.92) * 100)} onChange={event => {
                const value = Number(event.target.value) / 100;
                localStorage.setItem('sidebar_opacity', String(value));
                setFormState(prev => ({ ...prev, sidebarOpacity: value }));
              }} className="w-full accent-emerald-500" aria-label="Độ trong suốt sidebar" />
              <div className="mt-1 flex justify-between text-[9px] font-semibold text-slate-400"><span>Trong suốt hơn</span><span>Đậm hơn</span></div>
            </div>
          </div>
        </div>

        {/* PHÔNG CHỮ HỆ THỐNG */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 text-left">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Type className="w-4 h-4 text-brand" />
            <span>Phông chữ hệ thống</span>
          </h2>
          <p className="text-xs text-slate-400">Chọn phông chữ cho tiêu đề và cho nội dung, mô tả. Các phông đều hỗ trợ tiếng Việt.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Phông tiêu đề</label>
              <select
                value={formState.fontHeading || DEFAULT_HEADING_FONT}
                onChange={e => setFormState(prev => ({ ...prev, fontHeading: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              >
                {FONT_OPTIONS.map(f => <option key={f.family} value={f.family}>{f.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Phông nội dung, mô tả</label>
              <select
                value={formState.fontBody || DEFAULT_BODY_FONT}
                onChange={e => setFormState(prev => ({ ...prev, fontBody: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              >
                {FONT_OPTIONS.map(f => <option key={f.family} value={f.family}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Xem trước phông đang chọn. Nạp sẵn liên kết tải để chữ mẫu hiển thị đúng phông. */}
          <link rel="stylesheet" href={(FONT_OPTIONS.find(f => f.family === (formState.fontHeading || DEFAULT_HEADING_FONT)) || FONT_OPTIONS[0]).url} />
          <link rel="stylesheet" href={(FONT_OPTIONS.find(f => f.family === (formState.fontBody || DEFAULT_BODY_FONT)) || FONT_OPTIONS[0]).url} />
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Xem trước</p>
            <p className="text-xl font-black text-slate-800" style={{ fontFamily: `"${formState.fontHeading || DEFAULT_HEADING_FONT}", sans-serif` }}>
              Tiêu đề trang mẫu tiếng Việt
            </p>
            <p className="text-sm text-slate-600 mt-1" style={{ fontFamily: `"${formState.fontBody || DEFAULT_BODY_FONT}", sans-serif` }}>
              Đây là đoạn văn bản mô tả mẫu để xem trước phông chữ nội dung. Chúc bạn một ngày làm việc hiệu quả.
            </p>
          </div>
        </div>

        {/* 3. CẤU HÌNH BANNER THÔNG BÁO */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 text-left">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <AppWindow className="w-4 h-4 text-brand" />
            <span>Cấu hình Banner Thông Báo Hệ Thống</span>
          </h2>
          <p className="text-xs text-slate-400">
            Tinh chỉnh tiêu đề, mô tả, và nhãn hiển thị của banner thông báo xuất hiện ở đầu trang chủ/dashboard của người dùng.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Nhãn phụ Banner (Badge) *</label>
              <input
                type="text"
                required
                value={formState.notificationBannerText || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, notificationBannerText: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                placeholder="Ví dụ: THÔNG BÁO QUAN TRỌNG"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Tiêu đề Banner *</label>
              <input
                type="text"
                required
                value={formState.notificationBannerTitle || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, notificationBannerTitle: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                placeholder="Nhập tiêu đề hiển thị trên banner..."
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Mô tả chi tiết Banner *</label>
              <textarea
                rows={2}
                required
                value={formState.notificationBannerDescription || ""}
                onChange={(e) => setFormState(prev => ({ ...prev, notificationBannerDescription: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                placeholder="Nhập nội dung mô tả ngắn hiển thị dưới tiêu đề banner..."
              />
            </div>
          </div>
        </div>

        {/* 4. SUBMIT & NOTIFICATIONS */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-left">
            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 px-4 py-2.5 rounded-xl flex items-center gap-2">
                <Info className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Đã lưu thành công! Đang tải lại cấu hình hệ thống...</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || !isAdmin}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-white shadow-md ${
              saving || !isAdmin
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-brand hover:bg-brand-hover shadow-brand/20 hover:scale-102"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu tất cả thay đổi</span>
              </>
            )}
          </button>
        </div>
      </form>
      ) : activeTab === 'functions' ? (
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-2 text-left">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-brand" />
              <span>Cài đặt chức năng hệ thống</span>
            </h2>
            <p className="text-xs text-slate-400">
              Đổi ảnh icon, tên và mô tả của từng chức năng. Gạt tắt để ẩn một chức năng, khi ẩn thì mọi tài khoản đều không thấy và không truy cập được kể cả khi mở bằng đường dẫn trực tiếp.
            </p>
          </div>

          <div className="space-y-3">
            {MODULE_REGISTRY.map(mod => {
              const ov = formState.moduleOverrides?.[mod.id] || {};
              const hidden = !!ov.hidden;
              const DefaultIcon = mod.icon;
              return (
                <div key={mod.id} className={`bg-white rounded-2xl border p-4 flex flex-col md:flex-row md:items-center gap-4 transition-all ${hidden ? 'border-slate-200 opacity-70' : 'border-slate-100'}`}>
                  {/* Bên trái: ảnh icon hiện tại và nút chọn ảnh */}
                  <div className="flex items-center gap-3 md:w-64 shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand grid place-items-center overflow-hidden shrink-0 border border-brand/10">
                      {ov.icon ? <img src={ov.icon} alt="" className="w-full h-full object-cover" /> : <DefaultIcon className="w-7 h-7" />}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <MediaSourcePicker onSelect={url => updateOverride(mod.id, { icon: url })} accept="image/*" resourceType="image" folder="system/module-icons" category="Ảnh icon chức năng" label="Tải/chọn ảnh" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[10px] font-bold text-white hover:bg-brand-hover" />
                      {ov.icon && (
                        <button type="button" onClick={() => resetOverrideIcon(mod.id)} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-brand">
                          <RotateCcw className="w-3 h-3" /> Dùng ảnh mặc định
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bên phải: tên, mô tả và công tắc ẩn hiện */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={ov.label ?? ''}
                      onChange={e => updateOverride(mod.id, { label: e.target.value })}
                      placeholder={mod.label}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                    <textarea
                      rows={2}
                      value={ov.desc ?? ''}
                      onChange={e => updateOverride(mod.id, { desc: e.target.value })}
                      placeholder={mod.desc}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 md:flex-col md:items-end shrink-0">
                    <button
                      type="button"
                      onClick={() => updateOverride(mod.id, { hidden: !hidden })}
                      title={hidden ? 'Đang ẩn, bấm để hiện lại' : 'Đang hiện, bấm để ẩn'}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors ${hidden ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                    >
                      {hidden ? <><EyeOff className="w-3.5 h-3.5" /> Đang ẩn</> : <><Eye className="w-3.5 h-3.5" /> Đang hiện</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {saveBar}
        </form>
      ) : activeTab === 'assistant' ? (
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Nút nổi trợ lý ảo */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand" />
                  <span>Nút nổi trợ lý ảo</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Bật tắt nút trợ lý nổi ở góc phải màn hình cho toàn hệ thống. Người dùng thường không đổi được. Chức năng Trợ lý ảo trong danh sách vẫn dùng bình thường dù tắt nút nổi.</p>
              </div>
              <button
                type="button"
                onClick={() => setFormState(prev => ({ ...prev, assistantFloating: prev.assistantFloating === false ? true : false }))}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${formState.assistantFloating !== false ? 'bg-brand' : 'bg-slate-300'}`}
                aria-label="Bật tắt nút nổi trợ lý ảo"
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${formState.assistantFloating !== false ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Thư viện kiến thức cho trợ lý */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-brand" />
                  <span>Thư viện kiến thức</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Thêm các mục kiến thức để trợ lý trả lời thêm. Mỗi mục có tiêu đề, từ khóa gợi ý và nội dung. Khi người dùng hỏi trúng từ khóa hoặc tiêu đề, trợ lý sẽ đưa nội dung này vào câu trả lời.</p>
              </div>
              <button type="button" onClick={addKnowledge} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white hover:bg-brand-hover"><Plus className="w-4 h-4" /> Thêm mục</button>
            </div>

            {knowledge.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">Chưa có mục kiến thức nào. Bấm Thêm mục để bắt đầu.</p>
            ) : (
              <div className="space-y-3">
                {knowledge.map((k, i) => (
                  <div key={k.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Mục {i + 1}</span>
                      <button type="button" onClick={() => removeKnowledge(k.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-rose-500 hover:bg-rose-50" title="Xóa mục"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <input value={k.title} onChange={e => updateKnowledge(k.id, { title: e.target.value })} placeholder="Tiêu đề, ví dụ: Quy định nộp bài muộn" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-brand" />
                    <input value={k.keywords || ''} onChange={e => updateKnowledge(k.id, { keywords: e.target.value })} placeholder="Từ khóa gợi ý, cách nhau bởi dấu phẩy, ví dụ: nộp muộn, trễ hạn, quá hạn" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 outline-none focus:border-brand" />
                    <textarea value={k.content} onChange={e => updateKnowledge(k.id, { content: e.target.value })} rows={3} placeholder="Nội dung trả lời cho mục kiến thức này" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-brand resize-none" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {saveBar}
        </form>
      ) : activeTab === 'maintenance' ? (
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Ảnh GIF khi tải trang */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 text-left">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ImagePlay className="w-4 h-4 text-brand" />
              <span>Ảnh động khi tải trang</span>
            </h2>
            <p className="text-xs text-slate-400">Ảnh hiển thị khi trang đang tải lâu. Để trống thì dùng vòng xoay mặc định của hệ thống.</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 grid place-items-center overflow-hidden shrink-0">
                {formState.loadingGif ? <img src={formState.loadingGif} alt="Loading" className="w-full h-full object-contain" /> : <Loader2 className="w-6 h-6 text-brand animate-spin" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <MediaSourcePicker onSelect={url => setFormState(prev => ({ ...prev, loadingGif: url }))} accept="image/*" resourceType="image" folder="system/loading" category="Ảnh tải trang" label="Tải/chọn ảnh GIF" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[11px] font-bold text-white hover:bg-brand-hover" />
                {formState.loadingGif && (
                  <button type="button" onClick={() => setFormState(prev => ({ ...prev, loadingGif: '' }))} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-brand"><RotateCcw className="w-3 h-3" /> Dùng vòng xoay mặc định</button>
                )}
              </div>
            </div>
          </div>

          {/* Tạm tắt hệ thống */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Power className="w-4 h-4 text-brand" />
                  <span>Tạm tắt hệ thống</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Khi bật, người dùng và khách sẽ thấy trang thông báo. Quản trị viên đăng nhập vẫn dùng bình thường để tắt lại chế độ này.</p>
              </div>
              <button
                type="button"
                onClick={() => setFormState(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${formState.maintenanceMode ? 'bg-rose-500' : 'bg-slate-300'}`}
                aria-label="Bật tắt chế độ tạm tắt hệ thống"
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${formState.maintenanceMode ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {formState.maintenanceMode && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Chọn giao diện trang tạm tắt</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, maintenanceVariant: 1 }))}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${(formState.maintenanceVariant || 1) === 1 ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <p className="text-xs font-black text-slate-800">Giao diện 1</p>
                    <p className="text-[11px] text-slate-500 mt-1">Hệ thống tạm thời đóng</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, maintenanceVariant: 2 }))}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${formState.maintenanceVariant === 2 ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <p className="text-xs font-black text-slate-800">Giao diện 2</p>
                    <p className="text-[11px] text-slate-500 mt-1">Hệ thống đang nâng cấp, truy cập lại vào ngày…</p>
                  </button>
                </div>
                {formState.maintenanceVariant === 2 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Ngày dự kiến mở lại</label>
                    <input
                      type="date"
                      value={formState.maintenanceDate || ''}
                      onChange={e => setFormState(prev => ({ ...prev, maintenanceDate: e.target.value }))}
                      className="w-full sm:w-64 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {saveBar}
        </form>
      ) : (
        <BackupManager />
      )}
    </div>
  );
}
