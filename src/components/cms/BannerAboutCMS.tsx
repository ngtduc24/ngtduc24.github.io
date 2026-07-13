import React, { useState, useEffect } from 'react';
import { 
  Laptop, Tablet, Smartphone, Eye, Check, AlertCircle, Plus, Trash2, 
  ArrowUp, ArrowDown, Edit3, Image, Settings, Sparkles, User, GraduationCap, 
  Briefcase, Boxes, Save
} from 'lucide-react';
import { 
  PortfolioBanner, PortfolioAbout, PortfolioEducation, 
  PortfolioExperience, PortfolioSkill 
} from '../portfolioTypes';
import { 
  getPortfolioBanner, savePortfolioBanner, 
  getPortfolioAbout, savePortfolioAbout,
  getPortfolioEducation, savePortfolioEducation, deletePortfolioEducationDoc,
  getPortfolioExperience, savePortfolioExperience, deletePortfolioExperienceDoc,
  getPortfolioSkills, savePortfolioSkills, deletePortfolioSkillDoc
} from '../../lib/portfolioData';
import CloudinaryUploadField from './CloudinaryUploadField';

export default function BannerAboutCMS() {
  const [activeSubTab, setActiveSubTab] = useState<'banner' | 'about' | 'education' | 'experience' | 'skills'>('banner');
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

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

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

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
    if (!window.confirm('Bạn có chắc chắn muốn xóa học vấn này?')) return;
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
    if (!window.confirm('Bạn có chắc chắn muốn xóa kinh nghiệm làm việc này?')) return;
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
    if (!window.confirm('Bạn có chắc chắn muốn xóa kỹ năng này?')) return;
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
      
      {/* Quick Alert notification */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-slideUp">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

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

            {/* Title & Desc */}
            <div className="space-y-4">
              <CloudinaryUploadField label="Ảnh nền Banner" value={banner.backgroundImage} onChange={url => setBanner({ ...banner, backgroundImage: url })} accept="image/*" resourceType="image" folder="portfolio/banner" hint="Tải lên Cloudinary dùng chung với Thư viện hoặc dán URL ảnh ngoài." />

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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tiêu đề chính (Thông điệp nổi bật)</label>
                <textarea
                  rows={2}
                  value={banner.title}
                  onChange={(e) => setBanner({ ...banner, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors resize-none"
                />
              </div>

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
                  value={banner.buttonText}
                  onChange={(e) => setBanner({ ...banner, buttonText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Liên kết nút bấm (Section ID/URL)</label>
                <input
                  type="text"
                  value={banner.buttonLink}
                  onChange={(e) => setBanner({ ...banner, buttonLink: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-hover focus:bg-white transition-colors"
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Màu lớp phủ</label>
                <input
                  type="color"
                  value={banner.overlayColor}
                  onChange={(e) => setBanner({ ...banner, overlayColor: e.target.value })}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Lớp phủ mờ (Opacity)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={banner.overlayOpacity}
                  onChange={(e) => setBanner({ ...banner, overlayOpacity: parseFloat(e.target.value) })}
                  className="w-full mt-3 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand"
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
                    <span className="w-7 h-7 rounded-xl bg-brand text-white text-[10px] font-black flex items-center justify-center">A</span>
                    <div className="space-y-1">
                      <div className="h-1.5 w-14 rounded bg-slate-800" />
                      <div className="h-1 w-10 rounded bg-brand/50" />
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
                <div
                  className="relative flex-1 m-2 mt-0 rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    backgroundImage: `url('${banner.backgroundImage}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: `brightness(${banner.brightness}%)`
                  }}
                >
                  <div className="absolute inset-0" style={{ backgroundColor: banner.overlayColor, opacity: banner.overlayOpacity }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                  <div className={`relative z-10 w-full px-6 flex flex-col gap-3 ${
                    banner.alignment === 'left'
                      ? 'items-start text-left'
                      : banner.alignment === 'right'
                        ? 'items-end text-right'
                        : 'items-center text-center'
                  }`}>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[7px] font-bold uppercase tracking-wider text-white backdrop-blur">
                      Multimedia Designer & Artist
                    </span>
                    <h1 className={`max-w-md text-white font-black tracking-tight leading-[1.02] ${
                      bannerPreviewDevice === 'mobile' ? 'text-[17px]' : bannerPreviewDevice === 'tablet' ? 'text-xl' : 'text-2xl'
                    }`}>
                      {banner.title || 'Tiêu đề trống'}
                    </h1>
                    <p className={`max-w-sm text-slate-200 leading-relaxed ${bannerPreviewDevice === 'mobile' ? 'text-[8px]' : 'text-[10px]'}`}>
                      {banner.description || 'Chưa cấu hình mô tả ngắn.'}
                    </p>
                    {banner.buttonText && (
                      <button className="bg-brand text-white font-bold text-[8px] px-4 py-2 rounded-lg shadow-md">
                        {banner.buttonText}
                      </button>
                    )}
                  </div>

                  <div className={`absolute bottom-3 left-3 right-3 grid gap-px overflow-hidden rounded-xl bg-white/15 backdrop-blur-md ${bannerPreviewDevice === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'}`}>
                    {['Art Direction', 'Motion & 3D', 'Creative Tech', 'Education'].map(item => (
                      <span key={item} className="bg-white/90 px-2 py-2 text-center text-[6px] font-bold text-slate-700">{item}</span>
                    ))}
                  </div>
                </div>
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
            
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl mt-3.5">
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
          {/* List education timeline */}
          <div className="lg:col-span-7 min-w-0 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <GraduationCap className="w-5 h-5 text-brand" />
                <span>Tiến trình Học vấn ({education.length})</span>
              </h3>
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
            </div>

            <div className="space-y-4">
              {education.map((edu, idx) => (
                <div key={edu.id} className="p-4 bg-slate-50 rounded-2xl flex items-start justify-between gap-4 transition-all hover:bg-slate-100/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-brand bg-brand-light border border-brand/15 px-2 py-0.5 rounded">
                        {edu.startDate} — {edu.isOngoing ? 'Hiện tại' : edu.endDate}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">{edu.degree}</h4>
                    <p className="text-xs text-slate-600 font-semibold">{edu.major} • <span className="text-slate-500">{edu.school}</span></p>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{edu.description}</p>
                    
                    {edu.achievement && (
                      <span className="inline-flex items-center text-[10px] font-bold text-amber-600 mt-1">★ {edu.achievement}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
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

          {/* Edit/Add Form */}
          {editingEdu && (
            <div className="lg:col-span-5 bg-slate-50 p-6 rounded-2xl space-y-4 animate-slideUp">
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
          )}
        </div>
      )}

      {/* activeSubTab === 'experience' */}
      {activeSubTab === 'experience' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* List of experience timelines */}
          <div className="lg:col-span-7 min-w-0 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Briefcase className="w-5 h-5 text-brand" />
                <span>Kinh nghiệm Làm việc ({experience.length})</span>
              </h3>
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
            </div>

            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl flex items-start justify-between gap-4 transition-all hover:bg-slate-100/80">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-pink-600 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded">
                      {exp.startDate} — {exp.isOngoing ? 'Hiện tại' : exp.endDate}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800">{exp.title}</h4>
                    <p className="text-xs text-slate-600 font-semibold">{exp.company}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{exp.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
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

          {/* Form edit/add experience */}
          {editingExp && (
            <div className="lg:col-span-5 bg-slate-50 p-6 rounded-2xl space-y-4 animate-slideUp">
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
          )}
        </div>
      )}

      {/* activeSubTab === 'skills' */}
      {activeSubTab === 'skills' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* List of skills */}
          <div className="lg:col-span-7 min-w-0 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Boxes className="w-5 h-5 text-brand" />
                <span>Kỹ năng & Chuyên môn ({skills.length})</span>
              </h3>
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
            </div>

            <div className="space-y-4">
              {skills.map((s, idx) => (
                <div key={s.id} className="p-4 bg-slate-50 rounded-2xl flex items-start justify-between gap-4 transition-all hover:bg-slate-100/80">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-brand bg-brand-light border border-brand/15 px-2.5 py-0.5 rounded uppercase">
                        {s.category}
                      </span>
                      {!s.visible && (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">Ẩn</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">{s.name}</h4>
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

          {/* Form edit skill */}
          {editingSkill && (
            <div className="lg:col-span-5 bg-slate-50 p-6 rounded-2xl space-y-4 animate-slideUp">
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
          )}
        </div>
      )}

    </div>
  );
}
