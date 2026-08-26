import React, { useState } from 'react';
import { Image as ImageIcon, Scan, Wrench } from 'lucide-react';
import ARModule from './ARModule';
import ImageResizer from './utilities/ImageResizer';
import { UserAccount } from '../types';

/**
 * Module Tiện ích, nơi gom các công cụ phụ trợ dùng chung cho công việc giảng dạy
 * và làm nội dung. Trước đây chức năng tạo AR đứng riêng một mục ngoài thanh điều
 * hướng, nay được đưa vào đây cùng công cụ chỉnh kích thước ảnh, để về sau thêm
 * công cụ mới thì thanh điều hướng không bị dài ra thêm.
 */

export type UtilityToolId = 'ar' | 'image_resize';

interface UtilityTool {
  id: UtilityToolId;
  label: string;
  description: string;
  icon: React.ElementType;
}

export const UTILITY_TOOLS: UtilityTool[] = [
  {
    id: 'ar',
    label: 'Tạo AR',
    description: 'Tạo điểm ảnh nhận diện thực tế tăng cường kèm mã QR để người xem quét bằng điện thoại.',
    icon: Scan
  },
  {
    id: 'image_resize',
    label: 'Phóng to ảnh',
    description: 'Phóng to ảnh theo phần trăm tùy chọn và làm rõ chi tiết, có thể nhờ Gemini dựng lại ảnh ở độ phân giải cao hơn.',
    icon: ImageIcon
  }
];

interface UtilitiesModuleProps {
  currentUser: UserAccount;
  initialTool?: UtilityToolId;
}

export default function UtilitiesModule({ currentUser, initialTool = 'ar' }: UtilitiesModuleProps) {
  const [activeTool, setActiveTool] = useState<UtilityToolId>(initialTool);
  const active = UTILITY_TOOLS.find(tool => tool.id === activeTool) || UTILITY_TOOLS[0];

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-800">Tiện ích</h1>
            <p className="text-xs text-slate-500">Các công cụ hỗ trợ soạn nội dung và tư liệu giảng dạy.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {UTILITY_TOOLS.map(tool => {
            const Icon = tool.icon;
            const isActive = tool.id === activeTool;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  isActive ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tool.label}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{active.description}</p>
      </div>

      {activeTool === 'ar' ? <ARModule currentUser={currentUser} /> : <ImageResizer />}
    </div>
  );
}
