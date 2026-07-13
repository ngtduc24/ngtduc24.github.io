import React, { useState, useEffect } from 'react';
import { Play, BarChart, TrendingUp, CheckSquare, X, Settings2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useQuantitative, Variable } from './QuantitativeContext';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import * as ss from 'simple-statistics';
// @ts-ignore
import { jStat } from 'jstat';
import { PCA } from 'ml-pca';

type AnalysisModel = 'frequencies' | 'descriptives' | 'reliability' | 'ttest' | 'anova' | 'correlation' | 'regression' | 'efa' | null;

export default function Analysis({ onAnalysisComplete }: { onAnalysisComplete?: () => void }) {
  const { variables, data, setResults } = useQuantitative();
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [selectedModel, setSelectedModel] = useState<AnalysisModel>(null);
  
  // Selection state
  const [selectedAvailableVar, setSelectedAvailableVar] = useState<string | null>(null);
  const [selectedTargetVar, setSelectedTargetVar] = useState<string | null>(null);
  
  // Model setup state
  const [targetVars, setTargetVars] = useState<string[]>([]); // IDs of variables in main target box
  const [dependentVar, setDependentVar] = useState<string | null>(null); // For regression

  // Reset setup when model changes
  useEffect(() => {
    setTargetVars([]);
    setDependentVar(null);
    setSelectedAvailableVar(null);
    setSelectedTargetVar(null);
  }, [selectedModel]);

  const calculateDescriptives = (varIds: string[]) => {
    const results = varIds.map(id => {
      const variable = variables.find(v => v.id === id);
      if (!variable) return null;
      
      const values = data.map(row => Number(row[variable.name])).filter(val => !isNaN(val));
      if (values.length === 0) return { variable: variable.name, n: 0 };
      
      return {
        variable: variable.name,
        label: variable.label,
        n: values.length,
        min: ss.min(values),
        max: ss.max(values),
        mean: ss.mean(values).toFixed(3),
        stdDev: ss.standardDeviation(values).toFixed(3)
      };
    }).filter(Boolean);
    return results;
  };

  const calculateCronbachsAlpha = (varIds: string[]) => {
    // Collect data matrix
    const matrix = data.map(row => {
      return varIds.map(id => {
        const variable = variables.find(v => v.id === id);
        return variable ? Number(row[variable.name]) : NaN;
      });
    }).filter(row => row.every(val => !isNaN(val))); // filter out rows with missing data

    if (matrix.length < 2 || varIds.length < 2) return { error: "Không đủ dữ liệu hoặc biến để tính toán." };

    const k = varIds.length;
    const itemVariances = [];
    
    // Variance of each item
    for (let i = 0; i < k; i++) {
      const itemScores = matrix.map(row => row[i]);
      itemVariances.push(ss.variance(itemScores));
    }
    
    // Variance of total scores
    const totalScores = matrix.map(row => row.reduce((sum, val) => sum + val, 0));
    const totalVariance = ss.variance(totalScores);
    
    if (totalVariance === 0) return { error: "Variance tổng bằng 0, không thể tính Alpha." };

    const sumOfItemVariances = itemVariances.reduce((a, b) => a + b, 0);
    const alpha = (k / (k - 1)) * (1 - (sumOfItemVariances / totalVariance));

    return {
      k,
      n: matrix.length,
      alpha: alpha.toFixed(3),
      interpretation: alpha >= 0.8 ? 'Tốt (Good)' : alpha >= 0.7 ? 'Chấp nhận được (Acceptable)' : alpha >= 0.6 ? 'Hơi yếu (Questionable)' : 'Kém (Poor)'
    };
  };

  const calculatePearsonCorrelation = (varIds: string[]) => {
    if (varIds.length < 2) return { error: "Cần ít nhất 2 biến để tính tương quan." };
    
    const validVars = varIds.map(id => variables.find(v => v.id === id)).filter(Boolean);
    const results: any[] = [];
    
    for (let i = 0; i < validVars.length; i++) {
      const rowRes: any = { variable: validVars[i]!.name };
      for (let j = 0; j < validVars.length; j++) {
        if (i === j) {
          rowRes[validVars[j]!.name] = '1.000';
        } else {
          // Calculate correlation
          const pairs = data.map(row => {
            const x = Number(row[validVars[i]!.name]);
            const y = Number(row[validVars[j]!.name]);
            return [x, y];
          }).filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));
          
          if (pairs.length < 2) {
            rowRes[validVars[j]!.name] = 'NaN';
          } else {
            const xs = pairs.map(p => p[0]);
            const ys = pairs.map(p => p[1]);
            const r = ss.sampleCorrelation(xs, ys);
            rowRes[validVars[j]!.name] = isNaN(r) ? 'NaN' : r.toFixed(3);
          }
        }
      }
      results.push(rowRes);
    }
    
    return {
      variables: validVars.map(v => v!.name),
      matrix: results
    };
  };

  const calculateFrequencies = (varIds: string[]) => {
    const results = varIds.map(id => {
      const variable = variables.find(v => v.id === id);
      if (!variable) return null;
      
      const values = data.map(row => row[variable.name]).filter(val => val !== undefined && val !== null && val !== '');
      if (values.length === 0) return { variable: variable.name, n: 0, frequencies: [] };
      
      const total = values.length;
      const counts: Record<string, number> = {};
      
      values.forEach(val => {
        const strVal = String(val);
        counts[strVal] = (counts[strVal] || 0) + 1;
      });
      
      const frequencies = Object.entries(counts).map(([val, count]) => {
        const label = variable.values[val] || val;
        return {
          value: val,
          label: label,
          count: count,
          percent: ((count / total) * 100).toFixed(1)
        };
      }).sort((a, b) => {
          const numA = Number(a.value);
          const numB = Number(b.value);
          if (!isNaN(numA) && !isNaN(numB)) {
             return numA - numB;
          }
          return a.value.localeCompare(b.value);
      });
      
      return {
        variable: variable.name,
        label: variable.label,
        n: total,
        frequencies
      };
    }).filter(Boolean);
    return results;
  };

  const calculateANOVA = (varIds: string[], depVarId: string | null) => {
    let factorId = varIds[0];
    let dependentIds = depVarId ? [depVarId] : varIds.slice(1);
    
    if (!depVarId && varIds.length === 2) {
        factorId = varIds[0];
        dependentIds = [varIds[1]];
    }
    
    const factorVar = variables.find(v => v.id === factorId);
    if (!factorVar) return { error: "Không tìm thấy biến nhóm (Factor)." };
    
    const results = dependentIds.map(depId => {
        const depVar = variables.find(v => v.id === depId);
        if (!depVar) return null;
        
        const groups: Record<string, number[]> = {};
        let totalCount = 0;
        let sum = 0;
        
        data.forEach(row => {
            const fVal = row[factorVar.name];
            const dVal = Number(row[depVar.name]);
            if (fVal !== undefined && fVal !== null && fVal !== '' && !isNaN(dVal)) {
                const groupKey = String(fVal);
                if (!groups[groupKey]) groups[groupKey] = [];
                groups[groupKey].push(dVal);
                sum += dVal;
                totalCount++;
            }
        });
        
        const groupKeys = Object.keys(groups);
        if (groupKeys.length < 2) return { error: `Biến ${factorVar.name} cần ít nhất 2 nhóm.` };
        
        const overallMean = sum / totalCount;
        
        let ssBetween = 0;
        let ssWithin = 0;
        
        const descriptives = groupKeys.map(key => {
            const groupData = groups[key];
            const n = groupData.length;
            const mean = ss.mean(groupData);
            const variance = groupData.length > 1 ? ss.variance(groupData) : 0;
            
            ssBetween += n * Math.pow(mean - overallMean, 2);
            
            const groupSS = groupData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
            ssWithin += groupSS;
            
            return {
                group: factorVar.values[key] || key,
                n,
                mean: mean.toFixed(3),
                stdDev: Math.sqrt(variance).toFixed(3)
            };
        });
        
        const dfBetween = groupKeys.length - 1;
        const dfWithin = totalCount - groupKeys.length;
        
        const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
        const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
        
        const fStat = msWithin > 0 ? msBetween / msWithin : 0;
        
        const pValue = 1 - jStat.centralF.cdf(fStat, dfBetween, dfWithin);
        
        return {
            dependent: depVar.name,
            factor: factorVar.name,
            descriptives,
            anova: {
                ssBetween: ssBetween.toFixed(3),
                dfBetween,
                msBetween: msBetween.toFixed(3),
                ssWithin: ssWithin.toFixed(3),
                dfWithin,
                msWithin: msWithin.toFixed(3),
                f: fStat.toFixed(3),
                p: pValue < 0.001 ? '< .001' : pValue.toFixed(3)
            }
        };
    }).filter(Boolean);
    
    return { results };
  };

  const calculateTTest = (varIds: string[], depVarId: string | null) => {
    let factorId = varIds[0];
    let dependentIds = depVarId ? [depVarId] : varIds.slice(1);
    
    if (!depVarId && varIds.length === 2) {
        factorId = varIds[0];
        dependentIds = [varIds[1]];
    }
    
    const factorVar = variables.find(v => v.id === factorId);
    if (!factorVar) return { error: "Không tìm thấy biến nhóm (Factor)." };
    
    const results = dependentIds.map(depId => {
        const depVar = variables.find(v => v.id === depId);
        if (!depVar) return null;
        
        const groups: Record<string, number[]> = {};
        
        data.forEach(row => {
            const fVal = row[factorVar.name];
            const dVal = Number(row[depVar.name]);
            if (fVal !== undefined && fVal !== null && fVal !== '' && !isNaN(dVal)) {
                const groupKey = String(fVal);
                if (!groups[groupKey]) groups[groupKey] = [];
                groups[groupKey].push(dVal);
            }
        });
        
        const groupKeys = Object.keys(groups);
        if (groupKeys.length !== 2) return { error: `Biến ${factorVar.name} cần đúng 2 nhóm để chạy T-Test. (Hiện có ${groupKeys.length})` };
        
        const g1 = groups[groupKeys[0]];
        const g2 = groups[groupKeys[1]];
        
        const n1 = g1.length;
        const n2 = g2.length;
        
        if (n1 < 2 || n2 < 2) return { error: "Mỗi nhóm cần ít nhất 2 quan sát." };
        
        const mean1 = ss.mean(g1);
        const mean2 = ss.mean(g2);
        const var1 = ss.variance(g1);
        const var2 = ss.variance(g2);
        
        // Equal Variances Assumed (Student's t-test)
        const dfEqual = n1 + n2 - 2;
        const sp = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / dfEqual);
        const tEqual = (mean1 - mean2) / (sp * Math.sqrt(1/n1 + 1/n2));
        const pEqual = 2 * (1 - jStat.studentt.cdf(Math.abs(tEqual), dfEqual));
        
        // Equal Variances Not Assumed (Welch's t-test)
        const tWelch = (mean1 - mean2) / Math.sqrt(var1/n1 + var2/n2);
        const dfWelch = Math.pow(var1/n1 + var2/n2, 2) / ( Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1) );
        const pWelch = 2 * (1 - jStat.studentt.cdf(Math.abs(tWelch), dfWelch));

        return {
            dependent: depVar.name,
            factor: factorVar.name,
            descriptives: [
                {
                    group: factorVar.values[groupKeys[0]] || groupKeys[0],
                    n: n1,
                    mean: mean1.toFixed(3),
                    stdDev: Math.sqrt(var1).toFixed(3),
                    stdError: (Math.sqrt(var1)/Math.sqrt(n1)).toFixed(3)
                },
                {
                    group: factorVar.values[groupKeys[1]] || groupKeys[1],
                    n: n2,
                    mean: mean2.toFixed(3),
                    stdDev: Math.sqrt(var2).toFixed(3),
                    stdError: (Math.sqrt(var2)/Math.sqrt(n2)).toFixed(3)
                }
            ],
            ttest: {
                equal: {
                    t: tEqual.toFixed(3),
                    df: dfEqual,
                    p: pEqual < 0.001 ? '< .001' : pEqual.toFixed(3),
                    md: (mean1 - mean2).toFixed(3)
                },
                welch: {
                    t: tWelch.toFixed(3),
                    df: dfWelch.toFixed(3),
                    p: pWelch < 0.001 ? '< .001' : pWelch.toFixed(3),
                    md: (mean1 - mean2).toFixed(3)
                }
            }
        };
    }).filter(Boolean);
    
    return { results };
  };

  const calculateRegression = (indepVarIds: string[], depVarId: string | null) => {
    if (!depVarId || indepVarIds.length === 0) return { error: "Regression yêu cầu biến độc lập và 1 biến phụ thuộc." };
    
    const depVar = variables.find(v => v.id === depVarId);
    const indepVars = indepVarIds.map(id => variables.find(v => v.id === id)).filter(Boolean) as Variable[];
    
    if (!depVar || indepVars.length === 0) return { error: "Không tìm thấy biến hợp lệ." };
    
    // Build matrices
    const y: number[][] = [];
    const X: number[][] = [];
    
    data.forEach(row => {
        const yVal = Number(row[depVar.name]);
        const xVals = indepVars.map(v => Number(row[v.name]));
        
        if (!isNaN(yVal) && xVals.every(x => !isNaN(x))) {
            y.push([yVal]);
            X.push([1, ...xVals]); // 1 for intercept
        }
    });
    
    const n = y.length;
    const k = indepVars.length;
    
    if (n <= k + 1) return { error: "Không đủ dữ liệu hợp lệ để chạy hồi quy." };
    
    // Matrix Utils
    const transpose = (A: number[][]) => A[0].map((_, c) => A.map(r => r[c]));
    const multiply = (A: number[][], B: number[][]) => {
        let C = Array.from({length: A.length}, () => Array(B[0].length).fill(0));
        for (let i = 0; i < A.length; i++) {
            for (let j = 0; j < B[0].length; j++) {
                for (let k = 0; k < A[0].length; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    };
    const invert = (matrix: number[][]) => {
        let n = matrix.length;
        let a = matrix.map(row => [...row]);
        let inv = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? 1 : 0));
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) maxRow = k;
            [a[i], a[maxRow]] = [a[maxRow], a[i]];
            [inv[i], inv[maxRow]] = [inv[maxRow], inv[i]];
            let pivot = a[i][i];
            if (pivot === 0) return null;
            for (let j = 0; j < n; j++) { a[i][j] /= pivot; inv[i][j] /= pivot; }
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    let factor = a[k][i];
                    for (let j = 0; j < n; j++) { a[k][j] -= factor * a[i][j]; inv[k][j] -= factor * inv[i][j]; }
                }
            }
        }
        return inv;
    };
    
    const XT = transpose(X);
    const XTX = multiply(XT, X);
    const XTX_inv = invert(XTX);
    
    if (!XTX_inv) return { error: "Ma trận không thể nghịch đảo (Đa cộng tuyến hoàn hảo)." };
    
    const XTy = multiply(XT, y);
    const B = multiply(XTX_inv, XTy);
    
    const yMean = ss.mean(y.map(r => r[0]));
    const SST = y.map(r => r[0]).reduce((acc, val) => acc + Math.pow(val - yMean, 2), 0);
    
    // Predicted values
    const yHat = multiply(X, B);
    const SSR = yHat.map(r => r[0]).reduce((acc, val) => acc + Math.pow(val - yMean, 2), 0);
    const SSE = y.map((r, i) => r[0] - yHat[i][0]).reduce((acc, val) => acc + Math.pow(val, 2), 0);
    
    const dfReg = k;
    const dfRes = n - k - 1;
    const dfTot = n - 1;
    
    const msReg = SSR / dfReg;
    const msRes = SSE / dfRes;
    
    const F = msRes > 0 ? msReg / msRes : 0;
    const pF = 1 - jStat.centralF.cdf(F, dfReg, dfRes);
    
    const R2 = SST > 0 ? SSR / SST : 0;
    const adjR2 = 1 - ((1 - R2) * (n - 1) / dfRes);
    const stdErrorEst = Math.sqrt(msRes);
    
    // Standard Errors
    const seB = XTX_inv.map((row, i) => Math.sqrt(Math.max(row[i] * msRes, 0)));
    
    const yStd = ss.standardDeviation(y.map(r => r[0]));
    
    const coefficients = [
        {
            model: "(Constant)",
            unstandardizedB: B[0][0].toFixed(3),
            stdError: seB[0].toFixed(3),
            standardizedBeta: "",
            t: seB[0] > 0 ? (B[0][0] / seB[0]).toFixed(3) : "NaN",
            sig: seB[0] > 0 ? (2 * (1 - jStat.studentt.cdf(Math.abs(B[0][0] / seB[0]), dfRes))).toFixed(3) : "NaN"
        },
        ...indepVars.map((v, i) => {
            const xVals = X.map(r => r[i + 1]);
            const xStd = ss.standardDeviation(xVals);
            const beta = (yStd > 0 && xStd > 0) ? B[i + 1][0] * (xStd / yStd) : 0;
            const t = seB[i + 1] > 0 ? B[i + 1][0] / seB[i + 1] : 0;
            let pVal = 2 * (1 - jStat.studentt.cdf(Math.abs(t), dfRes));
            
            return {
                model: v.name,
                unstandardizedB: B[i + 1][0].toFixed(3),
                stdError: seB[i + 1].toFixed(3),
                standardizedBeta: beta.toFixed(3),
                t: seB[i + 1] > 0 ? t.toFixed(3) : "NaN",
                sig: (seB[i+1] > 0 && pVal < 0.001) ? '< .001' : (seB[i+1] > 0 ? pVal.toFixed(3) : "NaN")
            };
        })
    ];
    
    return {
        dependent: depVar.name,
        predictors: indepVars.map(v => v.name).join(', '),
        modelSummary: {
            r: Math.sqrt(R2).toFixed(3),
            rSquare: R2.toFixed(3),
            adjRSquare: adjR2.toFixed(3),
            stdError: stdErrorEst.toFixed(3)
        },
        anova: {
            regression: { ss: SSR.toFixed(3), df: dfReg, ms: msReg.toFixed(3), F: F.toFixed(3), sig: pF < 0.001 ? '< .001' : pF.toFixed(3) },
            residual: { ss: SSE.toFixed(3), df: dfRes, ms: msRes.toFixed(3) },
            total: { ss: SST.toFixed(3), df: dfTot }
        },
        coefficients
    };
  };

  const calculateEFA = (varIds: string[]) => {
    if (varIds.length < 2) return { error: "EFA yêu cầu ít nhất 2 biến." };
    
    const indepVars = varIds.map(id => variables.find(v => v.id === id)).filter(Boolean) as Variable[];
    
    // Build matrix
    const matrix: number[][] = [];
    data.forEach(row => {
        const xVals = indepVars.map(v => Number(row[v.name]));
        if (xVals.every(x => !isNaN(x))) {
            matrix.push(xVals);
        }
    });

    if (matrix.length < varIds.length + 1) return { error: "Không đủ dữ liệu hợp lệ để chạy EFA." };

    try {
        const pca = new PCA(matrix, { center: true, scale: true });
        
        const eigenvalues = pca.getEigenvalues();
        const explainedVariance = pca.getExplainedVariance();
        
        const totalVarianceTable = eigenvalues.map((ev, i) => ({
            component: i + 1,
            total: ev.toFixed(3),
            variancePercent: (explainedVariance[i] * 100).toFixed(3),
            cumulativePercent: (explainedVariance.slice(0, i + 1).reduce((a, b) => a + b, 0) * 100).toFixed(3)
        }));

        const numComponents = eigenvalues.filter(e => e >= 1).length || 1;
        
        const loadings = pca.getLoadings().to2DArray();
        
        const componentMatrix = indepVars.map((v, i) => {
            const rowLoadings: Record<string, string> = {};
            for (let c = 0; c < numComponents; c++) {
                rowLoadings[`Component ${c + 1}`] = loadings[i][c].toFixed(3);
            }
            return {
                variable: v.name,
                ...rowLoadings
            };
        });

        return {
            variables: indepVars.map(v => v.name).join(', '),
            totalVariance: totalVarianceTable,
            componentMatrix,
            numComponents
        };
    } catch (e: any) {
        return { error: "Lỗi trong quá trình tính toán PCA: " + e.message };
    }
  };

  const handleRunAnalysis = () => {
    if (targetVars.length === 0 && !dependentVar) {
      addNotification("Vui lòng chọn ít nhất một biến để phân tích.", "error");
      return;
    }
    
    let analysisResultData: any = {};
    let message = 'Phân tích hoàn tất thành công.';

    try {
      if (selectedModel === 'frequencies') {
        analysisResultData.frequencies = calculateFrequencies(targetVars);
      } else if (selectedModel === 'descriptives') {
        analysisResultData.descriptives = calculateDescriptives(targetVars);
      } else if (selectedModel === 'reliability') {
        if (targetVars.length < 2) {
          addNotification("Cronbach's Alpha yêu cầu ít nhất 2 biến quan sát.", "error");
          return;
        }
        analysisResultData.reliability = calculateCronbachsAlpha(targetVars);
      } else if (selectedModel === 'correlation') {
        if (targetVars.length < 2) {
          addNotification("Tương quan Pearson yêu cầu ít nhất 2 biến.", "error");
          return;
        }
        analysisResultData.correlation = calculatePearsonCorrelation(targetVars);
      } else if (selectedModel === 'anova') {
        if (targetVars.length < 2 && !dependentVar) {
          addNotification("One-Way ANOVA yêu cầu ít nhất 1 biến nhóm (Factor) và 1 biến phụ thuộc.", "error");
          return;
        }
        analysisResultData.anova = calculateANOVA(targetVars, dependentVar);
      } else if (selectedModel === 'ttest') {
        if (targetVars.length < 2 && !dependentVar) {
          addNotification("Independent T-Test yêu cầu 1 biến nhóm (2 giá trị) và 1 biến phụ thuộc.", "error");
          return;
        }
        analysisResultData.ttest = calculateTTest(targetVars, dependentVar);
      } else if (selectedModel === 'regression') {
        if (targetVars.length < 1 || !dependentVar) {
          addNotification("Linear Regression yêu cầu ít nhất 1 biến độc lập và 1 biến phụ thuộc.", "error");
          return;
        }
        analysisResultData.regression = calculateRegression(targetVars, dependentVar);
      } else if (selectedModel === 'efa') {
        if (targetVars.length < 2) {
          addNotification("EFA (PCA) yêu cầu ít nhất 2 biến.", "error");
          return;
        }
        analysisResultData.efa = calculateEFA(targetVars);
      } else {
        // Fallback for mock models
        analysisResultData = { status: 'mock', message: 'Tính năng này đang được phát triển.' };
      }
    } catch (e: any) {
      message = 'Lỗi tính toán: ' + e.message;
    }

    const newResult = {
      id: Date.now().toString(),
      model: selectedModel,
      timestamp: new Date().toISOString(),
      targetVars: targetVars.map(id => variables.find(v => v.id === id)?.name),
      dependentVar: dependentVar ? variables.find(v => v.id === dependentVar)?.name : null,
      data: analysisResultData,
      message
    };
    
    setResults(prev => [newResult, ...prev]);
    if (onAnalysisComplete) {
      onAnalysisComplete();
    } else {
      addNotification("Đã chạy phân tích thành công. Vui lòng chuyển sang tab 'Kết quả & Báo cáo' để xem chi tiết.", "success");
    }
  };

  const moveTargetToAvailable = () => {
    if (selectedTargetVar) {
      if (targetVars.includes(selectedTargetVar)) {
        setTargetVars(targetVars.filter(id => id !== selectedTargetVar));
      } else if (dependentVar === selectedTargetVar) {
        setDependentVar(null);
      }
      setSelectedTargetVar(null);
    }
  };

  const moveAvailableToTarget = () => {
    if (selectedAvailableVar && !targetVars.includes(selectedAvailableVar) && dependentVar !== selectedAvailableVar) {
      setTargetVars([...targetVars, selectedAvailableVar]);
      setSelectedAvailableVar(null);
    }
  };
  
  const moveAvailableToDependent = () => {
    if (selectedAvailableVar && !targetVars.includes(selectedAvailableVar)) {
      setDependentVar(selectedAvailableVar);
      setSelectedAvailableVar(null);
    }
  };

  const analysisOptions = [
    {
      category: 'Thống kê Mô tả',
      items: [
        { id: 'frequencies', name: 'Frequencies', icon: BarChart, desc: 'Tần số, tỷ lệ phần trăm.' },
        { id: 'descriptives', name: 'Descriptives', icon: BarChart, desc: 'Mean, Std. Deviation.' },
      ]
    },
    {
      category: 'Đánh giá Thang đo',
      items: [
        { id: 'reliability', name: 'Reliability Analysis', icon: CheckSquare, desc: 'Cronbach\'s Alpha.' },
        { id: 'efa', name: 'Exploratory Factor Analysis (EFA)', icon: BarChart, desc: 'Phân tích nhân tố khám phá (PCA).' },
      ]
    },
    {
      category: 'So sánh Trung bình',
      items: [
        { id: 'ttest', name: 'Independent T-Test', icon: BarChart, desc: 'So sánh 2 nhóm.' },
        { id: 'anova', name: 'One-Way ANOVA', icon: BarChart, desc: 'So sánh >2 nhóm.' },
      ]
    },
    {
      category: 'Tương quan & Hồi quy',
      items: [
        { id: 'correlation', name: 'Bivariate Correlation', icon: TrendingUp, desc: 'Tương quan Pearson.' },
        { id: 'regression', name: 'Linear Regression', icon: TrendingUp, desc: 'Hồi quy tuyến tính.' },
      ]
    }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Menu */}
      <div className="w-full md:w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4 px-2">Analyze</h3>
        <div className="space-y-6">
          {analysisOptions.map(group => (
            <div key={group.category}>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">{group.category}</h4>
              <div className="space-y-1">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedModel(item.id as AnalysisModel)}
                    className={`w-full flex flex-col text-left px-3 py-2 rounded-lg transition-colors ${selectedModel === item.id ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-slate-200 text-slate-700'}`}
                  >
                    <span className="font-semibold text-sm flex items-center gap-2">
                      <item.icon className="w-4 h-4" /> {item.name}
                    </span>
                    <span className="text-xs opacity-80 mt-1">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Setup Area */}
      <div className="w-full md:w-2/3 border border-slate-200 rounded-xl p-6 relative bg-white">
        {!selectedModel ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
            <Play className="w-12 h-12 mb-4 text-slate-200" />
            <p>Chọn một thuật toán phân tích từ menu bên trái để cấu hình.</p>
          </div>
        ) : (
          <div className="animate-fadeIn flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-emerald-600" /> Cấu hình {analysisOptions.flatMap(g => g.items).find(i => i.id === selectedModel)?.name}
              </h3>
              <button onClick={() => setSelectedModel(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-4 flex-1">
              {/* Variables List */}
              <div className="w-5/12 flex flex-col border border-slate-200 rounded-lg bg-slate-50 p-3 overflow-hidden">
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Biến khả dụng</p>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {variables.filter(v => !targetVars.includes(v.id) && dependentVar !== v.id).map(v => (
                    <button 
                      key={v.id} 
                      onClick={() => {
                        setSelectedAvailableVar(v.id);
                        setSelectedTargetVar(null);
                      }}
                      onDoubleClick={() => {
                        if (!targetVars.includes(v.id) && dependentVar !== v.id) {
                          setTargetVars([...targetVars, v.id]);
                        }
                      }}
                      className={`w-full text-left p-2 rounded border text-sm transition-colors ${selectedAvailableVar === v.id ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 hover:border-emerald-200 text-slate-700'}`}
                    >
                      <span className="font-semibold">{v.name}</span>
                      {v.label && <span className="text-slate-500 ml-2 text-xs truncate">- {v.label}</span>}
                    </button>
                  ))}
                  {variables.filter(v => !targetVars.includes(v.id) && dependentVar !== v.id).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Không còn biến khả dụng.</p>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="w-2/12 flex flex-col items-center justify-center gap-4">
                 <button 
                    disabled={!selectedAvailableVar && !selectedTargetVar}
                    onClick={() => {
                      if (selectedAvailableVar) moveAvailableToTarget();
                      else if (selectedTargetVar && targetVars.includes(selectedTargetVar)) moveTargetToAvailable();
                    }}
                    className="p-2 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {selectedTargetVar && targetVars.includes(selectedTargetVar) ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                 </button>
                 
                 {selectedModel === 'regression' && (
                   <div className="mt-8 flex flex-col items-center gap-1">
                     <span className="text-[10px] uppercase font-bold text-slate-400">Dependent</span>
                     <button 
                        disabled={!selectedAvailableVar && !selectedTargetVar}
                        onClick={() => {
                          if (selectedAvailableVar) moveAvailableToDependent();
                          else if (selectedTargetVar && dependentVar === selectedTargetVar) moveTargetToAvailable();
                        }}
                        className="p-2 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {selectedTargetVar && dependentVar === selectedTargetVar ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                     </button>
                   </div>
                 )}
              </div>

              {/* Targets */}
              <div className="w-5/12 flex flex-col gap-4">
                <div className="flex-1 border border-slate-200 rounded-lg p-3 bg-white flex flex-col">
                  <p className="text-xs font-bold text-slate-500 mb-2 uppercase">
                    {selectedModel === 'regression' ? 'Independent(s)' : 'Variables (Variables)'}
                  </p>
                  <div className="flex-1 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded border border-slate-100 min-h-[150px]">
                    {targetVars.map(id => {
                      const v = variables.find(varObj => varObj.id === id);
                      if (!v) return null;
                      return (
                        <button 
                          key={v.id} 
                          onClick={() => {
                            setSelectedTargetVar(v.id);
                            setSelectedAvailableVar(null);
                          }}
                          onDoubleClick={() => {
                            setTargetVars(targetVars.filter(id => id !== v.id));
                          }}
                          className={`w-full text-left p-2 rounded border text-sm transition-colors ${selectedTargetVar === v.id ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 hover:border-emerald-200 text-slate-700'}`}
                        >
                          <span className="font-semibold">{v.name}</span>
                        </button>
                      );
                    })}
                    {targetVars.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">Chưa chọn biến nào</p>
                    )}
                  </div>
                </div>
                
                {selectedModel === 'regression' && (
                  <div className="h-1/3 border border-emerald-200 rounded-lg p-3 bg-emerald-50/30 flex flex-col">
                    <p className="text-xs font-bold text-emerald-700 mb-2 uppercase">Dependent Variable</p>
                    <div className="flex-1 overflow-y-auto space-y-1 bg-white p-2 rounded border border-emerald-100">
                      {dependentVar ? (() => {
                        const v = variables.find(varObj => varObj.id === dependentVar);
                        if (!v) return null;
                        return (
                          <button 
                            key={v.id} 
                            onClick={() => {
                              setSelectedTargetVar(v.id);
                              setSelectedAvailableVar(null);
                            }}
                            className={`w-full text-left p-2 rounded border text-sm transition-colors ${selectedTargetVar === v.id ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 hover:border-emerald-200 text-slate-700'}`}
                          >
                            <span className="font-semibold">{v.name}</span>
                          </button>
                        );
                      })() : (
                        <p className="text-xs text-slate-400 text-center py-2">Trống</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button 
                onClick={handleRunAnalysis} 
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-sm shadow-emerald-200"
              >
                <Play className="w-4 h-4" /> Bắt đầu Phân tích
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
