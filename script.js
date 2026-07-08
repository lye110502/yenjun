const API_URL = "https://script.google.com/macros/s/AKfycbzRosPYEijUUCZxaAmoAu9Z7DL43jhI55XnkC2rXI7eiKh9d6TlQyzeOTqnAP6IfzKwIA/exec";
let PASSWORD = localStorage.getItem('exchange_password') || '0418';
let START_DATE = localStorage.getItem('exchange_start') || '2024-04-18';
const $ = (id) => document.getElementById(id);

let state = { letters: [], songs: [], todos: [], memories: [], capsules: [], comments: [], current: null, currentMonth: new Date() };
let letterPhotoData = '';
let memoryPhotoData = '';
let songMeta = null;
let letterSongMeta = null;
const titles = {home:'교환일기',letters:'편지',calendar:'캘린더',songs:'오노추',week:'이번주',memories:'추억',capsules:'타임캡슐'};

window.addEventListener('load', () => {
  updateToday();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
});
$('password')?.addEventListener('keydown', e => { if(e.key==='Enter') login(); });

function login(){
  if($('password').value===PASSWORD){
    $('login').classList.add('hidden');
    $('app').classList.remove('hidden');
    loadAll();
  } else $('loginStatus').textContent='비밀번호가 달라요.';
}
function openSettings(){ $('settingsPassword').value=PASSWORD; $('settingsStart').value=START_DATE; $('settingsDialog').showModal(); }
function saveSettings(){ PASSWORD=$('settingsPassword').value||'0418'; START_DATE=$('settingsStart').value||'2024-04-18'; localStorage.setItem('exchange_password',PASSWORD); localStorage.setItem('exchange_start',START_DATE); updateToday(); $('settingsDialog').close(); }
function updateToday(){ const d=new Date(); const days=['일','월','화','수','목','금','토']; $('todayLine').textContent=`${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${days[d.getDay()]}요일`; const s=new Date(START_DATE+'T00:00:00'); const diff=Math.floor((new Date(d.getFullYear(),d.getMonth(),d.getDate())-s)/86400000)+1; $('ddayLine').textContent=`D+${diff}`; }
function pad(n){return String(n).padStart(2,'0')}
function switchScreen(name){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); $('screen-'+name).classList.add('active'); document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); const idx={home:0,letters:1,calendar:2,songs:3,week:4,memories:5,capsules:6}[name]; document.querySelectorAll('.tab')[idx]?.classList.add('active'); $('pageTitle').textContent=titles[name]; if(name==='calendar') renderCalendar(); }
async function api(action, payload={}){ const res=await fetch(API_URL,{method:'POST',mode:'cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload})}); const data=await res.json(); if(!data.ok) throw new Error(data.message||'오류'); return data; }
async function loadAll(){ try{ const data=await api('list'); state={...state,...data}; renderAll(); }catch(e){ console.error(e); showLoadError(); } }
function showLoadError(){ ['lettersList','songsList','todosList','memoriesList','capsulesList'].forEach(id=>{ if($(id)) $(id).innerHTML='<div class="empty">불러오지 못했어요. Apps Script 설정을 확인해주세요.</div>'; }); }
function renderAll(){ renderLetters(); renderSongs(); renderTodos(); renderMemories(); renderCapsules(); renderCalendar(); $('homeLetterCount').textContent=`편지 ${state.letters.length}개`; }
function dateOnly(v){ if(!v)return''; const d=new Date(v); if(Number.isNaN(d.getTime())) return String(v).slice(0,10); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function formatDate(v){ if(!v)return''; const d=new Date(v); if(Number.isNaN(d.getTime())) return v; return d.toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function esc(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function nl2br(s=''){ return esc(s).replaceAll('\n','<br>'); }

function youtubeId(url){
  const s=String(url||'').trim();
  return (s.match(/youtu\.be\/([^?&/]+)/)||s.match(/[?&]v=([^?&/]+)/)||s.match(/youtube\.com\/shorts\/([^?&/]+)/)||s.match(/youtube\.com\/embed\/([^?&/]+)/)||[])[1]||'';
}
function youtubeThumb(url){ const id=youtubeId(url); return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''; }
async function getYoutubeMeta(url){
  const id = youtubeId(url);
  if(!id) return null;
  const fallback = { title:'YouTube', author:'', url, thumb: youtubeThumb(url) };
  try{
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if(!r.ok) return fallback;
    const j = await r.json();
    return { title:j.title || 'YouTube', author:j.author_name || '', url, thumb:j.thumbnail_url || fallback.thumb };
  }catch(e){ return fallback; }
}
function renderSongPreview(meta){
  if(!meta) return '';
  return `<div class="song-card compact"><img src="${esc(meta.thumb)}" onerror="this.style.display='none'"><div class="song-info"><b>${esc(meta.title)}</b><small>${esc(meta.author || 'YouTube')}</small><br><a href="${esc(meta.url)}" target="_blank" rel="noopener">▶ 듣기</a></div></div>`;
}
async function previewSong(){
  const url = $('songUrl').value.trim();
  const box = $('songPreview');
  songMeta = null;
  if(!youtubeId(url)){ box.classList.add('hidden'); box.innerHTML=''; return; }
  box.classList.remove('hidden');
  box.innerHTML='<div class="empty small-empty">오노추 카드 만드는 중...</div>';
  songMeta = await getYoutubeMeta(url);
  box.innerHTML = renderSongPreview(songMeta);
}
async function previewLetterSong(){
  const url = $('letterSong').value.trim();
  const box = $('letterSongPreview');
  letterSongMeta = null;
  if(!youtubeId(url)){ box.classList.add('hidden'); box.innerHTML=''; return; }
  box.classList.remove('hidden');
  box.innerHTML='<div class="empty small-empty">오노추 카드 만드는 중...</div>';
  letterSongMeta = await getYoutubeMeta(url);
  box.innerHTML = renderSongPreview(letterSongMeta);
}

function compressImage(file, maxSize=1200, quality=0.72){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('사진을 불러오지 못했어요.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('사진 형식을 확인해주세요.'));
      img.onload = () => {
        let {width, height} = img;
        const ratio = Math.min(1, maxSize / Math.max(width, height));
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function previewLetterPhoto(){
  const file = $('letterPhotoFile').files[0];
  if(!file) return;
  $('letterStatus').textContent='사진 불러오는 중...';
  letterPhotoData = await compressImage(file);
  $('letterPhotoPreview').src = letterPhotoData;
  $('letterPhotoPreview').classList.remove('hidden');
  $('letterStatus').textContent='';
}
async function previewMemoryPhoto(){
  const file = $('memoryPhotoFile').files[0];
  if(!file) return;
  $('memoryStatus').textContent='사진 불러오는 중...';
  memoryPhotoData = await compressImage(file);
  $('memoryPhotoPreview').src = memoryPhotoData;
  $('memoryPhotoPreview').classList.remove('hidden');
  $('memoryStatus').textContent='';
}
function resetLetterPhoto(){ letterPhotoData=''; $('letterPhotoFile').value=''; $('letterPhotoPreview').src=''; $('letterPhotoPreview').classList.add('hidden'); }
function resetMemoryPhoto(){ memoryPhotoData=''; $('memoryPhotoFile').value=''; $('memoryPhotoPreview').src=''; $('memoryPhotoPreview').classList.add('hidden'); }

async function saveLetter(){
  const payload={writer:$('letterWriter').value,mood:$('letterMood').value,title:$('letterTitle').value.trim(),content:$('letterContent').value.trim(),songUrl:$('letterSong').value.trim(),photoUrl:letterPhotoData};
  if(!payload.title||!payload.content){$('letterStatus').textContent='제목과 내용을 적어주세요.';return}
  $('letterSaveBtn').disabled=true; $('letterStatus').textContent='저장 중...';
  try{
    await api('addLetter',payload);
    ['letterMood','letterTitle','letterContent','letterSong'].forEach(id=>$(id).value='');
    $('letterSongPreview').classList.add('hidden'); $('letterSongPreview').innerHTML=''; letterSongMeta=null; resetLetterPhoto();
    $('letterStatus').textContent='저장 완료.';
    await loadAll();
  }catch(e){$('letterStatus').textContent=e.message} finally{$('letterSaveBtn').disabled=false}
}
function renderLetters(){ const box=$('lettersList'); if(!state.letters.length){box.innerHTML='<div class="empty">아직 편지가 없어요.</div>';return} box.innerHTML=''; [...state.letters].reverse().forEach(l=>{ const likes=Number(l.likes||0); const div=document.createElement('div'); div.className='item'; div.innerHTML=`<div class="item-title">${esc(l.title)}</div><div class="meta">${esc(l.writer)} · ${formatDate(l.date)} ${l.mood?'· '+esc(l.mood):''}</div><div class="item-actions"><button class="secondary">❤️ ${likes}</button><button class="delete-btn">삭제</button></div>`; div.onclick=()=>openDetail('letter',l); div.querySelector('.secondary').onclick=e=>{e.stopPropagation(); likeRecord('letters',l.id)}; div.querySelector('.delete-btn').onclick=e=>{e.stopPropagation(); deleteRecord('letters',l.id)}; box.appendChild(div); }); }
function openDetail(type,obj){
  state.current={type,obj};
  $('modalTitle').textContent=obj.title||obj.text||'기록';
  $('modalMeta').textContent=`${obj.writer||''} · ${formatDate(obj.date||obj.createdAt||obj.openDate)}`;
  let body='';
  if(type==='capsule'&&!isOpen(obj.openDate)){
    body=`<p>아직 열 수 없는 편지입니다.</p><p>${daysLeftText(obj.openDate)}</p>`;
  } else {
    body += obj.content ? `<div>${nl2br(obj.content)}</div>` : '';
    body += obj.memo ? `<div>${nl2br(obj.memo)}</div>` : '';
    if(obj.songUrl){ body += `<div class="detail-block">${renderSongPreview({title:'오노추', author:'YouTube', url:obj.songUrl, thumb:youtubeThumb(obj.songUrl)})}</div>`; }
    if(obj.photoUrl || obj.url){ body += `<div class="detail-block"><img class="detail-photo" src="${esc(obj.photoUrl || obj.url)}" alt="첨부 사진"></div>`; }
  }
  $('modalBody').innerHTML=body || '<div class="meta">내용이 없어요.</div>';
  $('likeBtn').classList.toggle('hidden', type==='capsule');
  $('deleteBtn').classList.remove('hidden');
  $('commentForm').classList.toggle('hidden', type!=='letter');
  renderComments(obj.id);
  $('detailDialog').showModal();
}
function renderComments(recordId){ const cs=state.comments.filter(c=>c.recordId===recordId); $('commentsBox').innerHTML=cs.length?`<div class="modal-body">${cs.map(c=>`<div class="comment"><b>${esc(c.writer)}</b><br>${esc(c.text)}<div class="meta">${formatDate(c.date)}</div></div>`).join('')}</div>`:''; }
async function likeCurrent(){ if(state.current) await likeRecord(state.current.type==='letter'?'letters':state.current.type,state.current.obj.id); }
async function likeRecord(type,id){ try{ await api('like',{type,id}); await loadAll(); }catch(e){alert('좋아요 실패: '+e.message)} }
async function deleteCurrent(){ if(state.current) await deleteRecord(state.current.type==='letter'?'letters':state.current.type,state.current.obj.id); }
async function deleteRecord(type,id){ if(!confirm('삭제할까요?'))return; try{ await api('delete',{type,id}); $('detailDialog').close(); await loadAll(); }catch(e){alert('삭제 실패: '+e.message)} }
async function saveComment(){ if(!state.current)return; const text=$('commentText').value.trim(); if(!text)return; try{ await api('comment',{recordId:state.current.obj.id,writer:$('commentWriter').value||'예은',text}); $('commentText').value=''; await loadAll(); renderComments(state.current.obj.id); }catch(e){alert(e.message)} }

async function saveSong(){
  const url=$('songUrl').value.trim();
  if(!youtubeId(url)){$('songStatus').textContent='유튜브 링크를 넣어주세요.';return}
  $('songStatus').textContent='저장 중...';
  if(!songMeta) songMeta = await getYoutubeMeta(url);
  const payload={writer:$('songWriter').value,title:songMeta?.title||'오늘의 노래',artist:songMeta?.author||'',url};
  try{ await api('addSong',payload); $('songUrl').value=''; $('songPreview').classList.add('hidden'); $('songPreview').innerHTML=''; songMeta=null; $('songStatus').textContent='저장 완료.'; await loadAll(); }catch(e){$('songStatus').textContent=e.message}
}
function songCard(s){ const meta={title:s.title||'오늘의 노래', author:s.artist||'', url:s.url, thumb:youtubeThumb(s.url)}; return `<div class="song-card"><img src="${esc(meta.thumb)}" onerror="this.style.display='none'"><div class="song-info"><b>${esc(meta.title)}</b><small>${esc(meta.author)} ${meta.author?'·':''} ${esc(s.writer)} · ${formatDate(s.date)}</small><br><a href="${esc(s.url)}" target="_blank" rel="noopener">▶ 듣기</a></div></div>`; }
function renderSongs(){ const box=$('songsList'); box.innerHTML=state.songs.length?[...state.songs].reverse().map(songCard).join(''):'<div class="empty">아직 오노추가 없어요.</div>'; }

async function saveTodo(){ const text=$('todoText').value.trim(); if(!text)return; try{ await api('addTodo',{writer:$('todoWriter').value,text}); $('todoText').value=''; await loadAll(); }catch(e){alert(e.message)} }
function renderTodos(){ const box=$('todosList'); if(!state.todos.length){box.innerHTML='<div class="empty">이번주 할 일을 추가해보세요.</div>';return} box.innerHTML=''; [...state.todos].reverse().forEach(t=>{ const done=String(t.done)==='true'; const div=document.createElement('div'); div.className='item todo-row '+(done?'done':''); div.innerHTML=`<div class="todo-left"><div class="check">${done?'✓':''}</div><div><div class="item-title">${esc(t.text)}</div><div class="meta">${esc(t.writer)} · ${formatDate(t.date)}</div></div></div><button class="delete-btn">삭제</button>`; div.querySelector('.todo-left').onclick=()=>toggleTodo(t.id,!done); div.querySelector('.delete-btn').onclick=e=>{e.stopPropagation();deleteRecord('todos',t.id)}; box.appendChild(div); }); }
async function toggleTodo(id,done){ await api('toggleTodo',{id,done}); await loadAll(); }

async function saveMemory(){
  const payload={writer:$('memoryWriter').value,title:$('memoryTitle').value.trim()||'추억',url:memoryPhotoData,memo:$('memoryMemo').value.trim()};
  if(!payload.url){$('memoryStatus').textContent='사진을 추가해주세요.';return}
  try{ await api('addMemory',payload); ['memoryTitle','memoryMemo'].forEach(id=>$(id).value=''); resetMemoryPhoto(); $('memoryStatus').textContent='저장 완료.'; await loadAll(); }catch(e){$('memoryStatus').textContent=e.message}
}
function renderMemories(){ const box=$('memoriesList'); if(!state.memories.length){box.innerHTML='<div class="empty">아직 추억 사진이 없어요.</div>';return} box.innerHTML=[...state.memories].reverse().map(m=>`<div class="memory-card" onclick='openDetail("memory", ${JSON.stringify(m).replaceAll("'","&#039;")})'><img src="${esc(m.url)}"><div><b>${esc(m.title)}</b><div class="meta">${esc(m.writer)} · ${formatDate(m.date)}</div></div></div>`).join(''); }

async function saveCapsule(){ const payload={writer:$('capsuleWriter').value,title:$('capsuleTitle').value.trim(),content:$('capsuleContent').value.trim(),openDate:$('capsuleOpenDate').value}; if(!payload.title||!payload.content||!payload.openDate){$('capsuleStatus').textContent='제목, 내용, 날짜를 모두 넣어주세요.';return} try{ await api('addCapsule',payload); ['capsuleTitle','capsuleContent','capsuleOpenDate'].forEach(id=>$(id).value=''); $('capsuleStatus').textContent='저장 완료.'; await loadAll(); }catch(e){$('capsuleStatus').textContent=e.message} }
function isOpen(openDate){ const today=new Date(); today.setHours(0,0,0,0); const d=new Date(openDate+'T00:00:00'); return today>=d; }
function daysLeftText(openDate){ const today=new Date(); today.setHours(0,0,0,0); const d=new Date(openDate+'T00:00:00'); const diff=Math.ceil((d-today)/86400000); return diff>0?`D-${diff}`:'열렸어요.'; }
function renderCapsules(){ const box=$('capsulesList'); if(!state.capsules.length){box.innerHTML='<div class="empty">아직 타임캡슐이 없어요.</div>';return} box.innerHTML=''; [...state.capsules].reverse().forEach(c=>{ const open=isOpen(c.openDate); const div=document.createElement('div'); div.className='item'; div.innerHTML=`<div class="item-title">${open?'🔓':'🔒'} ${esc(c.title)}</div><div class="meta">${esc(c.writer)} · ${esc(c.openDate)} · ${daysLeftText(c.openDate)}</div><div class="item-actions"><button class="delete-btn">삭제</button></div>`; div.onclick=()=>openDetail('capsule',c); div.querySelector('.delete-btn').onclick=e=>{e.stopPropagation();deleteRecord('capsules',c.id)}; box.appendChild(div); }); }

function changeMonth(n){ const d=state.currentMonth; state.currentMonth=new Date(d.getFullYear(),d.getMonth()+n,1); renderCalendar(); }
function renderCalendar(){ if(!$('calendarGrid'))return; const d=state.currentMonth; const y=d.getFullYear(), m=d.getMonth(); $('calendarTitle').textContent=`${y}년 ${m+1}월`; const first=new Date(y,m,1).getDay(); const last=new Date(y,m+1,0).getDate(); const grid=$('calendarGrid'); grid.innerHTML=''; for(let i=0;i<first;i++) grid.innerHTML+='<div class="day dim"></div>'; const todayKey=dateOnly(new Date()); for(let day=1;day<=last;day++){ const key=`${y}-${pad(m+1)}-${pad(day)}`; const marks=[]; if(state.letters.some(x=>dateOnly(x.date)===key)) marks.push('💌'); if(state.songs.some(x=>dateOnly(x.date)===key)) marks.push('🎧'); if(state.memories.some(x=>dateOnly(x.date)===key)) marks.push('📷'); if(state.capsules.some(x=>x.openDate===key)) marks.push('🔒'); const el=document.createElement('div'); el.className='day '+(key===todayKey?'today':''); el.innerHTML=`<div class="date-num">${day}</div><div class="marks">${marks.join('')}</div>`; el.onclick=()=>showDay(key); grid.appendChild(el); } }
function showDay(key){ const records=[]; state.letters.filter(x=>dateOnly(x.date)===key).forEach(x=>records.push(`💌 ${esc(x.title)}`)); state.songs.filter(x=>dateOnly(x.date)===key).forEach(x=>records.push(`🎧 ${esc(x.title)}`)); state.memories.filter(x=>dateOnly(x.date)===key).forEach(x=>records.push(`📷 ${esc(x.title)}`)); state.capsules.filter(x=>x.openDate===key).forEach(x=>records.push(`🔒 ${esc(x.title)}`)); $('dayRecords').className='day-records'; $('dayRecords').innerHTML=`<div class="item"><div class="item-title">${key}</div>${records.length?records.map(r=>`<div class="meta">${r}</div>`).join(''):'<div class="meta">기록이 없어요.</div>'}</div>`; }
