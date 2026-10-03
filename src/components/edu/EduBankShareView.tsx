import React, { useEffect, useState } from 'react';
import { FileText, FileDown, Loader2, Link2, Check } from 'lucide-react';
import { EduAssignmentBankItem } from '../../types/edu';
import { getBankItemByShareToken } from '../../lib/edu';
import { exportAssignmentToPdf, subjectNameById } from '../../lib/assignmentPdf';
import { eduFileTypeLabel } from '../../lib/eduFileTypes';
import { EduResourceList } from './EduResources';
import { copyText } from '../ui/Dialogs';

// Trang xem bài tập trong ngân hàng qua link chia sẻ: ai có link đều xem được, không cần đăng nhập, không cần MSSV.
export default function EduBankShareView({ token }: { token: string }) {
  const [item, setItem] = useState<EduAssignmentBankItem | null>(null);
  const [subject, setSubject] = useState('');
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getBankItemByShareToken(token)
      .then(async it => {
        if (!it) { setState('missing'); return; }
        setItem(it);
        setState('ok');
        document.title = it.title;
        // Đổi thanh địa chỉ về link chia sẻ /bt/<mã>/ để ai chép link từ thanh địa chỉ vẫn có khung xem trước.
        try { window.history.replaceState(null, '', `/bt/${token}/`); } catch { /* bỏ qua */ }
        setSubject(await subjectNameById(it.subjectId));
      })
      .catch(() => setState('missing'));
  }, [token]);

  if (state === 'loading') return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-400"><span className="inline-flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải bài tập...</span></div>;
  if (state === 'missing' || !item) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center">
        <div>
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-600">Không tìm thấy bài tập</p>
          <p className="mt-1 text-xs text-slate-400">Link có thể đã bị thu hồi hoặc bài tập đã bị xoá.</p>
        </div>
      </div>
    );
  }

  const author = item.ownerName || '';
  const formats = (item.allowedFileTypes || []).map(eduFileTypeLabel).join(', ');
  const copyLink = () => { copyText(`${window.location.origin}/bt/${token}/`); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85" style={{ borderTop: 'env(safe-area-inset-top) solid var(--color-brand-hover, #059669)' }}>
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand sm:grid"><FileText className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <h1 title={item.title} className="line-clamp-2 font-display text-[14px] font-bold leading-snug text-slate-900 sm:text-lg">{item.title}</h1>
            <p className="truncate text-[12px] text-slate-400">{[subject && `Môn ${subject}`, author].filter(Boolean).join(' · ') || 'Bài tập'}</p>
          </div>
          <button onClick={copyLink} title="Chép link" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 hover:border-brand/30 hover:text-brand sm:px-3">
            {copied ? <Check className="h-4 w-4 text-brand sm:h-3.5 sm:w-3.5" /> : <Link2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />} <span className="hidden sm:inline">{copied ? 'Đã chép link' : 'Chép link'}</span>
          </button>
          <button onClick={() => exportAssignmentToPdf({ title: item.title, content: item.content, subjectName: subject, author, allowedFileTypes: item.allowedFileTypes, resources: item.resources })}
            title="Tải PDF" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-2.5 text-[11px] font-bold text-white hover:bg-brand-hover sm:px-3">
            <FileDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Tải PDF</span>
          </button>
        </div>
      </div>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Yêu cầu và hướng dẫn</p>
          {item.content && item.content.replace(/<[^>]+>/g, '').trim() || /<(img|video|iframe)/i.test(item.content || '')
            ? <div className="prose prose-slate max-w-none break-words text-[15px] leading-relaxed text-slate-700 [overflow-wrap:anywhere] [&_a]:break-all" dangerouslySetInnerHTML={{ __html: item.content || '' }} />
            : <p className="text-sm italic text-slate-400">Bài tập này chưa có phần yêu cầu và hướng dẫn.</p>}
          <EduResourceList resources={item.resources} className="mt-6 border-t border-slate-100 pt-5" />
        </div>
        <div className="h-fit space-y-3 rounded-3xl border border-slate-100 bg-white p-5 text-[13px] shadow-sm lg:sticky lg:top-[92px]">
          <p className="text-[10px] font-black uppercase text-slate-400">Thông tin</p>
          {subject && <Row k="Môn học" v={subject} />}
          {formats && <Row k="Định dạng nộp" v={formats} />}
          <Row k="Tài nguyên" v={`${(item.resources || []).length} mục`} />
          {author && <Row k="Giảng viên" v={author} />}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-start justify-between gap-3"><span className="text-slate-500">{k}</span><span className="text-right font-semibold text-slate-800">{v}</span></div>;
}
