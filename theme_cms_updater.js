const fs = require('fs');

let content = fs.readFileSync('src/components/PortfolioCMS.tsx', 'utf8');

// The file has import for lucide-react. Let's add Database, CheckCircle2, Compass
content = content.replace(/Shield, User, Folder, Award, Layout, Check, Sparkles, RefreshCw, Eye, Settings/g, 'Shield, User, Folder, Award, Layout, Check, Sparkles, RefreshCw, Eye, Settings, Database, CheckCircle2, Compass, BookOpen');

// Replace the JSX structure for the top part
const newTopPart = `
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-emerald-500 text-white rounded-[2rem] p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Subtle background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-emerald-700/20 rounded-full blur-2xl translate-y-1/3"></div>

        <div className="relative z-10 space-y-4 flex-1 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 border border-white/20 rounded-full">
            <Shield className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-white">QUẢN TRỊ WEBSITE PORTFOLIO</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Quản trị Portfolio</h1>
          
          <p className="text-sm text-white/90 max-w-2xl font-medium">
            Biên tập nội dung hồ sơ, dự án, chương trình đào tạo và học thuật hiển thị trên trang Portfolio công khai.
          </p>
        </div>
        
        <div className="relative z-10">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-emerald-600 rounded-full text-sm font-bold transition-all shadow-lg cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Xem trang Portfolio</span>
          </a>
        </div>
      </div>

      {/* Thẻ trạng thái (2 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Phân hệ */}
        <div className="bg-white rounded-[1.5rem] border border-slate-100 p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PHÂN HỆ ĐANG MỞ</p>
            <h3 className="text-xl font-bold text-slate-800">
              {activeDivision === 'profile' && 'Hồ sơ cá nhân'}
              {activeDivision === 'creative' && 'Dự án & Đào tạo'}
              {activeDivision === 'academia' && 'Học thuật'}
              {activeDivision === 'navigation' && 'Điều hướng website'}
              {activeDivision === 'admin' && 'Quản trị tổng quan'}
            </h3>
            <p className="text-xs text-slate-500">
              {activeDivision === 'profile' && 'Banner, giới thiệu, học vấn, kinh nghiệm và kỹ năng'}
              {activeDivision === 'creative' && 'Quản lý danh mục dự án, tác phẩm và khóa học'}
              {activeDivision === 'academia' && 'Công bố nghiên cứu và chia sẻ bài giảng chuyên ngành'}
              {activeDivision === 'navigation' && 'Cấu hình menu và liên kết trang web'}
              {activeDivision === 'admin' && 'Thiết lập hệ thống, API và cài đặt nâng cao'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            {activeDivision === 'profile' && <User className="w-6 h-6" />}
            {activeDivision === 'creative' && <Folder className="w-6 h-6" />}
            {activeDivision === 'academia' && <Award className="w-6 h-6" />}
            {activeDivision === 'navigation' && <Compass className="w-6 h-6" />}
            {activeDivision === 'admin' && <Settings className="w-6 h-6" />}
          </div>
        </div>

        {/* Card 2: CSDL */}
        <div className="bg-white rounded-[1.5rem] border border-slate-100 p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CƠ SỞ DỮ LIỆU PORTFOLIO</p>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Sẵn sàng đồng bộ</span>
            </h3>
            <p className="text-xs text-slate-500">
              Nội dung được lưu vào Firebase/Firestore
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Thanh tab ngang */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-0 overflow-x-auto scrollbar-none">
        {[
          { id: 'profile', title: 'Hồ sơ cá nhân', icon: User },
          { id: 'creative', title: 'Dự án & Đào tạo', icon: Folder },
          { id: 'academia', title: 'Học thuật', icon: Award },
          { id: 'navigation', title: 'Điều hướng website', icon: Compass },
          { id: 'admin', title: 'Quản trị tổng quan', icon: Settings }
        ].map(div => {
          const IconComp = div.icon;
          const isSelected = activeDivision === div.id;
          return (
            <button
              key={div.id}
              onClick={() => setActiveDivision(div.id as any)}
              className={\`flex items-center gap-2 px-5 py-4 text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 \${
                isSelected
                  ? 'border-emerald-500 text-emerald-600 bg-white rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
              }\`}
            >
              <IconComp className="w-4 h-4" />
              <span>{div.title}</span>
            </button>
          );
        })}
      </div>

      {/* Vùng nội dung */}
      <div className="bg-white rounded-b-2xl rounded-tr-2xl border border-slate-100 p-5 sm:p-8 shadow-sm min-h-[400px] -mt-6">
        {activeDivision === 'profile' && <BannerAboutCMS />}
        {activeDivision === 'creative' && <ProjectsCoursesCMS />}
        {activeDivision === 'academia' && <ResearchLecturesNavCMS activeTab="research" />}
        {activeDivision === 'navigation' && <ResearchLecturesNavCMS activeTab="nav" />}
        {activeDivision === 'admin' && <AdminPortfolioCMS />}
      </div>
    </div>
`;

// Replace everything between <div className="space-y-6"> and the end of the return statement
content = content.replace(/<div className="space-y-6">[\s\S]*<\/div>\s*<\/div>\s*\);\s*}/, newTopPart + '\n  );\n}');

// Update the type of activeDivision
content = content.replace(/useState\<'profile' \| 'creative' \| 'academia' \| 'admin'\>\('profile'\)/, "useState<'profile' | 'creative' | 'academia' | 'navigation' | 'admin'>('profile')");

fs.writeFileSync('src/components/PortfolioCMS.tsx', content);
