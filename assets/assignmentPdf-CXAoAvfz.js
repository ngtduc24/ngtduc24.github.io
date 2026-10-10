import{s as f}from"./applyTheme-B6nCe_1x.js";const h={any:"Mọi loại tệp",pdf:"PDF",link:"Link",image:"Hình ảnh",video:"Video",doc:"Văn bản (Word)","3d":"Mô hình 3D",text:"Nhập văn bản"},u=t=>h[t]||t.toUpperCase();function v(t,e){return t.includes(e)?t.filter(n=>n!==e):e==="any"?[...t.filter(n=>n==="text"||n==="link"),"any"]:e==="text"||e==="link"?[...t,e]:[...t.filter(n=>n!=="any"),e]}const a=t=>(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),m=t=>(t||"").replace(/\\/g,"\\\\").replace(/"/g,'\\"'),g=t=>{if(!t)return"";const e=new Date(t);if(isNaN(e.getTime()))return"";const n=o=>String(o).padStart(2,"0");return`${n(e.getHours())}:${n(e.getMinutes())} ngày ${n(e.getDate())}/${n(e.getMonth()+1)}/${e.getFullYear()}`};function b(t){const e=o=>{const i=o.match(/youtube(?:-nocookie)?\.com\/embed\/([^?&#/]+)/);if(i)return`https://www.youtube.com/watch?v=${i[1]}`;const s=o.match(/player\.vimeo\.com\/video\/(\d+)/);return s?`https://vimeo.com/${s[1]}`:o.replace(/\/preview(\?.*)?$/,"/view")},n=o=>`<p class="video-link">▶ Video: <a href="${a(e(o))}">${a(e(o))}</a></p>`;return(t||"").replace(/<div[^>]*data-video-embed[^>]*>\s*<iframe[^>]*src=["']([^"']+)["'][^>]*>\s*<\/iframe>\s*<\/div>/gi,(o,i)=>n(i)).replace(/<iframe[^>]*src=["']([^"']+)["'][^>]*>\s*<\/iframe>/gi,(o,i)=>n(i)).replace(/<video[^>]*src=["']([^"']+)["'][^>]*>(?:[\s\S]*?<\/video>)?/gi,(o,i)=>n(i))}function x(t){var s;const e=t.subjectName?`Bài tập môn ${t.subjectName}`:"Bài tập",n=t.author?`Giảng viên: ${t.author}`:"",o=[];t.subjectName&&o.push(`<tr><th>Môn học</th><td>${a(t.subjectName)}</td></tr>`),t.className&&o.push(`<tr><th>Lớp</th><td>${a(t.className)}</td></tr>`),t.deadline&&o.push(`<tr><th>Hạn nộp</th><td>${a(g(t.deadline))}</td></tr>`),(s=t.allowedFileTypes)!=null&&s.length&&o.push(`<tr><th>Định dạng nộp</th><td>${a(t.allowedFileTypes.map(u).join(", "))}</td></tr>`),t.author&&o.push(`<tr><th>Giảng viên</th><td>${a(t.author)}</td></tr>`);const i=(t.resources||[]).length?`<div class="res"><h2>Tài nguyên thực hành</h2><ol>${(t.resources||[]).map(p=>`<li><b>${a(p.name)}</b><br/><a href="${a(p.url)}" target="_blank">${a(p.url)}</a></li>`).join("")}</ol></div>`:"";return`<!doctype html>
<html lang="vi"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${a(t.title||"Bài tập")}</title>
<style>
  @page {
    margin: 20mm 16mm;
    @top-left { content: "${m(e)}"; font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; font-weight: 600; color: #64748b; }
    @bottom-left { content: "${m(n)}"; font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; color: #64748b; }
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
  ${o.length?`<table class="meta">${o.join("")}</table>`:""}
  <h2>Yêu cầu và hướng dẫn</h2>
  <div class="content">${t.content&&t.content.trim()?b(t.content):"<p><i>Không có hướng dẫn cụ thể.</i></p>"}</div>
  ${i}
</body></html>`}function y(t){var c;try{const r=window.open("","_blank");if(r){r.document.open(),r.document.write(t),r.document.close(),r.focus(),setTimeout(()=>{try{r.print()}catch{}},400);return}}catch{}const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),Object.assign(e.style,{position:"fixed",top:"-9999px",left:"-9999px",width:"1000px",height:"1000px",border:"0",opacity:"0.01",pointerEvents:"none"}),document.body.appendChild(e);const n=(c=e.contentWindow)==null?void 0:c.document;if(!n){e.remove();return}n.open(),n.write(t),n.close();let o=!1;const i=()=>{var r,d;if(!o){o=!0;try{(r=e.contentWindow)==null||r.focus(),(d=e.contentWindow)==null||d.print()}catch{}setTimeout(()=>{try{e.remove()}catch{}},6e4)}},s=Array.from(n.images||[]);if(!s.length){setTimeout(i,300);return}let p=s.length;const l=()=>{p-=1,p<=0&&setTimeout(i,200)};s.forEach(r=>{r.complete?l():(r.onload=l,r.onerror=l)}),setTimeout(i,6e3)}function $(t){y(x(t))}async function k(t){if(!t)return"";try{const{data:e}=await f.from("edu_subjects").select("name").eq("id",t).maybeSingle();return((e==null?void 0:e.name)||"").trim()}catch{return""}}export{$ as a,u as e,k as s,v as t,b as v};
