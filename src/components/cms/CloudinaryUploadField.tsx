import React, { useState } from 'react';
import { X, Image, Film, Link as LinkIcon, RefreshCw, Play } from 'lucide-react';
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
  compact?: boolean;
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
  hint,
  compact = false
}: CloudinaryUploadFieldProps) {
  const [showUrlInput, setShowUrlInput] = useState(false);

  const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    
    // Try direct 11-character video ID
    if (trimmed.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return `https://www.youtube.com/embed/${trimmed}`;
    }
    
    // 1. Shorts format: youtube.com/shorts/VIDEO_ID
    const shortsMatch = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/i);
    if (shortsMatch) {
      return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    }
    
    // 2. Live format: youtube.com/live/VIDEO_ID
    const liveMatch = trimmed.match(/\/live\/([a-zA-Z0-9_-]{11})/i);
    if (liveMatch) {
      return `https://www.youtube.com/embed/${liveMatch[1]}`;
    }
    
    // 3. Embed format: youtube.com/embed/VIDEO_ID
    const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/i);
    if (embedMatch) {
      return `https://www.youtube.com/embed/${embedMatch[1]}`;
    }
    
    // 4. Standard/Mobile watch format: watch?v=VIDEO_ID or &v=VIDEO_ID
    const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
    if (vMatch) {
      return `https://www.youtube.com/embed/${vMatch[1]}`;
    }
    
    // 5. Shortened format: youtu.be/VIDEO_ID
    const youtuMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (youtuMatch) {
      return `https://www.youtube.com/embed/${youtuMatch[1]}`;
    }
    
    // 6. Generic regex backup
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    
    return null;
  };

  const ytEmbedUrl = getYouTubeEmbedUrl(value || '');

  const isVideo = value && (
    value.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi|flv|mkv)$/) ||
    resourceType === 'video' ||
    accept.includes('video') ||
    ytEmbedUrl !== null
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[9px] font-bold text-brand hover:text-brand-hover flex items-center gap-1 transition-colors"
          >
            <LinkIcon className="h-3 w-3" />
            <span>{showUrlInput ? 'Ẩn URL' : 'Sửa URL thủ công'}</span>
          </button>
        )}
      </div>

      {value ? (
        compact ? (
          /* Compact Media Card Preview */
          <div className="flex items-center justify-between gap-3 p-2 bg-white border border-slate-200/70 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative group shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-slate-100 shadow-xs h-9 w-14">
                {ytEmbedUrl ? (
                  <div className="absolute inset-0 bg-red-600 flex items-center justify-center text-white font-bold text-[8px] uppercase tracking-wider">
                    YouTube
                  </div>
                ) : isVideo ? (
                  <video src={value} className="absolute inset-0 h-full w-full object-cover opacity-80" muted playsInline />
                ) : (
                  <img src={value} alt="Media preview" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-700 truncate">
                  {ytEmbedUrl ? 'Liên kết YouTube' : (value.substring(value.lastIndexOf('/') + 1) || 'Liên kết ngoài')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <MediaSourcePicker
                onSelect={onChange}
                onSelectMultiple={onMultiple}
                accept={accept}
                resourceType={resourceType}
                folder={folder}
                multiple={multiple}
                label="Đổi"
              />
              <button
                type="button"
                aria-label="Xóa file"
                onClick={() => {
                  onChange('');
                  setShowUrlInput(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 border border-slate-200/60 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Media Card Preview */
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-white border border-slate-200/70 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
            {/* Thumbnail */}
            <div className="relative group shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-100 shadow-sm">
              {ytEmbedUrl ? (
                <div className="relative h-16 w-28 flex items-center justify-center bg-slate-950 text-white">
                  <iframe src={ytEmbedUrl} className="absolute inset-0 h-full w-full pointer-events-none border-0" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play className="h-6 w-6 text-red-500 fill-red-500 drop-shadow-sm" />
                  </div>
                </div>
              ) : isVideo ? (
                <div className="relative h-16 w-28 flex items-center justify-center">
                  <video src={value} className="absolute inset-0 h-full w-full object-cover opacity-80" muted playsInline />
                  <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center group-hover:bg-slate-950/10 transition-colors">
                    <Play className="h-6 w-6 text-white fill-white drop-shadow-sm" />
                  </div>
                </div>
              ) : (
                <img src={value} alt="Media preview" className="h-16 w-28 object-cover group-hover:scale-105 transition-transform duration-300" />
              )}
            </div>

            {/* Info & Actions */}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-bold text-slate-700 truncate max-w-full">
                {ytEmbedUrl ? 'Video YouTube' : (value.substring(value.lastIndexOf('/') + 1) || 'Liên kết ngoài')}
              </p>
              <p className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
                {isVideo ? <Film className="h-2.5 w-2.5" /> : <Image className="h-2.5 w-2.5" />}
                <span>{ytEmbedUrl ? 'Liên kết YouTube Embed' : isVideo ? 'Định dạng Video' : 'Định dạng Hình ảnh'}</span>
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <MediaSourcePicker
                onSelect={onChange}
                onSelectMultiple={onMultiple}
                accept={accept}
                resourceType={resourceType}
                folder={folder}
                multiple={multiple}
                label="Thay đổi"
              />
              <button
                type="button"
                aria-label="Xóa file"
                onClick={() => {
                  onChange('');
                  setShowUrlInput(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/60 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all duration-200"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )
      ) : (
        compact ? (
          /* Compact Empty State */
          <div className="flex items-center justify-between border border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-2.5 hover:border-brand/40 hover:bg-slate-50 transition-all duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-white rounded-lg text-slate-400 border border-slate-100 shrink-0">
                {accept.includes('video') ? <Film className="h-4 w-4" /> : <Image className="h-4 w-4" />}
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] font-bold text-slate-700 truncate">Chưa cấu hình {label.toLowerCase()}</p>
                <p className="text-[8px] text-slate-400 truncate">Chọn từ thư viện hoặc dán URL</p>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <MediaSourcePicker
                onSelect={onChange}
                onSelectMultiple={onMultiple}
                accept={accept}
                resourceType={resourceType}
                folder={folder}
                multiple={multiple}
                label="Chọn"
              />
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-[9px] font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
              >
                <LinkIcon className="h-2.5 w-2.5" />
                <span>URL</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty State Horizontal style */
          <div className="flex flex-wrap items-center justify-between border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-4 gap-4 hover:border-brand/40 hover:bg-slate-50 transition-all duration-200">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 shrink-0">
                {accept.includes('video') ? <Film className="h-6 w-6" /> : <Image className="h-6 w-6" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 whitespace-nowrap">Chưa cấu hình {label.toLowerCase()}</p>
                <p className="text-[9px] text-slate-400 mt-1 line-clamp-1">Chọn từ Thư viện hoặc dán liên kết URL.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-end w-full sm:w-auto">
              <MediaSourcePicker
                onSelect={onChange}
                onSelectMultiple={onMultiple}
                accept={accept}
                resourceType={resourceType}
                folder={folder}
                multiple={multiple}
                label="Chọn từ Thư viện"
              />
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
              >
                <LinkIcon className="h-3 w-3" />
                <span>Dán URL ngoài</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* Manual URL Input */}
      {(showUrlInput || !value) && (
        <div className="relative mt-2">
          <input
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder="Dán liên kết ngoài (URL ảnh, video .mp4, v.v.) vào đây"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
        </div>
      )}

      {hint && <p className="text-[9px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
