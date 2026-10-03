import React, { useMemo, useState } from 'react';
import { Users, UserPlus, Link2, Eye, ClipboardCheck, Clock, Plus, Download, MoreHorizontal, Pencil, Trash2, Lock, Unlock, FileSpreadsheet, ChevronLeft, ChevronRight, Check, Search, X, FileText, BarChart3, Send, ListChecks } from 'lucide-react';
import type { EduUser, EduGradeColumn, EduAssignment, EduGrade, EduExtensionRequest } from '../../types/edu';
import { takeOpenExt } from '../../lib/phone';
import { PhoneExt, PhoneSeg, PhoneChips, PhoneChip, PhoneSheet, PhoneMenuSheet, PhoneFab, PhoneEmpty, PhonePickSheet } from '../phone/PhoneKit';

// Trang chi tiết lớp trên điện thoại: đầu trang màu có tên lớp và 4 số liệu, 3 thẻ Bài tập, Sinh viên, Bảng điểm.
// Danh sách thay cho bảng nhiều cột, bảng điểm nhập theo từng cột bằng bàn phím số riêng, vẫn xem được cả bảng.

type Tab = 'assignments' | 'students' | 'grades';
export interface PhoneClassProps {
  clazz: { id: string; name: string; edu_schools: { name: string } };
  isOwner: boolean;
  users: EduUser[]; gradeColumns: EduGradeColumn[]; assignments: EduAssignment[]; grades: EduGrade[]; submissions: any[]; extRequests: EduExtensionRequest[];
  can: { share: boolean; assign: boolean; editAssign: boolean; deleteAssign: boolean; grade: boolean; addStudent: boolean; editStudent: boolean; deleteStudent: boolean; addColumn: boolean; editColumn: boolean; deleteColumn: boolean; exportGrades: boolean; viewSubs: boolean };
  avgOf: (userId: string) => number | null;
  onShare: () => void;
  onNewAssignment: () => void;
  onEditAssignment: (id: string) => void;
  onAssignQuiz: () => void;
  quizSlot?: React.ReactNode;
  onDeleteAssignment: (id: string, colId?: string) => void;
  onViewAssignment: (id: string) => void;
  onGrading: (assignmentId: string, columnId: string) => void;
  onCopyLink: (shareLinkId: string) => void;
  onApproveExt: (req: EduExtensionRequest, ms: number) => void;
  onRejectExt: (req: EduExtensionRequest) => void;
  onSaveStudent: (s: { id?: string; stt: number; fullName: string; mssv: string }) => Promise<void>;
  onDeleteStudent: (id: string) => void;
  onSaveColumn: (c: { id?: string; name: string; weight: number }) => Promise<void>;
  onDeleteColumn: (id: string) => void;
  onToggleConfirm: (col: EduGradeColumn) => void;
  onSaveGrade: (columnId: string, userId: string, score: number | null) => Promise<void>;
  onExportAll: () => void;
  onExportColumn: (id: string) => void;
}

const fmt = (n: number | null | undefined) => (n == null ? '' : String(Math.round(n * 100) / 100).replace('.', ','));
const initials = (name: string) => { const p = name.trim().split(/\s+/); return (p[p.length - 1] || '').slice(0, 2).toUpperCase(); };
const COLORS = ['#059669', '#7c3aed', '#ea580c', '#2563eb', '#be123c', '#0d9488', '#ca8a04', '#4f46e5'];
const colorOf = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; };
const left = (iso?: string) => {
  if (!iso) return { text: 'Không hạn', tone: 'mu' };
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return { text: 'Đã đóng', tone: 'mu' };
  const h = ms / 3600e3;
  if (h < 1) return { text: `Còn ${Math.max(1, Math.round(ms / 60e3))} phút`, tone: 'r' };
  if (h < 24) return { text: `Còn ${Math.floor(h)} giờ`, tone: 'r' };
  return { text: `Còn ${Math.floor(h / 24)} ngày`, tone: h < 72 ? 'a' : 'g' };
};
const when = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }); };

export default function PhoneClassDetail(p: PhoneClassProps) {
  const [tab, setTab] = useState<Tab>('students');
  const [menu, setMenu] = useState(false);
  // Mở từ lời nhắc "yêu cầu gia hạn chờ duyệt": vào thẳng thẻ Bài tập và mở bảng duyệt gia hạn.
  const [extOpen, setExtOpen] = useState(false);
  React.useEffect(() => { if (takeOpenExt(p.clazz.id)) { setTab('assignments'); setExtOpen(true); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [asgMenu, setAsgMenu] = useState<EduAssignment | null>(null);
  const [profile, setProfile] = useState<EduUser | null>(null);
  const [stuForm, setStuForm] = useState<null | { id?: string; stt: string; fullName: string; mssv: string }>(null);
  const [colForm, setColForm] = useState<null | { id?: string; name: string; weight: string }>(null);
  const [exportPick, setExportPick] = useState(false);
  const [gradePick, setGradePick] = useState(false);
  const [q, setQ] = useState('');
  const [stuFilter, setStuFilter] = useState<'all' | 'missing' | 'low' | 'blank'>('all');
  const [colId, setColId] = useState<string>(() => p.gradeColumns[0]?.id || '');
  const [gmode, setGmode] = useState<'col' | 'table'>('col');
  const [key, setKey] = useState<null | { colId: string; userId: string }>(null);

  const users = useMemo(() => [...p.users].sort((a, b) => (a.stt || 0) - (b.stt || 0)), [p.users]);
  const gradeOf = (c: string, u: string) => p.grades.find(g => g.gradeColumnId === c && g.userId === u);
  const subOf = (aid: string, uid: string) => p.submissions.find(s => s.assignmentId === aid && s.userId === uid);
  const colOfAsg = (a: EduAssignment) => p.gradeColumns.find(c => c.id === a.gradeColumnId || c.id === (a as any).grade_column_id);
  const asgOfCol = (cid: string) => p.assignments.find(a => a.gradeColumnId === cid || (a as any).grade_column_id === cid);
  const stat = (a: EduAssignment) => {
    const subs = new Set(p.submissions.filter(s => s.assignmentId === a.id).map(s => s.userId || s.mssv));
    const col = colOfAsg(a);
    const graded = col ? [...subs].filter(u => gradeOf(col.id, u as string)).length : 0;
    return { submitted: subs.size, graded, pending: Math.max(0, subs.size - graded) };
  };
  const pendingAll = p.assignments.reduce((s, a) => s + stat(a).pending, 0);
  const avgs = users.map(u => p.avgOf(u.id)).filter((x): x is number => x != null);
  const classAvg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
  const sortedAsg = useMemo(() => {
    const now = Date.now();
    const open = p.assignments.filter(a => !a.deadline || new Date(a.deadline).getTime() >= now).sort((a, b) => (a.deadline ? new Date(a.deadline).getTime() : 9e15) - (b.deadline ? new Date(b.deadline).getTime() : 9e15));
    const closed = p.assignments.filter(a => a.deadline && new Date(a.deadline).getTime() < now).sort((a, b) => new Date(b.deadline!).getTime() - new Date(a.deadline!).getTime());
    return [...open, ...closed];
  }, [p.assignments]);
  const latest = sortedAsg[0];

  // ===== Sinh viên =====
  const dotsOf = (u: EduUser) => sortedAsg.slice(0, 5).map(a => {
    const s = subOf(a.id, u.id);
    if (!s) return 'n';
    const t = s.firstSubmittedAt || s.submittedAt;
    return a.deadline && t && new Date(t).getTime() > new Date(a.deadline).getTime() ? 'l' : 'y';
  });
  const missingLatest = latest ? users.filter(u => !subOf(latest.id, u.id)) : [];
  const low = users.filter(u => { const v = p.avgOf(u.id); return v != null && v < 5; });
  const blank = users.filter(u => p.gradeColumns.some(c => !gradeOf(c.id, u.id)));
  const fq = q.trim().toLowerCase();
  const stuList = (stuFilter === 'missing' ? missingLatest : stuFilter === 'low' ? low : stuFilter === 'blank' ? blank : users)
    .filter(u => !fq || u.fullName.toLowerCase().includes(fq) || u.mssv.toLowerCase().includes(fq));

  // ===== Bảng điểm =====
  const col = p.gradeColumns.find(c => c.id === colId) || p.gradeColumns[0];
  const colScores = col ? users.map(u => gradeOf(col.id, u.id)?.score).filter((x): x is number => x != null) : [];
  const colAsg = col ? asgOfCol(col.id) : undefined;

  const ext = (
    <PhoneExt head still title="Lớp học">
      <div className="pk-ch">
        <div className="r1">
          <small>{p.clazz.edu_schools?.name}{!p.isOwner ? ' · Được chia sẻ với bạn' : ''}</small>
          <span className="acts">
            {p.can.share && <button type="button" onClick={p.onShare}><UserPlus />Cộng tác</button>}
            <button type="button" className="ic" aria-label="Thao tác với lớp" onClick={() => setMenu(true)}><MoreHorizontal /></button>
          </span>
        </div>
        <h2>{p.clazz.name}</h2>
        <div className="st4">
          <div><b>{users.length}</b><span>Sinh viên</span></div>
          <div><b>{p.assignments.length}</b><span>Bài tập</span></div>
          <div><b>{pendingAll}</b><span>Chờ chấm</span></div>
          <div><b>{classAvg == null ? '–' : fmt(classAvg)}</b><span>Điểm TB</span></div>
        </div>
      </div>
      <PhoneSeg tabs={[{ id: 'students', label: 'Sinh viên' }, { id: 'grades', label: 'Bảng điểm' }, { id: 'assignments', label: 'Bài tập' }]} active={tab} onTab={t => setTab(t as Tab)} />
    </PhoneExt>
  );

  return (
    <div className="pk-class">
      {ext}

      {tab === 'assignments' && (
        <div className="pk-list" style={{ gap: 10 }}>
          {p.can.assign && (
            // Giao việc cho đúng lớp này: Bài tập (nộp tệp) hoặc Quizz (chọn đề rồi giao)
            <div className="pk-give">
              <button type="button" onClick={p.onNewAssignment}><span className="ic"><FileText /></span><span><b>Bài tập</b><small>Giao bài nộp tệp</small></span></button>
              <button type="button" onClick={p.onAssignQuiz}><span className="ic"><ListChecks /></span><span><b>Quizz</b><small>Chọn đề rồi giao</small></span></button>
            </div>
          )}
          {p.can.grade && p.extRequests.length > 0 && (
            <button type="button" className="pk-warn" onClick={() => setExtOpen(true)}><Clock /><span>{p.extRequests.length} sinh viên xin gia hạn nộp bài</span><b>Xem</b></button>
          )}
          {sortedAsg.length === 0 ? <PhoneEmpty icon={FileText} title="Lớp chưa có bài tập nào" sub={p.can.assign ? 'Bấm Bài tập ở trên để giao bài đầu tiên.' : undefined} /> : (
            // Danh sách gọn trong thẻ trắng: mỗi bài tập 1 dòng, bấm để xem chi tiết, nút Chấm khi còn bài chờ, nút ba chấm mở thao tác khác.
            <div className="pk-grp">
              {sortedAsg.map(a => {
                const st = stat(a); const c = colOfAsg(a); const l = left(a.deadline);
                return (
                  <div key={a.id} className="pk-li" role="button" tabIndex={0} onClick={() => p.onViewAssignment(a.id)}>
                    <span className="ic"><FileText /></span>
                    <span className="m">
                      <b>{a.title}</b>
                      <small>{a.deadline ? <>Hạn {when(a.deadline)} · <span className={`lt ${l.tone}`}>{l.text.toLowerCase()}</span></> : 'Không đặt hạn'}</small>
                      <small className="as"><span>{st.submitted}/{users.length} đã nộp · {st.graded} đã chấm{c ? '' : ' · chưa gán cột điểm'}</span></small>
                    </span>
                    {p.can.grade && c && st.pending > 0 && <button type="button" className="pd" onClick={e => { e.stopPropagation(); p.onGrading(a.id, c.id); }}>Chấm {st.pending}</button>}
                    <button type="button" className="mn2" aria-label="Thao tác bài tập" onClick={e => { e.stopPropagation(); setAsgMenu(a); }}><MoreHorizontal /></button>
                  </div>
                );
              })}
            </div>
          )}
          {p.quizSlot}
        </div>
      )}

      {tab === 'students' && (
        <>
          <div className="pk-srch pk-srch-w" style={{ marginTop: 12 }}>
            <Search /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên hoặc MSSV" />
            {q && <button type="button" className="clr" onClick={() => setQ('')}><X /></button>}
          </div>
          <PhoneChips>
            <PhoneChip on={stuFilter === 'all'} count={users.length} onClick={() => setStuFilter('all')}>Tất cả</PhoneChip>
            {latest && <PhoneChip on={stuFilter === 'missing'} count={missingLatest.length} onClick={() => setStuFilter('missing')}>Chưa nộp bài mới nhất</PhoneChip>}
            <PhoneChip on={stuFilter === 'low'} count={low.length} onClick={() => setStuFilter('low')}>Điểm dưới 5</PhoneChip>
            <PhoneChip on={stuFilter === 'blank'} count={blank.length} onClick={() => setStuFilter('blank')}>Thiếu điểm</PhoneChip>
          </PhoneChips>
          {stuList.length === 0 ? <PhoneEmpty icon={Users} title={users.length ? 'Không có sinh viên nào khớp' : 'Lớp chưa có sinh viên'} /> : (
            <div className="pk-sv">
              {stuList.map(u => { const v = p.avgOf(u.id); return (
                <button key={u.id} type="button" className="sr" onClick={() => setProfile(u)}>
                  <span className="no">{u.stt}</span>
                  <i style={{ background: colorOf(u.mssv || u.id) }}>{initials(u.fullName)}</i>
                  <span className="m">{u.fullName}<small>{u.mssv}{sortedAsg.length > 0 && <span className="dt">{dotsOf(u).map((d, i) => <em key={i} className={d} />)}</span>}</small></span>
                  <span className="sc">{v == null ? <b className="na">Chưa có</b> : <><b className={v < 5 ? 'lo' : ''}>{fmt(v)}</b><span>ĐTB</span></>}</span>
                </button>
              ); })}
            </div>
          )}
          {sortedAsg.length > 0 && <p className="pk-note">Chấm tròn dưới tên là tình trạng các bài gần nhất: xanh là đã nộp, cam là nộp trễ, xám là chưa nộp.</p>}
        </>
      )}

      {tab === 'grades' && (
        p.gradeColumns.length === 0 ? <PhoneEmpty icon={BarChart3} title="Lớp chưa có cột điểm" sub="Thêm cột điểm để nhập điểm hoặc giao bài tập."
          action={p.can.addColumn ? <button type="button" className="ph-btn" style={{ marginTop: 14 }} onClick={() => setColForm({ name: '', weight: '' })}><Plus size={18} />Thêm cột điểm</button> : undefined} /> : <>
          <div className="pk-gmeta">
            <span>{gmode === 'col' ? 'Chọn cột để nhập điểm' : 'Vuốt ngang để xem các cột'}</span>
            <div className="mode"><button type="button" className={gmode === 'col' ? 'on' : ''} onClick={() => setGmode('col')}>Từng cột</button><button type="button" className={gmode === 'table' ? 'on' : ''} onClick={() => setGmode('table')}>Cả bảng</button></div>
          </div>
          {gmode === 'col' ? <>
            <div className="pk-colsel ph-hscroll-x" data-no-pull>
              {p.gradeColumns.map(c => { const n = users.filter(u => gradeOf(c.id, u.id)).length; return (
                <button key={c.id} type="button" className={c.id === col?.id ? 'on' : ''} onClick={() => setColId(c.id)}>
                  <b>{c.isConfirmed && <Lock />}{c.name}</b><small>{c.weight ? `${c.weight}% · ` : ''}{n}/{users.length}</small>
                </button>
              ); })}
              {p.can.addColumn && <button type="button" onClick={() => setColForm({ name: '', weight: '' })}><b>+ Cột</b><small>thêm mới</small></button>}
            </div>
            {col && <>
              <div className="pk-gsum">
                <div><b>{colScores.length ? fmt(colScores.reduce((a, b) => a + b, 0) / colScores.length) : '–'}</b><span>Trung bình</span></div>
                <div><b>{colScores.length ? fmt(Math.max(...colScores)) : '–'}</b><span>Cao nhất</span></div>
                <div><b>{colScores.length ? fmt(Math.min(...colScores)) : '–'}</b><span>Thấp nhất</span></div>
                <div><b>{users.length - colScores.length}</b><span>Còn trống</span></div>
              </div>
              <div className="pk-colact ph-hscroll-x" data-no-pull>
                {p.can.grade && colAsg && <button type="button" onClick={() => p.onGrading(colAsg.id, col.id)}><ClipboardCheck />Chấm bài nộp</button>}
                {(p.can.editColumn || p.can.grade) && <button type="button" onClick={() => p.onToggleConfirm(col)}>{col.isConfirmed ? <><Unlock />Mở khoá cột</> : <><Lock />Chốt điểm</>}</button>}
                {p.can.editColumn && <button type="button" onClick={() => setColForm({ id: col.id, name: col.name, weight: col.weight ? String(col.weight) : '' })}><Pencil />Sửa cột</button>}
                {p.can.exportGrades && <button type="button" onClick={() => p.onExportColumn(col.id)}><Download />Xuất cột</button>}
                {p.can.deleteColumn && <button type="button" className="dg" onClick={() => p.onDeleteColumn(col.id)}><Trash2 />Xoá cột</button>}
              </div>
              <div className="pk-sv">
                {users.map(u => {
                  const g = gradeOf(col.id, u.id); const s = colAsg ? subOf(colAsg.id, u.id) : null;
                  const late = s && colAsg?.deadline && new Date(s.firstSubmittedAt || s.submittedAt).getTime() > new Date(colAsg.deadline).getTime();
                  return (
                    <button key={u.id} type="button" className="sr" disabled={!p.can.grade} onClick={() => setKey({ colId: col.id, userId: u.id })}>
                      <span className="no">{u.stt}</span>
                      <span className="m">{u.fullName}<small className={colAsg && !s ? 'r' : ''}>{u.mssv}{colAsg ? (s ? (late ? ' · nộp trễ' : ' · đã nộp') : ' · chưa nộp') : ''}</small></span>
                      <span className={`gin ${g == null ? 'em' : g.score < 5 ? 'lo' : ''}`}>{g == null ? 'trống' : fmt(g.score)}</span>
                    </button>
                  );
                })}
              </div>
              {p.can.grade && <p className="pk-note">Bấm vào ô điểm để mở bàn phím số. Lưu xong tự chuyển sang sinh viên kế tiếp.</p>}
            </>}
          </> : (
            <div className="pk-gt" data-no-pull>
              <table>
                <thead><tr><th className="n">Sinh viên</th>{p.gradeColumns.map(c => <th key={c.id}>{c.name}{c.weight ? <><br />{c.weight}%</> : null}</th>)}<th>ĐTB</th></tr></thead>
                <tbody>
                  {users.map(u => { const v = p.avgOf(u.id); return (
                    <tr key={u.id}>
                      <td className="n"><b>{u.fullName}</b><small>{u.mssv}</small></td>
                      {p.gradeColumns.map(c => { const g = gradeOf(c.id, u.id); return <td key={c.id} onClick={() => p.can.grade && setKey({ colId: c.id, userId: u.id })}>{g == null ? <span className="na">trống</span> : <span className={g.score < 5 ? 'lo' : ''}>{fmt(g.score)}</span>}</td>; })}
                      <td><b className={v != null && v < 5 ? 'lo' : 'h'}>{v == null ? '–' : fmt(v)}</b></td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'students' && p.can.addStudent && <PhoneFab label="Thêm sinh viên" icon={Plus} onClick={() => setStuForm({ stt: String(users.length + 1), fullName: '', mssv: '' })} />}

      {menu && <PhoneMenuSheet title="Thao tác với lớp" onClose={() => setMenu(false)} items={[
        { key: 'grade', label: 'Chấm bài', sub: 'Chọn bài tập cần chấm', icon: ClipboardCheck, hidden: !p.can.grade || !p.assignments.length, onClick: () => setGradePick(true) },
        { key: 'col', label: 'Thêm cột điểm', sub: 'Tên cột và tỷ trọng', icon: Plus, hidden: !p.can.addColumn, onClick: () => setColForm({ name: '', weight: '' }) },
        { key: 'stu', label: 'Thêm sinh viên', icon: UserPlus, hidden: !p.can.addStudent, onClick: () => setStuForm({ stt: String(users.length + 1), fullName: '', mssv: '' }) },
        { key: 'xall', label: 'Xuất bảng điểm', sub: 'Tất cả cột ra Excel', icon: FileSpreadsheet, hidden: !p.can.exportGrades || !p.gradeColumns.length, onClick: p.onExportAll },
        { key: 'xcol', label: 'Xuất theo cột', icon: Download, hidden: !p.can.exportGrades || !p.gradeColumns.length, onClick: () => setExportPick(true) },
        { key: 'share', label: 'Cộng tác', sub: 'Thêm người cùng chấm, giao bài', icon: Users, hidden: !p.can.share, onClick: p.onShare },
      ]} />}
      {gradePick && <PhonePickSheet title="Chọn bài tập cần chấm" value="" onClose={() => setGradePick(false)}
        options={sortedAsg.filter(a => colOfAsg(a)).map(a => ({ id: a.id, label: a.title, count: stat(a).pending }))}
        onPick={id => { const a = p.assignments.find(x => x.id === id); const c = a && colOfAsg(a); if (a && c) p.onGrading(a.id, c.id); }} />}
      {exportPick && <PhonePickSheet title="Xuất cột điểm" value="" onClose={() => setExportPick(false)} options={p.gradeColumns.map(c => ({ id: c.id, label: c.name }))} onPick={p.onExportColumn} />}
      {asgMenu && <PhoneMenuSheet title={asgMenu.title} onClose={() => setAsgMenu(null)} items={[
        { key: 'view', label: 'Xem chi tiết', icon: Eye, onClick: () => p.onViewAssignment(asgMenu.id) },
        { key: 'grade', label: 'Chấm bài', icon: ClipboardCheck, hidden: !(p.can.grade && colOfAsg(asgMenu)), onClick: () => { const c = colOfAsg(asgMenu); if (c) p.onGrading(asgMenu.id, c.id); } },
        { key: 'link', label: 'Sao chép link nộp bài', icon: Link2, onClick: () => p.onCopyLink(asgMenu.shareLinkId) },
        { key: 'edit', label: 'Sửa bài tập', icon: Pencil, hidden: !p.can.editAssign, onClick: () => p.onEditAssignment(asgMenu.id) },
        { key: 'del', label: 'Xoá bài tập', icon: Trash2, danger: true, hidden: !p.can.deleteAssign, onClick: () => p.onDeleteAssignment(asgMenu.id, asgMenu.gradeColumnId) },
      ]} />}

      {extOpen && <ExtSheet reqs={p.extRequests} assignments={p.assignments} onClose={() => setExtOpen(false)} onApprove={p.onApproveExt} onReject={p.onRejectExt} />}

      {profile && (() => { const u = profile; const v = p.avgOf(u.id); const nSub = p.assignments.filter(a => subOf(a.id, u.id)).length; return (
        <PhoneSheet title={u.fullName} sub={`MSSV ${u.mssv} · STT ${u.stt}`} onClose={() => setProfile(null)}
          footer={<>
            {p.can.editStudent && <button type="button" className="ph-btn ghost" onClick={() => { setProfile(null); setStuForm({ id: u.id, stt: String(u.stt || ''), fullName: u.fullName, mssv: u.mssv }); }}><Pencil size={18} />Sửa</button>}
            {p.can.deleteStudent && <button type="button" className="ph-btn ghost pk-dg" onClick={() => { setProfile(null); p.onDeleteStudent(u.id); }}><Trash2 size={18} />Xoá</button>}
          </>}>
          <div className="pk-kv"><div><b>{v == null ? '–' : fmt(v)}</b><span>Điểm TB</span></div><div><b>{nSub}/{p.assignments.length}</b><span>Đã nộp</span></div><div><b>{p.gradeColumns.filter(c => gradeOf(c.id, u.id)).length}/{p.gradeColumns.length}</b><span>Có điểm</span></div></div>
          <div className="pk-gl">
            {p.gradeColumns.map(c => { const g = gradeOf(c.id, u.id); const a = asgOfCol(c.id); const s = a ? subOf(a.id, u.id) : null; return (
              <button key={c.id} type="button" disabled={!p.can.grade} onClick={() => { setProfile(null); setKey({ colId: c.id, userId: u.id }); }}>
                <span className="m">{c.name}{a && <small className={s ? '' : 'r'}>{s ? `Nộp ${when(s.firstSubmittedAt || s.submittedAt)}` : 'Chưa nộp'}</small>}</span>
                <b className={g == null ? 'na' : g.score < 5 ? 'lo' : ''}>{g == null ? 'trống' : fmt(g.score)}</b>
              </button>
            ); })}
          </div>
        </PhoneSheet>
      ); })()}

      {stuForm && (
        <PhoneSheet title={stuForm.id ? 'Sửa sinh viên' : 'Thêm sinh viên'} onClose={() => setStuForm(null)}
          footer={<><button type="button" className="ph-btn ghost" onClick={() => setStuForm(null)}>Huỷ</button>
            <button type="button" className="ph-btn" disabled={!stuForm.fullName.trim() || !stuForm.mssv.trim()} onClick={async () => { await p.onSaveStudent({ id: stuForm.id, stt: Number(stuForm.stt) || users.length + 1, fullName: stuForm.fullName.trim(), mssv: stuForm.mssv.trim() }); setStuForm(null); }}><Check size={18} />Lưu</button></>}>
          <div className="pk-form">
            <label>Họ và tên<input value={stuForm.fullName} autoFocus onChange={e => setStuForm({ ...stuForm, fullName: e.target.value })} placeholder="Nguyễn Văn An" /></label>
            <label>Mã số sinh viên<input value={stuForm.mssv} inputMode="numeric" onChange={e => setStuForm({ ...stuForm, mssv: e.target.value })} placeholder="2274801030012" /></label>
            <label>Số thứ tự<input value={stuForm.stt} inputMode="numeric" onChange={e => setStuForm({ ...stuForm, stt: e.target.value })} /></label>
          </div>
        </PhoneSheet>
      )}
      {colForm && (
        <PhoneSheet title={colForm.id ? 'Sửa cột điểm' : 'Thêm cột điểm'} onClose={() => setColForm(null)}
          footer={<><button type="button" className="ph-btn ghost" onClick={() => setColForm(null)}>Huỷ</button>
            <button type="button" className="ph-btn" disabled={!colForm.name.trim()} onClick={async () => { await p.onSaveColumn({ id: colForm.id, name: colForm.name.trim(), weight: Math.max(0, Math.min(100, Number(colForm.weight) || 0)) }); setColForm(null); }}><Check size={18} />Lưu</button></>}>
          <div className="pk-form">
            <label>Tên cột<input value={colForm.name} autoFocus onChange={e => setColForm({ ...colForm, name: e.target.value })} placeholder="BT01, Giữa kỳ..." /></label>
            <label>Tỷ trọng (%)<input value={colForm.weight} inputMode="numeric" onChange={e => setColForm({ ...colForm, weight: e.target.value })} placeholder="Ví dụ 30" /></label>
          </div>
        </PhoneSheet>
      )}

      {key && (() => {
        const c = p.gradeColumns.find(x => x.id === key.colId)!;
        const idx = users.findIndex(u => u.id === key.userId);
        return <KeySheet key={key.colId + key.userId} col={c} user={users[idx]} initial={gradeOf(key.colId, key.userId)?.score ?? null}
          onClose={() => setKey(null)}
          onNav={d => { const n = users[idx + d]; if (n) setKey({ colId: key.colId, userId: n.id }); }}
          onSave={async (v, next) => { await p.onSaveGrade(key.colId, key.userId, v); const n = users[idx + 1]; if (next && n) setKey({ colId: key.colId, userId: n.id }); else setKey(null); }} />;
      })()}
    </div>
  );
}

function ExtSheet({ reqs, assignments, onClose, onApprove, onReject }: { reqs: EduExtensionRequest[]; assignments: EduAssignment[]; onClose: () => void; onApprove: (r: EduExtensionRequest, ms: number) => void; onReject: (r: EduExtensionRequest) => void }) {
  const OPTS = [{ id: '6h', label: '6 giờ', ms: 6 * 3600e3 }, { id: '1d', label: '1 ngày', ms: 864e5 }, { id: '3d', label: '3 ngày', ms: 3 * 864e5 }, { id: '7d', label: '7 ngày', ms: 7 * 864e5 }];
  const [pick, setPick] = useState<Record<string, string>>({});
  return (
    <PhoneSheet title="Xin gia hạn nộp bài" sub="Chọn thời gian gia hạn rồi bấm Duyệt cho từng sinh viên" onClose={onClose}>
      <div className="pk-ext-list">
        {reqs.map(r => { const a = assignments.find(x => x.id === r.assignmentId); const sel = OPTS.find(o => o.id === (pick[r.id] || '1d'))!; return (
          <div key={r.id} className="it">
            <b>{r.studentName || r.mssv}</b>
            <p>{r.mssv} · {a?.title || 'Bài tập'} · gửi {when(r.createdAt)}</p>
            <div className="q">{OPTS.map(o => <button key={o.id} type="button" className={o.id === sel.id ? 'on' : ''} onClick={() => setPick(s => ({ ...s, [r.id]: o.id }))}>{o.label}</button>)}</div>
            <div className="ac"><button type="button" className="ph-btn ghost" onClick={() => onReject(r)}>Từ chối</button><button type="button" className="ph-btn" onClick={() => onApprove(r, sel.ms)}><Check size={18} />Duyệt thêm {sel.label}</button></div>
          </div>
        ); })}
      </div>
    </PhoneSheet>
  );
}

function KeySheet({ col, user, initial, onClose, onNav, onSave }: { col: EduGradeColumn; user: EduUser; initial: number | null; onClose: () => void; onNav: (d: number) => void; onSave: (v: number | null, next: boolean) => Promise<void> }) {
  const [txt, setTxt] = useState(initial == null ? '' : fmt(initial));
  const [busy, setBusy] = useState(false);
  const val = txt === '' ? null : Number(txt.replace(',', '.'));
  const bad = val != null && (isNaN(val) || val < 0 || val > 10);
  const press = (k: string) => setTxt(t => {
    if (k === '⌫') return t.slice(0, -1);
    if (k === ',') return t.includes(',') ? t : (t || '0') + ',';
    const n = (t === '0' ? '' : t) + k;
    return /^\d{0,2}(,\d{0,2})?$/.test(n) ? n : t;
  });
  const step = (d: number) => setTxt(fmt(Math.max(0, Math.min(10, Math.round(((val || 0) + d) * 100) / 100))));
  const save = async (next: boolean) => { if (bad) return; setBusy(true); try { await onSave(val, next); } finally { setBusy(false); } };
  return (
    <PhoneSheet title={`Nhập điểm ${col.name}`} sub={`Thang 10${col.weight ? ` · tỷ trọng ${col.weight}%` : ''}${col.isConfirmed ? ' · cột đã chốt' : ''}`} onClose={onClose}>
      <div className="pk-who">
        <i style={{ background: colorOf(user.mssv || user.id) }}>{initials(user.fullName)}</i>
        <span className="m">{user.fullName}<small>{user.mssv} · STT {user.stt}</small></span>
        <button type="button" aria-label="Sinh viên trước" onClick={() => onNav(-1)}><ChevronLeft /></button>
        <button type="button" aria-label="Sinh viên sau" onClick={() => onNav(1)}><ChevronRight /></button>
      </div>
      <div className="pk-bigv"><button type="button" onClick={() => step(-0.25)}>−</button><b className={bad ? 'bad' : ''}>{txt || '–'}</b><button type="button" onClick={() => step(0.25)}>+</button></div>
      <div className="pk-kp">
        {['5', '7', '8', '9'].map(k => <button key={'q' + k} type="button" className="q" onClick={() => setTxt(k)}>{k}</button>)}
        {['1', '2', '3', '⌫', '4', '5', '6', ',', '7', '8', '9', '0'].map((k, i) => <button key={i} type="button" onClick={() => press(k)}>{k}</button>)}
      </div>
      <div className="pk-sheet-ft">
        <button type="button" className="ph-btn ghost" disabled={busy} onClick={() => save(false)}>{val == null ? 'Để trống' : 'Lưu'}</button>
        <button type="button" className="ph-btn" style={{ flex: 2 }} disabled={busy || bad} onClick={() => save(true)}>Lưu, sang người kế</button>
      </div>
    </PhoneSheet>
  );
}
