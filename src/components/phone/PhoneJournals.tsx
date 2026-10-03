import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, CheckSquare, Square, CheckCircle2, Trash2, X, Plus, ArrowDownWideNarrow, SlidersHorizontal, Bookmark, Share2, Globe, Pencil, Star, ExternalLink } from 'lucide-react';
import type { ScientificJournal } from '../../types';
import { PhoneExt, PhoneSearch, PhoneChips, PhoneChip, PhoneMeta, PhonePickSheet, PhoneMenuSheet, PhoneMenuItem, PhoneFab, PhoneEmpty, PhoneSheet, useMoreOnScroll } from './PhoneKit';
import { usePhoneBack } from './PhoneShell';
import { readSubRoute, writeSubRoute } from '../../lib/seoConfig';
import { toggleFavJournal, useUsage } from '../../lib/personalize';
import { notice, copyText } from '../ui/Dialogs';
import './phoneJournals.css';

// Điểm báo trên điện thoại: ô tìm trong khối màu đầu trang, chip lọc cuộn ngang, bảng lọc gom mọi điều kiện,
// mỗi tạp chí là 1 thẻ có điểm nổi bật bên phải, bấm vào mở trang chi tiết (điểm theo ngành, thông tin, Lưu, Mở trang tạp chí),
// chọn nhiều để xoá, thao tác quản trị gom vào nút ba chấm.
type Opt = { id: string; label: string };
export interface JournalFilter { key: string; label: string; value: string; options: Opt[]; onChange: (v: string) => void }

const maxScore = (s?: string) => {
  const m = String(s || '').replace(/,/g, '.').match(/[\d.]+(?!.*[\d.])/);
  return m ? parseFloat(m[0]) || 0 : 0;
};
const fmt = (n: number) => { const s = String(Math.round(n * 100) / 100).replace('.', ','); return s.includes(',') ? s : `${s},0`; };
const norm = (s?: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const keyOf = (j: ScientificJournal) => { const i = String(j.issn || '').replace(/[^0-9xX]/g, '').toUpperCase(); return i.length >= 7 ? `i:${i}` : `n:${norm(j.name)}|${norm(j.publisher)}`; };
const has = (v?: string | null) => !!v && !/^(n\/a|chưa cập nhật|chưa có thông tin giới thiệu\.?)$/i.test(String(v).trim());
const initials = (name: string) => name.replace(/^tạp chí\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 3).map(w => w[0]).join('').toUpperCase();
const TONES = ['linear-gradient(145deg,#2563eb,#60a5fa)', 'linear-gradient(145deg,#0f766e,#5eead4)', 'linear-gradient(145deg,#7c3aed,#c084fc)', 'linear-gradient(145deg,#ea580c,#fdba74)', 'linear-gradient(145deg,#be123c,#fb7185)', 'linear-gradient(145deg,#0369a1,#38bdf8)'];
const toneOf = (id: string) => TONES[Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

function Cover({ j, cover, className }: { j: ScientificJournal; cover?: string; className: string }) {
  const [bad, setBad] = useState(false);
  const src = j.coverImage || cover;
  if (src && !bad) return <img className={className} src={src} alt="" loading="lazy" onError={() => setBad(true)} />;
  return <span className={`${className} jr-ini`} style={{ background: toneOf(keyOf(j)) }}>{initials(j.name) || 'TC'}</span>;
}

export default function PhoneJournals({ journals, allJournals, userId, search, onSearch, filters, defaultCover, canDelete, canEdit, selectedIds, setSelectedIds, onDeleteBulk, onDeleteOne, onEdit, menu, onCreate }: {
  journals: ScientificJournal[]; allJournals: ScientificJournal[]; userId: string; search: string; onSearch: (v: string) => void; filters: JournalFilter[]; defaultCover?: string;
  canDelete: boolean; canEdit: boolean; selectedIds: string[]; setSelectedIds: (v: string[]) => void;
  onDeleteBulk: () => void; onDeleteOne: (j: ScientificJournal) => Promise<void> | void; onEdit: (j: ScientificJournal) => void; menu: PhoneMenuItem[]; onCreate?: () => void;
}) {
  const usage = useUsage(userId);
  const favs = usage.favJournals || [];
  const [sheet, setSheet] = useState<JournalFilter | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [sort, setSort] = useState<'default' | 'score' | 'name'>('default');
  const [year, setYear] = useState('all');
  const [saved, setSaved] = useState(false);
  const [picking, setPicking] = useState(false);
  const [openId, setOpenId] = useState<string | null>(() => readSubRoute().jrn || null);

  useEffect(() => { writeSubRoute({ jrn: openId }); }, [openId]);
  // Tạp chí đang mở vừa bị xoá (hoặc link cũ) thì quay về danh sách.
  useEffect(() => { if (openId && allJournals.length && !allJournals.some(j => j.id === openId)) setOpenId(null); }, [openId, allJournals]);
  useEffect(() => () => { writeSubRoute({ jrn: null }); }, []);
  usePhoneBack(openId ? () => setOpenId(null) : null);
  useEffect(() => { document.querySelector('.ph-main, #main-content')?.scrollTo({ top: 0 }); window.scrollTo({ top: 0 }); }, [openId]);

  const years = useMemo(() => Array.from(new Set(allJournals.map(j => j.details?.scoreYear).filter(Boolean) as string[])).sort().reverse(), [allJournals]);
  const list = useMemo(() => {
    let l = journals;
    if (saved) l = l.filter(j => favs.includes(j.id));
    if (year !== 'all') l = l.filter(j => j.details?.scoreYear === year);
    if (sort === 'score') return [...l].sort((a, b) => maxScore(b.score) - maxScore(a.score));
    if (sort === 'name') return [...l].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return l;
  }, [journals, sort, saved, year, favs]);
  const n = useMoreOnScroll(list.length, 30, [search, sort, saved, year, ...filters.map(f => f.value)]);
  const sel = new Set(selectedIds);
  const toggle = (id: string) => setSelectedIds(sel.has(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  const stop = () => { setPicking(false); setSelectedIds([]); };
  const active = filters.filter(f => f.value && f.value !== 'all').length + (year !== 'all' ? 1 : 0);
  const reset = () => { filters.forEach(f => f.onChange('all')); setYear('all'); };
  const sortLabel = sort === 'score' ? 'Điểm cao trước' : sort === 'name' ? 'Tên A đến Z' : 'Mới nhập trước';
  const SORTS = [{ id: 'default', label: 'Mới nhập trước' }, { id: 'score', label: 'Điểm cao trước' }, { id: 'name', label: 'Tên A đến Z' }];

  const opened = openId ? allJournals.find(j => j.id === openId) || journals.find(j => j.id === openId) : null;
  if (opened) {
    return <JournalDetail j={opened} all={allJournals} cover={defaultCover} fav={favs.includes(opened.id)} onFav={() => toggleFavJournal(userId, opened.id)}
      onBack={() => setOpenId(null)} canEdit={canEdit} canDelete={canDelete} onEdit={() => onEdit(opened)}
      onDelete={() => onDeleteOne(opened)} />;
  }

  return (
    <div>
      <PhoneExt head title="Điểm báo" actions={<>
        {canDelete && <button type="button" aria-label={picking ? 'Thôi chọn' : 'Chọn nhiều'} onClick={() => (picking ? stop() : setPicking(true))}>{picking ? <X /> : <CheckCircle2 />}</button>}
        {menu.some(m => !m.hidden) && <button type="button" aria-label="Thao tác quản trị" onClick={() => setMenuOpen(true)}><Plus /></button>}
      </>}>
        <PhoneSearch value={search} onChange={onSearch} placeholder="Tên tạp chí, ISSN, ngành..."
          right={<button type="button" className="rb" aria-label="Bộ lọc" onClick={() => setAllOpen(true)}><SlidersHorizontal />{active > 0 && <i />}</button>} />
      </PhoneExt>
      <PhoneChips>
        <PhoneChip on={saved} onClick={() => setSaved(v => !v)} count={favs.length || undefined}>Đã lưu</PhoneChip>
        {active > 0 && <PhoneChip on onClick={reset}>Bỏ lọc ({active})</PhoneChip>}
        {filters.map(f => {
          const cur = f.options.find(o => o.id === f.value);
          const on = !!f.value && f.value !== 'all';
          return <PhoneChip key={f.key} caret on={on} onClick={() => setSheet(f)}>{on && cur ? cur.label : f.label}</PhoneChip>;
        })}
        {years.length > 0 && <PhoneChip caret on={year !== 'all'} onClick={() => setYearOpen(true)}>{year !== 'all' ? `Năm ${year}` : 'Năm áp dụng'}</PhoneChip>}
      </PhoneChips>
      <PhoneMeta left={<><b>{list.length.toLocaleString('vi-VN')}</b> tạp chí</>}
        right={<button type="button" onClick={() => setSortOpen(true)}><ArrowDownWideNarrow />{sortLabel}</button>} />
      {list.length === 0 ? <PhoneEmpty icon={saved ? Bookmark : BookOpen} title={saved ? 'Chưa lưu tạp chí nào' : 'Không có tạp chí nào khớp'} sub={saved ? 'Mở 1 tạp chí rồi bấm Lưu để xem lại nhanh ở đây.' : 'Thử bỏ bớt điều kiện lọc hoặc đổi từ khoá tìm.'} /> : (
        <div className="pk-list" style={{ marginTop: 0, gap: 10 }}>
          {list.slice(0, n).map(j => {
            const on = sel.has(j.id);
            return (
              <button key={j.id} type="button" className={`pk-row ${on ? 'sel' : ''}`} onClick={() => (picking ? toggle(j.id) : setOpenId(j.id))}>
                {picking && (on ? <CheckCircle2 className="ck on" /> : <Square className="ck" />)}
                <Cover j={j} cover={defaultCover} className="th" />
                <span className="m">
                  <b>{j.name}</b>
                  <small>{has(j.publisher) ? j.publisher : 'Chưa rõ cơ quan xuất bản'}</small>
                  <span className="tags">
                    {j.score && /[–-]/.test(j.score) && <span className="tag g">{j.score} điểm</span>}
                    {has(j.field) && <span className="tag b">{j.field}</span>}
                    {has(j.issn) && <span className="tag">ISSN {j.issn}</span>}
                  </span>
                </span>
                {!picking && <span className="sc">{favs.includes(j.id) && <Bookmark className="bm" />}<b>{fmt(maxScore(j.score))}</b><span>điểm</span></span>}
              </button>
            );
          })}
          {n < list.length && <p className="pk-more">Cuộn xuống để xem thêm, còn {list.length - n} tạp chí</p>}
        </div>
      )}
      {sheet && <PhonePickSheet title={sheet.label} value={sheet.value} options={sheet.options} onPick={sheet.onChange} onClose={() => setSheet(null)} />}
      {sortOpen && <PhonePickSheet title="Sắp xếp" value={sort} options={SORTS} onPick={v => setSort(v as any)} onClose={() => setSortOpen(false)} />}
      {yearOpen && <PhonePickSheet title="Năm áp dụng điểm" value={year} options={[{ id: 'all', label: 'Tất cả các năm' }, ...years.map(y => ({ id: y, label: `Năm ${y}` }))]} onPick={setYear} onClose={() => setYearOpen(false)} />}
      {allOpen && (
        <PhoneSheet title="Lọc tạp chí" sub="Chọn nhiều điều kiện cùng lúc, kết quả cập nhật ngay" onClose={() => setAllOpen(false)}
          footer={<><button type="button" className="ph-btn ghost" onClick={reset}>Đặt lại</button><button type="button" className="ph-btn" style={{ flex: 2 }} onClick={() => setAllOpen(false)}>Xem {list.length.toLocaleString('vi-VN')} tạp chí</button></>}>
          <div className="jr-fg-all">
            {filters.map(f => <FilterGroup key={f.key} title={f.label} value={f.value || 'all'} options={f.options} onPick={f.onChange} />)}
            {years.length > 0 && <FilterGroup title="Năm áp dụng" value={year} options={[{ id: 'all', label: 'Tất cả' }, ...years.map(y => ({ id: y, label: y }))]} onPick={setYear} />}
            <FilterGroup title="Sắp xếp" value={sort} options={SORTS} onPick={v => setSort(v as any)} />
          </div>
        </PhoneSheet>
      )}
      {menuOpen && <PhoneMenuSheet title="Quản lý điểm báo" items={onCreate ? [{ key: 'manual', label: 'Thêm thủ công', sub: 'Nhập tên, ISSN, ngành, điểm theo năm', icon: Pencil, onClick: onCreate }, ...menu] : menu} onClose={() => setMenuOpen(false)} />}
      {picking ? createPortal(
        <div className="ph pk-pickbar">
          <button type="button" onClick={() => setSelectedIds(selectedIds.length === list.length ? [] : list.map(j => j.id))}>{selectedIds.length === list.length && list.length ? <CheckSquare /> : <Square />}{selectedIds.length === list.length && list.length ? 'Bỏ chọn' : 'Chọn tất cả'}</button>
          <button type="button" className="del" disabled={!selectedIds.length} onClick={() => { onDeleteBulk(); setPicking(false); }}><Trash2 />Xoá{selectedIds.length ? ` (${selectedIds.length})` : ''}</button>
        </div>, document.body)
        : onCreate && <PhoneFab label="Thêm tạp chí" icon={Plus} onClick={onCreate} />}
    </div>
  );
}

// Nhóm chip trong bảng lọc, nhiều lựa chọn thì hiện 8 chip đầu và nút xem thêm.
function FilterGroup({ title, value, options, onPick }: { title: string; value: string; options: Opt[]; onPick: (v: string) => void }) {
  const [more, setMore] = useState(false);
  const cut = 8;
  const curIdx = options.findIndex(o => o.id === value);
  const shown = more || options.length <= cut + 1 ? options : options.filter((o, i) => i < cut || i === curIdx);
  return (
    <div className="jr-fg">
      <p>{title}</p>
      <div className="w">
        {shown.map(o => <button key={o.id} type="button" className={`pk-chip ${o.id === value ? 'on' : ''}`} onClick={() => onPick(o.id)}><span className="t">{o.id === 'all' ? 'Tất cả' : o.label}</span></button>)}
        {!more && options.length > cut + 1 && <button type="button" className="pk-chip mo" onClick={() => setMore(true)}><span className="t">+ {options.length - shown.length} mục</span></button>}
      </div>
    </div>
  );
}

function JournalDetail({ j, all, cover, fav, onFav, onBack, canEdit, canDelete, onEdit, onDelete }: {
  j: ScientificJournal; all: ScientificJournal[]; cover?: string; fav: boolean; onFav: () => void; onBack: () => void;
  canEdit: boolean; canDelete: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    document.documentElement.classList.add('ph-immersive');
    return () => document.documentElement.classList.remove('ph-immersive');
  }, []);
  const d = j.details || {};
  // Điểm theo ngành: lấy bảng điểm nhập riêng, chưa có thì gom các dòng cùng ISSN (hoặc cùng tên và cơ quan) ở các ngành khác nhau.
  const rows = useMemo(() => {
    const src = d.fieldScores?.length ? d.fieldScores.map(x => ({ field: x.field, v: maxScore(x.score) }))
      : all.filter(x => keyOf(x) === keyOf(j)).map(x => ({ field: x.field, v: maxScore(x.score) }));
    const m = new Map<string, number>();
    src.filter(x => has(x.field)).forEach(x => m.set(x.field, Math.max(m.get(x.field) ?? 0, x.v)));
    if (!m.size && has(j.field)) m.set(j.field, maxScore(j.score));
    return Array.from(m, ([field, v]) => ({ field, v })).sort((a, b) => b.v - a.v);
  }, [j, all]); // eslint-disable-line react-hooks/exhaustive-deps
  const top = Math.max(maxScore(j.score), ...rows.map(r => r.v), 0);
  const scale = Math.max(top, 0.25);
  const est = has(j.establishedDate) ? j.establishedDate : '';
  const third = d.scoreYear ? { b: d.scoreYear, s: 'Năm áp dụng' } : est ? { b: est, s: 'Thành lập' } : { b: (j.paperCount || 0).toLocaleString('vi-VN'), s: 'Bài viết' };
  const site = d.website ? (/^https?:\/\//i.test(d.website) ? d.website : `https://${d.website}`) : '';
  const openSite = () => {
    const url = site || `https://www.google.com/search?q=${encodeURIComponent(`${j.name} ${has(j.issn) ? `ISSN ${j.issn}` : ''}`.trim())}`;
    window.open(url, '_blank', 'noopener');
  };
  const share = async () => {
    const url = `${window.location.origin}/tracuu.html?q=${encodeURIComponent(has(j.issn) ? j.issn : j.name)}`;
    const text = `${j.name}${has(j.issn) ? `, ISSN ${j.issn}` : ''}, điểm tối đa ${fmt(top)}`;
    const nav = navigator as any;
    if (nav.share) { try { await nav.share({ title: j.name, text, url }); } catch { /* người dùng đóng bảng chia sẻ */ } return; }
    if (await copyText(`${text}\n${url}`)) notice('Đã sao chép thông tin và link tra cứu tạp chí.', 'info'); else notice('Không sao chép được, hãy thử lại.');
  };
  const info: Array<[string, React.ReactNode]> = [];
  if (has(j.publisher)) info.push(['Cơ quan xuất bản', j.publisher]);
  if (has(j.type)) info.push(['Phân loại', j.type]);
  if (has(j.issn)) info.push(['ISSN', j.issn]);
  if (has(j.score)) info.push(['Khung điểm', `${j.score} điểm`]);
  if (d.language) info.push(['Ngôn ngữ', d.language]);
  if (d.frequency) info.push(['Kỳ xuất bản', d.frequency]);
  if (est && third.s !== 'Thành lập') info.push(['Năm thành lập', est]);
  if (j.paperCount && third.s !== 'Bài viết') info.push(['Số bài viết', j.paperCount.toLocaleString('vi-VN')]);
  if (j.rating) info.push(['Độ uy tín', <span className="jr-stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={i < j.rating ? 'on' : ''} />)}</span>]);
  if (site) info.push(['Trang web', <a href={site} target="_blank" rel="noopener noreferrer">{site.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')}<ExternalLink /></a>]);
  if (has(j.dateImported)) info.push(['Ngày nhập', j.dateImported]);

  return (
    <div className="jr-d">
      <PhoneExt head still title="Chi tiết tạp chí" onBack={onBack} actions={<>
        <button type="button" aria-label={fav ? 'Bỏ lưu' : 'Lưu tạp chí'} className={fav ? 'on' : ''} onClick={onFav}><Bookmark /></button>
        <button type="button" aria-label="Chia sẻ" onClick={share}><Share2 /></button>
        {(canEdit || canDelete) && <button type="button" aria-label="Thao tác" onClick={() => setMenu(true)}><Dots /></button>}
      </>} />
      <div className="jr-hero">
        <div className="jr-card">
          <div className="top">
            <Cover j={j} cover={cover} className="cv" />
            <div className="m">
              <h2>{j.name}</h2>
              {has(j.publisher) && <p>{j.publisher}</p>}
              <div className="tags">
                {has(j.type) && <span className="tag g">{j.type}</span>}
                {has(j.issn) && <span className="tag">ISSN {j.issn}</span>}
              </div>
            </div>
          </div>
          <div className="kv">
            <div><b>{fmt(top)}</b><span>Điểm tối đa</span></div>
            <div><b>{rows.length}</b><span>Ngành tính điểm</span></div>
            <div><b>{third.b}</b><span>{third.s}</span></div>
          </div>
        </div>
      </div>
      {rows.length > 0 && (
        <div className="jr-blk">
          <h4>Điểm theo ngành{d.scoreYear && <small>Năm {d.scoreYear}</small>}</h4>
          {rows.map(r => (
            <div key={r.field} className="yr"><span>{r.field}</span><div className="bar"><i style={{ width: `${Math.max(4, (r.v / scale) * 100)}%` }} /></div><b>{fmt(r.v)}</b></div>
          ))}
        </div>
      )}
      {info.length > 0 && (
        <div className="jr-blk info">
          <h4>Thông tin</h4>
          {info.map(([k, v]) => <div key={k} className="r"><span>{k}</span><b>{v}</b></div>)}
        </div>
      )}
      {has(j.description) && (
        <div className="jr-blk">
          <h4>Giới thiệu</h4>
          <p className="ds">{j.description}</p>
        </div>
      )}
      <div className="jr-sp" />
      {createPortal(
        <div className="ph jr-bot">
          <button type="button" className={`gh ${fav ? 'on' : ''}`} onClick={() => { onFav(); notice(fav ? 'Đã bỏ lưu tạp chí.' : 'Đã lưu, xem lại ở chip Đã lưu.', 'info'); }}><Bookmark />{fav ? 'Đã lưu' : 'Lưu'}</button>
          <button type="button" className="go" onClick={openSite}><Globe />{site ? 'Mở trang tạp chí' : 'Tìm trang tạp chí'}</button>
        </div>, document.body)}
      {menu && <PhoneMenuSheet title={j.name} items={[
        { key: 'edit', label: 'Sửa thông tin', sub: 'Tên, ISSN, ngành, điểm theo ngành, trang web', icon: Pencil, hidden: !canEdit, onClick: onEdit },
        { key: 'del', label: 'Xoá tạp chí', sub: 'Chuyển vào thùng rác, khôi phục lại được', icon: Trash2, danger: true, hidden: !canDelete, onClick: onDelete },
      ]} onClose={() => setMenu(false)} />}
    </div>
  );
}

function Dots() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>;
}
