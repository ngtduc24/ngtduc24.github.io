
import React from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { EduUser, EduClass, EduGradeColumn, EduGrade } from '../../types/edu';

interface EduExportProps {
  clazz: EduClass & { edu_schools: { name: string } };
  users: EduUser[];
  gradeColumns: EduGradeColumn[];
  grades: EduGrade[];
}

export default function EduExport({ clazz, users, gradeColumns, grades }: EduExportProps) {
  
  const exportColumn = (columnId: string) => {
    const column = gradeColumns.find(c => c.id === columnId);
    if (!column) return;

    const data = users.map(user => {
      const grade = grades.find(g => g.gradeColumnId === columnId && g.userId === user.id);
      return {
        'STT': user.stt,
        'MSSV': user.mssv,
        'Họ và Tên': user.fullName,
        'Điểm': grade && grade.score !== undefined ? grade.score : 0,
        'Ghi chú': grade && grade.score !== undefined ? (grade.note || '') : 'Không nộp bài'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bảng điểm");
    XLSX.writeFile(wb, `Bang_diem_${clazz.name}_${column.name}.xlsx`);
  };

  const exportAll = () => {
    const data = users.map(user => {
      const row: any = {
        'STT': user.stt,
        'MSSV': user.mssv,
        'Họ và Tên': user.fullName,
      };

      gradeColumns.forEach(col => {
        const grade = grades.find(g => g.gradeColumnId === col.id && g.userId === user.id);
        row[col.name] = grade && grade.score !== undefined ? grade.score : 0;
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tổng hợp");
    XLSX.writeFile(wb, `Bang_diem_Tong_hop_${clazz.name}.xlsx`);
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={exportAll}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-[10px] font-black transition-all border border-emerald-100"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        XUẤT BẢNG ĐIỂM
      </button>
      
      <div className="relative group">
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl text-[10px] font-black transition-all border border-slate-100"
        >
          <Download className="w-3.5 h-3.5" />
          XUẤT THEO CỘT
        </button>
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl p-1 z-50 hidden group-hover:block min-w-[200px]">
          {gradeColumns.map(col => (
            <button 
              key={col.id}
              onClick={() => exportColumn(col.id)}
              className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              {col.name}
            </button>
          ))}
          {gradeColumns.length === 0 && <p className="px-3 py-2 text-[10px] text-slate-400">Chưa có cột điểm</p>}
        </div>
      </div>
    </div>
  );
}
