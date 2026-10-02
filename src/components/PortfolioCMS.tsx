import { PageHeader, Button } from './ui';
import React, { useEffect, useRef, useState } from 'react';
import {
  Eye,
  User,
  Compass,
  Globe,
  Link2,
  Loader2,
  Check,
  Copy,
  EyeOff,
  Trash2,
  AlertTriangle,
  PenSquare,
  ListChecks,
  Settings2,
  Sparkles,
  Search,
  Newspaper,
  Folder,
  Award,
  FolderKanban
} from 'lucide-react';
import BannerAboutCMS from './cms/BannerAboutCMS';
import ProjectsCoursesCMS from './cms/ProjectsCoursesCMS';
import PortfolioNavigationManager from './cms/PortfolioNavigationManager';
import PortfolioContentManager from './cms/PortfolioContentManager';
import PortfolioResearchCMS from './cms/PortfolioResearchCMS';
import CloudinaryUploadField from './cms/CloudinaryUploadField';
import {
  setSiteOwner, getSiteOfOwner, getSiteBySlug, claimSiteSlug, setSitePublished, normalizeSlug, SiteRecord, SiteInfo,
  deleteMyWebsite, createSite, updateSiteInfo, SLUG_RE, RESERVED_SLUGS, setSiteProjects, setSiteProjectsEnabled, LEGACY_OWNER
} from '../lib/portfolioData';
import { copyText } from './ui/Dialogs';

// Ứng dụng Website. Lần đầu vào (chưa có Website) chỉ hiện bước tạo trang: tên, địa chỉ, mô tả,
// biểu tượng, ảnh chia sẻ và từ khoá để trang lên công cụ tìm kiếm tốt. Tạo xong mới hiện các mục
// Đăng bài, Quản lý bài, Menu, Hồ sơ và Cài đặt web.

type Division = 'post' | 'manage' | 'navigation' | 'profile' | 'settings';
type ManageTab = 'posts' | 'projects' | 'research';

const DIVISIONS: Array<{ id: Division; title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'post', title: 'Đăng bài', description: 'Soạn và đăng bài viết hoặc dự án lên Website', icon: PenSquare },
  { id: 'manage', title: 'Quản lý bài', description: 'Xem, sửa, ẩn hoặc xoá các bài đã đăng', icon: ListChecks },
  { id: 'navigation', title: 'Menu', description: 'Menu chính, menu con và liên kết điều hướng của Website', icon: Compass },
  { id: 'profile', title: 'Hồ sơ', description: 'Banner, giới thiệu, học vấn, kinh nghiệm và kỹ năng', icon: User },
  { id: 'settings', title: 'Cài đặt web', description: 'Tên, mô tả, biểu tượng, SEO, địa chỉ, hiển thị và xoá Website', icon: Settings2 },
];

const MANAGE_TABS: Array<{ id: ManageTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'posts', label: 'Bài viết', icon: Newspaper },
  { id: 'projects', label: 'Dự án', icon: Folder },
  { id: 'research', label: 'Nghiên cứu', icon: Award },
];

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand focus:bg-white';
const DESC_MAX = 160;

function Field({ label, hint, children, extra }: { label: string; hint?: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[13px] font-semibold text-slate-600">{label}</label>
        {extra}
      </div>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Kiểm tra địa chỉ: đúng dạng, không trùng địa chỉ hệ thống và chưa có người khác dùng.
function useSlugCheck(uid: string, slug: string, current?: string) {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (!slug) { setState(null); return; }
    if (!SLUG_RE.test(slug)) { setState({ ok: false, text: 'Cần 3 đến 40 ký tự, chữ thường không dấu, số và dấu gạch nối.' }); return; }
    if (RESERVED_SLUGS.has(slug)) { setState({ ok: false, text: 'Địa chỉ này hệ thống đã dùng, hãy chọn địa chỉ khác.' }); return; }
    if (slug === current) { setState({ ok: true, text: 'Đây là địa chỉ hiện tại của bạn.' }); return; }
    setState({ ok: true, text: 'Đang kiểm tra...' });
    const t = setTimeout(() => {
      getSiteBySlug(slug).then(rec => setState(rec && rec.owner !== uid
        ? { ok: false, text: 'Địa chỉ này đã có người dùng, hãy chọn địa chỉ khác.' }
        : { ok: true, text: 'Địa chỉ dùng được.' })).catch(() => setState(null));
    }, 400);
    return () => clearTimeout(t);
  }, [uid, slug, current]);
  return state;
}

// Ô nhập thông tin Website, dùng chung cho bước tạo trang và mục Cài đặt web.
function SiteInfoFields({ info, onChange }: { info: SiteInfo; onChange: (v: SiteInfo) => void }) {
  const desc = info.description || '';
  return (
    <div className="space-y-5">
      <Field label="Tên Website" hint="Hiện ở đầu trang, trên thẻ trình duyệt và trong kết quả tìm kiếm. Nên dưới 60 ký tự.">
        <input value={info.title || ''} onChange={e => onChange({ ...info, title: e.target.value })} placeholder="Ví dụ: Nguyễn Trọng Đức, Thiết kế và Truyền thông" className={inputCls} maxLength={80} />
      </Field>
      <Field label="Mô tả ngắn" hint="Đoạn giới thiệu hiện dưới tên trang khi tìm trên Google và khi chia sẻ link."
        extra={<span className={`text-xs ${desc.length > DESC_MAX ? 'font-semibold text-amber-600' : 'text-slate-400'}`}>{desc.length}/{DESC_MAX}</span>}>
        <textarea value={desc} onChange={e => onChange({ ...info, description: e.target.value })} rows={3} placeholder="Giảng viên truyền thông đa phương tiện, chia sẻ dự án thiết kế, bài giảng và nghiên cứu." className={`${inputCls} resize-none`} />
      </Field>
      <Field label="Từ khoá" hint="Các từ người khác hay gõ để tìm bạn, cách nhau bằng dấu phẩy.">
        <input value={info.keywords || ''} onChange={e => onChange({ ...info, keywords: e.target.value })} placeholder="thiết kế đồ hoạ, truyền thông đa phương tiện, giảng viên" className={inputCls} />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <CloudinaryUploadField label="Biểu tượng (icon)" value={info.icon || ''} onChange={url => onChange({ ...info, icon: url })} folder="website" resourceType="image" hint="Ảnh vuông, tối thiểu 192 x 192 px." compact />
        <CloudinaryUploadField label="Ảnh chia sẻ" value={info.ogImage || ''} onChange={url => onChange({ ...info, ogImage: url })} folder="website" resourceType="image" hint="Ảnh ngang 1200 x 630 px, hiện khi gửi link qua Zalo, Facebook." compact />
      </div>
    </div>
  );
}

// Xem trước trang trên Google và khi chia sẻ link.
function SitePreview({ info, slug }: { info: SiteInfo; slug: string }) {
  const host = window.location.host;
  const title = info.title || 'Tên Website của bạn';
  const desc = info.description || 'Mô tả ngắn về Website sẽ hiện ở đây.';
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Search className="h-3.5 w-3.5" /> Trên Google</p>
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-100 bg-slate-50">
            {info.icon ? <img src={info.icon} alt="" className="h-full w-full object-cover" /> : <Globe className="h-4 w-4 text-slate-400" />}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] text-slate-700">{title}</p>
            <p className="truncate text-xs text-slate-500">{host} › {slug || 'ten-cua-ban'}</p>
          </div>
        </div>
        <p className="mt-2 line-clamp-1 text-lg text-[#1a0dab]">{title}</p>
        <p className="line-clamp-2 text-[13px] leading-5 text-slate-600">{desc}</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <p className="flex items-center gap-1.5 px-4 pt-3 text-xs font-semibold text-slate-500"><Link2 className="h-3.5 w-3.5" /> Khi chia sẻ link</p>
        <div className="m-4 overflow-hidden rounded-xl border border-slate-100">
          <div className="aspect-[1200/630] bg-slate-100">
            {info.ogImage ? <img src={info.ogImage} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-slate-400">Chưa có ảnh chia sẻ</div>}
          </div>
          <div className="bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] uppercase text-slate-400">{host}</p>
            <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
            <p className="line-clamp-1 text-xs text-slate-500">{desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Công tắc bật tắt, cùng kiểu ở bước tạo trang và Cài đặt web.
function Switch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-brand' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

// Ô chọn trang Dự án: Website mới luôn có bài viết, Dự án là phần thêm, tắt khi chỉ muốn trang dạng blog.
function ProjectsOption({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand"><FolderKanban className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">Trang Dự án</p>
          <p className="mt-0.5 text-xs text-slate-500">{on ? 'Đang bật. Trang có thêm mục Dự án để đăng các dự án cá nhân.' : 'Đang tắt. Website chỉ đăng bài như một trang blog, tin tức.'}</p>
        </div>
      </div>
      <Switch on={on} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// Bước tạo Website lần đầu.
function SiteSetup({ uid, defaultTitle, onCreated }: { uid: string; defaultTitle: string; onCreated: (rec: SiteRecord) => void }) {
  const [info, setInfo] = useState<SiteInfo>({ title: defaultTitle, description: '', keywords: '', icon: '', ogImage: '' });
  const [slug, setSlug] = useState(normalizeSlug(defaultTitle));
  const slugTouched = useRef(false);
  const [published, setPublished] = useState(true);
  const [projects, setProjects] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const check = useSlugCheck(uid, slug);
  const setTitle = (v: SiteInfo) => { setInfo(v); if (!slugTouched.current) setSlug(normalizeSlug(v.title || '')); };
  const ready = !!(info.title || '').trim() && !!(info.description || '').trim() && !!check?.ok && check.text !== 'Đang kiểm tra...';
  const submit = async () => {
    setSaving(true); setErr('');
    const e = await createSite(uid, slug, { ...info, title: (info.title || '').trim(), description: (info.description || '').trim(), published, projects });
    if (e) { setErr(e); setSaving(false); return; }
    const rec = await getSiteOfOwner(uid).catch(() => null);
    setSaving(false);
    if (rec) onCreated(rec); else setErr('Đã tạo nhưng chưa tải lại được, hãy mở lại ứng dụng.');
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-light text-brand"><Sparkles className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Tạo Website của bạn</h2>
            <p className="mt-1 text-[13px] text-slate-500">Điền thông tin cơ bản để trang có địa chỉ riêng và dễ tìm thấy trên Google. Mọi thông tin đều sửa lại được trong Cài đặt web. Mỗi tài khoản có 1 Website.</p>
          </div>
        </div>
        <SiteInfoFields info={info} onChange={setTitle} />
        <Field label="Địa chỉ trang">
          <div className="flex min-w-0 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-brand focus-within:bg-white">
            <span className="shrink-0 pl-3.5 text-sm text-slate-500">{window.location.host}/</span>
            <input value={slug} onChange={e => { slugTouched.current = true; setSlug(normalizeSlug(e.target.value)); }} placeholder="ten-cua-ban" className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-slate-800 outline-none" />
          </div>
          {check && <p className={`text-xs font-semibold ${check.ok ? 'text-brand' : 'text-rose-600'}`}>{check.text}</p>}
        </Field>
        <Field label="Nội dung của trang" hint="Website luôn có phần đăng bài. Menu và các trang chuyên mục bạn tự thêm trong mục Menu sau khi tạo.">
          <ProjectsOption on={projects} onChange={setProjects} />
        </Field>
        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-700">
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
          <span>Cho mọi người xem trang ngay sau khi tạo. Bỏ chọn nếu muốn soạn xong nội dung rồi mới mở.</span>
        </label>
        {err && <p className="text-[13px] font-semibold text-rose-600">{err}</p>}
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <Button icon={saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} disabled={!ready || saving} onClick={submit}>Tạo Website</Button>
        </div>
      </section>
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <p className="text-[13px] font-semibold text-slate-600">Xem trước</p>
        <SitePreview info={info} slug={slug} />
      </aside>
    </div>
  );
}

// Mục Cài đặt web: thông tin và SEO, địa chỉ, hiển thị, xoá Website.
function SiteSettings({ uid, site, onChanged, onDeleted }: { uid: string; site: SiteRecord; onChanged: (rec: SiteRecord) => void; onDeleted: (msg: string) => void }) {
  const [info, setInfo] = useState<SiteInfo>({ title: site.title || '', description: site.description || '', keywords: site.keywords || '', icon: site.icon || '', ogImage: site.ogImage || '' });
  const [slug, setSlug] = useState(site.slug);
  const [busy, setBusy] = useState<'' | 'info' | 'slug' | 'pub' | 'proj'>('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const check = useSlugCheck(uid, slug, site.slug);
  const reload = async () => { const rec = await getSiteOfOwner(uid).catch(() => null); if (rec) onChanged(rec); };
  const url = `${window.location.origin}/${site.slug}`;
  const dirty = (['title', 'description', 'keywords', 'icon', 'ogImage'] as const).some(k => (info[k] || '') !== (site[k] || ''));

  const saveInfo = async () => {
    setBusy('info'); setMsg(null);
    const ok = await updateSiteInfo(uid, { ...info, title: (info.title || '').trim(), description: (info.description || '').trim() });
    setMsg(ok ? { tone: 'ok', text: 'Đã lưu thông tin Website.' } : { tone: 'err', text: 'Chưa lưu được, vui lòng thử lại.' });
    if (ok) await reload();
    setBusy('');
  };
  const saveSlug = async () => {
    setBusy('slug'); setMsg(null);
    const e = await claimSiteSlug(uid, slug, info.title);
    setMsg(e ? { tone: 'err', text: e } : { tone: 'ok', text: 'Đã đổi địa chỉ trang. Link cũ không còn dùng được.' });
    if (!e) await reload();
    setBusy('');
  };
  const togglePublish = async () => {
    setBusy('pub');
    await setSitePublished(uid, site.published === false);
    await reload();
    setBusy('');
  };

  const toggleProjects = async (on: boolean) => {
    setBusy('proj'); setMsg(null);
    const ok = await setSiteProjects(uid, on);
    setMsg(ok ? { tone: 'ok', text: on ? 'Đã bật trang Dự án. Mục Dự án có trong Đăng bài, Quản lý bài và Menu.' : 'Đã tắt trang Dự án. Website chỉ còn đăng bài như một trang blog. Các dự án đã đăng vẫn được giữ lại.' } : { tone: 'err', text: 'Chưa lưu được, vui lòng thử lại.' });
    if (ok) await reload();
    setBusy('');
  };
  const card = 'rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6';
  return (
    <div className="space-y-5">
      {msg && <p className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold ${msg.tone === 'ok' ? 'bg-brand-light text-brand' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${card} space-y-5`}>
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-semibold text-slate-800">Thông tin và SEO</h3>
            <p className="mt-1 text-[13px] text-slate-500">Tên, mô tả, biểu tượng và ảnh chia sẻ giúp trang hiện đẹp trên Google và mạng xã hội.</p>
          </div>
          <SiteInfoFields info={info} onChange={setInfo} />
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button icon={busy === 'info' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} disabled={!dirty || !(info.title || '').trim() || busy !== ''} onClick={saveInfo}>Lưu thông tin</Button>
          </div>
        </section>
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <p className="text-[13px] font-semibold text-slate-600">Xem trước</p>
          <SitePreview info={info} slug={site.slug} />
        </aside>
      </div>

      <section className={`${card} space-y-4`}>
        <div>
          <h3 className="text-base font-semibold text-slate-800">Nội dung của trang</h3>
          <p className="mt-1 text-[13px] text-slate-500">Website luôn có phần đăng bài. Bật trang Dự án khi muốn giới thiệu dự án cá nhân, tắt khi chỉ dùng Website như một trang blog.</p>
        </div>
        <ProjectsOption on={site.projects !== false} onChange={toggleProjects} disabled={busy !== ''} />
      </section>

      <section className={`${card} space-y-4`}>
        <div>
          <h3 className="text-base font-semibold text-slate-800">Địa chỉ và hiển thị</h3>
          <p className="mt-1 text-[13px] text-slate-500">{site.published === false ? 'Trang đang tạm ẩn, người khác mở link sẽ không xem được.' : 'Trang đang hiển thị, ai có link đều xem được.'}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <a href={url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm font-semibold text-brand hover:underline">{url}</a>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => copyText(url).then(ok => setMsg(ok ? { tone: 'ok', text: 'Đã chép link trang.' } : { tone: 'err', text: 'Không chép được link.' }))}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:text-brand"><Copy className="h-4 w-4" /> Chép link</button>
            <button type="button" onClick={togglePublish} disabled={busy !== ''}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:text-brand disabled:opacity-50">{site.published === false ? <><Eye className="h-4 w-4" /> Hiện trang</> : <><EyeOff className="h-4 w-4" /> Tạm ẩn trang</>}</button>
          </div>
        </div>
        <Field label="Đổi địa chỉ trang">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-brand focus-within:bg-white">
              <span className="shrink-0 pl-3.5 text-sm text-slate-500">{window.location.host}/</span>
              <input value={slug} onChange={e => setSlug(normalizeSlug(e.target.value))} className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-slate-800 outline-none" />
            </div>
            <Button variant="outline" icon={busy === 'slug' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} disabled={slug === site.slug || !check?.ok || busy !== ''} onClick={saveSlug}>Đổi địa chỉ</Button>
          </div>
          {check && slug !== site.slug && <p className={`text-xs font-semibold ${check.ok ? 'text-brand' : 'text-rose-600'}`}>{check.text}</p>}
        </Field>
      </section>

      <DeleteSiteZone uid={uid} site={site} onDeleted={onDeleted} />
    </div>
  );
}

interface PortfolioCMSProps {
  currentUser?: { id?: string; role?: string; fullName?: string } | null;
}

// Vùng xoá Website: gõ đúng địa chỉ trang mới bấm xoá được, chọn xoá kèm ảnh và video để giải phóng dung lượng.
function DeleteSiteZone({ uid, site, onDeleted }: { uid: string; site: SiteRecord | null; onDeleted: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [withMedia, setWithMedia] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const word = site?.slug || 'xoa website';
  const run = async () => {
    setBusy(true); setErr('');
    try {
      const r = await deleteMyWebsite(uid, { withMedia });
      let text = 'Đã xoá Website và toàn bộ nội dung của trang.';
      if (withMedia) {
        if (r.mediaError) text += ` Chưa xoá được ảnh, video (${r.mediaError}). Bạn có thể xoá trong Cài đặt, Kho lưu trữ.`;
        else if (r.media) text += ` Đã xoá ${r.media} tệp ảnh, video trên kho lưu trữ.`;
        if (!r.mediaError && r.mediaKept) text += ` ${r.mediaKept} tệp không phải do bạn tải lên nên được giữ lại.`;
      }
      setOpen(false); setTyped('');
      onDeleted(text + ' Bạn có thể tạo Website mới bất cứ lúc nào.');
    } catch (e: any) {
      setErr(e?.message || 'Chưa xoá được Website, vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-700"><Trash2 className="h-4 w-4" /> Xoá Website</p>
          <p className="mt-1 text-xs text-slate-500">Xoá địa chỉ trang, hồ sơ, bài viết, dự án, nghiên cứu, menu và có thể xoá luôn ảnh, video của trang để giải phóng dung lượng.</p>
        </div>
        {!open && (
          <button type="button" onClick={() => { setOpen(true); setErr(''); }}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-[13px] font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /> Xoá Website</button>
        )}
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t border-rose-100 pt-4">
          <p className="flex items-start gap-2 text-[13px] text-rose-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Thao tác này không hoàn tác được. Link trang sẽ ngừng hoạt động và mọi nội dung của trang bị xoá.</p>
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-700">
            <input type="checkbox" checked={withMedia} onChange={e => setWithMedia(e.target.checked)} className="mt-0.5 h-4 w-4 accent-rose-600" />
            <span>Xoá luôn ảnh, video do bạn tải lên đang dùng trong trang. Nếu một ảnh cũng đang dùng ở bài giảng, bài tập hay nơi khác thì ở đó cũng mất ảnh.</span>
          </label>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500">Gõ <span className="font-semibold text-slate-700">{word}</span> để xác nhận</p>
            <input value={typed} onChange={e => setTyped(e.target.value)} placeholder={word}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-400" />
          </div>
          {err && <p className="text-[13px] font-semibold text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setOpen(false); setTyped(''); setErr(''); }} disabled={busy}
              className="inline-flex h-9 items-center rounded-xl bg-slate-100 px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50">Huỷ</button>
            <button type="button" onClick={run} disabled={busy || typed.trim().toLowerCase() !== word}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} {busy ? 'Đang xoá...' : 'Xoá vĩnh viễn'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortfolioCMS({ currentUser }: PortfolioCMSProps = {}) {
  const uid = currentUser?.id || '';
  // Mọi nội dung soạn ở đây thuộc Website của chính tài khoản đang đăng nhập.
  const [ready] = useState(() => { setSiteOwner(uid || null); return true; });
  useEffect(() => { setSiteOwner(uid || null); return () => setSiteOwner(null); }, [uid]);
  const [site, setSite] = useState<SiteRecord | null | undefined>(undefined);
  const [active, setActive] = useState<Division>('post');
  const [manageTab, setManageTab] = useState<ManageTab>('posts');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!uid) { setSite(null); return; }
    getSiteOfOwner(uid).then(setSite).catch(() => setSite(null));
  }, [uid]);
  // Đồng bộ trạng thái trang Dự án cho các mục soạn thảo (Đăng bài, Menu).
  const projectsOn = site?.projects !== false;
  setSiteProjectsEnabled(projectsOn);
  useEffect(() => () => setSiteProjectsEnabled(true), []);
  const manageTabs = MANAGE_TABS.filter(t => t.id !== 'research' && (t.id !== 'projects' || projectsOn));
  const manageCurrent: ManageTab = manageTabs.some(t => t.id === manageTab) ? manageTab : 'posts';
  const info = DIVISIONS.find(d => d.id === active) ?? DIVISIONS[0];
  if (!ready) return null;

  return (
    <div className="space-y-5 animate-fadeIn pb-12 text-slate-800">
      <PageHeader
        icon={<Globe size={22} />}
        title={site?.title || 'Website'}
        description={site ? `${window.location.host}/${site.slug}${site.published === false ? ', đang tạm ẩn' : ''}` : 'Tạo Website với địa chỉ riêng để đăng bài như một trang blog, có thể thêm trang Dự án.'}
        actions={site ? <Button variant="outline" icon={<Eye size={16} />} onClick={() => window.open(`/${site.slug}`, '_blank', 'noopener,noreferrer')}>Xem trang</Button> : undefined}
      />

      {notice && <p className="rounded-xl bg-brand-light px-4 py-2.5 text-[13px] font-semibold text-brand">{notice}</p>}

      {site === undefined ? (
        <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Đang tải...</div>
      ) : site === null ? (
        uid ? <SiteSetup uid={uid} defaultTitle={currentUser?.fullName || ''} onCreated={rec => { setSite(rec); setActive('post'); setNotice('Đã tạo Website. Bạn có thể bắt đầu đăng bài.'); }} /> : null
      ) : (
        <>
          <div className="overflow-x-auto scrollbar-thin">
            <div className="flex w-max gap-1 rounded-2xl bg-slate-100 p-1">
              {DIVISIONS.map(item => {
                const Icon = item.icon; const on = active === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => { setActive(item.id); setNotice(''); }}
                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-semibold transition-all ${on ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Icon className={`h-4 w-4 ${on ? 'text-brand' : ''}`} /> {item.title}
                  </button>
                );
              })}
            </div>
          </div>

          {active === 'settings' ? (
            <SiteSettings key={site.slug} uid={uid} site={site} onChanged={setSite}
              onDeleted={msg => { setSite(null); setActive('post'); setNotice(msg); }} />
          ) : active === 'manage' ? (
            <div className="space-y-4">
              {manageTabs.length > 1 && <div className="flex w-max gap-1 rounded-xl border border-slate-100 bg-white p-1">
                {manageTabs.map(t => {
                  const Icon = t.icon; const on = manageCurrent === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setManageTab(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold ${on ? 'bg-brand-light text-brand' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Icon className="h-4 w-4" /> {t.label}
                    </button>
                  );
                })}
              </div>}
              {manageCurrent === 'posts' && <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><PortfolioContentManager mode="manage" /></section>}
              {manageCurrent === 'projects' && <ProjectsCoursesCMS initialSubTab="projects" showSubTabs={false} />}
              {manageCurrent === 'research' && <PortfolioResearchCMS />}
            </div>
          ) : (
            <section className="min-h-[440px] rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 border-b border-slate-100 pb-4 text-left">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
                  <info.icon className="h-4 w-4 text-brand" /> <span>{info.title}</span>
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">{info.description}</p>
              </div>
              {active === 'post' && <PortfolioContentManager mode="create" />}
              {active === 'navigation' && <PortfolioNavigationManager />}
              {active === 'profile' && <BannerAboutCMS />}
            </section>
          )}
        </>
      )}
    </div>
  );
}
