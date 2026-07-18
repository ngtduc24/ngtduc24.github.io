import React from 'react';
import { BookOpen, Layers, Users, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function GuideSection() {
  const formulas = [
    {
      title: '1. Định chuẩn phân tích SPSS (EFA & Hồi quy)',
      subtitle: 'Theo Giáo sư Hoàng Trọng & Hair et al.',
      icon: Layers,
      color: 'bg-brand-light text-brand border-brand-light',
      description: 'Khi thực hiện đề tài nghiên cứu sử dụng phân tích định lượng (SPSS/AMOS), cỡ mẫu được tính toán dựa trên số lượng câu hỏi quan sát và biến số độc lập của mô hình nghiên cứu.',
      details: [
        { name: 'Phân tích nhân tố khám phá (EFA):', math: 'n₁ = Số lượng biến quan sát × 5', text: 'Hair et al. khuyến cáo tỷ lệ tối thiểu là 5:1 (tức là 1 biến quan sát cần ít nhất 5 quan sát). Tốt nhất là 10:1. Ngoài ra, cỡ mẫu tối thiểu tuyệt đối cho phân tích EFA nên là 100 mẫu.' },
        { name: 'Mô hình hồi quy đa biến:', math: 'n₂ = 50 + 8 × m (với m là số lượng biến độc lập)', text: 'Theo Tabachnick & Fidell (hoặc công thức Green 1991), nhằm đảm bảo độ tin cậy để tìm thấy hiệu ứng thống kê có thật khi kiểm định mô hình hồi quy đa biến.' },
        { name: 'Cỡ mẫu tổng hợp cuối cùng:', math: 'n = Max(n₁, n₂)', text: 'Chúng ta sẽ lấy giá trị lớn nhất trong hai giá trị trên để đồng thời thỏa mãn cả hai phép phân tích nhân tố khám phá EFA và phép hồi quy tuyến tính trong SPSS.' }
      ]
    },
    {
      title: '2. Công thức Taro Yamane (1967)',
      subtitle: 'Khảo sát cộng đồng khi đã xác định được quy mô tổng thể (N)',
      icon: Users,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      description: 'Thường được áp dụng trong khảo sát xã hội học khi bạn có dữ liệu chính xác về quy mô dân số (ví dụ: Tổng số nhân viên công ty, số hộ dân của một phường, tổng số sinh viên của một trường đại học).',
      details: [
        { name: 'Công thức toán học:', math: 'n = N / (1 + N × e²)', text: 'Trong đó: n là cỡ mẫu tối thiểu cần khảo sát; N là quy mô tổng thể dân số; e là sai số cho phép (ví dụ: e = 5% tức là 0.05, e = 10% tức là 0.1).' },
        { name: 'Đặc điểm:', math: 'Nhạy cảm với quy mô tổng thể N', text: 'Khi N càng nhỏ, cỡ mẫu n chiếm tỷ lệ càng lớn so với tổng thể. Khi N rất lớn, mẫu n sẽ bão hòa tiệm cận về giới hạn nhất định tùy thuộc sai số e.' }
      ]
    },
    {
      title: '3. Công thức Cochran (1977)',
      subtitle: 'Khảo sát cộng đồng khi quy mô dân số rất lớn hoặc chưa thể xác định',
      icon: BookOpen,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      description: 'Dành cho nghiên cứu khảo sát thị trường tự do, khảo sát ý kiến khách hàng vãng lai hoặc khảo sát dân cư một thành phố lớn có quy mô vô hạn (hoặc quy mô chưa xác định rõ).',
      details: [
        { name: 'Công thức gốc:', math: 'n = (Z² × p × (1 - p)) / e²', text: 'Trong đó: Z là giá trị tra bảng phân phối chuẩn tương ứng với mức tin cậy lựa chọn (Z = 1.96 cho độ tin cậy 95%, Z = 2.58 cho độ tin cậy 99%); p là tỷ lệ ước tính của tổng thể (được chọn p = 0.5 để tối đa hóa phương sai, giúp cỡ mẫu tính ra đạt giá trị an toàn cao nhất); e là sai số cho phép.' },
        { name: 'Ứng dụng thực tế:', math: 'Thường ra kết quả n = 384 mẫu', text: 'Với độ tin cậy 95% (Z = 1.96), tỷ lệ ước lượng p = 0.5 và sai số cho phép e = 5%, công thức Cochran sẽ cho ra cỡ mẫu tối thiểu lý thuyết là 384 mẫu. Đây là một con số kinh điển trong nghiên cứu khoa học.' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Intro section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
        <h3 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand" />
          <span>Cơ sở lý thuyết và Hướng dẫn lựa chọn công thức</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Mỗi đề tài nghiên cứu khoa học sẽ có những đặc thù riêng về phương pháp thu thập dữ liệu và phân tích thống kê. 
          Việc chọn sai công thức tính toán cỡ mẫu có thể dẫn đến việc thiếu đại diện mẫu hoặc lãng phí nguồn lực phát phiếu. 
          Hãy đọc hướng dẫn dưới đây để áp dụng một cách chính xác nhất.
        </p>
      </div>

      {/* Grid of Formulas */}
      <div className="grid grid-cols-1 gap-6">
        {formulas.map((formula, idx) => {
          const Icon = formula.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${formula.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm sm:text-base font-display">{formula.title}</h4>
                  <p className="text-[11px] text-slate-400 font-medium">{formula.subtitle}</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed italic border-l-4 border-brand/20 pl-3">
                  {formula.description}
                </p>

                {/* Formula parts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {formula.details.map((detail, dIdx) => (
                    <div key={dIdx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                          {detail.name}
                        </span>
                        <div className="font-mono text-xs font-bold text-brand py-1 px-2.5 bg-brand-light rounded-md border border-brand-light w-max mb-2">
                          {detail.math}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans mt-1">
                        {detail.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommended steps banner */}
      <div className="bg-emerald-50/30 border border-emerald-100/60 rounded-2xl p-5 flex items-start gap-3.5">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Lời khuyên khi tính toán cỡ mẫu thực tế:</h4>
          <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 leading-relaxed pl-1">
            <li><strong>Luôn thêm tỷ lệ dự phòng:</strong> Quá trình phát phiếu trực tuyến hoặc phỏng vấn trực tiếp luôn có tỷ lệ phiếu không hợp lệ (bị bỏ trống, trả lời không trung thực). Hãy sử dụng tỷ lệ dự phòng từ <strong>10% đến 20%</strong> để an toàn.</li>
            <li><strong>Tính toán theo mục tiêu cao nhất:</strong> Nếu đề tài của bạn vừa chạy phân tích EFA và vừa chạy hồi quy, hãy chọn tính theo định chuẩn SPSS để tự động lấy giá trị lớn nhất trong cả hai phương pháp.</li>
            <li><strong>Tham khảo ý kiến giáo viên hướng dẫn:</strong> Mỗi trường đại học và hội đồng khoa học có thể ưu tiên áp dụng một định chuẩn riêng, hãy kiểm tra lại yêu cầu trước khi nộp báo cáo.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}
