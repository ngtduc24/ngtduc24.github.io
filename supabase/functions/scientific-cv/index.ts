// Supabase Edge Function: scientific-cv
// Kho lý lịch khoa học cá nhân. Mọi thao tác đi qua hàm này:
// 1. Xác thực token đăng nhập Firebase, lấy uid làm chủ hồ sơ.
// 2. Thao tác ghi (tạo, sửa, xoá) kiểm tra tài khoản có quyền scientific_cv hoặc là admin,
//    đọc hồ sơ Firestore users/{uid} bằng chính token của người dùng.
// 3. Chỉ đọc, ghi hồ sơ có owner_id = uid. Admin cũng không có ngoại lệ.
// 4. Nội dung mã hoá AES-GCM bằng khoá CV_ENC_KEY (base64 32 byte) trước khi lưu.
// Deploy với Verify JWT tắt (token là của Firebase, không phải của Supabase).
// Secrets: FIREBASE_PROJECT_ID, CV_ENC_KEY. SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY có sẵn.

import { jwtVerify, createRemoteJWKSet } from "https://esm.sh/jose@5.9.6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};
const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TABLE = `${SB_URL}/rest/v1/scientific_cvs`;
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function b64(buf: Uint8Array): string { let s = ""; buf.forEach((b) => (s += String.fromCharCode(b))); return btoa(s); }
function unb64(s: string): Uint8Array { const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

let keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const raw = Deno.env.get("CV_ENC_KEY") ?? "";
    if (!raw) throw new Error("Chưa cấu hình khoá mã hoá CV_ENC_KEY.");
    keyPromise = crypto.subtle.importKey("raw", unb64(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  return keyPromise;
}
async function encrypt(obj: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await getKey(), new TextEncoder().encode(JSON.stringify(obj))));
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length);
  return b64(out);
}
async function decrypt(s: string): Promise<any> {
  const all = unb64(s);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: all.slice(0, 12) }, await getKey(), all.slice(12));
  return JSON.parse(new TextDecoder().decode(pt));
}

async function canWrite(uid: string, token: string): Promise<boolean> {
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return false;
    const f = (await r.json())?.fields || {};
    if (f.role?.stringValue === "admin") return true;
    const perms: string[] = (f.permissions?.arrayValue?.values || []).map((v: any) => v.stringValue);
    return perms.includes("scientific_cv");
  } catch { return false; }
}

const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

// Tóm tắt để hiện danh sách, không kèm ảnh cho nhẹ.
function summary(row: any, data: any, name: string) {
  return { id: row.id, name, updatedAt: row.updated_at, createdAt: row.created_at,
    fullName: data?.fullName || "", school: data?.school || "", hasPhoto: !!data?.photo };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authz = req.headers.get("Authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return json({ error: "Bạn cần đăng nhập." }, 401);
  let uid = "";
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${PROJECT_ID}`, audience: PROJECT_ID });
    uid = String(payload.sub || "");
  } catch { return json({ error: "Phiên đăng nhập hết hạn, hãy đăng nhập lại." }, 401); }
  if (!uid) return json({ error: "Bạn cần đăng nhập." }, 401);

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const owner = `owner_id=eq.${encodeURIComponent(uid)}`;

  try {
    if (action === "list") {
      const r = await fetch(`${TABLE}?select=id,name,payload,created_at,updated_at&${owner}&order=updated_at.desc`, { headers: H });
      const rows = await r.json();
      if (!r.ok) throw new Error(rows?.message || "Lỗi đọc dữ liệu");
      const out = [];
      for (const row of rows) { let p: any = {}; try { p = await decrypt(row.payload); } catch { /* hỏng thì bỏ qua */ } out.push(summary(row, p.data, p.name || row.name)); }
      return json({ items: out });
    }
    if (action === "get") {
      if (!isUuid(body.id)) return json({ error: "Mã hồ sơ không hợp lệ." }, 400);
      const r = await fetch(`${TABLE}?select=id,name,payload,created_at,updated_at&id=eq.${body.id}&${owner}`, { headers: H });
      const rows = await r.json();
      if (!r.ok) throw new Error(rows?.message || "Lỗi đọc dữ liệu");
      if (!rows.length) return json({ error: "Không tìm thấy hồ sơ." }, 404);
      const row = rows[0];
      const p = await decrypt(row.payload);
      return json({ item: { id: row.id, name: p.name || row.name, createdAt: row.created_at, updatedAt: row.updated_at, data: p.data } });
    }

    if (!(await canWrite(uid, token))) return json({ error: "Tài khoản chưa được cấp quyền Lý lịch khoa học." }, 403);

    if (action === "create") {
      // Tên hồ sơ cũng nằm trong phần mã hoá, cột name chỉ để giá trị chung.
      const payload = await encrypt({ name: String(body.name || "Lý lịch khoa học").slice(0, 200), data: body.data || {} });
      const r = await fetch(TABLE, { method: "POST", headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify({ owner_id: uid, name: "LLKH", payload }) });
      const rows = await r.json();
      if (!r.ok) throw new Error(rows?.message || "Lỗi tạo hồ sơ");
      return json({ id: rows[0].id });
    }
    if (action === "update") {
      if (!isUuid(body.id)) return json({ error: "Mã hồ sơ không hợp lệ." }, 400);
      const payload = await encrypt({ name: String(body.name || "Lý lịch khoa học").slice(0, 200), data: body.data || {} });
      const r = await fetch(`${TABLE}?id=eq.${body.id}&${owner}`, { method: "PATCH", headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify({ name: "LLKH", payload, updated_at: new Date().toISOString() }) });
      const rows = await r.json();
      if (!r.ok) throw new Error(rows?.message || "Lỗi lưu hồ sơ");
      if (!rows.length) return json({ error: "Không tìm thấy hồ sơ." }, 404);
      return json({ ok: true, updatedAt: rows[0].updated_at });
    }
    if (action === "delete") {
      if (!isUuid(body.id)) return json({ error: "Mã hồ sơ không hợp lệ." }, 400);
      const r = await fetch(`${TABLE}?id=eq.${body.id}&${owner}`, { method: "DELETE", headers: H });
      if (!r.ok) throw new Error("Lỗi xoá hồ sơ");
      return json({ ok: true });
    }
    return json({ error: "Thao tác không hợp lệ." }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
