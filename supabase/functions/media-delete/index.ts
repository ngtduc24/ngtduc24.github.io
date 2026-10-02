// Supabase Edge Function: media-delete
// Xoá hẳn tệp ảnh, video trên Cloudinary để giải phóng dung lượng, kèm bản ghi trong thư viện.
// Chỉ xoá được tệp do chính người gọi tải lên: tệp phải có trong bảng media_items với owner_id
// đúng tài khoản, hoặc trong Firestore uploaded_images với uploaderId đúng tài khoản.
// Dùng cho 2 việc: xoá tệp trong Kho lưu trữ và xoá Website (xoá luôn hình ảnh của trang).
// Deploy: supabase functions deploy media-delete --no-verify-jwt
// Secrets dùng chung với sign-upload: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
// CLOUDINARY_API_SECRET, FIREBASE_PROJECT_ID. SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY có sẵn.
// Body: { urls: string[] }  (tối đa 200 link mỗi lần)
// Trả về: { deleted: string[], skipped: string[] }
// Hoặc body: { classId } khi xoá lớp: chủ lớp (hoặc chủ trường của lớp) xoá hẳn mọi tệp sinh viên đã nộp
// trong các bài tập của lớp (thư mục smart_research_vn/edu_submissions/<mã link bài tập>).
// Trả về: { files: số tệp đã xoá }

import { jwtVerify, createRemoteJWKSet } from "https://esm.sh/jose@5.9.6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Tách loại tệp và public_id từ link Cloudinary, bỏ qua phần biến đổi (w_400,c_fill...) và phiên bản v123.
function parseCloudinary(url: string, cloud: string): { type: string; publicId: string } | null {
  const clean = String(url || "").split(/[?#]/)[0];
  const m = clean.match(/^https?:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/(.+)$/);
  if (!m || m[1] !== cloud) return null;
  let parts = m[3].split("/");
  const vIdx = parts.findIndex((s) => /^v\d+$/.test(s));
  if (vIdx >= 0 && vIdx < parts.length - 1) parts = parts.slice(vIdx + 1);
  else while (parts.length > 1 && (parts[0].includes(",") || /^(?:[a-z]{1,2}|ar|dpr|fl)_[^/]*$/.test(parts[0]))) parts.shift();
  let publicId = decodeURIComponent(parts.join("/"));
  if (m[2] !== "raw") publicId = publicId.replace(/\.[a-zA-Z0-9]+$/, "");
  return publicId ? { type: m[2], publicId } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Xác thực người gọi bằng token đăng nhập Firebase
  const authz = req.headers.get("Authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  let uid = "";
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${PROJECT_ID}`, audience: PROJECT_ID });
    uid = String(payload.sub || "");
  } catch (_e) {
    return json({ error: "Phiên đăng nhập không hợp lệ." }, 401);
  }
  if (!uid) return json({ error: "Phiên đăng nhập không hợp lệ." }, 401);

  const cloud = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? "";
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY") ?? "";
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET") ?? "";
  if (!cloud || !apiKey || !apiSecret) return json({ error: "Chưa cấu hình secret Cloudinary cho hàm." }, 500);

  const body = await req.json().catch(() => ({}));

  // ----- Xoá lớp: dọn tệp bài nộp của sinh viên -----
  if (body?.classId) {
    const sbUrlC = Deno.env.get("SUPABASE_URL") ?? "";
    const sbKeyC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const hC = { apikey: sbKeyC, Authorization: `Bearer ${sbKeyC}` };
    const classId = String(body.classId).replace(/[^a-zA-Z0-9-]/g, "");
    const cls = (await (await fetch(`${sbUrlC}/rest/v1/edu_classes?select=id,owner_id,school_id&id=eq.${classId}`, { headers: hC })).json().catch(() => []))?.[0];
    if (!cls) return json({ files: 0 });
    let allowed = cls.owner_id === uid;
    if (!allowed && cls.school_id) {
      const sch = (await (await fetch(`${sbUrlC}/rest/v1/edu_schools?select=owner_id&id=eq.${cls.school_id}`, { headers: hC })).json().catch(() => []))?.[0];
      allowed = sch?.owner_id === uid;
    }
    if (!allowed) return json({ error: "Bạn không phải chủ lớp này." }, 403);
    const assigns: Array<{ id: string; share_link_id: string | null }> = await (await fetch(`${sbUrlC}/rest/v1/edu_assignments?select=id,share_link_id&class_id=eq.${classId}`, { headers: hC })).json().catch(() => []);
    const auth = "Basic " + btoa(`${apiKey}:${apiSecret}`);
    const SUB = "smart_research_vn/edu_submissions/";
    let files = 0;
    // 1. Xoá theo thư mục của từng bài tập (gồm cả tệp không còn ghi trong bài nộp).
    for (const a of Array.isArray(assigns) ? assigns : []) {
      const link = String(a.share_link_id || "").replace(/[^a-zA-Z0-9]/g, "");
      if (!link) continue;
      for (const type of ["image", "video", "raw"]) {
        for (let round = 0; round < 20; round++) {
          const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/${type}/upload?prefix=${encodeURIComponent(SUB + link + "/")}`, { method: "DELETE", headers: { Authorization: auth } });
          const j = await r.json().catch(() => ({}));
          files += Object.values(j?.deleted || {}).filter((v) => v === "deleted").length;
          if (!j?.partial) break;
        }
      }
      await fetch(`https://api.cloudinary.com/v1_1/${cloud}/folders/${encodeURIComponent(SUB + link)}`, { method: "DELETE", headers: { Authorization: auth } }).catch(() => null);
    }
    // 2. Tệp bài nộp nằm ngoài thư mục trên (cách nộp cũ) nhưng vẫn thuộc khu bài nộp.
    const ids = (Array.isArray(assigns) ? assigns : []).map((a) => a.id);
    for (let i = 0; i < ids.length; i += 50) {
      const subs: Array<{ files: unknown; content: string | null }> = await (await fetch(`${sbUrlC}/rest/v1/edu_submissions?select=files,content&assignment_id=in.(${ids.slice(i, i + 50).join(",")})`, { headers: hC })).json().catch(() => []);
      const found = new Set<string>();
      for (const sub of Array.isArray(subs) ? subs : []) {
        (JSON.stringify(sub.files || []) + (sub.content || "")).match(/https?:\/\/res\.cloudinary\.com\/[^"'\s<>)]+/g)?.forEach((u) => found.add(u));
      }
      for (const u of found) {
        const p = parseCloudinary(u, cloud);
        if (!p || !p.publicId.startsWith(SUB)) continue;
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = await sha1Hex(`invalidate=true&public_id=${p.publicId}&timestamp=${timestamp}${apiSecret}`);
        const form = new URLSearchParams({ public_id: p.publicId, timestamp: String(timestamp), api_key: apiKey, invalidate: "true", signature });
        const cj = await (await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${p.type}/destroy`, { method: "POST", body: form })).json().catch(() => ({}));
        if (cj?.result === "ok") files++;
      }
    }
    return json({ files });
  }

  const urls: string[] = Array.isArray(body?.urls) ? body.urls.map(String).slice(0, 200) : [];
  if (!urls.length) return json({ deleted: [], skipped: [] });

  // Khoá so khớp theo loại và public_id để link có biến đổi kích thước vẫn khớp với tệp gốc.
  const wanted = new Map<string, { type: string; publicId: string; urls: string[] }>();
  const skipped: string[] = [];
  for (const u of urls) {
    const p = parseCloudinary(u, cloud);
    if (!p) { skipped.push(u); continue; }
    const k = `${p.type}/${p.publicId}`;
    const cur = wanted.get(k);
    if (cur) cur.urls.push(u); else wanted.set(k, { ...p, urls: [u] });
  }

  // 2. Tìm tệp thuộc đúng người gọi
  const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const sbH = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };
  const owned = new Map<string, { sbIds: string[]; fsNames: string[] }>();
  const mark = (k: string, sbId?: string, fsName?: string) => {
    const o = owned.get(k) || { sbIds: [], fsNames: [] };
    if (sbId) o.sbIds.push(sbId);
    if (fsName) o.fsNames.push(fsName);
    owned.set(k, o);
  };

  const rRes = await fetch(`${sbUrl}/rest/v1/media_items?select=id,url,public_id,type&owner_id=eq.${encodeURIComponent(uid)}`, { headers: sbH });
  const rows: Array<{ id: string; url: string }> = await rRes.json().catch(() => []);
  for (const r of Array.isArray(rows) ? rows : []) {
    const p = parseCloudinary(r.url, cloud);
    if (!p) continue;
    const k = `${p.type}/${p.publicId}`;
    if (wanted.has(k)) mark(k, r.id);
  }

  // Bản ghi cũ ở Firestore: đọc bằng chính token của người gọi nên luật Firestore vẫn được áp dụng.
  const missing = [...wanted.keys()].some((k) => !owned.has(k));
  if (missing && PROJECT_ID) {
    const fsRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: "uploaded_images" }],
        where: { fieldFilter: { field: { fieldPath: "uploaderId" }, op: "EQUAL", value: { stringValue: uid } } },
      } }),
    });
    const docs = await fsRes.json().catch(() => []);
    for (const d of Array.isArray(docs) ? docs : []) {
      const url = d?.document?.fields?.url?.stringValue;
      const p = url ? parseCloudinary(url, cloud) : null;
      if (!p) continue;
      const k = `${p.type}/${p.publicId}`;
      if (wanted.has(k)) mark(k, undefined, d.document.name);
    }
  }

  // 3. Xoá trên Cloudinary rồi xoá bản ghi
  const deleted: string[] = [];
  for (const [k, w] of wanted) {
    const o = owned.get(k);
    if (!o) { skipped.push(...w.urls); continue; }
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await sha1Hex(`invalidate=true&public_id=${w.publicId}&timestamp=${timestamp}${apiSecret}`);
    const form = new URLSearchParams({ public_id: w.publicId, timestamp: String(timestamp), api_key: apiKey, invalidate: "true", signature });
    const cRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${w.type}/destroy`, { method: "POST", body: form });
    const cj = await cRes.json().catch(() => ({}));
    // "not found" nghĩa là tệp đã không còn trên Cloudinary, vẫn dọn bản ghi.
    if (!cRes.ok || (cj?.result !== "ok" && cj?.result !== "not found")) { skipped.push(...w.urls); continue; }
    if (o.sbIds.length) {
      await fetch(`${sbUrl}/rest/v1/media_items?owner_id=eq.${encodeURIComponent(uid)}&id=in.(${o.sbIds.map(encodeURIComponent).join(",")})`, { method: "DELETE", headers: sbH });
    }
    for (const name of o.fsNames) {
      await fetch(`https://firestore.googleapis.com/v1/${name}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    }
    deleted.push(...w.urls);
  }

  return json({ deleted, skipped });
});
