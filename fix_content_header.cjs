const fs = require('fs');
let content = fs.readFileSync('src/components/PortfolioCMS.tsx', 'utf8');

const headerHTML = `
      {/* Vùng nội dung */}
      <div className="bg-white rounded-b-2xl border border-t-0 border-slate-100 p-5 sm:p-8 shadow-sm min-h-[400px]">
        {/* Tiêu đề phân hệ */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            {activeDivision === 'profile' && <User className="w-6 h-6" />}
            {activeDivision === 'creative' && <Folder className="w-6 h-6" />}
            {activeDivision === 'academia' && <Award className="w-6 h-6" />}
            {activeDivision === 'navigation' && <Compass className="w-6 h-6" />}
            {activeDivision === 'admin' && <Settings className="w-6 h-6" />}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-800">
              {activeDivision === 'profile' && 'Hồ sơ cá nhân'}
              {activeDivision === 'creative' && 'Dự án & Đào tạo'}
              {activeDivision === 'academia' && 'Học thuật'}
              {activeDivision === 'navigation' && 'Điều hướng website'}
              {activeDivision === 'admin' && 'Quản trị tổng quan'}
            </h2>
            <p className="text-sm text-slate-500">
              {activeDivision === 'profile' && 'Banner, giới thiệu, học vấn, kinh nghiệm và kỹ năng'}
              {activeDivision === 'creative' && 'Quản lý danh mục dự án, tác phẩm và khóa học'}
              {activeDivision === 'academia' && 'Công bố nghiên cứu và chia sẻ bài giảng chuyên ngành'}
              {activeDivision === 'navigation' && 'Cấu hình menu và liên kết trang web'}
              {activeDivision === 'admin' && 'Thiết lập hệ thống, API và cài đặt nâng cao'}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
`;

// Also close the new div at the end
content = content.replace(/\{\/\* Vùng nội dung \*\/\}[\s\S]*?\<div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 shadow-sm min-h-\[400px\]"\>/, headerHTML);

// Wait, earlier I removed rounded-b-2xl rounded-tr-2xl... wait, what is the exact string now?
