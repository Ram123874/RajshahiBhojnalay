/* Rajshahi Mess Management - professional demo features.
   Uses LocalStorage as a browser-local database; export backups regularly.
   No third-party service or server is contacted by this file. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const read = key => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } };
  const money = value => '₹' + Number(value || 0).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2});
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const current = new Date();
  const ym = (date, monthOffset=0) => { const d = new Date(date.getFullYear(), date.getMonth()+monthOffset, 1); return {month:d.getMonth(),year:d.getFullYear()}; };
  const paymentMonth = (p, m, y) => Number(p.month) === m && Number(p.year) === y;
  function showToast(message) { let el=$('proToast'); if(!el){el=document.createElement('div');el.id='proToast';el.className='pro-toast';el.setAttribute('role','status');document.body.appendChild(el);} el.textContent=message; window.setTimeout(()=>{if(el.isConnected)el.remove();},3500); }

  function estimateBills(students, payments, leaves) {
    const rates = (()=>{try{return JSON.parse(localStorage.getItem('mealRates')||'{"morning":35,"night":35}')}catch(_){return {morning:35,night:35}}})();
    const selectedMonth = $('monthSelector') ? Number($('monthSelector').value) : current.getMonth();
    const selectedYear = Number(window.currentYear || current.getFullYear());
    let outstanding=0;
    students.forEach(s=>{
      const periodKey=`${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}`;
      const type=String((s.messtypeHistory&&s.messtypeHistory[periodKey])||s.messtype||'M+E').toUpperCase();
      const morning=['M','M+E'].includes(type), night=['E','M+E'].includes(type);
      const ml=new Set(),nl=new Set();
      leaves.filter(l=>String(l.studentId)===String(s.id)&&l.status!=='pending'&&l.status!=='rejected'&&Number(String(l.date||'').slice(5,7))===selectedMonth+1&&Number(String(l.date||'').slice(0,4))===selectedYear).forEach(l=>{if(!l.meal||l.meal==='full'||l.meal==='morning')ml.add(l.date);if(!l.meal||l.meal==='full'||l.meal==='night')nl.add(l.date)});
      const monthlyBase=type==='M+E'?2400:((morning||night)?1300:0); const bill=Math.max(0,monthlyBase-(morning?ml.size*Number(rates.morning??35):0)-(night?nl.size*Number(rates.night??35):0));
      const paid=payments.filter(p=>String(p.studentId)===String(s.id)&&paymentMonth(p,selectedMonth,selectedYear)).reduce((a,p)=>a+Number(p.amount||0),0);
      outstanding += Math.max(0,bill-paid);
    });
    return {outstanding,month:selectedMonth,year:selectedYear};
  }
  function renderChart(payments) {
    const el=$('proCollectionChart'); if(!el)return;
    const months=[]; for(let i=5;i>=0;i--){const d=ym(current,-i);const total=payments.filter(p=>paymentMonth(p,d.month,d.year)).reduce((a,p)=>a+Number(p.amount||0),0);months.push({label:new Date(d.year,d.month,1).toLocaleDateString('en-IN',{month:'short'}),total});}
    const max=Math.max(1,...months.map(x=>x.total));
    el.innerHTML=months.map(x=>`<div class="pro-chart-col" title="${escapeHtml(x.label)}: ${money(x.total)}"><div class="pro-chart-bar" style="height:${Math.max(3,x.total/max*100)}%" data-value="${money(x.total)}"></div><span class="pro-chart-label">${escapeHtml(x.label)}</span></div>`).join('');
  }
  function renderNotifications(students,payments,leaves,bills) {
    const el=$('proNotificationList'); if(!el)return;
    const pendingLeaves=leaves.filter(l=>(l.status||'approved')==='pending');
    const notices=[];
    if(pendingLeaves.length) notices.push({warning:true,text:`${pendingLeaves.length} leave request(s) awaiting approval.`,action:'Review leave',href:'student-leave.html'});
    if(bills.outstanding>0) notices.push({warning:true,text:`Estimated ${money(bills.outstanding)} fees remain unpaid for the selected month.`,action:'View billing',href:'#reportBody'});
    const today=new Date().toISOString().slice(0,10);
    const attendance=read('attendance');
    const todayCount=attendance.filter(a=>a.date===today).length;
    notices.push({text:`Today's attendance records: ${todayCount}.`,action:'Open attendance',href:'#attendanceTable'});
    if(!notices.length){el.innerHTML='<p class="pro-empty">No notifications. All caught up!</p>';return;}
    el.innerHTML=notices.map(n=>`<div class="pro-notice ${n.warning?'warning':''}"><span>${escapeHtml(n.text)}</span><button type="button" data-href="${n.href}">${escapeHtml(n.action)}</button></div>`).join('');
    el.querySelectorAll('button[data-href]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.href.startsWith('#')){document.querySelector(b.dataset.href)?.scrollIntoView({behavior:'smooth',block:'start'});}else location.href=b.dataset.href;}));
  }
  window.refreshProDashboard=function(){
    const students=read('students'),payments=read('payments'),leaves=read('studentLeaves');
    const billInfo=estimateBills(students,payments,leaves);
    const collection=payments.filter(p=>paymentMonth(p,billInfo.month,billInfo.year)).reduce((a,p)=>a+Number(p.amount||0),0);
    if($('proTotalStudents'))$('proTotalStudents').textContent=students.length;
    if($('proCollection'))$('proCollection').textContent=money(collection);
    if($('proPendingFees'))$('proPendingFees').textContent=money(billInfo.outstanding);
    if($('proActionCount'))$('proActionCount').textContent=leaves.filter(l=>(l.status||'approved')==='pending').length+(billInfo.outstanding>0?1:0);
    if($('proActionLabel'))$('proActionLabel').textContent='Pending leave / fee reminders';
    if($('proStorageStatus'))$('proStorageStatus').textContent=`Browser-local data store · ${Object.keys(localStorage).filter(k=>['students','attendance','payments','studentLeaves','mealHistory','mealRates'].includes(k)).length}/6 data groups saved. Backup before clearing browser data.`;
    renderChart(payments);renderNotifications(students,payments,leaves,billInfo); addReceiptButtons();
  };
  function addReceiptButtons(){
    const body=$('reportBody'); if(!body)return;
    body.querySelectorAll('tr').forEach(row=>{
      const actionCell=row.cells[10]; if(!actionCell||actionCell.querySelector('.pro-receipt-btn'))return;
      const details=row.cells[11];
      const onclick=(actionCell.innerHTML.match(/addPayment\('([^']+)'\)/)||[])[1];
      if(!onclick)return;
      const btn=document.createElement('button');btn.type='button';btn.className='pro-receipt-btn';btn.textContent='🧾 Latest Receipt';btn.onclick=()=>printLatestReceipt(onclick);actionCell.appendChild(btn);
    });
  }
  function printReceipt(student,payment){
    const w=window.open('','_blank','width=720,height=780');
    if(!w){alert('Receipt print करण्यासाठी popup allow करा.');return;}
    const receiptNo=payment.receiptNo||('RB-'+String(payment.id||Date.now()).slice(-8).toUpperCase());
    const date=[payment.date||'',payment.time||''].filter(Boolean).join(' ');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payment Receipt ${escapeHtml(receiptNo)}</title><style>body{font-family:Arial,sans-serif;color:#183326;padding:32px}.receipt{max-width:600px;margin:auto;border:2px solid #176b43;border-radius:16px;padding:28px}.brand{text-align:center;border-bottom:1px dashed #aaa;padding-bottom:18px}.brand h1{margin:0;color:#176b43}.meta{display:flex;justify-content:space-between;gap:12px;margin:22px 0}.line{display:flex;justify-content:space-between;border-bottom:1px solid #e5e5e5;padding:12px 0}.amount{font-size:26px;font-weight:bold;color:#176b43}.foot{margin-top:30px;color:#666;font-size:12px;text-align:center}.actions{text-align:center;margin:18px}@media print{.actions{display:none}body{padding:0}.receipt{border:1px solid #555}}</style></head><body><div class="receipt"><div class="brand"><h1>🍽️ RAJSHAHI BHOJNALAY</h1><p>PADAMPURA · MESS PAYMENT RECEIPT</p></div><div class="meta"><span><b>Receipt No.</b><br>${escapeHtml(receiptNo)}</span><span><b>Payment Date</b><br>${escapeHtml(date||new Date().toLocaleString())}</span></div><div class="line"><span>Student Name</span><b>${escapeHtml(student.name||payment.studentName||'-')}</b></div><div class="line"><span>Student ID</span><b>${escapeHtml(student.id||payment.studentId||'-')}</b></div><div class="line"><span>Billing Month</span><b>${escapeHtml(new Date(Number(payment.year)||current.getFullYear(),Number(payment.month)||0,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'}))}</b></div><div class="line"><span>Amount Received</span><span class="amount">${money(payment.amount)}</span></div><div class="line"><span>Payment Mode</span><b>${escapeHtml(payment.mode||'Cash / Not specified')}</b></div><div class="foot">Thank you! This receipt was generated by the Rajshahi Mess Management demo.</div></div><div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div><script>window.onload=()=>{};<\/script></body></html>`);
    w.document.close();
  }
  window.printLatestReceipt=function(studentId){const payments=read('payments');const month=$('monthSelector')?Number($('monthSelector').value):current.getMonth();const year=Number(window.currentYear||current.getFullYear());const p=payments.filter(x=>String(x.studentId)===String(studentId)&&Number(x.month)===month&&Number(x.year)===year).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];if(!p){alert('या महिन्यात payment सापडली नाही.');return;}const student=read('students').find(s=>String(s.id)===String(studentId))||{};printReceipt(student,p);};
  window.exportProReport=function(kind){
    const data=kind==='students'?read('students'):kind==='attendance'?read('attendance'):read('payments');
    if(!data.length){alert('Export करण्यासाठी data उपलब्ध नाही.');return;}
    const headers=Array.from(data.reduce((set,row)=>{Object.keys(row).forEach(k=>set.add(k));return set;},new Set()));
    const csv=[headers.map(csvCell).join(','),...data.map(row=>headers.map(k=>csvCell(row[k])).join(','))].join('\r\n');
    downloadBlob('\ufeff'+csv,`rajshahi_${kind}_report_${new Date().toISOString().slice(0,10)}.csv`,'text/csv;charset=utf-8;');showToast(`${kind} CSV report exported.`);
  };
  function csvCell(value){if(value&&typeof value==='object')value=JSON.stringify(value);return '"'+String(value??'').replace(/"/g,'""')+'"';}
  function downloadBlob(content,name,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
  const DATA_KEYS=['students','attendance','payments','studentLeaves','mealHistory','mealRates'];
  function makeBackup(){const data={};DATA_KEYS.forEach(k=>{try{data[k]=JSON.parse(localStorage.getItem(k)||(k==='mealRates'?'{}':'[]'));}catch(_){data[k]=k==='mealRates'?{}:[];}});return {app:'Rajshahi Mess Management',formatVersion:2,exportedAt:new Date().toISOString(),data};}
  function saveSafetySnapshot(reason){try{localStorage.setItem('rajshahiSafetySnapshot',JSON.stringify({...makeBackup(),snapshotReason:reason}));localStorage.setItem('rajshahiLastSafetySnapshot',new Date().toISOString());}catch(e){console.warn('Safety snapshot could not be stored',e);}}
  window.downloadProBackup=function(){const backup=makeBackup();downloadBlob(JSON.stringify(backup,null,2),`rajshahi_backup_${new Date().toISOString().slice(0,10)}.json`,'application/json');localStorage.setItem('rajshahiLastDownloadedBackup',backup.exportedAt);showToast('Backup downloaded. Laptop/Drive मध्ये सुरक्षित ठेवा.');if($('proStorageStatus'))$('proStorageStatus').textContent=`Backup downloaded: ${new Date(backup.exportedAt).toLocaleString()} · Browser-local database`;};
  window.restoreProBackup=function(event){const file=event.target.files&&event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const backup=JSON.parse(reader.result);if(!backup.data||!Array.isArray(backup.data.students)||!Array.isArray(backup.data.payments))throw new Error('Invalid backup');if(!confirm('Restore this backup? Current data will be replaced. Before restoring, a safety snapshot will be saved in this browser. Continue?'))return;saveSafetySnapshot('Before restore');Object.entries(backup.data).forEach(([k,v])=>{if(DATA_KEYS.includes(k))localStorage.setItem(k,JSON.stringify(v));});localStorage.setItem('rajshahiLastRestore',new Date().toISOString());alert('Backup restore झाले. Dashboard reload होत आहे.');location.reload();}catch(_){alert('Backup file invalid आहे किंवा समर्थित format मध्ये नाही.');}finally{event.target.value='';}};reader.readAsText(file);};
  // Keep one daily safety snapshot in this browser before the dashboard is used.
  function ensureDailySnapshot(){const today=new Date().toISOString().slice(0,10);if(localStorage.getItem('rajshahiLastAutoSnapshotDate')!==today){saveSafetySnapshot('Daily automatic snapshot');localStorage.setItem('rajshahiLastAutoSnapshotDate',today);}}
  window.downloadSafetySnapshot=function(){const raw=localStorage.getItem('rajshahiSafetySnapshot');if(!raw){alert('Safety snapshot उपलब्ध नाही. आधी Backup Data घ्या.');return;}downloadBlob(raw,`rajshahi_safety_snapshot_${new Date().toISOString().slice(0,10)}.json`,'application/json');showToast('Safety snapshot downloaded.');}

  // Add a printable receipt after a successful Add Payment without replacing legacy payment logic.
  document.addEventListener('DOMContentLoaded',()=>{
    const originalAdd=window.addPayment;
    if(typeof originalAdd==='function')window.addPayment=function(studentId)
      {const before=read('payments').length;originalAdd(studentId);
        const after=read('payments');if(after.length>before)
          {const p=after[after.length-1];if(!p.id)p.id='pay-'+Date.now();if(!p.receiptNo)p.receiptNo='RB-'+String(Date.now()).slice(-8);if(!p.createdAt)p.createdAt=new Date().toISOString();localStorage.setItem('payments',JSON.stringify(after));refreshProDashboard();if(confirm('Payment save झाली. Receipt Print / Save as PDF करायची का?'))printReceipt(read('students').find(s=>String(s.id)===String(studentId))||{},p);}};
    const originalEdit=window.editPayment;if(typeof originalEdit==='function')window.editPayment=function(id){originalEdit(id);refreshProDashboard();};
    const originalGenerate=window.generateMonthlyReport;if(typeof originalGenerate==='function')window.generateMonthlyReport=function(){originalGenerate();refreshProDashboard();};
    ensureDailySnapshot();
    refreshProDashboard();
    window.addEventListener('storage',refreshProDashboard);
  });
})();
