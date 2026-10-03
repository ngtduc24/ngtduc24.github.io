import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, CheckSquare, Square, CheckCircle2, Trash2, X, Plus, ArrowDownWideNarrow } from 'lucide-react';
import type { ScientificJournal } from '../../types';
import { PhoneExt, PhoneSearch, PhoneChips, PhoneChip, PhoneMeta, PhonePickSheet, PhoneMenuSheet, PhoneMenuItem, PhoneFab, PhoneEmpty, useMoreOnScroll } from './PhoneKit';

// Điểm báo trên điện thoại: ô tìm trong nền màu, chip lọc cuộn ngang, mỗi tạp chí là 1 thẻ có điểm nổi bật bên phải,
// chọn nhiều để xoá, thao tác quản trị gom vào nút ba chấm.
type Opt = { id: string; label: string };
export interface JournalFilter { key: string; label: string; value: string; options: Opt[]; onChange: (v: string) => void }

const maxScore = (s?: string) => {
  const m = String(s || '').replace(',', '.').match(/[\d.]+(?!.*[\d.])/);
  return m ? parseFloat(m[0]) || 0 : 0;
};

export default function PhoneJournals({ journals, search, onSearch, filters, defaultCover, onOpen, canDelete, selectedIds, setSelectedIds, onDeleteBulk, menu, onCreate }: {
  journals: ScientificJournal[]; search: string; onSearch: (v: string) => void; filters: JournalFilter[]; defaultCover?: string;
  onOpen: (j: ScientificJournal) => void; canDelete: boolean; selectedIds: string[]; setSelectedIds: (v: string[]) => void;
  onDeleteBulk: () => void; menu: PhoneMenuItem[]; onCreate?: () => void;
}) {
  const [sheet, setSheet] = useState<JournalFilter | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<'default' | 'score' | 'name'>('default');
  const [picking, setPicking] = useState(false);
  const list = useMemo(() => {
    if (sort === 'score') return [...journals].sort((a, b) => maxScore(b.score) - maxScore(a.score));
    if (sort === 'name') return [...journals].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return journals;
  }, [journals, sort]);
  const n = useMoreOnScroll(list.length, 30, [search, sort, ...filters.map(f => f.value)]);
  const sel = new Set(selectedIds);
  const toggle = (id: string) => setSelectedIds(sel.has(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  const stop = () => { setPicking(false); setSelectedIds([]); };
  const active = filters.filter(f => f.value && f.value !== 'all').length;
  const sortLabel = sort === 'score' ? 'Điểm cao trước' : sort === 'name' ? 'Tên A đến Z' : 'Mới nhập trước';

  return (
    <div>
      <PhoneExt head>
        <PhoneSearch value={search} onChange={onSearch} placeholder="Tên tạp chí, ISSN, ngành, cơ quan..."
          right={menu.length ? <button type="button" className="rb" aria-label="Thao tác quản trị" onClick={() => setMenuOpen(true)}><Dots /></button> : undefined} />
      </PhoneExt>
      <PhoneChips>
        {active > 0 && <PhoneChip on onClick={() => filters.forEach(f => f.onChange('all'))}>Bỏ lọc ({active})</PhoneChip>}
        {filters.map(f => {
          const cur = f.options.find(o => o.id === f.value);
          const on = !!f.value && f.value !== 'all';
          return <PhoneChip key={f.key} caret on={on} onClick={() => setSheet(f)}>{on && cur ? cur.label : f.label}</PhoneChip>;
        })}
      </PhoneChips>
      <PhoneMeta left={<><b>{list.length.toLocaleString('vi-VN')}</b> tạp chí</>}
        right={<span style={{ display: 'flex', gap: 14 }}>
          <button type="button" onClick={() => setSortOpen(true)}><ArrowDownWideNarrow />{sortLabel}</button>
          {canDelete && <button type="button" onClick={() => (picking ? stop() : setPicking(true))}>{picking ? <><X />Xong</> : <><CheckSquare />Chọn</>}</button>}
        </span>} />
      {list.length === 0 ? <PhoneEmpty icon={BookOpen} title="Không có tạp chí nào khớp" sub="Thử bỏ bớt điều kiện lọc hoặc đổi từ khoá tìm." /> : (
        <div className="pk-list" style={{ marginTop: 0, gap: 10 }}>
          {list.slice(0, n).map(j => {
            const on = sel.has(j.id);
            return (
              <button key={j.id} type="button" className={`pk-row ${on ? 'sel' : ''}`} onClick={() => (picking ? toggle(j.id) : onOpen(j))}>
                {picking && (on ? <CheckCircle2 className="ck on" /> : <Square className="ck" />)}
                <img className="th" src={j.coverImage || defaultCover} alt="" loading="lazy" onError={e => { if (defaultCover) (e.target as HTMLImageElement).src = defaultCover; }} />
                <span className="m">
                  <b>{j.name}</b>
                  <small>{j.publisher || 'Chưa rõ cơ quan xuất bản'}</small>
                  <span className="tags">
                    {j.type && <span className="tag g">{j.type}</span>}
                    {j.field && <span className="tag b">{j.field}</span>}
                    {j.score && /[–-]/.test(j.score) && <span className="tag a">{j.score} điểm</span>}
                    {j.issn && <span className="tag">ISSN {j.issn}</span>}
                  </span>
                </span>
                {!picking && <span className="sc"><b>{String(j.score || '0').split(/[–-]/).pop()!.trim() || '0'}</b><span>điểm tối đa</span></span>}
              </button>
            );
          })}
          {n < list.length && <p className="pk-more">Cuộn xuống để xem thêm, còn {list.length - n} tạp chí</p>}
        </div>
      )}
      {sheet && <PhonePickSheet title={sheet.label} value={sheet.value} options={sheet.options} onPick={sheet.onChange} onClose={() => setSheet(null)} />}
      {sortOpen && <PhonePickSheet title="Sắp xếp" value={sort} options={[{ id: 'default', label: 'Mới nhập trước' }, { id: 'score', label: 'Điểm cao trước' }, { id: 'name', label: 'Tên A đến Z' }]} onPick={v => setSort(v as any)} onClose={() => setSortOpen(false)} />}
      {menuOpen && <PhoneMenuSheet title="Quản lý điểm báo" items={menu} onClose={() => setMenuOpen(false)} />}
      {picking ? createPortal(
        <div className="ph pk-pickbar">
          <button type="button" onClick={() => setSelectedIds(selectedIds.length === list.length ? [] : list.map(j => j.id))}>{selectedIds.length === list.length && list.length ? <CheckSquare /> : <Square />}{selectedIds.length === list.length && list.length ? 'Bỏ chọn' : 'Chọn tất cả'}</button>
          <button type="button" className="del" disabled={!selectedIds.length} onClick={() => { onDeleteBulk(); setPicking(false); }}><Trash2 />Xoá{selectedIds.length ? ` (${selectedIds.length})` : ''}</button>
        </div>, document.body)
        : onCreate && <PhoneFab label="Thêm tạp chí" icon={Plus} onClick={onCreate} />}
    </div>
  );
}

function Dots() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>;
}
