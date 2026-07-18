const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const targetStr = `app.post("/api/qda/auto-code", async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Thiếu thông tin văn bản." });
    }`;

const replaceStr = `app.post("/api/qda/auto-code", async (req, res) => {
  try {
    const { documentText, existingCodes } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Thiếu thông tin văn bản." });
    }
    
    const codesInfo = existingCodes && existingCodes.length > 0 
      ? "Danh sách Mã/Chủ đề (Codes) hiện có:\\n" + existingCodes.map(c => \`- Tên mã: "\${c.name}"\\n  Mô tả: \${c.description || 'Không có'}\`).join("\\n")
      : "Hiện tại chưa có mã nào.";`;

code = code.replace(targetStr, replaceStr);

const promptTarget = `    const prompt = \`Bạn là một trợ lý AI phân tích định tính (QDA Assistant) cao cấp.
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
4. Viết lời giải thích ngắn gọn bằng tiếng Việt giải thích lý do tại sao đoạn văn bản này khớp với mã mới đề xuất.\`;`;

const promptReplace = `    const prompt = \`Bạn là một trợ lý AI phân tích định tính (QDA Assistant) cao cấp.
Nhiệm vụ của bạn là đọc kỹ đoạn văn bản phỏng vấn gỡ băng (Transcript) sau và TÌM các đoạn trích dẫn (quotes) tương ứng thuộc các Mã/Chủ đề (Codes) ĐÃ CÓ do người dùng tạo.

Văn bản phỏng vấn (Transcript):
"""
\${documentText}
"""

\${codesInfo}

Hãy tìm và gán các đoạn trích dẫn trong văn bản vào các mã ĐÃ CÓ ở trên (sử dụng chính xác Tên mã ĐÃ CÓ, không tự tạo mã mới). Nếu không có đoạn nào phù hợp với mã hiện có, bạn có thể đề xuất 1-2 mã mới thực sự cần thiết. 
Xác định vị trí các đoạn trích dẫn tương ứng bằng chỉ số ký tự (0-indexed) start và end chính xác.

Chú ý quan trọng:
1. ƯU TIÊN SỬ DỤNG MÃ ĐÃ CÓ. 'codeName' phải trùng khớp chính xác 100% với tên mã trong danh sách. Nếu là mã mới, hãy thêm mô tả (description).
2. Trường 'text' của mỗi trích dẫn PHẢI LÀ chuỗi con chính xác tuyệt đối nằm trong Văn bản phỏng vấn.
3. Vị trí 'startIndex' và 'endIndex' phải khớp chính xác với ký tự đầu và cuối của chuỗi 'text' đó trong Văn bản phỏng vấn.
4. Viết lời giải thích ngắn gọn bằng tiếng Việt giải thích lý do tại sao đoạn văn bản này khớp với mã đề xuất.\`;`;

code = code.replace(promptTarget, promptReplace);

const schemaTarget = `                  codeName: { type: Type.STRING, description: "Tên mã đề xuất mới" },
                  description: { type: Type.STRING, description: "Mô tả của mã đề xuất mới" },`;

const schemaReplace = `                  codeName: { type: Type.STRING, description: "Tên mã (sử dụng tên mã đã có, hoặc tên mã mới nếu thực sự cần)" },
                  description: { type: Type.STRING, description: "Mô tả của mã (nếu là mã mới)" },`;

code = code.replace(schemaTarget, schemaReplace);

fs.writeFileSync('server.ts', code);
