import { PageHeader, Button } from './ui';
import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Database,
  Eye,
  Folder,
  FolderKanban,
  GraduationCap,
  BookOpen,
  Newspaper,
  RefreshCw,
  Shield,
  User,
  Compass,
  Globe,
  Link2,
  Loader2,
  Check,
  Copy,
  EyeOff
} from 'lucide-react';
import BannerAboutCMS from './cms/BannerAboutCMS';
import ProjectsCoursesCMS from './cms/ProjectsCoursesCMS';
import PortfolioNavigationManager from './cms/PortfolioNavigationManager';
import PortfolioContentManager from './cms/PortfolioContentManager';
import PortfolioResearchCMS from './cms/PortfolioResearchCMS';
import { setSiteOwner, getSiteOfOwner, claimSiteSlug, setSitePublished, normalizeSlug, SiteRecord } from '../lib/portfolioData';
import { copyText } from './ui/Dialogs';

type PortfolioDivision = 'address' | 'profile' | 'content' | 'projects' | 'research' | 'navigation';

const DIVISIONS: Array<{
  id: PortfolioDivision;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'address',
    title: 'Địa chỉ trang',
    description: 'Đặt địa chỉ riêng cho Website, bật tắt hiển thị và chép link chia sẻ',
    icon: Link2
  },
  {
    id: 'content',
    title: 'Bài viết',
    description: 'Chọn dạng nội dung và mở trực tiếp form tạo mới tương ứng',
    icon: Newspaper
  },
  {
    id: 'projects',
    title: 'Dự án',
    description: 'Danh sách dự án Design và case study đã tạo',
    icon: Folder
  },
  {
    id: 'research',
    title: 'Nghiên cứu',
    description: 'Danh sách bài báo và công trình nghiên cứu khoa học',
    icon: Award
  },
  {
    id: 'navigation',
    title: 'Menu',
    description: 'Menu chính, menu con và liên kết điều hướng của Website',
    icon: Compass
  },
  {
    id: 'profile',
    title: 'Hồ sơ',
    description: 'Banner, giới thiệu, học vấn, kinh nghiệm và kỹ năng',
    icon: User
  },
];

interface PortfolioCMSProps {
  currentUser?: { id?: string; role?: string; fullName?: string } | null;
}

// Mục đặt địa chỉ trang: ngtduc24.github.io/<địa chỉ>, bật tắt hiển thị, chép link.
function SiteAddressPanel({ uid, defaultTitle, onSlug }: { uid: string; defaultTitle: string; onSlug: (slug: string) => void }) {
  const [site, setSite] = useState<SiteRecord | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const load = async () => {
    const rec = await getSiteOfOwner(uid).catch(() => null);
    setSite(rec); setDraft(rec?.slug || normalizeSlug(defaultTitle)); onSlug(rec?.slug || ''); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [uid]);
  const preview = normalizeSlug(draft);
  const save = async () => {
    setSaving(true); setMsg(null);
    const err = await claimSiteSlug(uid, preview, defaultTitle);
    if (err) setMsg({ tone: 'err', text: err });
    else { setMsg({ tone: 'ok', text: 'Đã lưu địa chỉ trang.' }); await load(); }
    setSaving(false);
  };
  const togglePublish = async () => {
    if (!site) return;
    await setSitePublished(uid, site.published === false);
    await load();
  };
  const url = site ? `${window.location.origin}/${site.slug}` : '';
  if (loading) return <div className="py-10 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Đang tải...</div>;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-[13px] font-semibold text-slate-600">Địa chỉ trang của bạn</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-brand focus-within:bg-white">
            <span className="shrink-0 pl-3.5 text-sm text-slate-500">{window.location.host}/</span>
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="ten-cua-ban" className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-slate-800 outline-none" />
          </div>
          <button type="button" onClick={save} disabled={saving || !preview || preview === site?.slug}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {site ? 'Đổi địa chỉ' : 'Tạo địa chỉ'}
          </button>
        </div>
        <p className="text-xs text-slate-500">3 đến 40 ký tự, chữ thường không dấu, số và dấu gạch nối. Địa chỉ sẽ là {window.location.host}/{preview || 'ten-cua-ban'}</p>
        {msg && <p className={`text-[13px] font-semibold ${msg.tone === 'ok' ? 'text-brand' : 'text-rose-600'}`}>{msg.text}</p>}
      </div>
      {site && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] text-slate-500">Trang của bạn</p>
            <a href={url} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-brand hover:underline">{url}</a>
            <p className="mt-1 text-xs text-slate-500">{site.published === false ? 'Đang tạm ẩn, người khác mở link sẽ không xem được.' : 'Đang hiển thị, ai có link đều xem được.'}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => copyText(url).then(ok => setMsg(ok ? { tone: 'ok', text: 'Đã chép link trang.' } : { tone: 'err', text: 'Không chép được link.' }))}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:text-brand"><Copy className="h-4 w-4" /> Chép link</button>
            <button type="button" onClick={togglePublish}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:text-brand">{site.published === false ? <><Eye className="h-4 w-4" /> Hiện trang</> : <><EyeOff className="h-4 w-4" /> Tạm ẩn trang</>}</button>
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
  const [activeDivision, setActiveDivision] = useState<PortfolioDivision>('address');
  const [slug, setSlug] = useState('');
  const activeDivisionInfo = DIVISIONS.find(item => item.id === activeDivision) ?? DIVISIONS[0];
  const isContentListDivision = ['projects', 'research'].includes(activeDivision);
  if (!ready) return null;

  return (
    <div className="space-y-5 animate-fadeIn pb-12 text-slate-800">
      <PageHeader
        icon={<Globe size={22} />}
        title="Website"
        description="Tạo trang giới thiệu bản thân với địa chỉ riêng: hồ sơ, dự án, nghiên cứu, bài viết và menu theo ý bạn."
        actions={slug ? <Button variant="outline" icon={<Eye size={16} />} onClick={() => window.open(`/${slug}`, '_blank', 'noopener,noreferrer')}>Xem trang</Button> : undefined}
      />

      {/* Thanh mục, cùng kiểu với các trang khác */}
      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex w-max gap-1 rounded-2xl bg-slate-100 p-1">
          {DIVISIONS.map(item => {
            const Icon = item.icon;
            const on = activeDivision === item.id;
            return (
              <button key={item.id} type="button" onClick={() => setActiveDivision(item.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-semibold transition-all ${on ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon className={`h-4 w-4 ${on ? 'text-brand' : ''}`} /> {item.title}
              </button>
            );
          })}
        </div>
      </div>

      <section className={isContentListDivision ? 'min-h-[440px]' : 'min-h-[440px] rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6'}>
        {!isContentListDivision && (
          <div className="mb-6 border-b border-slate-100 pb-4 text-left">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <activeDivisionInfo.icon className="h-4 w-4 text-brand" />
              <span>{activeDivisionInfo.title}</span>
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">{activeDivisionInfo.description}</p>
          </div>
        )}

        {activeDivision === 'address' && uid && <SiteAddressPanel uid={uid} defaultTitle={currentUser?.fullName || ''} onSlug={setSlug} />}
        {activeDivision === 'profile' && <BannerAboutCMS />}
        {activeDivision === 'content' && <PortfolioContentManager />}
        {activeDivision === 'projects' && <ProjectsCoursesCMS initialSubTab="projects" showSubTabs={false} />}
        {activeDivision === 'research' && <PortfolioResearchCMS />}
        {activeDivision === 'navigation' && <PortfolioNavigationManager />}
      </section>
    </div>
  );
}
