const fs = require('fs');
let code = fs.readFileSync('src/components/ARModule.tsx', 'utf8');

// The string that was accidentally added inside ARTargetCard
const badUIPatch = `          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Tính năng nâng cao (Nhóm 2)</h4>
            
            {contentType === 'video' && (
              <div className="space-y-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input type="checkbox" checked={isTransparentVideo} onChange={(e) => setIsTransparentVideo(e.target.checked)} className="w-4 h-4 accent-brand" />
                  <span className="text-xs font-semibold text-slate-700">Video tách nền (Chroma Key)</span>
                </label>
                {isTransparentVideo && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Màu nền cần tách (Mã Hex)</label>
                    <div className="flex gap-2">
                      <input type="color" value={chromaKeyColor} onChange={(e) => setChromaKeyColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                      <input type="text" value={chromaKeyColor} onChange={(e) => setChromaKeyColor(e.target.value)} placeholder="#00ff00" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none uppercase" />
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={autoPlayVideo} onChange={(e) => setAutoPlayVideo(e.target.checked)} className="w-4 h-4 accent-brand" />
                    <span className="text-xs font-semibold text-slate-700">Tự động phát</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={loopVideo} onChange={(e) => setLoopVideo(e.target.checked)} className="w-4 h-4 accent-brand" />
                    <span className="text-xs font-semibold text-slate-700">Lặp lại</span>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-600">Nút bấm tương tác (hiển thị dưới vật thể)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tên nút</label>
                  <input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} placeholder="VD: Xem chi tiết" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Đường dẫn URL</label>
                  <input value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>`;

// Replace it back
code = code.replace(badUIPatch, `            </div>\n          </div>\n        </div>`);
fs.writeFileSync('src/components/ARModule.tsx', code);
