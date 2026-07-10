// admin-journal-tab.js — Journal management for admin
// Requires: Firebase initialized via fb-init.js, SheetJS (xlsx)

var _jList=[],_jSelected=new Set(),_jPage=0,_jPerPage=30,_jHistory=[];
var J_FIELDS=["Chăn nuôi - Thú y - Thuỷ sản","Cơ học","Cơ khí - Động lực","Công nghệ thông tin","Dược học","Điện - Điện tử - Tự động hoá","Giao thông vận tải","Khoa học Giáo dục","Hoá học - Công nghệ thực phẩm","Khoa học An ninh","Khoa học Quân sự","Khoa học Trái đất - Mỏ","Kinh tế","Luật học","Luyện kim","Ngôn ngữ học","Nông nghiệp - Lâm nghiệp","Sinh học","Sử học - Khảo cổ - Dân tộc học","Tâm lý học","Thuỷ lợi","Toán học","Triết học - Xã hội học - Chính trị học","Văn hoá - Nghệ thuật - TDTT","Văn học","Vật lý","Xây dựng - Kiến trúc","Y học","Quốc tế (WoS/Scopus)"];

function jKey(j){return(j.name||'').toLowerCase().trim()+'|||'+(j.field||'');}
function jParseScore(s){var m=String(s||'').match(/[\d.]+/g);return m?parseFloat(m[m.length-1]):0;}
function jEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function jFmtDate(d){if(!d)return'';try{var dt=d.toDate?d.toDate():new Date(d);return dt.toLocaleDateString('vi-VN')+' '+dt.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});}catch(e){return String(d).substring(0,16);}}

async function jLoad(){
  var db=initFB();
  var snap=await db.collection('journals').get();
  _jList=[];snap.forEach(function(d){var j=d.data();j._id=d.id;_jList.push(j);});
  _jSelected.clear();
}

function renderJournalTab(){
  var html='<div class="page-header"><h1>Quản Lý Tạp Chí Khoa Học</h1><p>'+_jList.length+' tạp chí · HĐGSNN 2025</p></div>';

  // Sub-tabs
  html+='<div style="display:flex;gap:4px;margin-bottom:14px;flex-wrap:wrap">';
  html+='<button class="btn btn-primary btn-sm" onclick="jShowView(\'list\')">📋 Danh sách</button>';
  html+='<button class="btn btn-secondary btn-sm" onclick="jShowView(\'add\')">➕ Thêm</button>';
  html+='<button class="btn btn-secondary btn-sm" onclick="jShowView(\'excel\')">📊 Excel</button>';
  html+='<button class="btn btn-secondary btn-sm" onclick="jShowView(\'history\')">📜 Lịch sử nhập</button>';
  html+='<button class="btn btn-secondary btn-sm" onclick="jShowView(\'tools\')">🔧 Công cụ</button>';
  html+='</div>';

  html+='<div id="jViewContainer"></div>';
  return html;
}

function jShowView(v){
  var el=document.getElementById('jViewContainer');
  if(v==='list')el.innerHTML=jRenderList();
  else if(v==='add')el.innerHTML=jRenderAddForm();
  else if(v==='excel')el.innerHTML=jRenderExcel();
  else if(v==='history')el.innerHTML=jRenderHistory();
  else if(v==='tools')el.innerHTML=jRenderTools();
}

// ═══ LIST VIEW ═══
function jRenderList(){
  var html='<div class="card">';
  html+='<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
  html+='<input type="text" id="jQ" placeholder="Tìm tên, ISSN..." oninput="jFilter()" style="flex:1;min-width:180px">';
  html+='<select id="jFF" onchange="jFilter()"><option value="">Tất cả ngành</option>';
  J_FIELDS.forEach(function(f){html+='<option>'+f+'</option>';});
  html+='</select>';
  html+='<select id="jFS" onchange="jFilter()"><option value="">Tất cả điểm</option><option value="2">≥2.0</option><option value="1">≥1.0</option><option value="0.5">≥0.5</option></select>';
  html+='</div>';

  // Actions
  html+='<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center">';
  html+='<button class="btn btn-danger btn-sm" onclick="jDeleteSelected()"><span class="material-symbols-outlined" style="font-size:14px">delete</span>Xóa đã chọn (<span id="jSelN">0</span>)</button>';
  html+='<button class="btn btn-ghost btn-sm" onclick="jSelectAll()">Chọn tất cả</button>';
  html+='<button class="btn btn-ghost btn-sm" onclick="jDeselectAll()">Bỏ chọn</button>';
  html+='<span style="margin-left:auto;font-size:.75rem;color:var(--text3)" id="jCount"></span>';
  html+='</div>';
  html+='<p style="font-size:.7rem;color:var(--text3);margin-bottom:8px">💡 Bấm vào dòng để chọn/bỏ chọn.</p>';

  html+='<div style="overflow-x:auto;border:1.5px solid var(--border);border-radius:10px"><table style="width:100%;border-collapse:collapse;font-size:.78rem"><thead style="background:var(--surface2)"><tr><th style="padding:8px;width:30px;text-align:center">☑</th><th style="padding:8px">Tên tạp chí</th><th style="padding:8px">ISSN</th><th style="padding:8px">Loại</th><th style="padding:8px">Cơ quan XB</th><th style="padding:8px">Ngành</th><th style="padding:8px">Điểm</th><th style="padding:8px">Ngày nhập</th></tr></thead><tbody id="jTbody"></tbody></table></div>';
  html+='<div id="jPager" style="display:flex;justify-content:space-between;margin-top:8px;font-size:.78rem;color:var(--text3)"></div>';
  html+='</div>';
  setTimeout(jFilter,50);
  return html;
}

function jFilter(){
  var q=(document.getElementById('jQ')||{}).value||'';q=q.toLowerCase().trim();
  var ff=(document.getElementById('jFF')||{}).value||'';
  var fs=(document.getElementById('jFS')||{}).value||'';
  var filtered=_jList.filter(function(j){
    if(q&&(j.name||'').toLowerCase().indexOf(q)===-1&&(j.issn||'').toLowerCase().indexOf(q)===-1&&(j.pub||'').toLowerCase().indexOf(q)===-1)return false;
    if(ff&&j.field!==ff)return false;
    if(fs&&jParseScore(j.score)<parseFloat(fs))return false;
    return true;
  });
  filtered.sort(function(a,b){return jParseScore(b.score)-jParseScore(a.score);});
  var total=filtered.length,pages=Math.ceil(total/_jPerPage);
  if(_jPage>=pages)_jPage=Math.max(0,pages-1);
  var start=_jPage*_jPerPage,end=Math.min(start+_jPerPage,total);
  var rows=filtered.slice(start,end);
  var el=document.getElementById('jTbody');if(!el)return;
  el.innerHTML=rows.length?rows.map(function(j,i){
    var sel=_jSelected.has(j._id);
    var bg=sel?'background:rgba(124,58,237,.06);':'';
    return '<tr style="cursor:pointer;'+bg+'border-bottom:1px solid var(--border)" onclick="jToggleRow(\''+j._id+'\',this)"><td style="padding:6px 8px;text-align:center">'+(sel?'☑':'☐')+'</td><td style="padding:6px 8px;font-weight:600">'+jEsc(j.name)+'</td><td style="padding:6px 8px;font-size:.72rem;color:var(--text2)">'+jEsc(j.issn)+'</td><td style="padding:6px 8px;font-size:.72rem">'+jEsc(j.type)+'</td><td style="padding:6px 8px;font-size:.72rem;color:var(--text2);max-width:160px">'+jEsc(j.pub)+'</td><td style="padding:6px 8px"><span style="font-size:.65rem;font-weight:700;color:var(--primary);background:var(--primary-lt);padding:2px 6px;border-radius:999px;white-space:nowrap">'+jEsc(j.field)+'</span></td><td style="padding:6px 8px;font-weight:800;color:var(--primary);white-space:nowrap">'+jEsc(j.score)+'</td><td style="padding:6px 8px;font-size:.7rem;color:var(--text3);white-space:nowrap">'+jFmtDate(j.importedAt||j.createdAt)+'</td></tr>';
  }).join(''):'<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3)">Không có dữ liệu.</td></tr>';
  (document.getElementById('jCount')||{}).textContent=total+' kết quả';
  (document.getElementById('jPager')||{}).innerHTML='<span>Trang '+(pages?_jPage+1:0)+'/'+pages+'</span><div><button class="btn btn-ghost btn-sm" onclick="_jPage=Math.max(0,_jPage-1);jFilter()">← Trước</button> <button class="btn btn-ghost btn-sm" onclick="_jPage=Math.min('+(pages-1)+',_jPage+1);jFilter()">Sau →</button></div>';
  jUpdateSelCount();
}

function jToggleRow(id,tr){
  if(_jSelected.has(id)){_jSelected.delete(id);tr.style.background='';}
  else{_jSelected.add(id);tr.style.background='rgba(124,58,237,.06)';}
  tr.querySelector('td').textContent=_jSelected.has(id)?'☑':'☐';
  jUpdateSelCount();
}
function jSelectAll(){_jList.forEach(function(j){_jSelected.add(j._id);});jFilter();}
function jDeselectAll(){_jSelected.clear();jFilter();}
function jUpdateSelCount(){var el=document.getElementById('jSelN');if(el)el.textContent=_jSelected.size;}

async function jDeleteSelected(){
  if(!_jSelected.size){showAlert('Chưa chọn mục nào.','error');return;}
  if(!confirm('Xóa '+_jSelected.size+' tạp chí đã chọn?'))return;
  var db=initFB(),batch=db.batch(),ids=[];
  _jSelected.forEach(function(id){batch.delete(db.collection('journals').doc(id));ids.push(id);});
  // Save to history
  var deleted=_jList.filter(function(j){return _jSelected.has(j._id);});
  await jSaveHistory('delete',deleted);
  await batch.commit();
  _jList=_jList.filter(function(j){return!_jSelected.has(j._id);});
  _jSelected.clear();
  showAlert('Đã xóa '+ids.length+' tạp chí.','success');
  jFilter();
}

// ═══ ADD FORM ═══
function jRenderAddForm(){
  var html='<div class="card"><div class="card-title">➕ Thêm tạp chí thủ công</div>';
  html+='<div class="fr"><div class="fg"><label>Tên tạp chí *</label><input type="text" id="ja-name"></div><div class="fg"><label>ISSN</label><input type="text" id="ja-issn"></div></div>';
  html+='<div class="fr"><div class="fg"><label>Loại</label><select id="ja-type"><option>Tạp chí</option><option>Kỷ yếu</option></select></div><div class="fg"><label>Ngành *</label><select id="ja-field">';
  J_FIELDS.forEach(function(f){html+='<option>'+f+'</option>';});
  html+='</select></div></div>';
  html+='<div class="fr"><div class="fg"><label>Cơ quan xuất bản</label><input type="text" id="ja-pub"></div><div class="fg"><label>Điểm *</label><input type="text" id="ja-score" placeholder="0 – 1.0"></div></div>';
  html+='<button class="btn btn-primary" onclick="jAddManual()"><span class="material-symbols-outlined" style="font-size:14px">save</span>Thêm</button></div>';
  return html;
}

async function jAddManual(){
  var name=document.getElementById('ja-name').value.trim();
  var field=document.getElementById('ja-field').value;
  var score=document.getElementById('ja-score').value.trim();
  if(!name||!field||!score){showAlert('Nhập tên, ngành và điểm!','error');return;}
  var j={name:name,issn:document.getElementById('ja-issn').value.trim(),type:document.getElementById('ja-type').value,pub:document.getElementById('ja-pub').value.trim(),field:field,score:score,importedAt:new Date().toISOString()};
  // Check dupe
  var key=jKey(j),dupe=_jList.find(function(x){return jKey(x)===key;});
  if(dupe){showAlert('Trùng! Tạp chí "'+name+'" đã tồn tại trong ngành này.','error');return;}
  var ref=await initFB().collection('journals').add(j);
  j._id=ref.id;_jList.push(j);
  await jSaveHistory('add',[j]);
  document.getElementById('ja-name').value='';document.getElementById('ja-issn').value='';document.getElementById('ja-pub').value='';document.getElementById('ja-score').value='';
  showAlert('Đã thêm: '+name,'success');
}

// ═══ EXCEL ═══
function jRenderExcel(){
  var html='<div class="card"><div class="card-title">📊 Nhập/Xuất Excel</div>';
  html+='<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">';
  html+='<button class="btn btn-secondary btn-sm" onclick="jDownloadTemplate()"><span class="material-symbols-outlined" style="font-size:14px">download</span>Tải file mẫu</button>';
  html+='<button class="btn btn-secondary btn-sm" onclick="jExportAll()"><span class="material-symbols-outlined" style="font-size:14px">file_download</span>Xuất toàn bộ</button>';
  html+='</div>';
  html+='<div style="border:2px dashed var(--border);border-radius:10px;padding:20px;text-align:center;cursor:pointer;position:relative;margin-bottom:8px" onclick="document.getElementById(\'jExFile\').click()"><span class="material-symbols-outlined" style="font-size:28px;color:var(--primary);opacity:.5">upload_file</span><p style="font-size:.8rem;color:var(--text3)">Nhấn để chọn file Excel (.xlsx)</p><input type="file" id="jExFile" accept=".xlsx,.xls,.csv" onchange="jHandleExcel(this)" style="position:absolute;inset:0;opacity:0;cursor:pointer"></div>';
  html+='<div class="fg"><label>Ngành áp dụng *</label><select id="jex-field">';J_FIELDS.forEach(function(f){html+='<option>'+f+'</option>';});html+='</select></div>';
  html+='<div id="jExSpinner" style="display:none;text-align:center;padding:12px;color:var(--primary);font-size:.82rem">⏳ Đang xử lý...</div>';
  html+='<div id="jExPreview"></div>';
  html+='<div id="jExActions" style="display:none;margin-top:8px"><button class="btn btn-primary" onclick="jImportExcel()"><span class="material-symbols-outlined" style="font-size:14px">cloud_upload</span>Nhập dữ liệu mới (bỏ qua trùng)</button> <span id="jExSum" style="font-size:.78rem;color:var(--text3)"></span></div>';
  html+='</div>';
  return html;
}

var _jExData=[];
function jDownloadTemplate(){
  var ws=XLSX.utils.aoa_to_sheet([['TT','Tên tạp chí','Chỉ số ISSN','Loại','Cơ quan xuất bản','Điểm'],['1','Ví dụ: Tạp chí ABC','1234-5678','Tạp chí','Đại học XYZ','0 – 1.0']]);
  ws['!cols']=[{wch:5},{wch:35},{wch:15},{wch:10},{wch:30},{wch:12}];
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Mau');XLSX.writeFile(wb,'mau_tap_chi.xlsx');
}
function jExportAll(){
  var data=[['TT','Tên tạp chí','ISSN','Loại','Cơ quan XB','Ngành','Điểm','Ngày nhập']];
  _jList.forEach(function(j,i){data.push([i+1,j.name,j.issn,j.type,j.pub,j.field,j.score,jFmtDate(j.importedAt)]);});
  var ws=XLSX.utils.aoa_to_sheet(data);ws['!cols']=[{wch:5},{wch:40},{wch:15},{wch:10},{wch:35},{wch:30},{wch:12},{wch:18}];
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'TapChi');XLSX.writeFile(wb,'tapchi_hdgsnn_2025.xlsx');
}
function jHandleExcel(input){
  var file=input.files[0];if(!file)return;
  document.getElementById('jExSpinner').style.display='block';
  var reader=new FileReader();
  reader.onload=function(e){
    var wb=XLSX.read(e.target.result,{type:'binary'});
    var rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
    var existKeys={};_jList.forEach(function(j){existKeys[jKey(j)]=true;});
    _jExData=[];var dupes=0,newC=0;
    var field=document.getElementById('jex-field').value;
    for(var i=1;i<rows.length;i++){
      var r=rows[i];if(!r||!r[1])continue;
      var j={name:String(r[1]||'').trim(),issn:String(r[2]||'').trim(),type:String(r[3]||'Tạp chí').trim(),pub:String(r[4]||'').trim(),score:String(r[5]||'').trim()};
      var key=j.name.toLowerCase().trim()+'|||'+field;
      j._isDupe=!!existKeys[key];
      if(j._isDupe)dupes++;else newC++;
      _jExData.push(j);
    }
    document.getElementById('jExSpinner').style.display='none';
    // Preview
    var prev='<div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:.72rem"><thead><tr><th style="padding:4px 6px">Tên</th><th style="padding:4px 6px">ISSN</th><th style="padding:4px 6px">Điểm</th><th style="padding:4px 6px">Trạng thái</th></tr></thead><tbody>';
    _jExData.forEach(function(j){
      var cls=j._isDupe?'background:var(--red-lt)':'background:var(--green-lt)';
      var st=j._isDupe?'<span style="color:var(--red);font-weight:700">TRÙNG</span>':'<span style="color:var(--green);font-weight:700">MỚI</span>';
      prev+='<tr style="'+cls+'"><td style="padding:4px 6px">'+jEsc(j.name)+'</td><td style="padding:4px 6px">'+jEsc(j.issn)+'</td><td style="padding:4px 6px">'+jEsc(j.score)+'</td><td style="padding:4px 6px">'+st+'</td></tr>';
    });
    prev+='</tbody></table></div>';
    document.getElementById('jExPreview').innerHTML=prev;
    document.getElementById('jExActions').style.display='block';
    document.getElementById('jExSum').textContent=_jExData.length+' dòng: '+newC+' mới, '+dupes+' trùng';
  };
  reader.readAsBinaryString(file);
}
async function jImportExcel(){
  var field=document.getElementById('jex-field').value;
  var toAdd=_jExData.filter(function(j){return!j._isDupe;});
  if(!toAdd.length){showAlert('Không có dữ liệu mới.','error');return;}
  var db=initFB(),batch=db.batch(),count=0,now=new Date().toISOString(),batchId='import_'+Date.now();
  var imported=[];
  for(var i=0;i<toAdd.length;i++){
    var j={name:toAdd[i].name,issn:toAdd[i].issn,type:toAdd[i].type,pub:toAdd[i].pub,field:field,score:toAdd[i].score,importedAt:now,batchId:batchId};
    var ref=db.collection('journals').doc();batch.set(ref,j);
    j._id=ref.id;imported.push(j);count++;
    if(count%400===0){await batch.commit();batch=db.batch();}
  }
  if(count%400!==0)await batch.commit();
  imported.forEach(function(j){_jList.push(j);});
  await jSaveHistory('import',imported,batchId);
  showAlert('Đã nhập '+count+' tạp chí mới!','success');
  _jExData=[];document.getElementById('jExPreview').innerHTML='';document.getElementById('jExActions').style.display='none';
}

// ═══ HISTORY ═══
async function jLoadHistory(){
  var db=initFB();
  var snap=await db.collection('import_history').orderBy('date','desc').limit(50).get();
  _jHistory=[];snap.forEach(function(d){var h=d.data();h._id=d.id;_jHistory.push(h);});
}
async function jSaveHistory(action,items,batchId){
  var db=initFB();
  await db.collection('import_history').add({
    action:action,count:items.length,batchId:batchId||'',
    date:new Date().toISOString(),
    user:(firebase.auth().currentUser||{}).email||'?',
    items:items.slice(0,100).map(function(j){return{name:j.name,field:j.field,_id:j._id||''};})
  });
}

function jRenderHistory(){
  var html='<div class="card"><div class="card-title">📜 Lịch sử nhập/xóa</div>';
  html+='<button class="btn btn-secondary btn-sm" onclick="jRefreshHistory()" style="margin-bottom:10px"><span class="material-symbols-outlined" style="font-size:14px">refresh</span>Tải lịch sử</button>';

  // Quick delete by time
  html+='<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;align-items:center"><span style="font-size:.8rem;font-weight:600">Xóa nhanh theo thời gian:</span>';
  html+='<button class="btn btn-danger btn-sm" onclick="jDeleteByTime(1)">1 giờ trước</button>';
  html+='<button class="btn btn-danger btn-sm" onclick="jDeleteByTime(24)">24 giờ trước</button>';
  html+='<button class="btn btn-danger btn-sm" onclick="jDeleteByTime(168)">7 ngày trước</button></div>';

  html+='<div id="jHistList"><p style="color:var(--text3);font-size:.82rem">Bấm "Tải lịch sử" để xem.</p></div></div>';
  return html;
}

async function jRefreshHistory(){
  await jLoadHistory();
  var el=document.getElementById('jHistList');
  if(!_jHistory.length){el.innerHTML='<p style="color:var(--text3)">Chưa có lịch sử.</p>';return;}
  el.innerHTML=_jHistory.map(function(h){
    var icon=h.action==='import'?'📥':h.action==='add'?'➕':'🗑️';
    var actionTxt=h.action==='import'?'Nhập '+h.count+' tạp chí':h.action==='add'?'Thêm '+h.count+' tạp chí':'Xóa '+h.count+' tạp chí';
    var undoBtn=h.action==='import'&&h.batchId?'<button class="btn btn-danger btn-sm" onclick="jUndoBatch(\''+h.batchId+'\',\''+h._id+'\')">↩ Hoàn tác</button>':'';
    return '<div class="mt-item"><div class="info"><div class="name">'+icon+' '+actionTxt+'</div><div class="slug">'+jEsc(h.user)+' · '+jEsc(h.date)+(h.batchId?' · batch: '+h.batchId.substring(0,12):'')+'</div></div>'+undoBtn+'</div>';
  }).join('');
}

async function jUndoBatch(batchId,histId){
  if(!confirm('Hoàn tác lần nhập này? Tất cả tạp chí nhập trong lần đó sẽ bị xóa.'))return;
  var db=initFB();
  var snap=await db.collection('journals').where('batchId','==',batchId).get();
  if(snap.empty){showAlert('Không tìm thấy dữ liệu của lần nhập này.','error');return;}
  var batch=db.batch(),count=0;
  snap.forEach(function(d){batch.delete(d.ref);count++;});
  await batch.commit();
  // Remove from local list
  var ids=new Set();snap.forEach(function(d){ids.add(d.id);});
  _jList=_jList.filter(function(j){return!ids.has(j._id);});
  // Delete history entry
  await db.collection('import_history').doc(histId).delete();
  showAlert('Đã hoàn tác: xóa '+count+' tạp chí.','success');
  jRefreshHistory();
}

async function jDeleteByTime(hours){
  var cutoff=new Date(Date.now()-hours*3600000).toISOString();
  var recent=_jList.filter(function(j){return j.importedAt&&j.importedAt>cutoff;});
  if(!recent.length){showAlert('Không có tạp chí nào được nhập trong '+hours+' giờ qua.','error');return;}
  if(!confirm('Xóa '+recent.length+' tạp chí được nhập trong '+hours+' giờ qua?'))return;
  var db=initFB(),batch=db.batch(),count=0;
  recent.forEach(function(j){batch.delete(db.collection('journals').doc(j._id));count++;});
  await batch.commit();
  var ids=new Set(recent.map(function(j){return j._id;}));
  _jList=_jList.filter(function(j){return!ids.has(j._id);});
  showAlert('Đã xóa '+count+' tạp chí nhập trong '+hours+' giờ qua.','success');
}

// ═══ TOOLS ═══
function jRenderTools(){
  var html='<div class="card"><div class="card-title">🔧 Công cụ</div>';
  html+='<div style="display:flex;flex-direction:column;gap:8px">';
  html+='<button class="btn btn-secondary" onclick="jFindDupes()"><span class="material-symbols-outlined" style="font-size:16px">find_replace</span>Tìm và xóa bản trùng</button>';
  html+='<button class="btn btn-danger" onclick="jDeleteByFieldPrompt()"><span class="material-symbols-outlined" style="font-size:16px">delete_sweep</span>Xóa toàn bộ theo ngành</button>';
  html+='</div><div id="jToolLog" style="margin-top:10px;font-size:.78rem;color:var(--text2);background:var(--surface2);padding:10px;border-radius:8px;white-space:pre-wrap;max-height:200px;overflow-y:auto"></div></div>';
  return html;
}
async function jFindDupes(){
  var seen={},dupeIds=[];
  _jList.forEach(function(j){var k=jKey(j);if(seen[k])dupeIds.push(j._id);else seen[k]=true;});
  var log=document.getElementById('jToolLog');
  log.textContent='Tìm thấy '+dupeIds.length+' bản trùng.\n';
  if(!dupeIds.length){log.textContent+='✅ Không có trùng!';return;}
  if(!confirm('Xóa '+dupeIds.length+' bản trùng?'))return;
  var db=initFB(),batch=db.batch();
  dupeIds.forEach(function(id){batch.delete(db.collection('journals').doc(id));});
  await batch.commit();
  _jList=_jList.filter(function(j){return dupeIds.indexOf(j._id)===-1;});
  log.textContent+='✅ Đã xóa '+dupeIds.length+' bản trùng.\n';
  showAlert('Đã xóa '+dupeIds.length+' trùng.','success');
}
async function jDeleteByFieldPrompt(){
  var field=prompt('Nhập tên ngành muốn xóa:');if(!field)return;
  var ids=_jList.filter(function(j){return j.field===field;}).map(function(j){return j._id;});
  if(!ids.length){showAlert('Không tìm thấy ngành: '+field,'error');return;}
  if(!confirm('Xóa '+ids.length+' tạp chí ngành "'+field+'"?'))return;
  var db=initFB(),batch=db.batch();
  ids.forEach(function(id){batch.delete(db.collection('journals').doc(id));});
  await batch.commit();
  _jList=_jList.filter(function(j){return j.field!==field;});
  showAlert('Đã xóa '+ids.length+' tạp chí.','success');
}
