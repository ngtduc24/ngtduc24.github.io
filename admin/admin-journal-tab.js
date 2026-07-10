// admin-journal-tab.js v2 — Clean UI journal management
var _jList=[],_jSelected=new Set(),_jPage=0,_jPerPage=30,_jHistory=[],_jExData=[],_jView='list';
var J_FIELDS=["Chăn nuôi - Thú y - Thuỷ sản","Cơ học","Cơ khí - Động lực","Công nghệ thông tin","Dược học","Điện - Điện tử - Tự động hoá","Giao thông vận tải","Khoa học Giáo dục","Hoá học - Công nghệ thực phẩm","Khoa học An ninh","Khoa học Quân sự","Khoa học Trái đất - Mỏ","Kinh tế","Luật học","Luyện kim","Ngôn ngữ học","Nông nghiệp - Lâm nghiệp","Sinh học","Sử học - Khảo cổ - Dân tộc học","Tâm lý học","Thuỷ lợi","Toán học","Triết học - Xã hội học - Chính trị học","Văn hoá - Nghệ thuật - TDTT","Văn học","Vật lý","Xây dựng - Kiến trúc","Y học","Quốc tế (WoS/Scopus)"];
function jKey(j){return(j.name||'').toLowerCase().trim()+'|||'+(j.field||'');}
function jPS(s){var m=String(s||'').match(/[\d.]+/g);return m?parseFloat(m[m.length-1]):0;}
function jE(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function jFD(d){if(!d)return'—';try{var dt=d.toDate?d.toDate():new Date(d);return dt.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+dt.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});}catch(e){return'—';}}
function jFieldOpts(selId){var h='';J_FIELDS.forEach(function(f){h+='<option>'+f+'</option>';});return h;}

async function jLoad(){var db=initFB();var snap=await db.collection('journals').get();_jList=[];snap.forEach(function(d){var j=d.data();j._id=d.id;_jList.push(j);});_jSelected.clear();}

function renderJournalTab(){
  // Stats
  var fields={};_jList.forEach(function(j){fields[j.field||'?']=(fields[j.field||'?']||0)+1;});
  var h='<style>.jt{font-family:inherit}.jt .jtabs{display:flex;gap:6px;margin:16px 0;flex-wrap:wrap}.jt .jtab{padding:8px 18px;border-radius:10px;font-size:.82rem;font-weight:700;cursor:pointer;border:1.5px solid var(--border);background:var(--surface);color:var(--text2);transition:all .15s}.jt .jtab:hover{border-color:var(--primary)}.jt .jtab.on{background:var(--primary);border-color:var(--primary);color:#fff}.jt .jcard{background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:20px;margin-bottom:14px}.jt .jcard h3{font-size:.95rem;font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:8px}.jt .jcard h3 .material-symbols-outlined{color:var(--primary);font-size:20px}.jt .jstats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px}.jt .jstat{background:var(--surface);border:1.5px solid var(--border);border-radius:10px;padding:12px 16px}.jt .jstat .n{font-size:1.5rem;font-weight:900;color:var(--primary)}.jt .jstat .l{font-size:.65rem;color:var(--text3);text-transform:uppercase}.jt .jtbl{overflow-x:auto;border:1.5px solid var(--border);border-radius:12px;background:var(--surface)}.jt .jtbl table{width:100%;border-collapse:collapse;font-size:.8rem}.jt .jtbl thead{background:var(--surface2)}.jt .jtbl th{padding:10px 12px;text-align:left;font-weight:700;font-size:.7rem;text-transform:uppercase;letter-spacing:.03em;color:var(--text2);border-bottom:1.5px solid var(--border);white-space:nowrap}.jt .jtbl td{padding:9px 12px;border-bottom:1px solid var(--border);vertical-align:middle}.jt .jtbl tr{cursor:pointer;transition:background .1s}.jt .jtbl tr:hover{background:rgba(124,58,237,.03)}.jt .jtbl tr.sel{background:rgba(124,58,237,.06)}.jt .jname{font-weight:700;color:var(--text)}.jt .jfield{font-size:.65rem;font-weight:700;color:var(--primary);background:var(--primary-lt);padding:2px 8px;border-radius:999px;white-space:nowrap;display:inline-block}.jt .jscore{font-weight:800;color:var(--primary);white-space:nowrap}.jt .jdel{width:28px;height:28px;border-radius:8px;background:var(--red-lt);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--red);transition:background .12s}.jt .jdel:hover{background:var(--red);color:#fff}.jt .jbar{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center}.jt .jupload{border:2px dashed var(--border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;position:relative;transition:border-color .15s;margin-bottom:10px}.jt .jupload:hover{border-color:var(--primary);background:var(--primary-lt)}.jt .jupload input{position:absolute;inset:0;opacity:0;cursor:pointer}.jt .jprev{max-height:220px;overflow-y:auto;border:1.5px solid var(--border);border-radius:10px;margin:10px 0}.jt .jprev table{font-size:.72rem}.jt .jprev .dupe{background:#FEF2F2}.jt .jprev .new{background:#ECFDF5}.jt .jpager{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:.78rem;color:var(--text3)}</style>';

  h+='<div class="jt"><div class="jstats"><div class="jstat"><div class="n">'+_jList.length+'</div><div class="l">Tổng tạp chí</div></div><div class="jstat"><div class="n">'+Object.keys(fields).length+'</div><div class="l">Ngành</div></div></div>';
  h+='<div class="jtabs"><div class="jtab on" onclick="jSV(\'list\',this)">📋 Danh sách</div><div class="jtab" onclick="jSV(\'add\',this)">➕ Thêm thủ công</div><div class="jtab" onclick="jSV(\'excel\',this)">📊 Nhập Excel</div><div class="jtab" onclick="jSV(\'history\',this)">📜 Lịch sử</div><div class="jtab" onclick="jSV(\'tools\',this)">🔧 Công cụ</div></div>';
  h+='<div id="jVC"></div></div>';
  return h;
}

function jSV(v,el){
  _jView=v;
  document.querySelectorAll('.jt .jtab').forEach(function(t){t.classList.remove('on');});
  if(el)el.classList.add('on');
  var c=document.getElementById('jVC');
  if(v==='list')c.innerHTML=jVList();
  else if(v==='add')c.innerHTML=jVAdd();
  else if(v==='excel')c.innerHTML=jVExcel();
  else if(v==='history')c.innerHTML=jVHistory();
  else if(v==='tools')c.innerHTML=jVTools();
}
function jShowView(v){jSV(v);}

// ═══ LIST ═══
function jVList(){
  var h='<div class="jcard"><div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap"><input type="text" id="jQ" placeholder="Tìm tên tạp chí, ISSN..." oninput="jF()" style="flex:1;min-width:200px"><select id="jFF" onchange="jF()"><option value="">Tất cả ngành</option>'+jFieldOpts()+'</select><select id="jFS" onchange="jF()"><option value="">Tất cả điểm</option><option value="2">≥ 2.0</option><option value="1">≥ 1.0</option><option value="0.5">≥ 0.5</option></select></div>';
  h+='<div class="jbar"><button class="btn btn-danger btn-sm" onclick="jDelSel()"><span class="material-symbols-outlined" style="font-size:14px">delete</span>Xóa đã chọn (<span id="jSN">0</span>)</button><button class="btn btn-ghost btn-sm" onclick="jSelAll()">Chọn tất cả</button><button class="btn btn-ghost btn-sm" onclick="jDesel()">Bỏ chọn</button><span style="margin-left:auto;font-size:.75rem;color:var(--text3)" id="jCnt"></span></div>';
  h+='<p style="font-size:.7rem;color:var(--text3);margin-bottom:8px">💡 Bấm vào dòng để chọn/bỏ chọn</p>';
  h+='<div class="jtbl"><table><thead><tr><th style="width:28px">☑</th><th style="width:36px">TT</th><th>Tên tạp chí</th><th>ISSN</th><th>Loại</th><th>Cơ quan XB</th><th>Ngành</th><th>Điểm</th><th>Ngày nhập</th><th style="width:36px"></th></tr></thead><tbody id="jTB"></tbody></table></div>';
  h+='<div class="jpager" id="jPG"></div></div>';
  setTimeout(jF,30);
  return h;
}
function jF(){
  var q=((document.getElementById('jQ')||{}).value||'').toLowerCase().trim();
  var ff=(document.getElementById('jFF')||{}).value||'';
  var fs=(document.getElementById('jFS')||{}).value||'';
  var fp=(document.getElementById('jFP')||{}).value||'';
  var fd1=(document.getElementById('jFD1')||{}).value||'';
  var fd2=(document.getElementById('jFD2')||{}).value||'';
  var fl=_jList.filter(function(j){
    if(q&&(j.name||'').toLowerCase().indexOf(q)===-1&&(j.issn||'').toLowerCase().indexOf(q)===-1&&(j.pub||'').toLowerCase().indexOf(q)===-1)return false;
    if(ff&&j.field!==ff)return false;
    if(fs&&jPS(j.score)<parseFloat(fs))return false;
    if(fp&&j.pub!==fp)return false;
    if(fd1||fd2){var d=j.importedAt||j.createdAt||'';if(typeof d==='object'&&d.toDate)d=d.toDate().toISOString();var ds=String(d).substring(0,10);if(fd1&&ds<fd1)return false;if(fd2&&ds>fd2)return false;}
    return true;
  }).sort(function(a,b){return jPS(b.score)-jPS(a.score);});
  var tot=fl.length,pgs=Math.ceil(tot/_jPerPage);
  if(_jPage>=pgs)_jPage=Math.max(0,pgs-1);
  var s=_jPage*_jPerPage,e=Math.min(s+_jPerPage,tot),rows=fl.slice(s,e);
  var tb=document.getElementById('jTB');if(!tb)return;
  tb.innerHTML=rows.length?rows.map(function(j,i){
    var sel=_jSelected.has(j._id);
    return '<tr class="'+(sel?'sel':'')+'" onclick="jTR(\''+j._id+'\',this)"><td style="text-align:center;color:var(--primary)">'+(sel?'☑':'☐')+'</td><td style="color:var(--text3);font-weight:600">'+(s+i+1)+'</td><td class="jname">'+jE(j.name)+'</td><td style="font-size:.72rem;color:var(--text2);font-family:monospace">'+jE(j.issn)+'</td><td style="font-size:.72rem">'+jE(j.type)+'</td><td style="font-size:.72rem;color:var(--text2);max-width:160px">'+jE(j.pub)+'</td><td><span class="jfield">'+jE(j.field)+'</span></td><td class="jscore">'+jE(j.score)+'</td><td style="font-size:.68rem;color:var(--text3);white-space:nowrap">'+jFD(j.importedAt||j.createdAt)+'</td><td><button class="jdel" onclick="event.stopPropagation();jDel1(\''+j._id+'\')"><span class="material-symbols-outlined" style="font-size:14px">close</span></button></td></tr>';
  }).join(''):'<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text3)">Không có dữ liệu.</td></tr>';
  var ce=document.getElementById('jCnt');if(ce)ce.textContent=tot+' kết quả';
  var pg=document.getElementById('jPG');if(pg)pg.innerHTML='<span>Trang '+(pgs?_jPage+1:0)+'/'+pgs+'</span><div style="display:flex;gap:4px"><button class="btn btn-ghost btn-sm" onclick="_jPage=Math.max(0,_jPage-1);jF()">← Trước</button><button class="btn btn-ghost btn-sm" onclick="_jPage=Math.min('+(pgs-1)+',_jPage+1);jF()">Sau →</button></div>';
  jUSC();
}
function jTR(id,tr){if(_jSelected.has(id)){_jSelected.delete(id);tr.classList.remove('sel');tr.querySelector('td').textContent='☐';}else{_jSelected.add(id);tr.classList.add('sel');tr.querySelector('td').textContent='☑';}jUSC();}
function jClearFilters(){
  ['jQ','jFD1','jFD2'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  ['jFF','jFS','jFP'].forEach(function(id){var e=document.getElementById(id);if(e)e.selectedIndex=0;});
  jF();
}
function jSelAll(){_jList.forEach(function(j){_jSelected.add(j._id);});jF();}
function jDesel(){_jSelected.clear();jF();}
function jUSC(){var e=document.getElementById('jSN');if(e)e.textContent=_jSelected.size;}
async function jDel1(id){if(!confirm('Xóa tạp chí này?'))return;await initFB().collection('journals').doc(id).delete();_jList=_jList.filter(function(j){return j._id!==id;});_jSelected.delete(id);showAlert('Đã xóa.','success');jF();}
async function jDelSel(){if(!_jSelected.size){showAlert('Chưa chọn.','error');return;}if(!confirm('Xóa '+_jSelected.size+' tạp chí?'))return;var db=initFB(),b=db.batch(),ids=[];_jSelected.forEach(function(id){b.delete(db.collection('journals').doc(id));ids.push(id);});var del=_jList.filter(function(j){return _jSelected.has(j._id);});await jSH('delete',del);await b.commit();_jList=_jList.filter(function(j){return!_jSelected.has(j._id);});_jSelected.clear();showAlert('Đã xóa '+ids.length+'.','success');jF();}

// ═══ ADD ═══
function jVAdd(){
  var h='<div class="jcard"><h3><span class="material-symbols-outlined">add_circle</span>Thêm tạp chí thủ công</h3>';
  h+='<div class="fr"><div class="fg"><label>Tên tạp chí *</label><input type="text" id="ja-n"></div><div class="fg"><label>ISSN</label><input type="text" id="ja-i"></div></div>';
  h+='<div class="fr"><div class="fg"><label>Loại</label><select id="ja-t"><option>Tạp chí</option><option>Kỷ yếu</option></select></div><div class="fg"><label>Ngành *</label><select id="ja-f">'+jFieldOpts()+'</select></div></div>';
  h+='<div class="fr"><div class="fg"><label>Cơ quan xuất bản</label><input type="text" id="ja-p"></div><div class="fg"><label>Điểm *</label><input type="text" id="ja-s" placeholder="0 – 1.0"></div></div>';
  h+='<button class="btn btn-primary" onclick="jAddM()"><span class="material-symbols-outlined" style="font-size:14px">save</span>Thêm tạp chí</button></div>';
  return h;
}
async function jAddM(){
  var n=v('ja-n'),f=document.getElementById('ja-f').value,s=v('ja-s');
  if(!n||!f||!s){showAlert('Nhập tên, ngành và điểm!','error');return;}
  var j={name:n,issn:v('ja-i'),type:document.getElementById('ja-t').value,pub:v('ja-p'),field:f,score:s,importedAt:new Date().toISOString()};
  if(_jList.find(function(x){return jKey(x)===jKey(j);})){showAlert('Trùng! "'+n+'" đã có trong ngành này.','error');return;}
  var ref=await initFB().collection('journals').add(j);j._id=ref.id;_jList.push(j);
  await jSH('add',[j]);
  document.getElementById('ja-n').value='';document.getElementById('ja-i').value='';document.getElementById('ja-p').value='';document.getElementById('ja-s').value='';
  showAlert('Đã thêm: '+n,'success');
}

// ═══ EXCEL ═══
function jVExcel(){
  var h='<div class="jcard"><h3><span class="material-symbols-outlined">table_chart</span>Nhập / Xuất Excel</h3>';
  h+='<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" onclick="jDLT()"><span class="material-symbols-outlined" style="font-size:14px">download</span>Tải file mẫu</button><button class="btn btn-secondary btn-sm" onclick="jExpAll()"><span class="material-symbols-outlined" style="font-size:14px">file_download</span>Xuất toàn bộ</button></div>';
  h+='<div class="jupload" onclick="document.getElementById(\'jEF\').click()"><span class="material-symbols-outlined" style="font-size:32px;color:var(--primary);opacity:.5">upload_file</span><p style="font-size:.82rem;color:var(--text3)">Nhấn để chọn file Excel (.xlsx)</p><input type="file" id="jEF" accept=".xlsx,.xls,.csv" onchange="jHExcel(this)"></div>';
  h+='<div class="fg"><label>Ngành áp dụng *</label><select id="jex-f">'+jFieldOpts()+'</select></div>';
  h+='<div id="jExSpin" style="display:none;text-align:center;padding:12px;color:var(--primary)">⏳ Đang xử lý...</div>';
  h+='<div id="jExPrev"></div>';
  h+='<div id="jExAct" style="display:none;margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn btn-primary" onclick="jImpExcel()"><span class="material-symbols-outlined" style="font-size:14px">cloud_upload</span>Nhập dữ liệu mới</button><span id="jExSum" style="font-size:.78rem;color:var(--text3)"></span></div>';
  h+='</div>';
  return h;
}
function jDLT(){var ws=XLSX.utils.aoa_to_sheet([['TT','Tên tạp chí','ISSN','Loại','Cơ quan XB','Điểm'],['1','Ví dụ','1234-5678','Tạp chí','ĐH ABC','0 – 1.0']]);ws['!cols']=[{wch:5},{wch:35},{wch:15},{wch:10},{wch:30},{wch:12}];var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Mau');XLSX.writeFile(wb,'mau_tap_chi.xlsx');}
function jExpAll(){var d=[['TT','Tên tạp chí','ISSN','Loại','Cơ quan XB','Ngành','Điểm','Ngày nhập']];_jList.forEach(function(j,i){d.push([i+1,j.name,j.issn,j.type,j.pub,j.field,j.score,jFD(j.importedAt)]);});var ws=XLSX.utils.aoa_to_sheet(d);ws['!cols']=[{wch:5},{wch:40},{wch:15},{wch:10},{wch:35},{wch:30},{wch:12},{wch:18}];var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'TapChi');XLSX.writeFile(wb,'tapchi_2025.xlsx');}
function jHExcel(inp){
  var file=inp.files[0];if(!file)return;
  document.getElementById('jExSpin').style.display='block';
  var reader=new FileReader();reader.onload=function(e){
    var wb=XLSX.read(e.target.result,{type:'binary'});var rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
    var ek={};_jList.forEach(function(j){ek[jKey(j)]=true;});
    _jExData=[];var dup=0,nw=0,field=document.getElementById('jex-f').value;
    for(var i=1;i<rows.length;i++){var r=rows[i];if(!r||!r[1])continue;var j={name:String(r[1]||'').trim(),issn:String(r[2]||'').trim(),type:String(r[3]||'Tạp chí').trim(),pub:String(r[4]||'').trim(),score:String(r[5]||'').trim()};j._isDupe=!!ek[j.name.toLowerCase().trim()+'|||'+field];if(j._isDupe)dup++;else nw++;_jExData.push(j);}
    document.getElementById('jExSpin').style.display='none';
    var prev='<div class="jprev"><table><thead><tr><th style="padding:6px 8px">Tên</th><th style="padding:6px 8px">ISSN</th><th style="padding:6px 8px">Điểm</th><th style="padding:6px 8px">Trạng thái</th></tr></thead><tbody>';
    _jExData.forEach(function(j){prev+='<tr class="'+(j._isDupe?'dupe':'new')+'"><td style="padding:5px 8px">'+jE(j.name)+'</td><td style="padding:5px 8px">'+jE(j.issn)+'</td><td style="padding:5px 8px">'+jE(j.score)+'</td><td style="padding:5px 8px;font-weight:700;color:'+(j._isDupe?'var(--red)':'var(--green)')+';">'+(j._isDupe?'TRÙNG':'MỚI')+'</td></tr>';});
    prev+='</tbody></table></div>';
    document.getElementById('jExPrev').innerHTML=prev;
    document.getElementById('jExAct').style.display='flex';
    document.getElementById('jExSum').textContent=_jExData.length+' dòng: '+nw+' mới, '+dup+' trùng (bỏ qua)';
  };reader.readAsBinaryString(file);
}
async function jImpExcel(){
  var field=document.getElementById('jex-f').value,toAdd=_jExData.filter(function(j){return!j._isDupe;});
  if(!toAdd.length){showAlert('Không có dữ liệu mới.','error');return;}
  var db=initFB(),batch=db.batch(),cnt=0,now=new Date().toISOString(),bid='imp_'+Date.now(),imported=[];
  for(var i=0;i<toAdd.length;i++){var j={name:toAdd[i].name,issn:toAdd[i].issn,type:toAdd[i].type,pub:toAdd[i].pub,field:field,score:toAdd[i].score,importedAt:now,batchId:bid};var ref=db.collection('journals').doc();batch.set(ref,j);j._id=ref.id;imported.push(j);cnt++;if(cnt%400===0){await batch.commit();batch=db.batch();}}
  if(cnt%400!==0)await batch.commit();
  imported.forEach(function(j){_jList.push(j);});await jSH('import',imported,bid);
  showAlert('Đã nhập '+cnt+' tạp chí!','success');_jExData=[];document.getElementById('jExPrev').innerHTML='';document.getElementById('jExAct').style.display='none';
}

// ═══ HISTORY ═══
async function jLH(){var db=initFB();var snap=await db.collection('import_history').orderBy('date','desc').limit(50).get();_jHistory=[];snap.forEach(function(d){var h=d.data();h._id=d.id;_jHistory.push(h);});}
async function jSH(action,items,bid){await initFB().collection('import_history').add({action:action,count:items.length,batchId:bid||'',date:new Date().toISOString(),user:(firebase.auth().currentUser||{}).email||'?',items:items.slice(0,100).map(function(j){return{name:j.name,field:j.field,_id:j._id||''};})});}

function jVHistory(){
  var h='<div class="jcard"><h3><span class="material-symbols-outlined">history</span>Lịch sử nhập / xóa</h3>';
  h+='<button class="btn btn-secondary btn-sm" onclick="jRefH()" style="margin-bottom:12px"><span class="material-symbols-outlined" style="font-size:14px">refresh</span>Tải lịch sử</button>';
  h+='<div style="margin-bottom:14px"><p style="font-size:.82rem;font-weight:700;margin-bottom:6px">⚡ Xóa nhanh theo thời gian nhập:</p><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><button class="btn btn-danger btn-sm" onclick="jDelTime(1)">1 giờ trước</button><button class="btn btn-danger btn-sm" onclick="jDelTime(24)">24 giờ trước</button><button class="btn btn-danger btn-sm" onclick="jDelTime(168)">7 ngày trước</button><span style="font-size:.78rem;color:var(--text3)">|</span><input type="date" id="jHD1" style="width:auto;font-size:.78rem" title="Từ ngày"><input type="date" id="jHD2" style="width:auto;font-size:.78rem" title="Đến ngày"><button class="btn btn-danger btn-sm" onclick="jDelDateRange()">Xóa khoảng ngày</button></div></div>';
  h+='<div id="jHList"><p style="color:var(--text3);font-size:.82rem">Bấm "Tải lịch sử" để xem.</p></div></div>';
  return h;
}
async function jRefH(){
  await jLH();var el=document.getElementById('jHList');
  if(!_jHistory.length){el.innerHTML='<p style="color:var(--text3)">Chưa có lịch sử.</p>';return;}
  el.innerHTML=_jHistory.map(function(h,idx){
    var ic=h.action==='import'?'📥':h.action==='add'?'➕':'🗑️';
    var txt=h.action==='import'?'Nhập '+h.count:h.action==='add'?'Thêm '+h.count:'Xóa '+h.count;
    var undo=h.action==='import'&&h.batchId?'<button class="btn btn-danger btn-sm" data-bid="'+h.batchId+'" data-hid="'+h._id+'" onclick="jUndo(this)">↩ Hoàn tác tất cả</button>':'';
    var toggle='<button class="btn btn-ghost btn-sm" onclick="jToggleHItems('+idx+')"><span class="material-symbols-outlined" style="font-size:14px">expand_more</span>Chi tiết</button>';
    // Item list (hidden by default)
    var items='<div id="jHItems'+idx+'" style="display:none;margin-top:8px;border-top:1px solid var(--border);padding-top:8px">';
    if(h.items&&h.items.length){
      items+='<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center"><button class="btn btn-danger btn-sm" onclick="jDelHSel('+idx+')"><span class="material-symbols-outlined" style="font-size:12px">delete</span>Xóa đã chọn</button><button class="btn btn-ghost btn-sm" onclick="jSelHAll('+idx+')">Chọn tất cả</button><button class="btn btn-ghost btn-sm" onclick="jDeselH('+idx+')">Bỏ chọn</button></div>';
      items+='<div style="max-height:200px;overflow-y:auto">';
      h.items.forEach(function(it,ii){
        items+='<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);font-size:.78rem;cursor:pointer" onclick="jToggleHItem('+idx+','+ii+',this)"><span style="color:var(--primary);width:16px" class="jhi-chk">☐</span><span style="flex:1;font-weight:600">'+jE(it.name)+'</span><span style="font-size:.68rem;color:var(--text3)">'+jE(it.field)+'</span></div>';
      });
      items+='</div>';
    }else{items+='<p style="font-size:.75rem;color:var(--text3)">Không có chi tiết.</p>';}
    items+='</div>';
    return '<div class="mt-item" style="flex-direction:column;align-items:stretch"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"><div class="info"><div class="name">'+ic+' '+txt+' tạp chí</div><div class="slug">'+jE(h.user)+' · '+h.date.substring(0,16).replace('T',' ')+'</div></div><div style="display:flex;gap:4px">'+toggle+undo+'</div></div>'+items+'</div>';
  }).join('');
}
var _jHSel={};
function jToggleHItems(idx){var el=document.getElementById('jHItems'+idx);el.style.display=el.style.display==='none'?'block':'none';}
function jToggleHItem(idx,ii,el){
  var key=idx+'_'+ii;
  var chk=el.querySelector('.jhi-chk');
  if(_jHSel[key]){delete _jHSel[key];chk.textContent='☐';el.style.background='';}
  else{_jHSel[key]=_jHistory[idx].items[ii];chk.textContent='☑';el.style.background='rgba(124,58,237,.05)';}
}
function jSelHAll(idx){
  var h=_jHistory[idx];if(!h||!h.items)return;
  var container=document.getElementById('jHItems'+idx);
  var rows=container.querySelectorAll('[onclick*="jToggleHItem"]');
  h.items.forEach(function(it,ii){var key=idx+'_'+ii;_jHSel[key]=it;});
  rows.forEach(function(r){r.style.background='rgba(124,58,237,.05)';r.querySelector('.jhi-chk').textContent='☑';});
}
function jDeselH(idx){
  var h=_jHistory[idx];if(!h||!h.items)return;
  var container=document.getElementById('jHItems'+idx);
  var rows=container.querySelectorAll('[onclick*="jToggleHItem"]');
  h.items.forEach(function(it,ii){delete _jHSel[idx+'_'+ii];});
  rows.forEach(function(r){r.style.background='';r.querySelector('.jhi-chk').textContent='☐';});
}
async function jDelHSel(idx){
  var ids=[];Object.keys(_jHSel).forEach(function(k){if(k.startsWith(idx+'_')&&_jHSel[k]&&_jHSel[k]._id)ids.push(_jHSel[k]._id);});
  if(!ids.length){showAlert('Chưa chọn bài nào.','error');return;}
  if(!confirm('Xóa '+ids.length+' tạp chí đã chọn?'))return;
  var db=initFB(),batch=db.batch();
  ids.forEach(function(id){batch.delete(db.collection('journals').doc(id));});
  await batch.commit();
  var idSet=new Set(ids);_jList=_jList.filter(function(j){return!idSet.has(j._id);});
  ids.forEach(function(){});Object.keys(_jHSel).forEach(function(k){if(k.startsWith(idx+'_'))delete _jHSel[k];});
  showAlert('Đã xóa '+ids.length+' tạp chí.','success');
  jRefH();
}
async function jUndo(btn){
  var bid=btn.dataset.bid,hid=btn.dataset.hid;
  if(!confirm('Hoàn tác lần nhập này?'))return;
  var db=initFB(),snap=await db.collection('journals').where('batchId','==',bid).get();
  if(snap.empty){showAlert('Không tìm thấy.','error');return;}
  var batch=db.batch(),cnt=0;snap.forEach(function(d){batch.delete(d.ref);cnt++;});
  await batch.commit();
  var ids=new Set();snap.forEach(function(d){ids.add(d.id);});
  _jList=_jList.filter(function(j){return!ids.has(j._id);});
  await db.collection('import_history').doc(hid).delete();
  showAlert('Hoàn tác: xóa '+cnt+' tạp chí.','success');jRefH();
}
async function jDelTime(hrs){
  var cutoff=new Date(Date.now()-hrs*3600000).toISOString();
  var recent=_jList.filter(function(j){return j.importedAt&&j.importedAt>cutoff;});
  if(!recent.length){showAlert('Không có tạp chí nhập trong '+hrs+' giờ qua.','error');return;}
  if(!confirm('Xóa '+recent.length+' tạp chí nhập trong '+hrs+' giờ qua?'))return;
  var db=initFB(),batch=db.batch();
  recent.forEach(function(j){batch.delete(db.collection('journals').doc(j._id));});
  await batch.commit();
  var ids=new Set(recent.map(function(j){return j._id;}));
  _jList=_jList.filter(function(j){return!ids.has(j._id);});
  showAlert('Đã xóa '+recent.length+'.','success');
}
async function jDelDateRange(){
  var d1=(document.getElementById('jHD1')||{}).value||'';
  var d2=(document.getElementById('jHD2')||{}).value||'';
  if(!d1&&!d2){showAlert('Chọn khoảng ngày!','error');return;}
  var matches=_jList.filter(function(j){
    var d=j.importedAt||j.createdAt||'';if(typeof d==='object'&&d.toDate)d=d.toDate().toISOString();var ds=String(d).substring(0,10);
    if(d1&&ds<d1)return false;if(d2&&ds>d2)return false;return true;
  });
  if(!matches.length){showAlert('Không có tạp chí trong khoảng ngày này.','error');return;}
  if(!confirm('Xóa '+matches.length+' tạp chí nhập từ '+(d1||'đầu')+' đến '+(d2||'nay')+'?'))return;
  var db=initFB(),batch=db.batch();
  matches.forEach(function(j){batch.delete(db.collection('journals').doc(j._id));});
  await batch.commit();
  var ids=new Set(matches.map(function(j){return j._id;}));
  _jList=_jList.filter(function(j){return!ids.has(j._id);});
  showAlert('Đã xóa '+matches.length+'.','success');
}

// ═══ TOOLS ═══
function jVTools(){
  var h='<div class="jcard"><h3><span class="material-symbols-outlined">build</span>Công cụ</h3>';
  h+='<div style="display:flex;flex-direction:column;gap:8px"><button class="btn btn-secondary" onclick="jFindDup()"><span class="material-symbols-outlined" style="font-size:16px">find_replace</span>Tìm và xóa bản trùng</button>';
  h+='<button class="btn btn-danger" onclick="jDelField()"><span class="material-symbols-outlined" style="font-size:16px">delete_sweep</span>Xóa toàn bộ theo ngành</button></div>';
  h+='<div id="jTLog" style="margin-top:10px;font-size:.78rem;background:var(--surface2);padding:10px;border-radius:8px;white-space:pre-wrap;max-height:200px;overflow-y:auto"></div></div>';
  return h;
}
async function jFindDup(){
  var seen={},dids=[];_jList.forEach(function(j){var k=jKey(j);if(seen[k])dids.push(j._id);else seen[k]=true;});
  var log=document.getElementById('jTLog');log.textContent='Tìm thấy '+dids.length+' trùng.\n';
  if(!dids.length){log.textContent+='✅ Không trùng!';return;}
  if(!confirm('Xóa '+dids.length+' trùng?'))return;
  var db=initFB(),b=db.batch();dids.forEach(function(id){b.delete(db.collection('journals').doc(id));});await b.commit();
  _jList=_jList.filter(function(j){return dids.indexOf(j._id)===-1;});
  log.textContent+='✅ Đã xóa '+dids.length+' trùng.\n';showAlert('Xóa '+dids.length+' trùng.','success');
}
async function jDelField(){
  var f=prompt('Nhập tên ngành:');if(!f)return;
  var ids=_jList.filter(function(j){return j.field===f;}).map(function(j){return j._id;});
  if(!ids.length){showAlert('Không tìm thấy: '+f,'error');return;}
  if(!confirm('Xóa '+ids.length+' tạp chí ngành "'+f+'"?'))return;
  var db=initFB(),b=db.batch();ids.forEach(function(id){b.delete(db.collection('journals').doc(id));});await b.commit();
  _jList=_jList.filter(function(j){return j.field!==f;});showAlert('Đã xóa '+ids.length+'.','success');
}
