const fs = require('fs');
let code = fs.readFileSync('src/components/ARModule.tsx', 'utf8');

// Find the start of ARCreateView return
const startIdx = code.indexOf('  return (\n    <div className="space-y-6">');
// Find the end of ARCreateView
const endIdx = code.indexOf('}\n\nfunction AREditModal');

if (startIdx !== -1 && endIdx !== -1) {
  const newReturn = `  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-brand to-brand rounded-2xl p-6 text-white shadow-lg flex items-center gap-3">
        <button type="button" onClick={onCancel} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-black tracking-tight">Tạo AR Target Mới</h1>
          <p className="text-xs text-white/80 mt-0.5">Tải ảnh target và nội dung hiển thị để tạo trải nghiệm AR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-sm">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-brand/10 text-brand flex items-center justify-center text-xs font-black">1</span>Ảnh Target (ảnh để quét)</h3>
          <ARDropZone label="Ảnh Target" hint="Kéo thả ảnh vào đây hoặc bấm để chọn" accept="image/*" previewUrl={targetPreview} kind="image" fileName={targetFile ? targetFile.name : ''} onFile={pick(setTargetFile, setTargetPreview)} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-sm">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-brand/10 text-brand flex items-center justify-center text-xs font-black">2</span>Nội dung hiển thị</h3>
          <div className="flex flex-wrap gap-2">
            {types.map((tp) => (
              <button key={tp.v} type="button" onClick={() => { setContentType(tp.v as any); setContentFile(null); setContentPreview(''); }} className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition ' + (contentType === tp.v ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{tp.label}</button>
            ))}
          </div>
          <ARDropZone label="Nội dung hiển thị" hint="Kéo thả tệp vào đây hoặc bấm để chọn" accept={contentAccept} previewUrl={contentPreview} kind={contentType} fileName={contentFile ? contentFile.name : ''} onFile={pick(setContentFile, setContentPreview)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tên AR <span className="text-rose-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên AR target" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Nhập mô tả cho AR target" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none resize-none" />
          </div>

          {targetPreview && contentPreview && (
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 mb-2">Trình chỉnh sửa trực quan (Kéo thả)</label>
              <ARVisualEditor
                targetImage={targetPreview}
                contentUrl={contentPreview}
                contentType={contentType}
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
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600">Ảnh Thumbnail (hiển thị ngoài danh sách)</label>
          <ARDropZone label="Thumbnail" hint="Không bắt buộc, mặc định dùng ảnh target" accept="image/*" previewUrl={thumbPreview} kind="image" fileName={thumbFile ? thumbFile.name : ''} onFile={pick(setThumbFile, setThumbPreview)} />
        </div>
      </div>

      {err && <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl p-3"><AlertCircle className="w-4 h-4 shrink-0" />{err}</div>}
      {saving && progressText && <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl p-3"><Loader2 className="w-4 h-4 shrink-0 animate-spin" />{progressText}</div>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Hủy</button>
        <button type="button" onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Đang tạo...' : 'Tạo AR Target'}
        </button>
      </div>
    </div>
  );\n`;

  code = code.substring(0, startIdx) + newReturn + code.substring(endIdx);
  fs.writeFileSync('src/components/ARModule.tsx', code);
}
