import React, { useState, useEffect } from "react";
import { 
  Search, 
  BookOpen, 
  Layers, 
  HelpCircle, 
  MapPin, 
  Award, 
  Settings as SettingsIcon,
  ChevronDown,
  LogIn,
  Globe,
  Database,
  X,
  Star,
  Hash,
  Building2,
  Calendar,
  Loader2,
  Sparkles
} from "lucide-react";
import { 
  ScientificJournal, 
  AppSettings
} from "../types";
import { 
  getJournalsFromSupabase, 
  incrementStatInSupabase,
  getDefaultSettingsFromSupabase
} from "../lib/data";

interface PublicJournalSearchProps {
  onLoginClick: () => void;
}

export default function PublicJournalSearch({ onLoginClick }: PublicJournalSearchProps) {
  const [journals, setJournals] = useState<ScientificJournal[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedField, setSelectedField] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedScore, setSelectedScore] = useState<string>("all");
  const [selectedTime, setSelectedTime] = useState<string>("all");
  const [selectedJournal, setSelectedJournal] = useState<ScientificJournal | null>(null);

  // Track visit stats on mount
  useEffect(() => {
    incrementStatInSupabase("public_search");
    
    const loadData = async () => {
      try {
        const [journalData, settingsData] = await Promise.all([
          getJournalsFromSupabase(),
          getDefaultSettingsFromSupabase()
        ]);
        setJournals(journalData);
        setSettings(settingsData);
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getScoreColor = (score: string) => {
    const parts = score.split('-');
    const numericPart = parts.length > 1 ? parts[1].trim().replace(',', '.') : score.replace(',', '.');
    const value = parseFloat(numericPart);
    
    if (isNaN(value)) return 'text-slate-700';
    
    if (value <= 0.25) return 'text-slate-700';
    if (value <= 0.5) return 'text-orange-500';
    if (value <= 0.75) return 'text-emerald-500';
    return 'text-red-500';
  };

  // Filter lists
  const fields = ["all", ...Array.from(new Set(journals.map(j => j.field))).filter(Boolean)];
  const types = ["all", ...Array.from(new Set(journals.map(j => j.type))).filter(Boolean)];
  const scores = ["all", "0 – 0,25", "0 – 0,5", "0 – 0,75", "0 – 1,0", "0 – 1,5", "0 – 3,0"];

  const parseDateImported = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  const filteredJournals = journals.filter(j => {
    const matchesSearch = 
      j.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (j.issn || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.publisher || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.field || "").toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesField = selectedField === "all" || j.field === selectedField;
    const matchesType = selectedType === "all" || j.type === selectedType;
    const matchesScore = selectedScore === "all" || 
      j.score === selectedScore || 
      (j.score && String(j.score).includes(selectedScore));

    const matchesTime = (() => {
      if (selectedTime === "all") return true;
      const date = parseDateImported(j.dateImported);
      if (!date) return false;
      
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (selectedTime === "today") {
        return date >= startOfToday;
      }
      if (selectedTime === "3days") {
        const limit = new Date(startOfToday);
        limit.setDate(limit.getDate() - 3);
        return date >= limit;
      }
      if (selectedTime === "7days") {
        const limit = new Date(startOfToday);
        limit.setDate(limit.getDate() - 7);
        return date >= limit;
      }
      if (selectedTime === "30days") {
        const limit = new Date(startOfToday);
        limit.setDate(limit.getDate() - 30);
        return date >= limit;
      }
      if (selectedTime === "thismonth") {
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }
      if (selectedTime === "thisyear") {
        return date.getFullYear() === now.getFullYear();
      }
      return true;
    })();

    return matchesSearch && matchesField && matchesType && matchesScore && matchesTime;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4" id="public-search-loading">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        <p className="text-xs font-bold text-slate-500 animate-pulse">Đang đồng bộ dữ liệu điểm số mới nhất...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="public-search-root">
      {/* Hero Banner Section matching user's reference image */}
      <section 
        className="bg-brand text-white py-12 px-6 sm:px-12 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]"
        style={{
          ...(settings?.pageCoverImage ? { backgroundImage: `url(${settings.pageCoverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
        }}
      >
        {settings?.pageCoverImage && <div className="absolute inset-0 bg-black/40" />}
        {/* Login Button Overlay */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={onLoginClick}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer border border-white/10"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập hệ thống</span>
          </button>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm mx-auto">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{settings?.bannerLabel || "Smart Research VN"}</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white font-display drop-shadow-sm">
            {settings?.bannerTitle || (
              <>
                Tra Cứu <span className="text-amber-400">Tạp Chí Khoa Học</span> <br className="hidden sm:inline" /> Được Tính Điểm 2025
              </>
            )}
          </h1>

          {/* Subheading */}
          <p className="text-sm sm:text-base text-white/90 max-w-2xl mx-auto leading-relaxed">
            {settings?.bannerDescription || "Tìm kiếm tạp chí theo tên, ISSN, điểm số, ngành/lĩnh vực. Dữ liệu theo 28 HĐ Giáo sư ngành, liên ngành."}
          </p>

          {/* Large styled search box */}
          <div className="max-w-xl mx-auto pt-4 w-full">
            <div className="bg-white p-1.5 rounded-2xl shadow-2xl flex items-center border border-white/20 overflow-hidden">
              <div className="flex-1 flex items-center pl-3.5">
                <Search className="text-slate-400 w-5 h-5 shrink-0" />
                <input
                  type="text"
                  placeholder="Nhập tên tạp chí, ISSN, cơ quan xuất bản..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none py-2.5 pl-2 text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <button 
                className="bg-brand hover:bg-brand-hover text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-r-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Tìm</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main filter and table container */}
      <main className="flex-1 max-w-6.5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Filters and counters header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ngành:</span>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="all">Tất cả ngành</option>
                {fields.filter(f => f !== "all").map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Điểm số:</span>
              <select
                value={selectedScore}
                onChange={(e) => setSelectedScore(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả điểm</option>
                {scores.filter(s => s !== "all").map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Phân loại:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả loại</option>
                {types.filter(t => t !== "all").map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Thời gian nhập:</span>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="3days">3 ngày gần đây</option>
                <option value="7days">7 ngày gần đây</option>
                <option value="30days">30 ngày gần đây</option>
                <option value="thismonth">Tháng này</option>
                <option value="thisyear">Năm nay</option>
              </select>
            </div>
          </div>

          {/* Total Results */}
          <div className="text-right shrink-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-500">
              Tìm thấy <strong className="text-purple-700 text-base font-extrabold">{filteredJournals.length}</strong> kết quả
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-400">Đang đồng bộ dữ liệu điểm số mới nhất...</p>
            </div>
          ) : filteredJournals.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">Không tìm thấy tạp chí phù hợp</h4>
              <p className="text-xs text-slate-400">Vui lòng thử tìm kiếm bằng từ khoá khác hoặc đặt lại bộ lọc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">
                    <th className="py-4 px-5 w-12 text-center">TT</th>
                    <th className="py-4 px-5 w-40 text-center">ĐIỂM</th>
                    <th className="py-4 px-4 w-[25%]">TÊN TẠP CHÍ</th>
                    <th className="py-4 px-4 w-28">ISSN</th>
                    <th className="py-4 px-4 w-24">LOẠI</th>
                    <th className="py-4 px-4 w-[25%]">CƠ QUAN XUẤT BẢN</th>
                    <th className="py-4 px-4">NGÀNH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredJournals.map((j, idx) => (
                    <tr 
                      key={j.id} 
                      className="hover:bg-purple-50/10 transition-colors"
                    >
                      <td className="py-4 px-5 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>
                      <td className={`py-4 px-5 text-center font-extrabold text-sm sm:text-base ${getScoreColor(j.score || "0")}`}>
                        {j.score || "0"}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setSelectedJournal(j)}
                          className="text-left font-bold text-slate-800 hover:text-brand hover:underline cursor-pointer group transition-all"
                        >
                          {j.name}
                        </button>
                        {j.description && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium line-clamp-1">{j.description}</p>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-500">
                        {j.issn || "—"}
                      </td>
                      <td className="py-4 px-4 text-left">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#712cf9] border border-purple-100">
                          {j.type || "Tạp chí"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-medium">
                        {j.publisher || "—"}
                      </td>
                      <td className="py-4 px-4 text-left">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/40">
                          {j.field || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-6 border-t border-slate-800 text-xs mt-12 space-y-2 shrink-0">
        <div className="flex items-center justify-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          <span>Hệ thống cơ sở dữ liệu quốc gia đồng bộ thời gian thực</span>
        </div>
        <p>© 2026 Smart Research VN. Được xuất bản phục vụ cộng đồng nghiên cứu khoa học.</p>
      </footer>
      {/* POPUP DETAIL MODAL */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setSelectedJournal(null)} />
          
          <div className="bg-white rounded-3xl w-full max-w-2xl relative overflow-hidden shadow-2xl z-10 animate-scaleUp flex flex-col max-h-[90vh]">
            {/* Header with image */}
            <div className="relative h-48 bg-slate-900 overflow-hidden">
               {selectedJournal.coverImage || selectedJournal.avatar ? (
                 <img src={selectedJournal.coverImage || selectedJournal.avatar} alt={selectedJournal.name} className="w-full h-full object-cover" />
               ) : (
                 <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
               )}
               <div className="absolute inset-0 bg-black/40" />
               <div className="absolute top-4 left-4 bg-purple-600 text-white px-2 py-1 rounded-md text-xs font-bold uppercase">TẠP CHÍ</div>
               <button onClick={() => setSelectedJournal(null)} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-1 transition-all">
                 <X className="w-5 h-5" />
               </button>
               <div className="absolute bottom-4 left-6 text-white z-10">
                  <div className="flex mb-1">
                     {[...Array(5)].map((_, i) => (
                       <Star key={i} className={`w-4 h-4 ${i < (selectedJournal.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                     ))}
                  </div>
                  <h2 className="text-xl font-extrabold">{selectedJournal.name}</h2>
               </div>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                 <div className="flex gap-2 items-center"><Hash className="w-4 h-4 text-emerald-600" /><div><p className="text-slate-500 font-semibold">MÃ ISSN</p><p className="font-bold text-slate-800">{selectedJournal.issn || "N/A"}</p></div></div>
                 <div className="flex gap-2 items-center"><Building2 className="w-4 h-4 text-emerald-600" /><div><p className="text-slate-500 font-semibold">CƠ QUAN XUẤT BẢN</p><p className="font-bold text-slate-800">{selectedJournal.publisher || "N/A"}</p></div></div>
                 <div className="flex gap-2 items-center"><Layers className="w-4 h-4 text-emerald-600" /><div><p className="text-slate-500 font-semibold">NGÀNH / LĨNH VỰC</p><p className="font-bold text-slate-800">{selectedJournal.field || "N/A"}</p></div></div>
                 <div className="flex gap-2 items-center"><Award className="w-4 h-4 text-emerald-600" /><div><p className="text-slate-500 font-semibold">ĐIỂM SỐ TÍNH TOÁN</p><p className="font-bold text-slate-800">{selectedJournal.score || "0"}</p></div></div>
                 <div className="flex gap-2 items-center"><Calendar className="w-4 h-4 text-emerald-600" /><div><p className="text-slate-500 font-semibold">NĂM THÀNH LẬP</p><p className="font-bold text-slate-800">{selectedJournal.establishedDate || "N/A"}</p></div></div>
                 <div className="flex gap-2 items-center"><BookOpen className="w-4 h-4 text-emerald-600" /><div><p className="text-slate-500 font-semibold">SỐ LƯỢNG BÀI BÁO</p><p className="font-bold text-slate-800">{selectedJournal.paperCount || "0"}</p></div></div>
              </div>
              
              <div>
                <p className="text-slate-500 font-semibold text-xs mb-2">GIỚI THIỆU CHI TIẾT TẠP CHÍ</p>
                <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm">{selectedJournal.description || "Chưa có mô tả"}</div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 text-right">
              <button onClick={() => setSelectedJournal(null)} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all">Đóng lại</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
