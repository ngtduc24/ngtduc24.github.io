import React, { useEffect, useState } from 'react';
import { Loader2, Globe } from 'lucide-react';
import VRViewer360 from './vr/VRViewer360';
import { getTourById, bumpTourView, VRTour } from '../lib/vr360';
import { setCustomPageSEO } from '../lib/seoConfig';

// Trang xem VR 360 công khai theo link ?vr=<id>. Không cần đăng nhập, mở được trên
// điện thoại để xoay theo cảm biến hoặc đặt vào kính VR.
export default function PublicVRViewer() {
  const [tour, setTour] = useState<VRTour | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('vr') || '';
    if (!id) { setError('Không tìm thấy mã không gian 360.'); return; }
    getTourById(id).then(t => {
      if (!t) { setError('Không gian 360 này không tồn tại.'); return; }
      if (t.is_active === false) { setError('Không gian 360 này đang được tắt.'); return; }
      setTour(t);
      setCustomPageSEO({ title: `${t.title} | VR 360`, description: t.description || 'Trải nghiệm không gian 360 độ trên trình duyệt, hỗ trợ kính VR.', canonicalUrl: window.location.href });
      bumpTourView(id);
    }).catch(e => setError(e?.message || 'Lỗi tải dữ liệu.'));
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/10"><Globe className="h-8 w-8 text-slate-300" /></div>
        <p className="text-sm font-semibold text-slate-200">{error}</p>
      </div>
    );
  }
  if (!tour) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="mt-3 text-xs font-semibold text-slate-400">Đang tải không gian 360...</p>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 bg-black">
      <VRViewer360 src={tour.image_url} title={tour.title} autoRotate />
    </div>
  );
}
