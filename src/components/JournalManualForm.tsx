import { uploadImageToCloudinary } from '../lib/upload';
import MediaSourcePicker from './MediaSourcePicker';
import React from "react";
import { Plus, Image as ImageIcon, X } from "lucide-react";
import { ScientificJournal, JournalField, JournalType } from "../types";
import { useNotifications } from './NotificationContext';

interface JournalManualFormProps {
  formState: Partial<ScientificJournal>;
  setFormState: React.Dispatch<React.SetStateAction<Partial<ScientificJournal>>>;
  isEditing: boolean;
  handleFormSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  fieldsList?: JournalField[];
  typesList?: JournalType[];
}

export default function JournalManualForm({
  formState,
  setFormState,
  isEditing,
  handleFormSubmit,
  onCancel,
  fieldsList = [],
  typesList = []
}: JournalManualFormProps) {
  const { addNotification } = useNotifications();
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Plus className="w-5 h-5 text-purple-600" />
          <span>{isEditing ? "Cập nhật tạp chí khoa học" : "Thêm mới tạp chí thủ công"}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Nhập thông tin chi tiết của bài báo/tạp chí theo mẫu chuẩn hóa bên dưới.
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Tên tạp chí khoa học *</label>
            <input
              type="text"
              required
              value={formState.name || ""}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#712cf9]/20 focus:border-[#712cf9] transition-all"
              placeholder="Ví dụ: Tạp chí Khoa học và Công nghệ Việt Nam"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Mã số ISSN</label>
            <input
              type="text"
              value={formState.issn || ""}
              onChange={(e) => setFormState({ ...formState, issn: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#712cf9]/20 focus:border-[#712cf9] transition-all font-mono"
              placeholder="Ví dụ: 1859-1868"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Phân loại tạp chí</label>
            <select
              value={formState.type || "Tạp chí"}
              onChange={(e) => setFormState({ ...formState, type: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#712cf9]/20 focus:border-[#712cf9] transition-all cursor-pointer"
            >
              {typesList.length > 0 ? (
                typesList.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))
              ) : (
                <>
                  <option value="Tạp chí">Tạp chí</option>
                  <option value="Tạp chí ACI">Tạp chí ACI</option>
                  <option value="Tạp chí Scopus">Tạp chí Scopus</option>
                  <option value="Tạp chí SCIE">Tạp chí SCIE</option>
                  <option value="Chuyên san">Chuyên san</option>
                  <option value="Kỷ yếu">Kỷ yếu</option>
                  <option value="Tạp chí quốc tế">Tạp chí quốc tế</option>
                  <option value="Tạp chí Trong nước">Tạp chí Trong nước</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Cơ quan xuất bản</label>
            <input
              type="text"
              value={formState.publisher || ""}
              onChange={(e) => setFormState({ ...formState, publisher: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#712cf9]/20 focus:border-[#712cf9] transition-all"
              placeholder="Ví dụ: Viện Hàn lâm Khoa học và Công nghệ VN"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Ngành / Lĩnh vực</label>
            <select
              value={formState.field || ""}
              onChange={(e) => setFormState({ ...formState, field: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#712cf9]/20 focus:border-[#712cf9] transition-all cursor-pointer"
            >
              <option value="">-- Chọn ngành học --</option>
              {fieldsList.length > 0 ? (
                fieldsList.map(f => (
                  <option key={f.id} value={f.name}>{f.name}</option>
                ))
              ) : (
                <>
                  <option value="Kinh tế">Kinh tế</option>
                  <option value="Y học">Y học</option>
                  <option value="Công nghệ thông tin">Công nghệ thông tin</option>
                  <option value="Khoa học Giáo dục">Khoa học Giáo dục</option>
                  <option value="Tâm lý học">Tâm lý học</option>
                  <option value="Xây dựng - Kiến trúc">Xây dựng - Kiến trúc</option>
                  <option value="Sinh học">Sinh học</option>
                  <option value="Hoá học - Công nghệ thực phẩm">Hoá học - Công nghệ thực phẩm</option>
                  <option value="Toán học">Toán học</option>
                  <option value="Vật lý">Vật lý</option>
                  <option value="Luật học">Luật học</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Điểm số tạp chí (Score)</label>
            <select
              value={formState.score || "0 – 0,75"}
              onChange={(e) => setFormState({ ...formState, score: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#712cf9]/20 focus:border-[#712cf9] transition-all cursor-pointer"
            >
              <option value="0 – 0,25">0 – 0,25</option>
              <option value="0 – 0,5">0 – 0,5</option>
              <option value="0 – 0,75">0 – 0,75</option>
              <option value="0 – 1,0">0 – 1,0</option>
              <option value="0 – 1,5">0 – 1,5</option>
              <option value="0 – 3,0">0 – 3,0</option>
              <option value="1.0">1.0</option>
              <option value="0.5">0.5</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Độ uy tín (1-5 Sao)</label>
            <select
              value={formState.rating || 3}
              onChange={(e) => setFormState({ ...formState, rating: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#712cf9]/20 focus:border-[#712cf9] transition-all cursor-pointer"
            >
              <option value={1}>1 Sao</option>
              <option value={2}>2 Sao</option>
              <option value={3}>3 Sao</option>
              <option value={4}>4 Sao</option>
              <option value={5}>5 Sao</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Năm thành lập</label>
            <input
              type="text"
              value={formState.establishedDate || ""}
              onChange={(e) => setFormState({ ...formState, establishedDate: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#712cf9]/20 focus:border-[#712cf9] transition-all"
              placeholder="Ví dụ: 1995"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Số lượng bài viết</label>
            <input
              type="number"
              value={formState.paperCount || 100}
              onChange={(e) => setFormState({ ...formState, paperCount: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#712cf9]/20 focus:border-[#712cf9] transition-all"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-brand" />
              <span>Tải lên File ảnh đại diện riêng</span>
            </label>
            <div className="flex items-center gap-4">
              {formState.coverImage && (
                <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                  <img src={formState.coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormState({ ...formState, coverImage: "" })}
                    className="absolute top-0.5 right-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 cursor-pointer shadow-sm transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
              <div className="flex-1">
                <MediaSourcePicker onSelect={url => setFormState(current => ({ ...current, coverImage: url }))} accept="image/*" resourceType="image" folder="journals/covers" category="Ảnh bìa báo khoa học" label="Chọn ảnh bìa" />
                <p className="text-[10px] text-slate-400 mt-1">Chọn file ảnh từ thiết bị, kích thước tối đa 800KB. Nếu trống sẽ áp dụng ảnh bìa mặc định.</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Giới thiệu chi tiết</label>
            <textarea
              rows={3}
              value={formState.description || ""}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#712cf9]/20 focus:border-[#712cf9] transition-all"
              placeholder="Nhập giới thiệu tổng quan hoặc tóm tắt thông tin..."
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Huỷ bỏ
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            Lưu dữ liệu
          </button>
        </div>
      </form>
    </div>
  );
}
