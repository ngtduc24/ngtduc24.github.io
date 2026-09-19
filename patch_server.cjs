const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const targetBlock = `    const response = await callGemini({
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
                  codeName: { type: Type.STRING, description: "Tên mã BẮT BUỘC lấy từ danh sách mã đã có" },
                  description: { type: Type.STRING, description: "Mô tả của mã (không bắt buộc)" },
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
    });`;

const replacementBlock = `    let codeNameSchema = { 
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
    });`;

code = code.replace(targetBlock, replacementBlock);
fs.writeFileSync('server.ts', code);
