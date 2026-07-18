import React, { useState } from 'react';
import { Globe, ArrowRight, Code, Copy, CheckCircle, ExternalLink, HelpCircle, Layers, FileCode } from 'lucide-react';

export default function WebsiteIntegration() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string>('https://ngtduc24.github.io/');

  const sidebarCodeSnippet = `<!-- Code thêm nút "Tính Cỡ Mẫu" vào Sidebar của ngtduc24.github.io -->
<li class="nav-item">
  <a class="nav-link flex items-center gap-2" href="${window.location.origin}" target="_blank">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calculator">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
      <line x1="8" x2="16" y1="6" y2="6"/>
      <line x1="16" x2="16" y1="14" y2="18"/>
      <path d="M16 10h.01"/>
      <path d="M12 10h.01"/>
      <path d="M8 10h.01"/>
      <path d="M12 14h.01"/>
      <path d="M8 14h.01"/>
      <path d="M12 18h.01"/>
      <path d="M8 18h.01"/>
    </svg>
    <span>Tính Cỡ Mẫu Nghiên Cứu</span>
    <span class="badge badge-primary font-bold text-[10px] ml-auto">NEW</span>
  </a>
</li>`;

  const iframeEmbedCode = `<div class="card p-4 shadow border-0">
  <h4 class="card-title font-bold mb-3">Công Cụ Tính Cỡ Mẫu Toàn Diện</h4>
  <iframe 
    src="${window.location.origin}" 
    width="100%" 
    height="750" 
    style="border: none; border-radius: 12px;"
    allow="clipboard-write">
  </iframe>
</div>`;

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Introduction Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 bg-purple-50 text-[#712cf9] px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2">
              <Globe className="w-3.5 h-3.5" />
              <span>ngtduc24.github.io</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-display">Tích hợp vào Giao diện Quản trị của bạn</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Bạn có thể dễ dàng liên kết công cụ tính toán cỡ mẫu chuyên sâu này vào thanh Sidebar của trang quản trị 
              hoặc hiển thị trực tiếp bằng một khung iframe nhúng độc lập.
            </p>
          </div>
          <a 
            href="https://ngtduc24.github.io/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/10 cursor-pointer"
          >
            <span>Mở Website gốc của tôi</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Code Snippet for Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileCode className="w-4.5 h-4.5 text-blue-600" />
                <h4 className="font-bold text-slate-800 text-sm sm:text-base font-display">
                  1. Mã thêm nút vào Sidebar
                </h4>
              </div>
              <button 
                onClick={() => handleCopy(sidebarCodeSnippet, 'sidebar')}
                className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1 cursor-pointer"
              >
                {copiedCode === 'sidebar' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép Code</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Dán đoạn mã HTML sau vào tệp quản lý thanh bên (Sidebar) của bạn (ví dụ: `sidebar.html`, `index.html` hoặc file thành phần React của repository của bạn). Nó sẽ tạo ra một liên kết tuyệt đẹp dẫn thẳng tới hệ thống tính cỡ mẫu này:
            </p>
            <pre className="text-xs bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto font-mono leading-relaxed h-52">
              {sidebarCodeSnippet}
            </pre>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
            <HelpCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Mẹo: URL sẽ tự động trỏ về địa chỉ lưu trữ của hệ thống tính toán này.</span>
          </div>
        </div>

        {/* Code Snippet for Iframe Embed */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Code className="w-4.5 h-4.5 text-emerald-600" />
                <h4 className="font-bold text-slate-800 text-sm sm:text-base font-display">
                  2. Mã Nhúng Iframe Trực Tiếp
                </h4>
              </div>
              <button 
                onClick={() => handleCopy(iframeEmbedCode, 'iframe')}
                className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1 cursor-pointer"
              >
                {copiedCode === 'iframe' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép Code</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Nếu bạn muốn hệ thống tính cỡ mẫu hoạt động ngay bên trong giao diện trang Admin (không mở tab mới), hãy sử dụng thẻ iframe được thiết kế chuẩn phản hồi (responsive) sau:
            </p>
            <pre className="text-xs bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto font-mono leading-relaxed h-52">
              {iframeEmbedCode}
            </pre>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Đã cấp quyền truy cập bảng tạm (clipboard-write) để người dùng có thể sao chép kết quả ngay từ iframe.</span>
          </div>
        </div>

      </div>

      {/* Live Preview Frame of your website */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-800 text-sm font-display">Khung xem thử Website của bạn</h4>
            <p className="text-[11px] text-slate-400">Đang hiển thị ngtduc24.github.io</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 w-full sm:w-auto max-w-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <input 
              type="text" 
              value={iframeUrl} 
              onChange={(e) => setIframeUrl(e.target.value)}
              className="text-xs text-slate-600 font-mono bg-transparent outline-none border-none w-full min-w-[200px]"
            />
          </div>
        </div>

        {/* Real Iframe containing their repository website if possible, with clear fallbacks */}
        <div className="h-[480px] bg-slate-50 relative">
          <iframe 
            src={iframeUrl} 
            className="w-full h-full border-0" 
            title="ngtduc24 Website Preview"
            sandbox="allow-scripts allow-same-origin"
            onError={() => console.log('Iframe failed to load')}
          />
          {/* Subtle info label overlays */}
          <div className="absolute bottom-4 right-4 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] px-3 py-1.5 rounded-lg font-medium leading-normal pointer-events-none">
            ⓘ Nếu trang web không tải, điều này là do chính sách bảo mật CORS hoặc X-Frame-Options từ GitHub Pages. Bạn có thể bấm nút "Mở Website gốc" ở trên.
          </div>
        </div>
      </div>

    </div>
  );
}
