import React from "react";
import { History } from "lucide-react";

interface JournalHistoryProps {
  importHistory: {
    id: string;
    action: string;
    targetName: string;
    timestamp: string;
    type: "add" | "import" | "delete" | "ai";
  }[];
  onUndo: (action: string) => void;
}

export default function JournalHistory({ importHistory, onUndo }: JournalHistoryProps) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-2xl mx-auto space-y-4">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <History className="w-5 h-5 text-purple-600" />
          <span>Lịch sử thao tác nghiệp vụ</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Theo dõi nhật ký hoạt động cập nhật và xử lý dữ liệu tạp chí của quản trị viên.
        </p>
      </div>

      {importHistory.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <History className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-xs font-semibold">Chưa ghi nhận hoạt động nào.</p>
        </div>
      ) : (
        <div className="relative border-l border-slate-150 pl-4 ml-2 space-y-6">
          {importHistory.map((log) => (
            <div key={log.id} className="relative">
              <div className={`absolute -left-[22px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                log.type === "add" ? "bg-emerald-500" :
                log.type === "import" ? "bg-purple-500" :
                log.type === "ai" ? "bg-indigo-500" : "bg-rose-500"
              }`} />
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{log.action}</span>
                    <button 
                      className="text-[10px] text-brand hover:underline cursor-pointer font-bold"
                      onClick={() => onUndo(log.action)}
                    >
                      Hoàn tác
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{log.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Đối tượng: <strong className="text-slate-700">{log.targetName}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
