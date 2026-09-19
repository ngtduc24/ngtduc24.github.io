const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const targetBlock = `app.post("/api/qda/auto-code", async (req, res) => {
  try {
    const { documentText, existingCodes } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Thiếu thông tin văn bản." });
    }
    
    const codesInfo = existingCodes && existingCodes.length > 0 
      ? "Danh sách Mã/Chủ đề (Codes) hiện có:\\n" + existingCodes.map(c => \`- Tên mã: "\${c.name}"\\n  Mô tả: \${c.description || 'Không có'}\`).join("\\n")
      : "Hiện tại chưa có mã nào.";

    const prompt = \`Bạn là chuyên gia phân tích dữ liệu định tính.
Nhiệm vụ: Gán các đoạn trích dẫn từ văn bản phỏng vấn sau vào các Mã/Chủ đề (Codes) ĐÃ CÓ.

Văn bản phỏng vấn:
"""
\${documentText}
"""

\${codesInfo}

YÊU CẦU BẮT BUỘC:
1. CHỈ SỬ DỤNG CÁC MÃ ĐÃ CÓ TRONG DANH SÁCH TRÊN. TUYỆT ĐỐI KHÔNG TỰ TẠO MÃ MỚI.
2. Tên mã (codeName) trả về phải TRÙNG KHỚP CHÍNH XÁC 100% (cả viết hoa, viết thường, dấu cách) với tên mã trong danh sách.
3. Trích xuất ít nhất 3-5 đoạn trích dẫn phù hợp với các mã đã có.
4. Trường 'text' của mỗi trích dẫn PHẢI LÀ chuỗi con chính xác tuyệt đối nằm trong Văn bản phỏng vấn.
5. Vị trí 'startIndex' và 'endIndex' phải khớp chính xác với ký tự đầu và cuối của chuỗi 'text' đó trong Văn bản phỏng vấn.
6. Viết lời giải thích ngắn gọn lý do gán.\`;

    let codeNameSchema = { 
      type: Type.STRING, 
      description: "Tên mã (codeName) BẮT BUỘC TRÙNG KHỚP 100% với một trong các tên mã đã có." 
    };
    if (existingCodes && existingCodes.length > 0) {
      codeNameSchema.enum = existingCodes.map(c => c.name);
    }

    const response = await callGemini({
      model: "gemini-3.5-flash",
      prompt: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              description: "Danh sách các đề xuất mã hóa vào chủ đề ĐÃ CÓ",
              items: {
                type: Type.OBJECT,
                properties: {
                  codeName: codeNameSchema,
                  description: { type: Type.STRING, description: "Mô tả của mã" },
                  startIndex: { type: Type.INTEGER, description: "Chỉ số ký tự bắt đầu của trích dẫn" },
                  endIndex: { type: Type.INTEGER, description: "Chỉ số ký tự kết thúc của trích dẫn" },
                  text: { type: Type.STRING, description: "Chuỗi văn bản trích dẫn chính xác" },
                  explanation: { type: Type.STRING, description: "Giải thích lý do lựa chọn mã này" }
                },
                required: ["codeName", "description", "startIndex", "endIndex", "text", "explanation"]
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
});`;

const replacementBlock = `app.post("/api/qda/auto-code", async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Thiếu thông tin văn bản." });
    }

    const prompt = \`Bạn là một trợ lý AI phân tích định tính (QDA Assistant) cao cấp.
Nhiệm vụ của bạn là đọc kỹ đoạn văn bản phỏng vấn gỡ băng (Transcript) sau và đề xuất các Chủ đề/Mã (Codes) mới phù hợp để phân tích dữ liệu, đồng thời chỉ ra các đoạn trích dẫn (quotes) tương ứng thuộc các mã đó.

Văn bản phỏng vấn (Transcript):
"""
\${documentText}
"""

Hãy đề xuất từ 2 đến 5 chủ đề phân tích mới, xác định vị trí các đoạn trích dẫn tương ứng bằng chỉ số ký tự (0-indexed) start và end chính xác.

Chú ý quan trọng:
1. Mỗi đề xuất phải bao gồm tên chủ đề (codeName), mô tả chủ đề (description).
2. Trường 'text' của mỗi trích dẫn PHẢI LÀ chuỗi con chính xác tuyệt đối nằm trong Văn bản phỏng vấn.
3. Vị trí 'startIndex' và 'endIndex' phải khớp chính xác với ký tự đầu và cuối của chuỗi 'text' đó trong Văn bản phỏng vấn.
4. Viết lời giải thích ngắn gọn bằng tiếng Việt giải thích lý do tại sao đoạn văn bản này khớp với mã mới đề xuất.\`;

    const response = await callGemini({
      model: "gemini-3.5-flash",
      prompt: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              description: "Danh sách các đề xuất mã hóa và chủ đề mới",
              items: {
                type: Type.OBJECT,
                properties: {
                  codeName: { type: Type.STRING, description: "Tên mã đề xuất mới" },
                  description: { type: Type.STRING, description: "Mô tả của mã đề xuất mới" },
                  startIndex: { type: Type.INTEGER, description: "Chỉ số ký tự bắt đầu của trích dẫn" },
                  endIndex: { type: Type.INTEGER, description: "Chỉ số ký tự kết thúc của trích dẫn" },
                  text: { type: Type.STRING, description: "Chuỗi văn bản trích dẫn chính xác" },
                  explanation: { type: Type.STRING, description: "Giải thích lý do lựa chọn mã này" }
                },
                required: ["codeName", "description", "startIndex", "endIndex", "text", "explanation"]
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
});`;

if (code.includes(targetBlock.trim().slice(0, 100))) {
  code = code.replace(targetBlock, replacementBlock);
  fs.writeFileSync('server.ts', code);
  console.log('Reverted server.ts');
} else {
  console.log('Target block not found in server.ts');
}

