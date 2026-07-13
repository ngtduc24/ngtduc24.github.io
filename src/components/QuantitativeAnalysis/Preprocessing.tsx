import React, { useState } from 'react';
import { Calculator, Filter, Scissors, Settings2, X, Plus } from 'lucide-react';
import { useQuantitative } from './QuantitativeContext';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';

export default function Preprocessing() {
  const { variables, data, setVariables, setData, setDataView } = useQuantitative();
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Compute state
  const [newVarName, setNewVarName] = useState('');
  const [newVarLabel, setNewVarLabel] = useState('');
  const [formulaVars, setFormulaVars] = useState<string[]>([]);
  const [formulaOp, setFormulaOp] = useState<'MEAN' | 'SUM'>('MEAN');

  const handleCompute = () => {
    if (!newVarName) { addNotification("Vui lòng nhập tên biến mới.", "error"); return; }
    if (formulaVars.length === 0) { addNotification("Vui lòng chọn ít nhất một biến vào công thức.", "error"); return; }
    if (variables.some(v => v.name.toLowerCase() === newVarName.toLowerCase())) { addNotification("Tên biến đã tồn tại.", "error"); return; }

    const newId = Date.now().toString();
    const finalVarName = newVarName.toUpperCase().replace(/\s+/g, '_');
    
    const newVar: any = {
      id: newId,
      name: finalVarName,
      label: newVarLabel,
      type: 'Numeric',
      measure: 'Scale',
      values: {},
      missing: []
    };
    
    const newData = data.map(row => {
      const vals = formulaVars.map(vName => Number(row[vName])).filter(val => !isNaN(val));
      let res: any = '';
      if (vals.length > 0) {
        if (formulaOp === 'MEAN') {
          res = (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(3);
        } else if (formulaOp === 'SUM') {
          res = vals.reduce((a,b) => a+b, 0);
        }
      }
      return { ...row, [finalVarName]: res };
    });

    setVariables([...variables, newVar]);
    setData(newData);
    
    addNotification(`Đã tính toán thành công biến mới: ${finalVarName}`, "success");
    setActiveModal(null);
    setNewVarName('');
    setNewVarLabel('');
    setFormulaVars([]);
  };

  const Modal = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl animate-fadeIn overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group" onClick={() => setActiveModal('Compute')}>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl group-hover:scale-110 transition-transform">
            <Calculator className="w-6 h-6" />
          </div>
          <Settings2 className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Compute Variable</h3>
        <p className="text-sm text-slate-500 mt-2">
          Tạo biến đại diện (Nhân tố) bằng giá trị Mean/Sum từ các biến quan sát trong thang đo Likert.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer opacity-70" onClick={() => setActiveModal('Recode')}>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
            <Scissors className="w-6 h-6" />
          </div>
          <Settings2 className="w-5 h-5 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Recode</h3>
        <p className="text-sm text-slate-500 mt-2">
          Mã hóa lại các giá trị của một biến (VD: Đảo ngược thang đo 1-5 thành 5-1).
        </p>
      </div>

      {activeModal === 'Compute' && (
        <Modal title="Compute Variable (Tính toán biến mới)">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Target Variable (Tên biến mới)</label>
                  <input 
                    type="text" 
                    value={newVarName}
                    onChange={e => setNewVarName(e.target.value)}
                    placeholder="VD: SAT_MEAN" 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Target Label (Nhãn)</label>
                  <input 
                    type="text" 
                    value={newVarLabel}
                    onChange={e => setNewVarLabel(e.target.value)}
                    placeholder="VD: Nhân tố Sự hài lòng" 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Numeric Expression (Công thức)</label>
                
                <div className="flex gap-4">
                  <div className="w-1/3 border border-slate-200 bg-white rounded-lg p-2 h-48 overflow-y-auto">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Biến gốc</p>
                    {variables.map(v => (
                      <button 
                        key={v.id}
                        onClick={() => {
                          if (!formulaVars.includes(v.name)) setFormulaVars([...formulaVars, v.name])
                        }}
                        className="w-full text-left p-1.5 text-sm hover:bg-blue-50 rounded flex justify-between items-center group"
                      >
                        <span className="font-semibold text-slate-700">{v.name}</span>
                        <Plus className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                  
                  <div className="w-2/3 flex flex-col">
                    <div className="flex gap-2 mb-2">
                      <select 
                        value={formulaOp}
                        onChange={(e) => setFormulaOp(e.target.value as any)}
                        className="border border-slate-200 rounded-lg p-1.5 text-sm font-bold text-blue-700 bg-blue-50"
                      >
                        <option value="MEAN">Trị Trung Bình (MEAN)</option>
                        <option value="SUM">Tính Tổng (SUM)</option>
                      </select>
                    </div>
                    
                    <div className="flex-1 border border-slate-200 bg-white rounded-lg p-4 font-mono text-slate-800 text-sm flex flex-wrap content-start gap-1">
                      <span className="text-blue-600 font-bold">{formulaOp}(</span>
                      {formulaVars.map((v, i) => (
                        <React.Fragment key={v}>
                          <span className="bg-slate-100 px-1 rounded border border-slate-200 flex items-center gap-1">
                            {v}
                            <X 
                              className="w-3 h-3 text-red-400 cursor-pointer hover:text-red-600" 
                              onClick={() => setFormulaVars(formulaVars.filter(fv => fv !== v))}
                            />
                          </span>
                          {i < formulaVars.length - 1 && <span>, </span>}
                        </React.Fragment>
                      ))}
                      <span className="text-blue-600 font-bold">)</span>
                    </div>
                    {formulaVars.length === 0 && <p className="text-xs text-red-500 mt-2">Vui lòng click chọn biến từ danh sách bên trái.</p>}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button 
                  onClick={handleCompute}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                  Thực thi (OK)
                </button>
              </div>
            </div>
        </Modal>
      )}
      
      {activeModal === 'Recode' && (
        <Modal title="Recode (Mã hóa lại)">
            <p className="text-sm text-slate-600">Giao diện cấu hình mã hóa lại giá trị (đang phát triển)...</p>
        </Modal>
      )}
    </div>
  );
}
