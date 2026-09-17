var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_cloudinary = require("cloudinary");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
if (typeof __filename !== "undefined" && __filename.endsWith(".cjs")) {
  process.env.NODE_ENV = "production";
}
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "150mb" }));
app.use(import_express.default.urlencoded({ limit: "150mb", extended: true }));
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "dummy_key",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function callGemini(params) {
  const { prompt, config, retryCount = 0 } = params;
  let modelName = params.model || "gemini-3.5-flash";
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: modelName,
      contents: typeof prompt === "string" ? prompt : prompt,
      config
    });
    return response;
  } catch (error) {
    const isQuotaError = error?.message?.includes("429") || error?.status === 429;
    if (isQuotaError && retryCount < 2) {
      const waitTime = Math.pow(2, retryCount) * 1e3 + Math.random() * 1e3;
      console.warn(`Gemini Quota hit for ${modelName}. Retrying in ${Math.round(waitTime)}ms... (Attempt ${retryCount + 1})`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
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
import_cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
app.post("/api/media-store", async (req, res) => {
  let tempFilePath = null;
  try {
    const { image, file, resourceType = "auto", folder = "shared_library", originalFilename = "" } = req.body;
    const source = file || image;
    if (!source) {
      return res.status(400).json({ error: "Thi\u1EBFu d\u1EEF li\u1EC7u t\u1EC7p t\u1EA3i l\xEAn." });
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn("Ch\u01B0a c\u1EA5u h\xECnh Cloudinary, tr\u1EA3 v\u1EC1 \u1EA3nh g\u1ED1c base64.");
      return res.json({ url: source, secureUrl: source, resourceType: "local" });
    }
    const safeFolder = String(folder).replace(/[^a-zA-Z0-9_/-]/g, "_");
    const uploadOptions = {
      folder: `smart_research_vn/${safeFolder}`,
      resource_type: resourceType === "image" || resourceType === "video" || resourceType === "raw" ? resourceType : "auto"
    };
    if (resourceType === "image" || resourceType === "auto") {
      uploadOptions.fetch_format = "auto";
      uploadOptions.quality = "auto";
    }
    let uploadSource = source;
    if (typeof source === "string" && source.startsWith("data:")) {
      const match = source.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const extension = mimeType.split("/")[1] || "bin";
        const tempFileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}.${extension}`;
        tempFilePath = import_path.default.join(import_os.default.tmpdir(), tempFileName);
        import_fs.default.writeFileSync(tempFilePath, Buffer.from(base64Data, "base64"));
        uploadSource = tempFilePath;
      }
    }
    let result;
    if (uploadOptions.resource_type === "video") {
      result = await new Promise((resolve, reject) => {
        import_cloudinary.v2.uploader.upload_large(uploadSource, uploadOptions, (error, res2) => {
          if (error) reject(error);
          else resolve(res2);
        });
      });
    } else {
      result = await import_cloudinary.v2.uploader.upload(uploadSource, uploadOptions);
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
  } catch (error) {
    console.error("L\u1ED7i upload Cloudinary:", error);
    return res.status(500).json({ error: error?.message || "L\u1ED7i t\u1EA3i \u1EA3nh l\xEAn." });
  } finally {
    if (tempFilePath && import_fs.default.existsSync(tempFilePath)) {
      try {
        import_fs.default.unlinkSync(tempFilePath);
      } catch (err) {
        console.error("L\u1ED7i khi x\xF3a file t\u1EA1m:", err);
      }
    }
  }
});
app.post("/api/journal/analyze", async (req, res) => {
  try {
    const { pdfBase64, fileName } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "Thi\u1EBFu d\u1EEF li\u1EC7u PDF base64." });
    }
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const prompt = `B\u1EA1n l\xE0 m\u1ED9t tr\u1EE3 l\xFD AI chuy\xEAn nghi\u1EC7p trong nghi\xEAn c\u1EE9u khoa h\u1ECDc. 
H\xE3y ph\xE2n t\xEDch t\xE0i li\u1EC7u/b\xE0i b\xE1o khoa h\u1ECDc ho\u1EB7c b\u1EA3ng danh s\xE1ch t\u1EA1p ch\xED \u0111\xE3 t\u1EA3i l\xEAn n\xE0y (${fileName || "t\xE0i li\u1EC7u.pdf"}).
T\xE0i li\u1EC7u n\xE0y c\xF3 th\u1EC3 ch\u1EE9a m\u1ED9t b\u1EA3ng c\xF3 r\u1EA5t nhi\u1EC1u t\u1EA1p ch\xED khoa h\u1ECDc ho\u1EB7c m\u1ED9t b\xE0i b\xE1o c\u1EE5 th\u1EC3. H\xE3y tr\xEDch xu\u1EA5t H\u1EBET t\u1EA5t c\u1EA3 c\xE1c t\u1EA1p ch\xED khoa h\u1ECDc xu\u1EA5t hi\u1EC7n trong b\u1EA3ng ho\u1EB7c t\xE0i li\u1EC7u n\xE0y.
V\u1EDBi m\u1ED7i t\u1EA1p ch\xED khoa h\u1ECDc t\xECm th\u1EA5y, h\xE3y tr\xEDch xu\u1EA5t ch\xEDnh x\xE1c c\xE1c th\xF4ng tin sau:
1. T\xEAn t\u1EA1p ch\xED khoa h\u1ECDc (name): t\xEAn \u0111\u1EA7y \u0111\u1EE7 c\u1EE7a t\u1EA1p ch\xED khoa h\u1ECDc ch\u1EE9a b\xE0i b\xE1o n\xE0y.
2. M\xE3 ISSN (issn): m\xE3 s\u1ED1 ti\xEAu chu\u1EA9n qu\u1ED1c t\u1EBF cho xu\u1EA5t b\u1EA3n ph\u1EA9m nhi\u1EC1u k\u1EF3 (n\u1EBFu kh\xF4ng th\u1EA5y, \u0111i\u1EC1n r\u1ED7ng ho\u1EB7c t\u1EF1 suy \u0111o\xE1n d\u1EF1a tr\xEAn t\u1EA1p ch\xED).
3. Ph\xE2n lo\u1EA1i (type): lo\u1EA1i t\u1EA1p ch\xED (v\xED d\u1EE5: T\u1EA1p ch\xED, K\u1EF7 y\u1EBFu h\u1ED9i th\u1EA3o, T\u1EA1p ch\xED Scopus, T\u1EA1p ch\xED SCIE, T\u1EA1p ch\xED Trong n\u01B0\u1EDBc...).
4. C\u01A1 quan xu\u1EA5t b\u1EA3n (publisher): c\u01A1 quan ch\u1EE7 qu\u1EA3n, vi\u1EC7n nghi\xEAn c\u1EE9u, tr\u01B0\u1EDDng \u0111\u1EA1i h\u1ECDc ho\u1EB7c nh\xE0 xu\u1EA5t b\u1EA3n.
5. Ng\xE0nh (field): Ng\xE0nh ho\u1EB7c l\u0129nh v\u1EF1c nghi\xEAn c\u1EE9u (v\xED d\u1EE5: Y h\u1ECDc, Kinh t\u1EBF, C\xF4ng ngh\u1EC7 th\xF4ng tin, Gi\xE1o d\u1EE5c...). H\xE3y c\u1ED1 g\u1EAFng kh\u1EDBp v\u1EDBi c\xE1c ng\xE0nh khoa h\u1ECDc ph\u1ED5 bi\u1EBFn.
6. \u0110i\u1EC3m t\u1EA1p ch\xED (score): \u0110i\u1EC3m t\u1ED1i \u0111a ho\u1EB7c \u0111i\u1EC3m t\u1EA1p ch\xED (v\xED d\u1EE5: "0 \u2013 0,75", "1.5", "1.0", m\u1EB7c \u0111\u1ECBnh "1.0" n\u1EBFu kh\xF4ng r\xF5).
7. Ng\xE0y th\xE0nh l\u1EADp (establishedDate): N\u0103m ho\u1EB7c ng\xE0y th\xE0nh l\u1EADp t\u1EA1p ch\xED (v\xED d\u1EE5: "2010" ho\u1EB7c "15/05/2005" ho\u1EB7c r\u1ED7ng n\u1EBFu kh\xF4ng r\xF5).
8. S\u1ED1 l\u01B0\u1EE3ng b\xE0i b\xE1o (paperCount): S\u1ED1 l\u01B0\u1EE3ng b\xE0i b\xE1o \u0111\xE3 xu\u1EA5t b\u1EA3n \u01B0\u1EDBc t\xEDnh (m\u1EB7c \u0111\u1ECBnh 100 n\u1EBFu kh\xF4ng r\xF5).
9. \u0110\u1ED9 uy t\xEDn (rating): \u0110\xE1nh gi\xE1 \u0111\u1ED9 uy t\xEDn t\u1EEB 1 \u0111\u1EBFn 5 sao v\xE0ng (nguy\xEAn t\u1EEB 1 \u0111\u1EBFn 5).
10. Gi\u1EDBi thi\u1EC7u chi ti\u1EBFt (description): \u0110o\u1EA1n v\u0103n gi\u1EDBi thi\u1EC7u t\u1ED5ng quan ho\u1EB7c t\xF3m t\u1EAFt chi ti\u1EBFt v\u1EC1 t\u1EA1p ch\xED ho\u1EB7c b\xE0i b\xE1o khoa h\u1ECDc n\xE0y.

Vui l\xF2ng tr\u1EA3 v\u1EC1 k\u1EBFt qu\u1EA3 theo c\u1EA5u tr\xFAc JSON \u0111\u1ECBnh s\u1EB5n ch\u1EE9a danh s\xE1ch (array) c\xE1c t\u1EA1p ch\xED khoa h\u1ECDc.`;
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
          type: import_genai.Type.OBJECT,
          properties: {
            journals: {
              type: import_genai.Type.ARRAY,
              description: "Danh s\xE1ch t\u1EA5t c\u1EA3 c\xE1c t\u1EA1p ch\xED khoa h\u1ECDc tr\xEDch xu\u1EA5t \u0111\u01B0\u1EE3c t\u1EEB b\u1EA3ng ho\u1EB7c b\xE0i b\xE1o",
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  name: { type: import_genai.Type.STRING, description: "T\xEAn t\u1EA1p ch\xED khoa h\u1ECDc" },
                  issn: { type: import_genai.Type.STRING, description: "M\xE3 ISSN" },
                  type: { type: import_genai.Type.STRING, description: "Lo\u1EA1i t\u1EA1p ch\xED" },
                  publisher: { type: import_genai.Type.STRING, description: "C\u01A1 quan xu\u1EA5t b\u1EA3n" },
                  field: { type: import_genai.Type.STRING, description: "Ng\xE0nh khoa h\u1ECDc" },
                  score: { type: import_genai.Type.STRING, description: "\u0110i\u1EC3m t\u1EA1p ch\xED" },
                  establishedDate: { type: import_genai.Type.STRING, description: "Ng\xE0y th\xE0nh l\u1EADp" },
                  paperCount: { type: import_genai.Type.INTEGER, description: "S\u1ED1 l\u01B0\u1EE3ng b\xE1o" },
                  rating: { type: import_genai.Type.INTEGER, description: "\u0110\u1ED9 uy t\xEDn (1-5)" },
                  description: { type: import_genai.Type.STRING, description: "Gi\u1EDBi thi\u1EC7u/m\xF4 t\u1EA3" }
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
      throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c ph\u1EA3n h\u1ED3i t\u1EEB Gemini.");
    }
    const data = JSON.parse(textResult.trim());
    return res.json(data);
  } catch (error) {
    console.error("L\u1ED7i ph\xE2n t\xEDch t\xE0i li\u1EC7u PDF:", error);
    const isQuotaError = error?.message?.includes("429") || error?.status === 429;
    const message = isQuotaError ? "B\u1EA1n \u0111\xE3 v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n l\u01B0\u1EE3t g\u1ECDi AI mi\u1EC5n ph\xED. Vui l\xF2ng th\u1EED l\u1EA1i sau v\xE0i ph\xFAt ho\u1EB7c li\xEAn h\u1EC7 qu\u1EA3n tr\u1ECB vi\xEAn." : error?.message || "L\u1ED7i x\u1EED l\xFD AI tr\xEAn m\xE1y ch\u1EE7.";
    return res.status(isQuotaError ? 429 : 500).json({ error: message });
  }
});
app.post("/api/qda/auto-code", async (req, res) => {
  try {
    const { documentText, existingCodes } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin v\u0103n b\u1EA3n." });
    }
    const codeList = existingCodes && existingCodes.length > 0 ? existingCodes.map((c) => `- ${c.name}: ${c.description || ""}`).join("\n") : "Ch\u01B0a c\xF3 m\xE3 n\xE0o.";
    const prompt = `B\u1EA1n l\xE0 m\u1ED9t chuy\xEAn gia ph\xE2n t\xEDch d\u1EEF li\u1EC7u \u0111\u1ECBnh t\xEDnh (Qualitative Data Analyst) cao c\u1EA5p.
Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n l\xE0 \u0111\u1ECDc k\u1EF9 \u0111o\u1EA1n v\u0103n b\u1EA3n (Transcript) sau v\xE0 th\u1EF1c hi\u1EC7n 2 vi\u1EC7c theo \u0111\xFAng th\u1EE9 t\u1EF1:

1. \u01AFU TI\xCAN TUY\u1EC6T \u0110\u1ED0I G\u1EAEN M\xC3 C\xD3 S\u1EB4N: T\xECm c\xE1c \u0111o\u1EA1n tr\xEDch d\u1EABn (quotes) trong v\u0103n b\u1EA3n th\u1EC3 hi\u1EC7n R\xD5 R\xC0NG V\xC0 CH\xCDNH X\xC1C \xFD ngh\u0129a c\u1EE7a c\xE1c m\xE3 (codes) C\xD3 S\u1EB4N (\u0111\u01B0\u1EE3c cung c\u1EA5p b\xEAn d\u01B0\u1EDBi).
2. CH\u1EC8 \u0110\u1EC0 XU\u1EA4T M\xC3 M\u1EDAI KHI TH\u1EF0C S\u1EF0 C\u1EA6N THI\u1EBET: Ch\u1EC9 khi n\xE0o c\xF3 nh\u1EEFng \u0111o\u1EA1n tr\xEDch d\u1EABn ch\u1EE9a th\xF4ng tin v\xF4 c\xF9ng quan tr\u1ECDng nh\u01B0ng KH\xD4NG TH\u1EC2 x\u1EBFp v\xE0o b\u1EA5t k\u1EF3 m\xE3 c\xF3 s\u1EB5n n\xE0o, b\u1EA1n m\u1EDBi \u0111\u01B0\u1EE3c ph\xE9p \u0111\u1EC1 xu\u1EA5t m\xE3 m\u1EDBi.

Danh s\xE1ch c\xE1c m\xE3 c\xF3 s\u1EB5n:
${codeList}

V\u0103n b\u1EA3n:
"""
${documentText}
"""

Y\xCAU C\u1EA6U CH\u1EA4T L\u01AF\u1EE2NG (R\u1EA4T QUAN TR\u1ECCNG):
- Tr\xEDch d\u1EABn (text) ph\u1EA3i C\xD3 \xDD NGH\u0128A TR\u1ECCN V\u1EB8N. TUY\u1EC6T \u0110\u1ED0I KH\xD4NG c\u1EAFt ngang t\u1EEB (v\xED d\u1EE5: kh\xF4ng l\u1EA5y "s\u1EED d\u1EE5" m\xE0 ph\u1EA3i l\u1EA5y nguy\xEAn ch\u1EEF "s\u1EED d\u1EE5ng"). N\xEAn tr\u1ECDn v\u1EB9n c\u1EA3 c\xE2u ho\u1EB7c m\u1EC7nh \u0111\u1EC1 ng\u1EEF ph\xE1p.
- N\u1ED9i dung tr\xEDch d\u1EABn ph\u1EA3i li\xEAn quan TR\u1EF0C TI\u1EBEP v\xE0 CH\u1EB6T CH\u1EBC \u0111\u1EBFn \xFD ngh\u0129a c\u1EE7a m\xE3 \u0111\u01B0\u1EE3c g\u1EAFn. (V\xED d\u1EE5: \u0110\u1EEBng g\u1EAFn m\xE3 "X\u0103ng" cho m\u1ED9t c\xE2u n\xF3i v\u1EC1 "c\u01A1 s\u1EDF kinh doanh" kh\xF4ng h\u1EC1 li\xEAn quan \u0111\u1EBFn b\u1EA3n ch\u1EA5t c\u1EE7a "X\u0103ng").
- N\u1EBFu kh\xF4ng ch\u1EAFc ch\u1EAFn, th\xE0 b\u1ECF qua (kh\xF4ng g\u1EAFn m\xE3) c\xF2n h\u01A1n l\xE0 g\u1EAFn sai ho\u1EB7c khi\xEAn c\u01B0\u1EE1ng.

Ch\xFA \xFD \u0111\u1ECBnh d\u1EA1ng:
1. N\u1EBFu m\xE3 b\u1EA1n d\xF9ng l\xE0 m\xE3 C\xD3 S\u1EB4N, 'isNewCode' = false, 'codeName' ph\u1EA3i kh\u1EDBp ch\xEDnh x\xE1c t\xEAn m\xE3 c\xF3 s\u1EB5n.
2. N\u1EBFu m\xE3 b\u1EA1n d\xF9ng l\xE0 m\xE3 M\u1EDAI, 'isNewCode' = true, v\xE0 b\u1EAFt bu\u1ED9c cung c\u1EA5p th\xEAm 'description'.
3. Tr\u01B0\u1EDDng 'text' c\u1EE7a m\u1ED7i tr\xEDch d\u1EABn PH\u1EA2I L\xC0 chu\u1ED7i con ch\xEDnh x\xE1c tuy\u1EC7t \u0111\u1ED1i n\u1EB1m trong V\u0103n b\u1EA3n.
4. V\u1ECB tr\xED 'startIndex' v\xE0 'endIndex' ph\u1EA3i kh\u1EDBp ch\xEDnh x\xE1c v\u1EDBi k\xFD t\u1EF1 \u0111\u1EA7u v\xE0 cu\u1ED1i c\u1EE7a chu\u1ED7i 'text' \u0111\xF3 trong V\u0103n b\u1EA3n.`;
    const response = await callGemini({
      model: "gemini-2.5-pro",
      // Sử dụng mô hình Pro 2.5 để phân tích ngữ nghĩa sâu và chính xác hơn
      prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            suggestions: {
              type: import_genai.Type.ARRAY,
              description: "Danh s\xE1ch c\xE1c \u0111o\u1EA1n v\u0103n b\u1EA3n \u0111\u01B0\u1EE3c g\u1EAFn m\xE3",
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  codeName: { type: import_genai.Type.STRING, description: "T\xEAn m\xE3 (C\xF3 s\u1EB5n ho\u1EB7c M\u1EDBi)" },
                  isNewCode: { type: import_genai.Type.BOOLEAN, description: "True n\u1EBFu \u0111\xE2y l\xE0 m\xE3 m\u1EDBi do AI \u0111\u1EC1 xu\u1EA5t, False n\u1EBFu l\xE0 m\xE3 c\xF3 s\u1EB5n" },
                  description: { type: import_genai.Type.STRING, description: "M\xF4 t\u1EA3 n\u1EBFu l\xE0 m\xE3 m\u1EDBi" },
                  startIndex: { type: import_genai.Type.INTEGER, description: "Ch\u1EC9 s\u1ED1 k\xFD t\u1EF1 b\u1EAFt \u0111\u1EA7u c\u1EE7a tr\xEDch d\u1EABn" },
                  endIndex: { type: import_genai.Type.INTEGER, description: "Ch\u1EC9 s\u1ED1 k\xFD t\u1EF1 k\u1EBFt th\xFAc c\u1EE7a tr\xEDch d\u1EABn" },
                  text: { type: import_genai.Type.STRING, description: "Chu\u1ED7i v\u0103n b\u1EA3n tr\xEDch d\u1EABn ch\xEDnh x\xE1c" },
                  explanation: { type: import_genai.Type.STRING, description: "Gi\u1EA3i th\xEDch ng\u1EAFn g\u1ECDn l\xFD do g\u1EAFn m\xE3" }
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
  } catch (error) {
    console.error("L\u1ED7i AI Auto-Coding:", error);
    const isQuotaError = error?.message?.includes("429") || error?.status === 429;
    const message = isQuotaError ? "B\u1EA1n \u0111\xE3 v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n l\u01B0\u1EE3t g\u1ECDi AI mi\u1EC5n ph\xED. Vui l\xF2ng th\u1EED l\u1EA1i sau v\xE0i ph\xFAt." : error?.message || "L\u1ED7i x\u1EED l\xFD AI Auto-coding.";
    return res.status(isQuotaError ? 429 : 500).json({ error: message });
  }
});
app.post("/api/qda/thematic-synthesis", async (req, res) => {
  try {
    const { codeName, quotes } = req.body;
    if (!codeName || !quotes || quotes.length === 0) {
      return res.status(400).json({ error: "Thi\u1EBFu t\xEAn ch\u1EE7 \u0111\u1EC1 ho\u1EB7c danh s\xE1ch ph\xE1t bi\u1EC3u tr\xEDch d\u1EABn." });
    }
    const prompt = `B\u1EA1n l\xE0 m\u1ED9t nh\xE0 nghi\xEAn c\u1EE9u khoa h\u1ECDc chuy\xEAn nghi\u1EC7p, th\xE0nh th\u1EA1o ph\u01B0\u01A1ng ph\xE1p lu\u1EADn ph\xE2n t\xEDch \u0111\u1ECBnh t\xEDnh v\xE0 vi\u1EBFt lu\u1EADn v\u0103n h\u1ECDc thu\u1EADt ISI/Scopus.
H\xE3y vi\u1EBFt m\u1ED9t \u0111o\u1EA1n t\u1ED5ng h\u1EE3p h\u1ECDc thu\u1EADt t\u1EF1 s\u1EF1 (academic thematic narrative synthesis) b\u1EB1ng ti\u1EBFng Vi\u1EC7t cho ch\u1EE7 \u0111\u1EC1: "${codeName}".

D\u01B0\u1EDBi \u0111\xE2y l\xE0 danh s\xE1ch c\xE1c \u0111o\u1EA1n ph\xE1t bi\u1EC3u (quotes) tr\xEDch d\u1EABn tr\u1EF1c ti\u1EBFp thu th\u1EADp \u0111\u01B0\u1EE3c t\u1EEB c\xE1c cu\u1ED9c ph\u1ECFng v\u1EA5n s\xE2u th\u1EF1c \u0111\u1ECBa:
${quotes.map((q, i) => `- Tr\xEDch d\u1EABn ${i + 1}: "${q}"`).join("\n")}

Y\xEAu c\u1EA7u b\xE1o c\xE1o:
1. Ph\xE2n t\xEDch, t\u1ED5ng h\u1EE3p s\xE2u s\u1EAFc m\u1ED1i li\xEAn h\u1EC7 gi\u1EEFa c\xE1c ph\xE1t bi\u1EC3u n\xE0y \u0111\u1EC3 t\xECm ra \xFD ngh\u0129a c\u1ED1t l\xF5i c\u1EE7a ch\u1EE7 \u0111\u1EC1 "${codeName}".
2. L\u1ED3ng gh\xE9p c\xE1c \u0111o\u1EA1n tr\xEDch d\u1EABn tr\xEAn m\u1ED9t c\xE1ch kh\xE9o l\xE9o, t\u1EF1 nhi\xEAn \u0111\u1EC3 l\xE0m minh ch\u1EE9ng th\u1EF1c nghi\u1EC7m sinh \u0111\u1ED9ng cho c\xE1c l\u1EADp lu\u1EADn khoa h\u1ECDc c\u1EE7a b\u1EA1n.
3. V\u0103n phong h\u1ECDc thu\u1EADt, chu\u1EA9n m\u1EF1c, l\u1EADp lu\u1EADn s\u1EAFc b\xE9n, kh\xE1ch quan, th\xEDch h\u1EE3p l\xE0m ngu\u1ED3n v\u0103n b\u1EA3n ch\xE8n v\xE0o ch\u01B0\u01A1ng k\u1EBFt qu\u1EA3 nghi\xEAn c\u1EE9u \u0111\u1ECBnh t\xEDnh trong lu\u1EADn \xE1n ti\u1EBFn s\u0129 ho\u1EB7c b\xE0i b\xE1o ISI.
4. Tr\xE1nh d\xF9ng c\xE1c t\u1EEB s\xE1o r\u1ED7ng ho\u1EB7c t\u1EF1 x\u01B0ng. \u0110\u1ED9 d\xE0i kho\u1EA3ng 250 - 350 t\u1EEB.`;
    const response = await callGemini({
      model: "gemini-3.5-flash",
      prompt
    });
    const synthesis = response.text || "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c t\xF3m t\u1EAFt ch\u1EE7 \u0111\u1EC1 t\u1EEB AI.";
    return res.json({ synthesis });
  } catch (error) {
    console.error("L\u1ED7i AI Thematic Synthesis:", error);
    const isQuotaError = error?.message?.includes("429") || error?.status === 429;
    const message = isQuotaError ? "B\u1EA1n \u0111\xE3 v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n l\u01B0\u1EE3t g\u1ECDi AI mi\u1EC5n ph\xED. Vui l\xF2ng th\u1EED l\u1EA1i sau v\xE0i ph\xFAt." : error?.message || "L\u1ED7i x\u1EED l\xFD AI Synthesis.";
    return res.status(isQuotaError ? 429 : 500).json({ error: message });
  }
});
app.post("/api/fcm/send", async (req, res) => {
  try {
    const { tokens, title, body, icon, click_action } = req.body;
    if (!tokens || !tokens.length) {
      return res.status(400).json({ error: "Kh\xF4ng c\xF3 token FCM n\xE0o \u0111\u1EC3 g\u1EEDi." });
    }
    const serverKey = process.env.FCM_SERVER_KEY;
    if (!serverKey) {
      console.warn("Ch\u01B0a c\u1EA5u h\xECnh FCM_SERVER_KEY, b\u1ECF qua vi\u1EC7c g\u1EEDi FCM th\u1EF1c t\u1EBF.");
      return res.json({ success: true, message: "M\xF4 ph\u1ECFng g\u1EEDi FCM th\xE0nh c\xF4ng (thi\u1EBFu FCM_SERVER_KEY)." });
    }
    const responses = await Promise.all(tokens.map((token) => {
      return fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "key=" + serverKey
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title,
            body,
            icon: icon || "/vite.svg",
            click_action: click_action || "/"
          }
        })
      });
    }));
    return res.json({ success: true, message: `\u0110\xE3 g\u1EEDi th\xF4ng b\xE1o t\u1EDBi ${tokens.length} thi\u1EBFt b\u1ECB.` });
  } catch (error) {
    console.error("L\u1ED7i g\u1EEDi FCM:", error);
    return res.status(500).json({ error: error?.message || "L\u1ED7i x\u1EED l\xFD FCM." });
  }
});
var getYouTubeId = (url) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const shortsMatch = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch) return shortsMatch[1];
  const liveMatch = trimmed.match(/\/live\/([a-zA-Z0-9_-]{11})/i);
  if (liveMatch) return liveMatch[1];
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch) return embedMatch[1];
  const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (vMatch) return vMatch[1];
  const youtuMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (youtuMatch) return youtuMatch[1];
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }
  return null;
};
function parseISO8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "10";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
function formatSecondsToDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
app.get("/api/youtube-duration", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Thi\u1EBFu URL video YouTube." });
    }
    const videoId = getYouTubeId(url);
    if (!videoId) {
      return res.status(400).json({ error: "URL YouTube kh\xF4ng h\u1EE3p l\u1EC7." });
    }
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}&has_verified=1&bpctr=9999999999`;
    const response = await fetch(ytUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+917; GPS=1; YSC=1; VISITOR_INFO1_LIVE=1",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8"
      }
    });
    if (!response.ok) {
      return res.status(500).json({ error: "Kh\xF4ng th\u1EC3 l\u1EA5y th\xF4ng tin t\u1EEB YouTube." });
    }
    const html = await response.text();
    let durationStr = null;
    const metaMatch = html.match(/<meta itemprop="duration" content="([^"]+)">/i);
    if (metaMatch) {
      durationStr = parseISO8601Duration(metaMatch[1]);
    }
    if (!durationStr) {
      const ogMatch = html.match(/<meta property="og:video:duration" content="(\d+)">/i) || html.match(/<meta property="video:duration" content="(\d+)">/i);
      if (ogMatch) {
        const seconds = parseInt(ogMatch[1], 10);
        durationStr = formatSecondsToDuration(seconds);
      }
    }
    if (!durationStr) {
      const lengthTextMatch = html.match(/"lengthText"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"\s*\}/i);
      if (lengthTextMatch) {
        durationStr = lengthTextMatch[1];
      }
    }
    if (!durationStr) {
      const lengthSecondsMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/i) || html.match(/"lengthSeconds"\s*:\s*(\d+)/i);
      if (lengthSecondsMatch) {
        const seconds = parseInt(lengthSecondsMatch[1], 10);
        durationStr = formatSecondsToDuration(seconds);
      }
    }
    if (!durationStr) {
      const approxMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/i) || html.match(/"approxDurationMs"\s*:\s*(\d+)/i);
      if (approxMatch) {
        const ms = parseInt(approxMatch[1], 10);
        const seconds = Math.floor(ms / 1e3);
        durationStr = formatSecondsToDuration(seconds);
      }
    }
    if (!durationStr) {
      try {
        const jsonMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/i);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[1]);
          if (json?.videoDetails?.lengthSeconds) {
            const seconds = parseInt(json.videoDetails.lengthSeconds, 10);
            durationStr = formatSecondsToDuration(seconds);
          }
        }
      } catch (e) {
      }
    }
    if (durationStr) {
      return res.json({ duration: durationStr });
    }
    return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y th\u1EDDi l\u01B0\u1EE3ng c\u1EE7a video. Vui l\xF2ng t\u1EF1 nh\u1EADp." });
  } catch (error) {
    console.error("L\u1ED7i l\u1EA5y th\u1EDDi l\u01B0\u1EE3ng YouTube:", error);
    return res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng khi ph\xE2n t\xEDch th\u1EDDi l\u01B0\u1EE3ng." });
  }
});
async function startServer() {
  app.get("/tracuu", (req, res) => {
    res.redirect("/tracuu.html");
  });
  const isCjsBundle = typeof __filename !== "undefined" && __filename.endsWith(".cjs");
  const distPath = import_path.default.join(process.cwd(), "dist");
  const hasDist = import_fs.default.existsSync(import_path.default.join(distPath, "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || isCjsBundle;
  if (!isProduction && !hasDist) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("Kh\xF4ng th\u1EC3 kh\u1EDFi \u0111\u1ED9ng Vite middleware, chuy\u1EC3n sang ph\u1EE5c v\u1EE5 file t\u0129nh:", err);
      serveStaticAssets();
    }
  } else {
    serveStaticAssets();
  }
  function serveStaticAssets() {
    const resolvedDistPath = import_fs.default.existsSync(import_path.default.join(process.cwd(), "dist")) ? import_path.default.join(process.cwd(), "dist") : typeof __dirname !== "undefined" ? __dirname : import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(resolvedDistPath, {
      maxAge: "1y",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      const indexPath = import_path.default.join(resolvedDistPath, "index.html");
      if (import_fs.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("App is running");
      }
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
  server.on("error", (err) => {
    console.error("Server listen error:", err);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
