import React, { useEffect, useState } from 'react';
import { Pencil, User, Globe, Presentation, BookOpen, CircleCheck, ChevronRight, UserCog, LayoutGrid, Trash2, LogOut, Monitor, ScanLine } from 'lucide-react';
import { usePhone, usePhoneModules } from './PhoneShell';
import { supabase } from '../../lib/supabase';
import { openProfile } from '../../lib/people';
import { setUiPreference } from '../../lib/device';
import { useUsage, setAutoSort } from '../../lib/personalize';
import { useConfirmation } from '../ConfirmationContext';

const ROLE: Record<string, string> = { admin: 'Quản trị viên', member: 'Học viên' };

// Tài khoản trên điện thoại: thông tin, 2 lối tắt, nội dung của tôi kèm số lượng, cài đặt.
export default function PhoneAccount({ onLogout }: { onLogout: () => void }) {
  const { user, settings, open, openScan } = usePhone();
  const mods = usePhoneModules(user, settings);
  const can = (id: string) => mods.some(m => m.id === id);
  const usage = useUsage(user.id);
  const { confirm } = useConfirmation();
  const [n, setN] = useState<{ decks?: number; lessons?: number; quizzes?: number }>({});

  useEffect(() => {
    let on = true;
    (async () => {
      const out: typeof n = {};
      const jobs: Promise<void>[] = [];
      if (can('slides')) jobs.push((async () => {
        const { data } = await supabase.from('portfolio_settings').select('key, del:data->>deletedAt').like('key', `deck:${user.id}:%`);
        out.decks = (data || []).filter((r: any) => !r.del).length;
      })());
      if (can('elearning')) jobs.push((async () => {
        const { count } = await supabase.from('el_lessons').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).is('deleted_at', null);
        out.lessons = count ?? undefined;
      })());
      if (can('edu')) jobs.push((async () => {
        const { count } = await supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
        out.quizzes = count ?? undefined;
      })());
      await Promise.all(jobs.map(j => j.catch(() => {})));
      if (on) setN(out);
    })();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const role = ROLE[user.role] || 'Giảng viên';
  const content = [
    { id: 'slides', label: 'Bài giảng', icon: Presentation, num: n.decks },
    { id: 'elearning', label: 'Giáo trình', icon: BookOpen, num: n.lessons },
    { id: 'edu_exam', label: 'Đề Quizz', icon: CircleCheck, num: n.quizzes },
  ].filter(x => can(x.id === 'edu_exam' ? 'edu' : x.id));
  const hint = (v: string) => { try { sessionStorage.setItem('open_hint:profile', v); } catch { /* bỏ qua */ } };

  return (
    <div>
      <div className="ph-acc">
        <h2>Tài khoản</h2>
        <div className="ph-who">
          <span className="av">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : (user.fullName || '?').trim().split(/\s+/).pop()!.charAt(0).toUpperCase()}</span>
          <div className="nm"><b>{user.fullName || user.username}</b><p>{user.email}</p><span className="role">{role}</span></div>
          <button type="button" className="ed" aria-label="Sửa thông tin" onClick={() => open('profile')}><Pencil /></button>
        </div>
      </div>

      <div className="ph-two">
        <button type="button" className="c" onClick={() => openProfile(user.id)}>
          <div><b>Trang cá nhân</b><p>Ảnh bìa, nội dung đã tạo</p></div><span className="ph-tile"><User /></span>
        </button>
        {can('portfolio_cms') ? (
          <button type="button" className="c" onClick={() => open('portfolio_cms')}>
            <div><b>Website</b><p>Trang giới thiệu bản thân</p></div><span className="ph-tile"><Globe /></span>
          </button>
        ) : (
          <button type="button" className="c" onClick={openScan}>
            <div><b>Quét mã QR</b><p>Mở link bài học, đề thi</p></div><span className="ph-tile"><ScanLine /></span>
          </button>
        )}
      </div>

      {content.length > 0 && <>
        <div className="ph-sec"><h3>Nội dung của tôi</h3></div>
        <div className="ph-list">
          {content.map(c => { const I = c.icon; return (
            <button key={c.id} type="button" className="ph-li" onClick={() => open(c.id)}>
              <I /><span className="m">{c.label}</span>{c.num !== undefined && <span className="num">{c.num}</span>}<ChevronRight className="ch" />
            </button>
          ); })}
        </div>
      </>}

      <div className="ph-sec"><h3>Cài đặt</h3></div>
      <div className="ph-list">
        <button type="button" className="ph-li" onClick={() => open('profile')}><UserCog /><span className="m">Thông tin và mật khẩu</span><ChevronRight className="ch" /></button>
        <button type="button" className="ph-li" role="switch" aria-checked={usage.autoSort !== false} onClick={() => setAutoSort(user.id, usage.autoSort === false)}>
          <LayoutGrid /><span className="m">Tự sắp xếp Trang chủ<small>{usage.autoSort !== false ? 'Đang bật, xếp theo thói quen sử dụng' : 'Đang tắt, dùng thứ tự bạn tự xếp'}</small></span>
          <span style={{ width: 44, height: 26, borderRadius: 13, background: usage.autoSort !== false ? 'var(--ph-brand)' : '#cbd5e1', position: 'relative', flex: 'none', transition: 'background .2s' }}>
            <span style={{ position: 'absolute', top: 3, left: usage.autoSort !== false ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
          </span>
        </button>
        <button type="button" className="ph-li" onClick={() => { hint('trash'); open('profile'); }}><Trash2 /><span className="m">Đã xoá<small>Khôi phục nội dung đã xoá</small></span><ChevronRight className="ch" /></button>
        <button type="button" className="ph-li" onClick={() => setUiPreference('desktop')}><Monitor /><span className="m">Dùng giao diện máy tính<small>Chỉ áp dụng trên điện thoại này</small></span><ChevronRight className="ch" /></button>
        <button type="button" className="ph-li danger" onClick={() => confirm('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', onLogout)}><LogOut /><span className="m">Đăng xuất</span></button>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
