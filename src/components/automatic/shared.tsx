import React from 'react';
import {
  MousePointerClick, Clock, Globe, PenLine, GitBranch, Filter, Split, Merge, Code2, Hourglass, CalendarClock,
  ArrowUpDown, ListEnd, CopyMinus, Ungroup, Group, ArrowRight, OctagonX, Bell, ListTodo, Database, Plus, Workflow as WorkflowIco, Box,
} from 'lucide-react';
import type { NodeType, WNode, Workflow } from '../../lib/automatic/types';
import { getNodeType } from '../../lib/automatic/nodes';

const ICONS: Record<string, any> = {
  MousePointerClick, Clock, Globe, PenLine, GitBranch, Filter, Split, Merge, Code2, Hourglass, CalendarClock,
  ArrowUpDown, ListEnd, CopyMinus, Ungroup, Group, ArrowRight, OctagonX, Bell, ListTodo, Database, Plus, Workflow: WorkflowIco,
};

export function Icon({ name, size = 20, className, style }: { name: string; size?: number; className?: string; style?: React.CSSProperties }) {
  const C = ICONS[name] || Box;
  return <C size={size} className={className} style={style} />;
}

export function NodeIcon({ type, size = 22, boxed = false }: { type: NodeType | undefined; size?: number; boxed?: boolean }) {
  const color = type?.color || '#64748b';
  if (!boxed) return <Icon name={type?.icon || 'Box'} size={size} style={{ color }} />;
  return (
    <span className="grid shrink-0 place-items-center rounded-lg" style={{ width: size + 14, height: size + 14, background: color + '1a' }}>
      <Icon name={type?.icon || 'Box'} size={size} style={{ color }} />
    </span>
  );
}

export function uniqueName(wf: Pick<Workflow, 'nodes'>, base: string, except?: string) {
  const names = new Set(wf.nodes.filter(n => n.name !== except).map(n => n.name));
  if (!names.has(base)) return base;
  const stem = base.replace(/\s\d+$/, '');
  for (let i = 1; i < 1000; i++) { const n = `${stem} ${i}`; if (!names.has(n)) return n; }
  return `${stem} ${Date.now()}`;
}

// Đổi tên bước thì sửa luôn các biểu thức đang tham chiếu tới tên cũ
export function renameInParams(params: any, oldName: string, newName: string): any {
  const esc = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(`\\$\\(\\s*(['"\`])${esc}\\1\\s*\\)`, 'g');
  const re2 = new RegExp(`\\$node\\[\\s*(['"\`])${esc}\\1\\s*\\]`, 'g');
  const walk = (v: any): any => {
    if (typeof v === 'string') return v.replace(re1, (_m, q) => `$(${q}${newName}${q})`).replace(re2, (_m, q) => `$node[${q}${newName}${q}]`);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') { const o: any = {}; for (const k of Object.keys(v)) o[k] = walk(v[k]); return o; }
    return v;
  };
  return walk(params);
}

export const nodeTypeOf = (n: WNode) => getNodeType(n.type);

export function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} giây`;
  const m = Math.floor(ms / 60000), s = Math.round((ms % 60000) / 1000);
  return `${m} phút ${s} giây`;
}

export function fmtTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtAgo(iso?: string | null) {
  if (!iso) return '';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function Toggle({ on, onChange, disabled, title, size = 'md' }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; title?: string; size?: 'sm' | 'md' }) {
  const w = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11', k = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', tx = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button type="button" role="switch" aria-checked={on} title={title} disabled={disabled} onClick={e => { e.stopPropagation(); onChange(!on); }}
      className={`relative inline-flex shrink-0 items-center rounded-full transition ${w} ${on ? 'bg-brand' : 'bg-slate-300'} ${disabled ? 'opacity-50' : ''}`}>
      <span className={`inline-block transform rounded-full bg-white shadow transition ${k} ${on ? tx : 'translate-x-0.5'}`} />
    </button>
  );
}

// Lớp phủ riêng của trình soạn quy trình (nằm trên khung soạn, dưới hộp xác nhận chung)
export function Overlay({ onClose, children, className = '' }: { onClose: () => void; children: React.ReactNode; className?: string }) {
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  return (
    <div className={`fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/50 p-2 backdrop-blur-[2px] sm:p-4 ${className}`} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}
