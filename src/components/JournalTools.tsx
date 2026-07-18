import React from "react";
import { Cpu, AlertTriangle, Sparkles, Loader2, Database, Download, Upload } from "lucide-react";
import { saveJournalToSupabase, saveJournalFieldToSupabase, saveJournalTypeToSupabase } from "../lib/data";
import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';

interface JournalToolsProps {
  isAdmin: boolean;
  handleClearDuplicates: () => void;
  processingAI: boolean;
  pdfInputRef: React.RefObject<HTMLInputElement | null>;
  handlePdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  journals: any[];
  fieldsList: any[];
  typesList: any[];
  onRefreshData: () => void;
}

export default function JournalTools({
  isAdmin,
  handleClearDuplicates,
  processingAI,
  pdfInputRef,
  handlePdfUpload,
  journals,
  fieldsList,
  typesList,
  onRefreshData
}: JournalToolsProps) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-100 pb-4 text-left">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-600" />
          <span>Công cụ quản trị & Tiện ích AI</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Trải nghiệm khả năng phân tích nâng cao và quản trị tinh gọn.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 text-left">
        {isAdmin && (
          <div className="p-4 rounded-2xl border border-slate-100 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 block">Dọn dẹp dữ liệu trùng lặp</span>
              <span className="text-[11px] text-slate-500 block">
                Quét và chỉ giữ lại 1 bản ghi mới nhất đối với các tạp chí trùng tên và ISSN.
              </span>
            </div>
            <button
              onClick={handleClearDuplicates}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Dọn dẹp trùng lặp</span>
            </button>
          </div>
        )}

        {/* Backup and Restore section */}
        {isAdmin && (
          <div className="p-4 rounded-2xl border border-slate-150 bg-purple-50/20 space-y-4 animate-fadeIn">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-purple-600" />
                <span>Sao lưu & Khôi phục dữ liệu (Database Backup)</span>
              </span>
              <span className="text-[11px] text-slate-500 block">
                Xuất toàn bộ cơ sở dữ liệu tạp chí, ngành nghề và loại hình thành tệp tin JSON hoặc khôi phục dữ liệu từ một tệp tin trước đó.
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => {
                  try {
                    const backupData = {
                      version: "1.0",
                      backupDate: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN"),
                      journals: journals,
                      fields: fieldsList,
                      types: typesList
                    };
                    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                      JSON.stringify(backupData, null, 2)
                    )}`;
                    const downloadAnchor = document.createElement("a");
                    downloadAnchor.setAttribute("href", jsonString);
                    downloadAnchor.setAttribute(
                      "download",
                      `SmartResearch_Backup_${new Date().toISOString().split("T")[0]}.json`
                    );
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  } catch (err) {
                    addNotification("Gặp sự cố khi tạo file sao lưu.", "error");
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sao lưu toàn bộ (.json)</span>
              </button>

              <label className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Khôi phục từ file</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    confirm("Cảnh báo", "Khôi phục sẽ bổ sung hoặc cập nhật đè dữ liệu trùng từ bản sao lưu này. Bạn có chắc muốn tiếp tục không?", async () => {
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const content = event.target?.result as string;
                          const data = JSON.parse(content);

                          if (!data.journals || !Array.isArray(data.journals)) {
                            addNotification("Tệp sao lưu không hợp lệ (thiếu danh sách tạp chí).", "error");
                            return;
                          }

                          let restoredCount = 0;
                          let restoredFields = 0;
                          let restoredTypes = 0;

                          // Restore fields list
                          if (data.fields && Array.isArray(data.fields)) {
                            for (const f of data.fields) {
                              if (f.id && f.name) {
                                await saveJournalFieldToSupabase(f);
                                restoredFields++;
                              }
                            }
                          }

                          // Restore types list
                          if (data.types && Array.isArray(data.types)) {
                            for (const t of data.types) {
                              if (t.id && t.name) {
                                await saveJournalTypeToSupabase(t);
                                restoredTypes++;
                              }
                            }
                          }

                          // Restore scientific journals list
                          for (const j of data.journals) {
                            if (j.id && j.name) {
                              await saveJournalToSupabase(j);
                              restoredCount++;
                            }
                          }

                          addNotification(`Khôi phục dữ liệu thành công! Đã nhập ${restoredCount} tạp chí, ${restoredFields} ngành và ${restoredTypes} loại tạp chí.`, "success");
                          onRefreshData();
                        } catch (err) {
                          console.error("Lỗi khi khôi phục sao lưu:", err);
                          addNotification("Lỗi đọc tệp sao lưu hoặc lỗi đồng bộ database.", "error");
                        }
                      };
                      reader.readAsText(file);
                    });
                  }}
                />
              </label>
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl border border-slate-150 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-800 block">Quét bài báo khoa học bằng AI Gemini (PDF)</span>
            <span className="text-[11px] text-slate-500 block">
              Tải lên file PDF chứa tiêu đề tạp chí, AI sẽ trích xuất chi tiết điền vào form lưu trữ.
            </span>
          </div>

          <div 
            onClick={() => { if (!processingAI) pdfInputRef.current?.click(); }}
            className={`border-2 border-dashed border-slate-200 hover:border-purple-400 bg-white hover:bg-purple-50/10 p-8 rounded-2xl text-center space-y-2 cursor-pointer transition-all ${
              processingAI ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {processingAI ? (
              <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto" />
            ) : (
              <Sparkles className="w-10 h-10 text-purple-500 mx-auto" />
            )}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700 block">
                {processingAI ? "AI đang xử lý tài liệu PDF..." : "Nhấp để tải lên bài báo PDF"}
              </span>
              <span className="text-[11px] text-slate-400 block">Hỗ trợ định dạng PDF tối đa 30MB</span>
            </div>
          </div>
          <input 
            type="file" 
            ref={pdfInputRef} 
            accept="application/pdf" 
            className="hidden" 
            onChange={handlePdfUpload}
          />
        </div>
      </div>
    </div>
  );
}
