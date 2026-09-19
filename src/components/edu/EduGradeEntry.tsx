import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, ChevronLeft, ChevronRight, Check, AlertTriangle, Download, RefreshCw, Search, FileText, Loader2, X } from 'lucide-react';
import { UserAccount } from '../../types';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import { getClasses, getGradeColumns, getGrades, getClassUsers } from '../../lib/edu';
import { EduClass } from '../../types/edu';
import {
  decodeFg, encodeFg, parseFg, serializeFg, readClasses, readMeta, writeGrades, readGrades,
  normalizeScore, splitComponent, normName, fgFileName, FgClass, FgMeta,
} from '../../lib/fgCodec';

interface Props { currentUser: UserAccount; }

interface SourceColumn { key: string; label: string; gradedCount: number; lastAt?: string; scores: Map<string, string>; }

const STEPS = ['Tải file .fg', 'Chọn lớp', 'Nguồn điểm', 'Ánh xạ cột', 'Đối chiếu', 'Ghi & xuất'];

export default function EduGradeEntry({ currentUser }: Props) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();

  const [step, setStep] = useState(0);
  const [doc, setDoc] = useState<Document | null>(null);
  const [meta, setMeta] = useState<FgMeta | null>(null);
  const [fgClasses, setFgClasses] = useState<FgClass[]>([]);
  const [dirty, setDirty] = useState(false);
  const [done, setDone] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);

  // bước 2
  const [fgClassIdx, setFgClassIdx] = useState<number>(-1);
  const [sysClasses, setSysClasses] = useState<EduClass[]>([]);
  const [sysClassId, setSysClassId] = useState('');

  // bước 3
  const [sourceTab, setSourceTab] = useState<'system' | 'excel'>('system');
  const [sysColumns, setSysColumns] = useState<SourceColumn[]>([]);
  const [selectedSources, setSelectedSources] = useState<SourceColumn[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingSys, setLoadingSys] = useState(false);

  // bước 4
  const [mapping, setMapping] = useState<Record<string, string>>({}); // sourceKey -> component | 'SKIP'

  // bước 5
  const [manualPairs, setManualPairs] = useState<Record<string, string>>({}); // sourceMssv -> fgRoll
  const [previewEdits, setPreviewEdits] = useState<Record<string, string>>({}); // `${roll}__${sourceKey}` -> điểm sửa tay (chỉ ảnh hưởng file .fg)

  const fgClass = fgClassIdx >= 0 ? fgClasses[fgClassIdx] : null;

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty && !done) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty, done]);

  // ---------------- Bước 1: tải file ----------------
  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const xml = decodeFg(text);
      const d = parseFg(xml);
      setDoc(d); setMeta(readMeta(d)); setFgClasses(readClasses(d));
      setStep(1); setDone(false); setDirty(false);
      setFgClassIdx(-1); setSysClassId(''); setSelectedSources([]); setMapping({}); setManualPairs({}); setPreviewEdits({});
    } catch (e) {
      addNotification('File không đúng định dạng .fg của phần mềm nhập điểm.', 'error');
    }
  };

  // ---------------- Bước 2: chọn lớp ----------------
  useEffect(() => { if (step === 1) getClasses().then(setSysClasses).catch(() => {}); }, [step]);
  useEffect(() => {
    if (fgClass && sysClasses.length) {
      const match = sysClasses.find(c => normName(c.name) === normName(fgClass.className));
      if (match) setSysClassId(match.id);
    }
  }, [fgClassIdx, sysClasses]);

  // ---------------- Bước 3: nguồn hệ thống ----------------
  const loadSystemColumns = useCallback(async () => {
    if (!sysClassId) return;
    setLoadingSys(true);
    try {
      const [cols, users] = await Promise.all([getGradeColumns(sysClassId), getClassUsers(sysClassId)]);
      const userMssv: Record<string, string> = {};
      users.forEach((u: any) => { userMssv[u.id] = (u.mssv || '').trim().toUpperCase(); });
      const out: SourceColumn[] = [];
      for (const col of cols) {
        const grades = await getGrades(col.id);
        const scores = new Map<string, string>();
        let lastAt = '';
        grades.forEach((g: any) => {
          const mssv = userMssv[g.userId];
          if (mssv && g.score !== null && g.score !== undefined) scores.set(mssv, String(g.score));
          if (g.updatedAt && g.updatedAt > lastAt) lastAt = g.updatedAt;
        });
        out.push({ key: `sys_${col.id}`, label: col.name, gradedCount: scores.size, lastAt, scores });
      }
      setSysColumns(out);
    } catch (e: any) { addNotification('Lỗi tải bảng điểm hệ thống: ' + e.message, 'error'); }
    finally { setLoadingSys(false); }
  }, [sysClassId, addNotification]);
  useEffect(() => { if (step === 2 && sourceTab === 'system') loadSystemColumns(); }, [step, sourceTab, loadSystemColumns]);

  const toggleSource = (col: SourceColumn) => {
    setSelectedSources(prev => prev.some(c => c.key === col.key) ? prev.filter(c => c.key !== col.key) : [...prev, col]);
  };

  // ---------------- Bước 3: nguồn Excel ----------------
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [headerRow, setHeaderRow] = useState(1);
  const [rows, setRows] = useState<any[][]>([]);
  const [mssvColIdx, setMssvColIdx] = useState<number>(-1);
  const [excelScoreCols, setExcelScoreCols] = useState<Set<number>>(new Set());

  const onExcel = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const w = XLSX.read(buf, { type: 'array' });
      setWb(w); setSheetName(w.SheetNames[0]);
    } catch { addNotification('Không đọc được file Excel.', 'error'); }
  };
  useEffect(() => {
    if (!wb || !sheetName) return;
    const ws = wb.Sheets[sheetName];
    const arr = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false, defval: '' });
    setRows(arr);
    // đoán cột MSSV: cột có tỉ lệ khớp 2 chữ + 5 số cao nhất
    const hi = headerRow - 1;
    const body = arr.slice(hi + 1);
    let best = -1, bestScore = -1;
    const ncol = Math.max(...arr.map(r => r.length), 0);
    for (let c = 0; c < ncol; c++) {
      let hit = 0, tot = 0;
      for (const r of body) { const v = String(r[c] ?? '').trim(); if (v) { tot++; if (/^[A-Za-z]{2}\d{5}$/.test(v)) hit++; } }
      const sc = tot ? hit / tot : 0;
      if (sc > bestScore) { bestScore = sc; best = c; }
    }
    setMssvColIdx(best);
    setExcelScoreCols(new Set());
  }, [wb, sheetName, headerRow]);

  const excelHeaders = useMemo(() => rows[headerRow - 1] || [], [rows, headerRow]);
  const excelBody = useMemo(() => rows.slice(headerRow), [rows, headerRow]);

  const buildExcelSources = (): SourceColumn[] => {
    return Array.from(excelScoreCols).map(c => {
      const scores = new Map<string, string>();
      for (const r of excelBody) {
        const mssv = String(r[mssvColIdx] ?? '').trim().toUpperCase();
        const raw = r[c];
        if (mssv && raw !== '' && raw !== null && raw !== undefined) scores.set(mssv, String(raw));
      }
      return { key: `xls_${c}`, label: String(excelHeaders[c] ?? `Cột ${c + 1}`), gradedCount: scores.size, scores };
    });
  };

  // ---------------- Bước 4: ánh xạ ----------------
  const components = fgClass?.components || [];
  const compGroups = useMemo(() => {
    const g: Record<string, { value: string; label: string }[]> = {};
    components.forEach(c => { const { group, label } = splitComponent(c); (g[group] = g[group] || []).push({ value: c, label }); });
    return g;
  }, [components]);

  const enterMapping = () => {
    // gợi ý theo tên chuẩn hoá
    const init: Record<string, string> = {};
    const usedComp = new Set<string>();
    selectedSources.forEach(src => {
      const guess = components.find(c => !usedComp.has(c) && normName(splitComponent(c).label) === normName(src.label));
      if (guess) { init[src.key] = guess; usedComp.add(guess); } else init[src.key] = '';
    });
    // nạp mẫu đã lưu
    try {
      const presetKey = `fg_map_${currentUser.id}_${fgClass?.subject}_${fgClass?.className}_${sourceTab}`;
      const raw = localStorage.getItem(presetKey);
      if (raw) { const saved = JSON.parse(raw); selectedSources.forEach(s => { if (saved[s.label]) init[s.key] = saved[s.label]; }); }
    } catch {}
    setMapping(init);
    setStep(3);
  };

  const setMap = (key: string, comp: string) => setMapping(m => ({ ...m, [key]: comp }));
  const usedComponents = useMemo(() => new Set(Object.values(mapping).filter(v => v && v !== 'SKIP')), [mapping]);

  const [savePreset, setSavePreset] = useState(false);
  const persistPreset = () => {
    if (!savePreset || !fgClass) return;
    try {
      const obj: Record<string, string> = {};
      selectedSources.forEach(s => { if (mapping[s.key] && mapping[s.key] !== 'SKIP') obj[s.label] = mapping[s.key]; });
      localStorage.setItem(`fg_map_${currentUser.id}_${fgClass.subject}_${fgClass.className}_${sourceTab}`, JSON.stringify(obj));
    } catch {}
  };

  // ---------------- Bước 5: đối chiếu ----------------
  const activeSources = sourceTab === 'system' ? selectedSources : selectedSources; // cùng cấu trúc
  const mapped = useMemo(() => selectedSources.filter(s => mapping[s.key] && mapping[s.key] !== 'SKIP'), [selectedSources, mapping]);

  const reconcile = useMemo(() => {
    if (!fgClass) return { matched: [] as string[], noSource: [] as FgClass['students'], extra: [] as string[] };
    const fgRolls = new Set(fgClass.students.map(s => s.roll.toUpperCase()));
    const sourceMssv = new Set<string>();
    mapped.forEach(s => s.scores.forEach((_v, k) => sourceMssv.add(k)));
    const matched: string[] = [];
    const noSource: FgClass['students'] = [];
    fgClass.students.forEach(st => {
      const roll = st.roll.toUpperCase();
      const has = mapped.some(s => s.scores.has(roll) || (manualPairs && Object.entries(manualPairs).some(([sm, fr]) => fr === roll && s.scores.has(sm))));
      if (has) matched.push(roll); else noSource.push(st);
    });
    const extra: string[] = [];
    sourceMssv.forEach(m => { if (!fgRolls.has(m) && !manualPairs[m]) extra.push(m); });
    return { matched, noSource, extra };
  }, [fgClass, mapped, manualPairs]);

  // Lấy điểm nguồn cho 1 roll của file (có tính ghép tay).
  const scoreFor = (src: SourceColumn, fgRoll: string): string | undefined => {
    if (src.scores.has(fgRoll)) return src.scores.get(fgRoll);
    const paired = Object.entries(manualPairs).find(([, fr]) => fr === fgRoll);
    if (paired && src.scores.has(paired[0])) return src.scores.get(paired[0]);
    return undefined;
  };

  // ---------------- Bước 6: ghi + xuất ----------------
  const buildGradesMap = (): { grades: Map<string, (string | null)[]>; writtenStudents: number; writtenCols: number } => {
    const grades = new Map<string, (string | null)[]>();
    let writtenStudents = 0;
    const compIndex: Record<string, number> = {};
    components.forEach((c, i) => { compIndex[c] = i; });
    fgClass?.students.forEach(st => {
      const roll = st.roll.toUpperCase();
      const row: (string | null)[] = new Array(components.length).fill(null);
      let any = false;
      mapped.forEach(src => {
        const comp = mapping[src.key];
        const idx = compIndex[comp];
        if (idx === undefined) return;
        const editKey = `${roll}__${src.key}`;
        const raw = previewEdits[editKey] !== undefined ? previewEdits[editKey] : scoreFor(src, roll);
        const norm = normalizeScore(raw ?? null);
        if (norm !== null) { row[idx] = norm; any = true; }
      });
      if (any) { grades.set(roll, row); writtenStudents++; }
    });
    return { grades, writtenStudents, writtenCols: mapped.length };
  };

  const doWrite = () => {
    if (!doc || fgClassIdx < 0) return;
    const { grades, writtenStudents, writtenCols } = buildGradesMap();
    confirm('Xác nhận ghi điểm', `Sẽ ghi điểm cho ${writtenStudents} sinh viên, ${writtenCols} cột điểm. ${reconcile.extra.length} dòng ở nguồn không có trong file sẽ bị bỏ. Tiếp tục?`, () => {
      writeGrades(doc, fgClassIdx, grades);
      persistPreset();
      setDirty(true); setDone(true); setStep(5);
      addNotification('Đã ghi điểm vào file trong bộ nhớ. Nhớ xuất file .fg.', 'success');
    });
  };

  const exportFile = () => {
    if (!doc || !meta) return;
    const xml = serializeFg(doc);
    const text = encodeFg(xml);
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fgFileName(meta.login, meta.semester);
    a.click();
    URL.revokeObjectURL(a.href);
    setDirty(false);
    addNotification('Đã xuất file .fg.', 'success');
  };

  const nextFromSource = () => {
    if (sourceTab === 'excel') setSelectedSources(buildExcelSources());
    // với system, selectedSources đã có sẵn qua toggle
    setTimeout(enterMapping, 0);
  };

  // ============================= RENDER =============================
  const loginWarn = meta && meta.login && currentUser.username && normName(meta.login) !== normName(currentUser.username);

  if (gridOpen && doc && fgClass) {
    return <EditGrid doc={doc} classIndex={fgClassIdx} fgClass={fgClass} onClose={() => setGridOpen(false)} onSaved={() => setDirty(true)} onExport={exportFile} />;
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-black ${i === step ? 'bg-brand text-white' : i < step ? 'bg-brand-light text-brand' : 'bg-slate-100 text-slate-400'}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className={`text-[11px] font-bold ${i === step ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Bước 1 */}
      {step === 0 && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center hover:border-brand">
            <Upload className="h-8 w-8 text-brand" />
            <span className="text-sm font-bold text-slate-700">Chọn hoặc kéo thả file .fg</span>
            <span className="text-[11px] text-slate-400">File bảng điểm xuất từ phần mềm nhập điểm của trường</span>
            <input type="file" accept=".fg" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ''; }} />
          </label>
          {meta && (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-5">
              <Info label="Tài khoản" value={meta.login} />
              <Info label="Học kỳ" value={meta.semester} />
              <Info label="Số lớp" value={String(fgClasses.length)} />
              <Info label="Tổng SV" value={String(fgClasses.reduce((s, c) => s + c.students.length, 0))} />
              <Info label="Tổng cột điểm" value={String(fgClasses.reduce((s, c) => s + c.components.length, 0))} />
            </div>
          )}
          {loginWarn && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Tài khoản trong file ({meta?.login}) khác tài khoản đang đăng nhập. Vẫn có thể tiếp tục nếu bạn nhập hộ.</p>}
        </div>
      )}

      {/* Bước 2 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {fgClasses.map(c => (
              <button key={c.index} onClick={() => setFgClassIdx(c.index)} className={`rounded-2xl border p-4 text-left transition-colors ${fgClassIdx === c.index ? 'border-brand bg-brand-light/40' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <p className="text-sm font-black text-slate-800">{c.className}</p>
                <p className="text-[11px] font-semibold text-brand">{c.subject}</p>
                <p className="mt-1 text-[11px] text-slate-400">{c.students.length} SV · {c.components.length} cột điểm</p>
              </button>
            ))}
          </div>
          {fgClass && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Lớp tương ứng trên hệ thống (để lấy điểm từ hệ thống)</label>
              <select value={sysClassId} onChange={e => setSysClassId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white">
                <option value="">Chọn lớp trên hệ thống</option>
                {sysClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-500">Hoặc nhập tay / xem lại và sửa trực tiếp điểm các cột của lớp này trong file.</span>
                <button onClick={() => setGridOpen(true)} className="shrink-0 rounded-xl border border-brand bg-white px-4 py-2 text-[11px] font-bold text-brand hover:bg-brand-light">Nhập / sửa điểm trực tiếp</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bước 3 */}
      {step === 2 && fgClass && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[40%_1fr]">
          <div className="h-fit rounded-3xl border border-slate-100 bg-white p-4 shadow-sm lg:sticky lg:top-4">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Tìm mã hoặc tên..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand" />
            </div>
            <div className="max-h-[420px] space-y-1 overflow-y-auto">
              {fgClass.students.filter(s => !studentSearch || s.roll.toLowerCase().includes(studentSearch.toLowerCase()) || s.name.toLowerCase().includes(studentSearch.toLowerCase())).map((s, i) => (
                <div key={s.roll} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] hover:bg-slate-50">
                  <span className="w-6 text-slate-400">{i + 1}</span>
                  <span className="w-20 font-bold text-slate-700">{s.roll}</span>
                  <span className="flex-1 truncate text-slate-600">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex rounded-xl bg-slate-100 p-1 w-fit">
              <button onClick={() => setSourceTab('system')} className={`rounded-lg px-4 py-2 text-xs font-bold ${sourceTab === 'system' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>Lấy điểm từ hệ thống</button>
              <button onClick={() => setSourceTab('excel')} className={`rounded-lg px-4 py-2 text-xs font-bold ${sourceTab === 'excel' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>Lấy điểm từ file Excel</button>
            </div>

            {sourceTab === 'system' ? (
              loadingSys ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div> :
              !sysClassId ? <p className="py-8 text-center text-sm text-slate-400">Chưa chọn lớp hệ thống ở bước 2.</p> :
              <div className="space-y-2">
                {sysColumns.map(col => {
                  const on = selectedSources.some(c => c.key === col.key);
                  return (
                    <button key={col.key} onClick={() => toggleSource(col)} className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left ${on ? 'border-brand bg-brand-light/40' : 'border-slate-200 hover:border-slate-300'}`}>
                      <span><span className="block text-[13px] font-bold text-slate-800">{col.label}</span><span className="block text-[11px] text-slate-400">{col.gradedCount} SV có điểm{col.lastAt ? ` · chấm gần nhất ${new Date(col.lastAt).toLocaleDateString('vi-VN')}` : ''}</span></span>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 text-transparent'}`}><Check className="h-3.5 w-3.5" /></span>
                    </button>
                  );
                })}
                {sysColumns.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Lớp này chưa có cột điểm nào.</p>}
              </div>
            ) : (
              <ExcelSource wb={wb} sheetName={sheetName} setSheetName={setSheetName} headerRow={headerRow} setHeaderRow={setHeaderRow}
                headers={excelHeaders} body={excelBody} mssvColIdx={mssvColIdx} setMssvColIdx={setMssvColIdx}
                scoreCols={excelScoreCols} setScoreCols={setExcelScoreCols} onFile={onExcel}
                onReset={() => { setWb(null); setSheetName(''); setRows([]); setMssvColIdx(-1); setExcelScoreCols(new Set()); }} />
            )}
          </div>
        </div>
      )}

      {/* Bước 4 */}
      {step === 3 && fgClass && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_1fr] bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <span>Cột điểm nguồn</span><span>Thành phần trong file .fg</span>
            </div>
            <div className="divide-y divide-slate-100">
              {selectedSources.map(src => {
                const val = mapping[src.key] || '';
                return (
                  <div key={src.key} className="grid grid-cols-[1fr_1fr] items-center gap-3 px-5 py-3">
                    <div><p className="text-[13px] font-bold text-slate-800">{src.label}</p><p className="text-[11px] text-slate-400">{src.gradedCount} SV có điểm</p></div>
                    <select value={val} onChange={e => setMap(src.key, e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white">
                      <option value="">— Chọn thành phần —</option>
                      <option value="SKIP">Bỏ qua cột này</option>
                      {Object.entries(compGroups).map(([group, opts]) => (
                        <optgroup key={group} label={group}>
                          {opts.map(o => <option key={o.value} value={o.value} disabled={usedComponents.has(o.value) && val !== o.value}>{o.label}{usedComponents.has(o.value) && val !== o.value ? ' (đã dùng)' : ''}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={savePreset} onChange={e => setSavePreset(e.target.checked)} className="h-4 w-4 accent-brand rounded" />
            <span className="text-[11px] font-bold text-slate-600">Lưu bộ ánh xạ này làm mẫu dùng lại cho lần nhập sau của cùng môn học</span>
          </label>
        </div>
      )}

      {/* Bước 5 */}
      {step === 4 && fgClass && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard color="brand" value={reconcile.matched.length} label="Khớp, có điểm ở nguồn" />
            <StatCard color="amber" value={reconcile.noSource.length} label="Trong file nhưng nguồn chưa có điểm (giữ trống)" />
            <StatCard color="rose" value={reconcile.extra.length} label="Ở nguồn nhưng không có trong file (bỏ qua)" />
          </div>

          {reconcile.extra.length > 0 && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
              <p className="mb-2 text-xs font-bold text-rose-700">Mã ở nguồn không có trong file. Bấm để ghép tay với 1 sinh viên trong file (nếu gõ sai mã).</p>
              <div className="flex flex-wrap gap-2">
                {reconcile.extra.map(m => (
                  <span key={m} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm">
                    {m}
                    <select value={manualPairs[m] || ''} onChange={e => setManualPairs(p => ({ ...p, [m]: e.target.value }))} className="ml-1 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px]">
                      <option value="">ghép với…</option>
                      {reconcile.noSource.map(s => <option key={s.roll} value={s.roll.toUpperCase()}>{s.roll} · {s.name}</option>)}
                    </select>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Xem trước */}
          <p className="text-[11px] font-medium text-slate-400">Có thể sửa điểm trực tiếp trong bảng này. Chỉnh sửa chỉ thay đổi điểm ghi vào file .fg, không ảnh hưởng điểm hiện có trên web.</p>
          <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full text-[12px]">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 text-left">MSSV</th>
                  <th className="px-3 py-2.5 text-left">Họ tên</th>
                  {mapped.map(s => <th key={s.key} className="px-3 py-2.5 text-center">{splitComponent(mapping[s.key]).label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fgClass.students.map(st => {
                  const roll = st.roll.toUpperCase();
                  return (
                    <tr key={roll} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-bold text-slate-700">{st.roll}</td>
                      <td className="px-3 py-2 text-slate-600">{st.name}</td>
                      {mapped.map(s => {
                        const editKey = `${roll}__${s.key}`;
                        const base = normalizeScore(scoreFor(s, roll) ?? null);
                        const val = previewEdits[editKey] !== undefined ? previewEdits[editKey] : (base ?? '');
                        const invalid = val.trim() !== '' && normalizeScore(val) === null;
                        return (
                          <td key={s.key} className="px-2 py-1.5 text-center">
                            <input
                              value={val}
                              onChange={e => setPreviewEdits(prev => ({ ...prev, [editKey]: e.target.value }))}
                              inputMode="decimal"
                              title="Sửa điểm này chỉ đổi trong file .fg, không đổi điểm trên web"
                              className={`h-8 w-14 rounded-lg border px-2 text-center text-[12px] font-semibold outline-none focus:border-brand ${invalid ? 'border-rose-300 bg-rose-50 text-rose-600' : val.trim() !== '' ? 'border-brand/30 bg-brand-light/40 text-brand' : 'border-slate-200 bg-white text-slate-400'}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bước 6 / hoàn tất */}
      {step === 5 && (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          {done ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Check className="h-9 w-9" /></div>
              <h2 className="mt-4 font-display text-xl font-black text-slate-900">Đã ghi điểm vào file</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Dữ liệu chỉ nằm trong phiên làm việc. Hãy xuất file .fg trước khi đóng tab. Bạn có thể nhập tiếp lớp khác rồi xuất một lần.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button onClick={exportFile} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-hover"><Download className="h-4 w-4" /> Xuất file .fg</button>
                <button onClick={() => setGridOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-brand bg-white px-6 py-3 text-sm font-bold text-brand hover:bg-brand-light"><FileText className="h-4 w-4" /> Xem & sửa toàn bộ điểm</button>
                <button onClick={() => { setStep(1); setDone(false); setFgClassIdx(-1); setSysClassId(''); setSelectedSources([]); setMapping({}); setManualPairs({}); setPreviewEdits({}); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200"><RefreshCw className="h-4 w-4" /> Nhập tiếp lớp khác</button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Bấm "Ghi điểm" ở thanh dưới để ghi vào file.</p>
          )}
        </div>
      )}

      {/* Chân: điều hướng */}
      {!(step === 5 && done) && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Quay lại</button>
          {step === 4 ? (
            <button onClick={doWrite} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-hover"><Check className="h-4 w-4" /> Ghi điểm</button>
          ) : (
            <button
              onClick={() => { if (step === 2) nextFromSource(); else setStep(s => Math.min(5, s + 1)); }}
              disabled={
                (step === 0 && !doc) ||
                (step === 1 && (fgClassIdx < 0 || !sysClassId)) ||
                (step === 2 && (sourceTab === 'system' ? selectedSources.length === 0 : excelScoreCols.size === 0)) ||
                (step === 3 && !mapped.length)
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-40">
              Tiếp tục <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="text-center"><p className="text-base font-black text-slate-800">{value || '—'}</p><p className="text-[10px] font-semibold text-slate-400">{label}</p></div>;
}
function StatCard({ color, value, label }: { color: 'brand' | 'amber' | 'rose'; value: number; label: string }) {
  const cls = color === 'brand' ? 'bg-brand-light text-brand' : color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600';
  return <div className={`rounded-2xl p-4 ${cls}`}><p className="text-2xl font-black">{value}</p><p className="text-[11px] font-semibold opacity-80">{label}</p></div>;
}

// ---------------- Nguồn Excel ----------------
function ExcelSource({ wb, sheetName, setSheetName, headerRow, setHeaderRow, headers, body, mssvColIdx, setMssvColIdx, scoreCols, setScoreCols, onFile, onReset }: {
  wb: XLSX.WorkBook | null; sheetName: string; setSheetName: (s: string) => void; headerRow: number; setHeaderRow: (n: number) => void;
  headers: any[]; body: any[][]; mssvColIdx: number; setMssvColIdx: (n: number) => void; scoreCols: Set<number>; setScoreCols: (s: Set<number>) => void; onFile: (f: File) => void; onReset: () => void;
}) {
  const toggle = (c: number) => { const n = new Set(scoreCols); n.has(c) ? n.delete(c) : n.add(c); setScoreCols(n); };
  return (
    <div className="space-y-3">
      {!wb ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center hover:border-brand">
          <Upload className="h-6 w-6 text-brand" />
          <span className="text-xs font-bold text-slate-700">Tải file Excel (.xlsx, .xls)</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ''; }} />
        </label>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><FileText className="h-3.5 w-3.5 text-brand" /> Đã tải file Excel</span>
            <button onClick={onReset} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:text-brand hover:bg-brand-light"><RefreshCw className="h-3.5 w-3.5" /> Chọn lại file khác</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-bold uppercase text-slate-500">Sheet</label>
              <select value={sheetName} onChange={e => setSheetName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-brand">{wb.SheetNames.map(n => <option key={n} value={n}>{n}</option>)}</select>
            </div>
            <div><label className="text-[10px] font-bold uppercase text-slate-500">Dòng tiêu đề</label>
              <input type="number" min={1} value={headerRow} onChange={e => setHeaderRow(Math.max(1, Number(e.target.value) || 1))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-brand" />
            </div>
          </div>
          <div><label className="text-[10px] font-bold uppercase text-slate-500">Cột mã số sinh viên</label>
            <select value={mssvColIdx} onChange={e => setMssvColIdx(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-brand">
              {headers.map((h, i) => <option key={i} value={i}>{String(h || `Cột ${i + 1}`)}</option>)}
            </select>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase text-slate-500">Chọn các cột là cột điểm</p>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {headers.map((h, i) => i === mssvColIdx ? null : (
                <button key={i} onClick={() => toggle(i)} className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs ${scoreCols.has(i) ? 'border-brand bg-brand-light/40' : 'border-slate-200'}`}>
                  <span className="min-w-0"><span className="block truncate font-bold text-slate-700">{String(h || `Cột ${i + 1}`)}</span><span className="block truncate text-[10px] text-slate-400">{body.slice(0, 3).map(r => String(r[i] ?? '')).filter(Boolean).join(' · ')}</span></span>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${scoreCols.has(i) ? 'border-brand bg-brand text-white' : 'border-slate-300 text-transparent'}`}><Check className="h-3 w-3" /></span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- Bảng nhập / xem / sửa điểm trực tiếp trong file .fg ----------------
function EditGrid({ doc, classIndex, fgClass, onClose, onSaved, onExport }: {
  doc: Document; classIndex: number; fgClass: FgClass; onClose: () => void; onSaved: () => void; onExport: () => void;
}) {
  const { addNotification } = useNotifications();
  const [grid, setGrid] = useState<Record<string, string[]>>(() => {
    const existing = readGrades(doc, classIndex);
    const g: Record<string, string[]> = {};
    fgClass.students.forEach(s => {
      const roll = s.roll.toUpperCase();
      g[roll] = existing.get(roll) ?? new Array(fgClass.components.length).fill('');
    });
    return g;
  });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const cols = fgClass.components.map(c => ({ full: c, ...splitComponent(c) }));
  const setCell = (roll: string, ci: number, val: string) => setGrid(prev => {
    const row = [...(prev[roll] || new Array(cols.length).fill(''))];
    row[ci] = val;
    return { ...prev, [roll]: row };
  });

  const invalid = (v: string) => v.trim() !== '' && normalizeScore(v) === null;

  // ---- Nhập điểm từ Excel vào bảng ----
  const [xlOpen, setXlOpen] = useState(false);
  const [xlWb, setXlWb] = useState<XLSX.WorkBook | null>(null);
  const [xlSheet, setXlSheet] = useState('');
  const [xlHeaderRow, setXlHeaderRow] = useState(1);
  const [xlRows, setXlRows] = useState<any[][]>([]);
  const [xlMssvCol, setXlMssvCol] = useState(-1);
  const [xlMap, setXlMap] = useState<Record<string, number>>({}); // componentFull -> excel col idx

  const onXlFile = async (file: File) => {
    try { const buf = await file.arrayBuffer(); const w = XLSX.read(buf, { type: 'array' }); setXlWb(w); setXlSheet(w.SheetNames[0]); }
    catch { addNotification('Không đọc được file Excel.', 'error'); }
  };
  useEffect(() => {
    if (!xlWb || !xlSheet) return;
    const arr = XLSX.utils.sheet_to_json<any[]>(xlWb.Sheets[xlSheet], { header: 1, blankrows: false, defval: '' });
    setXlRows(arr);
    const body = arr.slice(xlHeaderRow);
    let best = -1, bestSc = -1; const ncol = Math.max(...arr.map(r => r.length), 0);
    for (let c = 0; c < ncol; c++) { let hit = 0, tot = 0; for (const r of body) { const v = String(r[c] ?? '').trim(); if (v) { tot++; if (/^[A-Za-z]{2}\d{5}$/.test(v)) hit++; } } const sc = tot ? hit / tot : 0; if (sc > bestSc) { bestSc = sc; best = c; } }
    setXlMssvCol(best);
    // gợi ý map theo tên cột
    const headers = arr[xlHeaderRow - 1] || [];
    const m: Record<string, number> = {};
    cols.forEach(c => { const idx = headers.findIndex((h: any) => normName(String(h)) === normName(c.label)); if (idx >= 0 && idx !== best) m[c.full] = idx; });
    setXlMap(m);
  }, [xlWb, xlSheet, xlHeaderRow]);

  const xlHeaders = xlRows[xlHeaderRow - 1] || [];
  const xlBody = xlRows.slice(xlHeaderRow);

  const fillFromExcel = () => {
    const byMssv = new Map<string, any[]>();
    xlBody.forEach(r => { const k = String(r[xlMssvCol] ?? '').trim().toUpperCase(); if (k) byMssv.set(k, r); });
    let filled = 0;
    setGrid(prev => {
      const next = { ...prev };
      fgClass.students.forEach(s => {
        const roll = s.roll.toUpperCase();
        const r = byMssv.get(roll);
        if (!r) return;
        const row = [...(next[roll] || new Array(cols.length).fill(''))];
        cols.forEach((c, ci) => {
          const xi = xlMap[c.full];
          if (xi === undefined || xi < 0) return;
          const norm = normalizeScore(r[xi]);
          if (norm !== null) { row[ci] = norm; filled++; }
        });
        next[roll] = row;
      });
      return next;
    });
    addNotification(`Đã điền ${filled} điểm từ Excel vào bảng. Kiểm tra rồi bấm Lưu.`, 'success');
    setXlOpen(false);
  };

  const saveAll = () => {
    setSaving(true);
    try {
      const map = new Map<string, (string | null)[]>();
      fgClass.students.forEach(s => {
        const roll = s.roll.toUpperCase();
        const row = (grid[roll] || []).map(v => normalizeScore(v));
        map.set(roll, row);
      });
      writeGrades(doc, classIndex, map);
      onSaved();
      addNotification('Đã lưu toàn bộ điểm vào file. Nhớ xuất file .fg.', 'success');
    } catch (e: any) { addNotification('Lỗi lưu điểm: ' + (e.message || e), 'error'); }
    finally { setSaving(false); }
  };

  const students = fgClass.students.filter(s => !search || s.roll.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onClose} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"><ChevronLeft className="h-4 w-4" /> Quay lại</button>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setXlOpen(v => !v)} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"><Upload className="h-4 w-4 text-brand" /> Nhập từ Excel</button>
          <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lưu tất cả điểm vào file</button>
          <button onClick={onExport} className="inline-flex items-center gap-2 rounded-xl border border-brand bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-brand hover:bg-brand-light"><Download className="h-4 w-4" /> Xuất file .fg</button>
        </div>
      </div>

      {xlOpen && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800">Nhập điểm từ Excel</h3>
            <button onClick={() => setXlOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          {!xlWb ? (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center hover:border-brand">
              <Upload className="h-6 w-6 text-brand" />
              <span className="text-xs font-bold text-slate-700">Tải file Excel (.xlsx, .xls)</span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onXlFile(f); e.currentTarget.value = ''; }} />
            </label>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><FileText className="h-3.5 w-3.5 text-brand" /> Đã tải file Excel</span>
                <button onClick={() => { setXlWb(null); setXlRows([]); setXlMap({}); setXlMssvCol(-1); }} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:text-brand hover:bg-brand-light"><RefreshCw className="h-3.5 w-3.5" /> Chọn lại file khác</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[10px] font-bold uppercase text-slate-500">Sheet</label><select value={xlSheet} onChange={e => setXlSheet(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold outline-none focus:border-brand">{xlWb.SheetNames.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                <div><label className="text-[10px] font-bold uppercase text-slate-500">Dòng tiêu đề</label><input type="number" min={1} value={xlHeaderRow} onChange={e => setXlHeaderRow(Math.max(1, Number(e.target.value) || 1))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold outline-none focus:border-brand" /></div>
                <div><label className="text-[10px] font-bold uppercase text-slate-500">Cột MSSV</label><select value={xlMssvCol} onChange={e => setXlMssvCol(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold outline-none focus:border-brand">{xlHeaders.map((h: any, i: number) => <option key={i} value={i}>{String(h || `Cột ${i + 1}`)}</option>)}</select></div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase text-slate-500">Gán cột Excel cho từng cột điểm trong file</p>
                <div className="max-h-52 space-y-1.5 overflow-y-auto">
                  {cols.map(c => (
                    <div key={c.full} className="grid grid-cols-[1fr_1fr] items-center gap-2">
                      <span className="truncate text-[12px] font-semibold text-slate-700" title={c.full}><span className="text-[9px] font-bold uppercase text-slate-400">{c.group} · </span>{c.label}</span>
                      <select value={xlMap[c.full] ?? -1} onChange={e => setXlMap(m => ({ ...m, [c.full]: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold outline-none focus:border-brand">
                        <option value={-1}>— Không lấy —</option>
                        {xlHeaders.map((h: any, i: number) => i === xlMssvCol ? null : <option key={i} value={i}>{String(h || `Cột ${i + 1}`)}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={fillFromExcel} className="w-full rounded-xl bg-brand py-2.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-brand-hover">Điền điểm vào bảng</button>
            </>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900">{fgClass.className} · {fgClass.subject}</h2>
            <p className="text-[11px] text-slate-400">{fgClass.students.length} sinh viên · {cols.length} cột điểm. Nhập trực tiếp, ô ngoài 0–10 sẽ bị coi là để trống.</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã hoặc tên..." className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand" />
          </div>
        </div>

        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-full border-separate border-spacing-0 text-[12px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 top-0 z-20 bg-slate-50 px-2 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">STT</th>
                <th className="sticky left-[44px] top-0 z-20 bg-slate-50 px-2 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">MSSV</th>
                <th className="sticky left-[132px] top-0 z-20 bg-slate-50 px-2 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Họ tên</th>
                {cols.map((c, i) => (
                  <th key={i} className="sticky top-0 z-10 bg-slate-50 px-2 py-2 text-center text-[10px] font-black text-slate-500" title={c.full}>
                    <span className="block text-[8px] font-bold uppercase text-slate-400">{c.group}</span>{c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const roll = s.roll.toUpperCase();
                return (
                  <tr key={roll} className="odd:bg-white even:bg-slate-50/40">
                    <td className="sticky left-0 z-10 bg-inherit px-2 py-1 text-slate-400">{idx + 1}</td>
                    <td className="sticky left-[44px] z-10 bg-inherit px-2 py-1 font-bold text-slate-700">{s.roll}</td>
                    <td className="sticky left-[132px] z-10 bg-inherit px-2 py-1 text-slate-600 whitespace-nowrap">{s.name}</td>
                    {cols.map((_c, ci) => {
                      const val = grid[roll]?.[ci] ?? '';
                      return (
                        <td key={ci} className="px-1 py-1">
                          <input value={val} onChange={e => setCell(roll, ci, e.target.value)} inputMode="decimal"
                            className={`h-8 w-14 rounded-lg border px-2 text-center text-[12px] font-semibold outline-none focus:border-brand ${invalid(val) ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-800'}`} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
