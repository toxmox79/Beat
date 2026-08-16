(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const els = {
    install:$('installBtn'), refresh:$('refreshBtn'), source:$('sourceText'), filter:$('filterInput'), clearSearch:$('clearSearchBtn'),
    tabs:$('viewTabs'), chips:$('genreChips'), chartTitle:$('chartTitle'), kicker:$('chartKicker'), heading:$('listHeading'), count:$('trackCount'),
    loading:$('loadingState'), error:$('errorState'), errorTitle:$('errorTitle'), errorText:$('errorText'), retry:$('retryBtn'), empty:$('emptyState'), list:$('trackList'),
    artist:$('artistInput'), title:$('titleInput'), manualPreview:$('manualPreviewBtn'), manualServices:$('manualServices'),
    sheet:$('serviceSheet'), backdrop:$('sheetBackdrop'), sheetClose:$('sheetClose'), sheetTitle:$('sheetTitle'), sheetArtist:$('sheetArtist'), sheetServices:$('sheetServices'), extended:$('extendedToggle'),
    mini:$('miniPlayer'), miniArt:$('miniArtwork'), miniTitle:$('miniTitle'), miniArtist:$('miniArtist'), miniMatch:$('miniMatch'), miniTime:$('miniTime'), miniPlay:$('miniPlayBtn'), miniSeek:$('miniSeek'), audio:$('previewAudio'), toast:$('toast')
  };

  const GENRES = [
    {name:'Global',slug:'global',id:null},
    {name:'Hard Techno',slug:'hard-techno',id:2},
    {name:'Techno',slug:'techno-peak-time-driving',id:6},
    {name:'Tech House',slug:'tech-house',id:11},
    {name:'House',slug:'house',id:5},
    {name:'Melodic H&T',slug:'melodic-house-techno',id:90},
    {name:'Deep House',slug:'deep-house',id:12},
    {name:'Progressive',slug:'progressive-house',id:15},
    {name:'Drum & Bass',slug:'drum-bass',id:1},
    {name:'Organic House',slug:'organic-house',id:93}
  ];
  const SERVICES = [
    ['simpmusic','SimpMusic','App öffnen'],['soundcloud','SoundCloud','Tracks & Bootlegs'],['spotify','Spotify','Suche'],
    ['ytmusic','YouTube Music','Musiksuche'],['youtube','YouTube','Videos & Uploads'],['google','Google','Websuche']
  ];
  const CACHE_MS = 15 * 60 * 1000;
  let state = {genre:GENRES[0], view:'top', tracks:[], selected:null};
  let deferredInstall = null, previewRequestId = 0, currentPreviewTrack = null, toastTimer;

  function toast(msg){ clearTimeout(toastTimer); els.toast.textContent=msg; els.toast.classList.add('show'); toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2200); }
  function normalize(s=''){return String(s).replace(/\s+/g,' ').trim();}
  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function formatTime(sec){sec=Number.isFinite(sec)?sec:0;return `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,'0')}`;}
  function cacheKey(){return `bb13:${state.view}:${state.genre.slug}`;}
  function getCache(){try{const x=JSON.parse(localStorage.getItem(cacheKey()));return x&&Date.now()-x.ts<CACHE_MS?x.data:null}catch{return null}}
  function setCache(data){try{localStorage.setItem(cacheKey(),JSON.stringify({ts:Date.now(),data}))}catch{}}
  function history(){try{return JSON.parse(localStorage.getItem('beatbridge_history_v13')||'[]')}catch{return[]}}
  function remember(track){let h=history().filter(x=>!(x.title===track.title&&x.artist===track.artist));h.unshift({...track,seenAt:Date.now()});h=h.slice(0,80);localStorage.setItem('beatbridge_history_v13',JSON.stringify(h));}

  function beatportUrl(){
    const g=state.genre;
    if(state.view==='history') return '';
    if(g.slug==='global') {
      if(state.view==='top') return 'https://www.beatport.com/top-100';
      if(state.view==='new') return 'https://www.beatport.com/';
      return 'https://www.beatport.com/top-100';
    }
    const base=`https://www.beatport.com/genre/${g.slug}/${g.id}`;
    if(state.view==='top') return `${base}/top-100`;
    if(state.view==='hype') return `${base}/hype-100`;
    return `${base}/tracks`;
  }
  function heading(){
    if(state.view==='history') return 'Dein Verlauf';
    const base=state.genre.name==='Global'?'Global':state.genre.name;
    return `${base} ${state.view==='top'?'Top 100':state.view==='hype'?'Hype 100':'Neue Tracks'}`;
  }

  function renderGenres(){
    els.chips.innerHTML=GENRES.map(g=>`<button class="genre-chip ${g.slug===state.genre.slug?'active':''}" data-slug="${g.slug}" type="button">${esc(g.name)}</button>`).join('');
  }
  function renderServices(target, compact=false){
    target.innerHTML=SERVICES.map(([id,name,sub])=>`<button data-service="${id}" type="button"><b>${esc(name)}</b>${compact?'':`<small>${esc(sub)}</small>`}</button>`).join('');
  }
  function setStatus(kind,text){els.source.textContent=text;els.source.parentElement.classList.toggle('error',kind==='error');}
  function setLoading(on){els.loading.classList.toggle('hidden',!on);els.list.classList.toggle('hidden',on);els.error.classList.add('hidden');els.empty.classList.add('hidden');}
  function showError(title,text){els.loading.classList.add('hidden');els.list.classList.add('hidden');els.error.classList.remove('hidden');els.errorTitle.textContent=title;els.errorText.textContent=text;setStatus('error','Fallback/Offline');}

  function parseLink(line){const m=line.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);return m?{text:normalize(m[1]),url:m[2]}:null;}
  function parseBeatportMarkdown(md){
    const lines=String(md||'').split(/\r?\n/).map(normalize).filter(Boolean);
    const tracks=[]; const seen=new Set();
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      const all=[...line.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]*beatport\.com\/track\/[^)]+)\)/gi)];
      if(!all.length) continue;
      for(const m of all){
        const title=normalize(m[1]); const url=m[2];
        if(!title||title.length>180||seen.has(url)) continue;
        seen.add(url);
        const vicinity=lines.slice(Math.max(0,i-2),Math.min(lines.length,i+8)).join(' ');
        const artists=[];
        for(const am of vicinity.matchAll(/\[([^\]]+)\]\(https?:\/\/[^)]*beatport\.com\/artist\/[^)]+\)/gi)){
          const a=normalize(am[1]); if(a&&!artists.includes(a)&&a.length<90) artists.push(a);
        }
        let rank=null;
        const rankText=lines.slice(Math.max(0,i-2),i+1).join(' ');
        const rm=rankText.match(/(?:^|\s)(\d{1,3})[.)]?\s/); if(rm) rank=Number(rm[1]);
        const bpm=(vicinity.match(/\b(\d{2,3})\s*BPM\b/i)||[])[1]||'';
        const key=(vicinity.match(/\b([A-G](?:#|b)?\s+(?:Major|Minor))\b/i)||[])[1]||'';
        let label=''; const lm=vicinity.match(/\[([^\]]+)\]\(https?:\/\/[^)]*beatport\.com\/label\/[^)]+\)/i); if(lm) label=normalize(lm[1]);
        let release=''; const rel=vicinity.match(/\[([^\]]+)\]\(https?:\/\/[^)]*beatport\.com\/release\/[^)]+\)/i); if(rel) release=normalize(rel[1]);
        tracks.push({rank:rank||tracks.length+1,title,artist:artists.join(', ')||'Unbekannter Artist',bpm,key,label,release,url});
      }
    }
    const dedupe=[];const sig=new Set();
    for(const t of tracks){const s=(t.artist+'|'+t.title).toLowerCase();if(sig.has(s))continue;sig.add(s);dedupe.push(t);}
    return dedupe.slice(0,100).map((t,i)=>({...t,rank:t.rank||i+1}));
  }

  async function fetchBeatport(url){
    // Jina Reader renders public webpages and avoids the iframe/CORS limitation of a pure PWA.
    const reader=`https://r.jina.ai/${url}`;
    const ctl=new AbortController(); const timer=setTimeout(()=>ctl.abort(),18000);
    try{
      const r=await fetch(reader,{headers:{'Accept':'text/plain'},signal:ctl.signal});
      if(!r.ok) throw new Error(`Reader HTTP ${r.status}`);
      const text=await r.text();
      const tracks=parseBeatportMarkdown(text);
      if(!tracks.length) throw new Error('Keine Track-Metadaten erkannt');
      return tracks;
    } finally {clearTimeout(timer);}
  }

  async function loadChart(force=false){
    els.heading.textContent=heading();els.chartTitle.textContent=heading();els.kicker.textContent=state.view==='history'?'LOKAL':'BEATPORT';
    if(state.view==='history'){
      state.tracks=history();setStatus('ok','Lokal gespeichert');renderTrackList();return;
    }
    setLoading(true);setStatus('ok','Live-Daten werden geladen');
    if(!force){const c=getCache();if(c&&c.length){state.tracks=c;setStatus('ok','Beatport · zwischengespeichert');renderTrackList();refreshInBackground();return;}}
    try{state.tracks=await fetchBeatport(beatportUrl());setCache(state.tracks);setStatus('ok','Beatport · live');renderTrackList();}
    catch(err){
      const stale=(()=>{try{return JSON.parse(localStorage.getItem(cacheKey())||'null')?.data}catch{return null}})();
      if(stale&&stale.length){state.tracks=stale;setStatus('error','Beatport · letzter Stand');renderTrackList();toast('Live-Aktualisierung nicht erreichbar');}
      else showError('Beatport-Liste konnte nicht geladen werden.',`Die PWA darf Beatport nicht direkt einbetten. BeatBridge nutzt deshalb einen Reader für die öffentliche Seite. Dieser war gerade nicht erreichbar (${err.message}).`);
    }
  }
  async function refreshInBackground(){try{const fresh=await fetchBeatport(beatportUrl());if(fresh.length){state.tracks=fresh;setCache(fresh);setStatus('ok','Beatport · live');renderTrackList();}}catch{}}

  function filteredTracks(){const q=normalize(els.filter.value).toLowerCase();if(!q)return state.tracks;return state.tracks.filter(t=>`${t.title} ${t.artist} ${t.label} ${t.release}`.toLowerCase().includes(q));}
  function renderTrackList(){
    setLoading(false);const tracks=filteredTracks();els.count.textContent=`${tracks.length} Tracks`;els.clearSearch.classList.toggle('hidden',!els.filter.value);
    if(!tracks.length){els.list.classList.add('hidden');els.empty.classList.remove('hidden');return;}
    els.empty.classList.add('hidden');els.list.classList.remove('hidden');
    els.list.innerHTML=tracks.map((t,i)=>`<article class="track-row" data-index="${state.tracks.indexOf(t)}">
      <span class="rank">${t.rank||i+1}</span>
      <button class="row-play ${currentPreviewTrack&&currentPreviewTrack.title===t.title&&currentPreviewTrack.artist===t.artist?'active':''}" data-action="play" type="button" aria-label="Hörprobe">▶</button>
      <div class="track-main">
        <strong class="track-title">${esc(t.title)}</strong>
        <span class="track-artist">${esc(t.artist||'Unbekannter Artist')}</span>
        <div class="track-sub">${t.label?`<span>${esc(t.label)}</span>`:''}${t.release&&t.release!==t.title?`<span>${esc(t.release)}</span>`:''}</div>
      </div>
      <div class="track-tech">${t.bpm?`${esc(t.bpm)} BPM<br>`:''}${t.key?esc(t.key):''}</div>
      <button class="more-btn" data-action="more" type="button" aria-label="Öffnen mit">•••</button>
    </article>`).join('');
  }

  function cleanForMatch(s=''){return normalize(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(original|extended|radio|club|mix|remix|edit|version|rework|bootleg)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function tokenScore(a='',b=''){const aa=new Set(cleanForMatch(a).split(' ').filter(Boolean)),bb=new Set(cleanForMatch(b).split(' ').filter(Boolean));if(!aa.size||!bb.size)return 0;let hit=0;aa.forEach(x=>{if(bb.has(x))hit++});return 2*hit/(aa.size+bb.size);}
  function itunesSearch(term){return new Promise((resolve,reject)=>{const id=++previewRequestId,cb=`__bb_${Date.now()}_${Math.random().toString(36).slice(2)}`,s=document.createElement('script');let done=false;const timer=setTimeout(()=>finish(new Error('Zeitüberschreitung')),9000);function finish(e,d){if(done)return;done=true;clearTimeout(timer);delete window[cb];s.remove();if(id!==previewRequestId)return resolve({results:[]});e?reject(e):resolve(d||{results:[]});}window[cb]=d=>finish(null,d);s.onerror=()=>finish(new Error('Preview-Suche nicht erreichbar'));s.src=`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=DE&media=music&entity=song&limit=8&explicit=Yes&callback=${encodeURIComponent(cb)}`;document.head.appendChild(s);});}
  function scoreResult(r,t){return tokenScore(t.title,r.trackName||'')*.62+tokenScore(t.artist,r.artistName||'')*.38;}
  async function previewTrack(track,btn=null){
    if(!track?.title)return; if(btn)btn.classList.add('loading'); remember(track);
    try{
      const data=await itunesSearch(`${track.artist} ${track.title}`); const results=(data.results||[]).filter(r=>r.previewUrl).sort((a,b)=>scoreResult(b,track)-scoreResult(a,track));
      if(!results.length)throw new Error('Keine Hörprobe gefunden');
      const r=results[0]; currentPreviewTrack=track; els.audio.pause();els.audio.src=r.previewUrl;els.audio.load();
      els.miniArt.src=(r.artworkUrl100||'').replace('100x100bb','300x300bb');els.miniTitle.textContent=r.trackName||track.title;els.miniArtist.textContent=r.artistName||track.artist;const s=scoreResult(r,track);els.miniMatch.textContent=s>.78?'Sehr guter Treffer':s>.58?'Wahrscheinlicher Treffer':'Möglicher Treffer';els.mini.classList.remove('hidden');els.miniSeek.value='0';els.miniTime.textContent='0:00';renderTrackList();
      try{await els.audio.play();}catch{toast('Zum Starten ▶ antippen');}syncPlay();
    }catch(e){toast(e.message||'Keine Hörprobe gefunden');}finally{if(btn)btn.classList.remove('loading');}
  }
  function syncPlay(){const playing=!els.audio.paused&&!els.audio.ended;els.miniPlay.textContent=playing?'Ⅱ':'▶';els.miniPlay.setAttribute('aria-label',playing?'Pausieren':'Abspielen');}

  function queryFor(track,service){let q=normalize(`${track.artist||''} ${track.title||''}`);if(els.extended.checked&&['soundcloud','youtube','ytmusic'].includes(service)&&!/(mix|remix|edit|version|bootleg)/i.test(q))q+=' extended mix';return q;}
  function openUrl(url){const w=window.open(url,'_blank','noopener,noreferrer');if(!w)location.href=url;}
  async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return true;}}
  async function openService(service,track){const q=queryFor(track,service);if(!q)return;remember(track);const e=encodeURIComponent(q);if(service==='soundcloud')openUrl(`https://soundcloud.com/search?q=${e}`);else if(service==='spotify')openUrl(`https://open.spotify.com/search/${e}`);else if(service==='youtube')openUrl(`https://www.youtube.com/results?search_query=${e}`);else if(service==='ytmusic')openUrl(`https://music.youtube.com/search?q=${e}`);else if(service==='google')openUrl(`https://www.google.com/search?q=${e}`);else if(service==='simpmusic'){await copyText(q);toast('Suche kopiert – SimpMusic wird geöffnet');setTimeout(()=>{location.href='simpmusic://'},120);setTimeout(()=>{if(document.visibilityState==='visible')openUrl('https://simpmusic.org/')},900);}closeSheet();}
  function openSheet(track){state.selected=track;els.sheetTitle.textContent=track.title;els.sheetArtist.textContent=track.artist;els.sheet.classList.remove('hidden');els.sheet.setAttribute('aria-hidden','false');}
  function closeSheet(){els.sheet.classList.add('hidden');els.sheet.setAttribute('aria-hidden','true');}

  function parseSharedText(raw=''){
    let text=normalize(raw); if(!text)return {};
    const url=(text.match(/https?:\/\/[^\s]+/i)||[])[0]||'';
    text=normalize(text.replace(url,''));
    text=text.replace(/\s*[|–-]\s*Beatport.*$/i,'').replace(/\bon Beatport\b.*$/i,'').trim();
    let m=text.match(/^(.+?)\s+by\s+(.+?)$/i); if(m)return {title:normalize(m[1]),artist:normalize(m[2]),url};
    m=text.match(/^(.+?)\s+[–—-]\s+(.+)$/); if(m)return {artist:normalize(m[1]),title:normalize(m[2]),url};
    return {title:text,url};
  }
  function loadShareTarget(){
    const p=new URLSearchParams(location.search), st=p.get('title')||'', sx=p.get('text')||'', su=p.get('url')||'';
    if(!(st||sx||su))return;
    const a=parseSharedText(st),b=parseSharedText(sx),data={artist:a.artist||b.artist||'',title:a.title||b.title||'',url:su||b.url||a.url||''};
    els.artist.value=data.artist;els.title.value=data.title;
    if(data.artist||data.title){toast('Von Beatport übernommen');setTimeout(()=>previewTrack({artist:data.artist,title:data.title,url:data.url}),250);}
    history.replaceState({},'',location.pathname);
  }

  renderGenres();renderServices(els.sheetServices,false);renderServices(els.manualServices,true);
  loadShareTarget();loadChart();

  els.chips.addEventListener('click',e=>{const b=e.target.closest('[data-slug]');if(!b)return;state.genre=GENRES.find(g=>g.slug===b.dataset.slug)||GENRES[0];renderGenres();if(state.view==='history'){state.view='top';document.querySelectorAll('.view-tab').forEach(x=>x.classList.toggle('active',x.dataset.view==='top'));}loadChart();});
  els.tabs.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;state.view=b.dataset.view;document.querySelectorAll('.view-tab').forEach(x=>x.classList.toggle('active',x===b));loadChart();});
  els.filter.addEventListener('input',renderTrackList);els.clearSearch.addEventListener('click',()=>{els.filter.value='';renderTrackList();els.filter.focus();});
  els.retry.addEventListener('click',()=>loadChart(true));els.refresh.addEventListener('click',()=>{if(state.view==='history')loadChart();else loadChart(true)});
  els.list.addEventListener('click',e=>{const row=e.target.closest('.track-row');if(!row)return;const track=state.tracks[Number(row.dataset.index)];const action=e.target.closest('[data-action]')?.dataset.action;if(action==='play')previewTrack(track,e.target.closest('button'));if(action==='more')openSheet(track);});
  [els.backdrop,els.sheetClose].forEach(x=>x.addEventListener('click',closeSheet));
  els.sheetServices.addEventListener('click',e=>{const b=e.target.closest('[data-service]');if(b&&state.selected)openService(b.dataset.service,state.selected);});
  els.manualServices.addEventListener('click',e=>{const b=e.target.closest('[data-service]');if(!b)return;const t={artist:normalize(els.artist.value),title:normalize(els.title.value)};if(!t.title&&!t.artist)return toast('Artist oder Titel eingeben');openService(b.dataset.service,t);});
  els.manualPreview.addEventListener('click',()=>{const t={artist:normalize(els.artist.value),title:normalize(els.title.value)};if(!t.title&&!t.artist)return toast('Artist oder Titel eingeben');previewTrack(t)});
  els.miniPlay.addEventListener('click',async()=>{if(!els.audio.src)return;if(els.audio.paused){try{await els.audio.play()}catch{}}else els.audio.pause();syncPlay();});
  els.audio.addEventListener('play',syncPlay);els.audio.addEventListener('pause',syncPlay);els.audio.addEventListener('ended',syncPlay);els.audio.addEventListener('loadedmetadata',()=>{els.miniSeek.max=Number.isFinite(els.audio.duration)?els.audio.duration:30;});els.audio.addEventListener('timeupdate',()=>{if(!els.miniSeek.matches(':active'))els.miniSeek.value=els.audio.currentTime||0;els.miniTime.textContent=formatTime(els.audio.currentTime||0);});els.miniSeek.addEventListener('input',()=>{if(Number.isFinite(els.audio.duration))els.audio.currentTime=Number(els.miniSeek.value)});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;els.install.classList.remove('hidden')});els.install.addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;els.install.classList.add('hidden')});
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
