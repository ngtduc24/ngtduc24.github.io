import React, { useState } from 'react';
import { supabase } from "../lib/supabase";
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { 
  USERS_TABLE, 
  JOURNALS_TABLE, 
  FIELDS_TABLE, 
  TYPES_TABLE, 
  SETTINGS_TABLE, 
  QDA_PROJECTS_TABLE, 
  QDA_DOCUMENTS_TABLE, 
  QDA_CODES_TABLE, 
  QDA_ANNOTATIONS_TABLE, 
  QDA_MEMOS_TABLE, 
  NOTIFICATIONS_TABLE, 
  STATS_TABLE 
} from '../lib/data';
import { TASKS_TABLE } from '../lib/tasks';
import { 
  Database, 
  Upload, 
  Download, 
  Eye, 
  Server, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Info, 
  RefreshCw,
  FileText
} from 'lucide-react';
import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';

export default function BackupManager() {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();

  // Selected lists for backup
  const [selectedSupabase, setSelectedSupabase] = useState<string[]>([
    JOURNALS_TABLE,
    FIELDS_TABLE,
    TYPES_TABLE,
    SETTINGS_TABLE,
    NOTIFICATIONS_TABLE
  ]);
  const [selectedFirestore, setSelectedFirestore] = useState<string[]>([
    USERS_TABLE,
    TASKS_TABLE,
    STATS_TABLE
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewSummary, setPreviewSummary] = useState<{
    metadata?: any;
    supabaseCount: { name: string; count: number }[];
    firestoreCount: { name: string; count: number }[];
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const supabaseTables = [
    { id: JOURNALS_TABLE, label: 'Tạp chí khoa học' },
    { id: FIELDS_TABLE, label: 'Ngành & Lĩnh vực' },
    { id: TYPES_TABLE, label: 'Phân loại tạp chí' },
    { id: SETTINGS_TABLE, label: 'Cài đặt cấu hình' },
    { id: QDA_PROJECTS_TABLE, label: 'Dự án định tính QDA' },
    { id: QDA_DOCUMENTS_TABLE, label: 'Tài liệu nghiên cứu QDA' },
    { id: QDA_CODES_TABLE, label: 'Mã phân tích QDA' },
    { id: QDA_ANNOTATIONS_TABLE, label: 'Nhãn văn bản QDA' },
    { id: QDA_MEMOS_TABLE, label: 'Ghi chú QDA' },
    { id: NOTIFICATIONS_TABLE, label: 'Thông báo hệ thống' },
    { id: 'portfolio_settings', label: 'Portfolio — Banner, giới thiệu và menu' },
    { id: 'portfolio_education', label: 'Portfolio — Học vấn' },
    { id: 'portfolio_experience', label: 'Portfolio — Kinh nghiệm' },
    { id: 'portfolio_skills', label: 'Portfolio — Kỹ năng' },
    { id: 'portfolio_projects', label: 'Portfolio — Dự án' },
    { id: 'portfolio_courses', label: 'Portfolio — Khóa học' },
    { id: 'portfolio_course_students', label: 'Portfolio — Học viên' },
    { id: 'portfolio_research', label: 'Portfolio — Nghiên cứu' }
  ];

  const firestoreCollections = [
    { id: USERS_TABLE, label: 'Tài khoản người dùng' },
    { id: TASKS_TABLE, label: 'Quản lý công việc' },
    { id: STATS_TABLE, label: 'Thống kê truy cập' },
    { id: 'uploaded_images', label: 'Thư viện ảnh' }
  ];

  const handleBackup = async () => {
    if (selectedSupabase.length === 0 && selectedFirestore.length === 0) {
      addNotification('Vui lòng chọn ít nhất một bảng hoặc bộ sưu tập để sao lưu.', 'error');
      return;
    }

    setIsProcessing(true);
    setProgressMessage('Đang khởi tạo tệp sao lưu...');
    try {
      const backupData: {
        metadata: {
          version: string;
          timestamp: string;
          backupBy: string;
          provider: string;
        };
        supabase: Record<string, any[]>;
        firestore: Record<string, any[]>;
      } = {
        metadata: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          backupBy: 'admin',
          provider: 'Smart Research VN Hybrid Backup Service'
        },
        supabase: {},
        firestore: {}
      };

      // 1. Fetch Supabase tables
      for (const tableId of selectedSupabase) {
        const tableInfo = supabaseTables.find(t => t.id === tableId);
        setProgressMessage(`Đang kết nối Supabase và tải bảng "${tableInfo?.label || tableId}"...`);
        
        const { data, error } = await supabase.from(tableId).select('*');
        if (error) {
          throw new Error(`Lỗi tải bảng "${tableInfo?.label || tableId}": ${error.message}`);
        }
        backupData.supabase[tableId] = data || [];
      }

      // 2. Fetch Firestore collections
      for (const colId of selectedFirestore) {
        const colInfo = firestoreCollections.find(c => c.id === colId);
        setProgressMessage(`Đang kết nối Firestore và tải bộ sưu tập "${colInfo?.label || colId}"...`);
        
        try {
          const snapshot = await getDocs(collection(db, colId));
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          backupData.firestore[colId] = docs;
        } catch (err: any) {
          throw new Error(`Lỗi tải bộ sưu tập "${colInfo?.label || colId}": ${err.message || err}`);
        }
      }

      // 3. Trigger Download
      setProgressMessage('Đang đóng gói dữ liệu thành tệp JSON...');
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_smart_research_${new Date().toISOString().split('T')[0]}_v2.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      addNotification('Sao lưu dữ liệu hệ thống thành công!', 'success');
    } catch (error: any) {
      console.error('Backup failed:', error);
      addNotification(`Lỗi sao lưu: ${error.message || error}`, 'error');
    } finally {
      setIsProcessing(false);
      setProgressMessage('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setPreviewData(json);
          
          // Generate Summary of file contents
          let sbCount: { name: string; count: number }[] = [];
          let fsCount: { name: string; count: number }[] = [];
          let fileMetadata = json.metadata || null;
          
          if (json.supabase || json.firestore) {
            // New V2.0 format
            if (json.supabase) {
              Object.entries(json.supabase).forEach(([key, val]) => {
                const info = supabaseTables.find(t => t.id === key);
                sbCount.push({ name: info?.label || key, count: (val as any[]).length });
              });
            }
            if (json.firestore) {
              Object.entries(json.firestore).forEach(([key, val]) => {
                const info = firestoreCollections.find(c => c.id === key);
                fsCount.push({ name: info?.label || key, count: (val as any[]).length });
              });
            }
          } else {
            // Old V1.0 flat format
            Object.entries(json).forEach(([key, val]) => {
              if (key === 'metadata') return;
              if (Array.isArray(val)) {
                const isSupabase = supabaseTables.some(t => t.id === key);
                const info = supabaseTables.find(t => t.id === key) || firestoreCollections.find(c => c.id === key);
                if (isSupabase) {
                  sbCount.push({ name: info?.label || key, count: val.length });
                } else {
                  fsCount.push({ name: info?.label || key, count: val.length });
                }
              }
            });
          }
          
          setPreviewSummary({
            metadata: fileMetadata,
            supabaseCount: sbCount,
            firestoreCount: fsCount
          });
          
          addNotification('Đọc file sao lưu thành công. Vui lòng xem trước cấu trúc dữ liệu bên dưới.', 'success');
        } catch (err) {
          console.error(err);
          addNotification('File sao lưu không hợp lệ. Vui lòng chọn tệp .json được tải xuống từ ứng dụng.', 'error');
          setPreviewData(null);
          setPreviewSummary(null);
          setFile(null);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;
    setIsProcessing(true);
    
    try {
      let supabaseData: Record<string, any[]> = {};
      let firestoreData: Record<string, any[]> = {};

      if (previewData.supabase || previewData.firestore) {
        supabaseData = previewData.supabase || {};
        firestoreData = previewData.firestore || {};
      } else {
        // Fallback for flat format
        Object.entries(previewData).forEach(([key, val]) => {
          if (key === 'metadata') return;
          if (Array.isArray(val)) {
            const isSupabaseTable = supabaseTables.some(t => t.id === key);
            if (isSupabaseTable) {
              supabaseData[key] = val;
            } else {
              firestoreData[key] = val;
            }
          }
        });
      }

      // 1. Phục hồi dữ liệu Supabase
      for (const [tableId, rows] of Object.entries(supabaseData)) {
        if (!rows || rows.length === 0) continue;
        const tableInfo = supabaseTables.find(t => t.id === tableId) || { label: tableId };
        setProgressMessage(`Đang nhập bảng "${tableInfo.label}" (${rows.length} dòng) vào Supabase...`);
        
        // Use Supabase upsert to update existing rows and insert new ones
        const { error } = await supabase.from(tableId).upsert(rows);
        if (error) {
          throw new Error(`Lỗi khôi phục bảng "${tableInfo.label}": ${error.message}`);
        }
      }

      // 2. Phục hồi dữ liệu Firestore
      for (const [colId, docs] of Object.entries(firestoreData)) {
        if (!docs || docs.length === 0) continue;
        const colInfo = firestoreCollections.find(c => c.id === colId) || { label: colId };
        setProgressMessage(`Đang nhập bộ sưu tập "${colInfo.label}" (${docs.length} tài liệu) vào Firestore...`);
        
        for (const docItem of docs) {
          const { id, ...docData } = docItem;
          if (!id) continue;
          await setDoc(doc(db, colId, id), docData, { merge: true });
        }
      }

      addNotification('Khôi phục toàn bộ cơ sở dữ liệu thành công!', 'success');
      setPreviewData(null);
      setPreviewSummary(null);
      setFile(null);
    } catch (error: any) {
      console.error('Import database failed:', error);
      addNotification(`Lỗi khôi phục: ${error.message || error}`, 'error');
    } finally {
      setIsProcessing(false);
      setProgressMessage('');
    }
  };

  const confirmImport = () => {
    confirm(
      'Cảnh báo phục hồi dữ liệu', 
      'Bạn có chắc chắn muốn tiến hành khôi phục dữ liệu từ bản sao lưu này? Hệ thống sẽ ghi đè và cập nhật các bản ghi trùng khớp dựa trên mã định danh (ID). Hành động này không thể hoàn tác.', 
      handleImport
    );
  };

  const toggleSupabaseTable = (id: string) => {
    setSelectedSupabase(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleFirestoreCollection = (id: string) => {
    setSelectedFirestore(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedSupabase(supabaseTables.map(t => t.id));
    setSelectedFirestore(firestoreCollections.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedSupabase([]);
    setSelectedFirestore([]);
  };

  return (
    <div className="space-y-6" id="backup-manager-panel">
      {/* Loading overlay for processing */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 max-w-md w-full shadow-xl flex flex-col items-center text-center space-y-4 animate-scaleUp">
            <Loader2 className="w-10 h-10 text-brand animate-spin" />
            <h3 className="font-bold text-slate-800 text-sm">Đang thực thi tác vụ dữ liệu...</h3>
            <p className="text-xs text-slate-500 font-medium bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/50 w-full break-words">
              {progressMessage}
            </p>
            <p className="text-[10px] text-slate-400">Vui lòng giữ nguyên trình duyệt, không đóng hoặc tải lại trang.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Left Card: Backup Settings */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-6 flex flex-col text-left">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Download className="w-4 h-4 text-brand" />
              <span>Cấu hình Sao lưu (Export)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Chọn các phần dữ liệu bạn muốn đóng gói tải xuống để sao lưu dự phòng.
            </p>
          </div>

          <div className="flex gap-2 pb-2 border-b border-slate-100">
            <button 
              type="button" 
              onClick={selectAll}
              className="text-[10px] font-bold text-brand hover:text-brand-hover px-2.5 py-1 bg-brand/5 hover:bg-brand/10 rounded-lg transition-colors cursor-pointer"
            >
              Chọn tất cả
            </button>
            <button 
              type="button" 
              onClick={deselectAll}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-600 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {/* Supabase section */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>CSDL Nghiên cứu & Định tính (Supabase)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {supabaseTables.map(t => {
                  const isChecked = selectedSupabase.includes(t.id);
                  return (
                    <label 
                      key={t.id} 
                      className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer text-xs transition-all ${
                        isChecked 
                          ? 'border-brand bg-brand/5 text-slate-800 font-semibold shadow-2xs' 
                          : 'border-slate-100 hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleSupabaseTable(t.id)}
                        className="rounded text-brand focus:ring-brand"
                      />
                      <span className="truncate">{t.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Firestore section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>CSDL Người dùng & Quản lý (Firestore)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {firestoreCollections.map(c => {
                  const isChecked = selectedFirestore.includes(c.id);
                  return (
                    <label 
                      key={c.id} 
                      className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer text-xs transition-all ${
                        isChecked 
                          ? 'border-brand bg-brand/5 text-slate-800 font-semibold shadow-2xs' 
                          : 'border-slate-100 hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleFirestoreCollection(c.id)}
                        className="rounded text-brand focus:ring-brand"
                      />
                      <span className="truncate">{c.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleBackup}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-brand/10 hover:scale-102"
          >
            <Download className="w-4 h-4" />
            <span>Tải Xuống Bản Sao Lưu (.json)</span>
          </button>
        </div>

        {/* Right Card: Restore Section */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-6 flex flex-col text-left">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>Phục hồi Dữ liệu (Import)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Tải lên tệp tin định dạng JSON sao lưu để khôi phục cấu trúc dữ liệu của bạn.
            </p>
          </div>

          {/* Drag & drop upload box */}
          <div className="border-2 border-dashed border-slate-200 hover:border-brand/50 rounded-2xl p-6 text-center space-y-2 transition-colors relative cursor-pointer group bg-slate-50">
            <input 
              type="file" 
              accept=".json" 
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-brand mx-auto transition-colors" />
            <div className="text-xs font-bold text-slate-600 group-hover:text-brand transition-colors">
              {file ? file.name : "Kéo thả hoặc nhấp để chọn tệp .json"}
            </div>
            <p className="text-[10px] text-slate-400">Hỗ trợ tệp backup v1.0 và v2.0</p>
          </div>

          {/* Warnings about Security / Accounts */}
          <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-2xl flex gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-800">Lưu ý về Phân quyền & Bảo mật</h4>
              <p className="text-[10px] leading-relaxed text-amber-700/80">
                Để đảm bảo bảo mật tối đa, mật khẩu gốc của tài khoản sẽ <strong>KHÔNG</strong> được khôi phục trực tiếp. Tài khoản người dùng sẽ đồng bộ thông tin hồ sơ (Họ tên, Vai trò, Quyền hạn) vào CSDL và tự động liên kết khi họ đăng ký/đăng nhập lại bằng chính email đó.
              </p>
            </div>
          </div>

          {/* Backup File Preview */}
          {previewSummary && (
            <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-3 animate-fadeIn flex-1">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-brand" />
                  <span>Cấu trúc tệp tin sao lưu</span>
                </span>
                <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">
                  v{previewSummary.metadata?.version || '1.0'}
                </span>
              </div>

              {previewSummary.metadata && (
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2 rounded-xl border border-slate-100">
                  <div><span className="text-slate-400">Ngày tạo:</span> <strong className="text-slate-600">{new Date(previewSummary.metadata.timestamp).toLocaleString('vi-VN')}</strong></div>
                  <div><span className="text-slate-400">Người tạo:</span> <strong className="text-slate-600">{previewSummary.metadata.backupBy}</strong></div>
                </div>
              )}

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {previewSummary.supabaseCount.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Server className="w-3 h-3 text-slate-400" />
                      <span>CSDL Nghiên cứu (Supabase)</span>
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {previewSummary.supabaseCount.map((tbl, i) => (
                        <div key={i} className="flex justify-between items-center bg-white border border-slate-100 px-2.5 py-1.5 rounded-lg text-[10px]">
                          <span className="text-slate-500 truncate pr-2">{tbl.name}</span>
                          <span className="font-extrabold text-brand shrink-0">{tbl.count} dòng</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewSummary.firestoreCount.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span>CSDL Người dùng (Firestore)</span>
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {previewSummary.firestoreCount.map((col, i) => (
                        <div key={i} className="flex justify-between items-center bg-white border border-slate-100 px-2.5 py-1.5 rounded-lg text-[10px]">
                          <span className="text-slate-500 truncate pr-2">{col.name}</span>
                          <span className="font-extrabold text-orange-500 shrink-0">{col.count} dòng</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="button"
                onClick={confirmImport}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/10 hover:scale-102 mt-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Bắt Đầu Khôi Phục Dữ Liệu</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
