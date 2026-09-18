
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronRight, School, BookOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserAccount } from '../../types';
import { EduUser, EduClass, EduSchool } from '../../types/edu';
import { saveSchool, saveClass, saveClassUsers, getSchools } from '../../lib/edu';
import { useNotifications } from '../NotificationContext';

interface EduImportProps {
  currentUser: UserAccount;
  onSuccess: (classId: string) => void;
}

interface TempUser {
  stt: number;
  fullName: string;
  mssv: string;
}

export default function EduImport({ currentUser, onSuccess }: EduImportProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [fileData, setFileData] = useState<TempUser[]>([]);
  const [className, setClassName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [existingSchools, setExistingSchools] = useState<EduSchool[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('new');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotifications();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length < 2) {
          addNotification("File không có dữ liệu hoặc sai định dạng", "error");
          return;
        }

        // Check headers (case insensitive)
        const headers = data[0].map(h => String(h).toLowerCase().trim());
        const sttIdx = headers.findIndex(h => h.includes('stt') || h.includes('thứ tự'));
        const nameIdx = headers.findIndex(h => h.includes('họ tên') || h.includes('tên'));
        const mssvIdx = headers.findIndex(h => h.includes('mssv') || h.includes('mã số'));

        if (nameIdx === -1 || mssvIdx === -1) {
          addNotification("File thiếu cột 'Họ tên' hoặc 'MSSV'", "error");
          return;
        }

        const users: TempUser[] = [];
        const mssvSet = new Set<string>();

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row[nameIdx] || !row[mssvIdx]) continue;

          const mssv = String(row[mssvIdx]).trim();
          if (mssvSet.has(mssv)) {
            addNotification(`Phát hiện mã số sinh viên trùng lặp: ${mssv}`, "error");
            return;
          }
          mssvSet.add(mssv);

          users.push({
            stt: sttIdx !== -1 ? Number(row[sttIdx]) || i : i,
            fullName: String(row[nameIdx]).trim(),
            mssv: mssv
          });
        }

        setFileData(users);
        setStep(2);
        loadExistingSchools();
      } catch (err) {
        console.error(err);
        addNotification("Lỗi khi đọc file Excel", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const loadExistingSchools = async () => {
    try {
      const schools = await getSchools();
      setExistingSchools(schools);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinalSubmit = async () => {
    if (!className.trim()) {
      addNotification("Vui lòng nhập tên lớp", "error");
      return;
    }
    if (selectedSchoolId === 'new' && !schoolName.trim()) {
      addNotification("Vui lòng nhập tên trường mới", "error");
      return;
    }

    setLoading(true);
    try {
      let schoolId = selectedSchoolId;
      
      // 1. Create school if new
      if (selectedSchoolId === 'new') {
        const school = await saveSchool({
          name: schoolName,
          ownerId: currentUser.id
        });
        schoolId = school.id;
      }

      // 2. Create class
      const clazz = await saveClass({
        schoolId,
        name: className,
        ownerId: currentUser.id
      });

      // 3. Create users
      const usersToSave = fileData.map(u => ({
        classId: clazz.id,
        stt: u.stt,
        fullName: u.fullName,
        mssv: u.mssv
      }));

      await saveClassUsers(usersToSave);

      onSuccess(clazz.id);
    } catch (err) {
      console.error(err);
      addNotification("Lỗi khi lưu dữ liệu lên hệ thống", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
      <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Upload className="w-5 h-5 text-brand" />
          <span>Import Danh sách Sinh viên</span>
        </h2>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === i ? 'bg-brand text-white shadow-lg shadow-brand/20' : 
                step > i ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step > i ? <CheckCircle2 className="w-4 h-4" /> : i}
            </div>
          ))}
        </div>
      </div>

      <div className="p-8">
        {step === 1 && (
          <div className="max-w-xl mx-auto py-12 text-center space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-3xl p-12 hover:border-brand/50 hover:bg-brand/5 cursor-pointer transition-all group"
            >
              <div className="w-20 h-20 bg-slate-50 group-hover:bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 group-hover:text-brand" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Chọn file Excel danh sách lớp</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                Hỗ trợ định dạng .xlsx, .xls. File cần có các cột: <span className="font-bold text-slate-700">STT, Họ tên, MSSV</span>.
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls" 
                className="hidden" 
              />
            </div>
            
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-800">Lưu ý quan trọng</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  Mã số sinh viên (MSSV) là khóa duy nhất. Hệ thống sẽ tự động chặn nếu trong cùng một lớp có các sinh viên trùng mã.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-xl mx-auto space-y-8 animate-slideInRight">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-sm font-bold">Đã đọc thành công {fileData.length} sinh viên</p>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Tên lớp học</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={className}
                      onChange={e => setClassName(e.target.value)}
                      placeholder="VD: Kinh tế đầu tư K62"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-sm font-semibold transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={() => setStep(3)}
                    disabled={!className.trim()}
                    className="flex items-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand/20 transition-all cursor-pointer"
                  >
                    <span>Tiếp theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-xl mx-auto space-y-8 animate-slideInRight">
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Thông tin Trường học</label>
                <div className="grid gap-4">
                  {existingSchools.length > 0 && (
                    <select 
                      value={selectedSchoolId}
                      onChange={e => setSelectedSchoolId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl px-4 py-3 text-sm font-semibold transition-all"
                    >
                      <option value="new">+ Thêm trường mới</option>
                      {existingSchools.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}

                  {selectedSchoolId === 'new' && (
                    <div className="relative">
                      <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={schoolName}
                        onChange={e => setSchoolName(e.target.value)}
                        placeholder="Tên trường đại học / học viện"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-sm font-semibold transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Tóm tắt thông tin</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Lớp học</p>
                    <p className="text-xs font-bold text-slate-800">{className}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Sĩ số</p>
                    <p className="text-xs font-bold text-slate-800">{fileData.length} sinh viên</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Quay lại
                </button>
                <button 
                  onClick={handleFinalSubmit}
                  disabled={loading || (selectedSchoolId === 'new' && !schoolName.trim())}
                  className="flex items-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand/20 transition-all cursor-pointer"
                >
                  {loading ? 'Đang xử lý...' : 'Hoàn tất & Khởi tạo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
