import React, { useState } from "react";
import { 
  Upload, 
  Download, 
  X, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Database,
  Loader2,
  List
} from "lucide-react";
import { ScientificJournal } from "../types";

interface JournalExcelImportProps {
  handleExportTemplate: () => void;
  handleExportAll: () => void;
  skipDuplicates: boolean;
  setSkipDuplicates: (val: boolean) => void;
  excelInputRef: React.RefObject<HTMLInputElement | null>;
  handleExcelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  previewRows: any[];
  setPreviewRows: (rows: any[]) => void;
  uploadedFileName: string;
  setUploadedFileName: (name: string) => void;
  selectedImportField: string;
  setSelectedImportField: (field: string) => void;
  journals: ScientificJournal[];
  handleImportParsedRows: (mappings: Record<string, string>) => void;
  loading: boolean;
  fieldsList: any[];
  importProgress?: { current: number; total: number; message?: string } | null;
}

const VIETNAMESE_FIELDS = [
  "Cơ học",
  "Cơ khí - Động lực",
  "Công nghệ thông tin",
  "Dược học",
  "Điện - Điện tử - Tự động hóa",
  "Giao thông vận tải",
  "Khoa học Giáo dục",
  "Hóa học - Công nghệ thực phẩm",
  "Khoa học An ninh",
  "Khoa học Quân sự",
  "Khoa học Trái đất - Mỏ",
  "Kinh tế",
  "Luật học",
  "Luyện kim",
  "Ngôn ngữ học",
  "Nông nghiệp - Lâm nghiệp",
  "Sinh học",
  "Sử học - Khảo cổ học - Dân tộc học/Nhân học",
  "Tâm lý học",
  "Thủy lợi",
  "Toán học",
  "Triết học - Xã hội học - Chính trị học",
  "Văn hóa - Nghệ thuật - Thể dục thể thao",
  "Văn học",
  "Vật lý",
  "Xây dựng - Kiến trúc",
  "Y học"
];

export default function JournalExcelImport({
  handleExportTemplate,
  handleExportAll,
  skipDuplicates,
  setSkipDuplicates,
  excelInputRef,
  handleExcelUpload,
  previewRows,
  setPreviewRows,
  uploadedFileName,
  setUploadedFileName,
  selectedImportField,
  setSelectedImportField,
  journals,
  handleImportParsedRows,
  loading,
  fieldsList,
  importProgress
}: JournalExcelImportProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  // Helper to check if a row already exists in the database
  const isRowDuplicate = (name: string, issn: string) => {
    return journals.some(j => {
      const matchName = j.name.trim().toLowerCase() === name.trim().toLowerCase();
      const matchIssn = issn && j.issn && j.issn.trim().toLowerCase() === issn.trim().toLowerCase();
      return matchName || matchIssn;
    });
  };

  // Find unmatched fields in parsed Excel file
  const unmatchedFields = React.useMemo(() => {
    if (previewRows.length === 0) return [];
    
    // Get unique field values from excel
    const excelFields = Array.from(new Set(previewRows.map(r => r.field ? String(r.field).trim() : ""))) as string[];
    
    // Check against system fields (fieldsList)
    const systemNamesLower = fieldsList.map(f => String(f.name).trim().toLowerCase());
    
    const unmatched = excelFields.filter(ef => {
      if (!ef) return false; // Handled separately below
      return !systemNamesLower.includes(ef.toLowerCase());
    });

    // Check if there are any empty/blank fields in the preview rows
    const hasEmptyField = previewRows.some(r => !r.field || !String(r.field).trim());
    if (hasEmptyField) {
      unmatched.push(""); // Represent blank field as empty string
    }

    return unmatched;
  }, [previewRows, fieldsList]);

  // Automatically map unmatched non-empty fields to "__CREATE__" (auto-create as new field) by default
  React.useEffect(() => {
    if (unmatchedFields.length > 0) {
      setFieldMappings(prev => {
        let updated = false;
        const newMappings = { ...prev };
        unmatchedFields.forEach(uf => {
          if (uf !== "" && !newMappings[uf]) {
            newMappings[uf] = "__CREATE__";
            updated = true;
          }
        });
        return updated ? newMappings : prev;
      });
    }
  }, [unmatchedFields]);

  // System field names list sorted
  const systemFieldNames = React.useMemo(() => {
    return fieldsList.map(f => String(f.name)).sort();
  }, [fieldsList]);

  // Calculate statistics
  const totalRows = previewRows.length;
  let newCount = 0;
  let duplicateCount = 0;

  previewRows.forEach(row => {
    if (isRowDuplicate(row.name, row.issn)) {
      duplicateCount++;
    } else {
      newCount++;
    }
  });

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      const fakeEvent = {
        target: { files }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleExcelUpload(fakeEvent);
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewRows([]);
    setUploadedFileName("");
    setFieldMappings({});
    if (excelInputRef.current) {
      excelInputRef.current.value = "";
    }
  };

  // Standardize current unique fields in system
  const uniqueSystemFields = Array.from(new Set(journals.map(j => j.field))).filter(Boolean);
  const dropdownFields = Array.from(new Set([...VIETNAMESE_FIELDS, ...uniqueSystemFields])).sort();

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-4xl mx-auto space-y-6">
      {/* Header section with template buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 gap-4">
        <div className="text-left space-y-1">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-600 animate-bounce" />
            <span>Nhập / Xuất Excel</span>
          </h2>
          <p className="text-xs text-slate-400">
            Hệ thống hóa danh mục báo khoa học thông minh, nhanh chóng qua file Excel.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100/80 text-purple-700 border border-purple-100 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải file mẫu</span>
          </button>
          
          <button
            type="button"
            onClick={handleExportAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất toàn bộ</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Upload column */}
        <div className="md:col-span-5 space-y-5 text-left">
          {/* Drag and Drop Zone */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Chọn tệp tin nguồn</span>
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => excelInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-3 cursor-pointer transition-all ${
                dragOver 
                  ? "border-purple-500 bg-purple-50/20" 
                  : "border-slate-200 hover:border-purple-400 bg-slate-50/50 hover:bg-purple-50/10"
              }`}
            >
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 block">Nhấn để chọn file Excel (.xlsx)</span>
                <span className="text-[10px] text-slate-400 block">hoặc kéo thả tệp tin vào đây</span>
              </div>

              {uploadedFileName && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-800 text-[11px] font-bold rounded-lg border border-purple-200 shadow-xs mt-2 animate-fadeIn max-w-full">
                  <span className="truncate max-w-[150px]">{uploadedFileName}</span>
                  <button 
                    type="button" 
                    onClick={handleClearFile}
                    className="p-0.5 hover:bg-purple-200 rounded text-purple-900 shrink-0 transition-colors cursor-pointer"
                    title="Bỏ tệp"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={excelInputRef} 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleExcelUpload}
            />
          </div>

          {/* Industry Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span>Ngành áp dụng mặc định (Dự phòng)</span>
            </label>
            <div className="relative">
              <select
                value={selectedImportField}
                onChange={(e) => setSelectedImportField(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Chọn ngành / lĩnh vực dự phòng --</option>
                {systemFieldNames.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-500">
                <List className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              * Dùng làm ngành mặc định nếu tệp Excel không có cột Ngành hoặc có dòng trống không ghi rõ ngành nghề.
            </p>
          </div>

          {/* Interactive Unmatched Fields Mapping Section */}
          {unmatchedFields.length > 0 && (
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-3.5 animate-fadeIn">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">Ánh xạ ngành chưa khớp trên hệ thống</span>
                  <span className="text-[10px] text-slate-500 block leading-relaxed font-medium">
                    Phát hiện {unmatchedFields.length} ngành trong Excel không khớp hoàn toàn với 28 Hội đồng ngành hệ thống. Vui lòng chọn ngành tương ứng:
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2.5 border-t border-amber-200/50">
                {unmatchedFields.map(uf => (
                  <div key={uf} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      {uf === "" ? (
                        <span className="text-slate-600">Dòng bị <strong className="text-amber-700">bỏ trống cột Ngành</strong></span>
                      ) : (
                        <span className="text-slate-600">Trong Excel: <strong className="text-amber-700">"{uf}"</strong></span>
                      )}
                      <span className="text-amber-600 font-extrabold text-[10px]">Cần ánh xạ</span>
                    </div>
                    <select
                      value={fieldMappings[uf] || ""}
                      onChange={(e) => {
                        setFieldMappings(prev => ({
                          ...prev,
                          [uf]: e.target.value
                        }));
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
                    >
                      {uf !== "" && (
                        <option value="__CREATE__">✨ Tự động tạo ngành mới: "{uf}"</option>
                      )}
                      <option value="">-- Chọn ngành hệ thống để ánh xạ --</option>
                      {systemFieldNames.map((sf) => (
                        <option key={sf} value={sf}>
                          {sf}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicity Rule Checkbox */}
          <div className="p-3 bg-slate-50/50 border border-slate-200/60 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="skip_duplicate_excel_sub"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer mt-0.5"
            />
            <div className="space-y-0.5 select-none cursor-pointer">
              <label htmlFor="skip_duplicate_excel_sub" className="text-[11px] font-bold text-slate-700 block cursor-pointer">
                Chỉ nhận bản ghi mới (Skip duplicates)
              </label>
              <span className="text-[10px] text-slate-400 block font-medium">
                Tự động bỏ qua các dòng trùng tên tạp chí hoặc ISSN đã có trong CSDL.
              </span>
            </div>
          </div>
        </div>

        {/* Preview column */}
        <div className="md:col-span-7 flex flex-col text-left space-y-1.5">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
            {uploadedFileName ? `Bản xem trước tệp Excel (${totalRows} dòng)` : "Bản xem trước dữ liệu mẫu"}
          </span>

          <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 flex-1 flex flex-col justify-between overflow-hidden shadow-xs min-h-[300px]">
            {/* Table wrapper */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="py-2.5 pb-2">Tên</th>
                    <th className="py-2.5 pb-2 w-28">ISSN</th>
                    <th className="py-2.5 pb-2 w-16 text-center">Điểm</th>
                    <th className="py-2.5 pb-2 w-28 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {totalRows === 0 ? (
                    // Display placeholder row if empty
                    <tr className="text-slate-400 hover:bg-slate-100/30 transition-colors">
                      <td className="py-3 font-medium">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-500">Ví dụ: Tạp chí Khoa học</span>
                          <span className="text-[10px] block text-slate-400 font-normal italic">Chưa tải file Excel - Hiện ví dụ minh hoạ</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono">1234-5678</td>
                      <td className="py-3 text-center font-bold text-purple-600">0 – 1.0</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          MỚI
                        </span>
                      </td>
                    </tr>
                  ) : (
                    // Display actual parsed preview rows (limit to 5 for UI simplicity)
                    previewRows.slice(0, 5).map((row, index) => {
                      const isDup = isRowDuplicate(row.name, row.issn);
                      return (
                        <tr key={index} className="hover:bg-slate-100/30 transition-colors">
                          <td className="py-3 pr-2">
                            <p className="font-bold text-slate-800 line-clamp-1" title={row.name}>
                              {row.name}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate max-w-xs">{row.publisher}</p>
                          </td>
                          <td className="py-3 font-mono text-slate-500">{row.issn || "—"}</td>
                          <td className="py-3 text-center font-bold text-purple-600">{row.score || "—"}</td>
                          <td className="py-3 text-center">
                            {isDup ? (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                                skipDuplicates 
                                  ? "bg-amber-50 text-amber-600 border border-amber-100" 
                                  : "bg-rose-50 text-rose-600 border border-rose-100"
                              }`}>
                                {skipDuplicates ? "TRÙNG (bỏ qua)" : "TRÙNG (nhập đè)"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                MỚI
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {totalRows > 5 && (
                    <tr>
                      <td colSpan={4} className="py-2.5 text-center text-slate-400 font-medium text-[10px] bg-slate-50/50">
                        Chỉ hiển thị tối đa 5 dòng xem trước. Tổng cộng có {totalRows} dòng trong tệp tin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Progress Bar (if importing) */}
            {importProgress && (
              <div className="pt-4 mt-4 border-t border-slate-200/80">
                <div className="bg-white/80 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{importProgress.message || 'Đang xử lý...'}</span>
                    <span className="text-brand">
                      {importProgress.total > 0 
                        ? `${Math.round((importProgress.current / importProgress.total) * 100)}% (${importProgress.current}/${importProgress.total})` 
                        : 'Vui lòng đợi...'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-brand h-2.5 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: importProgress.total > 0 ? `${(importProgress.current / importProgress.total) * 100}%` : '0%' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Final Action with stats */}
            <div className="pt-4 mt-4 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/40 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-bold">
                {totalRows > 0 ? (
                  <>
                    <Database className="w-3.5 h-3.5 text-purple-600" />
                    <span>{totalRows} dòng: </span>
                    <span className="text-emerald-600">{newCount} mới</span>
                    <span>, </span>
                    <span className="text-amber-600">{duplicateCount} trùng {skipDuplicates ? "(bỏ qua)" : ""}</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    <span>0 dòng: 0 mới, 0 trùng (bỏ qua)</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleImportParsedRows(fieldMappings)}
                disabled={loading || totalRows === 0 || unmatchedFields.some(uf => !fieldMappings[uf])}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                  totalRows > 0 && !unmatchedFields.some(uf => !fieldMappings[uf]) && !loading
                    ? "bg-brand hover:bg-brand-hover text-white"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Nhập dữ liệu mới</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
