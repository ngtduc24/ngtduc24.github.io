import React from 'react';
import { Download, FileText, CheckCircle2, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { useQuantitative } from './QuantitativeContext';

export default function Results() {
  const { results } = useQuantitative();
  const [selectedResultId, setSelectedResultId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (results.length > 0 && !selectedResultId) {
      setSelectedResultId(results[0].id);
    }
  }, [results, selectedResultId]);

  const getModelName = (modelId: string) => {
    const names: Record<string, string> = {
      'frequencies': 'Frequencies',
      'descriptives': 'Descriptive Statistics',
      'reliability': 'Reliability Analysis',
      'ttest': 'Independent T-Test',
      'anova': 'One-Way ANOVA',
      'correlation': 'Bivariate Correlation',
      'regression': 'Linear Regression'
    };
    return names[modelId] || modelId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold text-slate-800">Kết quả Phân tích & Báo cáo</h3>
        <button className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors">
          <Download className="w-4 h-4" /> Export Report (PDF)
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="col-span-1 border-r border-slate-100 pr-4 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Output Log</p>
          
          {results.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Chưa có kết quả phân tích nào.</p>
          ) : (
            results.map((res, idx) => (
              <div 
                key={res.id} 
                onClick={() => setSelectedResultId(res.id)}
                className={`${selectedResultId === res.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'} p-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors truncate`}
              >
                {results.length - idx}. {getModelName(res.model)}
              </div>
            ))
          )}
        </div>

        {/* Output Viewer */}
        <div className="col-span-3 space-y-8">
          {results.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có kết quả phân tích.</p>
              <p className="text-sm">Vui lòng chuyển sang tab "Phân tích Thống kê" để chạy mô hình.</p>
            </div>
          ) : (
            results.filter(res => res.id === selectedResultId).map((res) => (
              <div key={res.id} className="space-y-6 animate-fadeIn">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      {getModelName(res.model)}
                    </h4>
                    <span className="text-xs text-slate-400">{new Date(res.timestamp).toLocaleTimeString()}</span>
                  </div>
                  
                  <div className="p-4">
                    <div className="mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-4">
                      <p><strong>Variables:</strong> {res.targetVars?.join(', ') || 'None'}</p>
                      {res.dependentVar && <p><strong>Dependent Variable:</strong> {res.dependentVar}</p>}
                    </div>
                    
                    {res.model === 'descriptives' && res.data?.descriptives && (
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2">Variable</th>
                              <th className="px-4 py-2 text-right">N</th>
                              <th className="px-4 py-2 text-right">Minimum</th>
                              <th className="px-4 py-2 text-right">Maximum</th>
                              <th className="px-4 py-2 text-right font-bold text-emerald-700">Mean</th>
                              <th className="px-4 py-2 text-right">Std. Deviation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {res.data.descriptives.map((d: any) => (
                              <tr key={d.variable} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium">
                                  {d.variable} <span className="text-xs font-normal text-slate-400 block">{d.label}</span>
                                </td>
                                <td className="px-4 py-2 text-right text-slate-600">{d.n}</td>
                                <td className="px-4 py-2 text-right text-slate-600">{d.min}</td>
                                <td className="px-4 py-2 text-right text-slate-600">{d.max}</td>
                                <td className="px-4 py-2 text-right font-bold">{d.mean}</td>
                                <td className="px-4 py-2 text-right text-slate-600">{d.stdDev}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {res.model === 'reliability' && res.data?.reliability && (
                      <div className="space-y-4">
                        {res.data.reliability.error ? (
                          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{res.data.reliability.error}</div>
                        ) : (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">Reliability Statistics</div>
                              <table className="w-full text-sm text-center">
                                <thead>
                                  <tr className="border-b border-slate-100">
                                    <th className="px-4 py-3 text-slate-500 font-medium">Cronbach's Alpha</th>
                                    <th className="px-4 py-3 text-slate-500 font-medium">N of Items</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="px-4 py-4 text-2xl font-bold text-emerald-600">{res.data.reliability.alpha}</td>
                                    <td className="px-4 py-4 text-lg text-slate-700">{res.data.reliability.k}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col justify-center">
                              <p className="text-sm text-slate-500 mb-1">Diễn giải tự động:</p>
                              <p className="font-semibold text-slate-800">
                                Hệ số Alpha đạt mức <span className="text-emerald-600 font-bold">{res.data.reliability.interpretation}</span>.
                              </p>
                              <p className="text-xs text-slate-500 mt-2">
                                (Thông thường Cronbach's Alpha {'>'} 0.7 được coi là thang đo có độ tin cậy tốt trong nghiên cứu khoa học xã hội).
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {res.model === 'correlation' && res.data?.correlation && (
                      <div className="space-y-4">
                        {res.data.correlation.error ? (
                          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{res.data.correlation.error}</div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">Correlations (Pearson)</div>
                            <table className="w-full text-sm text-center">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="px-4 py-2 text-left border-b border-r border-slate-200">Variable</th>
                                  {res.data.correlation.variables.map((v: string) => (
                                    <th key={v} className="px-4 py-2 border-b border-slate-200">{v}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {res.data.correlation.matrix.map((row: any) => (
                                  <tr key={row.variable} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-4 py-2 text-left font-semibold border-r border-slate-200 bg-slate-50">{row.variable}</td>
                                    {res.data.correlation.variables.map((v: string) => (
                                      <td key={v} className={`px-4 py-2 ${row[v] === '1.000' ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                                        {row[v]}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {res.model === 'frequencies' && res.data?.frequencies && (
                      <div className="space-y-6">
                        {res.data.frequencies.map((freqResult: any) => (
                           <div key={freqResult.variable} className="overflow-x-auto border border-slate-200 rounded-lg">
                             <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">
                               {freqResult.variable} <span className="text-xs font-normal text-slate-500 ml-2">{freqResult.label}</span>
                             </div>
                             <table className="w-full text-sm text-left">
                               <thead className="bg-white text-slate-600 border-b border-slate-200">
                                 <tr>
                                   <th className="px-4 py-2">Value</th>
                                   <th className="px-4 py-2">Frequency</th>
                                   <th className="px-4 py-2">Percent</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                 {freqResult.frequencies.map((f: any) => (
                                   <tr key={f.value} className="hover:bg-slate-50">
                                     <td className="px-4 py-2 font-medium">{f.label}</td>
                                     <td className="px-4 py-2 text-slate-700">{f.count}</td>
                                     <td className="px-4 py-2 text-slate-700">{f.percent}%</td>
                                   </tr>
                                 ))}
                                 <tr className="bg-slate-50 font-semibold text-slate-800">
                                   <td className="px-4 py-2">Total</td>
                                   <td className="px-4 py-2">{freqResult.n}</td>
                                   <td className="px-4 py-2">100.0%</td>
                                 </tr>
                               </tbody>
                             </table>
                           </div>
                        ))}
                      </div>
                    )}

                    {res.model === 'anova' && res.data?.anova && (
                      <div className="space-y-6">
                        {res.data.anova.results.map((anovaResult: any) => (
                           <div key={anovaResult.dependent} className="space-y-4">
                             <div className="font-semibold text-slate-700">Dependent Variable: {anovaResult.dependent} (Factor: {anovaResult.factor})</div>
                             {anovaResult.error ? (
                               <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{anovaResult.error}</div>
                             ) : (
                               <>
                                 <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                   <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">Descriptives</div>
                                   <table className="w-full text-sm text-center">
                                     <thead className="bg-white text-slate-600 border-b border-slate-200">
                                       <tr>
                                         <th className="px-4 py-2 text-left">Group</th>
                                         <th className="px-4 py-2">N</th>
                                         <th className="px-4 py-2">Mean</th>
                                         <th className="px-4 py-2">Std. Deviation</th>
                                       </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100">
                                       {anovaResult.descriptives.map((d: any) => (
                                         <tr key={d.group} className="hover:bg-slate-50">
                                           <td className="px-4 py-2 text-left font-medium">{d.group}</td>
                                           <td className="px-4 py-2 text-slate-700">{d.n}</td>
                                           <td className="px-4 py-2 text-slate-700">{d.mean}</td>
                                           <td className="px-4 py-2 text-slate-700">{d.stdDev}</td>
                                         </tr>
                                       ))}
                                     </tbody>
                                   </table>
                                 </div>
                                 <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                   <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">ANOVA</div>
                                   <table className="w-full text-sm text-center">
                                     <thead className="bg-white text-slate-600 border-b border-slate-200">
                                       <tr>
                                         <th className="px-4 py-2 text-left">Source</th>
                                         <th className="px-4 py-2">Sum of Squares</th>
                                         <th className="px-4 py-2">df</th>
                                         <th className="px-4 py-2">Mean Square</th>
                                         <th className="px-4 py-2">F</th>
                                         <th className="px-4 py-2">Sig. (p)</th>
                                       </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100">
                                       <tr className="hover:bg-slate-50">
                                         <td className="px-4 py-2 text-left font-medium">Between Groups</td>
                                         <td className="px-4 py-2 text-slate-700">{anovaResult.anova.ssBetween}</td>
                                         <td className="px-4 py-2 text-slate-700">{anovaResult.anova.dfBetween}</td>
                                         <td className="px-4 py-2 text-slate-700">{anovaResult.anova.msBetween}</td>
                                         <td className="px-4 py-2 text-slate-700">{anovaResult.anova.f}</td>
                                         <td className="px-4 py-2 text-slate-700">{anovaResult.anova.p}</td>
                                       </tr>
                                       <tr className="hover:bg-slate-50">
                                         <td className="px-4 py-2 text-left font-medium">Within Groups</td>
                                         <td className="px-4 py-2 text-slate-700">{anovaResult.anova.ssWithin}</td>
                                         <td className="px-4 py-2 text-slate-700">{anovaResult.anova.dfWithin}</td>
                                         <td className="px-4 py-2 text-slate-700">{anovaResult.anova.msWithin}</td>
                                         <td className="px-4 py-2"></td>
                                         <td className="px-4 py-2"></td>
                                       </tr>
                                     </tbody>
                                   </table>
                                 </div>
                               </>
                             )}
                           </div>
                        ))}
                      </div>
                    )}

                    {res.model === 'ttest' && res.data?.ttest && (
                      <div className="space-y-6">
                        {res.data.ttest.results.map((ttestResult: any) => (
                           <div key={ttestResult.dependent} className="space-y-4">
                             <div className="font-semibold text-slate-700">Dependent Variable: {ttestResult.dependent} (Grouping: {ttestResult.factor})</div>
                             {ttestResult.error ? (
                               <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{ttestResult.error}</div>
                             ) : (
                               <>
                                 <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                   <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">Group Statistics</div>
                                   <table className="w-full text-sm text-center">
                                     <thead className="bg-white text-slate-600 border-b border-slate-200">
                                       <tr>
                                         <th className="px-4 py-2 text-left">Group</th>
                                         <th className="px-4 py-2">N</th>
                                         <th className="px-4 py-2">Mean</th>
                                         <th className="px-4 py-2">Std. Deviation</th>
                                         <th className="px-4 py-2">Std. Error Mean</th>
                                       </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100">
                                       {ttestResult.descriptives.map((d: any) => (
                                         <tr key={d.group} className="hover:bg-slate-50">
                                           <td className="px-4 py-2 text-left font-medium">{d.group}</td>
                                           <td className="px-4 py-2 text-slate-700">{d.n}</td>
                                           <td className="px-4 py-2 text-slate-700">{d.mean}</td>
                                           <td className="px-4 py-2 text-slate-700">{d.stdDev}</td>
                                           <td className="px-4 py-2 text-slate-700">{d.stdError}</td>
                                         </tr>
                                       ))}
                                     </tbody>
                                   </table>
                                 </div>
                                 <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                   <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">Independent Samples Test</div>
                                   <table className="w-full text-sm text-center">
                                     <thead className="bg-white text-slate-600 border-b border-slate-200">
                                       <tr>
                                         <th className="px-4 py-2 text-left">Assumptions</th>
                                         <th className="px-4 py-2">t</th>
                                         <th className="px-4 py-2">df</th>
                                         <th className="px-4 py-2">Sig. (2-tailed)</th>
                                         <th className="px-4 py-2">Mean Difference</th>
                                       </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100">
                                       <tr className="hover:bg-slate-50">
                                         <td className="px-4 py-2 text-left font-medium">Equal variances assumed</td>
                                         <td className="px-4 py-2 text-slate-700">{ttestResult.ttest.equal.t}</td>
                                         <td className="px-4 py-2 text-slate-700">{ttestResult.ttest.equal.df}</td>
                                         <td className="px-4 py-2 font-bold text-emerald-700">{ttestResult.ttest.equal.p}</td>
                                         <td className="px-4 py-2 text-slate-700">{ttestResult.ttest.equal.md}</td>
                                       </tr>
                                       <tr className="hover:bg-slate-50">
                                         <td className="px-4 py-2 text-left font-medium text-slate-500">Equal variances not assumed</td>
                                         <td className="px-4 py-2 text-slate-500">{ttestResult.ttest.welch.t}</td>
                                         <td className="px-4 py-2 text-slate-500">{ttestResult.ttest.welch.df}</td>
                                         <td className="px-4 py-2 text-slate-500">{ttestResult.ttest.welch.p}</td>
                                         <td className="px-4 py-2 text-slate-500">{ttestResult.ttest.welch.md}</td>
                                       </tr>
                                     </tbody>
                                   </table>
                                 </div>
                               </>
                             )}
                           </div>
                        ))}
                      </div>
                    )}

                    {res.model === 'regression' && res.data?.regression && (
                      <div className="space-y-6">
                        {res.data.regression.error ? (
                          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{res.data.regression.error}</div>
                        ) : (
                           <div className="space-y-4">
                             <div className="font-semibold text-slate-700">Dependent Variable: {res.data.regression.dependent}</div>
                             <div className="text-sm text-slate-500 mb-2">Predictors: (Constant), {res.data.regression.predictors}</div>
                             
                             <div className="overflow-x-auto border border-slate-200 rounded-lg">
                               <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">Model Summary</div>
                               <table className="w-full text-sm text-center">
                                 <thead className="bg-white text-slate-600 border-b border-slate-200">
                                   <tr>
                                     <th className="px-4 py-2">R</th>
                                     <th className="px-4 py-2">R Square</th>
                                     <th className="px-4 py-2">Adjusted R Square</th>
                                     <th className="px-4 py-2">Std. Error of the Estimate</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                   <tr className="hover:bg-slate-50">
                                     <td className="px-4 py-2 font-semibold">{res.data.regression.modelSummary.r}</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.modelSummary.rSquare}</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.modelSummary.adjRSquare}</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.modelSummary.stdError}</td>
                                   </tr>
                                 </tbody>
                               </table>
                             </div>

                             <div className="overflow-x-auto border border-slate-200 rounded-lg">
                               <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">ANOVA</div>
                               <table className="w-full text-sm text-center">
                                 <thead className="bg-white text-slate-600 border-b border-slate-200">
                                   <tr>
                                     <th className="px-4 py-2 text-left">Model</th>
                                     <th className="px-4 py-2">Sum of Squares</th>
                                     <th className="px-4 py-2">df</th>
                                     <th className="px-4 py-2">Mean Square</th>
                                     <th className="px-4 py-2">F</th>
                                     <th className="px-4 py-2">Sig.</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                   <tr className="hover:bg-slate-50">
                                     <td className="px-4 py-2 text-left font-medium">Regression</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.anova.regression.ss}</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.anova.regression.df}</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.anova.regression.ms}</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.anova.regression.F}</td>
                                     <td className="px-4 py-2 font-bold text-emerald-700">{res.data.regression.anova.regression.sig}</td>
                                   </tr>
                                   <tr className="hover:bg-slate-50">
                                     <td className="px-4 py-2 text-left font-medium">Residual</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.anova.residual.ss}</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.anova.residual.df}</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.anova.residual.ms}</td>
                                     <td className="px-4 py-2"></td>
                                     <td className="px-4 py-2"></td>
                                   </tr>
                                   <tr className="hover:bg-slate-50">
                                     <td className="px-4 py-2 text-left font-medium">Total</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.anova.total.ss}</td>
                                     <td className="px-4 py-2 text-slate-700">{res.data.regression.anova.total.df}</td>
                                     <td className="px-4 py-2"></td>
                                     <td className="px-4 py-2"></td>
                                     <td className="px-4 py-2"></td>
                                   </tr>
                                 </tbody>
                               </table>
                             </div>

                             <div className="overflow-x-auto border border-slate-200 rounded-lg">
                               <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">Coefficients</div>
                               <table className="w-full text-sm text-center">
                                 <thead className="bg-white text-slate-600 border-b border-slate-200">
                                   <tr>
                                     <th className="px-4 py-2 text-left" rowSpan={2}>Model</th>
                                     <th className="px-4 py-2 border-b border-slate-200" colSpan={2}>Unstandardized Coefficients</th>
                                     <th className="px-4 py-2 border-b border-slate-200">Standardized Coefficients</th>
                                     <th className="px-4 py-2" rowSpan={2}>t</th>
                                     <th className="px-4 py-2" rowSpan={2}>Sig.</th>
                                   </tr>
                                   <tr>
                                     <th className="px-4 py-2 bg-slate-50 border-t border-slate-200">B</th>
                                     <th className="px-4 py-2 bg-slate-50 border-t border-slate-200">Std. Error</th>
                                     <th className="px-4 py-2 bg-slate-50 border-t border-slate-200">Beta</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                   {res.data.regression.coefficients.map((coef: any) => (
                                     <tr key={coef.model} className="hover:bg-slate-50">
                                       <td className="px-4 py-2 text-left font-medium">{coef.model}</td>
                                       <td className="px-4 py-2 text-slate-700">{coef.unstandardizedB}</td>
                                       <td className="px-4 py-2 text-slate-700">{coef.stdError}</td>
                                       <td className="px-4 py-2 text-slate-700">{coef.standardizedBeta}</td>
                                       <td className="px-4 py-2 text-slate-700">{coef.t}</td>
                                       <td className="px-4 py-2 font-bold text-emerald-700">{coef.sig}</td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>
                           </div>
                        )}
                      </div>
                    )}

                    {res.model === 'efa' && res.data?.efa && (
                      <div className="space-y-6">
                        {res.data.efa.error ? (
                          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{res.data.efa.error}</div>
                        ) : (
                           <div className="space-y-4">
                             <div className="font-semibold text-slate-700">Variables: {res.data.efa.variables}</div>
                             
                             <div className="overflow-x-auto border border-slate-200 rounded-lg">
                               <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">Total Variance Explained</div>
                               <table className="w-full text-sm text-center">
                                 <thead className="bg-white text-slate-600 border-b border-slate-200">
                                   <tr>
                                     <th className="px-4 py-2 text-left" rowSpan={2}>Component</th>
                                     <th className="px-4 py-2 border-b border-slate-200" colSpan={3}>Initial Eigenvalues</th>
                                   </tr>
                                   <tr>
                                     <th className="px-4 py-2 bg-slate-50 border-t border-slate-200">Total</th>
                                     <th className="px-4 py-2 bg-slate-50 border-t border-slate-200">% of Variance</th>
                                     <th className="px-4 py-2 bg-slate-50 border-t border-slate-200">Cumulative %</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                   {res.data.efa.totalVariance.map((row: any) => (
                                     <tr key={row.component} className="hover:bg-slate-50">
                                       <td className="px-4 py-2 text-left font-medium">{row.component}</td>
                                       <td className="px-4 py-2 text-slate-700">{row.total}</td>
                                       <td className="px-4 py-2 text-slate-700">{row.variancePercent}</td>
                                       <td className="px-4 py-2 text-slate-700">{row.cumulativePercent}</td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>

                             <div className="overflow-x-auto border border-slate-200 rounded-lg">
                               <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-semibold text-slate-700 text-sm">Component Matrix</div>
                               <table className="w-full text-sm text-center">
                                 <thead className="bg-white text-slate-600 border-b border-slate-200">
                                   <tr>
                                     <th className="px-4 py-2 text-left">Variable</th>
                                     {Array.from({ length: res.data.efa.numComponents }).map((_, i) => (
                                         <th key={i} className="px-4 py-2">Component {i + 1}</th>
                                     ))}
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                   {res.data.efa.componentMatrix.map((row: any) => (
                                     <tr key={row.variable} className="hover:bg-slate-50">
                                       <td className="px-4 py-2 text-left font-medium">{row.variable}</td>
                                       {Array.from({ length: res.data.efa.numComponents }).map((_, i) => {
                                           const val = parseFloat(row[`Component ${i + 1}`]);
                                           return (
                                               <td key={i} className={`px-4 py-2 ${Math.abs(val) > 0.5 ? 'font-bold text-blue-700' : 'text-slate-500'}`}>
                                                   {row[`Component ${i + 1}`]}
                                               </td>
                                           );
                                       })}
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>
                           </div>
                        )}
                      </div>
                    )}

                    {(!res.data || (!res.data.descriptives && !res.data.reliability && !res.data.correlation && !res.data.frequencies && !res.data.anova && !res.data.ttest && !res.data.regression && !res.data.efa)) && (
                      <div className="p-8 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                        <p>{res.message || 'Dữ liệu mẫu giả lập cho kết quả phân tích.'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Smart Insights (Mock for the latest result only) */}
                {res.id === results[0]?.id && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                    <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Smart Insights
                    </h4>
                    <ul className="space-y-2 text-sm text-emerald-900">
                      <li className="flex gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        Mô hình chạy thành công. Không phát hiện dữ liệu khuyết bất thường.
                      </li>
                      <li className="flex gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        P-value dự kiến sẽ được highlight để dễ dàng nhận biết ý nghĩa thống kê.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}

          {results.length === 0 && (
             <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm opacity-50 mt-8">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  Linear Regression (Draft)
                </h4>
              </div>
              <div className="p-8 text-center text-slate-400">
                <p>Mẫu giao diện bảng kết quả</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
