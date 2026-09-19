// Supabase Edge Function: gemini-enhance
//
// Nhận một ảnh từ trình duyệt, gửi sang Gemini để làm rõ chi tiết rồi trả ảnh mới về.
//
// Vì sao phải đi vòng qua đây thay vì gọi thẳng Gemini từ trình duyệt. Khóa API của
// Gemini là thứ tính tiền theo lượt gọi. Nếu nhét khóa vào mã nguồn của trang web thì
// ai mở công cụ nhà phát triển cũng đọc được và đem đi xài, hóa đơn thì chủ khóa chịu.
// Đặt khóa ở đây thì nó nằm trong phần Secrets của Supabase, trình duyệt không thấy.
//
// Ngoài ra hàm này bắt buộc phải có token đăng nhập Firebase còn hạn, nên chỉ tài khoản
// đã đăng nhập vào hệ thống mới gọi được, khách vãng lai không tiêu được hạn mức.
//
// Deploy: supabase functions deploy gemini-enhance --no-verify-jwt
// Secrets cần: GEMINI_API_KEY, FIREBASE_PROJECT_ID

import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

// Gemini nhận ảnh dạng base64 nên dung lượng gửi đi phồng lên khoảng một phần ba.
// Chặn ở mức bảy megabyte để một lần gọi lỡ tay không làm nghẽn hàm.
const MAX_INPUT_BYTES = 7 * 1024 * 1024;

const ALLOWED_SIZES = new Set(["512px", "1K", "2K", "4K"]);
const ALLOWED_RATIOS = new Set(["1:1", "16:9", "9:16", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5", "21:9"]);
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// Câu lệnh cố tình nhấn mạnh việc giữ nguyên nội dung. Gemini là mô hình vẽ lại ảnh
// chứ không phải bộ phóng to thuần túy, nên phải ràng buộc càng chặt càng tốt để nó
// không tự ý thêm bớt chi tiết so với ảnh gốc.
const ENHANCE_PROMPT = [
  "Upscale and restore this exact photograph to a higher resolution.",
  "Preserve the original composition, framing, subject, colors and lighting precisely.",
  "Recover fine detail and texture, remove compression artefacts and noise, and sharpen edges naturally.",
  "Do not add, remove, move or reinterpret any object, person, text or background element.",
  "Do not change the style, do not stylise, do not crop, do not add any watermark, border or caption.",
  "The result must look like the same photograph captured with a better camera.",
].join(" ");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Chỉ tài khoản đã đăng nhập mới được dùng, tránh người lạ tiêu hết hạn mức.
  const authz = req.headers.get("Authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return json({ error: "Cần đăng nhập để dùng chức năng làm nét bằng AI." }, 401);

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
  if (!body || typeof body.imageBase64 !== "string" || !body.imageBase64) {
    return json({ error: "Thiếu dữ liệu ảnh." }, 400);
  }

  const imageBase64 = String(body.imageBase64);
  if (imageBase64.length > MAX_INPUT_BYTES) {
    return json({ error: "Ảnh gửi lên quá lớn. Vui lòng thu nhỏ bớt trước khi nhờ AI làm nét." }, 413);
  }

  const mimeType = ALLOWED_MIME.has(body.mimeType) ? body.mimeType : "image/jpeg";
  const imageSize = ALLOWED_SIZES.has(body.imageSize) ? body.imageSize : "2K";
  const aspectRatio = ALLOWED_RATIOS.has(body.aspectRatio) ? body.aspectRatio : "1:1";

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-image",
        input: [
          { type: "text", text: ENHANCE_PROMPT },
          { type: "image", mime_type: mimeType, data: imageBase64 },
        ],
        response_format: {
          type: "image",
          mime_type: "image/png",
          aspect_ratio: aspectRatio,
          image_size: imageSize,
        },
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error("Gemini tra loi loi:", response.status, raw.slice(0, 500));
      if (response.status === 429) {
        return json({ error: "Gemini đang quá tải hoặc đã hết hạn mức. Vui lòng thử lại sau ít phút." }, 429);
      }
      return json({ error: "Gemini không xử lý được ảnh này." }, 502);
    }

    const payload = JSON.parse(raw);

    // Tùy phiên bản, ảnh trả về có thể nằm ở output_image hoặc trong danh sách steps.
    let data: string | null = payload?.output_image?.data ?? null;
    let outMime: string = payload?.output_image?.mime_type ?? "image/png";

    if (!data && Array.isArray(payload?.steps)) {
      for (const step of payload.steps) {
        const part = Array.isArray(step?.content)
          ? step.content.find((item: any) => item?.type === "image" && item?.data)
          : null;
        if (part) {
          data = part.data;
          outMime = part.mime_type || outMime;
          break;
        }
      }
    }

    if (!data) {
      console.error("Khong tim thay anh trong phan hoi:", raw.slice(0, 500));
      return json({ error: "Gemini không trả về ảnh. Vui lòng thử lại hoặc dùng chế độ làm nét tại chỗ." }, 502);
    }

    return json({ data, mimeType: outMime });
  } catch (error) {
    console.error("Loi goi Gemini:", error);
    return json({ error: "Không kết nối được tới Gemini. Vui lòng thử lại." }, 502);
  }
});
