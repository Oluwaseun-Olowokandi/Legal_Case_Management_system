/* Case Update Module - JS (ES6+) 
   - Simulates a backend with localStorage
   - Supports role-switching, validation, audit trail, filters, reminders
   - Reminder notifications use the Notifications API (permission required)
*/

/* ---------- Utilities ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const storage = {
  get(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null } },
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
};
const nowISO = () => new Date().toISOString();

/* ---------- App State Keys ---------- */
const KEY_CASES = 'LCM_cases_v1';
const KEY_UPDATES = 'LCM_updates_v1';
const KEY_USERS = 'LCM_users_v1';

/* ---------- Simulated Users (role-based access) ---------- */
const defaultUsers = [
  { id:'u_admin', name:'Admin User', role:'admin' },
  { id:'u_lawyer', name:'Lawyer Jane', role:'lawyer' },
  { id:'u_paralegal', name:'Paralegal Tim', role:'paralegal' }
];

/* ---------- Initialize sample data if none ---------- */
function ensureInitialData(){
  if(!storage.get(KEY_USERS)) storage.set(KEY_USERS, defaultUsers);

  if(!storage.get(KEY_CASES)){
    // sample cases
    const cases = [
      {
        id:'case-001',
        caseNumber:'2025-LCM-0001',
        title:'Acme vs Smith — Contract Dispute',
        description:'Contract dispute over service level agreement.',
        category:'Civil',
        subcategory:'Contract Dispute',
        petitionDate:'2025-07-01',
        suitNumber:'HCT/CON/2025/45',
        assignedBy:'Lawyer Jane',
        status:'ongoing', // ongoing, completed, kept-in-view, pre-litigation, court
        createdAt: nowISO()
      },
      {
        id:'case-002',
        caseNumber:'2025-LCM-0002',
        title:'State vs Doe — Theft',
        description:'Criminal allegation of theft.',
        category:'Criminal',
        subcategory:'Theft',
        petitionDate:'2025-08-12',
        suitNumber:'MCS/CR/2025/99',
        assignedBy:'Lawyer Jane',
        status:'court',
        createdAt: nowISO()
      }
    ];
    storage.set(KEY_CASES, cases);
  }
  if(!storage.get(KEY_UPDATES)){
    // sample update history
    const updates = [
      {
        id:'upd-001',
        caseId:'case-001',
        date:'2025-07-02',
        actionTaken:'Initial client meeting and intake forms completed',
        currentPosition:'Intake',
        status:'pre-litigation',
        suitNumber:'',
        adjournmentDate:'',
        notes:'Client provided initial documents.',
        createdBy:'u_paralegal',
        createdAt: nowISO()
      },
      {
        id:'upd-002',
        caseId:'case-002',
        date:'2025-08-20',
        actionTaken:'First arraignment',
        currentPosition:'Arraignment',
        status:'ongoing',
        suitNumber:'MCS/CR/2025/99',
        adjournmentDate:'2025-09-10',
        notes:'Bail set',
        createdBy:'u_lawyer',
        createdAt: nowISO()
      }
    ];
    storage.set(KEY_UPDATES, updates);
  }
}
ensureInitialData();

/* ---------- DOM elements ---------- */
const caseListEl = $('#caseList');
const caseSearchEl = $('#caseSearch');
const filterStatusEl = $('#filterStatus');
const filterAdjDaysEl = $('#filterAdjDays');

const caseTitleEl = $('#caseTitle');
const caseNumberMetaEl = $('#caseNumberMeta');
const suitNumberMetaEl = $('#suitNumberMeta');
const caseStatusMetaEl = $('#caseStatusMeta');
const caseDescriptionEl = $('#caseDescription');
const caseCategoryEl = $('#caseCategory');
const caseSubcategoryEl = $('#caseSubcategory');
const casePetitionDateEl = $('#casePetitionDate');
const caseAssignedByEl = $('#caseAssignedBy');

const btnNewUpdate = $('#btnNewUpdate');
const updateFormCard = $('#updateFormCard');
const updateForm = $('#updateForm');
const updateDateEl = $('#updateDate');
const actionTakenEl = $('#actionTaken');
const currentPositionEl = $('#currentPosition');
const updateStatusEl = $('#updateStatus');
const updateSuitNumberEl = $('#updateSuitNumber');
const adjournmentDateEl = $('#adjournmentDate');
const updateNotesEl = $('#updateNotes');
const cancelUpdateBtn = $('#cancelUpdate');
const formErrorsEl = $('#formErrors');

const historyTableBody = $('#historyTable tbody');
const historySearchEl = $('#historySearch');
const historyFromEl = $('#historyFrom');
const historyToEl = $('#historyTo');
const historySortEl = $('#historySort');

const countOngoingEl = $('#count-ongoing');
const countCompletedEl = $('#count-completed');
const countKeptEl = $('#count-kept');

const toastEl = $('#toast');

const currentUserSelect = $('#currentUser');
const notifyPermBtn = $('#notifyPermBtn');
const btnViewReminders = $('#btnViewReminders');

/* ---------- App variables ---------- */
let selectedCaseId = null;
let users = storage.get(KEY_USERS) || [];
let cases = storage.get(KEY_CASES) || [];
let updates = storage.get(KEY_UPDATES) || [];

/* ---------- Helpers ---------- */
function saveState(){ storage.set(KEY_CASES, cases); storage.set(KEY_UPDATES, updates); }

function uid(prefix='id'){ return prefix+'-'+Math.random().toString(36).slice(2,9); }
function formatDate(d){ if(!d) return ''; try{ return new Date(d).toLocaleDateString(); } catch{ return d } }
function formatDateISOInput(d){ if(!d) return ''; const dt = new Date(d); const off = dt.getTimezoneOffset(); dt.setMinutes(dt.getMinutes()-off); return dt.toISOString().slice(0,10); }
function showToast(msg, ms=3000){ toastEl.textContent = msg; toastEl.classList.remove('hidden'); setTimeout(()=>toastEl.classList.add('hidden'), ms); }

/* ---------- Populate user select ---------- */
function renderUserSelect(){
  users = storage.get(KEY_USERS) || [];
  currentUserSelect.innerHTML = '';
  users.forEach(u=>{
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.name} (${u.role})`;
    currentUserSelect.appendChild(opt);
  });
  currentUserSelect.value = users[0]?.id || '';
}
renderUserSelect();

/* ---------- Render case list with filters ---------- */
function computeCounts(){
  const cOngoing = cases.filter(c=>c.status==='ongoing').length;
  const cCompleted = cases.filter(c=>c.status==='completed').length;
  const cKept = cases.filter(c=>c.status==='kept-in-view').length;
  countOngoingEl.textContent = cOngoing;
  countCompletedEl.textContent = cCompleted;
  countKeptEl.textContent = cKept;
}

function renderCaseList(){
  const q = caseSearchEl.value.trim().toLowerCase();
  const statusFilter = filterStatusEl.value;
  const adjDays = parseInt(filterAdjDaysEl.value || '0',10);

  caseListEl.innerHTML = '';
  const today = new Date();
  const filtered = cases.filter(c=>{
    if(statusFilter && statusFilter==='court' && c.status!=='court') return false;
    if(statusFilter && statusFilter!=='court' && c.status!==statusFilter && !(statusFilter==='pre-litigation' && c.status==='pre-litigation')) return false;
    if(q){
      const hay = (c.title+' '+(c.suitNumber||'')+' '+(c.caseNumber||'')).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    if(adjDays>0){
      // check next adjournment in updates for this case
      const ups = updates.filter(u=>u.caseId===c.id && u.adjournmentDate);
      const upcoming = ups.find(u=>{
        const ad = new Date(u.adjournmentDate);
        const diff = (ad - today)/(1000*60*60*24);
        return diff >=0 && diff <= adjDays;
      });
      if(!upcoming) return false;
    }
    return true;
  });

  filtered.sort((a,b)=> a.title.localeCompare(b.title));

  filtered.forEach(c=>{
    const li = document.createElement('li');
    li.dataset.caseId = c.id;
    if(c.id===selectedCaseId) li.classList.add('active');

    const left = document.createElement('div');
    left.innerHTML = `<div class="case-title">${c.title}</div>
                      <div class="case-meta">${c.caseNumber} • ${c.suitNumber || 'No suit #'}</div>`;

    const right = document.createElement('div');
    right.innerHTML = `<div class="case-meta">${c.status}</div>`;

    li.appendChild(left);
    li.appendChild(right);
    li.addEventListener('click', ()=>selectCase(c.id));
    caseListEl.appendChild(li);
  });

  computeCounts();
}

/* ---------- Select case & render details ---------- */
function selectCase(caseId){
  selectedCaseId = caseId;
  renderCaseList(); // to highlight active
  const c = cases.find(x=>x.id===caseId);
  if(!c) return;
  caseTitleEl.textContent = c.title;
  caseNumberMetaEl.textContent = `Case #: ${c.caseNumber}`;
  suitNumberMetaEl.textContent = c.suitNumber ? `Suit #: ${c.suitNumber}` : '';
  caseStatusMetaEl.textContent = c.status;
  caseDescriptionEl.textContent = c.description || '—';
  caseCategoryEl.textContent = c.category || '—';
  caseSubcategoryEl.textContent = c.subcategory || '—';
  casePetitionDateEl.textContent = formatDate(c.petitionDate);
  caseAssignedByEl.textContent = c.assignedBy || '—';

  // hide form initially
  updateFormCard.classList.add('hidden');

  renderHistoryTable();
}

/* ---------- History table ---------- */
function renderHistoryTable(){
  historyTableBody.innerHTML = '';
  if(!selectedCaseId) return;
  const searchQ = historySearchEl.value.trim().toLowerCase();
  const from = historyFromEl.value ? new Date(historyFromEl.value) : null;
  const to = historyToEl.value ? new Date(historyToEl.value) : null;
  const sort = historySortEl.value;

  let rows = updates.filter(u=>u.caseId===selectedCaseId);

  if(searchQ) rows = rows.filter(r=>
    (r.actionTaken||'').toLowerCase().includes(searchQ) ||
    (r.notes||'').toLowerCase().includes(searchQ) ||
    (getUserName(r.createdBy)||'').toLowerCase().includes(searchQ)
  );
  if(from) rows = rows.filter(r=> new Date(r.date) >= from);
  if(to) rows = rows.filter(r=> new Date(r.date) <= to);

  rows.sort((a,b)=>{
    if(sort==='newest') return new Date(b.date) - new Date(a.date);
    return new Date(a.date) - new Date(b.date);
  });

  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(r.date)}</td>
      <td>${escapeHtml(r.actionTaken)}</td>
      <td>${escapeHtml(r.currentPosition)}</td>
      <td>${r.status}</td>
      <td>${r.adjournmentDate ? formatDate(r.adjournmentDate) : '—'}</td>
      <td>${r.suitNumber || '—'}</td>
      <td>${getUserName(r.createdBy)}</td>
      <td>${formatDate(r.createdAt)}</td>
    `;
    historyTableBody.appendChild(tr);
  });
}

/* ---------- Helpers for users & escaping ---------- */
function getUserName(userId){
  const u = (storage.get(KEY_USERS)||[]).find(x=>x.id===userId);
  return u ? `${u.name} (${u.role})` : 'Unknown';
}
function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* ---------- Show update form ---------- */
btnNewUpdate.addEventListener('click', ()=>{
  if(!selectedCaseId){ alert('Please select a case first.'); return; }
  updateForm.reset();
  formErrorsEl.textContent = '';
  updateDateEl.value = formatDateISOInput(new Date());
  updateFormCard.classList.remove('hidden');
  scrollIntoViewSmooth(updateFormCard);
});

/* ---------- Cancel update ---------- */
cancelUpdateBtn.addEventListener('click', (e)=>{
  e.preventDefault();
  updateFormCard.classList.add('hidden');
});

/* ---------- Form validation rules ---------- */
function validateUpdateForm(){
  const errors = [];
  const c = cases.find(x=>x.id===selectedCaseId);
  const status = updateStatusEl.value;
  const adj = adjournmentDateEl.value ? new Date(adjournmentDateEl.value) : null;
  const dateUpdate = updateDateEl.value ? new Date(updateDateEl.value) : null;

  if(!updateDateEl.value) errors.push('Date of update is required.');
  if(!actionTakenEl.value.trim()) errors.push('Action taken is required.');
  if(!currentPositionEl.value.trim()) errors.push('Current position/stage is required.');
  if(!status) errors.push('Status is required.');

  // prevent completed cases having future adjournment dates
  if(status === 'completed' && adj){
    const today = new Date(); today.setHours(0,0,0,0);
    if(adj > today) errors.push('Completed cases cannot have future adjournment dates.');
  }

  // adjournment date cannot be in past? allow past but warn maybe not necessary.
  if(adj && dateUpdate && adj < dateUpdate) {
    // adjournment before update date probably invalid
    errors.push('Adjournment date cannot be earlier than the update date.');
  }

  // basic suit number flexibility - no strict pattern
  return errors;
}

/* ---------- Submit update ---------- */
updateForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  formErrorsEl.textContent = '';

  const errs = validateUpdateForm();
  if(errs.length){
    formErrorsEl.innerHTML = errs.map(x=>`• ${x}`).join('<br>');
    return;
  }

  // Prepare update object
  const upd = {
    id: uid('upd'),
    caseId: selectedCaseId,
    date: updateDateEl.value,
    actionTaken: actionTakenEl.value.trim(),
    currentPosition: currentPositionEl.value.trim(),
    status: updateStatusEl.value,
    suitNumber: updateSuitNumberEl.value.trim() || '', // may be blank
    adjournmentDate: adjournmentDateEl.value || '',
    notes: updateNotesEl.value.trim() || '',
    createdBy: currentUserSelect.value || users[0].id,
    createdAt: nowISO()
  };

  // Persist update
  updates = storage.get(KEY_UPDATES) || [];
  updates.push(upd);
  storage.set(KEY_UPDATES, updates);

  // Update case-level fields: status and suitNumber if provided
  cases = storage.get(KEY_CASES) || [];
  const cIndex = cases.findIndex(cc=>cc.id===selectedCaseId);
  if(cIndex > -1){
    cases[cIndex].status = upd.status;
    if(upd.suitNumber) cases[cIndex].suitNumber = upd.suitNumber;
    storage.set(KEY_CASES, cases);
  }

  showToast('Update saved');
  updateFormCard.classList.add('hidden');
  renderCaseList();
  renderHistoryTable();
  // trigger reminder check immediately (so UI can notify if needed)
  checkReminders();
});

/* ---------- History filter / search events ---------- */
[historySearchEl, historyFromEl, historyToEl, historySortEl].forEach(el=>{
  el.addEventListener('input', renderHistoryTable);
});

/* ---------- Case list filtering events ---------- */
[caseSearchEl, filterStatusEl, filterAdjDaysEl].forEach(el=>{
  el.addEventListener('input', renderCaseList);
});

/* ---------- Utility: smooth scroll ---------- */
function scrollIntoViewSmooth(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); }

/* ---------- Initial render ---------- */
function initialRender(){
  cases = storage.get(KEY_CASES) || [];
  updates = storage.get(KEY_UPDATES) || [];
  renderCaseList();
  // select first case by default
  if(cases.length) selectCase(cases[0].id);
}
initialRender();

/* ---------- User switching (role simulation) ---------- */
currentUserSelect.addEventListener('change', ()=>{
  showToast('Active user changed to '+getUserName(currentUserSelect.value), 1500);
});

/* ---------- Reminders (adjournments) ---------- */
let remindersEnabled = false;
notifyPermBtn.addEventListener('click', async ()=>{
  try{
    if(!('Notification' in window)){ alert('Browser notifications not supported'); return; }
    const perm = await Notification.requestPermission();
    if(perm === 'granted'){ remindersEnabled = true; showToast('Notifications enabled'); }
    else { remindersEnabled = false; showToast('Notifications disabled or blocked'); }
  }catch(err){ console.error(err); showToast('Error enabling notifications'); }
});

// Check reminders: find updates with adjournmentDate within X days (e.g., next 7 days)
function checkReminders(){
  if(!remindersEnabled) return;
  const daysAhead = 7;
  const today = new Date();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()+daysAhead);

  updates = storage.get(KEY_UPDATES) || [];
  const upcoming = updates.filter(u=>u.adjournmentDate).filter(u=>{
    const ad = new Date(u.adjournmentDate);
    return ad >= today && ad <= cutoff;
  });

  // group by case
  const byCase = {};
  upcoming.forEach(u=>{
    if(!byCase[u.caseId]) byCase[u.caseId]=[];
    byCase[u.caseId].push(u);
  });

  Object.keys(byCase).forEach(caseId=>{
    const c = cases.find(x=>x.id===caseId);
    const entries = byCase[caseId];
    const titles = entries.map(e=>`${formatDate(e.adjournmentDate)}: ${e.currentPosition}`).join('\n');
    const title = `Upcoming adjournment for ${c?.caseNumber || 'case'}`;
    // show Notification
    try{
      new Notification(title, { body: `${c?.title || ''}\n${titles}`, silent: false });
    }catch(e){ console.warn('Notification failed', e); }
  });
}

// periodic check every hour (for demo, every 30s)
setInterval(()=>{ if(remindersEnabled) checkReminders(); }, 30 * 1000);

/* ---------- View reminders button ---------- */
btnViewReminders.addEventListener('click', ()=>{
  const today = new Date();
  const daysAhead = 30;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()+daysAhead);
  updates = storage.get(KEY_UPDATES) || [];
  const upcoming = updates.filter(u=>u.adjournmentDate && new Date(u.adjournmentDate) >= today && new Date(u.adjournmentDate) <= cutoff);
  if(!upcoming.length) { alert('No upcoming adjournments in the next 30 days'); return; }
  const lines = upcoming.map(u=>{
    const c = cases.find(cc=>cc.id===u.caseId);
    return `${c?.caseNumber || '(no case)'} — ${c?.title || '(no title)'} — ${formatDate(u.adjournmentDate)} — ${u.currentPosition}`;
  }).join('\n');
  alert('Upcoming adjournments:\n\n' + lines);
});

/* ---------- Prevent inconsistent manual edits via inline validation ---------- */
/* Watch status -> if status 'completed' selected while adj date in future, show hint and block submit */
updateStatusEl.addEventListener('change', ()=>{
  const s = updateStatusEl.value;
  const adjVal = adjournmentDateEl.value ? new Date(adjournmentDateEl.value) : null;
  if(s === 'completed' && adjVal){
    formErrorsEl.textContent = 'Cannot set a future adjournment date for a completed status. Clear the adjournment date or change status.';
  } else {
    formErrorsEl.textContent = '';
  }
});

/* ---------- Utility: data export / import for debugging (optional) ---------- */
window.LCM = {
  exportData: ()=> ({cases:storage.get(KEY_CASES), updates:storage.get(KEY_UPDATES), users:storage.get(KEY_USERS)}),
  importData: (data)=>{ if(data.cases) storage.set(KEY_CASES,data.cases); if(data.updates) storage.set(KEY_UPDATES,data.updates); if(data.users) storage.set(KEY_USERS,data.users); location.reload(); }
};
