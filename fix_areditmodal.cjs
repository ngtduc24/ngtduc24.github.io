const fs = require('fs');
let code = fs.readFileSync('src/components/ARModule.tsx', 'utf8');

const startIdx = code.indexOf('  return (\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">');
const endIdx = code.indexOf('}\n\nexport default function ARModule()');

if (startIdx !== -1 && endIdx !== -1) {
  const newReturn = `  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-3xl w-full max-w-xl relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><Pencil className="w-5 h-5 text-brand" /> Chỉnh sửa AR Target</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tên AR <span className="text-rose-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên AR target" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Nhập mô tả" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none resize-none" />
          </div>

          {target.image_url && target.content_url && (
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 mb-2">Trình chỉnh sửa trực quan (Kéo thả)</label>
              <ARVisualEditor
                targetImage={target.image_url}
                contentUrl={target.content_url}
                contentType={target.content_type}
                posX={posX} posY={posY} posZ={posZ}
                scale={scale} rotation={rotation}
                onPositionChange={(x, y, z) => { setPosX(x); setPosY(y); setPosZ(z); }}
                onScaleChange={setScale}
                onRotationChange={setRotation}
              />
            </div>
          )}

          <details className="group mb-4 bg-slate-50 border border-slate-100 rounded-xl">
            <summary className="text-xs font-semibold text-slate-600 p-3 cursor-pointer hover:text-brand transition-colors list-none flex items-center gap-2 select-none">
              <span className="group-open:rotate-90 transition-transform text-[10px]">▶</span>
              Nhập thông số 3D thủ công (Nâng cao)
            </summary>
            <div className="p-3 pt-0 space-y-3 border-t border-slate-100 mt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tỷ lệ (scale)</label>
                  <input type="number" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value) || 1)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Góc xoay X (độ)</label>
                  <input type="number" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Vị trí X</label>
                  <input type="number" step="0.1" value={posX} onChange={(e) => setPosX(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Vị trí Y</label>
                  <input type="number" step="0.1" value={posY} onChange={(e) => setPosY(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Vị trí Z</label>
                  <input type="number" step="0.1" value={posZ} onChange={(e) => setPosZ(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none bg-white" />
                </div>
              </div>
            </div>
          </details>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Tính năng nâng cao (Nhóm 2)</h4>
            
            {target.content_type === 'video' && (
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
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active-cb" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-brand" />
            <label htmlFor="active-cb" className="text-sm font-semibold text-slate-600 cursor-pointer select-none">Kích hoạt AR</label>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-white transition">Hủy</button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );\n`;

  code = code.substring(0, startIdx) + newReturn + code.substring(endIdx);
  fs.writeFileSync('src/components/ARModule.tsx', code);
}
