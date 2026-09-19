// Supabase Edge Function: sign-upload
// Ký chữ ký cho Cloudinary Signed Upload, chỉ trả chữ ký cho người dùng đã đăng nhập Firebase.
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

  // 1. Bắt buộc có token đăng nhập Firebase
  const authz = req.headers.get("Authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return json({ error: "Thiếu token đăng nhập." }, 401);

  try {
    await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
  } catch (_e) {
    return json({ error: "Token không hợp lệ hoặc đã hết hạn." }, 401);
  }

  // 2. Ký các tham số tải lên
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? "";
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY") ?? "";
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET") ?? "";
  if (!cloudName || !apiKey || !apiSecret) {
    return json({ error: "Chưa cấu hình secret Cloudinary cho hàm." }, 500);
  }

  const body = await req.json().catch(() => ({}));
  const folder = sanitizeFolder(body?.folder || "shared_library");
  const timestamp = Math.floor(Date.now() / 1000);

  // Chuỗi ký phải trùng đúng các tham số client gửi kèm (folder, timestamp)
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = await sha1Hex(toSign + apiSecret);

  return json({ cloudName, apiKey, timestamp, signature, folder });
});
