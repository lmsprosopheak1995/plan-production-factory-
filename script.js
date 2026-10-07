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
const dT=x=>x.gt==='pants'?'pants':'top';
const cqT=(x,t)=>(x.cq||0)+(x.log||[]).filter(e=>(e.t||dT(x))===t).reduce((a,e)=>a+e.q,0);
const cqOf=x=>(x.gt||'set')==='set'?Math.min(cqT(x,'top'),cqT(x,'pants')):cqT(x,dT(x));
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
 $('k1').textContent=runSet.size+' / 15';$('k2').textContent=daily.toLocaleString();$('k3').textContent=rem.toLocaleString();$('k4').textContent=late;renderDaily();renderFabric();renderLines();renderReport();renderEnd();renderShip();fit();
}
$('f').addEventListener('submit',e=>{
 e.preventDefault();
 const n=i=>+$(i).value||0;
 const old=editId?data.find(v=>v.id===editId):{};const rec={id:editId||Date.now(),arch:false,gt:$('gt').value,clr:readClr(),sz:readSz(),iss:old.iss||[],fd:old.fd||'',sd:old.sd||'',ship:old.ship||[],cq:n('cq'),log:old.log||[],line:$('line').value.trim(),buyer:$('buyer').value.trim(),ut:$('ut').value.trim(),style:$('style').value.trim(),
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
 else if(a==='issue'){issId=id;renderIss();$('idlg').showModal();return}
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
 gd=$('dday').value||todayStr;
 renderIss();$('idlg').showModal();
});
function fit(){}
window.addEventListener('resize',fit);window.addEventListener('load',fit);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
const views=['pv','dv','fv','lv','rv','ev','sv'];
function go(v){views.forEach(k=>$(k).hidden=k!==v);document.querySelectorAll('#side button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));render();window.scrollTo(0,0)}
$('side').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)go(b.dataset.v)});
const lnOpts='<option value="">ទាំងអស់ / All</option>'+[...Array(15)].map((_,i)=>`<option>${i+1}</option>`).join('');
$('fday').value=todayStr;$('fln').innerHTML=lnOpts;
$('fday').addEventListener('change',renderFabric);$('fln').addEventListener('change',renderFabric);
function openIss(id,d){issId=id;gd=d;renderIss();$('idlg').showModal()}
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
function secHtml(x,t){
 const has=(x.sz||[]).length>0,hc=(x.clr||[]).length>0,zs=has?x.sz:[{n:'',q:x.oq}],dt=dT(x);
 const L=(x.log||[]).filter(e=>(e.t||dt)===t),I=(x.iss||[]).filter(e=>e.t===t),bc=n=>n>0?'bad':'ok';
 const sn=s=>L.filter(e=>(e.s||'')===s).reduce((a,e)=>a+e.q,0),isn=s=>I.filter(e=>(e.s||'')===s).reduce((a,e)=>a+e.q,0);
 const ti=issSum(x,t),tc=cqT(x,t);
 const th=z=>`<th class="n">${has?esc(z.n):'ចំនួន<span>Qty</span>'}</th>`;
 const sm=(l,e,f,tt,c,s)=>`<tr class="sm"><td>${l}<span class="sub">${e}</span></td>${zs.map(z=>{const v=f(z);return `<td class="n ${s?bc(v):''}"${c?` data-c="${c}" data-s="${esc(z.n)}"`:''}>${s?fmN(v):v.toLocaleString()}</td>`}).join('')}<td class="n ${s?bc(tt):''}"${c?` data-c="${c}" data-s="*"`:''}>${s?fmN(tt):tt.toLocaleString()}</td></tr>`;
 const summ=`<table style="min-width:0"><thead><tr><th>ទំហំ<span>SIZE</span></th>${zs.map(th).join('')}<th class="n">សរុប<span>TOTAL</span></th></tr></thead><tbody>${sm('ចំនួនកម្មង់','ORDER',z=>z.q,x.oq)}${sm('បើកមកដេរ','ISSUED',z=>isn(z.n),ti)}${sm('ខ្វះបើក','ISSUE SHORT',z=>z.q-isn(z.n),x.oq-ti,'',1)}${sm('ដេរបញ្ចប់','SEWN',z=>sn(z.n),tc,'done')}${sm('ខ្វះដេរ','SEWING BALANCE',z=>z.q-sn(z.n),x.oq-tc,'bal',1)}</tbody></table>`;
 const iform=`<form class="isf" data-t="${t}"><label>ថ្ងៃ / Date<input type="date" name="date" value="${gd}" required></label>${hc?`<label>ពណ៌ / Color<select name="color">${x.clr.map(c=>`<option>${esc(c.n)}</option>`).join('')}</select></label>`:''}${has?`<label>ទំហំ / Size<select name="size"><option value="">ទាំងអស់ / All</option>${x.sz.map(z=>`<option>${esc(z.n)}</option>`).join('')}</select></label>`:''}<label>ចំនួនបើក / Qty<input type="number" name="qty" min="1" required></label><button type="submit">បន្ថែម / Add</button></form>`;
 const ct=hc?`<div class="scroll rep"><table style="min-width:0"><thead><tr><th>ពណ៌<span>Color</span></th><th class="n">កម្មង់<span>Order</span></th><th class="n">បើក<span>Issued</span></th><th class="n">ខ្វះ<span>Short</span></th></tr></thead><tbody>${x.clr.map(c=>{const q=issSum(x,t,c.n),r=c.q-q;return `<tr><td>${esc(c.n)}</td><td class="n">${c.q.toLocaleString()}</td><td class="n">${q.toLocaleString()}</td><td class="n ${bc(r)}">${fmN(r)}</td></tr>`}).join('')}</tbody></table></div>`:'';
 const hist=`<table style="min-width:0"><thead><tr><th>ថ្ងៃ<span>Date</span></th><th>ពណ៌<span>Color</span></th><th>ទំហំ<span>Size</span></th><th class="n">ចំនួន<span>Qty</span></th><th></th></tr></thead><tbody>${I.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).map(e=>`<tr><td>${e.date}</td><td>${esc(e.c||'—')}</td><td>${esc(e.s||'—')}</td><td class="n">${e.q.toLocaleString()}</td><td><button class="x" data-eid="${e.id}">លុប</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty">មិនទាន់មានកំណត់ត្រាបើក / No issues yet</td></tr>'}</tbody></table>`;
 const dates=[...new Set(L.map(e=>e.date))].filter(d=>d!==gd).sort();
 const val=(d,s)=>{const e=L.find(v=>v.date===d&&(v.s||'')===s);return e?e.q:''};
 const inp=(d,z)=>`<td class="n"><input class="gi" type="number" min="0" data-t="${t}" data-d="${esc(d)}" data-s="${esc(z.n)}" value="${val(d||gd,z.n)}"></td>`;
 const rt=d=>zs.reduce((a,z)=>a+(+val(d,z.n)||0),0).toLocaleString();
 const grid=`<table style="min-width:0"><thead><tr><th>ថ្ងៃ<span>Date</span></th>${zs.map(th).join('')}<th class="n">សរុប<span>Total</span></th><th></th></tr></thead><tbody>${dates.map(d=>`<tr><td>${esc(d)}</td>${zs.map(z=>inp(d,z)).join('')}<td class="n rt">${rt(d)}</td><td><button type="button" class="x" data-del="${esc(d)}" data-t="${t}">លុប</button></td></tr>`).join('')}<tr class="ent"><td><input type="date" class="gdate" value="${gd}"></td>${zs.map(z=>inp('',z)).join('')}<td class="n rt">${rt(gd)}</td><td></td></tr></tbody></table>`;
 return `<div class="tsecx"><h3 class="tbar ${t}">${t==='top'?'👕 អាវ / TOP':'👖 ខោ / PANTS'}</h3><div class="scroll rep">${summ}</div>
 <h4 class="tsh">① បើកមកដេរ / Issue to sewing</h4>${iform}${ct}<div class="scroll rep">${hist}</div>
 <h4 class="tsh">② ដេរបញ្ចប់ប្រចាំថ្ងៃ / Daily sewing</h4><div class="scroll rep">${grid}</div></div>`;
}
function renderIss(){
 const x=data.find(v=>v.id===issId);if(!x)return;
 const g=x.gt||'set',ts=g==='set'?['top','pants']:[g];
 $('it').textContent='ទិន្នន័យប្រចាំថ្ងៃ / Daily Entry — '+x.style+' (ក្រុម '+x.line+')';
 $('isum').innerHTML=cqKpi(x)+ts.map(t=>{const q=issSum(x,t),r=x.oq-q;return `<div class="kpi"><small>${tl[t]} · កម្មង់ / Order ${x.oq.toLocaleString()}</small><b>${q.toLocaleString()}</b><small>បើកបាន / Issued</small><b class="${r>0?'bad':'ok'}" style="font-size:1.1rem">${r>0?'ខ្វះ / Short '+r.toLocaleString():(r<0?'លើស / Over '+(-r).toLocaleString():'គ្រប់ / Complete ✓')}</b></div>`}).join('');
 $('tsec').innerHTML=ts.map(t=>secHtml(x,t)).join('');
}
function afterLog(x){$('isum').firstElementChild.outerHTML=cqKpi(x);render()}
function updRep(x,i){
 const t=i.dataset.t,tr=i.closest('tr'),box=i.closest('.tsecx'),dt=dT(x);
 tr.querySelector('.rt').textContent=[...tr.querySelectorAll('.gi')].reduce((a,n)=>a+(+n.value||0),0).toLocaleString();
 const zs=(x.sz||[]).length?x.sz:[{n:'',q:x.oq}];
 const set=(c,s,tx,r)=>{const el=box.querySelector(`[data-c="${c}"][data-s="${s}"]`);if(el){el.textContent=tx;if(r!=null)el.className='n '+(r>0?'bad':'ok')}};
 zs.forEach(z=>{const d=(x.log||[]).filter(e=>(e.t||dt)===t&&(e.s||'')===z.n).reduce((a,e)=>a+e.q,0);set('done',z.n,d.toLocaleString());set('bal',z.n,fmN(z.q-d),z.q-d)});
 const tc=cqT(x,t);set('done','*',tc.toLocaleString());set('bal','*',fmN(x.oq-tc),x.oq-tc);afterLog(x);
}
$('tsec').addEventListener('change',e=>{
 const i=e.target,x=data.find(v=>v.id===issId);if(!x)return;
 if(i.classList.contains('gdate')){if(i.value){gd=i.value;renderIss()}return}
 if(!i.classList.contains('gi'))return;
 const t=i.dataset.t,d=i.dataset.d||gd,s=i.dataset.s,q=+i.value||0,dt=dT(x);x.log=x.log||[];
 const ex=x.log.find(v=>v.date===d&&(v.s||'')===s&&(v.t||dt)===t);
 if(q>0){if(ex)ex.q=q;else x.log.push({id:Date.now()+x.log.length,date:d,s,q,t})}else if(ex)x.log=x.log.filter(v=>v!==ex);
 save();updRep(x,i);
});
$('tsec').addEventListener('click',e=>{
 const x=data.find(v=>v.id===issId);if(!x)return;
 const dl=e.target.closest('button[data-del]'),ei=e.target.closest('button[data-eid]');
 if(dl){if(!confirm('លុបថ្ងៃនេះ? / Delete this date?'))return;const dt=dT(x);x.log=(x.log||[]).filter(v=>!(v.date===dl.dataset.del&&(v.t||dt)===dl.dataset.t));save();renderIss();render()}
 else if(ei){x.iss=(x.iss||[]).filter(v=>v.id!==+ei.dataset.eid);save();renderIss();render()}
});
$('tsec').addEventListener('submit',e=>{
 const f=e.target.closest('form.isf');if(!f)return;e.preventDefault();
 const x=data.find(v=>v.id===issId);if(!x)return;const el=f.elements;
 (x.iss=x.iss||[]).push({id:Date.now(),date:el.date.value,t:f.dataset.t,c:el.color?el.color.value:'',s:el.size?el.size.value:'',q:+el.qty.value});
 gd=el.date.value;save();renderIss();render();
});
$('iclose').onclick=()=>$('idlg').close();
$('t0').onclick=()=>{view=false;render()};$('t1').onclick=()=>{view=true;render()};
$('pd').addEventListener('change',render);$('fl').addEventListener('change',render);
let repRows=[];
$('rfrom').value=addDays(todayStr,-6);$('rto').value=todayStr;$('rln').innerHTML=lnOpts;$('eln').innerHTML=lnOpts;$('sln').innerHTML=lnOpts;
function renderReport(){
 const f=$('rfrom').value,t=$('rto').value,fl=$('rln').value,m={};
 data.filter(x=>!fl||x.line===fl).forEach(x=>(x.log||[]).forEach(e=>{
  if((f&&e.date<f)||(t&&e.date>t))return;
  const t=e.t||dT(x),k=x.id+'|'+e.date+'|'+t,r=m[k]||(m[k]={d:e.date,x,t,s:{},q:0});r.q+=e.q;if(e.s)r.s[e.s]=(r.s[e.s]||0)+e.q}));
 repRows=Object.values(m).sort((a,b)=>a.d.localeCompare(b.d)||(+a.x.line)-(+b.x.line));
 const sz=r=>Object.keys(r.s).map(n=>n+':'+r.s[n]).join(' ');
 $('rrows').innerHTML=repRows.map(r=>`<tr><td>${r.d}</td><td>${esc(r.x.line)}</td><td>${esc(r.x.buyer)}</td><td>${esc(r.x.ut)}</td><td>${esc(r.x.style)}</td><td>${tl[r.t]}</td><td>${esc(sz(r))||'—'}</td><td class="n">${r.q.toLocaleString()}</td></tr>`).join('');
 $('rempty').hidden=repRows.length>0;
 $('r1').textContent=repRows.reduce((a,r)=>a+r.q,0).toLocaleString();$('r2').textContent=new Set(repRows.map(r=>r.x.id)).size;$('r3').textContent=new Set(repRows.map(r=>r.d)).size;
}
['rfrom','rto','rln'].forEach(i=>$(i).addEventListener('change',renderReport));
$('rcsv').onclick=()=>{
 const q=v=>'"'+String(v).replace(/"/g,'""')+'"',sz=r=>Object.keys(r.s).map(n=>n+':'+r.s[n]).join(' ');
 const l=[['Date','Line','Buyer','UT#','Style#','Type','Sizes','Completed'].map(q).join(',')].concat(repRows.map(r=>[r.d,r.x.line,r.x.buyer,r.x.ut,r.x.style,tl[r.t],sz(r),r.q].map(q).join(',')));
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+l.join('\r\n')],{type:'text/csv;charset=utf-8'}));a.download='sewing-report-'+todayStr+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
$('rprint').onclick=()=>window.print();
function resTxt(x){
 if(!x.sd||!x.dd)return '—';
 const n=Math.round((new Date(x.sd)-new Date(x.dd))/864e5);
 return n>0?`<span class="bad">យឺត ${n} ថ្ងៃ / ${n}d late</span>`:'<span class="ok">ទាន់ពេល / On time ✓</span>';
}
const rowHead=x=>`<td>${esc(x.line)}</td><td>${esc(x.buyer)}</td><td>${esc(x.ut)}</td><td>${esc(x.style)}</td><td class="n">${x.oq.toLocaleString()}</td>`;
function renderEnd(){
 const fl=$('eln').value,r=data.filter(x=>!x.arch&&(!fl||x.line===fl));
 $('erows').innerHTML=r.map(x=>{const q=cqOf(x),d=q-x.oq;return `<tr data-id="${x.id}" class="${x.st}">${rowHead(x)}<td class="n">${q.toLocaleString()}</td><td class="n ${d<0?'bad':'ok'}">${d>0?'+':''}${d.toLocaleString()}</td><td><input type="date" data-k="fd" value="${x.fd||''}"></td></tr>`}).join('');
 $('eempty').hidden=r.length>0;
}
function renderShip(){
 const fl=$('sln').value,r=data.filter(x=>!x.arch&&(!fl||x.line===fl));
 $('srows').innerHTML=r.map(x=>{const t=shQ(x),rm=x.oq-t;return `<tr data-id="${x.id}" class="${x.st}">${rowHead(x)}<td>${x.dd||'—'}</td><td class="n">${t.toLocaleString()}</td><td class="n ${rm>0?'bad':'ok'}">${fmN(rm)}</td><td class="n">${(x.ship||[]).length}</td><td><input type="date" data-k="sd" value="${x.sd||''}"></td><td class="res">${resTxt(x)}</td><td><button class="a" data-sh="${x.id}">ចេញទំនិញ / Ship</button></td></tr>`}).join('');
 $('sempty').hidden=r.length>0;
}
$('eln').addEventListener('change',renderEnd);$('sln').addEventListener('change',renderShip);
const dateEdit=e=>{
 const i=e.target,tr=i.closest('tr');if(!tr||!i.dataset.k)return;
 const x=data.find(v=>v.id===+tr.dataset.id);if(!x)return;
 x[i.dataset.k]=i.value;save();const rs=tr.querySelector('.res');if(rs)rs.innerHTML=resTxt(x);
};
$('erows').addEventListener('change',dateEdit);$('srows').addEventListener('change',dateEdit);
let shId=null,shd=todayStr;
const shQ=x=>(x.ship||[]).reduce((a,e)=>a+e.q,0);
function renderSh(){
 const x=data.find(v=>v.id===shId);if(!x)return;
 const has=(x.sz||[]).length>0,zs=has?x.sz:[{n:'',q:x.oq}];
 const L=(x.ship||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id),t=shQ(x),r=x.oq-t;
 const sn=s=>L.reduce((a,e)=>a+(has?((e.sz||{})[s]||0):e.q),0),bc=n=>n>0?'bad':'ok';
 $('sht').textContent='ចេញទំនិញតាមវគ្គ / Shipments — '+x.style+' (ក្រុម '+x.line+')';
 $('shsum').innerHTML=`<div class="kpi"><small>ចំនួនកម្មង់ / Order</small><b>${x.oq.toLocaleString()}</b></div><div class="kpi"><small>ចេញរួច / Shipped</small><b>${t.toLocaleString()}</b></div><div class="kpi"><small>នៅសល់ / Remaining</small><b class="${bc(r)}">${fmN(r)}</b></div>`;
 const sm=(l,e,f,tt,s)=>`<tr class="sm"><td>${l}<span class="sub">${e}</span></td><td></td>${zs.map(z=>`<td class="n ${s?bc(f(z)):''}">${s?fmN(f(z)):f(z).toLocaleString()}</td>`).join('')}<td class="n ${s?bc(tt):''}">${s?fmN(tt):tt.toLocaleString()}</td><td></td><td></td></tr>`;
 const rows=L.map((e,i)=>`<tr><td>${i+1}</td><td>${e.date}</td>${zs.map(z=>`<td class="n">${has?((e.sz||{})[z.n]||0).toLocaleString():e.q.toLocaleString()}</td>`).join('')}<td class="n">${e.q.toLocaleString()}</td><td>${esc(e.n||'')}</td><td><button class="x" data-sid="${e.id}">លុប</button></td></tr>`).join('');
 const ent=`<tr class="ent"><td>+</td><td><input type="date" id="shd" value="${shd}"></td>${zs.map(z=>`<td class="n"><input class="shi" type="number" min="0" data-s="${esc(z.n)}"></td>`).join('')}<td class="n" id="sht2">0</td><td><input id="shn"></td><td><button type="button" class="a" id="sha">បន្ថែមវគ្គ / Add</button></td></tr>`;
 $('shg').innerHTML=`<table style="min-width:0"><thead><tr><th>វគ្គ<span>Batch</span></th><th>ថ្ងៃ<span>Date</span></th>${zs.map(z=>`<th class="n">${has?esc(z.n):'ចំនួន<span>Qty</span>'}</th>`).join('')}<th class="n">សរុប<span>Total</span></th><th>កំណត់សម្គាល់<span>Note</span></th><th></th></tr></thead><tbody>${sm('កម្មង់','ORDER',z=>z.q,x.oq)}${sm('ចេញរួច','SHIPPED',z=>sn(z.n),t)}${sm('នៅសល់','REMAINING',z=>z.q-sn(z.n),r,1)}${rows}${ent}</tbody></table>`;
}
const syncSd=x=>{x.sd=(x.ship||[]).reduce((m,e)=>e.date>m?e.date:m,'')};
$('srows').addEventListener('click',e=>{const b=e.target.closest('button[data-sh]');if(!b)return;shId=+b.dataset.sh;shd=todayStr;renderSh();$('shdlg').showModal()});
$('shg').addEventListener('click',e=>{
 const x=data.find(v=>v.id===shId);if(!x)return;
 const del=e.target.closest('button[data-sid]');
 if(del){x.ship=(x.ship||[]).filter(v=>v.id!==+del.dataset.sid);if(x.ship.length)syncSd(x);else x.sd='';save();renderSh();render();return}
 if(e.target.id!=='sha')return;
 const has=(x.sz||[]).length>0,d=$('shd').value,sz={};let q=0;
 if(!d)return;
 $('shg').querySelectorAll('.shi').forEach(i=>{const v=+i.value||0;if(v>0){q+=v;if(has)sz[i.dataset.s]=v}});
 if(!q)return;
 const b={id:Date.now(),date:d,q,n:$('shn').value.trim()};if(has)b.sz=sz;
 (x.ship=x.ship||[]).push(b);syncSd(x);save();shd=d;renderSh();render();
});
$('shg').addEventListener('input',e=>{if(e.target.classList.contains('shi'))$('sht2').textContent=[...$('shg').querySelectorAll('.shi')].reduce((a,i)=>a+(+i.value||0),0).toLocaleString()});
$('shg').addEventListener('change',e=>{if(e.target.id==='shd'&&e.target.value)shd=e.target.value});
$('shc').onclick=()=>$('shdlg').close();
lineOpts();render();
if(cloud){setSync('☁ …');pull(true);setInterval(()=>pull(),30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull()})}else setSync('💾 Local only');
