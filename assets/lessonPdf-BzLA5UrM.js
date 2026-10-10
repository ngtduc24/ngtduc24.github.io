import{s as y}from"./applyTheme-B6nCe_1x.js";import{v as w}from"./assignmentPdf-CXAoAvfz.js";function o(t){return(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}async function v(t){if(t.subject_name)return t.subject_name;try{let r=t.subject_id||null;if(!r&&t.id){const{data:e}=await y.from("el_lessons").select("subject_id").eq("id",t.id).maybeSingle();r=(e==null?void 0:e.subject_id)||null}if(!r&&t.share_token){const{data:e}=await y.from("el_lessons").select("subject_id").eq("share_token",t.share_token).maybeSingle();r=(e==null?void 0:e.subject_id)||null}if(!r)return"";const{data:a}=await y.from("edu_subjects").select("name").eq("id",r).maybeSingle();return((a==null?void 0:a.name)||"").trim()}catch{return""}}function _(t,r,a,e,g){const h=t.author_label||t.owner_name||"Ẩn danh",b=r.map((i,m)=>{const s=a.filter(c=>c.section_id===i.id),d=s.length?`<div class="resources"><p class="res-title">Tài nguyên</p><ul>${s.map(c=>`<li><a href="${o(c.url||"#")}">${o(c.title||"Tài nguyên")}</a></li>`).join("")}</ul></div>`:"";return`<section class="sec">
      <h2>${m+1}. ${o(i.title||"Phần "+(m+1))}</h2>
      <div class="content">${i.content?w(i.content):'<p class="empty">(Chưa có nội dung)</p>'}</div>
      ${d}
    </section>`}).join(""),f=t.cover_url?`<img class="cover" src="${o(t.cover_url)}" alt="" />`:"",x=t.summary?`<p class="summary">${o(t.summary)}</p>`:"",n=i=>(i||"").replace(/\\/g,"\\\\").replace(/"/g,'\\"');return`<!doctype html>
<html lang="vi"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${o(t.title||"Bài giảng")}</title>
<style>
  /* Đầu trang, chân trang và số trang dùng hộp lề @page để in ra được trên mọi trang,
     kể cả Safari trên iPhone (vị trí position:fixed không in lặp được trên Safari iOS).
     Góc trên trái: tên giáo trình. Góc dưới trái: biên soạn. Góc dưới phải: số trang. */
  @page {
    margin: 20mm 16mm;
    @top-left { content: "${n(g)}"; font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; font-weight: 600; color: #64748b; }
    @bottom-left { content: "${n(e)}"; font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; color: #64748b; }
    @bottom-right { content: "Trang " counter(page) " / " counter(pages); font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; color: #64748b; }
  }
  * { box-sizing: border-box; }
  body { font-family: "Be Vietnam Pro", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0 auto; padding: 24px; max-width: 820px; }
  h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px; color: #0f172a; }
  .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  .cover { width: 100%; max-height: 320px; object-fit: cover; border-radius: 10px; margin: 12px 0 18px; }
  .summary { background: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #475569; margin-bottom: 20px; }
  .sec { margin-bottom: 26px; page-break-inside: avoid; }
  h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0 0 8px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; page-break-after: avoid; }
  .content { font-size: 14px; overflow-wrap: anywhere; word-break: break-word; }
  .content a { word-break: break-all; }
  .content img { max-width: 100%; height: auto; border-radius: 6px; }
  .content table { border-collapse: collapse; width: 100%; }
  .content td, .content th { border: 1px solid #cbd5e1; padding: 6px 8px; }
  .content .empty { color: #94a3b8; font-style: italic; }
  .resources { margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .res-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin: 0 0 4px; }
  .resources ul { margin: 0; padding-left: 18px; }
  .resources a { color: #2563eb; font-size: 13px; word-break: break-all; }
  a { text-decoration: none; }
</style></head>
<body>
  <h1>${o(t.title||"Bài giảng")}</h1>
  <div class="meta">${o(h)} · ${r.length} phần</div>
  ${f}
  ${x}
  ${b||'<p class="content empty">Bài giảng chưa có nội dung.</p>'}
</body></html>`}async function j(t,r,a,e){var c;const g=(e==null?void 0:e.right)===void 0?await v(t):"",h=(t.author_label||t.owner_name||"").trim(),b=(e==null?void 0:e.right)??(g?`Giáo trình ${g}`:t.title||""),f=(e==null?void 0:e.left)??(h?`Biên soạn: ${h}`:""),x=_(t,r,a,f,b),n=document.createElement("iframe");n.setAttribute("aria-hidden","true"),n.style.position="fixed",n.style.right="0",n.style.bottom="0",n.style.width="0",n.style.height="0",n.style.border="0",document.body.appendChild(n);const i=(c=n.contentWindow)==null?void 0:c.document;if(!i){n.remove();return}i.open(),i.write(x),i.close();let m=!1;const s=()=>{var p,l;if(!m){m=!0;try{(p=n.contentWindow)==null||p.focus(),(l=n.contentWindow)==null||l.print()}catch{}setTimeout(()=>{try{n.remove()}catch{}},6e4)}},d=Array.from(i.images||[]);if(d.length===0)setTimeout(s,300);else{let p=d.length;const l=()=>{p-=1,p<=0&&s()};d.forEach(u=>{u.complete?l():(u.addEventListener("load",l),u.addEventListener("error",l))}),setTimeout(s,2500)}}export{j as exportLessonToPdf};
