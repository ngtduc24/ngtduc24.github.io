import React from 'react';
import { X } from 'lucide-react';
import { CloudinaryResourceType } from '../../lib/upload';
import MediaSourcePicker from '../MediaSourcePicker';

interface CloudinaryUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  resourceType?: CloudinaryResourceType;
  folder?: string;
  multiple?: boolean;
  onMultiple?: (urls: string[]) => void;
  hint?: string;
}

export default function CloudinaryUploadField({
  label,
  value,
  onChange,
  accept = 'image/*',
  resourceType = 'auto',
  folder = 'portfolio',
  multiple = false,
  onMultiple,
  hint
}: CloudinaryUploadFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</label>
      <div className="flex gap-2">
        <input value={value} onChange={event => onChange(event.target.value)} placeholder="URL Cloudinary hoặc liên kết ngoài" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20" />
        <MediaSourcePicker
          onSelect={onChange}
          onSelectMultiple={onMultiple}
          accept={accept}
          resourceType={resourceType}
          folder={folder}
          multiple={multiple}
          label="Chọn media"
        />
        {value && <button type="button" aria-label={`Xóa ${label}`} onClick={() => onChange('')} className="rounded-xl bg-slate-100 p-2.5 text-slate-500 hover:text-rose-500"><X className="h-4 w-4" /></button>}
      </div>
      {hint && <p className="text-[9px] text-slate-400">{hint}</p>}
    </div>
  );
}
