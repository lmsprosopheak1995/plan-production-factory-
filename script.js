const KEY='sewing-plan-v2';
let data=[],view=false,editId=null;
try{data=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){data=[]}
const $=id=>document.getElementById(id);
['dlg','idlg'].forEach(i=>document.body.appendChild(document.getElementById(i)));
const ymd=d=>{const z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())};
const todayStr=ymd(new Date());
$('pd').value=todayStr;
$('line').innerHTML=[...Array(15)].map((_,i)=>`<option>${i+1}</option>`).join('');
const SB=window.SUPA||{},cloud=!!(SB.url&&SB.key);
const sbH={apikey:SB.key,Authorization:'Bearer '+SB.key,'Content-Type':'application/json'};
const sbU=SB.url?SB.url.replace(/\/+$/,'')+'/rest/v1/orders':'';
let last={},pushT=null;
const setSync=(t,bad)=>{const s=$('sync');if(s){s.textContent=t;s.className='sync'+(bad?' bad':'')}};
const saveLocal=()=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){setSync('⚠ Storage full',1)}};
const save=()=>{saveLocal();if(cloud){clearTimeout(pushT);pushT=setTimeout(push,600)}};
async function push(){
 pushT=null;const cur={};data.forEach(x=>cur[x.id]=JSON.stringify(x));
 const up=data.filter(x=>last[x.id]!==cur[x.id]),del=Object.keys(last).filter(id=>!(id in cur));
 if(!up.length&&!del.length)return;
 try{
  if(up.length){const r=await fetch(sbU+'?on_conflict=id',{method:'POST',headers:{...sbH,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(up.map(x=>({id:x.id,data:x,updated_at:new Date().toISOString()})))});if(!r.ok)throw new Error(r.status)}
  if(del.length){const r=await fetch(sbU+'?id=in.('+del.join(',')+')',{method:'DELETE',headers:sbH});if(!r.ok)throw new Error(r.status)}
  last=cur;setSync('☁ បានរក្សាទុក / Synced')
 }catch(e){setSync('⚠ Sync error '+e.message,1)}
}
async function pull(first){
 if(!cloud)return;
 if(!first&&(pushT||document.querySelector('dialog[open]')))return;
 try{
  const r=await fetch(sbU+'?select=id,data&order=id',{headers:sbH});if(!r.ok)throw new Error(r.status);
  const rows=await r.json();
  if(first&&!rows.length){last={};await push();return}
  const nd=rows.map(v=>v.data);last={};nd.forEach(x=>last[x.id]=JSON.stringify(x));
  if(JSON.stringify(nd)!==JSON.stringify(data)){data=nd;saveLocal();lineOpts();render()}
  setSync('☁ បានរក្សាទុក / Synced')
 }catch(e){setSync('⚠ Offline '+e.message,1)}
}
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const addDays=(d,n)=>{const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+n);return ymd(x)};
function lineOpts(){
 const cur=$('fl').value,ls=[...Array(15)].map((_,i)=>String(i+1));
 $('fl').innerHTML='<option value="">ទាំងអស់ / All</option>'+ls.map(l=>`<option ${l===cur?'selected':''}>${esc(l)}</option>`).join('');
}
const cqOf=x=>(x.cq||0)+(x.log||[]).reduce((a,e)=>a+e.q,0);
const issSum=(x,t,c)=>(x.iss||[]).filter(e=>e.t===t&&(c==null||e.c===c)).reduce((a,e)=>a+e.q,0);
const issCells=x=>{const g=x.gt||'set';return ['top','pants'].map(t=>{if(g!==t&&g!=='set')return '<td class="n">—</td><td class="n">—</td>';const q=issSum(x,t),r=x.oq-q;return `<td class="n">${q.toLocaleString()}</td><td class="n ${r>0?'bad':'ok'}">${r>0?r.toLocaleString():(r<0?'+'+(-r).toLocaleString():'✓')}</td>`}).join('')};
function render(){
 const pd=$('pd').value||todayStr,fl=$('fl').value;
 const r=data.filter(x=>(!fl||x.line===fl)&&!!x.arch===view);
 $('c0').textContent='('+data.filter(x=>!x.arch).length+')';$('c1').textContent='('+data.filter(x=>x.arch).length+')';
 $('t0').classList.toggle('on',!view);$('t1').classList.toggle('on',view);
 const runSet=new Set();let daily=0,rem=0,late=0;
 $('rows').innerHTML=r.map(x=>{
  const cq=cqOf(x),diff=cq-x.iq,left=Math.max(0,x.iq-cq),days=x.st==='done'||!x.dq?0:Math.ceil(left/x.dq);
  const est=x.st==='done'?'—':(x.dq?addDays(pd,days):'—');
  const isLate=x.st==='run'&&x.dd&&est!=='—'&&est>x.dd;
  if(x.st==='run'){runSet.add(x.line);daily+=x.dq;rem+=left;if(isLate)late++}
  return `<tr class="${x.st}"><td>${esc(x.line)}</td><td>${esc(x.buyer)}</td><td>${esc(x.ut)}</td><td>${esc(x.style)}</td><td>${(x.clr||[]).map(c=>esc(c.n)).join(', ')||'—'}</td><td style="white-space:normal;min-width:110px">${(x.sz||[]).map(z=>esc(z.n)+':'+z.q).join(' ')||'—'}</td>
  <td class="n">${x.oq.toLocaleString()}</td><td class="n">${x.iq.toLocaleString()}</td><td class="n">${cq.toLocaleString()}</td>
  <td class="n ${diff<0?'bad':'ok'}">${diff>0?'+':''}${diff.toLocaleString()}</td>
  ${issCells(x)}<td class="n">${x.wk||''}</td><td class="n">${x.dq}</td>
  <td class="n">${x.dq?Math.round(x.iq/x.dq+2)+' ថ្ងៃ':''}</td><td class="n">${x.st==='done'?'—':days}</td><td class="${isLate?'bad':''}">${est}${isLate?' ⚠':''}</td>
  <td>${x.cd||''}</td><td>${x.od||''}</td><td>${x.dd||''}</td><td>${esc(x.rm)}</td>
  <td>${view?`<button class="a" data-a="restore" data-id="${x.id}">ស្តារ</button>`:`<button class="a" data-a="edit" data-id="${x.id}">កែ</button><button class="a" data-a="arch" data-id="${x.id}">ប័ណ្ណសារ</button>`}<button class="x" data-a="del" data-id="${x.id}">លុប</button></td></tr>`}).join('');
 $('empty').hidden=r.length>0;
 $('k1').textContent=runSet.size+' / 15';$('k2').textContent=daily.toLocaleString();$('k3').textContent=rem.toLocaleString();$('k4').textContent=late;renderDaily();renderFabric();renderLines();fit();
}
$('f').addEventListener('submit',e=>{
 e.preventDefault();
 const n=i=>+$(i).value||0;
 const old=editId?data.find(v=>v.id===editId):{};const rec={id:editId||Date.now(),arch:false,gt:$('gt').value,clr:readClr(),sz:readSz(),iss:old.iss||[],cq:n('cq'),log:old.log||[],line:$('line').value.trim(),buyer:$('buyer').value.trim(),ut:$('ut').value.trim(),style:$('style').value.trim(),
  oq:n('oq'),iq:n('iq'),wk:n('wk'),dq:n('dq'),cd:$('cd').value,od:$('od').value,dd:$('dd').value,st:$('st').value,rm:$('rm').value.trim()};
 if(editId){const i=data.findIndex(x=>x.id===editId);rec.arch=data[i].arch;data[i]=rec}else data.push(rec);
 save();stopEdit();lineOpts();render();
});
function stopEdit(){editId=null;$('f').reset();$('crows').innerHTML='';$('sb').textContent='រក្សាទុក / Save';$('ft').textContent='បញ្ចូលកម្មង់ / Add Order';$('cb').hidden=true;$('dlg').close()}
$('cb').onclick=stopEdit;
$('ab').onclick=()=>{stopEdit();$('dlg').showModal()};
$('dlg').addEventListener('close',stopEdit);
$('dlg').addEventListener('click',e=>{const r=$('dlg').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)stopEdit()});
$('rows').addEventListener('click',e=>{
 const bt=e.target.closest('button[data-a]');if(!bt)return;const a=bt.dataset.a,id=+bt.dataset.id;
 const x=data.find(v=>v.id===id);if(!x)return;
 if(a==='del'){if(!confirm('លុបកម្មង់នេះជាអចិន្ត្រៃយ៍? / Delete this order permanently?'))return;data=data.filter(v=>v.id!==id);if(editId===id)stopEdit()}
 else if(a==='arch'){x.arch=true;if(editId===id)stopEdit()}
 else if(a==='restore'){x.arch=false}
 else if(a==='issue'){issId=id;$('idate').value=todayStr;renderIss();$('idlg').showModal();return}
 else if(a==='edit'){editId=id;if(x.line&&![...$('line').options].some(o=>o.value===x.line))$('line').add(new Option(x.line,x.line));['line','buyer','ut','style','gt','oq','iq','cq','wk','dq','cd','od','dd','st','rm'].forEach(k=>$(k).value=x[k]==null?'':x[k]);
  $('gt').value=x.gt||'set';$('crows').innerHTML='';(x.clr||[]).forEach(c=>addClr(c.n,c.q));fillSz(x.sz);$('sb').textContent='ធ្វើបច្ចុប្បន្នភាព / Update';$('ft').textContent='កែកម្មង់ / Edit Order';$('cb').hidden=false;$('dlg').showModal();return}
 save();lineOpts();render();
});
function addClr(n='',q=''){const d=document.createElement('div');d.className='crow';d.innerHTML=`<input class="cn" placeholder="ឈ្មោះពណ៌ / Color name" value="${esc(n)}"><input class="cq" type="number" min="0" placeholder="ចំនួន / Qty" value="${q}"><button type="button" class="x">✕</button>`;$('crows').appendChild(d)}
function readClr(){return [...$('crows').children].map(d=>({n:d.querySelector('.cn').value.trim(),q:+d.querySelector('.cq').value||0})).filter(c=>c.n)}
$('crows').addEventListener('input',()=>{const t=readClr().reduce((a,c)=>a+c.q,0);if(t>0)$('oq').value=t});
$('crows').addEventListener('click',e=>{if(e.target.classList.contains('x'))e.target.parentNode.remove()});
$('ac').onclick=()=>addClr();
const SIZES=['XS','S','M','L','XL','XXL','1X','2X','3X'];
$('szg').innerHTML=SIZES.map(n=>`<label>${n}<input type="number" min="0" data-sz="${n}"></label>`).join('');
const readSz=()=>[...$('szg').querySelectorAll('input')].map(i=>({n:i.dataset.sz,q:+i.value||0})).filter(z=>z.q>0);
const fillSz=a=>{$('szg').querySelectorAll('input').forEach(i=>{const z=(a||[]).find(v=>v.n===i.dataset.sz);i.value=z?z.q:''})};
$('szg').addEventListener('input',()=>{const t=readSz().reduce((a,z)=>a+z.q,0);if(t>0)$('oq').value=t});
let issId=null;
const cqKpi=x=>{const q=cqOf(x),r=x.oq-q;return `<div class="kpi"><small>ដេរបញ្ចប់ / Completed · កម្មង់ ${x.oq.toLocaleString()}</small><b>${q.toLocaleString()}</b><b class="${r>0?'bad':'ok'}" style="font-size:1.1rem">${r>0?'ខ្វះ / Short '+r.toLocaleString():(r<0?'លើស / Over '+(-r).toLocaleString():'គ្រប់ / Complete ✓')}</b></div>`};
let gd=todayStr;
const fmN=n=>n>0?n.toLocaleString():(n<0?'+'+(-n).toLocaleString():'✓');
function renderRep(x){
 const has=(x.sz||[]).length>0,zs=has?x.sz:[{n:'',q:x.oq}],L=x.log||[];
 const dn=s=>L.filter(e=>(e.s||'')===s).reduce((a,e)=>a+e.q,0);
 const dates=[...new Set(L.map(e=>e.date))].filter(d=>d!==gd).sort();
 const val=(d,s)=>{const e=L.find(v=>v.date===d&&(v.s||'')===s);return e?e.q:''};
 const inp=(d,z)=>`<td class="n"><input class="gi" type="number" min="0" data-d="${esc(d)}" data-s="${esc(z.n)}" value="${val(d||gd,z.n)}"></td>`;
 const rt=d=>zs.reduce((a,z)=>a+(+val(d,z.n)||0),0).toLocaleString();
 const hd=[['កុងត្រា','CONTRACT',x.ut],['ម៉ូដែល','STYLE',x.style],['អ្នកទិញ','BUYER',x.buyer],['ពណ៌','COLOR',(x.clr||[]).map(c=>c.n).join(', ')||'—']];
 const top=`<table style="min-width:0;margin-bottom:10px"><thead><tr>${hd.map(p=>`<th>${p[0]}<span>${p[1]}</span></th>`).join('')}</tr></thead><tbody><tr>${hd.map(p=>`<td>${esc(p[2])}</td>`).join('')}</tr></tbody></table>`;
 const tot=cqOf(x),bc=n=>n>0?'bad':'ok',lab=(a,b)=>`<td>${a}<span class="sub">${b}</span></td><td></td>`;
 const plan=`<tr class="sm">${lab('ចំនួនផែនការ','PLAN QTY')}${zs.map(z=>`<td class="n">${z.q.toLocaleString()}</td>`).join('')}<td class="n">${x.oq.toLocaleString()}</td><td></td></tr>`;
 const done=`<tr class="sm">${lab('ចំនួនដេរបញ្ចប់','SEWING QTY')}${zs.map(z=>`<td class="n" data-c="done" data-s="${esc(z.n)}">${dn(z.n).toLocaleString()}</td>`).join('')}<td class="n" data-c="done" data-s="*">${tot.toLocaleString()}</td><td></td></tr>`;
 const bal=`<tr class="sm">${lab('ខ្វះ','SEWING BALANCE')}${zs.map(z=>{const r=z.q-dn(z.n);return `<td class="n ${bc(r)}" data-c="bal" data-s="${esc(z.n)}">${fmN(r)}</td>`}).join('')}<td class="n ${bc(x.oq-tot)}" data-c="bal" data-s="*">${fmN(x.oq-tot)}</td><td></td></tr>`;
 const dh=`<tr class="dh"><td>ថ្ងៃ<span class="sub">Date</span></td><td>ក្រុម<span class="sub">Line</span></td><td colspan="${zs.length+2}"></td></tr>`;
 const rows=dates.map(d=>`<tr><td>${esc(d)}</td><td>${esc(x.line)}</td>${zs.map(z=>inp(d,z)).join('')}<td class="n rt">${rt(d)}</td><td><button type="button" class="x" data-del="${esc(d)}">លុប</button></td></tr>`).join('');
 const ent=`<tr class="ent"><td><input type="date" id="gdate" value="${gd}"></td><td>${esc(x.line)}</td>${zs.map(z=>inp('',z)).join('')}<td class="n rt">${rt(gd)}</td><td></td></tr>`;
 $('rep').innerHTML=top+`<table style="min-width:0"><thead><tr><th>ទំហំ<span>SIZE</span></th><th>ក្រុម<span>Line</span></th>${zs.map(z=>`<th class="n">${has?esc(z.n):'ចំនួន<span>Qty</span>'}</th>`).join('')}<th class="n">សរុប<span>TOTAL</span></th><th></th></tr></thead><tbody>${plan}${done}${bal}${dh}${rows}${ent}</tbody></table>`;
}
function afterLog(x){$('isum').firstElementChild.outerHTML=cqKpi(x);render()}
function updRep(x,i){
 const tr=i.closest('tr');tr.querySelector('.rt').textContent=[...tr.querySelectorAll('.gi')].reduce((a,n)=>a+(+n.value||0),0).toLocaleString();
 const zs=(x.sz||[]).length?x.sz:[{n:'',q:x.oq}],tot=cqOf(x);
 const set=(c,s,t,r)=>{const el=$('rep').querySelector(`[data-c="${c}"][data-s="${s}"]`);if(el){el.textContent=t;if(r!=null)el.className='n '+(r>0?'bad':'ok')}};
 zs.forEach(z=>{const d=(x.log||[]).filter(e=>(e.s||'')===z.n).reduce((a,e)=>a+e.q,0);set('done',z.n,d.toLocaleString());set('bal',z.n,fmN(z.q-d),z.q-d)});
 set('done','*',tot.toLocaleString());set('bal','*',fmN(x.oq-tot),x.oq-tot);afterLog(x);
}
$('rep').addEventListener('change',e=>{
 const i=e.target,x=data.find(v=>v.id===issId);if(!x)return;
 if(i.id==='gdate'){if(i.value){gd=i.value;renderRep(x)}return}
 if(!i.classList.contains('gi'))return;
 const d=i.dataset.d||gd,s=i.dataset.s,q=+i.value||0;x.log=x.log||[];
 const ex=x.log.find(v=>v.date===d&&(v.s||'')===s);
 if(q>0){if(ex)ex.q=q;else x.log.push({id:Date.now()+x.log.length,date:d,s,q})}else if(ex)x.log=x.log.filter(v=>v!==ex);
 save();updRep(x,i);
});
$('rep').addEventListener('click',e=>{
 const b=e.target.closest('button[data-del]');if(!b)return;const x=data.find(v=>v.id===issId);if(!x)return;
 if(!confirm('លុបថ្ងៃនេះ? / Delete this date?'))return;
 x.log=(x.log||[]).filter(v=>v.date!==b.dataset.del);save();renderRep(x);afterLog(x);
});

function renderDaily(){
 const d=$('dday').value||todayStr,fl=$('dln').value;
 const r=data.filter(x=>!x.arch&&x.st==='run'&&(!fl||x.line===fl));
 let c=0,t=0,p=0;
 $('drows').innerHTML=r.map(x=>{
  const lc=(x.log||[]).filter(e=>e.date===d).reduce((a,e)=>a+e.q,0);
  const sm=ty=>(x.iss||[]).filter(e=>e.date===d&&e.t===ty).reduce((a,e)=>a+e.q,0),it=sm('top'),ip=sm('pants');
  c+=lc;t+=it;p+=ip;
  const q=cqOf(x),df=q-x.iq,g=x.gt||'set';
  return `<tr class="run"><td>${esc(x.line)}</td><td>${esc(x.buyer)}</td><td>${esc(x.style)}</td><td>${(x.clr||[]).map(k=>esc(k.n)).join(', ')||'—'}</td><td class="n">${x.oq.toLocaleString()}</td><td class="n">${x.iq.toLocaleString()}</td><td class="n">${lc||'—'}</td><td class="n">${g==='pants'?'—':(it||'—')}</td><td class="n">${g==='top'?'—':(ip||'—')}</td><td class="n">${q.toLocaleString()}</td><td class="n ${df<0?'bad':'ok'}">${df>0?'+':''}${df.toLocaleString()}</td><td><button class="a" data-id="${x.id}">បញ្ចូល / Enter</button></td></tr>`}).join('');
 $('dempty').hidden=r.length>0;
 $('d1').textContent=c.toLocaleString();$('d2').textContent=t.toLocaleString();$('d3').textContent=p.toLocaleString();
}
$('dday').value=todayStr;
$('dln').innerHTML='<option value="">ទាំងអស់ / All</option>'+[...Array(15)].map((_,i)=>`<option>${i+1}</option>`).join('');
$('dday').addEventListener('change',renderDaily);$('dln').addEventListener('change',renderDaily);
$('drows').addEventListener('click',e=>{
 const b=e.target.closest('button[data-id]');if(!b)return;const id=+b.dataset.id;issId=id;
 gd=$('dday').value||todayStr;$('idate').value=gd;
 renderIss();$('idlg').showModal();
});
function fit(){}
window.addEventListener('resize',fit);window.addEventListener('load',fit);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
const views=['pv','dv','fv','lv'];
function go(v){views.forEach(k=>$(k).hidden=k!==v);document.querySelectorAll('#side button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));render();window.scrollTo(0,0)}
$('side').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)go(b.dataset.v)});
const lnOpts='<option value="">ទាំងអស់ / All</option>'+[...Array(15)].map((_,i)=>`<option>${i+1}</option>`).join('');
$('fday').value=todayStr;$('fln').innerHTML=lnOpts;
$('fday').addEventListener('change',renderFabric);$('fln').addEventListener('change',renderFabric);
function openIss(id,d){issId=id;gd=d;$('idate').value=d;renderIss();$('idlg').showModal()}
function renderFabric(){
 const d=$('fday').value||todayStr,fl=$('fln').value,r=data.filter(x=>!x.arch&&x.st==='run'&&(!fl||x.line===fl));let t=0,p=0;
 $('frows').innerHTML=r.map(x=>{
  const g=x.gt||'set',sm=ty=>(x.iss||[]).filter(e=>e.date===d&&e.t===ty).reduce((a,e)=>a+e.q,0),it=sm('top'),ip=sm('pants');t+=it;p+=ip;
  return `<tr class="run"><td>${esc(x.line)}</td><td>${esc(x.buyer)}</td><td>${esc(x.style)}</td><td class="n">${x.oq.toLocaleString()}</td>${issCells(x)}<td class="n">${g==='pants'?'—':(it||'—')}</td><td class="n">${g==='top'?'—':(ip||'—')}</td><td><button class="a" data-id="${x.id}">បើក / Issue</button></td></tr>`}).join('');
 $('fempty').hidden=r.length>0;$('f1').textContent=t.toLocaleString();$('f2').textContent=p.toLocaleString();
}
$('frows').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(b)openIss(+b.dataset.id,$('fday').value||todayStr)});
function renderLines(){
 const pd=$('pd').value||todayStr,sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
 $('lgrid').innerHTML=[...Array(15)].map((_,i)=>{
  const l=String(i+1),os=data.filter(x=>!x.arch&&x.st==='run'&&x.line===l);
  const left=x=>Math.max(0,x.iq-cqOf(x)),wk=sum(os,x=>x.wk||0),dq=sum(os,x=>x.dq||0),rem=sum(os,left),td=sum(os,x=>(x.log||[]).filter(e=>e.date===todayStr).reduce((a,e)=>a+e.q,0));
  const late=os.filter(x=>x.dd&&x.dq&&addDays(pd,Math.ceil(left(x)/x.dq))>x.dd).length;
  return `<div class="lc ${os.length?'on':''}"><h3>ក្រុម ${l} / Line ${l}<small class="${os.length?'ok':''}">${os.length?'កំពុងផលិត / Running':'ទំនេរ / Idle'}</small></h3>
  <div class="lo">${os.map(x=>esc(x.buyer)+' · '+esc(x.style)).join('<br>')||'—'}</div>
  <dl><dt>កម្មករ / Workers</dt><dd>${wk}</dd><dt>ទិន្នផល/ថ្ងៃ / Daily Output</dt><dd>${dq.toLocaleString()}</dd><dt>បានបញ្ចប់ថ្ងៃនេះ / Today</dt><dd>${td.toLocaleString()}</dd><dt>នៅខ្វះ / Remaining</dt><dd class="${rem?'bad':''}">${rem.toLocaleString()}</dd><dt>ហួសកំណត់ / Late</dt><dd class="${late?'bad':''}">${late}</dd></dl>
  <button class="a" data-l="${l}">មើលផែនការ / View plan</button></div>`}).join('');
}
$('lgrid').addEventListener('click',e=>{const b=e.target.closest('button[data-l]');if(!b)return;$('fl').value=b.dataset.l;go('pv')});
const tl={top:'អាវ / Top',pants:'ខោ / Pants'};
function renderIss(){
 const x=data.find(v=>v.id===issId);if(!x)return;
 const g=x.gt||'set',ts=g==='set'?['top','pants']:[g];
 $('it').textContent='ទិន្នន័យប្រចាំថ្ងៃ / Daily Entry — '+x.style+' (ក្រុម '+x.line+')';
 const hc=(x.clr||[]).length>0,ct=$('itype').value,cc=$('icolor').value;
 $('itype').innerHTML=ts.map(t=>`<option value="${t}">${tl[t]}</option>`).join('');
 $('icl').hidden=!hc;$('icolor').innerHTML=hc?x.clr.map(c=>`<option>${esc(c.n)}</option>`).join(''):'';
 if(ts.includes(ct))$('itype').value=ct;if(hc&&x.clr.some(c=>c.n===cc))$('icolor').value=cc;
 const hs=(x.sz||[]).length>0,cs=$('isize').value;
 const so='<option value="">ទាំងអស់ / All</option>'+(x.sz||[]).map(z=>`<option>${esc(z.n)}</option>`).join('');
 $('isize').innerHTML=so;$('isl').hidden=!hs;
 if(hs&&x.sz.some(z=>z.n===cs))$('isize').value=cs;
 const zs=x.sz||[],cqz=z=>(x.log||[]).filter(e=>e.s===z.n).reduce((a,e)=>a+e.q,0),isz=(t,z)=>(x.iss||[]).filter(e=>e.t===t&&e.s===z.n).reduce((a,e)=>a+e.q,0),fm=n=>n>0?n.toLocaleString():(n<0?'+'+(-n).toLocaleString():'✓');
 const rws=[{l:'កម្មង់',e:'Order',v:z=>z.q}];
 ts.forEach(t=>rws.push({l:tl[t]+' បើក',e:'Issued',v:z=>isz(t,z)},{l:tl[t]+' ខ្វះ',e:'Short',v:z=>z.q-isz(t,z),s:1}));
 const cell=(r,n)=>r.s?`<td class="n ${n>0?'bad':'ok'}">${fm(n)}</td>`:`<td class="n">${n.toLocaleString()}</td>`;
 $('isb').innerHTML=hs?`<table style="min-width:0"><thead><tr><th>ទំហំ<span>Size</span></th>${zs.map(z=>`<th class="n">${esc(z.n)}</th>`).join('')}<th class="n">សរុប<span>Total</span></th></tr></thead><tbody>${rws.map(r=>`<tr><td>${r.l}<span style="display:block;color:var(--mute);font-size:.72rem;font-weight:400">${r.e}</span></td>${zs.map(z=>cell(r,r.v(z))).join('')}${cell(r,zs.reduce((a,z)=>a+r.v(z),0))}</tr>`).join('')}</tbody></table>`:'';
 $('icb').innerHTML=hc?`<table style="min-width:0"><thead><tr><th>ពណ៌<span>Color</span></th>${ts.map(t=>`<th class="n">${tl[t]}<span>កម្មង់ / Order</span></th><th class="n">បើក<span>Issued</span></th><th class="n">ខ្វះ<span>Short</span></th>`).join('')}</tr></thead><tbody>${x.clr.map(c=>`<tr><td>${esc(c.n)}</td>${ts.map(t=>{const q=issSum(x,t,c.n),r=c.q-q;return `<td class="n">${c.q.toLocaleString()}</td><td class="n">${q.toLocaleString()}</td><td class="n ${r>0?'bad':'ok'}">${r>0?r.toLocaleString():(r<0?'+'+(-r).toLocaleString():'✓')}</td>`}).join('')}</tr>`).join('')}</tbody></table>`:'';
 $('isum').innerHTML=cqKpi(x)+ts.map(t=>{const q=issSum(x,t),r=x.oq-q;return `<div class="kpi"><small>${tl[t]} · កម្មង់ / Order ${x.oq.toLocaleString()}</small><b>${q.toLocaleString()}</b><small>បើកបាន / Issued</small><b class="${r>0?'bad':'ok'}" style="font-size:1.1rem">${r>0?'ខ្វះ / Short '+r.toLocaleString():(r<0?'លើស / Over '+(-r).toLocaleString():'គ្រប់ / Complete ✓')}</b></div>`}).join('');
 renderRep(x);
 $('ihist').innerHTML=(x.iss||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).map(e=>`<tr><td>${e.date}</td><td>${tl[e.t]}</td><td>${esc(e.c||'—')}</td><td>${esc(e.s||'—')}</td><td class="n">${e.q.toLocaleString()}</td><td><button class="x" data-eid="${e.id}">លុប</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">មិនទាន់មានកំណត់ត្រាបើក / No issues yet</td></tr>';
}
$('if').addEventListener('submit',e=>{
 e.preventDefault();const x=data.find(v=>v.id===issId);if(!x)return;
 (x.iss=x.iss||[]).push({id:Date.now(),date:$('idate').value,t:$('itype').value,c:$('icl').hidden?'':$('icolor').value,s:$('isl').hidden?'':$('isize').value,q:+$('iqty').value});
 save();$('iqty').value='';renderIss();render();
});
$('ihist').addEventListener('click',e=>{
 const id=+e.target.dataset.eid;if(!id)return;const x=data.find(v=>v.id===issId);if(!x)return;
 x.iss=(x.iss||[]).filter(v=>v.id!==id);save();renderIss();render();
});
$('iclose').onclick=()=>$('idlg').close();
$('t0').onclick=()=>{view=false;render()};$('t1').onclick=()=>{view=true;render()};
$('pd').addEventListener('change',render);$('fl').addEventListener('change',render);
lineOpts();render();
if(cloud){setSync('☁ …');pull(true);setInterval(()=>pull(),30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull()})}else setSync('💾 Local only');
