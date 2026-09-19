import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Smartphone,
  Check,
  Eye,
  EyeOff,
  Sliders,
  Layers,
  HelpCircle,
  RotateCw,
  Maximize2,
  Move,
  Link2,
} from 'lucide-react';

interface MobileARPreviewModalProps {
  targetName: string;
  contentType: 'image' | 'video' | '3d' | 'gif';
  contentPreview: string;
  targetPreview: string;
  scale: number;
  rotationX: number;
  rotationY?: number;
  rotationZ?: number;
  lightIntensity?: number;
  lightPosX?: number;
  lightPosY?: number;
  lightPosZ?: number;
  lightRotX?: number;
  lightRotY?: number;
  lightRotZ?: number;
  lightScale?: number;
  posX: number;
  posY: number;
  isTransparentVideo?: boolean;
  chromaKeyColor?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  // HUD toggles
  showLogo: boolean;
  setShowLogo: (val: boolean) => void;
  showCloseButton: boolean;
  setShowCloseButton: (val: boolean) => void;
  showGestureHint: boolean;
  setShowGestureHint: (val: boolean) => void;
  showTargetName: boolean;
  setShowTargetName: (val: boolean) => void;
  enableCapture: boolean;
  setEnableCapture: (val: boolean) => void;
  // Gestures
  allowUserRotate?: boolean;
  allowUserScale?: boolean;
  allowUserDrag?: boolean;
  // Controls
  onClose: () => void;
}

export default function MobileARPreviewModal({
  targetName,
  contentType,
  contentPreview,
  targetPreview,
  scale,
  rotationX,
  rotationY = 0,
  rotationZ = 0,
  lightIntensity = 1.2,
  lightPosX = 5,
  lightPosY = 10,
  lightPosZ = 7,
  lightRotX = 0,
  lightRotY = 0,
  lightRotZ = 0,
  lightScale = 1.0,
  posX,
  posY,
  buttonLabel,
  buttonUrl,
  showLogo,
  setShowLogo,
  showCloseButton,
  setShowCloseButton,
  showGestureHint,
  setShowGestureHint,
  showTargetName,
  setShowTargetName,
  enableCapture,
  setEnableCapture,
  allowUserRotate = true,
  allowUserScale = true,
  allowUserDrag = false,
  onClose,
}: MobileARPreviewModalProps) {
  // Simulator background style
  const [bgMode, setBgMode] = useState<'camera_sim' | 'target_marker' | 'clean_dark'>('camera_sim');

  // Quick Preset Handlers
  const applyPreset = (preset: 'minimal' | 'standard' | 'full') => {
    if (preset === 'minimal') {
      setShowLogo(false);
      setShowCloseButton(true);
      setShowGestureHint(false);
      setShowTargetName(false);
      setEnableCapture(false);
    } else if (preset === 'standard') {
      setShowLogo(true);
      setShowCloseButton(true);
      setShowGestureHint(true);
      setShowTargetName(false);
      setEnableCapture(true);
    } else if (preset === 'full') {
      setShowLogo(true);
      setShowCloseButton(true);
      setShowGestureHint(true);
      setShowTargetName(true);
      setEnableCapture(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#16161d] border border-white/15 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand/20 text-brand flex items-center justify-center border border-brand/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Xem Trước Giao Diện Điện Thoại (Mobile AR Preview)
              </h2>
              <p className="text-xs text-slate-400">
                Mô phỏng chính xác những gì khách hàng sẽ nhìn thấy khi quét AR bằng camera điện thoại.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Đóng xem trước"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split 2 Columns */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          {/* LEFT: Interactive Smartphone Mockup (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            {/* Background Simulator Switcher */}
            <div className="flex items-center gap-2 mb-3 bg-black/50 p-1 rounded-xl border border-white/10 text-xs">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Hậu cảnh:</span>
              <button
                type="button"
                onClick={() => setBgMode('camera_sim')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  bgMode === 'camera_sim' ? 'bg-brand text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mô phỏng Camera
              </button>
              <button
                type="button"
                onClick={() => setBgMode('target_marker')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  bgMode === 'target_marker' ? 'bg-brand text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ảnh Target thực tế
              </button>
              <button
                type="button"
                onClick={() => setBgMode('clean_dark')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  bgMode === 'clean_dark' ? 'bg-brand text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Nền tối
              </button>
            </div>

            {/* Smartphone Outer Casing (iPhone Style) */}
            <div className="relative w-[320px] sm:w-[350px] h-[640px] rounded-[48px] p-3 bg-gradient-to-b from-[#3a3a44] via-[#22222a] to-[#121217] shadow-2xl border-4 border-[#454554] flex flex-col">
              {/* Phone Volume and Power Buttons */}
              <div className="absolute -left-5 top-24 w-1 h-10 bg-[#353540] rounded-l" />
              <div className="absolute -left-5 top-38 w-1 h-10 bg-[#353540] rounded-l" />
              <div className="absolute -right-5 top-28 w-1 h-16 bg-[#353540] rounded-r" />

              {/* Smartphone Screen Viewport */}
              <div className="relative w-full h-full rounded-[38px] overflow-hidden bg-black flex flex-col select-none border border-white/10 shadow-inner">
                {/* 1. Dynamic Island / Camera Notch */}
                <div className="absolute top-2.5 inset-x-0 z-40 flex justify-center pointer-events-none">
                  <div className="w-24 h-6 bg-black rounded-full border border-white/10 flex items-center justify-between px-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a24] border border-white/20" />
                    <div className="w-2 h-2 rounded-full bg-brand/80 animate-pulse" />
                  </div>
                </div>

                {/* 2. Simulated Camera / AR Background */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  {bgMode === 'camera_sim' && (
                    <div className="w-full h-full relative bg-slate-800 flex items-center justify-center">
                      {/* Subtly animated camera scanline effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 opacity-90" />
                      {/* Grid lines for depth */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />
                      {/* Reticle Target Tracker in center */}
                      {targetPreview ? (
                        <div className="relative w-44 h-44 rounded-2xl border-2 border-brand/60 p-2 shadow-2xl flex items-center justify-center bg-black/40">
                          <img
                            src={targetPreview}
                            alt="Target Preview"
                            className="w-full h-full object-contain rounded-lg opacity-60"
                          />
                          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-brand" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-brand" />
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-brand" />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-brand" />
                        </div>
                      ) : (
                        <div className="w-40 h-40 border border-dashed border-white/20 rounded-2xl flex items-center justify-center text-slate-500 text-xs">
                          Khung quét AR
                        </div>
                      )}
                    </div>
                  )}

                  {bgMode === 'target_marker' && (
                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                      {targetPreview ? (
                        <img
                          src={targetPreview}
                          alt="Target Marker"
                          className="w-full h-full object-cover opacity-80"
                        />
                      ) : (
                        <div className="text-xs text-slate-500">Chưa có ảnh target</div>
                      )}
                    </div>
                  )}

                  {bgMode === 'clean_dark' && (
                    <div className="w-full h-full bg-[#0d0d12]" />
                  )}
                </div>

                {/* 3. AR 3D Content Floating Representation */}
                <div
                  className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center transition-all duration-300"
                  style={{
                    transform: `translate(${posX * 40}px, ${-posY * 40}px) scale(${scale}) rotateX(${rotationX}deg) rotateY(${rotationY}deg) rotateZ(${rotationZ}deg)`,
                    filter: `brightness(${Math.min(Math.max((lightIntensity / 1.2) * (lightScale ?? 1.0) * 100, 40), 240)}%) drop-shadow(${-((lightPosX ?? 5) / 5) * 10}px ${((lightPosY ?? 10) / 10) * 15}px ${15 * (lightScale ?? 1.0)}px rgba(0,0,0,0.65))`,
                  }}
                >
                  {contentType === 'image' || contentType === 'gif' ? (
                    contentPreview ? (
                      <img
                        src={contentPreview}
                        alt="Content Overlay"
                        className="max-w-[150px] max-h-[150px] object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]"
                      />
                    ) : (
                      <div className="px-4 py-2 rounded-xl bg-brand/20 border border-brand/40 text-brand text-xs font-bold">
                        Hình ảnh AR
                      </div>
                    )
                  ) : contentType === 'video' ? (
                    contentPreview ? (
                      <video
                        src={contentPreview}
                        muted
                        autoPlay
                        loop
                        playsInline
                        className="max-w-[160px] max-h-[160px] rounded-xl object-contain drop-shadow-2xl"
                      />
                    ) : (
                      <div className="px-4 py-2 rounded-xl bg-brand/20 border border-brand/40 text-brand text-xs font-bold">
                        Video AR
                      </div>
                    )
                  ) : (
                    // 3D Model representation
                    <div className="w-36 h-36 rounded-2xl bg-gradient-to-tr from-brand/30 via-brand/20 to-brand/30 border border-white/20 backdrop-blur-xs flex flex-col items-center justify-center shadow-2xl p-3 text-center">
                      <Sparkles className="w-8 h-8 text-amber-300 mb-1 animate-pulse" />
                      <span className="text-[11px] font-bold text-white leading-tight">
                        Mô hình 3D
                      </span>
                      <span className="text-[9px] text-brand font-mono">
                        Scale: {scale.toFixed(2)}x
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. OVERLAY HUD (The exact UI elements toggled by user) */}

                {/* Top Left: Logo */}
                {showLogo && (
                  <div className="absolute top-10 left-4 z-30 bg-black/40 p-1.5 rounded-xl backdrop-blur-md border border-white/10 animate-in fade-in zoom-in-90 duration-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-lg bg-brand flex items-center justify-center text-[10px] font-bold text-white">
                        AR
                      </div>
                      <span className="text-[10px] font-bold text-white pr-1">Logo</span>
                    </div>
                  </div>
                )}

                {/* Top Center: Target Name */}
                {showTargetName && (
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full border border-white/15 text-[10px] font-semibold shadow-lg max-w-[150px] truncate animate-in fade-in slide-in-from-top-2 duration-200">
                    {targetName || 'Tên AR Target'}
                  </div>
                )}

                {/* Top Right: Close Button */}
                {showCloseButton && (
                  <div className="absolute top-10 right-4 z-30 bg-black/50 text-white p-2 rounded-full border border-white/15 shadow-lg animate-in fade-in zoom-in-90 duration-200">
                    <X className="w-4 h-4" />
                  </div>
                )}

                {/* Upper Center: 3D Gesture Guidance Hint Banner */}
                {showGestureHint && (
                  <div className="absolute top-22 inset-x-3 z-30 bg-black/75 backdrop-blur-md text-white text-[10px] px-3 py-2 rounded-xl border border-white/15 shadow-xl flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <div className="leading-tight truncate">
                        <span className="font-semibold text-amber-300 block">Tương tác 3D:</span>
                        <span className="text-slate-200">
                          {[
                            allowUserRotate && '1 ngón xoay',
                            allowUserScale && '2 ngón zoom',
                            allowUserDrag && 'kéo vị trí',
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </span>
                      </div>
                    </div>
                    <div className="text-slate-400 hover:text-white p-0.5 rounded shrink-0">
                      <X className="w-3 h-3" />
                    </div>
                  </div>
                )}

                {/* Bottom Center: Call-To-Action Button */}
                {buttonLabel && (
                  <div className="absolute bottom-22 inset-x-0 flex justify-center z-30 px-4">
                    <div className="px-5 py-2 bg-brand text-white font-bold rounded-full shadow-xl text-xs flex items-center gap-1.5 border border-white/20">
                      {buttonLabel}
                      <Link2 className="w-3 h-3" />
                    </div>
                  </div>
                )}

                {/* Bottom Center: AR Shutter Button */}
                {enableCapture && (
                  <div className="absolute bottom-6 inset-x-0 flex justify-center z-30">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm border-2 border-white rounded-full flex items-center justify-center shadow-lg">
                      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Customization Controls & Switches (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Quick Presets */}
            <div className="bg-black/30 p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-brand" /> Cấu hình nhanh (Presets)
              </span>
              <p className="text-[11px] text-slate-400">
                Chọn chế độ tối ưu giao diện phù hợp với nhu cầu hiển thị:
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => applyPreset('minimal')}
                  className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition"
                >
                  <span className="text-xs font-bold text-slate-200 block">Tối giản</span>
                  <span className="text-[9px] text-slate-400">Chỉ Camera + 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('standard')}
                  className="py-2 px-2 rounded-xl bg-brand/20 hover:bg-brand/30 border border-brand/40 text-center transition"
                >
                  <span className="text-xs font-bold text-white block">Tiêu chuẩn</span>
                  <span className="text-[9px] text-brand">Khuyên dùng</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('full')}
                  className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center transition"
                >
                  <span className="text-xs font-bold text-slate-200 block">Đầy đủ</span>
                  <span className="text-[9px] text-slate-400">Tất cả tiện ích</span>
                </button>
              </div>
            </div>

            {/* Granular Feature Toggles */}
            <div className="bg-black/30 p-4 rounded-2xl border border-white/10 flex-1 space-y-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-brand" /> Tùy chỉnh chi tiết phần tử HUD
              </span>
              <p className="text-[11px] text-slate-400">
                Bật hoặc tắt từng phần tử để giao diện trên điện thoại thoáng đãng và sạch sẽ:
              </p>

              <div className="space-y-2.5 pt-1">
                {/* 1. Logo Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-brand/20 text-brand flex items-center justify-center">
                      <span className="text-xs font-bold">Logo</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">Logo thương hiệu</span>
                      <span className="text-[10px] text-slate-400">Góc trên bên trái màn hình AR</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="w-4 h-4 accent-brand rounded cursor-pointer"
                  />
                </label>

                {/* 2. Close Button Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">Nút đóng (X)</span>
                      <span className="text-[10px] text-slate-400">Góc trên bên phải để thoát AR</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showCloseButton}
                    onChange={(e) => setShowCloseButton(e.target.checked)}
                    className="w-4 h-4 accent-brand rounded cursor-pointer"
                  />
                </label>

                {/* 3. Gesture Hint Banner Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">Hướng dẫn cử chỉ 3D</span>
                      <span className="text-[10px] text-slate-400">Banner chỉ dẫn vuốt xoay, phóng to thu nhỏ</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showGestureHint}
                    onChange={(e) => setShowGestureHint(e.target.checked)}
                    className="w-4 h-4 accent-brand rounded cursor-pointer"
                  />
                </label>

                {/* 4. Target Name Badge Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-brand/20 text-brand flex items-center justify-center">
                      <span className="text-xs font-bold">Aa</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">Tên Target</span>
                      <span className="text-[10px] text-slate-400">Huy hiệu hiển thị tên target ở giữa trên</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showTargetName}
                    onChange={(e) => setShowTargetName(e.target.checked)}
                    className="w-4 h-4 accent-brand rounded cursor-pointer"
                  />
                </label>

                {/* 5. AR Shutter Button Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-brand/20 text-brand flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">Nút chụp ảnh AR</span>
                      <span className="text-[10px] text-slate-400">Cho phép người dùng chụp lại trải nghiệm</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableCapture}
                    onChange={(e) => setEnableCapture(e.target.checked)}
                    className="w-4 h-4 accent-brand rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Bottom Confirm Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-brand hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-brand/20 transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Hoàn tất & Áp dụng cấu hình</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
