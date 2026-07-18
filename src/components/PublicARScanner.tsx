import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ARTarget, AppSettings } from '../types';
import { getDefaultSettingsFromSupabase } from '../lib/data';
import ARScanner from './ARScanner';
import { Loader2 } from 'lucide-react';

export default function PublicARScanner() {
  const [target, setTarget] = useState<ARTarget | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pathParts = window.location.pathname.split('/');
        const targetId = new URLSearchParams(window.location.search).get('ar');

        if (!targetId) {
          throw new Error("Không tìm thấy ID target.");
        }

        const [settingsData, { data: targetData, error: targetError }] = await Promise.all([
          getDefaultSettingsFromSupabase(),
          supabase.from('ar_targets').select('*').eq('id', targetId).single()
        ]);

        if (targetError) throw targetError;
        if (!targetData) throw new Error("Target không tồn tại.");
        if (!targetData.active) throw new Error("Target này đang bị tắt.");

        setSettings(settingsData);
        setTarget(targetData as ARTarget);
      } catch (err: any) {
        console.error("Lỗi tải public AR:", err);
        setError(err.message || "Lỗi khi tải trải nghiệm AR");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-brand mb-4" />
        <p className="text-sm font-semibold text-slate-300">Đang tải trải nghiệm AR...</p>
      </div>
    );
  }

  if (error || !target) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl font-bold">!</span>
        </div>
        <p className="text-xl font-bold text-rose-500 mb-2">Không thể tải</p>
        <p className="text-slate-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-black z-50">
      {settings?.webAppIcon && (
        <div className="absolute top-6 left-6 z-[70] bg-black/40 p-2 rounded-xl backdrop-blur-md border border-white/10">
          <img src={settings.webAppIcon} alt="Logo" className="h-8 object-contain" />
        </div>
      )}
      <ARScanner target={target} onClose={() => { window.location.href = '/'; }} />
    </div>
  );
}
