// Supabase Edge Function: edu-share
// Trả về trang xem trước (OpenGraph) cho link nộp bài tập, để Zalo, Facebook,
// Messenger hiển thị đúng TÊN BÀI TẬP thay vì tiêu đề chung của trang tra cứu.
//
// Vì trang chạy trên GitHub Pages (tĩnh) và máy quét mạng xã hội không chạy
// JavaScript, nên không thể lấy tiêu đề động từ link tracuu.html?edu=... Hàm này
// đọc bài tập theo share_link_id rồi trả HTML có sẵn thẻ og:title đúng tên bài,
// đồng thời tự chuyển người thật vào trang nộp bài trong ứng dụng.
//
// Deploy (chạy 1 lần): supabase functions deploy edu-share --no-verify-jwt
// Không cần secret thủ công, Supabase tự cấp SUPABASE_URL và SUPABASE_ANON_KEY.

const SITE_ORIGIN = "https://ngtduc24.github.io";

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value: string): string {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getLinkId(req: Request): string {
  const url = new URL(req.url);
  const q = url.searchParams.get("id") || url.searchParams.get("edu");
  if (q) return q.trim();
  // Hỗ trợ dạng .../edu-share/<id>
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("edu-share");
  if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
  return "";
}

function buildPage(opts: { title: string; description: string; image: string; target: string; shareUrl: string }): string {
  const { title, description, image, target, shareUrl } = opts;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t}</title>
<meta name="description" content="${d}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Smart Research VN" />
<meta property="og:locale" content="vi_VN" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${escapeHtml(shareUrl)}" />
${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<link rel="canonical" href="${escapeHtml(target)}" />
<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}" />
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body style="font-family:system-ui,sans-serif;color:#475569;background:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<p>Đang mở bài tập <strong>${t}</strong>... Nếu không tự chuyển, hãy <a href="${escapeHtml(target)}">bấm vào đây</a>.</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const linkId = getLinkId(req);
  const fallbackTarget = `${SITE_ORIGIN}/tracuu.html${linkId ? `?edu=${encodeURIComponent(linkId)}` : ""}`;

  const respondHtml = (html: string) =>
    new Response(html, { headers: { ...cors, "Content-Type": "text/html; charset=utf-8" } });

  if (!linkId) {
    return respondHtml(buildPage({
      title: "Nộp bài làm",
      description: "Cổng nộp bài tập trực tuyến.",
      image: "",
      target: `${SITE_ORIGIN}/tracuu.html`,
      shareUrl: `${SITE_ORIGIN}/tracuu.html`,
    }));
  }

  try {
    const select = encodeURIComponent("title,content,edu_classes(name,edu_schools(name))");
    const api = `${SUPABASE_URL}/rest/v1/edu_assignments?share_link_id=eq.${encodeURIComponent(linkId)}&select=${select}&limit=1`;
    const res = await fetch(api, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const rows = res.ok ? await res.json() : [];
    const a = Array.isArray(rows) && rows.length ? rows[0] : null;

    if (!a) {
      return respondHtml(buildPage({
        title: "Nộp bài làm",
        description: "Cổng nộp bài tập trực tuyến.",
        image: "",
        target: fallbackTarget,
        shareUrl: fallbackTarget,
      }));
    }

    const cls = a.edu_classes?.name || "";
    const school = a.edu_classes?.edu_schools?.name || "";
    const ctx = [cls, school].filter(Boolean).join(" - ");
    const snippet = stripHtml(a.content || "");
    const description = ctx
      ? `Nộp bài tập trực tuyến - ${ctx}`
      : (snippet ? snippet.slice(0, 160) : "Nộp bài tập trực tuyến.");

    return respondHtml(buildPage({
      title: a.title || "Nộp bài làm",
      description,
      image: "",
      target: fallbackTarget,
      shareUrl: fallbackTarget,
    }));
  } catch (_e) {
    return respondHtml(buildPage({
      title: "Nộp bài làm",
      description: "Cổng nộp bài tập trực tuyến.",
      image: "",
      target: fallbackTarget,
      shareUrl: fallbackTarget,
    }));
  }
});
