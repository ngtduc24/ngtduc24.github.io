import React, { useState } from "react";
import { Trash2, Sparkles, AlertCircle, Database, CheckSquare, Square, Check, X, Info } from "lucide-react";
import { ScientificJournal } from "../types";

interface JournalAIImportProps {
  extractedRows: any[];
  setExtractedRows: React.Dispatch<React.SetStateAction<any[]>>;
  fieldsList: any[];
  typesList: any[];
  onImportSelected: (selectedRows: any[]) => Promise<void>;
  onClear: () => void;
  loading: boolean;
}

export default function JournalAIImport({
  extractedRows,
  setExtractedRows,
  fieldsList,
  typesList,
  onImportSelected,
  onClear,
  loading
}: JournalAIImportProps) {
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Initialize selection when extractedRows change
  React.useEffect(() => {
    const initialSelection: Record<string, boolean> = {};
    extractedRows.forEach((row, index) => {
      const id = row.tempId || `ai-row-${index}`;
      initialSelection[id] = true; // Default selected
    });
    setSelectedIds(initialSelection);
  }, [extractedRows]);

  // Handle select all
  const handleSelectAll = () => {
    const newSelection: Record<string, boolean> = {};
    extractedRows.forEach((row, index) => {
      const id = row.tempId || `ai-row-${index}`;
      newSelection[id] = true;
    });
    setSelectedIds(newSelection);
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedIds({});
  };

  // Toggle single row selection
  const handleToggleRow = (tempId: string) => {
    setSelectedIds(prev => ({
      ...prev,
      [tempId]: !prev[tempId]
    }));
  };

  // Update a field in a specific row
  const handleFieldChange = (tempId: string, fieldKey: string, value: any) => {
    setExtractedRows(prev =>
      prev.map(row => {
        if (row.tempId === tempId) {
          return { ...row, [fieldKey]: value };
        }
        return row;
      })
    );
  };

  // Delete a row from preview
  const handleDeleteRow = (tempId: string) => {
    setExtractedRows(prev => prev.filter(row => row.tempId !== tempId));
    setSelectedIds(prev => {
      const updated = { ...prev };
      delete updated[tempId];
      return updated;
    });
  };

  // Get selected rows
  const getSelectedRows = () => {
    return extractedRows.filter(row => selectedIds[row.tempId]);
  };

  const selectedRows = getSelectedRows();
  const totalRows = extractedRows.length;
  const selectedCount = selectedRows.length;

  if (extractedRows.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-800">Không có dữ liệu quét AI</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Vui lòng vào tab <strong>"Công cụ & AI"</strong> tải lên file PDF bảng điểm hoặc bài báo khoa học để AI quét dữ liệu hàng loạt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn space-y-6 p-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1.5 text-left">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>Kết quả quét AI thông minh (Xem & Hiệu chỉnh)</span>
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Phát hiện <strong className="text-purple-600">{totalRows} tạp chí</strong> từ tài liệu PDF. Bạn có thể chỉnh sửa trực tiếp nội dung, chọn hoặc bỏ chọn và nhập hàng loạt vào hệ thống.
          </p>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Chọn tất cả
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Bỏ chọn tất cả
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-3.5 py-2 bg-rose-50 border border-rose-100 hover:bg-rose-100/60 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Dọn dẹp lại
          </button>
        </div>
      </div>

      {/* Summary Stat Bar */}
      <div className="p-4 bg-brand-light/50 border border-brand-light rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-left">
          <Info className="w-4.5 h-4.5 text-brand" />
          <span className="text-xs font-bold text-slate-700">
            Đã chọn <span className="text-brand text-sm font-extrabold">{selectedCount}</span> trên <span className="text-slate-900">{totalRows}</span> tạp chí sẵn sàng nhập.
          </span>
        </div>

        <button
          type="button"
          disabled={loading || selectedCount === 0}
          onClick={() => onImportSelected(selectedRows)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
            selectedCount > 0 && !loading
              ? "bg-brand hover:bg-brand-hover text-white"
              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
          }`}
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span>Đang lưu vào DB...</span>
            </>
          ) : (
            <>
              <Database className="w-3.5 h-3.5" />
              <span>Nhập dữ liệu được chọn ({selectedCount})</span>
            </>
          )}
        </button>
      </div>

      {/* Editable Table */}
      <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="w-12 py-3 px-4 text-center">Chọn</th>
                <th className="w-[200px] py-3 px-3">Tên tạp chí khoa học</th>
                <th className="w-[110px] py-3 px-3">ISSN</th>
                <th className="w-[140px] py-3 px-3">Phân loại (Type)</th>
                <th className="w-[150px] py-3 px-3">Cơ quan xuất bản</th>
                <th className="w-[160px] py-3 px-3">Ngành (Field)</th>
                <th className="w-[90px] py-3 px-3">Điểm</th>
                <th className="w-[200px] py-3 px-3">Mô tả tóm tắt</th>
                <th className="w-14 py-3 px-3 text-center">Xoá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {extractedRows.map((row) => {
                const isSelected = !!selectedIds[row.tempId];
                return (
                  <tr 
                    key={row.tempId} 
                    className={`transition-colors ${
                      isSelected ? "bg-purple-50/10 hover:bg-purple-50/20" : "bg-white hover:bg-slate-50/50"
                    }`}
                  >
                    {/* Checkbox Column */}
                    <td className="py-2.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleRow(row.tempId)}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-md border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-600 border-purple-600 text-white"
                            : "bg-white border-slate-300 hover:border-purple-500 text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </td>

                    {/* Name Column (Text Input) */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.name || ""}
                        onChange={(e) => handleFieldChange(row.tempId, "name", e.target.value)}
                        className="w-full bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 transition-all focus:outline-none"
                        placeholder="Nhập tên tạp chí..."
                      />
                    </td>

                    {/* ISSN Column (Text Input) */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.issn || ""}
                        onChange={(e) => handleFieldChange(row.tempId, "issn", e.target.value)}
                        className="w-full bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 transition-all focus:outline-none"
                        placeholder="ISSN..."
                      />
                    </td>

                    {/* Type Dropdown (Menu Xổ Xuống) */}
                    <td className="py-2 px-2">
                      <select
                        value={row.type || "Tạp chí"}
                        onChange={(e) => handleFieldChange(row.tempId, "type", e.target.value)}
                        className="w-full bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-all focus:outline-none cursor-pointer"
                      >
                        {typesList.map(type => (
                          <option key={type.id || type.name} value={type.name}>
                            {type.name}
                          </option>
                        ))}
                        {/* Fallbacks */}
                        {!typesList.some(t => t.name === row.type) && row.type && (
                          <option value={row.type}>{row.type}</option>
                        )}
                        <option value="Tạp chí">Tạp chí</option>
                        <option value="Kỷ yếu hội thảo">Kỷ yếu hội thảo</option>
                        <option value="Sách chuyên khảo">Sách chuyên khảo</option>
                      </select>
                    </td>

                    {/* Publisher Column (Text Input) */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.publisher || ""}
                        onChange={(e) => handleFieldChange(row.tempId, "publisher", e.target.value)}
                        className="w-full bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 transition-all focus:outline-none"
                        placeholder="Nhà xuất bản..."
                      />
                    </td>

                    {/* Field Dropdown (Menu Xổ Xuống) */}
                    <td className="py-2 px-2">
                      <select
                        value={row.field || ""}
                        onChange={(e) => handleFieldChange(row.tempId, "field", e.target.value)}
                        className="w-full bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 transition-all focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Chọn ngành --</option>
                        {fieldsList.map(field => (
                          <option key={field.id || field.name} value={field.name}>
                            {field.name}
                          </option>
                        ))}
                        {/* Fallbacks */}
                        {!fieldsList.some(f => f.name === row.field) && row.field && (
                          <option value={row.field}>{row.field}</option>
                        )}
                      </select>
                    </td>

                    {/* Score Column (Text Input) */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.score || ""}
                        onChange={(e) => handleFieldChange(row.tempId, "score", e.target.value)}
                        className="w-full bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-all focus:outline-none"
                        placeholder="Ví dụ: 1.0"
                      />
                    </td>

                    {/* Description Column (Text Input) */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={row.description || ""}
                        onChange={(e) => handleFieldChange(row.tempId, "description", e.target.value)}
                        className="w-full bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 transition-all focus:outline-none"
                        placeholder="Nhập mô tả tóm tắt..."
                      />
                    </td>

                    {/* Delete Column */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.tempId)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xoá dòng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
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
