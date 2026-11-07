import{s as g}from"./applyTheme-C3iUN9OL.js";const u={any:"Mọi loại tệp",pdf:"PDF",link:"Link",image:"Hình ảnh",video:"Video",doc:"Văn bản (Word)","3d":"Mô hình 3D",text:"Nhập văn bản"},h=n=>u[n]||n.toUpperCase();function $(n,e){return n.includes(e)?n.filter(o=>o!==e):e==="any"?[...n.filter(o=>o==="text"||o==="link"),"any"]:e==="text"||e==="link"?[...n,e]:[...n.filter(o=>o!=="any"),e]}const a=n=>(n||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),p=n=>(n||"").replace(/\\/g,"\\\\").replace(/"/g,'\\"'),b=n=>{if(!n)return"";const e=new Date(n);if(isNaN(e.getTime()))return"";const o=i=>String(i).padStart(2,"0");return`${o(e.getHours())}:${o(e.getMinutes())} ngày ${o(e.getDate())}/${o(e.getMonth()+1)}/${e.getFullYear()}`};function x(n){const e=i=>{const t=i.match(/youtube(?:-nocookie)?\.com\/embed\/([^?&#/]+)/);if(t)return`https://www.youtube.com/watch?v=${t[1]}`;const s=i.match(/player\.vimeo\.com\/video\/(\d+)/);return s?`https://vimeo.com/${s[1]}`:i.replace(/\/preview(\?.*)?$/,"/view")},o=i=>`<p class="video-link">▶ Video: <a href="${a(e(i))}">${a(e(i))}</a></p>`;return(n||"").replace(/<div[^>]*data-video-embed[^>]*>\s*<iframe[^>]*src=["']([^"']+)["'][^>]*>\s*<\/iframe>\s*<\/div>/gi,(i,t)=>o(t)).replace(/<iframe[^>]*src=["']([^"']+)["'][^>]*>\s*<\/iframe>/gi,(i,t)=>o(t)).replace(/<video[^>]*src=["']([^"']+)["'][^>]*>(?:[\s\S]*?<\/video>)?/gi,(i,t)=>o(t))}function y(n){var c;const e=n,o=Array.isArray(e.allowedFileTypes)?e.allowedFileTypes:typeof e.allowedFileTypes=="string"?e.allowedFileTypes.split(",").map(r=>r.trim()).filter(Boolean):[],i=(Array.isArray(e.resources)?e.resources:[]).filter(r=>r&&(r.url||r.name)),t={...n,allowedFileTypes:o,resources:i,content:typeof n.content=="string"?n.content:""},s=t.subjectName?`Bài tập môn ${t.subjectName}`:"Bài tập",f=t.author?`Giảng viên: ${t.author}`:"",l=[];t.subjectName&&l.push(`<tr><th>Môn học</th><td>${a(t.subjectName)}</td></tr>`),t.className&&l.push(`<tr><th>Lớp</th><td>${a(t.className)}</td></tr>`),t.deadline&&l.push(`<tr><th>Hạn nộp</th><td>${a(b(t.deadline))}</td></tr>`),(c=t.allowedFileTypes)!=null&&c.length&&l.push(`<tr><th>Định dạng nộp</th><td>${a(t.allowedFileTypes.map(h).join(", "))}</td></tr>`),t.author&&l.push(`<tr><th>Giảng viên</th><td>${a(t.author)}</td></tr>`);const m=(t.resources||[]).length?`<div class="res"><h2>Tài nguyên thực hành</h2><ol>${(t.resources||[]).map(r=>`<li><b>${a(r.name||"")}</b><br/><a href="${a(r.url||"")}" target="_blank">${a(r.url||"")}</a></li>`).join("")}</ol></div>`:"";return`<!doctype html>
<html lang="vi"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${a(t.title||"Bài tập")}</title>
<style>
  @page {
    margin: 20mm 16mm;
    @top-left { content: "${p(s)}"; font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; font-weight: 600; color: #64748b; }
    @bottom-left { content: "${p(f)}"; font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; color: #64748b; }
    @bottom-right { content: "Trang " counter(page) " / " counter(pages); font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; color: #64748b; }
  }
  * { box-sizing: border-box; }
  body { font-family: "Be Vietnam Pro", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0 auto; padding: 24px; max-width: 820px; }
  h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px; color: #0f172a; }
  table.meta { border-collapse: collapse; margin: 0 0 20px; font-size: 13px; }
  table.meta th { text-align: left; color: #64748b; font-weight: 600; padding: 3px 16px 3px 0; white-space: nowrap; vertical-align: top; }
  table.meta td { padding: 3px 0; color: #0f172a; font-weight: 600; }
  h2 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 22px 0 8px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; page-break-after: avoid; }
  .content { font-size: 14px; overflow-wrap: anywhere; word-break: break-word; }
  .content img { max-width: 100%; height: auto; border-radius: 6px; }
  .content table { border-collapse: collapse; width: 100%; }
  .content td, .content th { border: 1px solid #cbd5e1; padding: 6px 8px; }
  .res ol { margin: 0; padding-left: 20px; font-size: 13px; }
  .res li { margin-bottom: 6px; }
  .video-link { background: #f1f5f9; border-radius: 6px; padding: 6px 10px; font-size: 13px; }
  .video-link a { color: #2563eb; word-break: break-all; }
  .res a { color: #2563eb; word-break: break-all; font-size: 12px; text-decoration: none; }
  @media print {
    .no-print { display: none !important; }
  }
</style></head>
<body>
  <div class="no-print" style="position: sticky; top: 12px; z-index: 999; background: #0f172a; color: white; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; border-radius: 14px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); font-family: sans-serif;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">📄</span>
      <span style="font-weight: 700; font-size: 13px;">Bản in đề bài / Lưu thành PDF</span>
    </div>
    <button onclick="window.print()" style="background: #10b981; color: #ffffff; border: none; padding: 8px 18px; border-radius: 10px; font-weight: 800; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.4);">
      In / Lưu PDF ngay
    </button>
  </div>
  <h1>${a(t.title||"Bài tập")}</h1>
  ${l.length?`<table class="meta">${l.join("")}</table>`:""}
  <h2>Yêu cầu và hướng dẫn</h2>
  <div class="content">${t.content&&t.content.trim()?x(t.content):"<p><i>Không có hướng dẫn cụ thể.</i></p>"}</div>
  ${m}
</body></html>`}const d=typeof navigator<"u"&&/Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|TikTok|musical_ly/i.test(navigator.userAgent||"");function w(n){const e=document.createElement("div");Object.assign(e.style,{position:"fixed",inset:"0",zIndex:"2147483000",background:"rgba(15,23,42,.6)",display:"flex",flexDirection:"column"});const o=document.createElement("div");Object.assign(o.style,{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:"#0f172a",color:"#fff",fontFamily:"system-ui, sans-serif",fontSize:"13px"});const i=document.createElement("span");i.style.flex="1",d&&(i.textContent="Trình duyệt trong ứng dụng không lưu được PDF. Mở link bằng Chrome hoặc Safari để lưu.");const t=document.createElement("button");t.type="button",t.textContent="Đóng",Object.assign(t.style,{background:"#334155",color:"#fff",border:"0",borderRadius:"10px",padding:"8px 16px",fontWeight:"700",cursor:"pointer"}),t.onclick=()=>e.remove(),o.append(i,t);const s=document.createElement("iframe");Object.assign(s.style,{flex:"1",width:"100%",border:"0",background:"#fff"}),s.srcdoc=n,e.append(o,s),document.body.appendChild(e)}function v(n){if(!d)try{const e=window.open("","_blank");if(e){e.document.open(),e.document.write(n),e.document.close(),e.focus(),setTimeout(()=>{try{e.print()}catch{}},400);return}}catch{}w(n)}function F(n){v(y(n))}async function T(n){if(!n)return"";try{const{data:e}=await g.from("edu_subjects").select("name").eq("id",n).maybeSingle();return((e==null?void 0:e.name)||"").trim()}catch{return""}}export{F as a,h as e,T as s,$ as t,x as v};
