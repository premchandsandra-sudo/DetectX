const API = 'http://localhost:5000';
let challans  = [];
let cooldowns = {};
let vState    = {v1:false,v2:false};
let uploadedFile = null;


async function checkServer() {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3000);
    const r = await fetch(API+'/ping', {signal: controller.signal});
    clearTimeout(tid);
    if (r.ok) {
      document.getElementById('server-dot').className    = 'server-dot online';
      document.getElementById('server-text').textContent = 'Server online';
      document.getElementById('offline-warn').style.display = 'none';
      return true;
    }
  } catch(_) {}
  document.getElementById('server-dot').className    = 'server-dot offline';
  document.getElementById('server-text').textContent = 'Server offline — run: python detectx_server.py';
  document.getElementById('offline-warn').style.display = 'block';
  return false;
}

function switchTab(t) {
  document.querySelectorAll('.tab').forEach((el,i)=>
    el.classList.toggle('active',(i===0&&t==='ai')||(i===1&&t==='manual')));
  document.getElementById('pane-ai').classList.toggle('active',t==='ai');
  document.getElementById('pane-manual').classList.toggle('active',t==='manual');
}

function onDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadPreview(file);
}
function onFile(e) {
  const file = e.target.files[0];
  if (file) loadPreview(file);
}
function loadPreview(file) {
  uploadedFile = file;
  const url = URL.createObjectURL(file);
  document.getElementById('preview').src              = url;
  document.getElementById('upload-zone').style.display = 'none';
  document.getElementById('preview-wrap').style.display = 'block';
  document.getElementById('analyze-btn').disabled     = false;
  document.getElementById('reset-btn').style.display  = 'inline-flex';
  document.getElementById('result-panel').style.display = 'none';
  document.getElementById('analyzing').style.display   = 'none';
}
function resetUpload() {
  uploadedFile = null;
  document.getElementById('upload-zone').style.display  = 'block';
  document.getElementById('preview-wrap').style.display = 'none';
  document.getElementById('analyze-btn').disabled       = true;
  document.getElementById('file-in').value              = '';
}
function resetAll() {
  resetUpload();
  document.getElementById('result-panel').style.display = 'none';
  document.getElementById('reset-btn').style.display    = 'none';
}

async function analyzeImage() {
  if (!uploadedFile) return;

  const online = await checkServer();
  if (!online) { toast('Python server not running. Start detectx_server.py first.','error'); return; }

  const btn = document.getElementById('analyze-btn');
  const sp  = document.getElementById('spin');
  btn.disabled = true; sp.style.display = 'inline-block';
  document.getElementById('analyzing').style.display   = 'block';
  document.getElementById('result-panel').style.display = 'none';

  try {
    const form = new FormData();
    form.append('image', uploadedFile);

    const resp = await fetch(API+'/analyze', {method:'POST', body:form});
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Server error');
    }
    const data = await resp.json();
    showResults(data);
  } catch(e) {
    toast('Analysis failed: '+e.message, 'error');
    console.error(e);
  } finally {
    document.getElementById('analyzing').style.display = 'none';
    btn.disabled = false; sp.style.display = 'none';
  }
}

function showResults(data) {
  const panel = document.getElementById('result-panel');
  panel.style.display = 'block';

  const resultImg = document.getElementById('result-img');
  if (data.output_image_b64) {
    resultImg.src = 'data:image/jpeg;base64,'+data.output_image_b64;
    resultImg.style.display = 'block';
  }

  document.getElementById('result-summary').textContent =
    data.scene_summary || `${data.violations.length} violation(s) found`;

  const container = document.getElementById('v-cards');
  container.innerHTML = '';

  if (!data.violations || data.violations.length === 0) {
    container.innerHTML = '<div class="no-vio">✓ No violations detected</div>';
    toast('No violations found ✓','success');
    return;
  }

  let issued = 0;
  data.violations.forEach((v,i) => {
    const type  = (v.no_helmet&&v.overloaded)?'both':v.no_helmet?'no_helmet':'overloaded';
    const plate = v.plate && v.plate!=='Not Detected' ? v.plate : null;
    const snapHtml = v.snapshot_b64
      ? `<img class="vcard-snap" src="data:image/jpeg;base64,${v.snapshot_b64}"/>`
      : `<div class="vcard-snap-placeholder">🏍</div>`;
    const pills = [
      v.no_helmet  ? '<span class="vpill helmet">No Helmet</span>'   : '',
      v.overloaded ? '<span class="vpill overload">Triple Riding</span>' : ''
    ].join('');

    container.innerHTML += `
      <div class="vcard">
        ${snapHtml}
        <div class="vcard-info">
          <div class="vcard-plate">${plate||'Plate Not Detected'}</div>
          <div class="vcard-desc">${v.description||''}</div>
          <div class="vcard-pills">${pills}</div>
          <div class="vcard-fine">Fine: ₹${(v.fine||0).toLocaleString()}</div>
          ${!plate?'<div style="font-size:10px;color:var(--blue);margin-top:3px">→ Add plate via Manual Entry tab</div>':''}
        </div>
      </div>`;

    if (plate && !isCooldown(plate)) {
      const snapSrc = v.snapshot_b64 ? 'data:image/jpeg;base64,'+v.snapshot_b64 : '';
      issueChallan(plate, type, v.fine||1000, v.description||'Traffic violation', snapSrc);
      issued++;
    } else if (!plate) {
      toast(`Bike ${i+1}: Plate unreadable — add manually`,'info');
    }
  });

  updateUI();
  if (issued) toast(`${issued} challan(s) issued ✓`,'success');
}

function toggleV(n) {
  vState['v'+n]=!vState['v'+n];
  document.getElementById('v'+n).classList.toggle('active',vState['v'+n]);
  refreshFine();
}
function onPlate(inp) {
  inp.value=inp.value.toUpperCase().replace(/[^A-Z0-9 ]/g,'');
  const key=inp.value.replace(/\s/g,'');
  const warn=document.getElementById('m-warn');
  if (key.length>=4&&isCooldown(key)) {
    const rem=Math.ceil((4*3600000-(Date.now()-cooldowns[key]))/60000);
    warn.style.display='block';
    warn.textContent=`⏱ Cooldown — ${rem} min remaining`;
    document.getElementById('m-btn').disabled=true;
  } else { warn.style.display='none'; refreshFine(); }
}
function refreshFine() {
  const plate=document.getElementById('m-plate').value.trim();
  const both=vState.v1&&vState.v2, any=vState.v1||vState.v2;
  const fine=both?2000:any?1000:0;
  document.getElementById('m-fine').style.display=any?'flex':'none';
  document.getElementById('m-fine-val').textContent='₹'+fine.toLocaleString();
  document.getElementById('m-btn').disabled=!(any&&plate.length>=5);
}
function manualChallan() {
  const plate=document.getElementById('m-plate').value.trim();
  if (!plate) return;
  if (isCooldown(plate)) { toast('Vehicle in 4-hr cooldown','error'); return; }
  const both=vState.v1&&vState.v2;
  const type=both?'both':vState.v1?'no_helmet':'overloaded';
  const fine=both?2000:1000;
  const desc=both?'No helmet + Triple riding':vState.v1?'Rider with no helmet':'More than 2 persons';
  issueChallan(plate,type,fine,desc,'');
  document.getElementById('m-plate').value='';
  vState={v1:false,v2:false};
  ['v1','v2'].forEach(id=>document.getElementById(id).classList.remove('active'));
  document.getElementById('m-fine').style.display='none';
  document.getElementById('m-btn').disabled=true;
  document.getElementById('m-warn').style.display='none';
  updateUI(); toast('Challan issued ✓','success');
}


function isCooldown(plate) {
  const key=plate.replace(/\s/g,'').toUpperCase();
  return cooldowns[key]&&(Date.now()-cooldowns[key])<4*3600000;
}
function issueChallan(plate,type,fine,desc,snapSrc) {
  const key=plate.replace(/\s/g,'').toUpperCase();
  if (isCooldown(key)) return;
  const no=challans.length+1;
  challans.push({no,plate,type,desc,fine,snapSrc,
    id:'CH'+Date.now().toString().slice(-6)+String(no).padStart(3,'0'),
    time:new Date()});
  cooldowns[key]=Date.now();
}

function updateUI() {
  const total=challans.length;
  document.getElementById('stat-total').textContent    = total;
  document.getElementById('stat-fines').textContent    = challans.reduce((s,c)=>s+c.fine,0).toLocaleString();
  document.getElementById('stat-helmet').textContent   = challans.filter(c=>c.type==='no_helmet'||c.type==='both').length;
  document.getElementById('stat-overload').textContent = challans.filter(c=>c.type==='overloaded'||c.type==='both').length;

  const tbody=document.getElementById('log-body');
  tbody.innerHTML='';
  if (!total) {
    tbody.innerHTML='<tr><td colspan="7" class="empty-cell">No challans yet.</td></tr>';
  } else {
    challans.slice().reverse().forEach(c=>{
      const pc=c.type==='both'?'pill-both':c.type==='no_helmet'?'pill-helmet':'pill-overload';
      const pl=c.type==='both'?'No Helmet + Triple':c.type==='no_helmet'?'No Helmet':'Triple Riding';
      const snapHtml=c.snapSrc?`<img class="snap-thumb" src="${c.snapSrc}"/>`:'—';
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${c.no}</td><td>${snapHtml}</td>
        <td><span class="plate-badge">${c.plate}</span></td>
        <td><span class="pill ${pc}">${pl}</span></td>
        <td class="fine-cell">₹${c.fine.toLocaleString()}</td>
        <td class="challan-no">${c.id}</td>
        <td style="color:var(--text3);font-size:11px;font-family:var(--mono)">${c.time.toLocaleTimeString()}</td>`;
      tbody.appendChild(tr);
    });
  }
  document.getElementById('xl-btn').disabled=!total;
  document.getElementById('clr-btn').style.display=total?'inline-flex':'none';
  refreshCooldowns();
}

function refreshCooldowns() {
  const now=Date.now();
  const active=Object.entries(cooldowns).filter(([,t])=>(now-t)<4*3600000);
  const list=document.getElementById('cd-list'), empty=document.getElementById('cd-empty');
  if (!active.length){list.style.display='none';empty.style.display='block';return;}
  list.style.display='flex';empty.style.display='none';list.innerHTML='';
  active.forEach(([plate,t])=>{
    const rem=Math.ceil((4*3600000-(now-t))/60000);
    const d=document.createElement('div');d.className='cd-item';
    d.innerHTML=`<span class="plate-badge">${plate}</span><span class="cd-timer">⏱ ${Math.floor(rem/60)}h ${rem%60}m left</span>`;
    list.appendChild(d);
  });
}

function exportXL() {
  const rows=challans.map(c=>({
    'S.No':c.no,'Number Plate':c.plate,'Description':c.desc,
    'Fine Amount (₹)':c.fine,'Challan Number':c.id,
    'Date':c.time.toLocaleDateString(),'Time':c.time.toLocaleTimeString(),
    'Type':c.type==='both'?'No Helmet + Triple Riding':c.type==='no_helmet'?'No Helmet':'Triple Riding'
  }));
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:6},{wch:18},{wch:38},{wch:16},{wch:22},{wch:14},{wch:12},{wch:24}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Challan Log');
  const sum=XLSX.utils.aoa_to_sheet([
    ['DetectX Challan Summary'],
    ['Generated',new Date().toLocaleString()],
    ['Total Challans',challans.length],
    ['Total Fines (₹)',challans.reduce((s,c)=>s+c.fine,0)],
    ['No Helmet',challans.filter(c=>c.type==='no_helmet'||c.type==='both').length],
    ['Triple Riding',challans.filter(c=>c.type==='overloaded'||c.type==='both').length]
  ]);
  XLSX.utils.book_append_sheet(wb,sum,'Summary');
  XLSX.writeFile(wb,`DetectX_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Excel downloaded ✓','success');
}
function clearAll(){challans=[];cooldowns={};updateUI();toast('Log cleared','info');}

function toast(msg,type='info'){
  const c=document.getElementById('toasts');
  const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;
  c.appendChild(el);
  setTimeout(()=>{el.style.animation='tsout .3s ease forwards';setTimeout(()=>el.remove(),300);},3000);
}

checkServer();
setInterval(checkServer, 10000);
setInterval(refreshCooldowns, 30000);
updateUI();