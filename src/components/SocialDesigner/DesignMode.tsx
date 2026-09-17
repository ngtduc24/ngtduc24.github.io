import React, { useState, useEffect } from 'react';
import { UserAccount, SocialTemplate, SocialTemplateLayer, SocialPreset } from '../../types';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { supabase } from '../../lib/supabase';
import { useConfirmation } from '../ConfirmationContext';
import { 
  Image as ImageIcon, 
  Type, 
  Sparkles, 
  Download, 
  Wand2, 
  Layers, 
  Type as TypeIcon,
  Bookmark,
  Plus,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Sliders,
  Trash2,
  X,
  Eye,
  Edit3,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';
import CanvasRenderer from './CanvasRenderer';
import MediaSourcePicker from '../MediaSourcePicker';
import { renderTemplateToImage, ExportResult } from './exportCanvas';

interface DesignModeProps {
  currentUser: UserAccount;
}

const DEFAULT_PRESETS: SocialPreset[] = [
  {
    id: 'preset-default-white-bottom',
    name: 'Chữ đen đáy trắng (Khung tin tức)',
    userId: 'system',
    userName: 'Hệ thống',
    createdAt: new Date().toISOString(),
    titleSettings: {
      y: 72,
      x: 10,
      width: 80,
      fontSize: 56,
      color: '#0f172a',
      fontWeight: 'bold',
      textAlign: 'left',
    },
    descSettings: {
      y: 84,
      x: 10,
      width: 80,
      fontSize: 26,
      color: '#475569',
      fontWeight: 'normal',
      textAlign: 'left',
    },
  },
  {
    id: 'preset-default-center-white',
    name: 'Chữ trắng giữa ảnh (Nổi bật)',
    userId: 'system',
    userName: 'Hệ thống',
    createdAt: new Date().toISOString(),
    titleSettings: {
      y: 50,
      x: 10,
      width: 80,
      fontSize: 64,
      color: '#ffffff',
      fontWeight: 'bold',
      textAlign: 'left',
    },
    descSettings: {
      y: 66,
      x: 10,
      width: 80,
      fontSize: 30,
      color: '#f8fafc',
      fontWeight: 'normal',
      textAlign: 'left',
    },
  },
  {
    id: 'preset-default-top-headline',
    name: 'Tiêu đề đầu ảnh (Banner trên)',
    userId: 'system',
    userName: 'Hệ thống',
    createdAt: new Date().toISOString(),
    titleSettings: {
      y: 20,
      x: 10,
      width: 80,
      fontSize: 60,
      color: '#ffffff',
      fontWeight: 'bold',
      textAlign: 'left',
    },
    descSettings: {
      y: 35,
      x: 10,
      width: 80,
      fontSize: 28,
      color: '#e2e8f0',
      fontWeight: 'normal',
      textAlign: 'left',
    },
  }
];

export default function DesignMode({ currentUser }: DesignModeProps) {
  const { confirm } = useConfirmation();
  const [templates, setTemplates] = useState<SocialTemplate[]>([]);
  
  const [selectedTemplate, setSelectedTemplate] = useState<SocialTemplate | null>(null);
  const [activeTemplateConfig, setActiveTemplateConfig] = useState<SocialTemplate | null>(null);
  const [designTab, setDesignTab] = useState<'basic' | 'advanced'>('basic');

  // Presets state
  const [presets, setPresets] = useState<SocialPreset[]>(DEFAULT_PRESETS);
  // Desktop canvas preview size control (normal ~480px, compact ~380px, expanded ~580px)
  const [desktopPreviewSize, setDesktopPreviewSize] = useState<number>(460);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [showSavePresetModal, setShowSavePresetModal] = useState<boolean>(false);
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [savingPreset, setSavingPreset] = useState<boolean>(false);
  const [presetSuccessMsg, setPresetSuccessMsg] = useState<string>('');

  // Export Canvas State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Content for Basic Mode
  const [contentTitle, setContentTitle] = useState('Tiêu đề bài viết tin tức nóng hổi sẽ nằm ở đây');
  const [contentDesc, setContentDesc] = useState('Đoạn mô tả ngắn gọn về nội dung bài viết, giúp người xem nắm bắt thông tin nhanh chóng trước khi click vào link.');
  const [contentImage, setContentImage] = useState<string>('https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop');

  useEffect(() => {
    loadData();
    loadPresets();
  }, []);

  const loadData = async () => {
    try {
      const snapTpls = await getDocs(collection(db, 'social_templates'));
      const tpls: SocialTemplate[] = [];
      snapTpls.forEach(doc => tpls.push({ id: doc.id, ...doc.data() } as SocialTemplate));
      
      if (tpls.length > 0) {
        setTemplates(tpls);
        setSelectedTemplate(tpls[0]);
      } else {
        const mock = getMockTemplate();
        setTemplates([mock]);
        setSelectedTemplate(mock);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    }
  };

  const loadPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('social_presets')
        .select('*')
        .order('created_at', { ascending: false });

      const dbPresets: SocialPreset[] = [];
      if (data && !error) {
        data.forEach((row: any) => {
          dbPresets.push({
            id: String(row.id),
            name: row.name,
            templateId: row.template_id,
            userId: row.user_id,
            userName: row.user_name,
            createdAt: row.created_at,
            titleSettings: row.title_settings,
            descSettings: row.desc_settings,
          });
        });
      }

      // Merge with default and cached presets
      const cached = localStorage.getItem(`cached_social_presets_${currentUser.id}`);
      let localPresets: SocialPreset[] = [];
      if (cached) {
        try {
          localPresets = JSON.parse(cached);
        } catch (e) {}
      }

      const mergedMap = new Map<string, SocialPreset>();
      DEFAULT_PRESETS.forEach(p => mergedMap.set(p.id, p));
      localPresets.forEach(p => mergedMap.set(p.id, p));
      dbPresets.forEach(p => mergedMap.set(p.id, p));

      setPresets(Array.from(mergedMap.values()));
    } catch (err) {
      console.warn("Lỗi tải preset từ Supabase, dùng bộ nhớ cục bộ:", err);
      const cached = localStorage.getItem(`cached_social_presets_${currentUser.id}`);
      if (cached) {
        try {
          const localList: SocialPreset[] = JSON.parse(cached);
          const merged = [...DEFAULT_PRESETS, ...localList.filter(p => !DEFAULT_PRESETS.some(d => d.id === p.id))];
          setPresets(merged);
        } catch (e) {}
      }
    }
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = presets.find(p => p.id === presetId);
    if (!preset || !activeTemplateConfig) return;

    const newLayers = activeTemplateConfig.layers.map(layer => {
      if (layer.id.includes('title') || (layer.type === 'text' && layer.name.toLowerCase().includes('tiêu đề'))) {
        return {
          ...layer,
          y: preset.titleSettings.y,
          x: preset.titleSettings.x,
          width: preset.titleSettings.width ?? layer.width,
          fontSize: preset.titleSettings.fontSize,
          color: preset.titleSettings.color,
          textAlign: preset.titleSettings.textAlign || layer.textAlign,
          fontWeight: preset.titleSettings.fontWeight || layer.fontWeight,
        };
      }
      if ((layer.id.includes('desc') || layer.name.toLowerCase().includes('mô tả')) && preset.descSettings) {
        return {
          ...layer,
          y: preset.descSettings.y,
          x: preset.descSettings.x,
          width: preset.descSettings.width ?? layer.width,
          fontSize: preset.descSettings.fontSize,
          color: preset.descSettings.color,
          textAlign: preset.descSettings.textAlign || layer.textAlign,
          fontWeight: preset.descSettings.fontWeight || layer.fontWeight,
        };
      }
      return layer;
    });

    setActiveTemplateConfig({
      ...activeTemplateConfig,
      layers: newLayers
    });
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetNameInput.trim() || !titleLayer) return;

    setSavingPreset(true);
    const titleSettings = {
      y: titleLayer.y,
      x: titleLayer.x,
      width: titleLayer.width,
      fontSize: titleLayer.fontSize || 64,
      color: titleLayer.color || '#0f172a',
      fontWeight: titleLayer.fontWeight || 'bold',
      textAlign: titleLayer.textAlign || 'left',
    };
    const descSettings = descLayer ? {
      y: descLayer.y,
      x: descLayer.x,
      width: descLayer.width,
      fontSize: descLayer.fontSize || 28,
      color: descLayer.color || '#475569',
      fontWeight: descLayer.fontWeight || 'normal',
      textAlign: descLayer.textAlign || 'left',
    } : null;

    const newPresetDb = {
      name: presetNameInput.trim(),
      template_id: selectedTemplate?.id || '',
      user_id: currentUser.id,
      user_name: currentUser.fullName || currentUser.username,
      title_settings: titleSettings,
      desc_settings: descSettings,
    };

    try {
      const { data, error } = await supabase
        .from('social_presets')
        .insert(newPresetDb)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const savedPreset: SocialPreset = {
        id: String(data?.id || ('preset-' + Date.now())),
        name: newPresetDb.name,
        templateId: newPresetDb.template_id,
        userId: newPresetDb.user_id,
        userName: newPresetDb.user_name,
        createdAt: data?.created_at || new Date().toISOString(),
        titleSettings,
        descSettings: descSettings || undefined,
      };

      const updated = [savedPreset, ...presets.filter(p => p.id !== savedPreset.id)];
      setPresets(updated);
      setSelectedPresetId(savedPreset.id);
      localStorage.setItem(`cached_social_presets_${currentUser.id}`, JSON.stringify(updated));

      setShowSavePresetModal(false);
      setPresetNameInput('');
      setPresetSuccessMsg('Đã lưu preset thành công vào CSDL Supabase!');
      setTimeout(() => setPresetSuccessMsg(''), 3500);
    } catch (error) {
      console.warn("Lưu Supabase gặp sự cố, lưu vào bộ nhớ dự phòng:", error);
      const localId = 'preset-' + Date.now();
      const localPreset: SocialPreset = {
        id: localId,
        name: newPresetDb.name,
        templateId: newPresetDb.template_id,
        userId: newPresetDb.user_id,
        userName: newPresetDb.user_name,
        createdAt: new Date().toISOString(),
        titleSettings,
        descSettings: descSettings || undefined,
      };
      const updated = [localPreset, ...presets];
      setPresets(updated);
      setSelectedPresetId(localId);
      localStorage.setItem(`cached_social_presets_${currentUser.id}`, JSON.stringify(updated));

      setShowSavePresetModal(false);
      setPresetNameInput('');
      setPresetSuccessMsg('Đã lưu preset vào bộ nhớ thiết bị của bạn!');
      setTimeout(() => setPresetSuccessMsg(''), 3500);
    } finally {
      setSavingPreset(false);
    }
  };

  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const preset = presets.find(p => p.id === presetId);
    const presetName = preset ? `"${preset.name}"` : 'này';

    const confirmed = await confirm({
      title: 'Xác nhận xóa Preset',
      message: `Bạn có chắc chắn muốn xóa preset ${presetName}? Cấu hình này sẽ bị xóa khỏi hệ thống và không thể hoàn tác.`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    try {
      if (!presetId.startsWith('preset-default-') && !presetId.startsWith('preset-')) {
        await supabase.from('social_presets').delete().eq('id', presetId);
      }
    } catch (err) {
      console.warn("Xóa từ Supabase có cảnh báo:", err);
    }

    const filtered = presets.filter(p => p.id !== presetId);
    setPresets(filtered);
    localStorage.setItem(`cached_social_presets_${currentUser.id}`, JSON.stringify(filtered));
    if (selectedPresetId === presetId) {
      setSelectedPresetId('');
    }
    setPresetSuccessMsg('Đã xóa preset thành công!');
    setTimeout(() => setPresetSuccessMsg(''), 2500);
  };

  const handleExportImage = async () => {
    if (!activeTemplateConfig) {
      setExportError('Chưa có khung mẫu nào được chọn để xuất ảnh. Vui lòng chọn một khung từ danh sách.');
      setShowExportModal(true);
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const result = await renderTemplateToImage({
        template: activeTemplateConfig,
        content: {
          image: contentImage,
          title: contentTitle,
          desc: contentDesc,
        },
      });

      setExportResult(result);
      setShowExportModal(true);

      // Auto trigger download without browser alerts
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Lỗi khi kết xuất ảnh canvas:', err);
      setExportError(
        err?.message || 
        'Không thể xuất ảnh từ Canvas do chính sách bảo mật CORS của ảnh ngoài. Bạn hãy thử chọn ảnh tải lên từ máy hoặc kho media nội bộ.'
      );
      setShowExportModal(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!exportResult) return;
    const link = document.createElement('a');
    link.href = exportResult.dataUrl;
    link.download = exportResult.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    if (!exportResult) return;
    const w = window.open('');
    if (w) {
      w.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${exportResult.fileName}</title>
            <style>
              body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; }
              img { max-width: 92vw; max-height: 92vh; object-fit: contain; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border-radius: 12px; }
            </style>
          </head>
          <body>
            <img src="${exportResult.dataUrl}" alt="${exportResult.fileName}" />
          </body>
        </html>
      `);
      w.document.close();
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      // Deep clone so we can modify it safely in advanced mode
      setActiveTemplateConfig(JSON.parse(JSON.stringify(selectedTemplate)));
    } else {
      setActiveTemplateConfig(null);
    }
  }, [selectedTemplate]);

  const getMockTemplate = (): SocialTemplate => {
    return {
      id: 'mock-1',
      name: 'Mẫu Tin Tức Cơ Bản',
      isSystem: true,
      width: 1080,
      height: 1080,
      bgImage: '',
      layers: [
        {
          id: 'img-main',
          type: 'image',
          name: 'Ảnh chính',
          x: 0, y: 0, width: 100, height: 100,
          objectFit: 'cover',
          borderRadius: 0,
          zIndex: 10 
        },
        {
          id: 'txt-title',
          type: 'text',
          name: 'Tiêu đề',
          x: 10, y: 72, width: 80, height: 15,
          fontSize: 56, 
          color: '#0f172a',
          fontWeight: 'bold',
          textAlign: 'left',
          maxLines: 2,
          zIndex: 20
        },
        {
          id: 'txt-desc',
          type: 'text',
          name: 'Mô tả',
          x: 10, y: 84, width: 80, height: 10,
          fontSize: 28,
          color: '#475569',
          fontWeight: 'normal',
          textAlign: 'left',
          maxLines: 3,
          zIndex: 20
        }
      ]
    };
  };

  const updateLayer = (layerId: string, updates: Partial<SocialTemplateLayer>) => {
    if (!activeTemplateConfig) return;
    const newLayers = activeTemplateConfig.layers.map(l => 
      l.id === layerId ? { ...l, ...updates } : l
    );
    setActiveTemplateConfig({ ...activeTemplateConfig, layers: newLayers });
  };

  // Find dynamic layers
  const titleLayer = activeTemplateConfig?.layers.find(l => l.id.includes('title') || (l.type === 'text' && l.name.toLowerCase().includes('tiêu đề')));
  const descLayer = activeTemplateConfig?.layers.find(l => l.id.includes('desc') || (l.type === 'text' && l.name.toLowerCase().includes('mô tả')));

  return (
    <div className="flex flex-col w-full h-full bg-slate-100">
      
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <label className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Chọn Khung</label>
          <select 
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 max-w-[170px] sm:max-w-[260px] truncate"
            value={selectedTemplate?.id || ''}
            onChange={(e) => setSelectedTemplate(templates.find(t => t.id === e.target.value) || null)}
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.width}x{t.height})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Sub-tabs for Editor (Nội dung vs Bố cục) */}
          <div className="bg-slate-100 p-0.5 sm:p-1 rounded-lg flex border border-slate-200/80">
            <button 
              type="button"
              onClick={() => setDesignTab('basic')}
              className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition ${designTab === 'basic' ? 'bg-white shadow-2xs text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Nội dung
            </button>
            <button 
              type="button"
              onClick={() => setDesignTab('advanced')}
              className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition ${designTab === 'advanced' ? 'bg-white shadow-2xs text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Bố cục <span className="hidden sm:inline">(Lớp)</span>
            </button>
          </div>

          <button 
            type="button"
            onClick={handleExportImage}
            disabled={isExporting}
            className="bg-indigo-600 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5 shadow-xs transition active:scale-95 shrink-0"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xuất...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Xuất ảnh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace: Mobile = Flex Col (Canvas on TOP, Editor on BOTTOM); PC = Flex Row (Editor on LEFT, Canvas on RIGHT) */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        {/* Editor Sidebar: On PC = LEFT (lg:order-1), w-[460px]; On Mobile = BOTTOM (order-2), flex-1 scrollable */}
        <div className="order-2 lg:order-1 flex-1 lg:flex-none w-full lg:w-[460px] xl:w-[490px] bg-white lg:border-r border-slate-200 flex flex-col overflow-y-auto min-h-0">
          {designTab === 'basic' ? (
            <div className="p-4 space-y-4">
              
              {/* Preset Management Header */}
              <div className="bg-gradient-to-r from-indigo-50/90 to-slate-50 border border-indigo-100 rounded-xl p-3 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> Vị trí chữ & Preset
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      setPresetNameInput(selectedTemplate ? `${selectedTemplate.name} - Mẫu mới` : 'Preset mới');
                      setShowSavePresetModal(true);
                    }}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 hover:border-indigo-300 px-2 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition"
                  >
                    <Plus className="w-3 h-3 text-indigo-600" /> Lưu Preset
                  </button>
                </div>

                <div className="relative">
                  <select 
                    value={selectedPresetId}
                    onChange={(e) => handleApplyPreset(e.target.value)}
                    className="w-full bg-white border border-indigo-200 text-slate-700 text-xs font-medium rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Chọn Preset lưu sẵn để áp dụng nhanh --</option>
                    {presets.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.userId === currentUser.id ? '★ (Của bạn)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPresetId && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="truncate max-w-[230px]">
                      Đang dùng: <strong className="text-indigo-700 font-semibold">{presets.find(p => p.id === selectedPresetId)?.name}</strong>
                    </span>
                    {!selectedPresetId.startsWith('preset-default-') && (
                      <button
                        type="button"
                        onClick={(e) => handleDeletePreset(selectedPresetId, e)}
                        className="text-red-500 hover:text-red-700 flex items-center gap-1 font-medium ml-2"
                        title="Xóa preset này"
                      >
                        <Trash2 className="w-3 h-3" /> Xóa
                      </button>
                    )}
                  </div>
                )}

                {presetSuccessMsg && (
                  <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 animate-fadeIn">
                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> {presetSuccessMsg}
                  </div>
                )}
              </div>

              {/* Main Image Block */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500" /> Ảnh chính
                </label>
                <div className="relative group rounded-xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-indigo-400 h-28 flex items-center justify-center bg-slate-50">
                  {contentImage ? (
                    <img src={contentImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Chưa có ảnh</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <MediaSourcePicker
                      onSelect={setContentImage}
                      label="Chọn ảnh khác"
                      resourceType="image"
                      category="Social Content"
                      className="text-xs font-semibold px-3 py-1 bg-white/90 text-slate-800 rounded-full shadow backdrop-blur-sm hover:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Title Block with Quick Real-Time Controls */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-indigo-600" /> Tiêu đề tin tức
                </label>
                <textarea 
                  value={contentTitle}
                  onChange={e => setContentTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 min-h-[70px] resize-none font-medium text-slate-800"
                  placeholder="Nhập tiêu đề..."
                />

                {/* Quick Title Position and Style Controls */}
                {titleLayer && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                    
                    {/* Position Y Slider */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Sliders className="w-3 h-3 text-indigo-500" /> Vị trí dọc (Y):
                        </span>
                        <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100 text-[11px] shadow-2xs">
                          {Math.round(titleLayer.y)}%
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="90" 
                        step="1"
                        value={titleLayer.y}
                        onChange={e => updateLayer(titleLayer.id, { y: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                      />
                      {/* Nút căn nhanh vị trí */}
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => updateLayer(titleLayer.id, { y: 25 })}
                          className={`text-[10px] py-1 px-1 rounded font-medium border text-center transition ${Math.round(titleLayer.y) === 25 ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          Trên ảnh (25%)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateLayer(titleLayer.id, { y: 50 })}
                          className={`text-[10px] py-1 px-1 rounded font-medium border text-center transition ${Math.round(titleLayer.y) === 50 ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          Giữa (50%)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateLayer(titleLayer.id, { y: 72 })}
                          className={`text-[10px] py-1 px-1 rounded font-medium border text-center transition ${Math.round(titleLayer.y) === 72 ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          Đáy thẻ (72%)
                        </button>
                      </div>
                    </div>

                    {/* Width & Left Offset (X) Sliders for Title */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/70">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>Độ rộng:</span>
                          <span className="text-indigo-600 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                            {Math.round(titleLayer.width || 80)}%
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="40" 
                          max="95" 
                          step="1"
                          value={titleLayer.width || 80}
                          onChange={e => updateLayer(titleLayer.id, { width: parseFloat(e.target.value) })}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>Lề trái (X):</span>
                          <span className="text-slate-700 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                            {Math.round(titleLayer.x || 10)}%
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="40" 
                          step="1"
                          value={titleLayer.x || 10}
                          onChange={e => updateLayer(titleLayer.id, { x: parseFloat(e.target.value) })}
                          className="w-full accent-slate-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                      </div>
                    </div>

                    {/* Text Color Selection */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Palette className="w-3 h-3 text-pink-500" /> Màu chữ:
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{titleLayer.color || '#ffffff'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {[
                          { name: 'Đen than', color: '#0f172a' },
                          { name: 'Trắng', color: '#ffffff' },
                          { name: 'Đỏ mận', color: '#dc2626' },
                          { name: 'Vàng cam', color: '#d97706' },
                          { name: 'Xanh dương', color: '#2563eb' },
                        ].map(c => (
                          <button
                            key={c.color}
                            type="button"
                            title={c.name}
                            onClick={() => updateLayer(titleLayer.id, { color: c.color })}
                            className={`w-6 h-6 rounded-full border shadow-2xs transition transform hover:scale-110 flex items-center justify-center ${titleLayer.color?.toLowerCase() === c.color.toLowerCase() ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105' : 'border-slate-300'}`}
                            style={{ backgroundColor: c.color }}
                          >
                            {titleLayer.color?.toLowerCase() === c.color.toLowerCase() && (
                              <Check className={`w-3 h-3 ${c.color === '#ffffff' ? 'text-black' : 'text-white'}`} />
                            )}
                          </button>
                        ))}
                        {/* Custom Color Picker */}
                        <label className="w-6 h-6 rounded-full border border-slate-300 cursor-pointer overflow-hidden flex items-center justify-center relative hover:scale-110 transition shadow-2xs bg-gradient-to-tr from-indigo-200 to-pink-200" title="Chọn màu tùy ý">
                          <input 
                            type="color" 
                            value={titleLayer.color || '#ffffff'}
                            onChange={e => updateLayer(titleLayer.id, { color: e.target.value })}
                            className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                          />
                          <span className="text-[9px] font-bold text-slate-700">+</span>
                        </label>
                      </div>
                    </div>

                    {/* Font Size & Alignment */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">Cỡ chữ (px):</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateLayer(titleLayer.id, { fontSize: Math.max((titleLayer.fontSize || 64) - 4, 20) })}
                            className="w-7 h-7 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs"
                          >
                            -
                          </button>
                          <span className="flex-1 text-center text-xs font-bold text-slate-800 bg-white py-1 border border-slate-200 rounded shadow-2xs">
                            {titleLayer.fontSize || 64}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateLayer(titleLayer.id, { fontSize: Math.min((titleLayer.fontSize || 64) + 4, 120) })}
                            className="w-7 h-7 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">Căn lề:</span>
                        <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateLayer(titleLayer.id, { textAlign: 'left' })}
                            className={`flex-1 py-1 flex items-center justify-center rounded ${titleLayer.textAlign === 'left' || !titleLayer.textAlign ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Căn trái"
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLayer(titleLayer.id, { textAlign: 'center' })}
                            className={`flex-1 py-1 flex items-center justify-center rounded ${titleLayer.textAlign === 'center' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Căn giữa"
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLayer(titleLayer.id, { textAlign: 'right' })}
                            className={`flex-1 py-1 flex items-center justify-center rounded ${titleLayer.textAlign === 'right' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Căn phải"
                          >
                            <AlignRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description Block */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-slate-400" /> Đoạn mô tả (Sapo)
                </label>
                <textarea 
                  value={contentDesc}
                  onChange={e => setContentDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 min-h-[80px] resize-none text-slate-700 leading-relaxed"
                  placeholder="Nhập mô tả..."
                />

                {/* Quick Desc Position, Size, and Color Controls */}
                {descLayer && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                    {/* Position Y Slider */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Sliders className="w-3 h-3 text-indigo-500" /> Vị trí dọc mô tả (Y):
                        </span>
                        <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100 text-[11px] shadow-2xs">
                          {Math.round(descLayer.y)}%
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="95" 
                        step="1"
                        value={descLayer.y}
                        onChange={e => updateLayer(descLayer.id, { y: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                      />
                    </div>

                    {/* Width & Left Offset (X) Sliders */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>Độ rộng:</span>
                          <span className="text-indigo-600 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                            {Math.round(descLayer.width || 80)}%
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="40" 
                          max="95" 
                          step="1"
                          value={descLayer.width || 80}
                          onChange={e => updateLayer(descLayer.id, { width: parseFloat(e.target.value) })}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>Lề trái (X):</span>
                          <span className="text-slate-700 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                            {Math.round(descLayer.x || 10)}%
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="40" 
                          step="1"
                          value={descLayer.x || 10}
                          onChange={e => updateLayer(descLayer.id, { x: parseFloat(e.target.value) })}
                          className="w-full accent-slate-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                      </div>
                    </div>

                    {/* Font Size & Alignment */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">Cỡ chữ mô tả:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateLayer(descLayer.id, { fontSize: Math.max((descLayer.fontSize || 28) - 2, 14) })}
                            className="w-7 h-7 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs"
                            title="Giảm cỡ chữ"
                          >
                            -
                          </button>
                          <span className="flex-1 text-center text-xs font-bold text-slate-800 bg-white py-1 border border-slate-200 rounded shadow-2xs">
                            {descLayer.fontSize || 28}px
                          </span>
                          <button
                            type="button"
                            onClick={() => updateLayer(descLayer.id, { fontSize: Math.min((descLayer.fontSize || 28) + 2, 64) })}
                            className="w-7 h-7 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs"
                            title="Tăng cỡ chữ"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">Căn lề mô tả:</span>
                        <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateLayer(descLayer.id, { textAlign: 'left' })}
                            className={`flex-1 py-1 flex items-center justify-center rounded ${descLayer.textAlign === 'left' || !descLayer.textAlign ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Căn trái"
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLayer(descLayer.id, { textAlign: 'center' })}
                            className={`flex-1 py-1 flex items-center justify-center rounded ${descLayer.textAlign === 'center' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Căn giữa"
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLayer(descLayer.id, { textAlign: 'right' })}
                            className={`flex-1 py-1 flex items-center justify-center rounded ${descLayer.textAlign === 'right' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Căn phải"
                          >
                            <AlignRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Text Color Selection */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <Palette className="w-3 h-3 text-pink-500" />
                        <span className="text-[10px] font-semibold text-slate-500">Màu chữ mô tả:</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[
                          { name: 'Xám đậm', color: '#475569' },
                          { name: 'Đen than', color: '#0f172a' },
                          { name: 'Trắng', color: '#ffffff' },
                          { name: 'Xám sáng', color: '#cbd5e1' },
                          { name: 'Xanh dương nhạt', color: '#38bdf8' }
                        ].map(c => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => updateLayer(descLayer.id, { color: c.color })}
                            className={`w-5 h-5 rounded-full border shadow-2xs transition transform hover:scale-110 flex items-center justify-center ${descLayer.color?.toLowerCase() === c.color.toLowerCase() ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105' : 'border-slate-300'}`}
                            style={{ backgroundColor: c.color }}
                            title={c.name}
                          >
                            {descLayer.color?.toLowerCase() === c.color.toLowerCase() && (
                              <Check className={`w-2.5 h-2.5 ${c.color === '#ffffff' ? 'text-black' : 'text-white'}`} />
                            )}
                          </button>
                        ))}
                        <label className="w-5 h-5 rounded-full border border-slate-300 cursor-pointer overflow-hidden flex items-center justify-center relative shadow-2xs bg-white hover:scale-110 transition" title="Chọn màu tùy ý">
                          <input 
                            type="color" 
                            value={descLayer.color || '#475569'}
                            onChange={e => updateLayer(descLayer.id, { color: e.target.value })}
                            className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                          />
                          <span className="text-[8px] font-bold text-slate-600">+</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 flex flex-col h-full">
               <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Chỉnh sửa Bố cục (Nâng cao)</h3>
               
               {activeTemplateConfig && activeTemplateConfig.layers.map(layer => (
                 <div key={layer.id} className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
                   <div className="flex items-center gap-2 mb-3">
                     {layer.type === 'image' ? <ImageIcon className="w-4 h-4 text-indigo-500" /> : <TypeIcon className="w-4 h-4 text-emerald-500" />}
                     <span className="font-bold text-sm text-slate-700">{layer.name}</span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 mb-2">
                     <div>
                       <label className="block text-[10px] text-slate-500 mb-0.5">X (%)</label>
                       <input 
                         type="number" value={layer.x} 
                         onChange={e => updateLayer(layer.id, { x: parseFloat(e.target.value) || 0 })}
                         className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" 
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] text-slate-500 mb-0.5">Y (%)</label>
                       <input 
                         type="number" value={layer.y} 
                         onChange={e => updateLayer(layer.id, { y: parseFloat(e.target.value) || 0 })}
                         className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" 
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] text-slate-500 mb-0.5">Rộng (%)</label>
                       <input 
                         type="number" value={layer.width} 
                         onChange={e => updateLayer(layer.id, { width: parseFloat(e.target.value) || 0 })}
                         className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" 
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] text-slate-500 mb-0.5">Cao (%)</label>
                       <input 
                         type="number" value={layer.height} 
                         onChange={e => updateLayer(layer.id, { height: parseFloat(e.target.value) || 0 })}
                         className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" 
                       />
                     </div>
                   </div>

                   {layer.type === 'text' && (
                     <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="block text-[10px] text-slate-500 mb-0.5">Cỡ chữ gốc</label>
                         <input 
                           type="number" value={layer.fontSize} 
                           onChange={e => updateLayer(layer.id, { fontSize: parseFloat(e.target.value) || 32 })}
                           className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" 
                         />
                       </div>
                       <div>
                         <label className="block text-[10px] text-slate-500 mb-0.5">Màu sắc</label>
                         <input 
                           type="color" value={layer.color || '#000000'} 
                           onChange={e => updateLayer(layer.id, { color: e.target.value })}
                           className="w-full h-[26px] bg-white border border-slate-200 rounded p-0 cursor-pointer" 
                         />
                       </div>
                     </div>
                   )}
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Canvas Area: On Mobile = TOP (order-1), height h-[250px] sm:h-[300px]; On PC = RIGHT (lg:order-2), lg:flex-1 lg:h-full */}
        <div className="order-1 lg:order-2 h-[250px] sm:h-[300px] lg:h-full shrink-0 lg:flex-1 bg-slate-200/90 overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 lg:p-8 relative editor-dots-bg border-b lg:border-b-0 border-slate-300 shadow-2xs">
          {/* Canvas size & mode control bar (Desktop & Mobile) */}
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200/80 shadow-xs">
            {/* Desktop zoom / size presets */}
            <div className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-slate-600 border-r border-slate-200 pr-2 mr-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Khung mẫu:</span>
              <button
                type="button"
                onClick={() => setDesktopPreviewSize(380)}
                className={`px-2 py-0.5 rounded transition ${desktopPreviewSize === 380 ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs' : 'hover:bg-slate-100'}`}
                title="Khung nhỏ gọn (380px)"
              >
                Nhỏ
              </button>
              <button
                type="button"
                onClick={() => setDesktopPreviewSize(460)}
                className={`px-2 py-0.5 rounded transition ${desktopPreviewSize === 460 ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs' : 'hover:bg-slate-100'}`}
                title="Kích cỡ chuẩn vừa vặn (460px)"
              >
                Chuẩn
              </button>
              <button
                type="button"
                onClick={() => setDesktopPreviewSize(560)}
                className={`px-2 py-0.5 rounded transition ${desktopPreviewSize === 560 ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs' : 'hover:bg-slate-100'}`}
                title="Khung lớn (560px)"
              >
                Lớn
              </button>
            </div>

            {/* Quick export button directly in canvas bar */}
            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExporting}
              className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg shadow-2xs transition active:scale-95 disabled:opacity-60"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Xuất</span>
            </button>

            <span className="text-[11px] font-mono font-medium text-slate-500">
              {selectedTemplate ? `${selectedTemplate.width}×${selectedTemplate.height}` : '1080×1080'}
            </span>
          </div>
           
          {activeTemplateConfig ? (
            <div className="w-full h-full flex items-center justify-center p-1 sm:p-2 lg:p-4">
              <CanvasRenderer 
                template={activeTemplateConfig}
                content={{
                  image: contentImage,
                  title: contentTitle,
                  desc: contentDesc
                }}
                maxPreviewSize={desktopPreviewSize}
                padding={16}
              />
            </div>
          ) : (
            <div className="text-slate-400 text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Hãy chọn Khung mẫu để bắt đầu
            </div>
          )}
        </div>
      </div>

      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Lưu cấu hình thành Preset</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSavePresetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePreset} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên Preset gợi nhớ:
                </label>
                <input 
                  type="text"
                  required
                  value={presetNameInput}
                  onChange={e => setPresetNameInput(e.target.value)}
                  placeholder="VD: Chữ đen đáy trắng, Tiêu đề nổi..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  autoFocus
                />
              </div>

              {/* Summary of what will be saved */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5 text-xs text-slate-600">
                <div className="font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-indigo-500" /> Thông số sẽ lưu:
                </div>
                <div className="flex justify-between">
                  <span>Vị trí Tiêu đề (Y / X):</span>
                  <span className="font-semibold text-slate-800">{Math.round(titleLayer?.y || 0)}% / {Math.round(titleLayer?.x || 10)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Độ rộng / Cỡ chữ:</span>
                  <span className="font-semibold text-slate-800">{Math.round(titleLayer?.width || 80)}% / {titleLayer?.fontSize || 64}px</span>
                </div>
                <div className="flex justify-between">
                  <span>Màu sắc Tiêu đề:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: titleLayer?.color || '#0f172a' }} />
                    <span className="font-mono text-slate-800 font-semibold">{titleLayer?.color || '#0f172a'}</span>
                  </div>
                </div>
                {descLayer && (
                  <div className="pt-1.5 border-t border-slate-200/60 space-y-1">
                    <div className="flex justify-between">
                      <span>Vị trí Mô tả (Y / X):</span>
                      <span className="font-semibold text-slate-800">{Math.round(descLayer.y)}% / {Math.round(descLayer.x)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Độ rộng / Cỡ chữ:</span>
                      <span className="font-semibold text-slate-800">{Math.round(descLayer.width || 80)}% / {descLayer.fontSize || 28}px</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSavePresetModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingPreset || !presetNameInput.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {savingPreset ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" /> Lưu vào CSDL
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Result Modal (Synchronized custom UI, no browser alert) */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-fadeIn">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                {exportResult ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {exportResult ? 'Xuất ảnh thành công!' : 'Thông báo xuất ảnh'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                    {exportResult ? 'Đã khởi tạo tệp ảnh chuẩn nét từ Canvas' : 'Chưa thể hoàn tất thao tác'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5">
              {exportResult ? (
                <div className="space-y-4">
                  {/* Thumbnail Image Box */}
                  <div className="relative bg-slate-100 rounded-xl p-2.5 flex items-center justify-center border border-slate-200/80 overflow-hidden group">
                    <img 
                      src={exportResult.dataUrl} 
                      alt="Bản xem trước ảnh xuất" 
                      className="max-h-52 w-auto object-contain rounded-lg shadow-sm border border-slate-200/60"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenInNewTab}
                        className="bg-white/95 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg hover:bg-white flex items-center gap-1.5 transition transform active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Xem ảnh gốc
                      </button>
                    </div>
                  </div>

                  {/* Specification details */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Tên tệp:</span>
                      <span className="font-mono font-semibold text-slate-800 text-[11px] max-w-[210px] truncate" title={exportResult.fileName}>
                        {exportResult.fileName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Độ phân giải:</span>
                      <span className="font-semibold text-slate-800">{exportResult.width} × {exportResult.height} px</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Định dạng / Dung lượng:</span>
                      <span className="font-semibold text-slate-800">
                        PNG • ~{Math.max(1, Math.round(exportResult.blob.size / 1024))} KB
                      </span>
                    </div>
                  </div>

                  {/* Auto-download notice */}
                  <div className="flex items-start gap-2 bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 text-xs text-emerald-800">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Tệp ảnh đã được tự động lưu về máy của bạn. Nếu trình duyệt chặn tải tự động, bạn có thể bấm nút <b>Tải lại ảnh</b> bên dưới.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 leading-relaxed">
                    <p className="font-semibold mb-1">Chi tiết sự cố:</p>
                    <p>{exportError || 'Có lỗi không xác định xảy ra khi kết xuất hình ảnh.'}</p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    💡 <b>Gợi ý:</b> Nếu bạn đang sử dụng hình ảnh từ các trang web bên ngoài bị giới hạn bản quyền hoặc chính sách CORS, hãy thử tải trực tiếp ảnh từ máy tính hoặc kho media nội bộ.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/40">
              {exportResult && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-slate-200 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Xem tab mới</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadAgain}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải lại ảnh</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                  exportResult
                    ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                    : 'text-white bg-slate-800 hover:bg-slate-900'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{exportResult ? 'Hoàn tất' : 'Đã hiểu'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
      
      <style>{`
        .editor-dots-bg {
          background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
          background-size: 20px 20px;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
