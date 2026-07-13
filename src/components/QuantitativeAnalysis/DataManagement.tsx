import React, { useState, useRef } from 'react';
import { Table, ListChecks, Upload, Plus, Trash2, Settings2, X, Download, Loader2 } from 'lucide-react';
import { useQuantitative, MeasureType, Variable, DataRow } from './QuantitativeContext';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function DataManagement() {
  const { variables, setVariables, addVariable, removeVariable, updateVariable, data, addDataRow, updateData, dataView, setDataView, setData } = useQuantitative();
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingValues, setEditingValues] = useState<Variable | null>(null);
  const [newValueKey, setNewValueKey] = useState('');
  const [newValueLabel, setNewValueLabel] = useState('');
  const [importProgress, setImportProgress] = useState<{ current: number, total: number, message?: string } | null>(null);

  const loadSampleData = () => {
    // ... (sample data generation code unchanged)
    const sampleVars: Variable[] = [
      { id: 'v1', name: 'GENDER', label: 'Giới tính', type: 'Numeric', measure: 'Nominal', values: { '1': 'Nam', '2': 'Nữ' }, missing: [] },
      { id: 'v2', name: 'AGE', label: 'Độ tuổi', type: 'Numeric', measure: 'Ordinal', values: { '1': 'Dưới 18', '2': '18-25', '3': '26-35', '4': 'Trên 35' }, missing: [] },
      { id: 'v3', name: 'Q1', label: 'Sản phẩm đa dạng', type: 'Numeric', measure: 'Scale', values: { '1': 'Rất không đồng ý', '2': 'Không đồng ý', '3': 'Bình thường', '4': 'Đồng ý', '5': 'Rất đồng ý' }, missing: [] },
      { id: 'v4', name: 'Q2', label: 'Chất lượng sản phẩm tốt', type: 'Numeric', measure: 'Scale', values: { '1': 'Rất không đồng ý', '2': 'Không đồng ý', '3': 'Bình thường', '4': 'Đồng ý', '5': 'Rất đồng ý' }, missing: [] },
      { id: 'v5', name: 'Q3', label: 'Giá cả hợp lý', type: 'Numeric', measure: 'Scale', values: { '1': 'Rất không đồng ý', '2': 'Không đồng ý', '3': 'Bình thường', '4': 'Đồng ý', '5': 'Rất đồng ý' }, missing: [] },
      { id: 'v6', name: 'SAT1', label: 'Tôi hài lòng với sản phẩm', type: 'Numeric', measure: 'Scale', values: { '1': 'Rất không đồng ý', '2': 'Không đồng ý', '3': 'Bình thường', '4': 'Đồng ý', '5': 'Rất đồng ý' }, missing: [] },
      { id: 'v7', name: 'SAT2', label: 'Tôi sẽ quay lại mua', type: 'Numeric', measure: 'Scale', values: { '1': 'Rất không đồng ý', '2': 'Không đồng ý', '3': 'Bình thường', '4': 'Đồng ý', '5': 'Rất đồng ý' }, missing: [] },
    ];

    const generateRandomRow = (id: number): DataRow => {
      // Simulate somewhat correlated data for Likert scales
      const baseQ = Math.floor(Math.random() * 3) + 2; // 2 to 4
      const baseSat = Math.min(5, Math.max(1, baseQ + Math.floor(Math.random() * 3) - 1)); // slightly correlated

      return {
        id: `row-${id}`,
        GENDER: Math.random() > 0.4 ? '1' : '2',
        AGE: Math.floor(Math.random() * 4) + 1,
        Q1: Math.min(5, Math.max(1, baseQ + Math.floor(Math.random() * 3) - 1)),
        Q2: Math.min(5, Math.max(1, baseQ + Math.floor(Math.random() * 3) - 1)),
        Q3: Math.min(5, Math.max(1, baseQ + Math.floor(Math.random() * 3) - 1)),
        SAT1: Math.min(5, Math.max(1, baseSat + Math.floor(Math.random() * 2) - 1)),
        SAT2: Math.min(5, Math.max(1, baseSat + Math.floor(Math.random() * 2) - 1)),
      };
    };

    const sampleData: DataRow[] = Array.from({ length: 50 }, (_, i) => generateRandomRow(i));

    setVariables(sampleVars);
    setData(sampleData);
    setDataView('data-view');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processData(results.data as Record<string, string>[]);
        },
        error: (error) => {
          addNotification("Lỗi khi đọc file CSV: " + error.message, "error");
        }
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        if (data) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          await processData(json as Record<string, string>[]);
        }
      };
      reader.onerror = (error) => {
         addNotification("Lỗi khi đọc file Excel: " + error, "error");
      }
      reader.readAsBinaryString(file);
    } else {
      addNotification("Vui lòng chọn file CSV hoặc Excel (.xlsx, .xls)", "error");
    }
  };

  const processData = async (rows: Record<string, string | number>[]) => {
    if (rows.length === 0) return;
        
    const totalRows = rows.length;
    const headers = Object.keys(rows[0]);
    
    const newVariables: Variable[] = headers.map((header, idx) => ({
      id: Date.now().toString() + idx,
      name: header,
      label: '',
      type: 'Numeric',
      measure: 'Scale',
      values: {},
      missing: []
    }));
    
    setImportProgress({ current: 0, total: totalRows, message: 'Đang xử lý dữ liệu...' });
    
    const newData = [];
    const CHUNK_SIZE = 50;
    
    for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      
      const processedChunk = chunk.map((row, idx) => {
        const newRow: any = { id: Date.now().toString() + 'row' + (i + idx) };
        headers.forEach(h => {
           newRow[h] = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
        });
        return newRow;
      });
      
      newData.push(...processedChunk);
      
      setImportProgress({ current: Math.min(i + CHUNK_SIZE, totalRows), total: totalRows, message: `Đang xử lý dòng ${Math.min(i + CHUNK_SIZE, totalRows)}/${totalRows}...` });
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    setVariables(newVariables);
    setData(newData);
    setDataView('data-view');
    setImportProgress(null);
    addNotification(`Đã import thành công ${newData.length} dòng dữ liệu với ${headers.length} biến.`, "success");
  };
  
  // ... rest of component

  const addValueLabel = () => {
    if (!editingValues || !newValueKey || !newValueLabel) return;
    updateVariable(editingValues.id, {
      values: { ...editingValues.values, [newValueKey]: newValueLabel }
    });
    setEditingValues({ ...editingValues, values: { ...editingValues.values, [newValueKey]: newValueLabel } });
    setNewValueKey('');
    setNewValueLabel('');
  };

  const removeValueLabel = (key: string) => {
    if (!editingValues) return;
    const newValues = { ...editingValues.values };
    delete newValues[key];
    updateVariable(editingValues.id, { values: newValues });
    setEditingValues({ ...editingValues, values: newValues });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setDataView('data-view')}
            className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${dataView === 'data-view' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Table className="w-4 h-4" /> Data View
          </button>
          <button 
            onClick={() => setDataView('variable-view')}
            className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${dataView === 'variable-view' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ListChecks className="w-4 h-4" /> Variable View
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadSampleData}
            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border border-emerald-200"
          >
            <Download className="w-4 h-4" /> Dữ liệu mẫu (Sample)
          </button>
          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
            <Upload className="w-4 h-4" /> Import Data (CSV/Excel)
            <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Progress Bar (if importing) */}
        {importProgress && (
          <div className="p-4 border-b border-slate-200">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>{importProgress.message || 'Đang xử lý...'}</span>
                <span className="text-emerald-600">
                  {importProgress.total > 0 
                    ? `${Math.round((importProgress.current / importProgress.total) * 100)}% (${importProgress.current}/${importProgress.total})` 
                    : 'Vui lòng đợi...'}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: importProgress.total > 0 ? `${(importProgress.current / importProgress.total) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {dataView === 'variable-view' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Label</th>
                  <th className="px-4 py-3 font-semibold">Values</th>
                  <th className="px-4 py-3 font-semibold">Missing</th>
                  <th className="px-4 py-3 font-semibold">Measure</th>
                  <th className="px-4 py-3 font-semibold w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variables.map((v, index) => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={v.name} 
                        onChange={(e) => updateVariable(v.id, { name: e.target.value })}
                        className="w-full bg-transparent border-none focus:ring-0 p-1 text-slate-800 font-medium"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select 
                        value={v.type}
                        onChange={(e) => updateVariable(v.id, { type: e.target.value as 'Numeric' | 'String' })}
                        className="bg-transparent border-slate-200 rounded text-slate-700 focus:ring-emerald-500 focus:border-emerald-500 py-1"
                      >
                        <option value="Numeric">Numeric</option>
                        <option value="String">String</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={v.label} 
                        onChange={(e) => updateVariable(v.id, { label: e.target.value })}
                        placeholder="Mô tả biến..."
                        className="w-full bg-transparent border-none focus:ring-0 p-1 text-slate-700"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button 
                        onClick={() => setEditingValues(v)}
                        className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                      >
                        <Settings2 className="w-3 h-3" />
                        {Object.keys(v.values).length > 0 ? `${Object.keys(v.values).length} Labels` : 'Define Values'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">
                      {v.missing.length > 0 ? v.missing.join(', ') : 'None'}
                    </td>
                    <td className="px-4 py-2">
                      <select 
                        value={v.measure}
                        onChange={(e) => updateVariable(v.id, { measure: e.target.value as MeasureType })}
                        className="bg-transparent border-slate-200 rounded text-slate-700 focus:ring-emerald-500 focus:border-emerald-500 py-1"
                      >
                        <option value="Scale">Scale</option>
                        <option value="Ordinal">Ordinal</option>
                        <option value="Nominal">Nominal</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeVariable(v.id)} className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={7} className="px-4 py-3 bg-slate-50/50">
                    <button onClick={addVariable} className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Thêm biến mới
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 whitespace-nowrap">
                <tr>
                  <th className="px-4 py-2 font-medium border-r border-slate-200 bg-slate-100 w-12 text-center text-xs">#</th>
                  {variables.map(v => (
                    <th key={v.id} className="px-4 py-2 font-semibold border-r border-slate-200 min-w-[100px]">
                      {v.name}
                    </th>
                  ))}
                  <th className="px-4 py-2 bg-slate-50 min-w-[100px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 border-r border-slate-200 bg-slate-50 text-slate-500 text-center text-xs font-mono">
                      {index + 1}
                    </td>
                    {variables.map(v => (
                      <td key={v.id} className="px-0 py-0 border-r border-slate-200">
                        <input
                          type={v.type === 'Numeric' ? 'number' : 'text'}
                          value={row[v.name] || ''}
                          onChange={(e) => updateData(row.id, v.name, e.target.value)}
                          className="w-full h-full bg-transparent border-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset p-2 text-slate-800"
                        />
                      </td>
                    ))}
                    <td></td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2 border-r border-slate-200 bg-slate-50 text-center">
                    <button onClick={addDataRow} className="text-emerald-600 hover:text-emerald-700 p-1 rounded-md hover:bg-emerald-100">
                      <Plus className="w-4 h-4" />
                    </button>
                  </td>
                  <td colSpan={variables.length + 1} className="p-0"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Value Label Editor Modal */}
      {editingValues && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-fadeIn overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">Value Labels</h3>
                <p className="text-xs text-slate-500">Định nghĩa nhãn cho biến: <strong className="text-emerald-600">{editingValues.name}</strong></p>
              </div>
              <button onClick={() => setEditingValues(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-2 items-end">
                <div className="w-1/3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Value (Giá trị)</label>
                  <input 
                    type="text" 
                    value={newValueKey}
                    onChange={e => setNewValueKey(e.target.value)}
                    placeholder="VD: 1" 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="w-2/3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Label (Nhãn)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newValueLabel}
                      onChange={e => setNewValueLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addValueLabel()}
                      placeholder="VD: Hoàn toàn không đồng ý" 
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <button 
                      onClick={addValueLabel}
                      disabled={!newValueKey || !newValueLabel}
                      className="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-200 disabled:opacity-50"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg max-h-[250px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-left w-1/4">Value</th>
                      <th className="px-4 py-2 font-semibold text-left">Label</th>
                      <th className="px-4 py-2 font-semibold w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(editingValues.values).length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Chưa có nhãn giá trị nào được định nghĩa.</td></tr>
                    ) : (
                      Object.entries(editingValues.values).map(([key, label]) => (
                        <tr key={key} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono text-slate-600">{key}</td>
                          <td className="px-4 py-2 text-slate-800">{label}</td>
                          <td className="px-4 py-2 text-center">
                            <button onClick={() => removeValueLabel(key)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50">
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
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setEditingValues(null)}
                className="bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-slate-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
