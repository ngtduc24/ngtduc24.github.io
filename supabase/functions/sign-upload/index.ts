// Supabase Edge Function: sign-upload
// Ký chữ ký cho Cloudinary Signed Upload.
// Trường hợp 1: người dùng đã đăng nhập Firebase (giảng viên, quản trị) được ký cho mọi thư mục.
// Trường hợp 2: sinh viên nộp bài qua link công khai (không đăng nhập) gửi kèm mã link bài tập và MSSV.
// Hàm kiểm tra bài tập tồn tại và MSSV thuộc đúng lớp của bài tập rồi chỉ ký cho thư mục
// smart_research_vn/edu_submissions/<mã link>. Trước đây sinh viên không có chữ ký nên tệp bị lưu
// dạng base64 thẳng vào bảng edu_submissions, làm phình cơ sở dữ liệu và tốn băng thông.
// Deploy: supabase functions deploy sign-upload --no-verify-jwt
// Secrets can: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, FIREBASE_PROJECT_ID

import { jwtVerify, createRemoteJWKSet } from "https://esm.sh/jose@5.9.6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";

// Bộ khóa công khai của Firebase Secure Token (định dạng JWKS)
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

function sanitizeFolder(f: string): string {
  return (f || "shared_library").replace(/[^a-zA-Z0-9_/-]/g, "_");
}

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));

  // 1. Người đã đăng nhập Firebase
  const authz = req.headers.get("Authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  let folderOverride = "";
  let firebaseOk = false;
  if (token) {
    try {
      await jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${PROJECT_ID}`,
        audience: PROJECT_ID,
      });
      firebaseOk = true;
    } catch (_e) {
      firebaseOk = false;
    }
  }

  // 2. Sinh viên nộp bài qua link công khai
  if (!firebaseOk) {
    const linkId = String(body?.linkId || "").replace(/[^a-zA-Z0-9]/g, "");
    const mssv = String(body?.mssv || "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!linkId || !mssv) return json({ error: "Thiếu token đăng nhập." }, 401);
    const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };
    const aRes = await fetch(`${sbUrl}/rest/v1/edu_assignments?select=id,class_id&share_link_id=eq.${linkId}&limit=1`, { headers: h });
    const a = (await aRes.json().catch(() => []))?.[0];
    if (!a) return json({ error: "Không tìm thấy bài tập." }, 403);
    const uRes = await fetch(`${sbUrl}/rest/v1/edu_users?select=id&class_id=eq.${a.class_id}&mssv=ilike.${encodeURIComponent(mssv)}&limit=1`, { headers: h });
    const u = (await uRes.json().catch(() => []))?.[0];
    if (!u) return json({ error: "MSSV không thuộc lớp của bài tập." }, 403);
    folderOverride = `smart_research_vn/edu_submissions/${linkId}`;
  }

  // 2. Ký các tham số tải lên
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? "";
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY") ?? "";
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET") ?? "";
  if (!cloudName || !apiKey || !apiSecret) {
    return json({ error: "Chưa cấu hình secret Cloudinary cho hàm." }, 500);
  }

  const folder = folderOverride || sanitizeFolder(body?.folder || "shared_library");
  const timestamp = Math.floor(Date.now() / 1000);

  // Chuỗi ký phải trùng đúng các tham số client gửi kèm (folder, timestamp)
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = await sha1Hex(toSign + apiSecret);

  return json({ cloudName, apiKey, timestamp, signature, folder });
});
