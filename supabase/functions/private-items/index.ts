// Supabase Edge Function: private-items
// Kho dữ liệu cá nhân dùng chung cho các ứng dụng riêng tư (hiện có: mã QR). Mỗi bản ghi có
// kind (loại ứng dụng) và payload đã mã hoá. Hàm:
// 1. Xác thực token đăng nhập Firebase, lấy uid làm chủ dữ liệu.
// 2. Chỉ đọc, ghi bản ghi có owner_id = uid. Admin cũng không có ngoại lệ.
// 3. Khi ghi, kiểm tra tài khoản có quyền của ứng dụng tương ứng (hoặc là admin).
// 4. Mã hoá AES-GCM bằng CV_ENC_KEY trước khi lưu.
// Verify JWT phải TẮT (token là của Firebase). Bảng private_items bật RLS, không có policy.

import { jwtVerify, createRemoteJWKSet } from "https://esm.sh/jose@5.9.6";

// kind hợp lệ và quyền cần có để ghi
const KINDS: Record<string, string> = { qr: "qr_codes" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};
const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TABLE = `${SB_URL}/rest/v1/private_items`;
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
    if (!raw) throw new Error("Missing CV_ENC_KEY");
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
async function canWrite(uid: string, token: string, perm: string): Promise<boolean> {
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return false;
    const f = (await r.json())?.fields || {};
    if (f.role?.stringValue === "admin") return true;
    const perms: string[] = (f.permissions?.arrayValue?.values || []).map((v: any) => v.stringValue);
    return perms.includes(perm);
  } catch { return false; }
}
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

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
  const kind = String(body?.kind || "");
  if (!KINDS[kind]) return json({ error: "Loại dữ liệu không hợp lệ." }, 400);
  const own = `owner_id=eq.${encodeURIComponent(uid)}&kind=eq.${kind}`;

  try {
    if (action === "list") {
      const r = await fetch(`${TABLE}?select=id,payload,created_at,updated_at&${own}&order=updated_at.desc`, { headers: H });
      const rows = await r.json();
      if (!r.ok) throw new Error(rows?.message || "read error");
      const items = [];
      for (const row of rows) { try { items.push({ id: row.id, createdAt: row.created_at, updatedAt: row.updated_at, data: await decrypt(row.payload) }); } catch { /* bỏ qua bản hỏng */ } }
      return json({ items });
    }
    if (!(await canWrite(uid, token, KINDS[kind]))) return json({ error: "Tài khoản chưa được cấp quyền dùng chức năng này." }, 403);
    if (action === "create") {
      const payload = await encrypt(body.data || {});
      const r = await fetch(TABLE, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify({ owner_id: uid, kind, payload }) });
      const rows = await r.json();
      if (!r.ok) throw new Error(rows?.message || "create error");
      return json({ id: rows[0].id, createdAt: rows[0].created_at, updatedAt: rows[0].updated_at });
    }
    if (action === "update") {
      if (!isUuid(body.id)) return json({ error: "Mã không hợp lệ." }, 400);
      const payload = await encrypt(body.data || {});
      const r = await fetch(`${TABLE}?id=eq.${body.id}&${own}`, { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify({ payload, updated_at: new Date().toISOString() }) });
      const rows = await r.json();
      if (!r.ok) throw new Error(rows?.message || "update error");
      if (!rows.length) return json({ error: "Không tìm thấy dữ liệu." }, 404);
      return json({ ok: true, updatedAt: rows[0].updated_at });
    }
    if (action === "delete") {
      if (!isUuid(body.id)) return json({ error: "Mã không hợp lệ." }, 400);
      const r = await fetch(`${TABLE}?id=eq.${body.id}&${own}`, { method: "DELETE", headers: H });
      if (!r.ok) throw new Error("delete error");
      return json({ ok: true });
    }
    return json({ error: "Thao tác không hợp lệ." }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
