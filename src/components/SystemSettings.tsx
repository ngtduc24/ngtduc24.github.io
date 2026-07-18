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
import { AppSettings } from "../types";
import { saveDefaultSettingsToSupabase } from "../lib/data";
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
  const [activeTab, setActiveTab] = useState<'general' | 'backup'>('general');

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
      ) : (
        <BackupManager />
      )}
    </div>
  );
}
