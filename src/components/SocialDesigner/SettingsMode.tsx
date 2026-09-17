import React, { useState, useEffect } from 'react';
import { UserAccount, SocialTemplate } from '../../types';
import { db } from '../../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Layers } from 'lucide-react';
import MediaSourcePicker from '../MediaSourcePicker';
import { useConfirmation } from '../ConfirmationContext';

interface SettingsModeProps {
  currentUser: UserAccount;
}

export default function SettingsMode({ currentUser }: SettingsModeProps) {
  const { confirm } = useConfirmation();
  const [templates, setTemplates] = useState<SocialTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Template Form
  const [tplName, setTplName] = useState('');
  const [tplWidth, setTplWidth] = useState<number>(1080);
  const [tplHeight, setTplHeight] = useState<number>(1080);
  const [bgImage, setBgImage] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const snapTpls = await getDocs(collection(db, 'social_templates'));
      const tpls: SocialTemplate[] = [];
      snapTpls.forEach(doc => tpls.push({ id: doc.id, ...doc.data() } as SocialTemplate));
      setTemplates(tpls);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || !tplWidth || !tplHeight) return;

    try {
      const newTemplate: Omit<SocialTemplate, 'id'> = {
        name: tplName.trim(),
        isSystem: true,
        width: tplWidth,
        height: tplHeight,
        bgImage: bgImage,
        layers: [
          {
            id: 'img-main',
            type: 'image',
            name: 'Ảnh chính',
            x: 0, y: 0, width: 100, height: 100,
            objectFit: 'cover',
            borderRadius: 0,
            zIndex: 10
          },
          {
            id: 'txt-title',
            type: 'text',
            name: 'Tiêu đề',
            x: 10, y: 65, width: 80, height: 15,
            fontSize: 64, 
            color: '#ffffff',
            fontWeight: 'bold',
            textAlign: 'left',
            maxLines: 2,
            zIndex: 20
          },
          {
            id: 'txt-desc',
            type: 'text',
            name: 'Mô tả',
            x: 10, y: 82, width: 80, height: 10,
            fontSize: 32,
            color: '#e2e8f0',
            fontWeight: 'normal',
            textAlign: 'left',
            maxLines: 3,
            zIndex: 20
          }
        ]
      };
      
      const docRef = await addDoc(collection(db, 'social_templates'), newTemplate);
      setTemplates([...templates, { id: docRef.id, ...newTemplate }]);
      setTplName('');
      setBgImage('');
    } catch (error) {
      console.error("Lỗi khi thêm khung mẫu:", error);
      alert("Đã xảy ra lỗi khi thêm khung mẫu.");
    }
  };

  const handleDeleteTemplate = async (id: string, name?: string) => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa Khung mẫu',
      message: `Bạn có chắc muốn xóa khung mẫu "${name || 'này'}"? Toàn bộ thiết lập các lớp của khung này sẽ bị xóa khỏi CSDL và không thể hoàn tác.`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'social_templates', id));
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-50">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Kho Khung Mẫu (Templates)
          </h2>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Thêm Khung Mẫu Mới</h3>
            <form onSubmit={handleAddTemplate} className="space-y-5">
              
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên Khung Mẫu</label>
                    <input 
                      type="text" 
                      value={tplName} onChange={e => setTplName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium"
                      placeholder="VD: FB Post Đục Lỗ"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rộng (px)</label>
                      <input 
                        type="number" 
                        value={tplWidth} onChange={e => setTplWidth(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cao (px)</label>
                      <input 
                        type="number" 
                        value={tplHeight} onChange={e => setTplHeight(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ảnh Khung (PNG trong suốt)</label>
                  {bgImage ? (
                     <div className="relative rounded-xl overflow-hidden border border-slate-200 h-40 bg-slate-100 flex items-center justify-center">
                       <img src={bgImage} alt="" className="h-full object-contain" />
                       <button type="button" onClick={() => setBgImage('')} className="absolute top-2 right-2 bg-slate-900/60 hover:bg-red-500 text-white rounded-full p-2 transition">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                      <MediaSourcePicker
                        onSelect={(url) => {
                          setBgImage(url);
                          const img = new Image();
                          img.onload = () => {
                            if (img.naturalWidth && img.naturalHeight) {
                              setTplWidth(img.naturalWidth);
                              setTplHeight(img.naturalHeight);
                            }
                          };
                          img.src = url;
                        }}
                        label="Tải ảnh Khung PNG lên"
                        resourceType="image"
                        category="Social Templates"
                        className="text-sm font-semibold px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:border-indigo-300 transition"
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 mt-2 italic">
                    * Khung ảnh nên là file định dạng PNG có phần rỗng ở giữa. Kích thước thật của ảnh nên khớp với Rộng x Cao đã cấu hình.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition">
                  <Plus className="w-4 h-4" /> Khởi tạo Khung Mẫu
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Tên Khung</th>
                  <th className="px-6 py-4">Kích thước (W x H)</th>
                  <th className="px-6 py-4">Số Lớp (Layers)</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-medium">Đang tải...</td></tr>
                ) : templates.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-medium">Chưa có khung mẫu nào được tạo.</td></tr>
                ) : (
                  templates.map(tpl => (
                    <tr key={tpl.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-bold flex items-center gap-3">
                        {tpl.bgImage && <img src={tpl.bgImage} className="w-8 h-8 rounded border border-slate-200 object-cover" />}
                        {tpl.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{tpl.width} × {tpl.height} px</td>
                      <td className="px-6 py-4 font-medium">{tpl.layers.length} Lớp</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteTemplate(tpl.id, tpl.name)} className="text-slate-400 hover:text-red-500 p-2 rounded hover:bg-red-50 transition" title="Xóa khung mẫu">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
