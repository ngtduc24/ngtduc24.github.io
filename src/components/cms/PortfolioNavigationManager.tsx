import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, BookOpen, Boxes, BriefcaseBusiness, ChevronDown, ChevronRight,
  Compass, Edit3, ExternalLink, Eye, EyeOff, FileText, FolderGit2, GraduationCap, GripVertical,
  Globe2, Home, Image, Layout, Library, Link as LinkIcon, Mail, MapPin, Monitor,
  Newspaper, Phone, Plus, Presentation, RotateCcw, Smartphone, Sparkles, Trash2, Undo2, User,
  Video
} from 'lucide-react';
import { PortfolioNavigation, PortfolioGlobalSettings } from '../portfolioTypes';
import {
  DEFAULT_PORTFOLIO_NAVIGATION,
  getPortfolioNavigation,
  savePortfolioNavigation,
  getPortfolioGlobalSettings,
  savePortfolioGlobalSettings
} from '../../lib/portfolioData';
import { useConfirmation } from '../ConfirmationContext';
import { useNotifications } from '../NotificationContext';

type DevicePreview = 'desktop' | 'mobile';
type SaveState = 'idle' | 'saving' | 'synced' | 'local';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  User,
  Boxes,
  GraduationCap,
  Briefcase: BriefcaseBusiness,
  FolderGit2,
  BookOpen: FileText,
  FileText,
  Presentation,
  Mail,
  Link: LinkIcon
  ,Newspaper
  ,Video
  ,Library
  ,Image
  ,Globe2
  ,Phone
  ,MapPin
  ,Sparkles
  ,Layout
};

const iconOptions = Object.keys(iconMap);
const sectionOptions = ['#banner', '#skills', '#about', '#education', '#experience', '#projects', '#courses', '#research', '#lectures', '#contact'];

const cloneItems = (items: PortfolioNavigation[]) => items.map(item => ({ ...item }));

const withNavigationMetadata = (items: PortfolioNavigation[]) => items.map(item => ({
  ...item,
  kind: item.kind || (item.link.startsWith('#') ? 'scroll' as const : 'external' as const),
  locked: item.locked ?? item.link.startsWith('#')
}));

const kindLabels: Record<NonNullable<PortfolioNavigation['kind']>, string> = {
  scroll: 'Mục cuộn mặc định',
  article: 'Trang bài viết',
  course: 'Trang khóa học online',
  project: 'Trang dự án Design',
  external: 'Liên kết bên ngoài'
};

const normalizeOrders = (items: PortfolioNavigation[]) => {
  const parentKeys = Array.from(new Set(items.map(item => item.parentId || 'root')));
  const orderMap = new Map<string, number>();
  parentKeys.forEach(parentKey => {
    items
      .filter(item => (item.parentId || 'root') === parentKey)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((item, index) => orderMap.set(item.id, index + 1));
  });
  return items.map(item => ({ ...item, sortOrder: orderMap.get(item.id) || 1 }));
};

const flattenForDisplay = (items: PortfolioNavigation[]) => {
  const roots = items.filter(item => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  return roots.flatMap(root => [
    root,
    ...items.filter(item => item.parentId === root.id).sort((a, b) => a.sortOrder - b.sortOrder)
  ]);
};

const isValidLink = (link: string) =>
  /^#[A-Za-z][\w-]*$/.test(link) ||
  /^\/(?!\/)/.test(link) ||
  /^(https?:\/\/|mailto:|tel:)/i.test(link);

const createNavigationDraft = (items: PortfolioNavigation[]): PortfolioNavigation => ({
  id: `nav_${Date.now()}`,
  label: '',
  link: '',
  target: '_self',
  icon: 'Newspaper',
  parentId: null,
  sortOrder: items.filter(item => !item.parentId).length + 1,
  visible: true,
  highlight: false,
  deviceVisibility: 'all',
  kind: 'article',
  locked: false
});

export default function PortfolioNavigationManager() {
  const [items, setItems] = useState<PortfolioNavigation[]>([]);
  const [globalSettings, setGlobalSettings] = useState<PortfolioGlobalSettings | null>(null);
  const [editing, setEditing] = useState<PortfolioNavigation | null>(null);
  const [history, setHistory] = useState<PortfolioNavigation[][]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  const { confirm } = useConfirmation();
  const { addNotification } = useNotifications();
  const [previewDevice, setPreviewDevice] = useState<DevicePreview>('desktop');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  useEffect(() => {
    getPortfolioNavigation()
      .then(data => {
        const normalizedItems = normalizeOrders(withNavigationMetadata(data));
        setItems(normalizedItems);
        setEditing(createNavigationDraft(normalizedItems));
      })
      .catch(() => showError('Không thể tải cấu hình menu.'))
      .finally(() => setLoading(false));

    getPortfolioGlobalSettings().then(setGlobalSettings);
  }, []);

  const displayItems = useMemo(() => flattenForDisplay(items), [items]);
  const previewItems = useMemo(() => {
    if (!editing) return items;
    const exists = items.some(item => item.id === editing.id);
    return normalizeOrders(exists ? items.map(item => item.id === editing.id ? editing : item) : [...items, editing]);
  }, [editing, items]);

  const visiblePreviewItems = previewItems
    .filter(item => item.visible && item.deviceVisibility !== (previewDevice === 'desktop' ? 'mobile' : 'desktop'));
  const previewRoots = visiblePreviewItems.filter(item => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const previewMobileItems = previewRoots.flatMap(parent => [
    parent,
    ...visiblePreviewItems.filter(child => child.parentId === parent.id).sort((a, b) => a.sortOrder - b.sortOrder)
  ]);

  function showError(text: string) {
    setError(text);
    addNotification(text, 'error');
    window.setTimeout(() => setError(current => current === text ? '' : current), 3000);
  }

  const persist = async (nextItems: PortfolioNavigation[], text: string, remember = true) => {
    const normalized = normalizeOrders(withNavigationMetadata(nextItems));
    if (remember) setHistory(previous => [...previous.slice(-9), cloneItems(items)]);
    setItems(normalized);
    setSaveState('saving');
    const synced = await savePortfolioNavigation(normalized);
    setSaveState(synced ? 'synced' : 'local');
    addNotification(
      synced ? text : `${text} Dữ liệu đã lưu trên máy nhưng chưa đồng bộ máy chủ.`,
      synced ? 'success' : 'warning'
    );
  };

  const validate = (candidate: PortfolioNavigation) => {
    const label = candidate.label.trim();
    const link = candidate.link.trim();
    if (!label || !link) return 'Vui lòng nhập đầy đủ tên và liên kết.';
    if (!isValidLink(link)) return 'Liên kết phải là section (#about), đường dẫn nội bộ (/...), URL http(s), email hoặc số điện thoại.';
    const duplicateLabel = items.some(item => item.id !== candidate.id && item.parentId === candidate.parentId && item.label.trim().toLowerCase() === label.toLowerCase());
    if (duplicateLabel) return 'Tên menu đã tồn tại trong cùng cấp.';
    const duplicateLink = items.some(item => item.id !== candidate.id && item.parentId === candidate.parentId && item.link.trim().toLowerCase() === link.toLowerCase());
    if (duplicateLink) return 'Liên kết này đã được sử dụng trong cùng cấp.';
    return '';
  };

  const saveEditing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (editing.locked) {
      const current = items.find(item => item.id === editing.id);
      if (!current) return;
      if (editing.parentId === editing.id) {
        showError('Một mục menu không thể làm menu cha của chính nó.');
        return;
      }
      setError('');
      const nextItems = items.map(item => item.id === editing.id
        ? { ...current, parentId: editing.parentId, sortOrder: editing.sortOrder }
        : item);
      await persist(nextItems, 'Đã cập nhật cấp và vị trí menu mặc định.');
      setEditing(createNavigationDraft(nextItems));
      return;
    }
    const createsPage = editing.kind === 'article' || editing.kind === 'course' || editing.kind === 'project';
    const candidate = createsPage
      ? { ...editing, link: `/?portfolio=true&menu=${editing.id}`, contentId: undefined }
      : editing;
    const validationError = validate(candidate);
    if (validationError) {
      showError(validationError);
      return;
    }
    setError('');
    const normalizedEditing = {
      ...candidate,
      label: candidate.label.trim(),
      link: candidate.link.trim(),
      pageDescription: candidate.pageDescription?.trim(),
      icon: candidate.icon || 'Link',
      target: candidate.target || '_self',
      deviceVisibility: candidate.deviceVisibility || 'all'
    };
    const exists = items.some(item => item.id === editing.id);
    const nextItems = exists ? items.map(item => item.id === editing.id ? normalizedEditing : item) : [...items, normalizedEditing];
    await persist(nextItems, exists ? 'Đã cập nhật mục menu.' : 'Đã thêm mục menu.');
    setEditing(createNavigationDraft(nextItems));
  };

  const deleteItem = async (item: PortfolioNavigation) => {
    const children = items.filter(child => child.parentId === item.id);
    const note = children.length ? ` Mục này có ${children.length} menu con; các menu con sẽ được chuyển lên cấp chính.` : '';
    if (!(await confirm({ title: 'Xác nhận xóa mục menu', message: `Bạn có chắc chắn muốn xóa mục “${item.label}”?${note}`, confirmText: 'Xóa' }))) return;
    const next = items
      .filter(value => value.id !== item.id)
      .map(value => value.parentId === item.id ? { ...value, parentId: null } : value);
    await persist(next, 'Đã xóa mục menu.');
    if (editing?.id === item.id) setEditing(createNavigationDraft(next));
  };

  const toggleVisibility = (item: PortfolioNavigation) =>
    persist(items.map(value => value.id === item.id ? { ...value, visible: !value.visible } : value), item.visible ? 'Đã ẩn mục menu.' : 'Đã hiển thị mục menu.');

  const moveWithinLevel = (item: PortfolioNavigation, direction: 'up' | 'down') => {
    const siblings = items.filter(value => value.parentId === item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex(value => value.id === item.id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= siblings.length) return;
    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    const order = new Map(siblings.map((value, idx) => [value.id, idx + 1]));
    persist(items.map(value => order.has(value.id) ? { ...value, sortOrder: order.get(value.id)! } : value), 'Đã cập nhật thứ tự menu.');
  };

  const dropOnItem = (target: PortfolioNavigation) => {
    if (!draggedId || draggedId === target.id) return setDraggedId(null);
    const dragged = items.find(item => item.id === draggedId);
    if (!dragged) return setDraggedId(null);
    if (dragged.parentId !== target.parentId) {
      showError('Chỉ có thể kéo thả trong cùng một cấp menu. Để đổi cấp, hãy chỉnh trường Menu cha.');
      return setDraggedId(null);
    }
    const siblings = items.filter(item => item.parentId === target.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const from = siblings.findIndex(item => item.id === dragged.id);
    const to = siblings.findIndex(item => item.id === target.id);
    const [moved] = siblings.splice(from, 1);
    siblings.splice(to, 0, moved);
    const order = new Map(siblings.map((item, index) => [item.id, index + 1]));
    setDraggedId(null);
    setError('');
    persist(items.map(item => order.has(item.id) ? { ...item, sortOrder: order.get(item.id)! } : item), 'Đã cập nhật thứ tự menu.');
  };

  const undo = async () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory(values => values.slice(0, -1));
    await persist(previous, 'Đã hoàn tác thay đổi gần nhất.', false);
    setEditing(createNavigationDraft(previous));
  };

  const handleGlobalSettingsChange = async (next: Partial<PortfolioGlobalSettings>) => {
    if (!globalSettings) return;
    const updated = { ...globalSettings, ...next };
    setGlobalSettings(updated);
    setSaveState('saving');
    const synced = await savePortfolioGlobalSettings(updated);
    setSaveState(synced ? 'synced' : 'local');
    addNotification(synced ? 'Đã lưu cài đặt giao diện menu.' : 'Lỗi đồng bộ cài đặt.', synced ? 'success' : 'error');
  };

  const resetDefaults = async () => {
    if (!(await confirm({ title: 'Khôi phục menu mặc định', message: 'Khôi phục toàn bộ menu mặc định? Bạn có thể dùng Hoàn tác ngay sau thao tác này.', confirmText: 'Khôi phục' }))) return;
    await persist(cloneItems(DEFAULT_PORTFOLIO_NAVIGATION), 'Đã khôi phục menu mặc định.');
    setEditing(createNavigationDraft(DEFAULT_PORTFOLIO_NAVIGATION));
  };

  if (loading) return <div className="p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Đang tải cấu hình menu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span className={`h-2 w-2 rounded-full ${saveState === 'local' ? 'bg-amber-500' : saveState === 'saving' ? 'animate-pulse bg-blue-500' : 'bg-emerald-500'}`} />
          <span className={saveState === 'local' ? 'text-amber-700' : 'text-slate-500'}>
            {saveState === 'saving' ? 'Đang lưu...' : saveState === 'local' ? 'Đã lưu cục bộ — chưa đồng bộ' : 'Dữ liệu đã sẵn sàng'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={undo} disabled={!history.length} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-xs disabled:opacity-40"><Undo2 className="h-4 w-4" /> Hoàn tác</button>
          <button type="button" onClick={resetDefaults} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-xs"><RotateCcw className="h-4 w-4" /> Menu mặc định</button>
        </div>
      </div>

      {globalSettings && (
        <section className="rounded-2xl bg-white p-5 shadow-xs border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800">Cài đặt giao diện Menu</h3>
              <p className="mt-1 text-[10px] text-slate-500">Chỉnh độ trong suốt và hiệu ứng kính cho thanh menu và các khối thông tin liên quan.</p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Độ trong suốt</span>
                  <span className="text-[10px] font-black text-brand">{globalSettings.menuOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={globalSettings.menuOpacity}
                  onChange={(e) => handleGlobalSettingsChange({ menuOpacity: parseInt(e.target.value) })}
                  className="w-32 accent-brand"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative inline-flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={globalSettings.menuGlassEffect}
                    onChange={(e) => handleGlobalSettingsChange({ menuGlassEffect: e.target.checked })}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                </div>
                <span className="text-[10px] font-bold uppercase text-slate-500 group-hover:text-slate-800 transition-colors">Hiệu ứng kính (Glassmorphism)</span>
              </label>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-7 xl:grid-cols-12">
        <section className="space-y-4 rounded-2xl bg-slate-50 p-5 sm:p-6 xl:order-2 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-base font-black text-slate-800">Danh sách menu ({items.length})</h3><p className="mt-1 text-[11px] text-slate-500">Kéo thả hoặc dùng mũi tên để sắp xếp trong cùng cấp.</p></div>
            <button type="button" onClick={() => { setError(''); setEditing(createNavigationDraft(items)); }} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-hover"><Plus className="h-4 w-4" /> Thêm mục menu</button>
          </div>

          <div className="space-y-2">
            {!displayItems.length && <div className="py-12 text-center text-xs font-bold text-slate-400">Menu hiện đang trống.</div>}
            {displayItems.map(item => {
              const Icon = iconMap[item.icon] || LinkIcon;
              const siblings = items.filter(value => value.parentId === item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
              const siblingIndex = siblings.findIndex(value => value.id === item.id);
              return (
                <article key={item.id} draggable onDragStart={() => setDraggedId(item.id)} onDragEnd={() => setDraggedId(null)} onDragOver={event => event.preventDefault()} onDrop={() => dropOnItem(item)} className={`flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-xs transition ${item.parentId ? 'ml-5' : ''} ${draggedId === item.id ? 'opacity-50 ring-2 ring-brand/30' : ''}`}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.visible ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-400'}`}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate text-xs text-slate-800">{item.parentId && <ChevronRight className="mr-1 inline h-3 w-3" />}{item.label}</strong>{item.locked && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-slate-500">Mặc định</span>}{item.highlight && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-700">Nổi bật</span>}{!item.visible && <span className="rounded bg-slate-100 px-1.5 text-[8px] font-bold uppercase text-slate-400">Ẩn</span>}</div><p className="truncate text-[10px] font-semibold text-slate-400">{kindLabels[item.kind || 'external']} • {item.link}{item.target === '_blank' ? ' ↗' : ''}</p></div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label="Di chuyển lên" disabled={siblingIndex === 0} onClick={() => moveWithinLevel(item, 'up')} className="rounded-lg bg-slate-50 p-1.5 disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Di chuyển xuống" disabled={siblingIndex === siblings.length - 1} onClick={() => moveWithinLevel(item, 'down')} className="rounded-lg bg-slate-50 p-1.5 disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label={item.visible ? 'Ẩn mục menu' : 'Hiển thị mục menu'} onClick={() => toggleVisibility(item)} className="rounded-lg bg-slate-50 p-1.5 disabled:opacity-25">{item.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                    <button type="button" aria-label="Chỉnh sửa" title="Chỉnh sửa" onClick={() => { setError(''); setEditing({ ...item }); }} className="rounded-lg bg-slate-50 p-1.5 text-brand"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Xóa mục menu" onClick={() => deleteItem(item)} className="rounded-lg bg-rose-50 p-1.5 text-rose-500 disabled:bg-slate-50 disabled:text-slate-300"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-5 xl:order-1 xl:col-span-5">
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-sm font-black">Xem trước menu</h3><p className="mt-1 text-[10px] text-slate-400">Hiển thị cả thay đổi chưa lưu.</p></div><div className="flex rounded-xl bg-white/10 p-1"><button type="button" aria-label="Xem trước desktop" onClick={() => setPreviewDevice('desktop')} className={`rounded-lg p-2 ${previewDevice === 'desktop' ? 'bg-white text-brand' : 'text-slate-300'}`}><Monitor className="h-4 w-4" /></button><button type="button" aria-label="Xem trước mobile" onClick={() => setPreviewDevice('mobile')} className={`rounded-lg p-2 ${previewDevice === 'mobile' ? 'bg-white text-brand' : 'text-slate-300'}`}><Smartphone className="h-4 w-4" /></button></div></div>
            {previewDevice === 'desktop' ? <div className="flex flex-wrap items-center gap-1 rounded-xl bg-white p-2">{previewRoots.map(item => { const Icon = iconMap[item.icon] || LinkIcon; const children = visiblePreviewItems.filter(child => child.parentId === item.id); return <span key={item.id} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[10px] font-bold ${item.highlight ? 'bg-emerald-600 text-white' : 'text-slate-700'}`}><Icon className="h-3 w-3" />{item.label}{children.length > 0 && <ChevronDown className="h-3 w-3" />}</span>; })}{!previewRoots.length && <span className="p-2 text-[10px] text-slate-400">Không có menu hiển thị</span>}</div> : <div className="mx-auto max-w-[260px] space-y-1 rounded-2xl bg-white p-3">{previewMobileItems.map(item => { const Icon = iconMap[item.icon] || LinkIcon; return <div key={item.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold ${item.parentId ? 'ml-4 text-slate-500' : 'text-slate-700'} ${item.highlight ? 'bg-emerald-600 text-white' : ''}`}><Icon className="h-3 w-3" />{item.label}</div>; })}{!previewMobileItems.length && <span className="block p-2 text-center text-[10px] text-slate-400">Không có menu hiển thị</span>}</div>}
            <button type="button" onClick={() => window.open('/?portfolio=true', '_blank', 'noopener,noreferrer')} className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300">Mở trang Portfolio <ExternalLink className="h-3 w-3" /></button>
          </div>

          {editing ? (
            <form onSubmit={saveEditing} className="space-y-4 rounded-2xl bg-slate-50 p-5 sm:p-6">
              <div><h3 className="text-sm font-black text-slate-800">{items.some(item => item.id === editing.id) ? 'Chỉnh sửa mục menu' : 'Thêm mục menu mới'}</h3><p className="mt-1 text-[10px] text-slate-500">Bản xem trước phía trên cập nhật ngay khi nhập.</p></div>
              <label className="block space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Tên hiển thị *</span><input required value={editing.label} onChange={event => setEditing({ ...editing, label: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-brand" /></label>
              <label className="block space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Dạng trang</span><select value={editing.kind || 'article'} onChange={event => { const kind = event.target.value as NonNullable<PortfolioNavigation['kind']>; setEditing({ ...editing, kind, contentId: undefined, link: kind === 'external' ? 'https://' : '' }); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-brand"><option value="scroll">Cuộn đến phần (Trang chủ)</option><option value="article">Trang bài viết</option><option value="course">Trang khóa học / học online</option><option value="project">Trang dự án Design</option><option value="external">Nhập link liên kết</option></select><span className="block text-[9px] leading-4 text-slate-400">Khi lưu dạng Bài viết, Khóa học hoặc Dự án, hệ thống tự tạo một trang chuyên mục mới và menu sẽ mở trang đó.</span></label>

              {editing.kind !== 'external' && editing.kind !== 'scroll' && <label className="block space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Mô tả trang</span><textarea rows={3} value={editing.pageDescription || ''} onChange={event => setEditing({ ...editing, pageDescription: event.target.value })} placeholder="Giới thiệu ngắn cho trang chuyên mục..." className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 outline-none focus:border-brand" /></label>}
              {(editing.kind === 'external' || editing.kind === 'scroll') && <label className="block space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Link liên kết</span><input required value={editing.link} onChange={event => setEditing({ ...editing, link: event.target.value })} placeholder="https://example.com hoặc #tên-phần" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-brand" /></label>}

              <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Cấp menu</span><select value={editing.parentId ? 'child' : 'root'} onChange={event => { const nextParentId = event.target.value === 'child' ? items.find(item => item.id !== editing.id && !item.parentId)?.id || null : null; setEditing({ ...editing, parentId: nextParentId, sortOrder: items.filter(item => item.parentId === nextParentId && item.id !== editing.id).length + 1 }); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold"><option value="root">Menu cha / cấp chính</option><option value="child">Menu con</option></select></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Menu cha</span><select disabled={!editing.parentId} value={editing.parentId || ''} onChange={event => setEditing({ ...editing, parentId: event.target.value || null, sortOrder: items.filter(item => item.parentId === (event.target.value || null) && item.id !== editing.id).length + 1 })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-400"><option value="">Không có</option>{items.filter(item => item.id !== editing.id && !item.parentId).map(item => <option key={item.id} value={item.id}>{item.label}{item.locked ? ' (mặc định)' : ''}</option>)}</select></label></div>
              <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Mở liên kết</span><select value={editing.target} onChange={event => setEditing({ ...editing, target: event.target.value as '_self' | '_blank' })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold"><option value="_self">Cùng cửa sổ</option><option value="_blank">Tab mới</option></select></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-500">Thiết bị</span><select value={editing.deviceVisibility || 'all'} onChange={event => setEditing({ ...editing, deviceVisibility: event.target.value as 'all' | 'desktop' | 'mobile' })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold"><option value="all">Mọi thiết bị</option><option value="desktop">Chỉ desktop</option><option value="mobile">Chỉ mobile</option></select></label></div>

              <fieldset className="space-y-2"><legend className="text-[10px] font-bold uppercase text-slate-500">Biểu tượng menu</legend><div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-xl bg-white p-2 scrollbar-thin sm:grid-cols-4 xl:grid-cols-5">{iconOptions.map(icon => { const Icon = iconMap[icon] || LinkIcon; return <button key={icon} type="button" onClick={() => setEditing({ ...editing, icon })} title={icon} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg p-2 text-[8px] font-bold transition ${editing.icon === icon ? 'bg-brand text-white' : 'bg-slate-50 text-slate-500 hover:bg-brand-light hover:text-brand'}`}><Icon className="h-4 w-4" /><span className="w-full truncate">{icon}</span></button>; })}</div></fieldset>
              {!editing.locked && <div className="grid grid-cols-2 gap-3"><label className="flex items-center justify-between rounded-xl bg-white p-3 text-[11px] font-bold text-slate-700">Hiển thị <input type="checkbox" checked={editing.visible} onChange={event => setEditing({ ...editing, visible: event.target.checked })} /></label><label className="flex items-center justify-between rounded-xl bg-white p-3 text-[11px] font-bold text-slate-700">Nút nổi bật <input type="checkbox" checked={!!editing.highlight} onChange={event => setEditing({ ...editing, highlight: event.target.checked })} /></label></div>}
              {error && <p className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-600">{error}</p>}
              <div className="flex gap-2"><button type="button" onClick={() => { setEditing(createNavigationDraft(items)); setError(''); }} className="flex-1 rounded-xl bg-white py-2.5 text-xs font-bold text-slate-600">Làm mới</button><button type="submit" className="flex-1 rounded-xl bg-brand py-2.5 text-xs font-bold text-white">{editing.locked ? 'Lưu cấp menu' : 'Lưu mục menu'}</button></div>
            </form>
          ) : <div className="rounded-2xl bg-slate-50 p-7 text-center"><Compass className="mx-auto h-9 w-9 text-brand" /><h3 className="mt-3 text-sm font-black text-slate-800">Chọn một mục để chỉnh sửa</h3><p className="mt-2 text-[11px] text-slate-500">Hoặc kéo thả trực tiếp trong danh sách để đổi thứ tự.</p></div>}

        </section>
      </div>
    </div>
  );
}
