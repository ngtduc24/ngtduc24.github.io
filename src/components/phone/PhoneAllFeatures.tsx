import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Monitor } from 'lucide-react';
import { usePhone, usePhoneModules, ModIcon, PhoneModule, phoneLabel } from './PhoneShell';
import { phoneMode } from '../../lib/device';
import { isNewModule } from '../../lib/personalize';

const GROUP_ORDER = ['Giảng dạy và nội dung', 'Quản lý và hệ thống', 'Nghiên cứu và phân tích', 'Công cụ thiết kế'];
const SHORT: Record<string, string> = { 'Giảng dạy và nội dung': 'Giảng dạy', 'Quản lý và hệ thống': 'Quản lý', 'Nghiên cứu và phân tích': 'Nghiên cứu', 'Công cụ thiết kế': 'Công cụ' };
const LAP = 'Dùng trên máy tính';

// Tất cả chức năng trên điện thoại: thanh nhóm có nút tìm kiếm tròn, mỗi nhóm trong 1 thẻ trắng,
// nhóm chỉ dùng trên máy tính làm mờ kèm biểu tượng màn hình, bấm vào sẽ đề nghị gửi sang máy tính.
export default function PhoneAllFeatures() {
  const { user, settings, open } = usePhone();
  const mods = usePhoneModules(user, settings);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(() => { try { const v = sessionStorage.getItem('open_hint:phone_search'); if (v) sessionStorage.removeItem('open_hint:phone_search'); return !!v; } catch { return false; } });
  const [active, setActive] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => { if (searching) setTimeout(() => inputRef.current?.focus(), 50); }, [searching]);

  const groupOf = (m: PhoneModule) => phoneMode(m.id, settings) === 'laptop' ? LAP : m.group;
  const groups = [...GROUP_ORDER, LAP].map(g => ({ g, items: mods.filter(m => groupOf(m) === g) })).filter(x => x.items.length);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const found = q.trim() ? mods.filter(m => norm(`${m.label} ${m.desc}`).includes(norm(q.trim()))) : null;

  const jump = (g: string) => { setActive(g); boxRefs.current[g]?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const app = (m: PhoneModule) => {
    const lap = phoneMode(m.id, settings) === 'laptop';
    return (
      <button key={m.id} type="button" className={`ph-app ${lap ? 'dim' : ''}`} onClick={() => open(m.id)}>
        {lap ? <span className="lap"><Monitor /></span> : isNewModule(m.id) ? <span className="tag">Mới</span> : null}
        <span className="ph-tile"><ModIcon m={m} /></span><span>{phoneLabel(m)}</span>
      </button>
    );
  };

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: '#fff', boxShadow: '0 1px 0 var(--ph-line)' }}>
        <div className="ph-plain">
          <h2>Tất cả chức năng</h2>
          <button type="button" className="x" aria-label="Đóng" onClick={() => open('dashboard')}><X size={22} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 14px 16px' }}>
          {searching ? (
            <div className="ph-search" style={{ marginTop: 0, flex: 1, marginRight: 16, height: 40, background: 'var(--ph-bg)' }}>
              <Search /><input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm chức năng" />
              <button type="button" aria-label="Đóng tìm kiếm" onClick={() => { setQ(''); setSearching(false); }}><X size={18} /></button>
            </div>
          ) : <>
            <button type="button" className="ph-sr" aria-label="Tìm chức năng" onClick={() => setSearching(true)}><Search /></button>
            <div className="ph-chips" style={{ paddingRight: 16 }}>
              {groups.map(({ g }) => <button key={g} type="button" className={`ph-chip ${active === g ? 'on' : ''}`} onClick={() => jump(g)}>{SHORT[g] || g}</button>)}
            </div>
          </>}
        </div>
      </div>

      {found ? (
        <div className="ph-box"><h4>Kết quả<small>{found.length} chức năng</small></h4>
          {found.length ? <div className="ph-apps">{found.map(app)}</div> : <p style={{ fontSize: 14, color: 'var(--ph-muted)', margin: '0 4px' }}>Không có chức năng nào khớp.</p>}
        </div>
      ) : groups.map(({ g, items }) => (
        <div key={g} ref={el => { boxRefs.current[g] = el; }} className={`ph-box ${g === LAP ? 'lap' : ''}`} style={{ scrollMarginTop: 130 }}>
          <h4>{g}{g === LAP && <small>Gửi link sang máy tính</small>}</h4>
          <div className="ph-apps">{items.map(app)}</div>
        </div>
      ))}
      <div style={{ height: 14 }} />
    </div>
  );
}
