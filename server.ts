import { v2 as cloudinary } from 'cloudinary';
import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Cho phép ảnh, video và tài liệu dùng chung qua Cloudinary/Thư viện.
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

// Initialize Gemini Client lazily to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set.");
    }
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "dummy_key",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Helper function to call Gemini with retry logic and model fallback
 */
async function callGemini(params: {
  prompt: string | any[];
  model?: string;
  config?: any;
  retryCount?: number;
}) {
  const { prompt, config, retryCount = 0 } = params;
  let modelName = params.model || "gemini-3.5-flash";
  
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: modelName,
      contents: typeof prompt === 'string' ? prompt : prompt,
      config: config
    });
    return response;
  } catch (error: any) {
    // Check for 429 (Quota Exceeded)
    const isQuotaError = error?.message?.includes("429") || error?.status === 429;
    
    if (isQuotaError && retryCount < 2) {
      const waitTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      console.warn(`Gemini Quota hit for ${modelName}. Retrying in ${Math.round(waitTime)}ms... (Attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // On second retry, try a fallback model if we were using the primary one
      let nextModel = modelName;
      if (retryCount === 1 && modelName === "gemini-3.5-flash") {
        nextModel = "gemini-3.1-flash-lite";
        console.warn(`Switching to fallback model: ${nextModel}`);
      }
      
      return callGemini({ prompt, model: nextModel, config, retryCount: retryCount + 1 });
    }
    throw error;
  }
}

// API endpoint to analyze PDF using server-side Gemini API

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.post("/api/upload", async (req, res) => {
  let tempFilePath: string | null = null;
  try {
    const { image, file, resourceType = 'auto', folder = 'shared_library', originalFilename = '' } = req.body;
    const source = file || image;
    if (!source) {
      return res.status(400).json({ error: "Thiếu dữ liệu tệp tải lên." });
    }
    
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn("Chưa cấu hình Cloudinary, trả về ảnh gốc base64.");
      return res.json({ url: source, secureUrl: source, resourceType: 'local' });
    }

    const safeFolder = String(folder).replace(/[^a-zA-Z0-9_/-]/g, '_');
    const uploadOptions: Record<string, unknown> = {
      folder: `smart_research_vn/${safeFolder}`,
      resource_type: resourceType === 'image' || resourceType === 'video' || resourceType === 'raw' ? resourceType : 'auto'
    };
    if (resourceType === 'image' || resourceType === 'auto') {
      uploadOptions.fetch_format = 'auto';
      uploadOptions.quality = 'auto';
    }

    let uploadSource = source;
    if (typeof source === 'string' && source.startsWith('data:')) {
      const match = source.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const extension = mimeType.split('/')[1] || 'bin';
        const tempFileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}.${extension}`;
        tempFilePath = path.join(os.tmpdir(), tempFileName);
        fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));
        uploadSource = tempFilePath;
      }
    }

    let result;
    if (uploadOptions.resource_type === 'video') {
      result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_large(uploadSource, uploadOptions, (error, res) => {
          if (error) reject(error);
          else resolve(res);
        });
      });
    } else {
      result = await cloudinary.uploader.upload(uploadSource, uploadOptions);
    }
    
    return res.json({
      url: result.secure_url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
      originalFilename
    });
  } catch (error: any) {
    console.error("Lỗi upload Cloudinary:", error);
    return res.status(500).json({ error: error?.message || "Lỗi tải ảnh lên." });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error("Lỗi khi xóa file tạm:", err);
      }
    }
  }
});

// API endpoint to analyze PDF using server-side Gemini API
app.post("/api/journal/analyze", async (req, res) => {
  try {
    const { pdfBase64, fileName } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "Thiếu dữ liệu PDF base64." });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    const prompt = `Bạn là một trợ lý AI chuyên nghiệp trong nghiên cứu khoa học. 
Hãy phân tích tài liệu/bài báo khoa học hoặc bảng danh sách tạp chí đã tải lên này (${fileName || "tài liệu.pdf"}).
Tài liệu này có thể chứa một bảng có rất nhiều tạp chí khoa học hoặc một bài báo cụ thể. Hãy trích xuất HẾT tất cả các tạp chí khoa học xuất hiện trong bảng hoặc tài liệu này.
Với mỗi tạp chí khoa học tìm thấy, hãy trích xuất chính xác các thông tin sau:
1. Tên tạp chí khoa học (name): tên đầy đủ của tạp chí khoa học chứa bài báo này.
2. Mã ISSN (issn): mã số tiêu chuẩn quốc tế cho xuất bản phẩm nhiều kỳ (nếu không thấy, điền rỗng hoặc tự suy đoán dựa trên tạp chí).
3. Phân loại (type): loại tạp chí (ví dụ: Tạp chí, Kỷ yếu hội thảo, Tạp chí Scopus, Tạp chí SCIE, Tạp chí Trong nước...).
4. Cơ quan xuất bản (publisher): cơ quan chủ quản, viện nghiên cứu, trường đại học hoặc nhà xuất bản.
5. Ngành (field): Ngành hoặc lĩnh vực nghiên cứu (ví dụ: Y học, Kinh tế, Công nghệ thông tin, Giáo dục...). Hãy cố gắng khớp với các ngành khoa học phổ biến.
6. Điểm tạp chí (score): Điểm tối đa hoặc điểm tạp chí (ví dụ: "0 – 0,75", "1.5", "1.0", mặc định "1.0" nếu không rõ).
7. Ngày thành lập (establishedDate): Năm hoặc ngày thành lập tạp chí (ví dụ: "2010" hoặc "15/05/2005" hoặc rỗng nếu không rõ).
8. Số lượng bài báo (paperCount): Số lượng bài báo đã xuất bản ước tính (mặc định 100 nếu không rõ).
9. Độ uy tín (rating): Đánh giá độ uy tín từ 1 đến 5 sao vàng (nguyên từ 1 đến 5).
10. Giới thiệu chi tiết (description): Đoạn văn giới thiệu tổng quan hoặc tóm tắt chi tiết về tạp chí hoặc bài báo khoa học này.

Vui lòng trả về kết quả theo cấu trúc JSON định sẵn chứa danh sách (array) các tạp chí khoa học.`;

    const response = await callGemini({
      model: "gemini-3.5-flash",
      prompt: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: "application/pdf"
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            journals: {
              type: Type.ARRAY,
              description: "Danh sách tất cả các tạp chí khoa học trích xuất được từ bảng hoặc bài báo",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Tên tạp chí khoa học" },
                  issn: { type: Type.STRING, description: "Mã ISSN" },
                  type: { type: Type.STRING, description: "Loại tạp chí" },
                  publisher: { type: Type.STRING, description: "Cơ quan xuất bản" },
                  field: { type: Type.STRING, description: "Ngành khoa học" },
                  score: { type: Type.STRING, description: "Điểm tạp chí" },
                  establishedDate: { type: Type.STRING, description: "Ngày thành lập" },
                  paperCount: { type: Type.INTEGER, description: "Số lượng báo" },
                  rating: { type: Type.INTEGER, description: "Độ uy tín (1-5)" },
                  description: { type: Type.STRING, description: "Giới thiệu/mô tả" }
                },
                required: ["name"]
              }
            }
          },
          required: ["journals"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Không nhận được phản hồi từ Gemini.");
    }

    const data = JSON.parse(textResult.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Lỗi phân tích tài liệu PDF:", error);
    const isQuotaError = error?.message?.includes("429") || error?.status === 429;
    const message = isQuotaError 
      ? "Bạn đã vượt quá giới hạn lượt gọi AI miễn phí. Vui lòng thử lại sau vài phút hoặc liên hệ quản trị viên." 
      : (error?.message || "Lỗi xử lý AI trên máy chủ.");
    return res.status(isQuotaError ? 429 : 500).json({ error: message });
  }
});

// Endpoint 1: QDA Auto-Coding
app.post("/api/qda/auto-code", async (req, res) => {
  try {
    const { documentText, existingCodes } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Thiếu thông tin văn bản." });
    }
    
    // It's okay if existingCodes is empty, it just means AI can only propose new codes
    const codeList = existingCodes && existingCodes.length > 0 
      ? existingCodes.map((c: any) => `- ${c.name}: ${c.description || ''}`).join('\n')
      : "Chưa có mã nào.";

    const prompt = `Bạn là một chuyên gia phân tích dữ liệu định tính (Qualitative Data Analyst) cao cấp.
Nhiệm vụ của bạn là đọc kỹ đoạn văn bản (Transcript) sau và thực hiện 2 việc theo đúng thứ tự:

1. ƯU TIÊN TUYỆT ĐỐI GẮN MÃ CÓ SẴN: Tìm các đoạn trích dẫn (quotes) trong văn bản thể hiện RÕ RÀNG VÀ CHÍNH XÁC ý nghĩa của các mã (codes) CÓ SẴN (được cung cấp bên dưới).
2. CHỈ ĐỀ XUẤT MÃ MỚI KHI THỰC SỰ CẦN THIẾT: Chỉ khi nào có những đoạn trích dẫn chứa thông tin vô cùng quan trọng nhưng KHÔNG THỂ xếp vào bất kỳ mã có sẵn nào, bạn mới được phép đề xuất mã mới.

Danh sách các mã có sẵn:
${codeList}

Văn bản:
"""
${documentText}
"""

YÊU CẦU CHẤT LƯỢNG (RẤT QUAN TRỌNG):
- Trích dẫn (text) phải CÓ Ý NGHĨA TRỌN VẸN. TUYỆT ĐỐI KHÔNG cắt ngang từ (ví dụ: không lấy "sử dụ" mà phải lấy nguyên chữ "sử dụng"). Nên trọn vẹn cả câu hoặc mệnh đề ngữ pháp.
- Nội dung trích dẫn phải liên quan TRỰC TIẾP và CHẶT CHẼ đến ý nghĩa của mã được gắn. (Ví dụ: Đừng gắn mã "Xăng" cho một câu nói về "cơ sở kinh doanh" không hề liên quan đến bản chất của "Xăng").
- Nếu không chắc chắn, thà bỏ qua (không gắn mã) còn hơn là gắn sai hoặc khiên cưỡng.

Chú ý định dạng:
1. Nếu mã bạn dùng là mã CÓ SẴN, 'isNewCode' = false, 'codeName' phải khớp chính xác tên mã có sẵn.
2. Nếu mã bạn dùng là mã MỚI, 'isNewCode' = true, và bắt buộc cung cấp thêm 'description'.
3. Trường 'text' của mỗi trích dẫn PHẢI LÀ chuỗi con chính xác tuyệt đối nằm trong Văn bản.
4. Vị trí 'startIndex' và 'endIndex' phải khớp chính xác với ký tự đầu và cuối của chuỗi 'text' đó trong Văn bản.`;

    const response = await callGemini({
      model: "gemini-2.5-pro", // Sử dụng mô hình Pro 2.5 để phân tích ngữ nghĩa sâu và chính xác hơn
      prompt: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              description: "Danh sách các đoạn văn bản được gắn mã",
              items: {
                type: Type.OBJECT,
                properties: {
                  codeName: { type: Type.STRING, description: "Tên mã (Có sẵn hoặc Mới)" },
                  isNewCode: { type: Type.BOOLEAN, description: "True nếu đây là mã mới do AI đề xuất, False nếu là mã có sẵn" },
                  description: { type: Type.STRING, description: "Mô tả nếu là mã mới" },
                  startIndex: { type: Type.INTEGER, description: "Chỉ số ký tự bắt đầu của trích dẫn" },
                  endIndex: { type: Type.INTEGER, description: "Chỉ số ký tự kết thúc của trích dẫn" },
                  text: { type: Type.STRING, description: "Chuỗi văn bản trích dẫn chính xác" },
                  explanation: { type: Type.STRING, description: "Giải thích ngắn gọn lý do gắn mã" }
                },
                required: ["codeName", "isNewCode", "startIndex", "endIndex", "text"]
              }
            }
          },
          required: ["suggestions"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return res.json({ suggestions: [] });
    }

    return res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error("Lỗi AI Auto-Coding:", error);
    const isQuotaError = error?.message?.includes("429") || error?.status === 429;
    const message = isQuotaError 
      ? "Bạn đã vượt quá giới hạn lượt gọi AI miễn phí. Vui lòng thử lại sau vài phút." 
      : (error?.message || "Lỗi xử lý AI Auto-coding.");
    return res.status(isQuotaError ? 429 : 500).json({ error: message });
  }
});

// Endpoint 2: QDA Thematic Synthesis
app.post("/api/qda/thematic-synthesis", async (req, res) => {
  try {
    const { codeName, quotes } = req.body;
    if (!codeName || !quotes || quotes.length === 0) {
      return res.status(400).json({ error: "Thiếu tên chủ đề hoặc danh sách phát biểu trích dẫn." });
    }

    const prompt = `Bạn là một nhà nghiên cứu khoa học chuyên nghiệp, thành thạo phương pháp luận phân tích định tính và viết luận văn học thuật ISI/Scopus.
Hãy viết một đoạn tổng hợp học thuật tự sự (academic thematic narrative synthesis) bằng tiếng Việt cho chủ đề: "${codeName}".

Dưới đây là danh sách các đoạn phát biểu (quotes) trích dẫn trực tiếp thu thập được từ các cuộc phỏng vấn sâu thực địa:
${quotes.map((q: string, i: number) => `- Trích dẫn ${i + 1}: "${q}"`).join('\n')}

Yêu cầu báo cáo:
1. Phân tích, tổng hợp sâu sắc mối liên hệ giữa các phát biểu này để tìm ra ý nghĩa cốt lõi của chủ đề "${codeName}".
2. Lồng ghép các đoạn trích dẫn trên một cách khéo léo, tự nhiên để làm minh chứng thực nghiệm sinh động cho các lập luận khoa học của bạn.
3. Văn phong học thuật, chuẩn mực, lập luận sắc bén, khách quan, thích hợp làm nguồn văn bản chèn vào chương kết quả nghiên cứu định tính trong luận án tiến sĩ hoặc bài báo ISI.
4. Tránh dùng các từ sáo rỗng hoặc tự xưng. Độ dài khoảng 250 - 350 từ.`;

    const response = await callGemini({
      model: "gemini-3.5-flash",
      prompt: prompt
    });

    const synthesis = response.text || "Không tạo được tóm tắt chủ đề từ AI.";
    return res.json({ synthesis });
  } catch (error: any) {
    console.error("Lỗi AI Thematic Synthesis:", error);
    const isQuotaError = error?.message?.includes("429") || error?.status === 429;
    const message = isQuotaError 
      ? "Bạn đã vượt quá giới hạn lượt gọi AI miễn phí. Vui lòng thử lại sau vài phút." 
      : (error?.message || "Lỗi xử lý AI Synthesis.");
    return res.status(isQuotaError ? 429 : 500).json({ error: message });
  }
});


// Endpoint 3: Gửi thông báo FCM
app.post("/api/fcm/send", async (req, res) => {
  try {
    const { tokens, title, body, icon, click_action } = req.body;
    if (!tokens || !tokens.length) {
      return res.status(400).json({ error: "Không có token FCM nào để gửi." });
    }

    const serverKey = process.env.FCM_SERVER_KEY;
    if (!serverKey) {
      console.warn("Chưa cấu hình FCM_SERVER_KEY, bỏ qua việc gửi FCM thực tế.");
      return res.json({ success: true, message: "Mô phỏng gửi FCM thành công (thiếu FCM_SERVER_KEY)." });
    }

    // FCM Legacy HTTP API (since we don't have service account JSON configured for HTTP v1 easily)
    const responses = await Promise.all(tokens.map(token => {
      return fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'key=' + serverKey
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title,
            body,
            icon: icon || '/vite.svg',
            click_action: click_action || '/'
          }
        })
      });
    }));

    return res.json({ success: true, message: `Đã gửi thông báo tới ${tokens.length} thiết bị.` });
  } catch (error: any) {
    console.error("Lỗi gửi FCM:", error);
    return res.status(500).json({ error: error?.message || "Lỗi xử lý FCM." });
  }
});

async function startServer() {
  app.get("/tracuu", (req, res) => {
    res.redirect("/tracuu.html");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Cấu hình các HTTP headers để hướng dẫn Cloudflare tự động cache toàn bộ file tĩnh (JS, CSS, Ảnh, Fonts...)
    app.use(express.static(distPath, {
      maxAge: '1y',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          // File HTML (index.html, tracuu.html) không lưu cache lâu để đảm bảo người dùng luôn nhận được bản cập nhật mới nhất
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
          // File tĩnh: Cache trên trình duyệt 1 năm và hướng dẫn Cloudflare (s-maxage) cache vĩnh viễn trên Edge node
          res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
