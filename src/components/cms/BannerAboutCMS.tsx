import React, { useState, useEffect } from 'react';
import { 
  Laptop, Tablet, Smartphone, Eye, AlertCircle, Plus, Trash2,
  ArrowUp, ArrowDown, Edit3, Image, Settings, Sparkles, User, GraduationCap, 
  Briefcase, Boxes, Save, Film, Palette, Code, Award, BookOpen, Tv, Cpu, Camera, PenTool, Activity
} from 'lucide-react';
import { 
  PortfolioBanner, PortfolioAbout, PortfolioEducation, 
  PortfolioExperience, PortfolioSkill 
} from '../portfolioTypes';

const ICON_COMPONENTS: Record<string, React.ComponentType<any>> = {
  Palette,
  Film,
  Code,
  GraduationCap,
  Sparkles,
  Award,
  BookOpen,
  Briefcase,
  Tv,
  Cpu,
  Camera,
  PenTool,
  Activity
};

const AVAILABLE_ICONS = [
  { id: 'Palette', label: 'Mỹ thuật' },
  { id: 'Film', label: 'Chuyển động' },
  { id: 'Code', label: 'Công nghệ' },
  { id: 'GraduationCap', label: 'Học vấn' },
  { id: 'Sparkles', label: 'Sáng tạo' },
  { id: 'Award', label: 'Giải thưởng' },
  { id: 'BookOpen', label: 'Sách mở' },
  { id: 'Briefcase', label: 'Công việc' },
  { id: 'Tv', label: 'Màn hình' },
  { id: 'Cpu', label: 'Vi xử lý' },
  { id: 'Camera', label: 'Máy ảnh' },
  { id: 'PenTool', label: 'Thiết kế' },
  { id: 'Activity', label: 'Sức khỏe' }
];
import { 
  getPortfolioBanner, savePortfolioBanner, 
  getPortfolioAbout, savePortfolioAbout,
  getPortfolioEducation, savePortfolioEducation, deletePortfolioEducationDoc,
  getPortfolioExperience, savePortfolioExperience, deletePortfolioExperienceDoc,
  getPortfolioSkills, savePortfolioSkills, deletePortfolioSkillDoc
} from '../../lib/portfolioData';
import CloudinaryUploadField from './CloudinaryUploadField';
import { useConfirmation } from '../ConfirmationContext';
import { useNotifications } from '../NotificationContext';

export default function BannerAboutCMS() {
  const [activeSubTab, setActiveSubTab] = useState<'banner' | 'about' | 'education' | 'experience' | 'skills'>('banner');
  const [loading, setLoading] = useState(true);
  const { confirm } = useConfirmation();
  const { addNotification } = useNotifications();

  // States
  const [banner, setBanner] = useState<PortfolioBanner | null>(null);
  const [bannerPreviewDevice, setBannerPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const [about, setAbout] = useState<PortfolioAbout | null>(null);
  const [newSpecialty, setNewSpecialty] = useState('');

  const [education, setEducation] = useState<PortfolioEducation[]>([]);
  const [editingEdu, setEditingEdu] = useState<PortfolioEducation | null>(null);

  const [experience, setExperience] = useState<PortfolioExperience[]>([]);
  const [editingExp, setEditingExp] = useState<PortfolioExperience | null>(null);

  const [skills, setSkills] = useState<PortfolioSkill[]>([]);
  const [editingSkill, setEditingSkill] = useState<PortfolioSkill | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [b, a, edu, exp, s] = await Promise.all([
          getPortfolioBanner(),
          getPortfolioAbout(),
          getPortfolioEducation(),
          getPortfolioExperience(),
          getPortfolioSkills()
        ]);
        setBanner(b);
        setAbout(a);
        setEducation(edu);
        setExperience(exp);
        setSkills(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const triggerSuccess = (msg: string) => addNotification(msg, 'success');

  // 1. Save Banner
  const handleSaveBanner = async () => {
    if (!banner) return;
    await savePortfolioBanner(banner);
    triggerSuccess('Cập nhật cấu hình Banner trang chủ thành công!');
  };

  // 2. Save About Me
  const handleSaveAbout = async () => {
    if (!about) return;
    await savePortfolioAbout(about);
    triggerSuccess('Cập nhật thông tin giới thiệu cá nhân thành công!');
  };

  // 3. Education Actions
  const handleSaveEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEdu) return;

    let updatedList = [...education];
    const idx = updatedList.findIndex(item => item.id === editingEdu.id);
    if (idx >= 0) {
      updatedList[idx] = editingEdu;
    } else {
      updatedList.push(editingEdu);
    }
    setEducation(updatedList);
    await savePortfolioEducation(updatedList);
    setEditingEdu(null);
    triggerSuccess('Lưu thông tin học vấn thành công!');
  };

  const handleDeleteEdu = async (id: string) => {
    if (!(await confirm({ title: 'Xác nhận xóa học vấn', message: 'Bạn có chắc chắn muốn xóa học vấn này?', confirmText: 'Xóa' }))) return;
    const updated = education.filter(item => item.id !== id);
    setEducation(updated);
    await savePortfolioEducation(updated);
    await deletePortfolioEducationDoc(id);
    triggerSuccess('Xóa mốc học vấn thành công!');
  };

  const handleSortEdu = async (index: number, direction: 'up' | 'down') => {
    const updated = [...education];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // Recalculate sortOrder
    const final = updated.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
    setEducation(final);
    await savePortfolioEducation(final);
  };

  // 4. Experience Actions
  const handleSaveExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExp) return;

    let updatedList = [...experience];
    const idx = updatedList.findIndex(item => item.id === editingExp.id);
    if (idx >= 0) {
      updatedList[idx] = editingExp;
    } else {
      updatedList.push(editingExp);
    }
    setExperience(updatedList);
    await savePortfolioExperience(updatedList);
    setEditingExp(null);
    triggerSuccess('Lưu thông tin kinh nghiệm thành công!');
  };

  const handleDeleteExp = async (id: string) => {
    if (!(await confirm({ title: 'Xác nhận xóa kinh nghiệm', message: 'Bạn có chắc chắn muốn xóa kinh nghiệm làm việc này?', confirmText: 'Xóa' }))) return;
    const updated = experience.filter(item => item.id !== id);
    setExperience(updated);
    await savePortfolioExperience(updated);
    await deletePortfolioExperienceDoc(id);
    triggerSuccess('Xóa mốc kinh nghiệm thành công!');
  };

  const handleSortExp = async (index: number, direction: 'up' | 'down') => {
    const updated = [...experience];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    const final = updated.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
    setExperience(final);
    await savePortfolioExperience(final);
  };

  // 5. Skills Actions
  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;

    let updatedList = [...skills];
    const idx = updatedList.findIndex(item => item.id === editingSkill.id);
    if (idx >= 0) {
      updatedList[idx] = editingSkill;
    } else {
      updatedList.push(editingSkill);
    }
    setSkills(updatedList);
    await savePortfolioSkills(updatedList);
    setEditingSkill(null);
    triggerSuccess('Lưu kỹ năng chuyên môn thành công!');
  };

  const handleDeleteSkill = async (id: string) => {
    if (!(await confirm({ title: 'Xác nhận xóa kỹ năng', message: 'Bạn có chắc chắn muốn xóa kỹ năng này?', confirmText: 'Xóa' }))) return;
    const updated = skills.filter(item => item.id !== id);
    setSkills(updated);
    await savePortfolioSkills(updated);
    await deletePortfolioSkillDoc(id);
    triggerSuccess('Xóa kỹ năng chuyên môn thành công!');
  };

  const handleSortSkill = async (index: number, direction: 'up' | 'down') => {
    const updated = [...skills];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    const final = updated.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
    setSkills(final);
    await savePortfolioSkills(final);
  };

  if (loading) {
    return <div className="p-8 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest">Đang tải phân hệ quản trị Banner & Giới thiệu...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Internal Subtabs Row */}
      <div
        className="flex flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-200 pb-4 select-none"
        onWheel={(e) => {
          if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth && e.deltaY !== 0) {
            e.preventDefault();
            e.currentTarget.scrollLeft += e.deltaY * 1.2;
          }
        }}
      >
        {[
          { id: 'banner', label: 'Quản lý Banner', icon: Image },
          { id: 'about', label: 'Giới thiệu bản thân', icon: User },
          { id: 'education', label: 'Học vấn & Bằng cấp', icon: GraduationCap },
          { id: 'experience', label: 'Kinh nghiệm làm việc', icon: Briefcase },
          { id: 'skills', label: 'Kỹ năng & Chuyên môn', icon: Boxes },
        ].map(tab => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-brand text-white shadow-md shadow-brand/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN TAB SUB-VIEWS */}
      {activeSubTab === 'banner' && banner && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Form Settings */}
          <div className="xl:col-span-6 min-w-0 space-y-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
              <Settings className="w-5 h-5 text-brand" />
              <span>Cấu hình Banner trang chủ</span>
            </h3>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Trạng thái hiển thị</p>
                <p className="text-[10px] text-slate-500">Bật/tắt việc trình diễn Banner ngoài Trang chủ.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={banner.visible}
                  onChange={(e) => setBanner({ ...banner, visible: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
              </label>
            </div>

            {/* Component Visibility Toggles */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Trạng thái hiển thị các thành phần nội dung</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700">Tiêu đề chính</p>
                    <p className="text-[9px] text-slate-400">Hiện tiêu đề chính</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={banner.showTitle !== false}
                      onChange={(e) => setBanner({ ...banner, showTitle: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700">Nhãn trang trí</p>
                    <p className="text-[9px] text-slate-400">Hiện nhãn ở đầu</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={banner.showLabel !== false}
                      onChange={(e) => setBanner({ ...banner, showLabel: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700">Nút bấm chính</p>
                    <p className="text-[9px] text-slate-400">Hiện nút liên kết</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={banner.showButton !== false}
                      onChange={(e) => setBanner({ ...banner, showButton: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
                  </label>
                </div>
              </div>
            </div>

            {/* Logo Customization */}
            <div className="space-y-4 p-4 bg-slate-50 border border-slate-200/50 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2 pb-1.5 border-b border-slate-200/50">Cấu hình Logo & Tên góc trái phía trên</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Chữ hiển thị Logo</label>
                  <input
                    type="text"
                    placeholder="Mặc định là tên Artist nếu trống..."
                    value={banner.logoText || ''}
                    onChange={(e) => setBanner({ ...banner, logoText: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-hover transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Ảnh biểu tượng Logo (Icon)</label>
                  <CloudinaryUploadField
                    label="Logo"
                    value={banner.logoImage || ''}
                    onChange={url => setBanner({ ...banner, logoImage: url })}
                    accept="image/*"
                    resourceType="image"
                    folder="portfolio/logo"
                    compact={true}
                    hint="Khuyên dùng ảnh square, định dạng PNG có nền trong suốt."
                  />
                </div>
              </div>
            </div>

            {/* Media Type Selection */}
            <div className="space-y-4 p-4 bg-slate-50 border border-slate-200/50 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2 pb-1.5 border-b border-slate-200/50">Hình nền / Video nền Banner</span>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setBanner({ ...banner, mediaType: 'image' })}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    banner.mediaType !== 'video'
                      ? 'bg-brand text-white border-brand shadow-sm shadow-brand/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Image className="h-4 w-4" />
                  <span>Sử dụng Hình ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBanner({ ...banner, mediaType: 'video' })}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    banner.mediaType === 'video'
                      ? 'bg-brand text-white border-brand shadow-sm shadow-brand/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Film className="h-4 w-4" />
                  <span>Sử dụng Video</span>
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/40">
                {banner.mediaType === 'video' ? (
                  <div className="space-y-4">
                    <CloudinaryUploadField
                      label="Video nền (.mp4, .webm)"
                      value={banner.videoUrl || ''}
                      onChange={url => setBanner({ ...banner, videoUrl: url })}
                      accept="video/*"
                      resourceType="video"
                      folder="portfolio/banner"
                      hint="Video sẽ tự động phát chế độ lặp, tắt tiếng ngoài trang chủ."
                    />
                    
                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200/60 rounded-xl">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-700">Tự động phát lại (Loop)</p>
                        <p className="text-[9px] text-slate-400">Tự động lặp lại video khi kết thúc.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={banner.videoLoop !== false}
                          onChange={(e) => setBanner({ ...banner, videoLoop: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Ảnh nền Banner</label>
                    <CloudinaryUploadField
                      label="Ảnh nền Banner"
                      value={banner.backgroundImage}
                      onChange={url => setBanner({ ...banner, backgroundImage: url })}
                      accept="image/*"
                      resourceType="image"
                      folder="portfolio/banner"
                      hint="Khuyên dùng ảnh chất lượng cao độ phân giải từ Full HD trở lên."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Title & Desc */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Mô tả ảnh nền (Alt Text)</label>
                <input
                  type="text"
                  placeholder="Mô tả hỗ trợ SEO và người khiếm thị..."
                  value={banner.altText}
                  onChange={(e) => setBanner({ ...banner, altText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nội dung nhãn (Badge Label)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Multimedia Designer & Artist"
                  value={banner.labelText || ''}
                  onChange={(e) => setBanner({ ...banner, labelText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
                />
              </div>

              {banner.showTitle !== false && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tiêu đề chính (Thông điệp nổi bật)</label>
                  <textarea
                    rows={2}
                    value={banner.title}
                    onChange={(e) => setBanner({ ...banner, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors resize-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Mô tả giới thiệu ngắn</label>
                <textarea
                  rows={3}
                  value={banner.description}
                  onChange={(e) => setBanner({ ...banner, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors resize-none"
                />
              </div>
            </div>

            {/* Button Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nội dung nút bấm</label>
                <input
                  type="text"
                  disabled={banner.showButton === false}
                  value={banner.buttonText}
                  onChange={(e) => setBanner({ ...banner, buttonText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Liên kết nút bấm (Section ID/URL)</label>
                <input
                  type="text"
                  disabled={banner.showButton === false}
                  value={banner.buttonLink}
                  onChange={(e) => setBanner({ ...banner, buttonLink: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Styling Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Căn lề chữ</label>
                <select
                  value={banner.alignment}
                  onChange={(e) => setBanner({ ...banner, alignment: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
                >
                  <option value="left">Căn trái</option>
                  <option value="center">Căn giữa</option>
                  <option value="right">Căn phải</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bật/Tắt và màu màn phủ</label>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={banner.showOverlay !== false}
                      onChange={(e) => setBanner({ ...banner, showOverlay: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
                  </label>
                  <input
                    type="color"
                    disabled={banner.showOverlay === false}
                    value={banner.overlayColor}
                    onChange={(e) => setBanner({ ...banner, overlayColor: e.target.value })}
                    className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Độ mờ màn phủ ({banner.showOverlay === false ? 'Tắt' : `${(banner.overlayOpacity * 100).toFixed(0)}%`})</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  disabled={banner.showOverlay === false}
                  value={banner.overlayOpacity}
                  onChange={(e) => setBanner({ ...banner, overlayOpacity: parseFloat(e.target.value) })}
                  className="w-full mt-3 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Brightness & Animation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Mức sáng ảnh ({banner.brightness}%)</label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={banner.brightness}
                  onChange={(e) => setBanner({ ...banner, brightness: parseInt(e.target.value) })}
                  className="w-full mt-3 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <span className="text-xs font-bold text-slate-700">Chuyển động mượt mà</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={banner.animate}
                    onChange={(e) => setBanner({ ...banner, animate: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
                </label>
              </div>
            </div>

            <button
              onClick={handleSaveBanner}
              className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu cấu hình Banner</span>
            </button>
          </div>

          {/* Live Preview Display on desktop, tablet, phone */}
          <div className="xl:col-span-6 space-y-4">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-2xl">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-brand" />
                <span>Xem trước Banner trực quan</span>
              </span>
              
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'desktop', icon: Laptop },
                  { id: 'tablet', icon: Tablet },
                  { id: 'mobile', icon: Smartphone },
                ].map(dev => {
                  const DevIcon = dev.icon;
                  return (
                    <button
                      key={dev.id}
                      onClick={() => setBannerPreviewDevice(dev.id as any)}
                      className={`p-2 rounded-lg transition-colors ${
                        bannerPreviewDevice === dev.id ? 'bg-white text-brand shadow-sm' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <DevIcon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mô phỏng đúng bố cục trang Portfolio công khai */}
            <div className="bg-slate-100/70 p-3 rounded-3xl flex items-center justify-center min-h-[540px] transition-all overflow-hidden">
              <div
                className={`bg-white shadow-xl relative flex flex-col overflow-hidden transition-all duration-300 ${
                  bannerPreviewDevice === 'mobile'
                    ? 'w-[290px] h-[520px] rounded-[1.75rem]'
                    : bannerPreviewDevice === 'tablet'
                      ? 'w-[430px] h-[520px] rounded-[1.75rem]'
                      : 'w-full h-[520px] rounded-[1.75rem]'
                }`}
              >
                {/* Header của website */}
                <div className="h-12 shrink-0 px-3 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    {banner.logoImage ? (
                      <img src={banner.logoImage} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
                    ) : (
                      <span className="w-7 h-7 rounded-xl bg-brand text-white text-[10px] font-black flex items-center justify-center">
                        {(banner.logoText || (about?.artistName || 'A')).charAt(0)}
                      </span>
                    )}
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-black text-slate-800 leading-none truncate max-w-[80px]">
                        {banner.logoText || (about?.artistName || 'Artist')}
                      </div>
                      <div className="text-[6px] font-bold text-brand/70 uppercase tracking-wider leading-none">Portfolio</div>
                    </div>
                  </div>
                  {bannerPreviewDevice === 'mobile' ? (
                    <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><span className="w-3 h-0.5 bg-slate-500 shadow-[0_3px_0_#64748b,0_-3px_0_#64748b]" /></span>
                  ) : (
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4].map(item => <span key={item} className="h-1.5 w-8 rounded bg-slate-200" />)}
                      <span className="h-7 w-16 rounded-lg bg-brand" />
                    </div>
                  )}
                </div>

                {/* Hero banner */}
                <div className="relative flex-1 m-2 mt-0 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-950">
                  {banner.mediaType === 'video' && banner.videoUrl ? (
                    <video src={banner.videoUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" style={{ filter: `brightness(${banner.brightness}%)` }} />
                  ) : (
                    <img src={banner.backgroundImage} className="absolute inset-0 h-full w-full object-cover" style={{ filter: `brightness(${banner.brightness}%)` }} alt="" />
                  )}
                  {banner.showOverlay !== false && (
                    <div className="absolute inset-0" style={{ backgroundColor: banner.overlayColor, opacity: banner.overlayOpacity }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                  <div className={`relative z-10 w-full px-6 flex flex-col gap-3 ${
                    banner.alignment === 'left'
                      ? 'items-start text-left'
                      : 'items-center text-center'
                  }`}>
                    {banner.showLabel !== false && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[7px] font-bold uppercase tracking-wider text-white backdrop-blur">
                        {banner.labelText || 'Multimedia Designer & Artist'}
                      </span>
                    )}
                    {banner.showTitle !== false && (
                      <h1 className={`max-w-md text-white font-black tracking-tight leading-[1.02] ${
                        bannerPreviewDevice === 'mobile' ? 'text-[17px]' : 'text-xl'
                      }`}>
                        {banner.title || 'Tiêu đề trống'}
                      </h1>
                    )}
                    <p className={`max-w-sm text-slate-200 leading-relaxed ${bannerPreviewDevice === 'mobile' ? 'text-[8px]' : 'text-[10px]'}`}>
                      {banner.description || 'Chưa cấu hình mô tả ngắn.'}
                    </p>
                    {banner.showButton !== false && banner.buttonText && (
                      <button className="bg-brand text-white font-bold text-[8px] px-4 py-2 rounded-lg shadow-md">
                        {banner.buttonText}
                      </button>
                    )}
                  </div>

                  <div className={`absolute bottom-3 left-3 right-3 grid gap-px overflow-hidden rounded-xl bg-white/15 backdrop-blur-md ${bannerPreviewDevice === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'}`}>
                    {(banner.quickLinks && banner.quickLinks.length > 0 ? banner.quickLinks : [
                      { title: 'Art Direction' },
                      { title: 'Motion & 3D' },
                      { title: 'Creative Tech' },
                      { title: 'Education' }
                    ]).map((item, idx) => (
                      <span key={idx} className="bg-white/90 px-2 py-2 text-center text-[6px] font-bold text-slate-700 truncate">{item.title || 'Trống'}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links Customizer (Single Column full width under preview) */}
            <div className="space-y-4 p-4 bg-slate-50 border border-slate-200/50 rounded-2xl shadow-sm mt-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Sửa cụm 4 khối thông tin dưới Banner (Quick Links)</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([0, 1, 2, 3]).map((idx) => {
                  const links = banner.quickLinks || [
                    { icon: 'Palette', title: 'Art Direction', text: 'Định hướng hình ảnh nhất quán' },
                    { icon: 'Film', title: 'Motion & 3D', text: 'Chuyển động giàu cảm xúc' },
                    { icon: 'Code', title: 'Creative Tech', text: 'Trải nghiệm số tương tác' },
                    { icon: 'GraduationCap', title: 'Education', text: 'Chia sẻ tri thức thực hành' }
                  ];
                  const item = links[idx] || { icon: 'Palette', title: '', text: '' };
                  
                  const updateQuickLink = (field: 'icon' | 'title' | 'text', val: string) => {
                    const newLinks = [...links];
                    newLinks[idx] = { ...item, [field]: val };
                    setBanner({ ...banner, quickLinks: newLinks });
                  };

                  return (
                    <div key={idx} className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[10px] font-black text-slate-400">Khối thông tin #{idx + 1}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Tiêu đề khối</label>
                          <input
                            type="text"
                            placeholder="Tiêu đề khối..."
                            value={item.title}
                            onChange={(e) => updateQuickLink('title', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 text-[11px] focus:outline-none focus:border-brand-hover transition-colors font-semibold text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Mô tả chi tiết ngắn</label>
                          <input
                            type="text"
                            placeholder="Mô tả dưới tiêu đề..."
                            value={item.text}
                            onChange={(e) => updateQuickLink('text', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 text-[11px] focus:outline-none focus:border-brand-hover transition-colors text-slate-600"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Chọn biểu tượng hiển thị</label>
                        <div className="grid grid-cols-7 gap-1 bg-slate-50 border border-slate-200/50 p-2 rounded-xl">
                          {AVAILABLE_ICONS.map((iconOpt) => {
                            const IconComponent = ICON_COMPONENTS[iconOpt.id] || Sparkles;
                            const isSelected = item.icon === iconOpt.id;
                            return (
                              <button
                                key={iconOpt.id}
                                type="button"
                                onClick={() => updateQuickLink('icon', iconOpt.id)}
                                title={iconOpt.label}
                                className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all ${
                                  isSelected 
                                    ? 'border-brand bg-brand-light text-brand font-bold scale-105 shadow-xs' 
                                    : 'border-transparent bg-transparent text-slate-400 hover:bg-white hover:border-slate-200 hover:text-slate-700'
                                }`}
                              >
                                <IconComponent className="w-4 h-4" />
                                <span className="text-[8px] mt-0.5 truncate w-full px-0.5 scale-90">{iconOpt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* activeSubTab === 'about' */}
      {activeSubTab === 'about' && about && (
        <div className="space-y-6 max-w-4xl">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
            <User className="w-5 h-5 text-brand" />
            <span>Quản lý thông tin cá nhân & Giới thiệu</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Họ và tên thật</label>
                <input
                  type="text"
                  value={about.fullName}
                  onChange={(e) => setAbout({ ...about, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nghệ danh</label>
                <input
                  type="text"
                  value={about.artistName}
                  onChange={(e) => setAbout({ ...about, artistName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Chức danh nghề nghiệp</label>
                <input
                  type="text"
                  value={about.jobTitle}
                  onChange={(e) => setAbout({ ...about, jobTitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
                />
              </div>

              <CloudinaryUploadField label="Ảnh chân dung đại diện" value={about.avatarUrl} onChange={url => setAbout({ ...about, avatarUrl: url })} accept="image/*" resourceType="image" folder="portfolio/profile" />
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Triết lý sáng tạo</label>
                <textarea
                  rows={2}
                  value={about.creativePhilosophy}
                  onChange={(e) => setAbout({ ...about, creativePhilosophy: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tiểu sử ngắn (Bio)</label>
                <textarea
                  rows={3}
                  value={about.briefBio}
                  onChange={(e) => setAbout({ ...about, briefBio: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors resize-none"
                />
              </div>

              {/* Specialties commalist */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Chuyên môn (Thêm lĩnh vực)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ví dụ: Motion Graphics"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSpecialty) return;
                      setAbout({ ...about, specialties: [...about.specialties, newSpecialty] });
                      setNewSpecialty('');
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    Thêm
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {about.specialties.map((spec, i) => (
                    <span key={i} className="text-[10px] font-bold text-brand bg-brand-light border border-brand/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span>{spec}</span>
                      <button 
                        onClick={() => setAbout({ ...about, specialties: about.specialties.filter((_, idx) => idx !== i) })}
                        className="text-slate-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Địa chỉ nơi làm việc</label>
              <input
                type="text"
                value={about.location}
                onChange={(e) => setAbout({ ...about, location: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Email liên hệ công việc</label>
              <input
                type="email"
                value={about.email}
                onChange={(e) => setAbout({ ...about, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Điện thoại công việc</label>
              <input
                type="text"
                value={about.phone}
                onChange={(e) => setAbout({ ...about, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-6">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Liên kết mạng xã hội (Behance, Dribbble, LinkedIn, GitHub)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {about.socialLinks.map((soc, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-[10px] font-black text-slate-400 w-16 uppercase">{soc.platform}</span>
                  <input
                    type="text"
                    value={soc.url}
                    onChange={(e) => {
                      const list = [...about.socialLinks];
                      list[i].url = e.target.value;
                      setAbout({ ...about, socialLinks: list });
                    }}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <CloudinaryUploadField label="Hồ sơ năng lực CV" value={about.cvUrl} onChange={url => setAbout({ ...about, cvUrl: url })} accept=".pdf,.doc,.docx" resourceType="raw" folder="portfolio/documents" />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Hiển thị nút tải CV</p>
                  <p className="text-[10px] text-slate-500">Mở/khóa việc người dùng tải CV cá nhân của bạn.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={about.showCvButton}
                    onChange={(e) => setAbout({ ...about, showCvButton: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
                </label>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Hiển thị nhãn "Giới thiệu bản thân"</p>
                  <p className="text-[10px] text-slate-500">Bật/tắt nhãn nhỏ phía trên tiêu đề chính.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={about.showAboutLabel !== false}
                    onChange={(e) => setAbout({ ...about, showAboutLabel: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveAbout}
            className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu hồ sơ giới thiệu cá nhân</span>
          </button>
        </div>
      )}

      {/* activeSubTab === 'education' */}
      {activeSubTab === 'education' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Edit/Add Form (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            {editingEdu ? (
              <div className="bg-slate-50 p-6 rounded-2xl space-y-4 animate-slideUp border border-slate-200/50">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-brand" />
                  <span>Chi tiết Mốc học vấn</span>
                </h4>

                <form onSubmit={handleSaveEdu} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tên bằng cấp / Học vị</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Thạc sĩ Khoa học Máy tính"
                      value={editingEdu.degree}
                      onChange={(e) => setEditingEdu({ ...editingEdu, degree: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Chuyên ngành đào tạo</label>
                    <input
                      type="text"
                      required
                      value={editingEdu.major}
                      onChange={(e) => setEditingEdu({ ...editingEdu, major: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tên trường đào tạo</label>
                    <input
                      type="text"
                      required
                      value={editingEdu.school}
                      onChange={(e) => setEditingEdu({ ...editingEdu, school: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Năm bắt đầu</label>
                      <input
                        type="text"
                        required
                        value={editingEdu.startDate}
                        onChange={(e) => setEditingEdu({ ...editingEdu, startDate: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Năm kết thúc</label>
                      <input
                        type="text"
                        disabled={editingEdu.isOngoing}
                        value={editingEdu.endDate}
                        onChange={(e) => setEditingEdu({ ...editingEdu, endDate: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none disabled:opacity-45"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Đang theo học (Chưa hoàn thành)</span>
                    <input
                      type="checkbox"
                      checked={editingEdu.isOngoing}
                      onChange={(e) => setEditingEdu({ ...editingEdu, isOngoing: e.target.checked, endDate: e.target.checked ? '' : editingEdu.endDate })}
                      className="rounded text-brand focus:ring-brand/30 w-4 h-4"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Thành tích / Xếp loại</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Tốt nghiệp loại Giỏi, Thủ khoa..."
                      value={editingEdu.achievement}
                      onChange={(e) => setEditingEdu({ ...editingEdu, achievement: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mô tả tóm lược</label>
                    <textarea
                      rows={3}
                      value={editingEdu.description}
                      onChange={(e) => setEditingEdu({ ...editingEdu, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none resize-none"
                    />
                  </div>

                  <CloudinaryUploadField label="Văn bằng / Chứng nhận" value={editingEdu.certificateUrl} onChange={url => setEditingEdu({ ...editingEdu, certificateUrl: url })} accept="image/*,application/pdf" resourceType="auto" folder="portfolio/education" />

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingEdu(null)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand hover:bg-brand-hover text-white py-2.5 rounded-xl text-xs font-bold uppercase transition-colors"
                    >
                      Lưu học vị
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center min-h-[320px]">
                <GraduationCap className="w-8 h-8 text-slate-400 mb-3" />
                <p className="text-xs font-bold text-slate-700">Chưa chọn mốc học vấn</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Hãy nhấn vào biểu tượng sửa (bút chì) trên danh sách bên phải hoặc nhấn nút bên dưới để tạo mới.</p>
                <button
                  type="button"
                  onClick={() => setEditingEdu({
                    id: 'edu_' + Date.now(),
                    degree: '',
                    major: '',
                    school: '',
                    startDate: '',
                    endDate: '',
                    isOngoing: false,
                    description: '',
                    achievement: '',
                    certificateUrl: '',
                    sortOrder: education.length + 1
                  })}
                  className="mt-4 inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo mốc học vị mới</span>
                </button>
              </div>
            )}
          </div>

          {/* List education timeline (Right Column) */}
          <div className="lg:col-span-7 min-w-0 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <GraduationCap className="w-5 h-5 text-brand" />
                <span>Tiến trình Học vấn</span>
              </h3>
              {!editingEdu && (
                <button
                  onClick={() => setEditingEdu({
                    id: 'edu_' + Date.now(),
                    degree: '',
                    major: '',
                    school: '',
                    startDate: '',
                    endDate: '',
                    isOngoing: false,
                    description: '',
                    achievement: '',
                    certificateUrl: '',
                    sortOrder: education.length + 1
                  })}
                  className="inline-flex items-center gap-1 bg-brand hover:bg-brand-hover text-white px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm học vị</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {education.map((edu, idx) => (
                <div key={edu.id} className="p-4 bg-slate-50 rounded-2xl flex items-start justify-between gap-4 transition-all hover:bg-slate-100/80">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-brand bg-brand-light border border-brand/15 px-2 py-0.5 rounded">
                        {edu.startDate} — {edu.isOngoing ? 'Hiện tại' : edu.endDate}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 truncate">{edu.degree}</h4>
                    <p className="text-xs text-slate-600 font-semibold truncate">{edu.major} • <span className="text-slate-500">{edu.school}</span></p>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{edu.description}</p>
                    
                    {edu.achievement && (
                      <span className="inline-flex items-center text-[10px] font-bold text-amber-600 mt-1">★ {edu.achievement}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleSortEdu(idx, 'up')}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-brand disabled:opacity-45"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === education.length - 1}
                      onClick={() => handleSortEdu(idx, 'down')}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-brand disabled:opacity-45"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingEdu(edu)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-brand"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEdu(edu.id)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* activeSubTab === 'experience' */}
      {activeSubTab === 'experience' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Edit/Add Form (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            {editingExp ? (
              <div className="bg-slate-50 p-6 rounded-2xl space-y-4 animate-slideUp border border-slate-200/50">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-brand" />
                  <span>Chi tiết vai trò làm việc</span>
                </h4>

                <form onSubmit={handleSaveExp} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Chức danh / Vai trò</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Giám đốc Sáng tạo, Thiết kế..."
                      value={editingExp.title}
                      onChange={(e) => setEditingExp({ ...editingExp, title: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tên tổ chức / Doanh nghiệp</label>
                    <input
                      type="text"
                      required
                      value={editingExp.company}
                      onChange={(e) => setEditingExp({ ...editingExp, company: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Năm bắt đầu</label>
                      <input
                        type="text"
                        required
                        value={editingExp.startDate}
                        onChange={(e) => setEditingExp({ ...editingExp, startDate: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Năm kết thúc</label>
                      <input
                        type="text"
                        disabled={editingExp.isOngoing}
                        value={editingExp.endDate}
                        onChange={(e) => setEditingExp({ ...editingExp, endDate: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none disabled:opacity-45"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Đang làm việc tại đây</span>
                    <input
                      type="checkbox"
                      checked={editingExp.isOngoing}
                      onChange={(e) => setEditingExp({ ...editingExp, isOngoing: e.target.checked, endDate: e.target.checked ? '' : editingExp.endDate })}
                      className="rounded text-brand focus:ring-brand/30 w-4 h-4"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Website doanh nghiệp (URL)</label>
                    <input
                      type="text"
                      value={editingExp.websiteUrl}
                      onChange={(e) => setEditingExp({ ...editingExp, websiteUrl: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>

                  <CloudinaryUploadField label="Logo doanh nghiệp" value={editingExp.logoUrl} onChange={url => setEditingExp({ ...editingExp, logoUrl: url })} accept="image/*" resourceType="image" folder="portfolio/experience" />

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nội dung công việc</label>
                    <textarea
                      rows={3}
                      value={editingExp.description}
                      onChange={(e) => setEditingExp({ ...editingExp, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none resize-none"
                    />
                  </div>

                  {/* Achievements List */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Thành tích nổi bật (Enter ngắt dòng)</label>
                    <textarea
                      rows={2}
                      placeholder="Mỗi dòng là một thành tựu nổi bật..."
                      value={editingExp.achievements?.join('\n') || ''}
                      onChange={(e) => setEditingExp({ ...editingExp, achievements: e.target.value.split('\n').filter(Boolean) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingExp(null)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand hover:bg-brand-hover text-white py-2.5 rounded-xl text-xs font-bold uppercase transition-colors"
                    >
                      Lưu vai trò
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center min-h-[320px]">
                <Briefcase className="w-8 h-8 text-slate-400 mb-3" />
                <p className="text-xs font-bold text-slate-700">Chưa chọn mốc kinh nghiệm</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Hãy nhấn vào biểu tượng sửa (bút chì) trên danh sách bên phải hoặc nhấn nút bên dưới để tạo mới một vai trò.</p>
                <button
                  type="button"
                  onClick={() => setEditingExp({
                    id: 'exp_' + Date.now(),
                    title: '',
                    company: '',
                    startDate: '',
                    endDate: '',
                    isOngoing: false,
                    description: '',
                    achievements: [],
                    logoUrl: '',
                    websiteUrl: '',
                    sortOrder: experience.length + 1
                  })}
                  className="mt-4 inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo vai trò mới</span>
                </button>
              </div>
            )}
          </div>

          {/* List of experience timelines (Right Column) */}
          <div className="lg:col-span-7 min-w-0 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Briefcase className="w-5 h-5 text-brand" />
                <span>Kinh nghiệm Làm việc</span>
              </h3>
              {!editingExp && (
                <button
                  onClick={() => setEditingExp({
                    id: 'exp_' + Date.now(),
                    title: '',
                    company: '',
                    startDate: '',
                    endDate: '',
                    isOngoing: false,
                    description: '',
                    achievements: [],
                    logoUrl: '',
                    websiteUrl: '',
                    sortOrder: experience.length + 1
                  })}
                  className="inline-flex items-center gap-1 bg-brand hover:bg-brand-hover text-white px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm vai trò</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl flex items-start justify-between gap-4 transition-all hover:bg-slate-100/80">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-[9px] font-black text-pink-600 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded">
                      {exp.startDate} — {exp.isOngoing ? 'Hiện tại' : exp.endDate}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 truncate">{exp.title}</h4>
                    <p className="text-xs text-slate-600 font-semibold truncate">{exp.company}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{exp.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleSortExp(idx, 'up')}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-brand disabled:opacity-45"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === experience.length - 1}
                      onClick={() => handleSortExp(idx, 'down')}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-brand disabled:opacity-45"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingExp(exp)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-brand"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteExp(exp.id)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* activeSubTab === 'skills' */}
      {activeSubTab === 'skills' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Edit/Add Form (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            {editingSkill ? (
              <div className="bg-slate-50 p-6 rounded-2xl space-y-4 animate-slideUp border border-slate-200/50">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-brand" />
                  <span>Chi tiết kỹ năng</span>
                </h4>

                <form onSubmit={handleSaveSkill} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tên kỹ năng</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Photoshop, Blender 3D..."
                      value={editingSkill.name}
                      onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Phân nhóm</label>
                      <select
                        value={editingSkill.category}
                        onChange={(e) => setEditingSkill({ ...editingSkill, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                      >
                        <option value="Design">Mỹ thuật / Thiết kế</option>
                        <option value="Technical">Công nghệ / Kỹ thuật</option>
                        <option value="Soft">Kỹ năng mềm</option>
                        <option value="Other">Khác</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Biểu tượng (Icon Class)</label>
                      <select
                        value={editingSkill.icon}
                        onChange={(e) => setEditingSkill({ ...editingSkill, icon: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                      >
                        <option value="Sparkles">Sparkles (Lấp lánh)</option>
                        <option value="Boxes">Boxes (Dựng hình 3D)</option>
                        <option value="Film">Film (Video/Motion)</option>
                        <option value="Code2">Code2 (Lập trình/WebGL)</option>
                        <option value="Layers">Layers (Bố cục/Thiết kế)</option>
                        <option value="User">User (Cá nhân/Mềm)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Mức thành thạo</span>
                      <span className="text-brand">{editingSkill.proficiency}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={editingSkill.proficiency}
                      onChange={(e) => setEditingSkill({ ...editingSkill, proficiency: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand mt-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mô tả chi tiết</label>
                    <textarea
                      rows={3}
                      placeholder="Mô tả tóm tắt ứng dụng kỹ năng trong các tác phẩm..."
                      value={editingSkill.description}
                      onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Hiển thị ngoài trang chủ</span>
                    <input
                      type="checkbox"
                      checked={editingSkill.visible}
                      onChange={(e) => setEditingSkill({ ...editingSkill, visible: e.target.checked })}
                      className="rounded text-brand focus:ring-brand/30 w-4 h-4"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingSkill(null)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand hover:bg-brand-hover text-white py-2.5 rounded-xl text-xs font-bold uppercase transition-colors"
                    >
                      Lưu kỹ năng
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center min-h-[320px]">
                <Boxes className="w-8 h-8 text-slate-400 mb-3" />
                <p className="text-xs font-bold text-slate-700">Chưa chọn kỹ năng</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Hãy nhấn vào biểu tượng sửa (bút chì) trên danh sách bên phải hoặc nhấn nút bên dưới để thêm kỹ năng mới.</p>
                <button
                  type="button"
                  onClick={() => setEditingSkill({
                    id: 'skill_' + Date.now(),
                    name: '',
                    category: 'Design',
                    proficiency: 80,
                    icon: 'Sparkles',
                    description: '',
                    relatedProjects: [],
                    sortOrder: skills.length + 1,
                    visible: true
                  })}
                  className="mt-4 inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm kỹ năng mới</span>
                </button>
              </div>
            )}
          </div>

          {/* List of skills (Right Column) */}
          <div className="lg:col-span-7 min-w-0 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Boxes className="w-5 h-5 text-brand" />
                <span>Kỹ năng & Chuyên môn</span>
              </h3>
              {!editingSkill && (
                <button
                  onClick={() => setEditingSkill({
                    id: 'skill_' + Date.now(),
                    name: '',
                    category: 'Design',
                    proficiency: 80,
                    icon: 'Sparkles',
                    description: '',
                    relatedProjects: [],
                    sortOrder: skills.length + 1,
                    visible: true
                  })}
                  className="inline-flex items-center gap-1 bg-brand hover:bg-brand-hover text-white px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm kỹ năng</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {skills.map((s, idx) => (
                <div key={s.id} className="p-4 bg-slate-50 rounded-2xl flex items-start justify-between gap-4 transition-all hover:bg-slate-100/80">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-brand bg-brand-light border border-brand/15 px-2.5 py-0.5 rounded uppercase">
                        {s.category}
                      </span>
                      {!s.visible && (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">Ẩn</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 truncate">{s.name}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-1">{s.description}</p>
                    
                    {/* Progress representation */}
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-brand" style={{ width: `${s.proficiency}%` }} />
                      </div>
                      <span>{s.proficiency}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleSortSkill(idx, 'up')}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-brand disabled:opacity-45"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === skills.length - 1}
                      onClick={() => handleSortSkill(idx, 'down')}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-brand disabled:opacity-45"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingSkill(s)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-brand"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSkill(s.id)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
