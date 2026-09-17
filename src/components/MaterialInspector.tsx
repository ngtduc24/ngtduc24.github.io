import React from 'react';
import {
  Sparkles, RefreshCcw, Upload, X, Image as ImageIcon,
  Sliders, Eye, Layers, Palette, Droplets, Sun, Box
} from 'lucide-react';
import { PBRMaterialConfig } from '../types';
import { DEFAULT_PBR_MATERIAL } from '../lib/pbrMaterialHelper';

interface MaterialInspectorProps {
  material: PBRMaterialConfig;
  onChange: (updated: PBRMaterialConfig) => void;
  onReset: () => void;
  targetName?: string;
}

// Mini subcomponent for texture map upload / url input
interface TextureChannelProps {
  label: string;
  description: string;
  value?: string;
  onChange: (url: string) => void;
}

function TextureChannel({ label, description, value, onChange }: TextureChannelProps) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5 p-2 rounded-lg bg-black/30 border border-white/5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-300">{label}</span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5"
            title="Gỡ bỏ texture"
          >
            <X className="w-3 h-3" /> Gỡ Map
          </button>
        ) : (
          <span className="text-[10px] text-slate-500">Chưa gắn</span>
        )}
      </div>
      <p className="text-[10px] text-slate-400">{description}</p>

      {value ? (
        <div className="flex items-center gap-2 pt-1">
          <div className="w-10 h-10 rounded border border-white/20 bg-black/60 overflow-hidden shrink-0">
            <img src={value} alt="Texture preview" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 truncate">
            <span className="text-[10px] text-emerald-400 font-medium block truncate">Đã gắn Texture Map</span>
            <input
              type="text"
              value={value.startsWith('data:') ? '(Ảnh tải từ máy tính)' : value}
              disabled={value.startsWith('data:')}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Hoặc dán URL ảnh..."
              className="w-full mt-0.5 text-[10px] bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-slate-300 font-mono focus:border-brand focus:outline-none truncate"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 pt-1">
          <label className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-medium text-slate-300 hover:text-white cursor-pointer transition">
            <Upload className="w-3 h-3 text-brand" /> Tải ảnh lên
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </label>
          <input
            type="text"
            placeholder="Hoặc dán URL..."
            onBlur={(e) => {
              if (e.target.value.trim()) onChange(e.target.value.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                onChange(e.currentTarget.value.trim());
              }
            }}
            className="flex-1 text-[10px] bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-300 placeholder-slate-500 font-mono focus:border-brand focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

export default function MaterialInspector({
  material,
  onChange,
  onReset,
  targetName = 'Mô hình 3D'
}: MaterialInspectorProps) {
  const updateProp = <K extends keyof PBRMaterialConfig>(key: K, val: PBRMaterialConfig[K]) => {
    onChange({
      ...material,
      [key]: val,
    });
  };

  const baseColor = material.baseColor || DEFAULT_PBR_MATERIAL.baseColor || '#ffffff';
  const roughness = typeof material.roughness === 'number' ? material.roughness : DEFAULT_PBR_MATERIAL.roughness ?? 0.4;
  const metalness = typeof material.metalness === 'number' ? material.metalness : DEFAULT_PBR_MATERIAL.metalness ?? 0.1;
  const specular = typeof material.specular === 'number' ? material.specular : DEFAULT_PBR_MATERIAL.specular ?? 0.5;
  const normalScale = typeof material.normalScale === 'number' ? material.normalScale : DEFAULT_PBR_MATERIAL.normalScale ?? 1.0;
  const displacementScale = typeof material.displacementScale === 'number' ? material.displacementScale : DEFAULT_PBR_MATERIAL.displacementScale ?? 0.05;
  const aoIntensity = typeof material.aoMapIntensity === 'number' ? material.aoMapIntensity : DEFAULT_PBR_MATERIAL.aoMapIntensity ?? 1.0;
  const emissive = material.emissive || DEFAULT_PBR_MATERIAL.emissive || '#000000';
  const emissiveIntensity = typeof material.emissiveIntensity === 'number' ? material.emissiveIntensity : DEFAULT_PBR_MATERIAL.emissiveIntensity ?? 1.0;
  const opacity = typeof material.opacity === 'number' ? material.opacity : DEFAULT_PBR_MATERIAL.opacity ?? 1.0;
  const transmission = typeof material.transmission === 'number' ? material.transmission : DEFAULT_PBR_MATERIAL.transmission ?? 0.0;
  const ior = typeof material.ior === 'number' ? material.ior : DEFAULT_PBR_MATERIAL.ior ?? 1.5;

  return (
    <div className="space-y-4 text-slate-200 text-xs">
      {/* Header with target name and Reset */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
          <Palette className="w-3.5 h-3.5 text-brand" />
          <span>Vật liệu PBR: {targetName}</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition"
          title="Đặt lại tất cả kênh chất liệu về chuẩn mặc định"
        >
          <RefreshCcw className="w-3 h-3" /> Mặc định
        </button>
      </div>

      {/* 1. Base Color (Albedo / Diffuse) */}
      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            1. Base Color (Albedo / Diffuse)
          </span>
          <span className="font-mono text-[11px] text-slate-400">{baseColor.toUpperCase()}</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Màu sắc gốc của bề mặt khi loại bỏ hoàn toàn ánh sáng và bóng phản chiếu.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={baseColor}
            onChange={(e) => updateProp('baseColor', e.target.value)}
            className="w-9 h-8 rounded border border-white/20 bg-black/40 cursor-pointer"
          />
          <input
            type="text"
            value={baseColor}
            onChange={(e) => updateProp('baseColor', e.target.value)}
            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:border-brand focus:outline-none"
          />
        </div>
        <TextureChannel
          label="Base Color Map"
          description="Gắn ảnh Texture Map màu sắc chi tiết bề mặt"
          value={material.baseColorMap}
          onChange={(val) => updateProp('baseColorMap', val)}
        />
      </div>

      {/* 2. Roughness (Độ nhám) */}
      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            2. Roughness (Độ nhám)
          </span>
          <span className="font-mono text-amber-400 font-bold">{roughness.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Bề mặt thô ráp (1.0: mờ/tán xạ) hoặc nhẵn bóng (0.0: gương sắc nét).
        </p>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={roughness}
            onChange={(e) => updateProp('roughness', parseFloat(e.target.value))}
            className="flex-1 accent-amber-400 h-1.5 bg-white/10 rounded cursor-pointer"
          />
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={roughness}
            onChange={(e) => updateProp('roughness', parseFloat(e.target.value) || 0)}
            className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
          />
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => updateProp('roughness', 0.05)}
            className="py-0.5 text-[9px] rounded bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Bóng gương (0.05)
          </button>
          <button
            type="button"
            onClick={() => updateProp('roughness', 0.4)}
            className="py-0.5 text-[9px] rounded bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Nhựa/Sơn (0.4)
          </button>
          <button
            type="button"
            onClick={() => updateProp('roughness', 0.9)}
            className="py-0.5 text-[9px] rounded bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Nhám mờ (0.9)
          </button>
        </div>
        <TextureChannel
          label="Roughness Map"
          description="Texture trắng đen điều khiển độ nhám từng vùng"
          value={material.roughnessMap}
          onChange={(val) => updateProp('roughnessMap', val)}
        />
      </div>

      {/* 3. Metallic (Độ kim loại) */}
      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            3. Metallic (Độ kim loại)
          </span>
          <span className="font-mono text-cyan-400 font-bold">{metalness.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-slate-400">
          0.0: Phi kim / Điện môi (nhựa, gỗ, đá) | 1.0: Kim loại nguyên chất (đồng, bạc, vàng).
        </p>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={metalness}
            onChange={(e) => updateProp('metalness', parseFloat(e.target.value))}
            className="flex-1 accent-cyan-400 h-1.5 bg-white/10 rounded cursor-pointer"
          />
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={metalness}
            onChange={(e) => updateProp('metalness', parseFloat(e.target.value) || 0)}
            className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
          />
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => updateProp('metalness', 0.0)}
            className="py-0.5 text-[9px] rounded bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Phi kim (0.0)
          </button>
          <button
            type="button"
            onClick={() => updateProp('metalness', 0.5)}
            className="py-0.5 text-[9px] rounded bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Bán kim (0.5)
          </button>
          <button
            type="button"
            onClick={() => updateProp('metalness', 1.0)}
            className="py-0.5 text-[9px] rounded bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Kim loại (1.0)
          </button>
        </div>
        <TextureChannel
          label="Metallic Map"
          description="Texture trắng đen phân định vùng kim loại"
          value={material.metalnessMap}
          onChange={(val) => updateProp('metalnessMap', val)}
        />
      </div>

      {/* 4. Specular (Độ phản xạ phi kim) */}
      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
            4. Specular
          </span>
          <span className="font-mono text-violet-400 font-bold">{specular.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Cường độ phản xạ ánh sáng của các vật liệu phi kim.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={specular}
            onChange={(e) => updateProp('specular', parseFloat(e.target.value))}
            className="flex-1 accent-violet-400 h-1.5 bg-white/10 rounded cursor-pointer"
          />
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={specular}
            onChange={(e) => updateProp('specular', parseFloat(e.target.value) || 0)}
            className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
          />
        </div>
        <TextureChannel
          label="Specular Map"
          description="Điều chỉnh độ phản xạ cục bộ theo từng vị trí"
          value={material.specularMap}
          onChange={(val) => updateProp('specularMap', val)}
        />
      </div>

      {/* 5. Normal Map / Bump Map */}
      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            5. Normal Map / Bump Map
          </span>
          <span className="font-mono text-indigo-400 font-bold">{normalScale.toFixed(2)}x</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Bẻ cong hướng ánh sáng để tạo cảm giác lồi lõm chi tiết giả mà không tăng số lượng đa giác.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">Cường độ (Scale):</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={normalScale}
            onChange={(e) => updateProp('normalScale', parseFloat(e.target.value))}
            className="flex-1 accent-indigo-400 h-1.5 bg-white/10 rounded cursor-pointer"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={normalScale}
            onChange={(e) => updateProp('normalScale', parseFloat(e.target.value) || 1)}
            className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
          />
        </div>
        <TextureChannel
          label="Normal Map (Ảnh pháp tuyến tím/xanh)"
          description="Gắn file Normal map (RGB) để tạo chi tiết gân, rãnh, hoa văn"
          value={material.normalMap}
          onChange={(val) => updateProp('normalMap', val)}
        />
      </div>

      {/* 6. Displacement (Height Map) */}
      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            6. Displacement (Height Map)
          </span>
          <span className="font-mono text-emerald-400 font-bold">{displacementScale.toFixed(3)}</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Đẩy trực tiếp các đỉnh (vertex) trồi lên hoặc lõm xuống tạo chi tiết lồi lõm thực tế.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">Độ cao:</span>
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.005"
            value={displacementScale}
            onChange={(e) => updateProp('displacementScale', parseFloat(e.target.value))}
            className="flex-1 accent-emerald-400 h-1.5 bg-white/10 rounded cursor-pointer"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            max="0.5"
            value={displacementScale}
            onChange={(e) => updateProp('displacementScale', parseFloat(e.target.value) || 0)}
            className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
          />
        </div>
        <TextureChannel
          label="Displacement Map (Height)"
          description="Texture trắng đen đẩy khối 3D thực tế"
          value={material.displacementMap}
          onChange={(val) => updateProp('displacementMap', val)}
        />
      </div>

      {/* 7. Ambient Occlusion (AO) */}
      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
            7. Ambient Occlusion (AO)
          </span>
          <span className="font-mono text-zinc-300 font-bold">{aoIntensity.toFixed(2)}x</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Tạo vùng tối giả ở những khe hở, nếp gấp hoặc góc khuất ánh sáng môi trường.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">Cường độ AO:</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={aoIntensity}
            onChange={(e) => updateProp('aoMapIntensity', parseFloat(e.target.value))}
            className="flex-1 accent-zinc-400 h-1.5 bg-white/10 rounded cursor-pointer"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={aoIntensity}
            onChange={(e) => updateProp('aoMapIntensity', parseFloat(e.target.value) || 1)}
            className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
          />
        </div>
        <TextureChannel
          label="AO Map"
          description="Gắn ảnh Ambient Occlusion tạo bóng đổ chiều sâu"
          value={material.aoMap}
          onChange={(val) => updateProp('aoMap', val)}
        />
      </div>

      {/* 8. Emission (Emissive - Tự phát sáng) */}
      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-300 animate-pulse" />
            8. Emission (Tự phát sáng)
          </span>
          <span className="font-mono text-yellow-300 font-bold">{emissiveIntensity.toFixed(1)}x</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Làm vật liệu tự phát ra ánh sáng (cho đèn neon, màn hình hiển thị, viên ngọc).
        </p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={emissive}
            onChange={(e) => updateProp('emissive', e.target.value)}
            className="w-8 h-7 rounded border border-white/20 bg-black/40 cursor-pointer"
          />
          <input
            type="text"
            value={emissive}
            onChange={(e) => updateProp('emissive', e.target.value)}
            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:border-yellow-400 focus:outline-none"
          />
          <input
            type="number"
            step="0.2"
            min="0"
            max="5"
            value={emissiveIntensity}
            onChange={(e) => updateProp('emissiveIntensity', parseFloat(e.target.value) || 0)}
            className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
            title="Cường độ phát sáng"
          />
        </div>
        <TextureChannel
          label="Emissive Map"
          description="Chỉ định vùng phát sáng cụ thể trên mô hình"
          value={material.emissiveMap}
          onChange={(val) => updateProp('emissiveMap', val)}
        />
      </div>

      {/* 9. Opacity (Alpha - Trong suốt) */}
      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            9. Opacity (Alpha / Độ trong suốt)
          </span>
          <span className="font-mono text-slate-300 font-bold">{opacity.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Độ đục hoặc cắt bỏ phần thừa (mask) trên bề mặt phẳng.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => updateProp('opacity', parseFloat(e.target.value))}
            className="flex-1 accent-slate-300 h-1.5 bg-white/10 rounded cursor-pointer"
          />
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={opacity}
            onChange={(e) => updateProp('opacity', parseFloat(e.target.value) || 1)}
            className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
          />
        </div>
        <TextureChannel
          label="Alpha Map (Cutout mask)"
          description="Mask đen trắng để khoét lổ/tạo viền trong suốt"
          value={material.alphaMap}
          onChange={(val) => updateProp('alphaMap', val)}
        />
      </div>

      {/* 10. Transmission & IOR (Kính & Chiết suất khúc xạ) */}
      <div className="space-y-2.5 p-2.5 rounded-xl bg-gradient-to-br from-blue-950/40 to-slate-900/60 border border-blue-500/20">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs flex items-center gap-1.5 text-blue-300">
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            10. Transmission & IOR (Thủy tinh / Khúc xạ)
          </span>
          <span className="font-mono text-blue-300 font-bold">IOR {ior.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Độ truyền sáng xuyên thấu (cho kính, nước, đá quý) kết hợp chỉ số khúc xạ bẻ cong tia sáng (IOR).
        </p>

        {/* Transmission */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-300">
            <span>Độ truyền sáng (Transmission):</span>
            <span className="font-mono text-blue-400">{transmission.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={transmission}
            onChange={(e) => updateProp('transmission', parseFloat(e.target.value))}
            className="w-full accent-blue-400 h-1.5 bg-white/10 rounded cursor-pointer"
          />
        </div>

        {/* IOR */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[10px] text-slate-300">
            <span>Chỉ số khúc xạ (IOR):</span>
            <span className="font-mono text-cyan-300">{ior.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.02"
            value={ior}
            onChange={(e) => updateProp('ior', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded cursor-pointer"
          />
        </div>

        {/* Quick IOR presets */}
        <div className="grid grid-cols-4 gap-1 pt-1">
          <button
            type="button"
            onClick={() => {
              updateProp('transmission', 0.9);
              updateProp('ior', 1.0);
            }}
            className="py-1 text-[9px] rounded bg-white/5 hover:bg-white/10 text-slate-300 text-center"
          >
            Không khí (1.0)
          </button>
          <button
            type="button"
            onClick={() => {
              updateProp('transmission', 0.85);
              updateProp('ior', 1.33);
            }}
            className="py-1 text-[9px] rounded bg-white/5 hover:bg-white/10 text-slate-300 text-center"
          >
            Nước (1.33)
          </button>
          <button
            type="button"
            onClick={() => {
              updateProp('transmission', 0.95);
              updateProp('ior', 1.5);
            }}
            className="py-1 text-[9px] rounded bg-white/5 hover:bg-white/10 text-slate-300 text-center"
          >
            Kính (1.5)
          </button>
          <button
            type="button"
            onClick={() => {
              updateProp('transmission', 0.9);
              updateProp('ior', 2.42);
            }}
            className="py-1 text-[9px] rounded bg-white/5 hover:bg-white/10 text-slate-300 text-center"
          >
            Kim cương (2.42)
          </button>
        </div>
      </div>
    </div>
  );
}
