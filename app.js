/* ====== 舞蹈工作台 · 纯前端版（数据存手机本地） ====== */
let scheduleData = null;
let currentWeek = 1;
let currentStyle = 'all';
let selectedMood = null;
let profile = { nickname: 'zii', bio: '', avatar: null };
let editingDanceId = null;
let editingMomentId = null;
let viewingMomentId = null;

/* ====== 本地数据读写（localStorage 存文字，IndexedDB 存媒体） ====== */
function loadData(key, fb) { try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } }
function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function initStorage() {
  if (localStorage.getItem('dw_init')) return;
  const seed = window.__SEED__ || {};
  saveData('dw_records', seed.records || []);
  saveData('dw_moods', seed.moods || []);
  saveData('dw_moments', seed.moments || []);
  saveData('dw_diary', seed.diary || []);
  saveData('dw_profile', seed.profile || { nickname: 'zii', bio: '', avatar: null });
  saveData('dw_schedule', seed.schedule || { semester: {}, courses: [], timeSlots: [] });
  localStorage.setItem('dw_init', '1');
}

/* ====== Init ====== */
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  profile = loadData('dw_profile', { nickname: 'zii', bio: '', avatar: null });
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('fDate').value = today;
  document.getElementById('fMoodDate').value = today;
  document.getElementById('fDiaryDate').value = today;
  loadProfile();
  loadHome();
  loadSchedule();
  restoreSidebarCollapse();
  initUpload('danceUploadArea', 'fVideo');
  initUpload('momentUploadArea', 'fMomentImages');
  initUpload('momentVideoArea', 'fMomentVideo');
});

/* ====== Navigation ====== */
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function toggleSidebarCollapse() {
  const body = document.body;
  body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('sidebarCollapsed', body.classList.contains('sidebar-collapsed') ? '1' : '0');
}
function restoreSidebarCollapse() {
  if (localStorage.getItem('sidebarCollapsed') !== '0') document.body.classList.add('sidebar-collapsed');
}

function navTo(view) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  if (view === 'home') loadHome();
  if (view === 'dance') loadDanceList();
  if (view === 'mood') loadMoodList();
  if (view === 'moments') loadMomentsList();
  if (view === 'diary') loadDiaryList();
  if (view === 'schedule') loadSchedule();
  if (view === 'profile') loadProfileForm();
  document.body.classList.add('sidebar-collapsed');
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo(0, 0);
}

/* ====== Profile ====== */
async function loadProfile() {
  profile = loadData('dw_profile', { nickname: 'zii', bio: '', avatar: null });
  updateProfileUI();
}

function updateProfileUI() {
  const name = profile.nickname || 'zii';
  document.getElementById('sidebarName').textContent = name;
  if (profile.avatar) {
    MediaDB.objectUrl(profile.avatar).then(url => {
      if (!url) return;
      document.getElementById('sidebarAvatar').innerHTML = '<img src="' + url + '" class="avatar-mini">';
      document.getElementById('homeAvatar').innerHTML = '<img src="' + url + '" class="avatar-hero">';
    });
  }
}

function loadProfileForm() {
  document.getElementById('profileNickname').value = profile.nickname || '';
  document.getElementById('profileBio').value = profile.bio || '';
  if (profile.avatar) {
    MediaDB.objectUrl(profile.avatar).then(url => {
      if (!url) return;
      document.getElementById('profileAvatar').src = url;
      document.getElementById('profileAvatar').style.display = 'block';
      document.getElementById('profileAvatarPlaceholder').style.display = 'none';
    });
  }
}

async function uploadAvatar() {
  const file = document.getElementById('avatarInput').files[0];
  if (!file) return;
  const btn = document.getElementById('avatarUploadBtn');
  const orig = btn.innerHTML;
  btn.innerHTML = '⏳ 上传中...';
  try {
    const key = MediaDB.genKey();
    await MediaDB.put(key, file);
    if (profile.avatar) await MediaDB.remove(profile.avatar);
    profile.avatar = key;
    saveData('dw_profile', profile);
    const url = await MediaDB.objectUrl(key);
    document.getElementById('profileAvatar').src = url;
    document.getElementById('profileAvatar').style.display = 'block';
    document.getElementById('profileAvatarPlaceholder').style.display = 'none';
    updateProfileUI();
    showToast('头像已更新 ✨');
  } catch { showToast('上传失败 😥'); }
  btn.innerHTML = orig;
  document.getElementById('avatarInput').value = '';
}

async function saveProfile() {
  setBtnLoading('profileSaveBtn', true);
  try {
    profile.nickname = document.getElementById('profileNickname').value || 'zii';
    profile.bio = document.getElementById('profileBio').value;
    saveData('dw_profile', profile);
    updateProfileUI();
    showToast('资料已保存 ✨');
  } catch { showToast('保存失败 😥'); }
  setBtnLoading('profileSaveBtn', false);
}

/* ====== Home ====== */
async function loadHome() {
  try {
    const records = loadData('dw_records', []);
    const moods = loadData('dw_moods', []);
    const moments = loadData('dw_moments', []);
    const diary = loadData('dw_diary', []);
    const today = new Date().toISOString().slice(0, 10);
    const styleCounts = {};
    records.forEach(r => { if (r.style) styleCounts[r.style] = (styleCounts[r.style] || 0) + 1; });
    const byTime = (a, b) => b.createdAt - a.createdAt;
    const s = {
      totalRecords: records.length,
      totalMoods: moods.length,
      totalMoments: moments.length,
      totalDiary: diary.length,
      todayRecords: records.filter(r => r.date === today).length,
      todayMoods: moods.filter(m => m.date === today).length,
      styleCounts,
      recentRecords: records.slice().sort(byTime).slice(0, 3),
      recentMoods: moods.slice().sort(byTime).slice(0, 3),
      recentMoments: moments.slice().sort(byTime).slice(0, 3),
      recentDiary: diary.slice().sort(byTime).slice(0, 3)
    };
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-num">${s.totalRecords}</div><div class="stat-label">舞蹈</div></div>
      <div class="stat-card"><div class="stat-num">${s.totalMoods}</div><div class="stat-label">心情</div></div>
      <div class="stat-card"><div class="stat-num">${s.totalMoments}</div><div class="stat-label">动态</div></div>
      <div class="stat-card"><div class="stat-num">${s.totalDiary}</div><div class="stat-label">日记</div></div>
    `;
    renderHomeList('homeDance', s.recentRecords, r => `<span class="hi-icon">${styleIcon(r.style)}</span><div class="hi-content"><div class="hi-title">${esc(r.title)}</div><div class="hi-meta">${r.style || ''} · ${r.date}</div></div>`, 'dance');
    renderHomeList('homeMood', s.recentMoods, m => `<span class="hi-icon">${moodEmoji(m)}</span><div class="hi-content"><div class="hi-title">${esc(m.mood)}</div><div class="hi-meta">${m.note ? esc(m.note.slice(0, 30)) : ''} · ${m.date}</div></div>`, 'mood');
    renderHomeList('homeMoments', s.recentMoments, m => `<div class="hi-content"><div class="hi-title">${esc(m.content ? m.content.slice(0, 40) : '')}</div><div class="hi-meta">📅 ${m.date}</div></div>`, 'moments');
    renderHomeList('homeDiary', s.recentDiary, d => `<div class="hi-content"><div class="hi-title">${esc(d.title || '无题')}</div><div class="hi-meta">${d.date}</div></div>`, 'diary');
  } catch {}
}

function renderHomeList(id, list, renderFn, mod) {
  const el = document.getElementById(id);
  if (!list || !list.length) { el.innerHTML = '<div class="empty-state" style="padding:16px"><p>暂无内容</p></div>'; return; }
  el.innerHTML = list.map(item => `<div class="home-item">${renderFn(item)}<button class="home-del" onclick="homeDelete('${mod}', '${item.id}')">🗑️</button></div>`).join('');
}

async function homeDelete(mod, id) {
  if (!confirm('确定删除？')) return;
  const key = 'dw_' + (mod === 'moments' ? 'moments' : mod === 'dance' ? 'records' : mod);
  const list = loadData(key, []);
  const item = list.find(x => x.id === id);
  if (item) {
    if (item.video) await MediaDB.remove(item.video);
    if (item.images) for (const k of item.images) await MediaDB.remove(k);
  }
  saveData(key, list.filter(x => x.id !== id));
  showToast('已删除 🗑️');
  loadHome();
}

/* ====== Dance ====== */
function styleIcon(s) {
  if (s === '爵士') return '🌸';
  if (s === 'hiphop') return '🔥';
  if (s === '编舞') return '🦋';
  if (s === '韩舞') return '💜';
  return '🌸';
}

async function loadDanceList() {
  let list = loadData('dw_records', []);
  if (currentStyle !== 'all') list = list.filter(r => r.style === currentStyle);
  list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt - a.createdAt));
  const el = document.getElementById('danceList');
  if (!list.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">✨</div><p>暂无记录，快去练舞吧～</p></div>'; return; }
  el.innerHTML = list.map(r => {
    const videoHtml = r.video ? `<div class="card-video"><video controls preload="metadata" data-media="${r.video}"></video></div>` : '';
    return `<div class="card">
      <div class="card-head"><div class="card-title">${esc(r.title)}</div>${r.style ? `<span class="card-tag">${styleIcon(r.style)} ${esc(r.style)}</span>` : ''}</div>
      ${r.note ? `<div class="card-body">${esc(r.note)}</div>` : ''}
      <div class="card-meta">📅 ${r.date}</div>
      ${videoHtml}
      <div class="card-actions"><button class="btn-delete" onclick="editDance('${r.id}')">✏️ 编辑</button><button class="btn-delete" onclick="deleteDance('${r.id}')">🗑️ 删除</button></div>
    </div>`;
  }).join('');
  attachMediaAll(el);
}

function attachMediaAll(root) {
  root.querySelectorAll('[data-media]').forEach(el => {
    MediaDB.objectUrl(el.dataset.media).then(url => { if (url) el.src = url; });
  });
  root.querySelectorAll('[data-img]').forEach(el => {
    MediaDB.objectUrl(el.dataset.img).then(url => { if (url) el.src = url; });
  });
}

function filterDance(style) { currentStyle = style; document.querySelectorAll('.style-tab').forEach(t => t.classList.toggle('active', t.dataset.style === style)); loadDanceList(); }
async function deleteDance(id) { if (!confirm('确定删除？')) return; const list = loadData('dw_records', []); const r = list.find(x => x.id === id); if (r && r.video) await MediaDB.remove(r.video); saveData('dw_records', list.filter(x => x.id !== id)); loadDanceList(); showToast('已删除 🗑️'); }
function showDanceModal() {
  editingDanceId = null;
  document.getElementById('danceForm').reset();
  document.getElementById('fDate').value = new Date().toISOString().slice(0, 10);
  document.querySelector('#danceModal h3').textContent = '🩰 新的舞蹈记录';
  document.getElementById('danceSubmitBtn').textContent = '✨ 保存';
  const txt = document.querySelector('#danceUploadArea .upload-text');
  if (txt) txt.textContent = '点击选择视频';
  document.getElementById('danceModal').classList.remove('hidden');
}

function editDance(id) {
  const list = loadData('dw_records', []);
  const r = list.find(x => x.id === id);
  if (!r) return;
  editingDanceId = id;
  document.getElementById('fTitle').value = r.title || '';
  document.getElementById('fStyle').value = r.style || '';
  document.getElementById('fDate').value = r.date || new Date().toISOString().slice(0, 10);
  document.getElementById('fNote').value = r.note || '';
  document.querySelector('#danceModal h3').textContent = '✏️ 编辑舞蹈记录';
  document.getElementById('danceSubmitBtn').textContent = '💾 保存修改';
  const txt = document.querySelector('#danceUploadArea .upload-text');
  if (txt) txt.textContent = r.video ? '已选视频（重新选择可替换）' : '点击选择视频';
  document.getElementById('danceModal').classList.remove('hidden');
}

/* ====== 练舞日历 ====== */
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calRecords = [];

async function loadDanceCal() {
  try {
    calRecords = loadData('dw_records', []);
    renderDanceCal();
  } catch {}
}

function toggleDanceCal() {
  const wrap = document.getElementById('danceCalWrap');
  const isHidden = wrap.classList.toggle('hidden');
  document.getElementById('calToggleLabel').textContent = isHidden ? '查看练舞日历' : '收起日历';
  if (!isHidden) loadDanceCal();
}

function shiftDanceCal(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderDanceCal();
}

function renderDanceCal() {
  document.getElementById('calMonthLabel').textContent = calYear + '年' + (calMonth + 1) + '月';
  const dateSet = new Set(calRecords.map(r => r.date));
  const firstDay = new Date(calYear, calMonth, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  let html = '';
  for (let i = 0; i < startWeekday; i++) html += '<span class="cal-day cal-blank"></span>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasDance = dateSet.has(ds);
    const isToday = ds === todayStr;
    html += `<button type="button" class="cal-day${hasDance ? ' has-dance' : ''}${isToday ? ' is-today' : ''}" onclick="showCalDay('${ds}')">${d}</button>`;
  }
  document.getElementById('calGrid').innerHTML = html;
  const detail = document.getElementById('calDetail');
  if (detail.dataset.selected && detail.dataset.selected.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, '0')}`)) {
    showCalDay(detail.dataset.selected);
  } else {
    detail.dataset.selected = '';
    detail.innerHTML = '';
  }
}

function showCalDay(dateStr) {
  const detail = document.getElementById('calDetail');
  detail.dataset.selected = dateStr;
  const dayRecords = calRecords.filter(r => r.date === dateStr);
  if (!dayRecords.length) {
    detail.innerHTML = '<div class="cal-detail-empty">😢 当天没有跳舞哦</div>';
    return;
  }
  detail.innerHTML = '<div class="cal-detail-title">📅 ' + dateStr + ' 的练舞记录</div>' + dayRecords.map(r => {
    const videoHtml = r.video ? `<div class="card-video"><video controls preload="metadata" data-media="${r.video}"></video></div>` : '';
    return `<div class="card cal-detail-card">
      <div class="card-head"><div class="card-title">${esc(r.title)}</div>${r.style ? `<span class="card-tag">${styleIcon(r.style)} ${esc(r.style)}</span>` : ''}</div>
      ${r.note ? `<div class="card-body">${esc(r.note)}</div>` : ''}
      ${videoHtml}
      <div class="card-actions"><button class="btn-delete" onclick="deleteDance('${r.id}')">🗑️ 删除</button></div>
    </div>`;
  }).join('');
  attachMediaAll(detail);
}

async function submitDance(e) {
  e.preventDefault();
  setBtnLoading('danceSubmitBtn', true);
  try {
    const title = document.getElementById('fTitle').value;
    const style = document.getElementById('fStyle').value;
    const date = document.getElementById('fDate').value;
    const note = document.getElementById('fNote').value;
    const v = document.getElementById('fVideo').files[0];

    const list = loadData('dw_records', []);
    let record;

    if (editingDanceId) {
      const idx = list.findIndex(x => x.id === editingDanceId);
      if (idx < 0) { showToast('记录不存在'); return; }
      record = list[idx];
      record.title = title;
      record.style = style;
      record.date = date;
      record.note = note;
      if (v) {
        if (record.video) await MediaDB.remove(record.video);
        record.video = MediaDB.genKey();
        record.videoSize = v.size;
        await MediaDB.put(record.video, v);
      }
      list[idx] = record;
    } else {
      record = {
        id: crypto.randomUUID ? crypto.randomUUID() : MediaDB.genKey(),
        title, style, date, note,
        createdAt: Date.now(),
        video: null,
        videoSize: 0
      };
      if (v) {
        record.video = MediaDB.genKey();
        record.videoSize = v.size;
        await MediaDB.put(record.video, v);
      }
      list.push(record);
    }

    saveData('dw_records', list);
    showToast(editingDanceId ? '已保存修改 ✨' : '记录成功！✨'); hideModal('danceModal');
    document.getElementById('danceForm').reset();
    document.getElementById('fDate').value = new Date().toISOString().slice(0, 10);
    loadDanceList(); loadDanceCal();
  } catch { showToast('保存失败 😥'); }
  setBtnLoading('danceSubmitBtn', false);
}

/* ====== Mood ====== */
function moodEmoji(m) { return (m && m.emoji) || '😊'; }
async function loadMoodList() {
  const list = loadData('dw_moods', []).slice().sort((a, b) => b.createdAt - a.createdAt);
  const el = document.getElementById('moodList');
  if (!list.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">😊</div><p>今天还没有记录心情哦～</p></div>'; return; }
  el.innerHTML = list.map(m => `<div class="card"><div class="card-head"><div class="mood-emoji">${moodEmoji(m)}</div><span class="card-tag">${esc(m.mood)}</span></div>${m.note ? `<div class="card-body">${esc(m.note)}</div>` : ''}<div class="card-meta">📅 ${m.date}</div><div class="card-actions"><button class="btn-delete" onclick="deleteMood('${m.id}')">🗑️ 删除</button></div></div>`).join('');
}
async function deleteMood(id) { if (!confirm('确定删除？')) return; const list = loadData('dw_moods', []); saveData('dw_moods', list.filter(x => x.id !== id)); loadMoodList(); showToast('已删除 🗑️'); }
function quickMood(mood, emoji) { document.getElementById('fMood').value = mood; document.getElementById('fMoodEmoji').value = emoji || '😊'; showMoodModal(); }
function showMoodModal() { document.getElementById('moodModal').classList.remove('hidden'); }
function selectMood(btn) {
  document.querySelectorAll('.mood-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('fMood').value = btn.dataset.mood;
  document.getElementById('fMoodEmoji').value = btn.dataset.emoji;
  document.querySelectorAll('.emoji-opt').forEach(b => b.classList.toggle('selected', b.dataset.emoji === btn.dataset.emoji));
}
function selectEmoji(btn) {
  document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('fMoodEmoji').value = btn.dataset.emoji;
  document.querySelectorAll('.mood-opt').forEach(b => b.classList.remove('selected'));
}
function onMoodInput(v) {
  if (v.trim()) document.querySelectorAll('.mood-opt').forEach(b => b.classList.remove('selected'));
}

async function submitMood(e) {
  e.preventDefault();
  const data = { mood: document.getElementById('fMood').value, emoji: document.getElementById('fMoodEmoji').value, date: document.getElementById('fMoodDate').value, note: document.getElementById('fMoodNote').value };
  if (!data.mood) { showToast('请选择心情'); return; }
  setBtnLoading('moodSubmitBtn', true);
  try {
    const list = loadData('dw_moods', []);
    list.push({ id: crypto.randomUUID ? crypto.randomUUID() : MediaDB.genKey(), ...data, createdAt: Date.now() });
    saveData('dw_moods', list);
    showToast('心情已记录 ✨'); hideModal('moodModal');
    document.getElementById('moodForm').reset();
    document.getElementById('fMoodDate').value = new Date().toISOString().slice(0, 10);
    loadMoodList();
  } catch { showToast('保存失败 😥'); }
  setBtnLoading('moodSubmitBtn', false);
}

/* ====== Moments ====== */
function previewImages(input) {
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = '';
  const files = Array.from(input.files).slice(0, 9);
  files.forEach(f => {
    const reader = new FileReader();
    reader.onload = e => { preview.innerHTML += '<img src="' + e.target.result + '">'; };
    reader.readAsDataURL(f);
  });
}

async function loadMomentsList() {
  const list = loadData('dw_moments', []).slice().sort((a, b) => b.createdAt - a.createdAt);
  const el = document.getElementById('momentsList');
  if (!list.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📱</div><p>还没有发动态，分享一下吧～</p></div>'; return; }
  el.innerHTML = list.map(m => {
    let mediaHtml = '';
    if (m.images && m.images.length) {
      const cls = m.images.length === 1 ? 'moment-images single' : 'moment-images';
      const imgArr = JSON.stringify(m.images).replace(/"/g, '&quot;');
      mediaHtml = `<div class="${cls}">${m.images.map((img, i) => `<img data-img="${img}" onclick="viewGallery(${imgArr}, ${i})">`).join('')}</div>`;
    }
    if (m.video) { mediaHtml += `<div class="moment-video"><video controls preload="metadata" data-media="${m.video}"></video></div>`; }
    const comments = (m.comments || []).map(c =>
      `<div class="moment-comment"><span class="mc-text">${esc(c.text)}</span><span class="mc-time">${fmtTime(c.time)}</span></div>`
    ).join('');
    return `<div class="card moment-card">
      ${mediaHtml}
      <div class="moment-content" onclick="viewMomentDetail('${m.id}')">${esc(m.content)}</div>
      <div class="card-meta">📅 ${m.date}</div>
      <div class="moment-comments">${comments}</div>
      <div class="moment-comment-box">
        <input type="text" id="cmtInput_${m.id}" placeholder="写评论..." maxlength="200" onkeydown="if(event.key==='Enter')addMomentComment('${m.id}')">
        <button class="btn-primary btn-sm" onclick="addMomentComment('${m.id}')">评论</button>
      </div>
      <div class="card-actions"><button class="btn-delete" onclick="viewMomentDetail('${m.id}')">👁️ 详情</button><button class="btn-delete" onclick="editMoment('${m.id}')">✏️ 编辑</button><button class="btn-delete" onclick="deleteMoment('${m.id}')">🗑️ 删除</button></div>
    </div>`;
  }).join('');
  attachMediaAll(el);
}
async function deleteMoment(id) {
  if (!confirm('确定删除？')) return;
  const list = loadData('dw_moments', []);
  const item = list.find(x => x.id === id);
  if (item) {
    if (item.video) await MediaDB.remove(item.video);
    if (item.images) for (const k of item.images) await MediaDB.remove(k);
  }
  saveData('dw_moments', list.filter(x => x.id !== id));
  loadMomentsList(); showToast('已删除 🗑️');
}

function addMomentComment(id) {
  const inp = document.getElementById('cmtInput_' + id);
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) { showToast('评论不能为空'); return; }
  const list = loadData('dw_moments', []);
  const m = list.find(x => x.id === id);
  if (!m) return;
  if (!m.comments) m.comments = [];
  m.comments.push({ text, time: Date.now() });
  saveData('dw_moments', list);
  loadMomentsList(); showToast('评论成功 💬');
}

function viewMomentDetail(id) {
  const list = loadData('dw_moments', []);
  const m = list.find(x => x.id === id);
  if (!m) return;
  viewingMomentId = id;
  const body = document.getElementById('momentDetailBody');
  let mediaHtml = '';
  if (m.images && m.images.length) {
    const cls = m.images.length === 1 ? 'moment-images single' : 'moment-images';
    const imgArr = JSON.stringify(m.images).replace(/"/g, '&quot;');
    mediaHtml = `<div class="${cls}">${m.images.map((img, i) => `<img data-img="${img}" onclick="viewGallery(${imgArr}, ${i})">`).join('')}</div>`;
  }
  if (m.video) { mediaHtml += `<div class="moment-video"><video controls preload="metadata" data-media="${m.video}"></video></div>`; }
  const comments = (m.comments || []).map(c =>
    `<div class="moment-comment"><span class="mc-text">${esc(c.text)}</span><span class="mc-time">${fmtTime(c.time)}</span></div>`
  ).join('') || '<div class="moment-comments-empty">还没有评论，来抢沙发～</div>';
  body.innerHTML = `
    <div class="moment-content">${esc(m.content)}</div>
    ${mediaHtml}
    <div class="card-meta">📅 ${m.date}</div>
    <div class="moment-comments">${comments}</div>
    <div class="moment-comment-box">
      <input type="text" id="cmtDetailInput" placeholder="写评论..." maxlength="200" onkeydown="if(event.key==='Enter')addDetailComment()">
      <button class="btn-primary btn-sm" onclick="addDetailComment()">评论</button>
    </div>
  `;
  attachMediaAll(body);
  document.getElementById('momentDetailModal').classList.remove('hidden');
}

function addDetailComment() {
  const inp = document.getElementById('cmtDetailInput');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) { showToast('评论不能为空'); return; }
  const list = loadData('dw_moments', []);
  const m = list.find(x => x.id === viewingMomentId);
  if (!m) return;
  if (!m.comments) m.comments = [];
  m.comments.push({ text, time: Date.now() });
  saveData('dw_moments', list);
  viewMomentDetail(viewingMomentId); showToast('评论成功 💬');
  loadMomentsList();
}

function fmtTime(t) {
  if (!t) return '';
  const d = new Date(t);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function showMomentModal() {
  editingMomentId = null;
  document.getElementById('momentForm').reset();
  document.getElementById('imagePreview').innerHTML = '';
  document.querySelector('#momentModal h3').textContent = '📸 发动态';
  document.getElementById('momentSubmitBtn').textContent = '✨ 发布';
  const it = document.querySelector('#momentUploadArea .upload-text');
  if (it) it.textContent = '点击选择图片';
  const vt = document.querySelector('#momentVideoArea .upload-text');
  if (vt) vt.textContent = '点击选择视频';
  document.getElementById('momentModal').classList.remove('hidden');
}

function editMoment(id) {
  const list = loadData('dw_moments', []);
  const m = list.find(x => x.id === id);
  if (!m) return;
  editingMomentId = id;
  document.getElementById('fMomentContent').value = m.content || '';
  document.querySelector('#momentModal h3').textContent = '✏️ 编辑动态';
  document.getElementById('momentSubmitBtn').textContent = '💾 保存修改';
  const it = document.querySelector('#momentUploadArea .upload-text');
  if (it) it.textContent = m.images && m.images.length ? `已选 ${m.images.length} 张图（重新选择可替换）` : '点击选择图片';
  const vt = document.querySelector('#momentVideoArea .upload-text');
  if (vt) vt.textContent = m.video ? '已选视频（重新选择可替换）' : '点击选择视频';
  document.getElementById('momentModal').classList.remove('hidden');
}

async function submitMoment(e) {
  e.preventDefault();
  const btn = document.getElementById('momentSubmitBtn');
  setBtnLoading('momentSubmitBtn', true);
  btn.innerHTML = '⏳ 0%';
  try {
    const content = document.getElementById('fMomentContent').value;
    const list = loadData('dw_moments', []);
    const images = [];
    const imgFiles = document.getElementById('fMomentImages').files;
    for (let i = 0; i < Math.min(imgFiles.length, 9); i++) {
      const key = MediaDB.genKey();
      await MediaDB.put(key, imgFiles[i]);
      images.push(key);
    }
    const vfile = document.getElementById('fMomentVideo').files[0];
    let video = null;
    if (vfile) { video = MediaDB.genKey(); await MediaDB.put(video, vfile); }
    let record;
    if (editingMomentId) {
      const idx = list.findIndex(x => x.id === editingMomentId);
      if (idx < 0) { showToast('动态不存在'); return; }
      record = list[idx];
      if (images.length) {
        if (record.images) for (const k of record.images) await MediaDB.remove(k);
        record.images = images;
      }
      if (video) {
        if (record.video) await MediaDB.remove(record.video);
        record.video = video;
      }
      record.content = content;
      list[idx] = record;
    } else {
      record = {
        id: crypto.randomUUID ? crypto.randomUUID() : MediaDB.genKey(),
        content,
        date: new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),
        images, video, likes: 0, comments: []
      };
      list.push(record);
    }
    saveData('dw_moments', list);
    showToast(editingMomentId ? '已保存修改 ✨' : '动态已发布 ✨'); hideModal('momentModal');
    document.getElementById('momentForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    loadMomentsList();
  } catch (err) { showToast('发布失败 😥 ' + (err.message || '')); }
  setBtnLoading('momentSubmitBtn', false);
}

/* ====== Diary ====== */
async function loadDiaryList() {
  const list = loadData('dw_diary', []).slice().sort((a, b) => b.createdAt - a.createdAt);
  const el = document.getElementById('diaryList');
  if (!list.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>还没有写日记，记录一下吧～</p></div>'; return; }
  el.innerHTML = list.map(d => `<div class="card"><div class="card-head"><div class="card-title">${esc(d.title || '无题')}</div></div><div class="card-body">${esc(d.content)}</div><div class="card-meta">📅 ${d.date}</div><div class="card-actions"><button class="btn-delete" onclick="deleteDiary('${d.id}')">🗑️ 删除</button></div></div>`).join('');
}
async function deleteDiary(id) { if (!confirm('确定删除？')) return; const list = loadData('dw_diary', []); saveData('dw_diary', list.filter(x => x.id !== id)); loadDiaryList(); showToast('已删除 🗑️'); }

function showDiaryModal() { document.getElementById('diaryModal').classList.remove('hidden'); }

async function submitDiary(e) {
  e.preventDefault();
  setBtnLoading('diarySubmitBtn', true);
  try {
    const list = loadData('dw_diary', []);
    list.push({
      id: crypto.randomUUID ? crypto.randomUUID() : MediaDB.genKey(),
      title: document.getElementById('fDiaryTitle').value,
      date: document.getElementById('fDiaryDate').value,
      content: document.getElementById('fDiaryContent').value,
      createdAt: Date.now()
    });
    saveData('dw_diary', list);
    showToast('日记已保存 ✨'); hideModal('diaryModal');
    document.getElementById('diaryForm').reset();
    document.getElementById('fDiaryDate').value = new Date().toISOString().slice(0, 10);
    loadDiaryList();
  } catch { showToast('保存失败 😥'); }
  setBtnLoading('diarySubmitBtn', false);
}

/* ====== Modal ====== */
function hideModal(id) { document.getElementById(id).classList.add('hidden'); }

/* ====== Upload ====== */
function setBtnLoading(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  if (loading) { btn.dataset.orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '⏳ 正在保存中...'; }
  else { btn.disabled = false; btn.innerHTML = btn.dataset.orig || btn.innerHTML; }
}
function initUpload(areaId, inputId) {
  const ia = document.getElementById(areaId); const inp = document.getElementById(inputId);
  if (!ia || !inp) return;
  const txt = ia.querySelector('.upload-text');
  inp.addEventListener('change', () => { if (inp.files.length && txt) txt.textContent = inp.files[0].name; });
}

/* ====== Toast ====== */
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 2200); }

/* ====== Schedule ====== */
function initScheduleWeek() {
  if (!scheduleData || !scheduleData.semester) return;
  const start = new Date(scheduleData.semester.startDate + 'T00:00:00');
  const now = new Date();
  const diff = Math.floor((now - start) / (7 * 86400000));
  currentWeek = Math.max(1, Math.min(diff + 1, scheduleData.semester.totalWeeks || 20));
}

async function loadSchedule() { if (!scheduleData) { scheduleData = loadData('dw_schedule', { semester: {}, courses: [], timeSlots: [] }); initScheduleWeek(); } renderTimetable(); }
function changeWeek(d) { if (!scheduleData) return; currentWeek = Math.max(1, Math.min(currentWeek + d, scheduleData.semester.totalWeeks || 20)); renderTimetable(); }

function renderTimetable() {
  if (!scheduleData) return;
  const sem = scheduleData.semester;
  const start = new Date(sem.startDate + 'T00:00:00');
  const weekStart = new Date(start.getTime() + (currentWeek - 1) * 7 * 86400000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
  document.getElementById('weekLabel').textContent = `第${currentWeek}周`;
  document.getElementById('scheduleSub').textContent = `${sem.name} · ${fmt(weekStart)} - ${fmt(weekEnd)}`;

  const days = ['星期一', '星期二', '星期三', '星期四', '星期五'];
  const slots = scheduleData.timeSlots || [];
  const courses = scheduleData.courses || [];
  const body = document.getElementById('timetableBody');
  body.innerHTML = '';

  const totalSlots = slots.length;
  const used = {};
  for (const day of days) used[day] = new Set();

  for (let i = 0; i < totalSlots; i++) {
    const sl = slots[i];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="time-col"><div class="slot-num">${sl.label}</div><div class="slot-time">${sl.start}-${sl.end}</div></td>`;

    for (const day of days) {
      if (used[day].has(sl.slot)) continue;

      const matched = courses.filter(c => {
        if (c.day !== day || !c.slots.includes(sl.slot)) return false;
        const parts = c.weeks.split('-').map(Number);
        return currentWeek >= parts[0] && currentWeek <= (parts[1] || parts[0]);
      });

      if (matched.length) {
        const c = matched[0];
        let rowSpan = 0;

        for (let j = i; j < totalSlots; j++) {
          const checkSl = slots[j];
          if (used[day].has(checkSl.slot)) break;
          const checkMatched = courses.filter(nc => {
            if (nc.day !== day || !nc.slots.includes(checkSl.slot)) return false;
            const parts = nc.weeks.split('-').map(Number);
            return currentWeek >= parts[0] && currentWeek <= (parts[1] || parts[0]);
          });
          if (checkMatched.length && checkMatched[0].course === c.course && checkMatched[0].room === c.room) {
            used[day].add(checkSl.slot);
            rowSpan++;
          } else {
            break;
          }
        }

        const cell = document.createElement('td');
        cell.className = 'cell has-course';
        cell.rowSpan = rowSpan;
        cell.innerHTML = `<div class="c-name">${esc(c.course)}</div>${c.room ? `<div class="c-room">${esc(c.room)}</div>` : ''}`;
        tr.appendChild(cell);
      } else {
        const cell = document.createElement('td');
        cell.className = 'cell';
        tr.appendChild(cell);
      }
    }
    body.appendChild(tr);
  }
}

/* ====== Image viewer (gallery) ====== */
let galleryList = [];
let galleryIdx = 0;
let touchX = 0;

function viewGallery(list, idx) {
  galleryList = list || [];
  galleryIdx = idx || 0;
  let ov = document.getElementById('imageViewer');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'imageViewer';
    ov.className = 'image-viewer hidden';
    ov.innerHTML = `
      <div class="viewer-close" onclick="closeImageViewer()">✕</div>
      <button class="viewer-nav viewer-prev" onclick="galleryStep(-1)">‹</button>
      <img id="viewerImg" src="">
      <button class="viewer-nav viewer-next" onclick="galleryStep(1)">›</button>
      <div class="viewer-count" id="viewerCount"></div>`;
    ov.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    ov.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) galleryStep(dx < 0 ? 1 : -1);
    }, { passive: true });
    document.body.appendChild(ov);
  }
  Promise.all(galleryList.map(k => MediaDB.objectUrl(k))).then(urls => {
    galleryList = urls;
    updateViewer();
    ov.classList.remove('hidden');
  });
}

function updateViewer() {
  const img = document.getElementById('viewerImg');
  img.src = galleryList[galleryIdx] || '';
  const count = document.getElementById('viewerCount');
  if (count) count.textContent = galleryList.length > 1 ? (galleryIdx + 1) + ' / ' + galleryList.length : '';
  const prev = document.querySelector('.viewer-prev');
  const next = document.querySelector('.viewer-next');
  if (prev) prev.style.display = galleryList.length > 1 ? '' : 'none';
  if (next) next.style.display = galleryList.length > 1 ? '' : 'none';
}

function galleryStep(dir) {
  if (galleryList.length < 2) return;
  galleryIdx = (galleryIdx + dir + galleryList.length) % galleryList.length;
  updateViewer();
}

function closeImageViewer() { document.getElementById('imageViewer').classList.add('hidden'); }

/* ====== Utils ====== */
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(() => {}); }
