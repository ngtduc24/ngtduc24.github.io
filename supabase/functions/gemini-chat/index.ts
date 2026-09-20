// Supabase Edge Function: gemini-chat
//
// Nhận câu hỏi và ngữ cảnh là nội dung bài giảng công khai từ trình duyệt, gửi sang Gemini
// để trả lời bằng chữ, rồi trả câu trả lời về. Dùng cho Trợ lý giáo dục.
//
// Vì sao đi vòng qua đây thay vì gọi thẳng Gemini từ trình duyệt: khóa API của Gemini tính
// tiền theo lượt gọi. Nếu nhét khóa vào mã nguồn trang web thì ai cũng đọc được và đem đi
// xài, hóa đơn thì chủ khóa chịu. Đặt khóa ở đây thì nó nằm trong phần Secrets của Supabase,
// trình duyệt không thấy. Hàm cũng bắt buộc có token đăng nhập Firebase còn hạn nên chỉ tài
// khoản đã đăng nhập mới gọi được.
//
// Deploy: supabase functions deploy gemini-chat --no-verify-jwt
// Secrets cần: GEMINI_API_KEY, FIREBASE_PROJECT_ID. Tùy chọn: GEMINI_TEXT_MODEL.

import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
const TEXT_MODEL = Deno.env.get("GEMINI_TEXT_MODEL") ?? "gemini-flash-latest";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

// Giới hạn độ dài đầu vào để một lần gọi lỡ tay không làm nghẽn hàm.
const MAX_QUESTION = 2000;
const MAX_CONTEXT = 16000;

// Câu lệnh hệ thống mặc định, ràng buộc Gemini chỉ trả lời dựa trên NGỮ CẢNH được cung cấp,
// không bịa. Dùng chung cho cả Trợ lý giáo dục (ngữ cảnh là nội dung bài giảng) và Trợ lý hệ
// thống (ngữ cảnh là mô tả chức năng và hướng dẫn thao tác). Client có thể gửi kèm systemPrompt
// riêng để nói rõ vai trò, nhưng ràng buộc không bịa vẫn được ghép thêm ở dưới.
const DEFAULT_SYSTEM_PROMPT = "Bạn là trợ lý của một hệ thống phần mềm giáo dục.";
const GROUNDING = [
  "Chỉ trả lời dựa trên phần NGỮ CẢNH được cung cấp bên dưới.",
  "Tuyệt đối không bịa thêm thông tin không có trong ngữ cảnh.",
  "Nếu ngữ cảnh không đủ, hãy nói rõ là chưa có thông tin này và gợi ý người dùng xem mục liên quan.",
  "Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, đúng trọng tâm câu hỏi.",
].join(" ");
const MAX_SYSTEM_PROMPT = 600;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Chỉ tài khoản đã đăng nhập mới được dùng.
  const authz = req.headers.get("Authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return json({ error: "Cần đăng nhập để dùng trả lời bằng AI." }, 401);

  try {
    await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
  } catch (_error) {
    return json({ error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." }, 401);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!apiKey) {
    return json({ error: "Máy chủ chưa được cấu hình khóa Gemini. Quản trị viên cần thêm secret GEMINI_API_KEY." }, 500);
  }

  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, MAX_QUESTION) : "";
  const context = typeof body?.context === "string" ? body.context.slice(0, MAX_CONTEXT) : "";
  const rolePrompt = typeof body?.systemPrompt === "string" && body.systemPrompt.trim()
    ? body.systemPrompt.trim().slice(0, MAX_SYSTEM_PROMPT)
    : DEFAULT_SYSTEM_PROMPT;
  const systemPrompt = `${rolePrompt} ${GROUNDING}`;
  if (!question) return json({ error: "Thiếu câu hỏi." }, 400);

  const userText = [
    "NGỮ CẢNH (nội dung bài giảng công khai):",
    context || "(không có nội dung nào phù hợp)",
    "",
    "CÂU HỎI:",
    question,
  ].join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
        }),
      },
    );

    const raw = await response.text();
    if (!response.ok) {
      console.error("Gemini tra loi loi:", response.status, raw.slice(0, 500));
      if (response.status === 429) {
        return json({ error: "Gemini đang quá tải hoặc đã hết hạn mức. Vui lòng thử lại sau ít phút." }, 429);
      }
      return json({ error: "Gemini không trả lời được câu hỏi này." }, 502);
    }

    const payload = JSON.parse(raw);
    const parts = payload?.candidates?.[0]?.content?.parts;
    const answer = Array.isArray(parts)
      ? parts.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("").trim()
      : "";

    if (!answer) {
      console.error("Khong tim thay cau tra loi trong phan hoi:", raw.slice(0, 500));
      return json({ error: "Gemini không trả về nội dung. Vui lòng thử lại." }, 502);
    }

    return json({ answer });
  } catch (error) {
    console.error("Loi goi Gemini:", error);
    return json({ error: "Không kết nối được tới Gemini. Vui lòng thử lại." }, 502);
  }
});
