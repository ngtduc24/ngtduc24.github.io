import React, { useState, useEffect } from 'react';
import { uploadImageToCloudinary } from '../lib/upload';
import MediaSourcePicker from './MediaSourcePicker';
import { useNotifications } from './NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  Layers, 
  Users, 
  BookOpen, 
  ArrowLeft, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Copy, 
  Download,
  AlertCircle,
  ClipboardCheck,
  Globe,
  Settings,
  X,
  ArrowUpRight
} from 'lucide-react';
import { AppSettings, UserAccount } from '../types';
import { saveDefaultSettingsToSupabase, incrementStatInSupabase } from '../lib/data';

type MethodType = 'A' | 'B' | 'C';

export default function SampleSizeCalculator({ settings, onRefreshSettings, currentUser }: { settings: AppSettings, onRefreshSettings?: () => Promise<void>, currentUser?: UserAccount }) {
  const { addNotification } = useNotifications();
  const [showBannerSettings, setShowBannerSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [bannerTitle, setBannerTitle] = useState(settings?.calcBannerTitle || '');
  const [bannerDesc, setBannerDesc] = useState(settings?.calcBannerDescription || '');
  const [bannerLabel, setBannerLabel] = useState(settings?.calcBannerLabel || '');
  const [bannerImg, setBannerImg] = useState(settings?.calcBannerImage || '');

  useEffect(() => {
    if (settings) {
      setBannerTitle(settings.calcBannerTitle || '');
      setBannerDesc(settings.calcBannerDescription || '');
      setBannerLabel(settings.calcBannerLabel || '');
      setBannerImg(settings.calcBannerImage || '');
    }
  }, [settings]);

  useEffect(() => {
    if (showBannerSettings && settings) {
      setBannerTitle(settings.calcBannerTitle || '');
      setBannerDesc(settings.calcBannerDescription || '');
      setBannerLabel(settings.calcBannerLabel || '');
      setBannerImg(settings.calcBannerImage || '');
    }
  }, [showBannerSettings, settings]);

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await saveDefaultSettingsToSupabase({
        ...settings,
        calcBannerTitle: bannerTitle,
        calcBannerDescription: bannerDesc,
        calcBannerLabel: bannerLabel,
        calcBannerImage: bannerImg
      });
      if (onRefreshSettings) await onRefreshSettings();
      setShowBannerSettings(false);
      addNotification("Đã lưu cài đặt Banner!", "success");
    } catch(err) {
      addNotification("Lỗi lưu cài đặt!", "error");
    }
  };
  const brandColor = settings.bannerColor || '#712cf9';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<MethodType | null>(null);

  // Input states
  const [variablesCount, setVariablesCount] = useState<string>('20');
  const [independentVars, setIndependentVars] = useState<string>('5');
  const [populationSize, setPopulationSize] = useState<string>('1000');
  const [marginOfError, setMarginOfError] = useState<string>('5');
  const [confidenceZ, setConfidenceZ] = useState<string>('1.96');
  const [proportionP, setProportionP] = useState<string>('0.5');
  const [backupRate, setBackupRate] = useState<string>('10');

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculation outputs
  const [theoreticalN, setTheoreticalN] = useState<number>(0);
  const [actualN, setActualN] = useState<number>(0);

  // Copy toast
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);
  const [showDownloadToast, setShowDownloadToast] = useState<boolean>(false);

  const handleSelectMethod = (selected: MethodType) => {
    setMethod(selected);
    setErrors({});
    setStep(2);
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};

    // Validate backup rate
    const backup = parseFloat(backupRate);
    if (!backupRate.trim() || isNaN(backup) || backup < 0 || backup >= 100) {
      newErrors.backupRate = 'Tỷ lệ dự phòng phải từ 0% đến dưới 100%';
    }

    let n = 0;

    if (method === 'A') {
      const vars = parseInt(variablesCount);
      const indeps = parseInt(independentVars);

      if (!variablesCount.trim() || isNaN(vars) || vars < 1) {
        newErrors.variablesCount = 'Số lượng biến quan sát phải là số nguyên dương ≥ 1';
      }
      if (!independentVars.trim() || isNaN(indeps) || indeps < 1) {
        newErrors.independentVars = 'Số lượng biến độc lập phải là số nguyên dương ≥ 1';
      }

      if (Object.keys(newErrors).length === 0) {
        const n1 = Math.max(vars * 5, 100);
        const n2 = 50 + 8 * indeps;
        n = Math.max(n1, n2);
      }
    } else if (method === 'B') {
      const N = parseInt(populationSize);
      const e = parseFloat(marginOfError);

      if (!populationSize.trim() || isNaN(N) || N < 1) {
        newErrors.populationSize = 'Quy mô dân số phải là số nguyên dương ≥ 1';
      }
      if (!marginOfError.trim() || isNaN(e) || e <= 0 || e > 100) {
        newErrors.marginOfError = 'Sai số e phải lớn hơn 0 và ≤ 100%';
      }

      if (Object.keys(newErrors).length === 0) {
        n = N / (1 + N * Math.pow(e / 100, 2));
      }
    } else if (method === 'C') {
      const z = parseFloat(confidenceZ);
      const p = parseFloat(proportionP);
      const e = parseFloat(marginOfError);

      if (!proportionP.trim() || isNaN(p) || p <= 0 || p >= 1) {
        newErrors.proportionP = 'Tỷ lệ ước tính p phải lớn hơn 0 và bé hơn 1 (ví dụ: 0.5)';
      }
      if (!marginOfError.trim() || isNaN(e) || e <= 0 || e > 100) {
        newErrors.marginOfError = 'Sai số e phải lớn hơn 0 và ≤ 100%';
      }

      if (Object.keys(newErrors).length === 0) {
        n = (Math.pow(z, 2) * p * (1 - p)) / Math.pow(e / 100, 2);
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Common calculation of actual size including backup
    const backupDec = parseFloat(backupRate) / 100;
    const nActual = Math.ceil(n / (1 - backupDec));

    setTheoreticalN(n);
    setActualN(nActual);
    setErrors({});
    setStep(3);

    // Increment count of calculations in Supabase
    try {
      incrementStatInSupabase('calculator');
    } catch (err) {
      console.error("Failed to increment calculator stats:", err);
    }
  };

  const handleReset = () => {
    setMethod(null);
    setErrors({});
    setStep(1);
  };

  const getMethodName = () => {
    if (method === 'A') return 'Nhóm phân tích SPSS (EFA & Hồi quy - Hoàng Trọng & Hair)';
    if (method === 'B') return 'Khảo sát cộng đồng - Đã biết tổng thể (Taro Yamane)';
    if (method === 'C') return 'Khảo sát cộng đồng - Chưa biết tổng thể (Cochran)';
    return '';
  };

  // Prepare input summary for copy results
  const getInputSummaryText = () => {
    if (method === 'A') {
      return `- Số lượng biến quan sát (câu hỏi): ${variablesCount} biến\n- Số lượng biến độc lập: ${independentVars} biến\n- Tỷ lệ dự phòng: ${backupRate}%`;
    } else if (method === 'B') {
      return `- Quy mô tổng thể dân số (N): ${populationSize} người\n- Sai số cho phép (e): ${marginOfError}%\n- Tỷ lệ dự phòng: ${backupRate}%`;
    } else if (method === 'C') {
      return `- Hệ số tin cậy Z: ${confidenceZ} (${confidenceZ === '1.96' ? 'Mức tin cậy 95%' : 'Mức tin cậy 99%'})\n- Tỷ lệ ước tính p: ${proportionP}\n- Sai số cho phép (e): ${marginOfError}%\n- Tỷ lệ dự phòng: ${backupRate}%`;
    }
    return '';
  };

  const copyResults = () => {
    const text = `KẾT QUẢ TÍNH CỠ MẪU NGHIÊN CỨU KHOA HỌC
------------------------------------------------------
Phương pháp áp dụng: 
${getMethodName()}

Thông số đầu vào:
${getInputSummaryText()}

Kết quả tính toán:
- Cỡ mẫu lý thuyết tối thiểu: ${theoreticalN.toFixed(2)} mẫu
- Tỷ lệ dự phòng phiếu hỏng: ${backupRate}%
- SỐ PHIẾU THỰC TẾ CẦN PHÁT RA: ${actualN} phiếu (Đã làm tròn lên)
------------------------------------------------------
Hệ thống tính toán cỡ mẫu nghiên cứu khoa học toàn diện`;

    navigator.clipboard.writeText(text);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2500);
  };

  // Function to download the single file HTML as a portable offline tool!
  const downloadSingleFileHTML = () => {
    const escapedMethod = method || 'A';
    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hệ thống tính toán cỡ mẫu nghiên cứu khoa học</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #f8f6fc 0%, #f1eefc 100%);
            min-height: 100vh;
        }
        .font-display {
            font-family: 'Space Grotesk', sans-serif;
        }
    </style>
</head>
<body class="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">

    <div class="w-full max-w-2xl bg-white rounded-3xl shadow-2xl shadow-purple-900/10 border border-slate-100 overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-[#712cf9] to-[#5b21d3] p-6 sm:p-8 text-white relative">
            <div class="flex items-center gap-3 mb-2">
                <div class="bg-white/10 p-2 rounded-xl">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <span class="text-xs font-semibold tracking-widest uppercase text-purple-200">SAMPLE SIZE ASSISTANT</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight font-display">Cỡ Mẫu Nghiên Cứu Khoa Học</h1>
            <p class="text-xs sm:text-sm text-purple-100 mt-1">Hệ thống hỗ trợ tính toán phương pháp nghiên cứu định lượng tự động, chính xác.</p>
        </div>

        <!-- Progress Indicator -->
        <div class="px-6 sm:px-8 pt-6 pb-2">
            <div class="flex items-center justify-between text-xs font-medium text-slate-400 border-b border-slate-100 pb-4">
                <div id="step-tab-1" class="flex items-center gap-1.5 text-[#712cf9] font-semibold">
                    <span class="w-5 h-5 rounded-full bg-[#f3eeff] border border-[#712cf9] flex items-center justify-center text-xs">1</span>
                    Phương pháp
                </div>
                <div class="flex-1 mx-4 h-[2px] bg-slate-100" id="step-line-1"></div>
                <div id="step-tab-2" class="flex items-center gap-1.5">
                    <span class="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs" id="step-num-2">2</span>
                    Thông số
                </div>
                <div class="flex-1 mx-4 h-[2px] bg-slate-100" id="step-line-2"></div>
                <div id="step-tab-3" class="flex items-center gap-1.5">
                    <span class="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs" id="step-num-3">3</span>
                    Kết quả
                </div>
            </div>
        </div>

        <div class="p-6 sm:p-8">
            <!-- STEP 1: CHOOSE METHOD -->
            <div id="step-1" class="space-y-4">
                <h2 class="text-lg font-semibold text-slate-800 mb-2">Bạn muốn tính cỡ mẫu theo phương pháp nào?</h2>
                
                <button onclick="selectMethod('A')" class="w-full text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-[#712cf9]/30 hover:bg-[#f8f6fc]/40 transition-all duration-200 group flex gap-4 items-start">
                    <div class="bg-purple-50 text-[#712cf9] p-3 rounded-xl group-hover:bg-[#f3eeff] transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-semibold text-slate-800 text-sm sm:text-base group-hover:text-[#712cf9] transition-colors">Nhóm phân tích SPSS (EFA & Hồi quy)</h3>
                        <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">Theo Hoàng Trọng & Hair. Dựa trên số lượng biến quan sát (thang đo Likert) và số lượng biến độc lập.</p>
                    </div>
                </button>

                <button onclick="selectMethod('B')" class="w-full text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-[#712cf9]/30 hover:bg-[#f8f6fc]/40 transition-all duration-200 group flex gap-4 items-start">
                    <div class="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:bg-blue-100 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-semibold text-slate-800 text-sm sm:text-base group-hover:text-[#712cf9] transition-colors">Khảo sát cộng đồng - Đã biết tổng thể</h3>
                        <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">Áp dụng công thức Taro Yamane. Dành cho khảo sát khi đã biết chính xác quy mô tổng số dân (N).</p>
                    </div>
                </button>

                <button onclick="selectMethod('C')" class="w-full text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-[#712cf9]/30 hover:bg-[#f8f6fc]/40 transition-all duration-200 group flex gap-4 items-start">
                    <div class="bg-emerald-50 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-100 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-semibold text-slate-800 text-sm sm:text-base group-hover:text-[#712cf9] transition-colors">Khảo sát cộng đồng - Chưa biết tổng thể</h3>
                        <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">Áp dụng công thức Cochran. Dùng khi dân số nghiên cứu quá lớn, vô hạn hoặc chưa thể xác định chính xác.</p>
                    </div>
                </button>
            </div>

            <!-- STEP 2: INPUT PARAMETERS -->
            <div id="step-2" class="hidden space-y-5">
                <div class="flex items-center gap-2 text-xs text-[#712cf9] font-semibold bg-[#f3eeff] px-3 py-1.5 rounded-lg w-max mb-1">
                    <span id="method-badge"></span>
                </div>
                
                <h2 class="text-lg font-semibold text-slate-800">Nhập các thông số để tính toán</h2>

                <div class="space-y-4" id="inputs-container">
                    <!-- Dynamic Inputs will be managed here -->
                </div>

                <!-- Always present backup rate input -->
                <div class="space-y-1.5">
                    <label class="block text-sm font-semibold text-slate-700">Tỷ lệ dự phòng phiếu hỏng (%)</label>
                    <div class="relative">
                        <input type="number" id="input-backupRate" value="10" oninput="clearError('backupRate')" class="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#712cf9] focus:outline-none rounded-xl px-4 py-3 text-slate-800 font-medium transition-all" />
                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">%</span>
                    </div>
                    <p id="error-backupRate" class="text-xs text-rose-500 hidden mt-1"></p>
                </div>

                <div class="flex items-center gap-3 pt-4">
                    <button onclick="goBackToStep1()" class="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm transition-all flex items-center justify-center gap-2">
                        Quay lại
                    </button>
                    <button onclick="calculateSample()" class="flex-[2] py-3 px-4 rounded-xl bg-[#712cf9] hover:bg-[#5b21d3] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20">
                        Tính Toán
                    </button>
                </div>
            </div>

            <!-- STEP 3: RESULTS -->
            <div id="step-3" class="hidden text-center space-y-6">
                <div>
                    <span class="text-xs font-bold tracking-widest text-[#712cf9] uppercase">KẾT QUẢ PHÂN TÍCH</span>
                    <h2 class="text-xl font-bold text-slate-800 mt-1" id="result-method-title"></h2>
                </div>

                <!-- Main results comparison cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center items-center">
                        <span class="text-xs font-medium text-slate-500 mb-1">Cỡ mẫu lý thuyết tối thiểu</span>
                        <div class="text-2xl font-bold text-slate-800" id="result-theoretical">0</div>
                        <span class="text-[10px] text-slate-400 mt-1">Tính theo công thức khoa học</span>
                    </div>

                    <div class="bg-[#f8f6fc] rounded-2xl p-5 border-2 border-[#712cf9]/20 flex flex-col justify-center items-center relative overflow-hidden">
                        <span class="text-xs font-semibold text-[#712cf9] mb-1">Số phiếu thực tế cần phát ra</span>
                        <div class="text-4xl font-extrabold text-[#712cf9]" id="result-actual">0</div>
                        <span class="text-[10px] text-[#712cf9]/70 mt-1 font-medium" id="result-backup-desc">Đã cộng dự phòng</span>
                    </div>
                </div>

                <!-- Explanation box -->
                <div class="text-left bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                    <div class="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                        <span>📋 Công thức và Diễn giải chi tiết:</span>
                    </div>
                    <div class="text-xs text-slate-600 space-y-1 leading-relaxed" id="result-explanation">
                    </div>
                </div>

                <div class="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button onclick="copyToClipboard()" class="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-all flex items-center justify-center gap-2">
                        Sao chép kết quả
                    </button>
                    <button onclick="calculateAgain()" class="w-full sm:flex-[2] py-3 px-4 rounded-xl bg-[#712cf9] hover:bg-[#5b21d3] text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                        Tính lại từ đầu
                    </button>
                </div>
            </div>
        </div>

        <!-- Card Footer -->
        <div class="bg-slate-50 px-6 py-4 border-t border-slate-100 text-center">
            <p class="text-xs font-medium text-slate-500 leading-normal">Hệ thống hỗ trợ tính toán phương pháp nghiên cứu định lượng</p>
        </div>
    </div>

    <!-- Alert toast for copied -->
    <div id="toast" class="fixed bottom-6 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl transition-all duration-300 translate-y-20 opacity-0 pointer-events-none flex items-center gap-2">
        <span>✓</span> Đã sao chép kết quả vào Clipboard!
    </div>

    <script>
        // State
        let currentMethod = '${escapedMethod}';
        let theoreticalN = 0;
        let actualN = 0;

        // Dom selectors
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');
        const step3 = document.getElementById('step-3');

        function selectMethod(method) {
            currentMethod = method;
            document.getElementById('step-tab-1').className = "flex items-center gap-1.5 text-emerald-600 font-semibold";
            document.getElementById('step-tab-1').innerHTML = '<span>✓</span> Phương pháp';
            document.getElementById('step-line-1').className = "flex-1 mx-4 h-[2px] bg-emerald-500";
            
            document.getElementById('step-tab-2').className = "flex items-center gap-1.5 text-[#712cf9] font-semibold";
            document.getElementById('step-num-2').className = "w-5 h-5 rounded-full bg-[#f3eeff] border border-[#712cf9] flex items-center justify-center text-xs";

            // Update Dynamic inputs based on selection
            const container = document.getElementById('inputs-container');
            const badge = document.getElementById('method-badge');
            
            if (method === 'A') {
                badge.innerText = "SPSS (EFA & Hồi quy)";
                container.innerHTML = \`
                    <div class="space-y-1.5">
                        <label class="block text-sm font-semibold text-slate-700">Số lượng biến quan sát (câu hỏi)</label>
                        <div class="relative">
                            <input type="number" id="input-variablesCount" value="20" oninput="clearError('variablesCount')" class="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#712cf9] focus:outline-none rounded-xl px-4 py-3 text-slate-800 font-medium transition-all" />
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">biến</span>
                        </div>
                        <p id="error-variablesCount" class="text-xs text-rose-500 hidden mt-1"></p>
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-sm font-semibold text-slate-700">Số lượng biến độc lập</label>
                        <div class="relative">
                            <input type="number" id="input-independentVars" value="5" oninput="clearError('independentVars')" class="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#712cf9] focus:outline-none rounded-xl px-4 py-3 text-slate-800 font-medium transition-all" />
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">biến</span>
                        </div>
                        <p id="error-independentVars" class="text-xs text-rose-500 hidden mt-1"></p>
                    </div>
                \`;
            } else if (method === 'B') {
                badge.innerText = "Taro Yamane (Biết tổng thể N)";
                container.innerHTML = \`
                    <div class="space-y-1.5">
                        <label class="block text-sm font-semibold text-slate-700">Quy mô tổng thể dân số (N)</label>
                        <div class="relative">
                            <input type="number" id="input-populationSize" value="1000" oninput="clearError('populationSize')" class="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#712cf9] focus:outline-none rounded-xl px-4 py-3 text-slate-800 font-medium transition-all" />
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">người</span>
                        </div>
                        <p id="error-populationSize" class="text-xs text-rose-500 hidden mt-1"></p>
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-sm font-semibold text-slate-700">Sai số cho phép (e, %)</label>
                        <div class="relative">
                            <input type="number" id="input-marginOfError" value="5" step="0.1" oninput="clearError('marginOfError')" class="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#712cf9] focus:outline-none rounded-xl px-4 py-3 text-slate-800 font-medium transition-all" />
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">%</span>
                        </div>
                        <p id="error-marginOfError" class="text-xs text-rose-500 hidden mt-1"></p>
                    </div>
                \`;
            } else if (method === 'C') {
                badge.innerText = "Cochran (Chưa biết tổng thể)";
                container.innerHTML = \`
                    <div class="space-y-1.5">
                        <label class="block text-sm font-semibold text-slate-700">Mức độ tin cậy Z</label>
                        <select id="input-confidenceZ" class="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#712cf9] focus:outline-none rounded-xl px-4 py-3 text-slate-800 font-medium transition-all">
                            <option value="1.96">95% (Z = 1.96)</option>
                            <option value="2.58">99% (Z = 2.58)</option>
                        </select>
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-sm font-semibold text-slate-700">Tỷ lệ ước tính p</label>
                        <div class="relative">
                            <input type="number" id="input-proportionP" value="0.5" step="0.05" oninput="clearError('proportionP')" class="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#712cf9] focus:outline-none rounded-xl px-4 py-3 text-slate-800 font-medium transition-all" />
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">p</span>
                        </div>
                        <p id="error-proportionP" class="text-xs text-rose-500 hidden mt-1"></p>
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-sm font-semibold text-slate-700">Sai số cho phép (e, %)</label>
                        <div class="relative">
                            <input type="number" id="input-marginOfError" value="5" step="0.1" oninput="clearError('marginOfError')" class="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#712cf9] focus:outline-none rounded-xl px-4 py-3 text-slate-800 font-medium transition-all" />
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">%</span>
                        </div>
                        <p id="error-marginOfError" class="text-xs text-rose-500 hidden mt-1"></p>
                    </div>
                \`;
            }

            step1.classList.add('hidden');
            step2.classList.remove('hidden');
        }

        function goBackToStep1() {
            // Reset Progress bar
            document.getElementById('step-tab-1').className = "flex items-center gap-1.5 text-[#712cf9] font-semibold";
            document.getElementById('step-tab-1').innerHTML = '<span class="w-5 h-5 rounded-full bg-[#f3eeff] border border-[#712cf9] flex items-center justify-center text-xs">1</span> Phương pháp';
            document.getElementById('step-line-1').className = "flex-1 mx-4 h-[2px] bg-slate-100";
            
            document.getElementById('step-tab-2').className = "flex items-center gap-1.5";
            document.getElementById('step-num-2').className = "w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs";

            step2.classList.add('hidden');
            step1.classList.remove('hidden');
        }

        function showError(fieldId, msg) {
            const el = document.getElementById('input-' + fieldId);
            const errEl = document.getElementById('error-' + fieldId);
            if (el) el.classList.add('border-rose-500', 'bg-rose-50/10');
            if (errEl) {
                errEl.innerText = msg;
                errEl.classList.remove('hidden');
            }
        }

        function clearError(fieldId) {
            const el = document.getElementById('input-' + fieldId);
            const errEl = document.getElementById('error-' + fieldId);
            if (el) el.classList.remove('border-rose-500', 'bg-rose-50/10');
            if (errEl) {
                errEl.innerText = '';
                errEl.classList.add('hidden');
            }
        }

        function calculateSample() {
            let hasError = false;
            
            // Validate backup rate
            const backupVal = document.getElementById('input-backupRate').value;
            const backup = parseFloat(backupVal);
            if (!backupVal.trim() || isNaN(backup) || backup < 0 || backup >= 100) {
                showError('backupRate', 'Tỷ lệ dự phòng phải từ 0 đến dưới 100%');
                hasError = true;
            }

            let n = 0;

            if (currentMethod === 'A') {
                const varsVal = document.getElementById('input-variablesCount').value;
                const indepsVal = document.getElementById('input-independentVars').value;
                const vars = parseInt(varsVal);
                const indeps = parseInt(indepsVal);

                if (!varsVal.trim() || isNaN(vars) || vars < 1) {
                    showError('variablesCount', 'Số lượng biến quan sát phải là số nguyên dương ≥ 1');
                    hasError = true;
                }
                if (!indepsVal.trim() || isNaN(indeps) || indeps < 1) {
                    showError('independentVars', 'Số lượng biến độc lập phải là số nguyên dương ≥ 1');
                    hasError = true;
                }

                if (!hasError) {
                    const n1 = Math.max(vars * 5, 100);
                    const n2 = 50 + 8 * indeps;
                    n = Math.max(n1, n2);
                }
            } else if (currentMethod === 'B') {
                const popVal = document.getElementById('input-populationSize').value;
                const marginVal = document.getElementById('input-marginOfError').value;
                const N = parseInt(popVal);
                const e = parseFloat(marginVal);

                if (!popVal.trim() || isNaN(N) || N < 1) {
                    showError('populationSize', 'Quy mô dân số phải là số nguyên dương ≥ 1');
                    hasError = true;
                }
                if (!marginVal.trim() || isNaN(e) || e <= 0 || e > 100) {
                    showError('marginOfError', 'Sai số cho phép e phải lớn hơn 0 và ≤ 100%');
                    hasError = true;
                }

                if (!hasError) {
                    n = N / (1 + N * Math.pow(e / 100, 2));
                }
            } else if (currentMethod === 'C') {
                const zVal = document.getElementById('input-confidenceZ').value;
                const propVal = document.getElementById('input-proportionP').value;
                const marginVal = document.getElementById('input-marginOfError').value;
                
                const z = parseFloat(zVal);
                const p = parseFloat(propVal);
                const e = parseFloat(marginVal);

                if (!propVal.trim() || isNaN(p) || p <= 0 || p >= 1) {
                    showError('proportionP', 'Tỷ lệ ước tính p phải từ 0 đến 1 (ví dụ: 0.5)');
                    hasError = true;
                }
                if (!marginVal.trim() || isNaN(e) || e <= 0 || e > 100) {
                    showError('marginOfError', 'Sai số e phải lớn hơn 0 và ≤ 100%');
                    hasError = true;
                }

                if (!hasError) {
                    n = (Math.pow(z, 2) * p * (1 - p)) / Math.pow(e / 100, 2);
                }
            }

            if (hasError) return;

            const backupRateVal = parseFloat(document.getElementById('input-backupRate').value);
            const actual = Math.ceil(n / (1 - (backupRateVal / 100)));

            theoreticalN = n;
            actualN = actual;

            // Render results
            document.getElementById('result-theoretical').innerText = n.toFixed(2);
            document.getElementById('result-actual').innerText = actual;
            document.getElementById('result-backup-desc').innerText = "Đã bao gồm " + backupRateVal + "% dự phòng phiếu hỏng";

            // Update Progress bar
            document.getElementById('step-tab-2').className = "flex items-center gap-1.5 text-emerald-600 font-semibold";
            document.getElementById('step-tab-2').innerHTML = '<span>✓</span> Thông số';
            document.getElementById('step-line-2').className = "flex-1 mx-4 h-[2px] bg-emerald-500";
            
            document.getElementById('step-tab-3').className = "flex items-center gap-1.5 text-[#712cf9] font-semibold";
            document.getElementById('step-num-3').className = "w-5 h-5 rounded-full bg-[#f3eeff] border border-[#712cf9] flex items-center justify-center text-xs";

            // Titles
            let title = '';
            let explanationHTML = '';
            if (currentMethod === 'A') {
                title = 'Nhóm phân tích SPSS (Hoàng Trọng & Hair)';
                const vars = document.getElementById('input-variablesCount').value;
                const indeps = document.getElementById('input-independentVars').value;
                const n1 = Math.max(vars * 5, 100);
                const n2 = 50 + 8 * indeps;
                
                explanationHTML = \`
                    <p class="font-medium">1. Định chuẩn cỡ mẫu phân tích nhân tố EFA (Hair et al.):</p>
                    <p class="pl-3">n₁ = Số biến quan sát × 5 = \${vars} × 5 = \${vars * 5} \${vars * 5 < 100 ? '(vì < 100 nên nâng lên tối thiểu là 100)' : ''}</p>
                    <p class="font-medium mt-1">2. Định chuẩn cỡ mẫu hồi quy đa biến (Tabachnick & Fidell):</p>
                    <p class="pl-3">n₂ = 50 + 8 × Số biến độc lập = 50 + 8 × \${indeps} = \${n2}</p>
                    <p class="font-medium mt-1">3. Cỡ mẫu lý thuyết tối thiểu:</p>
                    <p class="pl-3 text-slate-800 font-semibold">n = Max(n₁, n₂) = Max(\${n1}, \${n2}) = \${n.toFixed(2)}</p>
                    <p class="font-medium mt-1">4. Số phiếu thực tế phát ra (bao gồm \${backupRateVal}% dự phòng):</p>
                    <p class="pl-3 text-[#712cf9] font-bold">N_thucte = Math.ceil(\${n.toFixed(2)} / (1 - \${backupRateVal / 100})) = \${actual} phiếu</p>
                \`;
            } else if (currentMethod === 'B') {
                title = 'Taro Yamane (Tổng thể đã biết)';
                const N = document.getElementById('input-populationSize').value;
                const e = document.getElementById('input-marginOfError').value;
                
                explanationHTML = \`
                    <p class="font-medium">1. Công thức Taro Yamane (1967):</p>
                    <p class="pl-3 italic text-slate-700">n = N / [1 + N × e²]</p>
                    <p class="pl-3 mt-1">Trong đó: N = \${N} (Dân số), e = \${e}% = \${e / 100}</p>
                    <p class="pl-3 text-slate-800 font-semibold">n = \${N} / [1 + \${N} × (\${e / 100})²] = \${n.toFixed(2)}</p>
                    <p class="font-medium mt-1">2. Số phiếu thực tế phát ra (bao gồm \${backupRateVal}% dự phòng):</p>
                    <p class="pl-3 text-[#712cf9] font-bold">N_thucte = Math.ceil(\${n.toFixed(2)} / (1 - \${backupRateVal / 100})) = \${actual} phiếu</p>
                \`;
            } else if (currentMethod === 'C') {
                title = 'Cochran (Tổng thể chưa biết)';
                const z = document.getElementById('input-confidenceZ').value;
                const p = document.getElementById('input-proportionP').value;
                const e = document.getElementById('input-marginOfError').value;
                const zLabel = z === '1.96' ? '95% (Z = 1.96)' : '99% (Z = 2.58)';

                explanationHTML = \`
                    <p class="font-medium">1. Công thức Cochran (1977):</p>
                    <p class="pl-3 italic text-slate-700">n = [Z² × p × (1 - p)] / e²</p>
                    <p class="pl-3 mt-1">Z = \${z} (\${zLabel}), p = \${p}, e = \${e}% = \${e / 100}</p>
                    <p class="pl-3 text-slate-800 font-semibold">n = [\${z}² × \${p} × (1 - \${p})] / (\${e / 100})² = \${n.toFixed(2)}</p>
                    <p class="font-medium mt-1">2. Số phiếu thực tế phát ra (bao gồm \${backupRateVal}% dự phòng):</p>
                    <p class="pl-3 text-[#712cf9] font-bold">N_thucte = Math.ceil(\${n.toFixed(2)} / (1 - \${backupRateVal / 100})) = \${actual} phiếu</p>
                \`;
            }

            document.getElementById('result-method-title').innerText = title;
            document.getElementById('result-explanation').innerHTML = explanationHTML;

            step2.classList.add('hidden');
            step3.classList.remove('hidden');
        }

        function calculateAgain() {
            // Reset wizard progress bar
            document.getElementById('step-tab-1').className = "flex items-center gap-1.5 text-[#712cf9] font-semibold";
            document.getElementById('step-tab-1').innerHTML = '<span class="w-5 h-5 rounded-full bg-[#f3eeff] border border-[#712cf9] flex items-center justify-center text-xs">1</span> Phương pháp';
            document.getElementById('step-line-1').className = "flex-1 mx-4 h-[2px] bg-slate-100";
            
            document.getElementById('step-tab-2').className = "flex items-center gap-1.5";
            document.getElementById('step-tab-2').innerHTML = '<span class="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs" id="step-num-2">2</span> Thông số';
            document.getElementById('step-line-2').className = "flex-1 mx-4 h-[2px] bg-slate-100";

            document.getElementById('step-tab-3').className = "flex items-center gap-1.5";
            document.getElementById('step-num-3').className = "w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs";

            step3.classList.add('hidden');
            step1.classList.remove('hidden');
        }

        function copyToClipboard() {
            let infoText = "";
            let backupVal = parseFloat(document.getElementById('input-backupRate').value);
            if (currentMethod === 'A') {
                const vars = document.getElementById('input-variablesCount').value;
                const indeps = document.getElementById('input-independentVars').value;
                infoText = "Phương pháp: SPSS (Hoàng Trọng & Hair)\\n- Số lượng biến quan sát: " + vars + " biến\\n- Số lượng biến độc lập: " + indeps + " biến\\n- Tỷ lệ dự phòng: " + backupVal + "%";
            } else if (currentMethod === 'B') {
                const N = document.getElementById('input-populationSize').value;
                const e = document.getElementById('input-marginOfError').value;
                infoText = "Phương pháp: Taro Yamane\\n- Quy mô tổng thể N: " + N + " người\\n- Sai số e: " + e + "%\\n- Tỷ lệ dự phòng: " + backupVal + "%";
            } else if (currentMethod === 'C') {
                const z = document.getElementById('input-confidenceZ').value;
                const p = document.getElementById('input-proportionP').value;
                const e = document.getElementById('input-marginOfError').value;
                infoText = "Phương pháp: Cochran\\n- Hệ số tin cậy Z: " + z + "\\n- Tỷ lệ ước tính p: " + p + "\\n- Sai số e: " + e + "%\\n- Tỷ lệ dự phòng: " + backupVal + "%";
            }

            const text = "KẾT QUẢ TÍNH CỠ MẪU NGHIÊN CỨU KHOA HỌC\\n" +
                "------------------------------------------------------\\n" +
                infoText + "\\n" +
                "------------------------------------------------------\\n" +
                "Cỡ mẫu lý thuyết tối thiểu: " + theoreticalN.toFixed(2) + " mẫu\\n" +
                "SỐ PHIẾU THỰC TẾ CẦN PHÁT RA: " + actualN + " phiếu (Đã làm tròn lên)\\n" +
                "------------------------------------------------------\\n" +
                "Hệ thống tính toán cỡ mẫu nghiên cứu khoa học toàn diện";

            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);

            const toast = document.getElementById('toast');
            toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
            }, 2500);
        }
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'He_thong_tinh_co_mau_nghien_cuu.html');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowDownloadToast(true);
    setTimeout(() => setShowDownloadToast(false), 2500);
  };

  const handleFieldInput = (field: string, value: string) => {
    // Clear validation error when typing
    if (errors[field]) {
      const updated = { ...errors };
      delete updated[field];
      setErrors(updated);
    }

    switch (field) {
      case 'variablesCount': setVariablesCount(value); break;
      case 'independentVars': setIndependentVars(value); break;
      case 'populationSize': setPopulationSize(value); break;
      case 'marginOfError': setMarginOfError(value); break;
      case 'proportionP': setProportionP(value); break;
      case 'backupRate': setBackupRate(value); break;
    }
  };

  return (
    <div className="flex justify-center p-2 sm:p-4">
      <div className="w-full bg-white rounded-3xl shadow-2xl shadow-purple-900/5 border border-slate-100 overflow-hidden relative">
        
        {/* Card Header */}
        <div 
          className="bg-brand text-white rounded-2xl p-6 shadow-xl border border-brand flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
          style={{ 
            backgroundColor: brandColor,
            ...(settings?.calcBannerImage ? { backgroundImage: `url(${settings.calcBannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
          }}
        >
          {settings?.calcBannerImage && <div className="absolute inset-0 bg-black/40" />}
          
          {currentUser?.role === 'admin' && (
            <button 
              onClick={() => setShowBannerSettings(true)} 
              className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
              title="Cài đặt Banner"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          <div className="relative z-10 space-y-1.5 flex-1 text-left">
            <div className="flex items-center gap-2">
              <Calculator className="w-6 h-6 text-white" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/80">{settings?.calcBannerLabel || "Smart Research VN"}</span>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight font-display text-slate-50">{settings?.calcBannerTitle || "Công Cụ Tính Cỡ Mẫu Chuẩn"}</h1>
              </div>
            </div>
            <p className="text-xs text-white/90 max-w-2xl leading-relaxed">{settings?.calcBannerDescription || "Được đóng gói chuẩn hóa, tính toán đúng định chuẩn của Hoàng Trọng, Hair, Taro Yamane & Cochran."}</p>
          </div>
        </div>

        {/* Wizard progress bar */}
        <div className="px-6 sm:px-8 pt-6 pb-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 border-b border-slate-100 pb-4">
            <div 
              className={`flex items-center gap-1.5 transition-colors duration-200 ${
                step > 1 ? 'text-emerald-600 font-semibold' : 'font-semibold'
              }`}
              style={step > 1 ? undefined : { color: brandColor }}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all duration-200 ${
                step > 1 ? 'bg-emerald-50 text-emerald-600 border border-emerald-300' : ''
              }`}
              style={step > 1 ? undefined : { backgroundColor: brandColor + '10', color: brandColor, borderColor: brandColor }}
              >
                {step > 1 ? <Check className="w-3 h-3" /> : '1'}
              </span>
              Phương pháp
            </div>
            
            <div className={`flex-1 mx-3 h-[2px] transition-all duration-300 ${step > 1 ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
            
            <div 
              className={`flex items-center gap-1.5 transition-colors duration-200 ${
                step > 2 ? 'text-emerald-600 font-semibold' : step === 2 ? 'font-semibold' : 'text-slate-400'
              }`}
              style={step === 2 ? { color: brandColor } : undefined}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all duration-200 ${
                step > 2 ? 'bg-emerald-50 text-emerald-600 border border-emerald-300' : 
                step === 2 ? '' : 'bg-slate-50 text-slate-400 border border-slate-200'
              }`}
              style={step === 2 ? { backgroundColor: brandColor + '10', color: brandColor, borderColor: brandColor } : undefined}
              >
                {step > 2 ? <Check className="w-3 h-3" /> : '2'}
              </span>
              Nhập số liệu
            </div>
            
            <div className={`flex-1 mx-3 h-[2px] transition-all duration-300 ${step > 2 ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
            
            <div 
              className={`flex items-center gap-1.5 transition-colors duration-200 ${
                step === 3 ? 'font-semibold' : 'text-slate-400'
              }`}
              style={step === 3 ? { color: brandColor } : undefined}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all duration-200 ${
                step === 3 ? '' : 'bg-slate-50 text-slate-400 border border-slate-200'
              }`}
              style={step === 3 ? { backgroundColor: brandColor + '10', color: brandColor, borderColor: brandColor } : undefined}
              >
                3
              </span>
              Kết quả
            </div>
          </div>
        </div>

        {/* Form Body with Animating Step Panels */}
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Method selection */}
            
      {showBannerSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-7 space-y-6 text-left text-slate-800 animate-fadeIn relative">
            <button onClick={() => setShowBannerSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
            
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cài đặt Banner Module Tính Cỡ Mẫu</h2>
              <p className="text-xs text-slate-500 mt-1">Tùy chỉnh tiêu đề, mô tả và hình ảnh hiển thị cho công cụ tính cỡ mẫu.</p>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tiêu đề Banner</label>
                  <input 
                    type="text" 
                    value={bannerTitle} 
                    onChange={e => setBannerTitle(e.target.value)} 
                    placeholder="Ví dụ: Cỡ Mẫu Nghiên Cứu"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nhãn phụ (Badge)</label>
                  <input 
                    type="text" 
                    value={bannerLabel} 
                    onChange={e => setBannerLabel(e.target.value)} 
                    placeholder="Ví dụ: SAMPLE SIZE ASSISTANT"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all" 
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mô tả chi tiết</label>
                <textarea 
                  value={bannerDesc} 
                  onChange={e => setBannerDesc(e.target.value)} 
                  placeholder="Mô tả ngắn gọn về công cụ này..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all resize-none" 
                  rows={2}
                ></textarea>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ảnh bìa (Tùy chọn)</label>
                  {bannerImg && (
                    <button type="button" onClick={() => setBannerImg('')} className="text-rose-500 hover:text-rose-600 text-[10px] font-bold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg">
                      <X className="w-3 h-3" /> Xóa ảnh & dùng màu nền
                    </button>
                  )}
                </div>
                
                {bannerImg && <img src={bannerImg} alt="Preview" className="h-28 w-full rounded-2xl object-cover" />}
                <MediaSourcePicker onSelect={setBannerImg} accept="image/*" resourceType="image" folder="module-banners/calculator" label={bannerImg ? 'Thay đổi ảnh' : 'Chọn ảnh bìa'} disabled={isUploading} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-xs font-bold text-white hover:bg-brand-hover" />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowBannerSettings(false)} 
                  className="px-5 py-2.5 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading} 
                  className="px-8 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-extrabold shadow-lg shadow-brand/20 transition-all disabled:opacity-50"
                >
                  {isUploading ? 'Đang xử lý...' : 'Lưu cài đặt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <h3 className="text-base sm:text-lg font-bold text-slate-800 font-display">
                  Bạn muốn tính cỡ mẫu theo phương pháp nào?
                </h3>
                
                <div className="grid grid-cols-1 gap-3.5">
                  
                  {/* Method A */}
                  <button 
                    onClick={() => handleSelectMethod('A')}
                    className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-purple-200 hover:bg-purple-50/10 transition-all group flex gap-4 cursor-pointer focus:outline-none"
                  >
                    <div className="p-3 rounded-xl bg-purple-50 text-[#712cf9] group-hover:bg-[#f3eeff] transition-colors shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm sm:text-base transition-colors" style={{ color: brandColor }}>
                        (A) Nhóm Phân tích SPSS (EFA & Hồi quy - Theo Hoàng Trọng & Hair)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Thang đo Likert, dựa trên tích số của biến quan sát (EFA) và số biến độc lập (Mô hình hồi quy).
                      </p>
                    </div>
                  </button>

                  {/* Method B */}
                  <button 
                    onClick={() => handleSelectMethod('B')}
                    className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-purple-200 hover:bg-purple-50/10 transition-all group flex gap-4 cursor-pointer focus:outline-none"
                  >
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm sm:text-base transition-colors" style={{ color: brandColor }}>
                        (B) Khảo sát cộng đồng - Đã biết tổng thể (Taro Yamane)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Sử dụng khi đã xác định được chính xác quy mô tổng số dân (N) trong quần thể nghiên cứu.
                      </p>
                    </div>
                  </button>

                  {/* Method C */}
                  <button 
                    onClick={() => handleSelectMethod('C')}
                    className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-purple-200 hover:bg-purple-50/10 transition-all group flex gap-4 cursor-pointer focus:outline-none"
                  >
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm sm:text-base transition-colors" style={{ color: brandColor }}>
                        (C) Khảo sát cộng đồng - Chưa biết tổng thể (Cochran)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Áp dụng khi tổng thể dân số rất lớn, vô hạn hoặc không xác định rõ quy mô chính xác.
                      </p>
                    </div>
                  </button>

                </div>
              </motion.div>
            )}

            {/* STEP 2: DYNAMIC INPUTS */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#712cf9] bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md uppercase">
                    Phương pháp {method}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {method === 'A' ? 'Định chuẩn SPSS' : method === 'B' ? 'Taro Yamane' : 'Cochran'}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-800 font-display">
                  Nhập số liệu để thực hiện tính toán
                </h3>

                <div className="space-y-4 pt-1">
                  
                  {/* Method A Inputs */}
                  {method === 'A' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Số lượng biến quan sát (câu hỏi)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            value={variablesCount}
                            onChange={(e) => handleFieldInput('variablesCount', e.target.value)}
                            className={`w-full bg-slate-50 border ${errors.variablesCount ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-brand'} focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none transition-all`}
                            placeholder="Ví dụ: 20"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">biến</span>
                        </div>
                        {errors.variablesCount && (
                          <p className="text-xs text-rose-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.variablesCount}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Số lượng biến độc lập
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            value={independentVars}
                            onChange={(e) => handleFieldInput('independentVars', e.target.value)}
                            className={`w-full bg-slate-50 border ${errors.independentVars ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-brand'} focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none transition-all`}
                            placeholder="Ví dụ: 5"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">biến</span>
                        </div>
                        {errors.independentVars && (
                          <p className="text-xs text-rose-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.independentVars}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Method B Inputs */}
                  {method === 'B' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Quy mô tổng thể dân số (N)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            value={populationSize}
                            onChange={(e) => handleFieldInput('populationSize', e.target.value)}
                            className={`w-full bg-slate-50 border ${errors.populationSize ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-brand'} focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none transition-all`}
                            placeholder="Ví dụ: 1000"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">người</span>
                        </div>
                        {errors.populationSize && (
                          <p className="text-xs text-rose-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.populationSize}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Sai số cho phép (e, %)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.1"
                            value={marginOfError}
                            onChange={(e) => handleFieldInput('marginOfError', e.target.value)}
                            className={`w-full bg-slate-50 border ${errors.marginOfError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-brand'} focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none transition-all`}
                            placeholder="Mặc định: 5"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">%</span>
                        </div>
                        {errors.marginOfError && (
                          <p className="text-xs text-rose-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.marginOfError}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Method C Inputs */}
                  {method === 'C' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Mức độ tin cậy Z
                        </label>
                        <select 
                          value={confidenceZ}
                          onChange={(e) => setConfidenceZ(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none transition-all cursor-pointer"
                        >
                          <option value="1.96">95% (Z = 1.96)</option>
                          <option value="2.58">99% (Z = 2.58)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Tỷ lệ ước tính p
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.05"
                            value={proportionP}
                            onChange={(e) => handleFieldInput('proportionP', e.target.value)}
                            className={`w-full bg-slate-50 border ${errors.proportionP ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-brand'} focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none transition-all`}
                            placeholder="Mặc định: 0.5"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">p</span>
                        </div>
                        {errors.proportionP && (
                          <p className="text-xs text-rose-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.proportionP}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Sai số cho phép (e, %)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.1"
                            value={marginOfError}
                            onChange={(e) => handleFieldInput('marginOfError', e.target.value)}
                            className={`w-full bg-slate-50 border ${errors.marginOfError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-brand'} focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none transition-all`}
                            placeholder="Mặc định: 5"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">%</span>
                        </div>
                        {errors.marginOfError && (
                          <p className="text-xs text-rose-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.marginOfError}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Fixed Always present Input */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-4">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Tỷ lệ dự phòng phiếu hỏng (%)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={backupRate}
                        onChange={(e) => handleFieldInput('backupRate', e.target.value)}
                        className={`w-full bg-slate-50 border ${errors.backupRate ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-brand'} focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none transition-all`}
                        placeholder="Mặc định: 10"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">%</span>
                    </div>
                    {errors.backupRate && (
                      <p className="text-xs text-rose-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.backupRate}</p>
                    )}
                  </div>

                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                  </button>
                  <button 
                    onClick={handleCalculate}
                    className="flex-[2] py-3.5 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20 cursor-pointer"
                  >
                    Tính Toán
                  </button>
                </div>

              </motion.div>
            )}

            {/* STEP 3: RESULTS DISPLAY */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 text-center"
              >
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-brand uppercase bg-brand-light px-3 py-1 rounded-full border border-brand/10">
                    BÁO CÁO KẾT QUẢ CỠ MẪU
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-2 font-display">
                    {getMethodName()}
                  </h3>
                </div>

                {/* Grid Comparison result display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center items-center">
                    <span className="text-xs font-semibold text-slate-500 mb-1">
                      Cỡ mẫu lý thuyết tối thiểu
                    </span>
                    <div className="text-2xl font-bold text-slate-800 font-display">
                      {theoreticalN.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">
                      (Theo công thức toán gốc)
                    </span>
                  </div>

                  <div className="bg-brand-light/30 rounded-2xl p-5 border-2 border-brand/20 flex flex-col justify-center items-center relative overflow-hidden">
                    <span className="text-xs font-bold text-brand mb-1 uppercase tracking-wide">
                      Số phiếu thực tế cần phát ra
                    </span>
                    <div className="text-4xl font-extrabold text-brand font-display">
                      {actualN}
                    </div>
                    <span className="text-[10px] text-brand/80 mt-1 font-semibold">
                      (Đã gộp {backupRate}% dự phòng phiếu hỏng)
                    </span>
                  </div>

                </div>

                {/* Explanation container */}
                <div className="text-left bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                    <BookOpen className="w-4 h-4 text-brand" />
                    <span>Công thức áp dụng và diễn giải cụ thể:</span>
                  </div>
                  
                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed font-sans">
                    {method === 'A' && (
                      <>
                        <div>
                          <p className="font-semibold text-slate-800">1. Định chuẩn phân tích nhân tố khám phá EFA (Hair et al.):</p>
                          <p className="pl-3 mt-0.5 text-slate-500">n₁ = Số biến quan sát × 5 = {variablesCount} × 5 = {parseInt(variablesCount) * 5} {parseInt(variablesCount) * 5 < 100 ? '(chuẩn hóa tối thiểu là 100 mẫu)' : ''}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">2. Định chuẩn hồi quy tuyến tính hồi quy (Tabachnick & Fidell):</p>
                          <p className="pl-3 mt-0.5 text-slate-500">n₂ = 50 + 8 × Số biến độc lập = 50 + 8 × {independentVars} = {50 + 8 * parseInt(independentVars)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">3. Cỡ mẫu lý thuyết sau định chuẩn:</p>
                          <p className="pl-3 mt-0.5 text-slate-800">n = Max(n₁, n₂) = Max({Math.max(parseInt(variablesCount) * 5, 100)}, {50 + 8 * parseInt(independentVars)}) = <span className="font-bold">{theoreticalN.toFixed(2)}</span></p>
                        </div>
                      </>
                    )}

                    {method === 'B' && (
                      <>
                        <div>
                          <p className="font-semibold text-slate-800">1. Công thức Taro Yamane (1967) tổng thể hữu hạn:</p>
                          <p className="pl-3 font-mono text-slate-500 text-[10px] my-1 bg-white border border-slate-200/50 p-1 rounded-md text-center">n = N / (1 + N × e²)</p>
                          <p className="pl-3 text-slate-500">N = {populationSize} (Dân số), e = {marginOfError}% = {parseFloat(marginOfError) / 100}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">2. Thế số tính toán mẫu lý thuyết tối thiểu:</p>
                          <p className="pl-3 text-slate-700">n = {populationSize} / (1 + {populationSize} × {parseFloat(marginOfError) / 100}²) = <span className="font-bold">{theoreticalN.toFixed(2)}</span></p>
                        </div>
                      </>
                    )}

                    {method === 'C' && (
                      <>
                        <div>
                          <p className="font-semibold text-slate-800">1. Công thức Cochran (1977) tổng thể vô hạn:</p>
                          <p className="pl-3 font-mono text-slate-500 text-[10px] my-1 bg-white border border-slate-200/50 p-1 rounded-md text-center">n = (Z² × p × (1 - p)) / e²</p>
                          <p className="pl-3 text-slate-500">Z = {confidenceZ} ({confidenceZ === '1.96' ? 'Tin cậy 95%' : 'Tin cậy 99%'}), p = {proportionP}, e = {marginOfError}%</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">2. Thế số tính toán mẫu lý thuyết tối thiểu:</p>
                          <p className="pl-3 text-slate-700 font-medium">n = ({confidenceZ}² × {proportionP} × (1 - {proportionP})) / {parseFloat(marginOfError) / 100}² = <span className="font-bold">{theoreticalN.toFixed(2)}</span></p>
                        </div>
                      </>
                    )}

                    <div className="border-t border-slate-200/60 pt-2 p-2 rounded-lg" style={{ backgroundColor: brandColor + '10' }}>
                      <p className="font-bold" style={{ color: brandColor }}>Tính mẫu thực tế gồm hao hụt (dự phòng {backupRate}%):</p>
                      <p className="pl-2 mt-0.5 text-[11px] text-slate-700 leading-normal">
                        N_thucte = Math.ceil(n / (1 - d)) = Math.ceil({theoreticalN.toFixed(2)} / (1 - {parseFloat(backupRate) / 100})) = <span className="font-bold text-sm" style={{ color: brandColor }}>{actualN} phiếu</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button 
                    onClick={copyResults}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" /> Sao chép kết quả
                  </button>
                  <button 
                    onClick={handleReset}
                    style={{ backgroundColor: brandColor }}
                    className="w-full sm:flex-[2] py-3.5 px-4 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Tính lại từ đầu
                  </button>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Floating alerts */}
        <AnimatePresence>
          {showCopyToast && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 left-4 right-4 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 justify-center"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Đã sao chép báo cáo kết quả thành công!</span>
            </motion.div>
          )}

          {showDownloadToast && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 left-4 right-4 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 justify-center"
            >
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Đã tải xuống file HTML đơn lẻ để lưu trữ ngoại tuyến!</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
