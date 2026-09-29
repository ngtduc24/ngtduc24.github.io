import React, { useEffect, useState } from 'react';
import { FileText, FileDown, Loader2, Link2, Check } from 'lucide-react';
import { EduAssignmentBankItem } from '../../types/edu';
import { getBankItemByShareToken } from '../../lib/edu';
import { exportAssignmentToPdf, subjectNameById } from '../../lib/assignmentPdf';
import { eduFileTypeLabel } from '../../lib/eduFileTypes';
import { EduResourceList } from './EduResources';

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
  const copyLink = () => { navigator.clipboard?.writeText(window.location.href.split('#')[0]); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><FileText className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base font-bold text-slate-900 sm:text-lg">{item.title}</h1>
            <p className="text-[12px] text-slate-400">{[subject && `Môn ${subject}`, author].filter(Boolean).join(' · ') || 'Bài tập'}</p>
          </div>
          <button onClick={copyLink} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:border-brand/30 hover:text-brand">
            {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Link2 className="h-3.5 w-3.5" />} {copied ? 'Đã chép link' : 'Chép link'}
          </button>
          <button onClick={() => exportAssignmentToPdf({ title: item.title, content: item.content, subjectName: subject, author, allowedFileTypes: item.allowedFileTypes, resources: item.resources })}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-[11px] font-bold text-white hover:bg-brand-hover">
            <FileDown className="h-3.5 w-3.5" /> Tải PDF
          </button>
        </div>
      </div>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Yêu cầu và hướng dẫn</p>
          {item.content && item.content.replace(/<[^>]+>/g, '').trim() || /<img/i.test(item.content || '')
            ? <div className="prose prose-slate max-w-none break-words text-[15px] leading-relaxed text-slate-700 [overflow-wrap:anywhere] [&_a]:break-all" dangerouslySetInnerHTML={{ __html: item.content || '' }} />
            : <p className="text-sm italic text-slate-400">Bài tập này chưa có phần yêu cầu và hướng dẫn.</p>}
          <EduResourceList resources={item.resources} className="mt-6 border-t border-slate-100 pt-5" />
        </div>
        <div className="h-fit space-y-3 rounded-3xl border border-slate-100 bg-white p-5 text-[13px] shadow-sm lg:sticky lg:top-6">
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
