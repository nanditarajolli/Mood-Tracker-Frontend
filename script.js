/* Brightly Pro — Final script
   - Implements 7 custom themes (hotpink, butter, babyblue, pastelpurple, sunset, metallic, matcha)
   - Theme persistence + dark/light toggle
   - Profile modal + editable user details
   - Heatmap with legend, hover tooltip, click-to-edit
   - Chart with moving average overlay + clickable points showing note/moods
   - Suggestions next to Show kind words button
   - Bottom toolbar: small import/backup/export buttons
   - Notes clear on save; selected mood(s) highlighted; multi-mode + suggestions
*/

/* ---------- Config ---------- */
const THEMES = ["hotpink","butter","babyblue","pastelpurple","sunset","metallic","matcha"];
const MOODS = [
  { id:1,label:"Terrible",emoji:"😖",score:1,cls:"mood-1",suggestions:["Breathe for 60s","Call a friend","Drink water"] },
  { id:2,label:"Bad",emoji:"😥",score:2,cls:"mood-2",suggestions:["Short walk","Listen to calm music","Stretch"] },
  { id:3,label:"Okay",emoji:"😐",score:3,cls:"mood-3",suggestions:["Write 1 small task","Take a break","Hydrate"] },
  { id:4,label:"Good",emoji:"🙂",score:4,cls:"mood-4",suggestions:["Share win","Plan a treat","Keep momentum"] },
  { id:5,label:"Great",emoji:"😄",score:5,cls:"mood-5",suggestions:["Celebrate!","Share gratitude","Record the highlight"] },
];

const STORAGE_KEY = "brightlypro-entries-v3";
const USER_KEY = "brightlypro-user-v2";

/* ---------- State & DOM ---------- */
let entries = [];
let currentUser = null;

const authOverlay = document.getElementById("authOverlay");
const appRoot = document.getElementById("app");
const signinUser = document.getElementById("signinUser");
const signinPass = document.getElementById("signinPass");
const signupUser = document.getElementById("signupUser");
const signupPass = document.getElementById("signupPass");
const signinBtn = document.getElementById("signinBtn");
const signupBtn = document.getElementById("signupBtn");
const guestBtn = document.getElementById("guestBtn");
const tabSignIn = document.getElementById("tabSignIn");
const tabSignUp = document.getElementById("tabSignUp");
const signoutBtn = document.getElementById("signoutBtn");
const userBubble = document.getElementById("userBubble");
const userNameDisplay = document.getElementById("userNameDisplay");

const dateInput = document.getElementById("dateInput");
const moodRow = document.getElementById("moodRow");
const noteEl = document.getElementById("note");
const saveBtn = document.getElementById("saveBtn");
const editSaveBtn = document.getElementById("editSaveBtn");
const resetBtn = document.getElementById("resetBtn");
const historyList = document.getElementById("historyList");
const avgBadge = document.getElementById("avgBadge");
const countBadge = document.getElementById("countBadge");
const streakBadge = document.getElementById("streakBadge");
const exportBottom = document.getElementById("exportBottom");
const backupBottom = document.getElementById("backupBottom");
const importBottom = document.getElementById("importBottom");
const importFile = document.getElementById("importFile");
const themeToggle = document.getElementById("themeToggle");
const themeSelect = document.getElementById("themeSelect");
const searchNotes = document.getElementById("searchNotes");
const filterRangeEl = document.getElementById("filterRange");
const rangeSelector = document.getElementById("rangeSelector");
const weeklyAvgEl = document.getElementById("weeklyAvg");
const monthlyAvgEl = document.getElementById("monthlyAvg");
const tzLabel = document.getElementById("tzLabel");
const toast = document.getElementById("toast");
const heatmapEl = document.getElementById("heatmap");
const heatLegend = document.getElementById("heatLegend");
const suggestionsWrap = document.getElementById("suggestionsWrap");
const selectedLabel = document.getElementById("selectedLabel");
const multiModeCheckbox = document.getElementById("multiMode");
const autoSuggestCheckbox = document.getElementById("autoSuggest");
const showKindWordsBtn = document.getElementById("showKindWords");
const downloadBtn = document.getElementById("downloadBtn");
const importBtn = document.getElementById("importBtn");
const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const profileName = document.getElementById("profileName");
const profileColor = document.getElementById("profileColor");
const saveProfile = document.getElementById("saveProfile");
const closeProfile = document.getElementById("closeProfile");
const pointDetail = document.getElementById("pointDetail");
const overlaySelect = document.getElementById("overlaySelect");

let chart = null;
let selectedMood = 4;
let selectedMoods = [4];
let editId = null;

/* timezone label */
document.getElementById("tzLabel").textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";

/* ---------- tiny helpers ---------- */
function uid(){ return Math.random().toString(36).slice(2,9); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
dateInput.value = todayISO();
function showToast(msg, ms=1400){ toast.hidden = false; toast.textContent = msg; setTimeout(()=> toast.hidden = true, ms); }
function formatDateISO(iso){ const d=new Date(iso+"T00:00:00"); return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); }

/* ---------- AUTH (local demo) ---------- */
function loadUser(){
  currentUser = JSON.parse(localStorage.getItem(USER_KEY)) || null;
  if (currentUser && currentUser.username){
    authOverlay.style.display = "none"; appRoot.hidden = false;
    userBubble.textContent = (currentUser.username[0] || "G").toUpperCase();
    userNameDisplay.textContent = currentUser.displayName || currentUser.username;
    if (currentUser.color) userBubble.style.background = currentUser.color;
    loadEntriesForUser();
  } else {
    authOverlay.style.display = "flex"; appRoot.hidden = true;
  }
}
function createUser(username,password){
  if (!username||!password) return {ok:false,msg:"fill both"};
  const users = JSON.parse(localStorage.getItem("brightly-users")||"{}");
  if (users[username]) return {ok:false,msg:"username taken"};
  users[username] = { pass: btoa(password), created: new Date().toISOString() };
  localStorage.setItem("brightly-users", JSON.stringify(users));
  return {ok:true};
}
function signIn(username,password){
  const users = JSON.parse(localStorage.getItem("brightly-users")||"{}");
  if (!users[username] || users[username].pass !== btoa(password)) return {ok:false};
  const u = { username, displayName: username, color: null, createdAt: new Date().toISOString() };
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  currentUser = u;
  return {ok:true};
}
function signOut(){
  localStorage.removeItem(USER_KEY);
  currentUser = null;
  loadUser();
}

/* auth events */
signinBtn?.addEventListener("click", ()=>{
  const u = signinUser.value.trim(), p = signinPass.value;
  if (!u||!p) return alert("enter username & password");
  const r = signIn(u,p); if(!r.ok) return alert("invalid credentials");
  loadUser();
});
signupBtn?.addEventListener("click", ()=>{
  const u = signupUser.value.trim(), p = signupPass.value;
  if (!u||!p) return alert("enter username & password");
  const r = createUser(u,p); if(!r.ok) return alert(r.msg || "cannot create");
  signIn(u,p); loadUser();
});
guestBtn?.addEventListener("click", ()=>{
  const guest = { username:"Guest", displayName:"Guest", color:null, createdAt:new Date().toISOString() };
  localStorage.setItem(USER_KEY, JSON.stringify(guest));
  currentUser = guest; loadUser();
});
tabSignIn?.addEventListener("click", ()=>{ tabSignIn.classList.add("active"); tabSignUp.classList.remove("active"); document.getElementById("signInForm").style.display=""; document.getElementById("signUpForm").style.display="none"; });
tabSignUp?.addEventListener("click", ()=>{ tabSignUp.classList.add("active"); tabSignIn.classList.remove("active"); document.getElementById("signUpForm").style.display=""; document.getElementById("signInForm").style.display="none"; });
signoutBtn?.addEventListener("click", ()=>{ if (!confirm("Sign out?")) return; signOut(); });

/* ---------- per-user storage ---------- */
function userKey(){ const name = (currentUser && currentUser.username) ? currentUser.username : "anon"; return `${STORAGE_KEY}::${name}`; }
function loadEntriesForUser(){ entries = JSON.parse(localStorage.getItem(userKey()) || "[]"); renderAll(); }
function saveEntriesForUser(){ localStorage.setItem(userKey(), JSON.stringify(entries)); }

/* ---------- THEME handling ---------- */
function initTheme(){
  const savedMode = localStorage.getItem("brightly-theme-mode") || "light";
  const savedStyle = localStorage.getItem("brightly-theme-style") || "hotpink";
  document.documentElement.setAttribute("data-theme", savedMode);
  document.documentElement.setAttribute("data-theme-style", savedStyle);
  themeSelect.value = savedStyle;
  themeToggle.setAttribute("aria-pressed", savedMode === "light" ? "true" : "false");
}
themeToggle?.addEventListener("click", ()=>{
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  const next = cur === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("brightly-theme-mode", next);
  themeToggle.setAttribute("aria-pressed", next === "light" ? "true" : "false");
});
themeSelect?.addEventListener("change", (e)=>{ const v = e.target.value; document.documentElement.setAttribute("data-theme-style", v); localStorage.setItem("brightly-theme-style", v); });

/* ---------- UI: mood buttons + suggestions ---------- */
function rebuildMoodButtons(){
  moodRow.innerHTML = "";
  MOODS.forEach(m=>{
    const btn = document.createElement("button");
    btn.className = `mood-btn ${m.cls}`;
    btn.dataset.id = m.id;
    btn.title = m.label;
    btn.innerHTML = `<div class="emoji">${m.emoji}</div><div class="label">${m.label}</div>`;
    btn.addEventListener("click", ()=>{
      const multi = multiModeCheckbox.checked;
      if (multi){
        const idx = selectedMoods.indexOf(m.id);
        if (idx === -1) selectedMoods.push(m.id); else selectedMoods.splice(idx,1);
        if (selectedMoods.length === 0) selectedMoods = [m.id];
      } else { selectedMood = m.id; selectedMoods = [m.id]; }
      updateSelectedVisuals(); updateSuggestions();
    });
    moodRow.appendChild(btn);
  });
  updateSelectedVisuals(); updateSuggestions();
}
function updateSelectedVisuals(){
  Array.from(moodRow.children).forEach(node=>{
    const id = parseInt(node.dataset.id);
    if (selectedMoods.includes(id)) node.classList.add("selected"); else node.classList.remove("selected");
  });
  const labels = selectedMoods.map(id => MOODS.find(m=>m.id===id).label);
  selectedLabel.textContent = `Selected: ${labels.join(", ") || "—"}`;
}
function updateSuggestions(){
  suggestionsWrap.innerHTML = "";
  if (!autoSuggestCheckbox.checked) return;
  const s = new Set();
  selectedMoods.forEach(id => { const m = MOODS.find(x=>x.id===id); if (m && m.suggestions) m.suggestions.forEach(t=>s.add(t)); });
  if (selectedMoods.length > 1) { s.add("Try 1 small task to feel accomplished"); s.add("Breathe for 1 minute"); }
  Array.from(s).slice(0,8).forEach(txt=>{
    const p = document.createElement("button");
    p.className = "suggestion-pill";
    p.textContent = txt;
    p.addEventListener("click", ()=> { if (noteEl.value.trim()) noteEl.value = noteEl.value.trim() + " — " + txt; else noteEl.value = txt; });
    suggestionsWrap.appendChild(p);
  });
}

/* ---------- CRUD: add / edit / delete ---------- */
function upsertEntry(){
  const date = dateInput.value; if (!date) { alert("Pick a date"); return; }
  const note = noteEl.value.trim();
  const moodScore = Math.round(selectedMoods.reduce((s,id)=> s + MOODS.find(m=>m.id===id).score,0) / selectedMoods.length);
  const payload = { id: editId || uid(), date, moods:[...selectedMoods], moodScore, note, ts: new Date().toISOString() };
  if (editId){
    entries = entries.map(e=> e.id===editId ? payload : e); editId = null; editSaveBtn.style.display="none"; saveBtn.style.display="";
    showToast("Entry updated");
  } else {
    const ex = entries.find(e=>e.date===date);
    if (ex) { entries = entries.map(e=> e.date===date ? payload : e); showToast("Updated for date"); } else { entries.unshift(payload); showToast("Entry saved"); }
  }
  entries.sort((a,b)=> b.date.localeCompare(a.date));
  saveEntriesForUser();
  noteEl.value = ""; // clear note after save
  showAffirmation();
  renderAll();
}
function editEntry(id){
  const e = entries.find(x=>x.id===id); if (!e) return;
  editId = id; dateInput.value = e.date; selectedMoods = [...e.moods]; updateSelectedVisuals(); noteEl.value = e.note || "";
  saveBtn.style.display="none"; editSaveBtn.style.display="";
  window.scrollTo({ top: 0, behavior:'smooth' });
}
function deleteEntry(id){ if (!confirm("Delete this entry?")) return; entries = entries.filter(e=>e.id!==id); saveEntriesForUser(); renderAll(); showToast("Deleted"); }

/* ---------- export/import ---------- */
function exportCSV(){
  if (entries.length===0){ alert("No entries"); return; }
  const rows = [["date","moods","moodScore","note"]];
  entries.slice().reverse().forEach(e=>{
    const lab = e.moods.map(id=>MOODS.find(m=>m.id===id).label).join("|");
    rows.push([e.date, lab, e.moodScore, e.note ? e.note.replace(/"/g,'""') : ""]);
  });
  const csv = rows.map(r=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"}); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `brightly-entries-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  showToast("CSV exported");
}
function backupJSON(){
  const blob = new Blob([JSON.stringify(entries,null,2)],{type:"application/json"}); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `brightly-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  showToast("Backup downloaded");
}
function importJSONFile(file){
  const reader = new FileReader();
  reader.onload = (ev)=>{ try { const parsed = JSON.parse(ev.target.result); if (!Array.isArray(parsed)) throw new Error("invalid"); if (!confirm("Import will replace current data. Continue?")) return; entries = parsed; saveEntriesForUser(); renderAll(); showToast("Imported"); } catch(e){ alert("Invalid JSON"); } };
  reader.readAsText(file);
}

/* ---------- Render history & KPIs ---------- */
function renderAll(){
  countBadge.textContent = entries.length;
  avgBadge.textContent = entries.length ? (entries.reduce((s,x)=>s+x.moodScore,0)/entries.length).toFixed(2) : "—";
  streakBadge.textContent = computeStreak();

  const days = parseInt(filterRangeEl.value,10);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - (days===365?10000:days));
  const q = (searchNotes.value||"").toLowerCase();
  const list = entries.filter(e => new Date(e.date) >= cutoff && (e.note||"").toLowerCase().includes(q));
  historyList.innerHTML = "";
  if (list.length===0) historyList.innerHTML = `<li class="history-item"><div class="h-left"><div class="h-date">No entries</div><div class="h-note muted">Start logging your mood</div></div></li>`;
  else list.forEach(e=>{
    const li = document.createElement("li"); li.className="history-item";
    const left = document.createElement("div"); left.className="h-left";
    const moodsHtml = e.moods.map(id=> `<span title="${MOODS.find(m=>m.id===id).label}">${MOODS.find(m=>m.id===id).emoji}</span>`).join(" ");
    left.innerHTML = `<div class="emoji">${moodsHtml}</div><div><div class="h-date">${formatDateISO(e.date)}</div><div class="h-note">${e.note || "<span class='muted'>no note</span>"}</div></div>`;
    const actions = document.createElement("div"); actions.className = "history-controls";
    actions.innerHTML = `<button class="btn small outline" data-edit="${e.id}">Edit</button> <button class="btn small danger" data-del="${e.id}">Delete</button>`;
    li.appendChild(left); li.appendChild(actions); historyList.appendChild(li);
    actions.querySelector("[data-edit]").addEventListener("click", ()=> editEntry(e.id));
    actions.querySelector("[data-del]").addEventListener("click", ()=> deleteEntry(e.id));
  });

  const weekly = computeAverage(7); const monthly = computeAverage(30);
  weeklyAvgEl.textContent = weekly?weekly.toFixed(2):"—"; monthlyAvgEl.textContent=monthly?monthly.toFixed(2):"—";

  updateChart(parseInt(rangeSelector.value,10)); renderHeatmap(90);
}

/* ---------- stats ---------- */
function computeAverage(days){
  if (entries.length===0) return null;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-days);
  const arr = entries.filter(e => new Date(e.date) >= cutoff); if (arr.length===0) return null;
  return arr.reduce((s,x)=>s+x.moodScore,0)/arr.length;
}
function computeStreak(){
  if (entries.length===0) return 0;
  const set = new Set(entries.map(e=>e.date)); let streak=0; let d=new Date();
  for (;;){ const iso=d.toISOString().slice(0,10); if (set.has(iso)){ streak++; d.setDate(d.getDate()-1);} else break; }
  return streak;
}

/* ---------- Chart: moving average overlay + clickable points ---------- */
function sma(data, window){
  const out = []; for (let i=0;i<data.length;i++){ if (i<window-1) out.push(null); else { const s = data.slice(i-window+1,i+1).reduce((a,b)=>a+(b||0),0); out.push(+(s/window).toFixed(2)); } } return out;
}

function updateChart(rangeDays=30){
  const days = rangeDays; const labels=[]; const data=[]; const map={};
  entries.forEach(e=> map[e.date]=e.moodScore);
  for (let i=days-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const iso=d.toISOString().slice(0,10); labels.push(d.toLocaleDateString(undefined,{month:'short',day:'numeric'})); data.push(map[iso]||null); }
  const ctx = document.getElementById("trendChart").getContext("2d");
  if (chart){
    chart.data.labels = labels; chart.data.datasets[0].data = data;
    const overlay = overlaySelect.value;
    if (overlay === "ma7") chart.data.datasets[1].data = sma(data,7); else if (overlay==="ma14") chart.data.datasets[1].data = sma(data,14); else chart.data.datasets[1].data = [];
    chart.update(); return;
  }
  chart = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[
      { label:'Mood (1-5)', data, spanGaps:true, tension:0.36, borderWidth:3, borderColor:getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()||'#e11d78', backgroundColor:'rgba(0,0,0,0.03)', pointRadius:4 },
      { label:'MA', data:[], spanGaps:true, tension:0.36, borderWidth:2, borderDash:[4,4], borderColor:'#222', backgroundColor:'transparent', pointRadius:0 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{min:1,max:5,ticks:{stepSize:1}}, x:{ticks:{autoSkip:true, maxTicksLimit:10}} },
      plugins:{ tooltip:{ enabled:false }, legend:{ display:false } },
      onClick: (evt)=>{ const points = chart.getElementsAtEventForMode(evt,'nearest',{intersect:true},true); if (points.length){ const p = points[0]; const idx = p.index; const labelIdx = chart.data.labels[idx]; const iso = getISOFromLabel(labelIdx); const entry = entries.find(e=>e.date===iso); if (entry){ showPointDetail(entry); } else { showToast('No entry for this date'); } } }
    }
  });
}

/* helper to map label back to iso: uses last label date and index */
function getISOFromLabel(label){
  // labels are like 'Nov 21' — we find the corresponding ISO by checking recent days
  const today = new Date(); for (let i=0;i<365;i++){ const d=new Date(); d.setDate(today.getDate()-i); const lbl = d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); if (lbl===label) return d.toISOString().slice(0,10); } return null;
}
function showPointDetail(entry){
  pointDetail.textContent = `${formatDateISO(entry.date)} — ${entry.moods.map(id=>MOODS.find(m=>m.id===id).emoji).join(" ")} — ${entry.note || "no note"}`;
  // brief highlight
  pointDetail.animate([{opacity:0.6},{opacity:1}],{duration:400});
}

/* ---------- Heatmap: color legend + hover tooltip + click-to-edit ---------- */
function renderHeatmap(days=90){
  heatmapEl.innerHTML = ""; heatLegend.innerHTML = "";
  const map = {}; entries.forEach(e=> map[e.date]=e.moodScore);
  // legend: 1..5
  for (let v=1; v<=5; v++){
    const li = document.createElement("div"); li.className="legend-item"; li.textContent = `${v}/5`; li.style.padding="6px"; li.style.borderRadius="6px"; li.style.background="var(--chip-bg)"; heatLegend.appendChild(li);
  }
  const today = new Date();
  for (let i=days-1;i>=0;i--){
    const d=new Date(); d.setDate(today.getDate()-i);
    const iso = d.toISOString().slice(0,10);
    const mood = map[iso]||null;
    const cell = document.createElement("div"); cell.className="heat-cell"; cell.dataset.iso = iso;
    cell.title = `${iso} — ${mood? (mood+"/5") : "no data"}`;
    if (mood){
      const intensity = (6 - mood) / 5;
      const r = Math.round(255 * intensity + 120*(1-intensity));
      const g = Math.round(80 * (1-intensity) + 200*(intensity));
      const b = Math.round(120 * (1-intensity) + 200*(intensity));
      cell.style.background = `rgba(${r},${g},${b},${0.20 + (0.45 * intensity)})`;
    }
    cell.addEventListener("mouseenter", (ev)=> {
      const e = entries.find(x=>x.date===iso);
      if (e) cell.title = `${iso} — ${e.moodScore}/5 — ${e.note||"no note"}`;
    });
    cell.addEventListener("click", ()=> {
      const e = entries.find(x=>x.date===iso);
      if (e) { editEntry(e.id); } else { dateInput.value = iso; window.scrollTo({top:0, behavior:'smooth'}); showToast('No entry: you can create one for this date'); }
    });
    heatmapEl.appendChild(cell);
  }
}

/* ---------- Affirmations ---------- */
const KIND_PHRASES = ["You're not alone — small steps matter.","Nice job showing up today.","Breathe — you've handled hard days before.","A short walk can shift your mood.","Be kind to yourself — you deserve it.","Celebrate your small wins."];
function showAffirmation(){ const box = document.getElementById("affirmationBox"); const phrase = KIND_PHRASES[Math.floor(Math.random()*KIND_PHRASES.length)]; box.textContent = phrase; box.animate([{transform:"translateY(6px)",opacity:0.8},{transform:"translateY(0)",opacity:1}],{duration:420}); }

/* ---------- Profile modal ---------- */
profileBtn?.addEventListener("click", ()=> {
  profileModal.setAttribute("aria-hidden","false"); profileModal.style.display = "flex";
  profileName.value = currentUser?.displayName || currentUser?.username || "You";
  profileColor.value = currentUser?.color || "#ff6aa6";
});
closeProfile?.addEventListener("click", ()=> { profileModal.setAttribute("aria-hidden","true"); profileModal.style.display="none"; });
saveProfile?.addEventListener("click", ()=> {
  const name = profileName.value.trim() || currentUser.username;
  const color = profileColor.value || null;
  currentUser.displayName = name; currentUser.color = color; localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  userNameDisplay.textContent = name; if (color) userBubble.style.background = color;
  profileModal.setAttribute("aria-hidden","true"); profileModal.style.display = "none";
  showToast("Profile updated");
});

/* ---------- small helper: map events ---------- */
document.getElementById("userBubble")?.addEventListener("click", ()=> profileBtn.click());

/* ---------- events ---------- */
saveBtn.addEventListener("click", upsertEntry);
editSaveBtn.addEventListener("click", upsertEntry);
resetBtn.addEventListener("click", ()=> { dateInput.value = todayISO(); noteEl.value = ""; selectedMoods = [4]; updateSelectedVisuals(); editId=null; editSaveBtn.style.display="none"; saveBtn.style.display=""; });
exportBottom.addEventListener("click", exportCSV);
backupBottom.addEventListener("click", backupJSON);
importBottom.addEventListener("click", ()=> importFile.click());
importFile.addEventListener("change", (ev)=> { const f = ev.target.files[0]; if (f) importJSONFile(f); });
document.getElementById("downloadBtn")?.addEventListener("click", backupJSON);
document.getElementById("importBtn")?.addEventListener("click", ()=> importFile.click());
searchNotes.addEventListener("input", renderAll);
filterRangeEl.addEventListener("change", renderAll);
rangeSelector.addEventListener("change", ()=> updateChart(parseInt(rangeSelector.value,10)));
overlaySelect.addEventListener("change", ()=> updateChart(parseInt(rangeSelector.value,10)));
multiModeCheckbox.addEventListener("change", ()=> { if (!multiModeCheckbox.checked) selectedMoods = [selectedMoods[0]||4]; updateSelectedVisuals(); updateSuggestions(); });
autoSuggestCheckbox.addEventListener("change", updateSuggestions);
showKindWordsBtn?.addEventListener("click", ()=> showAffirmation());

/* keyboard: Ctrl+Enter saves */
noteEl.addEventListener("keydown", (e)=> { if (e.key==="Enter" && (e.ctrlKey||e.metaKey)) { e.preventDefault(); upsertEntry(); } });

/* ---------- Init ---------- */
function init(){
  initTheme(); rebuildMoodButtons(); loadUser();
  updateSelectedVisuals(); updateSuggestions(); renderAll(); showAffirmation();
}
init();
const kindWords = [
    "You're doing amazing 💛",
    "Your feelings matter ✨",
    "You deserve kindness 🌷",
    "You're growing every day 🌱",
    "One small step is still progress 🌟",
    "You're stronger than your bad days 🌈",
    "Keep going — future you is proud 💫"
];

// show kind words bubble
function showKindWords() {
    const bubble = document.getElementById("kindWordsBubble");
    const random = kindWords[Math.floor(Math.random() * kindWords.length)];

    bubble.textContent = random;
    bubble.classList.remove("hidden");

    // hide after 7 seconds
    setTimeout(() => {
        bubble.classList.add("hidden");
    }, 7000);
}


