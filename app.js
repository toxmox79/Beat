(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const els = {
    install:$('installBtn'), refresh:$('refreshBtn'), source:$('sourceText'), syncStatus:$('syncStatus'), filter:$('filterInput'), clearSearch:$('clearSearchBtn'),
    tabs:$('viewTabs'), chips:$('genreChips'), chartTitle:$('chartTitle'), kicker:$('chartKicker'), heading:$('listHeading'), count:$('trackCount'),
    loading:$('loadingState'), error:$('errorState'), errorTitle:$('errorTitle'), errorText:$('errorText'), retry:$('retryBtn'), empty:$('emptyState'), list:$('trackList'),
    artist:$('artistInput'), title:$('titleInput'), manualPreview:$('manualPreviewBtn'), manualServices:$('manualServices'),
    sheet:$('serviceSheet'), backdrop:$('sheetBackdrop'), sheetClose:$('sheetClose'), sheetTitle:$('sheetTitle'), sheetArtist:$('sheetArtist'), sheetServices:$('sheetServices'), extended:$('extendedToggle'),
    mini:$('miniPlayer'), miniArt:$('miniArtwork'), miniTitle:$('miniTitle'), miniArtist:$('miniArtist'), miniMatch:$('miniMatch'), miniTime:$('miniTime'), miniPlay:$('miniPlayBtn'), miniSeek:$('miniSeek'), audio:$('previewAudio'), toast:$('toast'),
    audioMiniWrap:$('audioMiniWrap'), spotifyEmbedWrap:$('spotifyEmbedWrap'), spotifyHost:$('spotifyEmbedHost'), spotifyClose:$('spotifyCloseBtn'),
    previewPriority:$('previewPriority'), spotifyClientId:$('spotifyClientId'), spotifyStatus:$('spotifyStatus'), spotifyConnect:$('spotifyConnectBtn'), saveSpotify:$('saveSpotifyBtn'), spotifyRedirect:$('spotifyRedirectUri'), copyRedirect:$('copyRedirectBtn')
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
  const SELECTION_KEY='beatbridge_selection_v16';
  const STARTUP_SYNC_DELAY=3300; // reader-friendly pacing; avoids anonymous rate-limit bursts
  let state = {genre:GENRES[0], view:'top', tracks:[], selected:null};
  let deferredInstall = null, previewRequestId = 0, currentPreviewTrack = null, activePreviewProvider = null, toastTimer;
  let refreshAllCycle=0, refreshAllRunning=false;

  function toast(msg){ clearTimeout(toastTimer); els.toast.textContent=msg; els.toast.classList.add('show'); toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2200); }
  function normalize(s=''){return String(s).replace(/\s+/g,' ').trim();}
  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function formatTime(sec){sec=Number.isFinite(sec)?sec:0;return `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,'0')}`;}
  function cacheKeyFor(view,genre){return `bb16:${view}:${genre.slug}`;}
  function cacheKey(){return cacheKeyFor(state.view,state.genre);}
  function getCache(){try{const x=JSON.parse(localStorage.getItem(cacheKey()));return x&&Date.now()-x.ts<CACHE_MS?x.data:null}catch{return null}}
  function setCache(data){try{localStorage.setItem(cacheKey(),JSON.stringify({ts:Date.now(),data}))}catch{}}
  function setCacheFor(view,genre,data){try{localStorage.setItem(cacheKeyFor(view,genre),JSON.stringify({ts:Date.now(),data}))}catch{}}
  function saveSelection(){if(state.view==='history')return;try{localStorage.setItem(SELECTION_KEY,JSON.stringify({view:state.view,slug:state.genre.slug}))}catch{}}
  function restoreSelection(){try{const x=JSON.parse(localStorage.getItem(SELECTION_KEY)||'null');if(!x)return;const g=GENRES.find(v=>v.slug===x.slug);if(g)state.genre=g;if(['top','new','hype'].includes(x.view))state.view=x.view;}catch{}}
  function getHistory(){try{return JSON.parse(localStorage.getItem('beatbridge_history_v13')||'[]')}catch{return[]}}
  function remember(track){let h=getHistory().filter(x=>!(x.title===track.title&&x.artist===track.artist));h.unshift({...track,seenAt:Date.now()});h=h.slice(0,80);localStorage.setItem('beatbridge_history_v13',JSON.stringify(h));}

  function beatportUrlFor(view,g){
    if(view==='history') return '';
    if(g.slug==='global') {
      if(view==='top') return 'https://www.beatport.com/top-100';
      if(view==='new') return 'https://www.beatport.com/';
      return 'https://www.beatport.com/top-100';
    }
    const base=`https://www.beatport.com/genre/${g.slug}/${g.id}`;
    if(view==='top') return `${base}/top-100`;
    if(view==='hype') return `${base}/hype-100`;
    return `${base}/tracks`;
  }
  function beatportUrl(){return beatportUrlFor(state.view,state.genre);}
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
  function setSyncStatus(text='',done=false){if(!els.syncStatus)return;els.syncStatus.textContent=text;els.syncStatus.classList.toggle('done',!!done);els.syncStatus.classList.toggle('hidden',!text);}
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
      state.tracks=getHistory();setStatus('ok','Lokal gespeichert');renderTrackList();return true;
    }
    saveSelection();
    setLoading(true);setStatus('ok','Live-Daten werden geladen');
    if(!force){const c=getCache();if(c&&c.length){state.tracks=c;setStatus('ok','Beatport · zwischengespeichert');renderTrackList();refreshInBackground();return true;}}
    try{state.tracks=await fetchBeatport(beatportUrl());setCache(state.tracks);setStatus('ok','Beatport · live');renderTrackList();return true;}
    catch(err){
      const stale=(()=>{try{return JSON.parse(localStorage.getItem(cacheKey())||'null')?.data}catch{return null}})();
      if(stale&&stale.length){state.tracks=stale;setStatus('error','Beatport · letzter Stand');renderTrackList();toast('Live-Aktualisierung nicht erreichbar');return false;}
      showError('Beatport-Liste konnte nicht geladen werden.',`Die PWA darf Beatport nicht direkt einbetten. BeatBridge nutzt deshalb einen Reader für die öffentliche Seite. Dieser war gerade nicht erreichbar (${err.message}).`);return false;
    }
  }
  async function refreshInBackground(){const view=state.view,genre=state.genre,url=beatportUrl();try{const fresh=await fetchBeatport(url);if(fresh.length){setCacheFor(view,genre,fresh);if(state.view===view&&state.genre.slug===genre.slug){state.tracks=fresh;setStatus('ok','Beatport · live');renderTrackList();}}}catch{}}
  function allChartJobs(){const views=['top','new','hype'],jobs=[];for(const genre of GENRES)for(const view of views)jobs.push({view,genre,url:beatportUrlFor(view,genre),key:cacheKeyFor(view,genre)});return jobs;}
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  async function refreshAllChartsInBackground(excludeKey=''){
    if(refreshAllRunning)return;refreshAllRunning=true;const cycle=++refreshAllCycle;
    const jobs=allChartJobs().filter(j=>j.key!==excludeKey);const total=jobs.length+(excludeKey?1:0);let done=excludeKey?1:0,ok=excludeKey?1:0;
    setSyncStatus(`Alle Listen: ${done}/${total} aktualisiert`);
    for(const job of jobs){
      if(cycle!==refreshAllCycle)break;
      try{const fresh=await fetchBeatport(job.url);if(fresh.length){setCacheFor(job.view,job.genre,fresh);ok++;}}catch{}
      done++;setSyncStatus(`Alle Listen: ${done}/${total} aktualisiert`);
      if(done<total)await sleep(STARTUP_SYNC_DELAY);
    }
    if(cycle===refreshAllCycle)setSyncStatus(`Alle Listen aktualisiert · ${ok}/${total}`,true);
    refreshAllRunning=false;
  }
  async function refreshSelectedThenAll(){
    if(state.view==='history'){loadChart();void refreshAllChartsInBackground('');return;}
    const firstKey=cacheKey();setSyncStatus('Ausgewählte Liste wird zuerst aktualisiert …');await loadChart(true);setSyncStatus('Ausgewählte Liste aktuell · weitere Listen folgen');void refreshAllChartsInBackground(firstKey);
  }

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

  // Apple/iTunes preview fallback (no account or API key needed).
  function itunesSearch(term){return new Promise((resolve,reject)=>{const cb=`__bb_${Date.now()}_${Math.random().toString(36).slice(2)}`,s=document.createElement('script');let done=false;const timer=setTimeout(()=>finish(new Error('Zeitüberschreitung')),9000);function finish(e,d){if(done)return;done=true;clearTimeout(timer);delete window[cb];s.remove();e?reject(e):resolve(d||{results:[]});}window[cb]=d=>finish(null,d);s.onerror=()=>finish(new Error('Apple-Hörprobe nicht erreichbar'));s.src=`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=DE&media=music&entity=song&limit=8&explicit=Yes&callback=${encodeURIComponent(cb)}`;document.head.appendChild(s);});}
  function scoreAppleResult(r,t){return tokenScore(t.title,r.trackName||'')*.62+tokenScore(t.artist,r.artistName||'')*.38;}

  const SPOTIFY_CLIENT_KEY='beatbridge_spotify_client_v15';
  const SPOTIFY_TOKEN_KEY='beatbridge_spotify_token_v15';
  const SPOTIFY_MATCH_KEY='beatbridge_spotify_matches_v15';
  const PRIORITY_KEY='beatbridge_preview_priority_v16';
  function spotifyClientId(){return normalize(localStorage.getItem(SPOTIFY_CLIENT_KEY)||'');}
  function spotifyRedirectUri(){const u=new URL(location.href);u.search='';u.hash='';return u.href;}
  function readSpotifyToken(){try{return JSON.parse(localStorage.getItem(SPOTIFY_TOKEN_KEY)||'null')}catch{return null}}
  function saveSpotifyToken(data,previous=null){const token={access_token:data.access_token,refresh_token:data.refresh_token||previous?.refresh_token||'',expires_at:Date.now()+Math.max(30,Number(data.expires_in||3600))*1000};localStorage.setItem(SPOTIFY_TOKEN_KEY,JSON.stringify(token));return token;}
  function spotifyMatches(){try{return JSON.parse(localStorage.getItem(SPOTIFY_MATCH_KEY)||'{}')}catch{return{}}}
  function spotifySig(track){return `${cleanForMatch(track.artist)}|${cleanForMatch(track.title)}`;}
  function cacheSpotifyMatch(track,match){const all=spotifyMatches();all[spotifySig(track)]={ts:Date.now(),match};const keys=Object.keys(all);if(keys.length>180)keys.sort((a,b)=>(all[b].ts||0)-(all[a].ts||0)).slice(180).forEach(k=>delete all[k]);localStorage.setItem(SPOTIFY_MATCH_KEY,JSON.stringify(all));}
  function cachedSpotifyMatch(track){const x=spotifyMatches()[spotifySig(track)];return x&&Date.now()-(x.ts||0)<30*24*60*60*1000?x.match:null;}
  function randomString(len=64){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';const a=new Uint8Array(len);crypto.getRandomValues(a);return Array.from(a,x=>chars[x%chars.length]).join('');}
  function base64Url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  async function sha256(text){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));}
  function updateSpotifyStatus(){
    const cid=spotifyClientId(),tok=readSpotifyToken();els.spotifyClientId.value=cid;els.spotifyRedirect.textContent=spotifyRedirectUri();
    if(!cid){els.spotifyStatus.textContent='Nicht eingerichtet';els.spotifyConnect.textContent='Verbinden';return;}
    if(tok?.access_token||tok?.refresh_token){els.spotifyStatus.textContent='Verbunden';els.spotifyConnect.textContent='Neu verbinden';}
    else{els.spotifyStatus.textContent='Client ID gespeichert – noch nicht verbunden';els.spotifyConnect.textContent='Verbinden';}
  }
  async function startSpotifyAuth(){
    const cid=normalize(els.spotifyClientId.value)||spotifyClientId();if(!cid)return toast('Zuerst Spotify Client ID eintragen');
    localStorage.setItem(SPOTIFY_CLIENT_KEY,cid);const verifier=randomString(72),challenge=base64Url(await sha256(verifier)),st=randomString(24);
    sessionStorage.setItem('bb_spotify_verifier',verifier);sessionStorage.setItem('bb_spotify_state',st);
    const p=new URLSearchParams({client_id:cid,response_type:'code',redirect_uri:spotifyRedirectUri(),code_challenge_method:'S256',code_challenge:challenge,state:st});
    location.href=`https://accounts.spotify.com/authorize?${p.toString()}`;
  }
  async function exchangeSpotifyCode(code){
    const cid=spotifyClientId(),verifier=sessionStorage.getItem('bb_spotify_verifier')||'';if(!cid||!verifier)throw new Error('Spotify-Anmeldung abgelaufen');
    const body=new URLSearchParams({client_id:cid,grant_type:'authorization_code',code,redirect_uri:spotifyRedirectUri(),code_verifier:verifier});
    const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
    if(!r.ok)throw new Error(`Spotify Token HTTP ${r.status}`);saveSpotifyToken(await r.json());sessionStorage.removeItem('bb_spotify_verifier');sessionStorage.removeItem('bb_spotify_state');
  }
  async function refreshSpotifyToken(){
    const old=readSpotifyToken(),cid=spotifyClientId();if(!old?.refresh_token||!cid)return null;
    const body=new URLSearchParams({client_id:cid,grant_type:'refresh_token',refresh_token:old.refresh_token});
    const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
    if(!r.ok){localStorage.removeItem(SPOTIFY_TOKEN_KEY);updateSpotifyStatus();return null;}return saveSpotifyToken(await r.json(),old);
  }
  async function spotifyAccessToken(){const tok=readSpotifyToken();if(!tok)return null;if(tok.access_token&&tok.expires_at>Date.now()+60000)return tok.access_token;return (await refreshSpotifyToken())?.access_token||null;}
  async function spotifyApi(url,retry=true){const token=await spotifyAccessToken();if(!token)return null;const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});if(r.status===401&&retry){const fresh=await refreshSpotifyToken();if(fresh)return spotifyApi(url,false);}if(!r.ok)throw new Error(`Spotify API HTTP ${r.status}`);return r.json();}
  async function handleSpotifyCallback(){
    const p=new URLSearchParams(location.search),code=p.get('code'),err=p.get('error');if(!code&&!err){updateSpotifyStatus();return;}
    if(err){toast(`Spotify: ${err}`);history.replaceState({},'',spotifyRedirectUri());updateSpotifyStatus();return;}
    const expected=sessionStorage.getItem('bb_spotify_state'),got=p.get('state');
    try{if(expected&&got!==expected)throw new Error('Ungültiger Spotify-Status');await exchangeSpotifyCode(code);toast('Spotify verbunden');}
    catch(e){toast(e.message||'Spotify-Verbindung fehlgeschlagen');}
    history.replaceState({},'',spotifyRedirectUri());updateSpotifyStatus();
  }
  function scoreSpotifyResult(r,t){const artists=(r.artists||[]).map(a=>a.name).join(', ');return tokenScore(t.title,r.name||'')*.62+tokenScore(t.artist,artists)*.38;}
  async function findSpotifyTrack(track){
    const cached=cachedSpotifyMatch(track);if(cached)return cached;
    if(!spotifyClientId())return null;const token=await spotifyAccessToken();if(!token)return null;
    const q=`track:${track.title} artist:${track.artist||''}`;const url=`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&market=DE&limit=5`;
    const data=await spotifyApi(url);const items=data?.tracks?.items||[];if(!items.length){cacheSpotifyMatch(track,null);return null;}
    const best=items.sort((a,b)=>scoreSpotifyResult(b,track)-scoreSpotifyResult(a,track))[0],score=scoreSpotifyResult(best,track);
    if(score<.42){cacheSpotifyMatch(track,null);return null;}
    const match={id:best.id,uri:best.uri,url:best.external_urls?.spotify||`https://open.spotify.com/track/${best.id}`,name:best.name,artist:(best.artists||[]).map(a=>a.name).join(', '),artwork:best.album?.images?.[0]?.url||'',score};cacheSpotifyMatch(track,match);return match;
  }

  function setAudioPlayerVisible(){els.spotifyEmbedWrap.classList.add('hidden');els.audioMiniWrap.classList.remove('hidden');els.spotifyHost.innerHTML='';}
  function setSpotifyPlayerVisible(){els.audio.pause();els.audio.removeAttribute('src');els.audio.load();els.audioMiniWrap.classList.add('hidden');els.spotifyEmbedWrap.classList.remove('hidden');}
  function stopInlinePreview(){els.audio.pause();if(activePreviewProvider==='spotify')els.spotifyHost.innerHTML='';syncPlay();}
  async function playAudioPreview(track,preview,source){
    activePreviewProvider=source;currentPreviewTrack=track;setAudioPlayerVisible();els.audio.pause();els.audio.src=preview.url;els.audio.load();
    els.miniArt.src=preview.artwork||'';els.miniTitle.textContent=preview.name||track.title;els.miniArtist.textContent=preview.artist||track.artist;els.miniMatch.textContent=`Quelle: ${source==='beatport'?'Beatport':'Apple/iTunes'}${preview.matchText?` · ${preview.matchText}`:''}`;els.mini.classList.remove('hidden');els.miniSeek.value='0';els.miniTime.textContent='0:00';renderTrackList();
    try{await els.audio.play();}catch{toast('Zum Starten ▶ antippen');}syncPlay();
  }
  function playSpotifyPreview(track,match){
    activePreviewProvider='spotify';currentPreviewTrack=track;setSpotifyPlayerVisible();
    const src=`https://open.spotify.com/embed/track/${encodeURIComponent(match.id)}?utm_source=beatbridge&theme=0`;
    els.spotifyHost.innerHTML=`<iframe title="Spotify Embed: ${esc(match.name||track.title)}" src="${src}" width="100%" height="152" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="eager"></iframe>`;
    els.mini.classList.remove('hidden');remember({...track,spotifyId:match.id});renderTrackList();toast('Spotify-Treffer geladen – ▶ im Player antippen');
  }
  async function findApplePreview(track){
    const data=await itunesSearch(`${track.artist} ${track.title}`),results=(data.results||[]).filter(r=>r.previewUrl).sort((a,b)=>scoreAppleResult(b,track)-scoreAppleResult(a,track));if(!results.length)return null;
    const r=results[0],s=scoreAppleResult(r,track);return {url:r.previewUrl,artwork:(r.artworkUrl100||'').replace('100x100bb','300x300bb'),name:r.trackName||track.title,artist:r.artistName||track.artist,matchText:s>.78?'sehr guter Treffer':s>.58?'wahrscheinlicher Treffer':'möglicher Treffer'};
  }
  function previewPriority(){const raw=els.previewPriority?.value||localStorage.getItem(PRIORITY_KEY)||'beatport,spotify';return raw.split(',').filter(x=>['beatport','spotify','apple'].includes(x));}
  async function previewTrack(track,btn=null){
    if(!track?.title)return;if(btn)btn.classList.add('loading');remember(track);const request=++previewRequestId;
    try{
      for(const provider of previewPriority()){
        if(request!==previewRequestId)return;
        if(provider==='beatport'){
          const url=track.previewUrl||track.preview_url||track.preview||'';
          if(/^https?:\/\//i.test(url)){await playAudioPreview(track,{url,artwork:track.artwork||'',name:track.title,artist:track.artist},'beatport');return;}
        }
        if(provider==='spotify'){
          try{const match=await findSpotifyTrack(track);if(request!==previewRequestId)return;if(match){playSpotifyPreview(track,match);return;}}catch(e){console.warn('Spotify fallback:',e);}
        }
        if(provider==='apple'){
          const preview=await findApplePreview(track);if(request!==previewRequestId)return;if(preview){await playAudioPreview(track,preview,'apple');return;}
        }
      }
      toast('Keine Hörprobe gefunden');
    }catch(e){toast(e.message||'Keine Hörprobe gefunden');}finally{if(btn)btn.classList.remove('loading');}
  }
  function syncPlay(){const playing=!els.audio.paused&&!els.audio.ended;els.miniPlay.textContent=playing?'Ⅱ':'▶';els.miniPlay.setAttribute('aria-label',playing?'Pausieren':'Abspielen');}

  function queryFor(track,service){let q=normalize(`${track.artist||''} ${track.title||''}`);if(els.extended.checked&&['soundcloud','youtube','ytmusic'].includes(service)&&!/(mix|remix|edit|version|bootleg)/i.test(q))q+=' extended mix';return q;}
  function openUrl(url){const w=window.open(url,'_blank','noopener,noreferrer');if(!w)location.href=url;}
  async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return true;}}
  const IS_ANDROID=/Android/i.test(navigator.userAgent);
  function androidIntent(webUrl,packageName){
    const u=new URL(webUrl);
    const target=`${u.host}${u.pathname}${u.search}${u.hash}`;
    return `intent://${target}#Intent;scheme=${u.protocol.replace(':','')};package=${packageName};S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
  }
  function openPreferredApp(webUrl,packageName,label){
    if(!IS_ANDROID){openUrl(webUrl);return;}
    stopInlinePreview();
    toast(`${label} wird geöffnet`);
    // Direct navigation is intentional: Chrome only permits external app intents
    // reliably when they originate from the user's tap, not from a later timer.
    location.href=androidIntent(webUrl,packageName);
  }
  function openSimpMusic(q){
    // SimpMusic currently has no documented free-text search deep link. Copy the
    // exact query and launch the installed app directly instead of its website.
    void copyText(q);
    if(!IS_ANDROID){location.href='simpmusic://';return;}
    stopInlinePreview();
    toast('Suche kopiert – SimpMusic wird geöffnet');
    const fallback='https://simpmusic.org/';
    location.href=`intent://#Intent;scheme=simpmusic;package=com.maxrave.simpmusic;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
  }
  function openService(service,track){
    const q=queryFor(track,service);if(!q)return;remember(track);const e=encodeURIComponent(q);
    if(service==='soundcloud')openPreferredApp(`https://soundcloud.com/search?q=${e}`,'com.soundcloud.android','SoundCloud');
    else if(service==='spotify')openPreferredApp(`https://open.spotify.com/search/${e}`,'com.spotify.music','Spotify');
    else if(service==='youtube')openPreferredApp(`https://www.youtube.com/results?search_query=${e}`,'com.google.android.youtube','YouTube');
    else if(service==='ytmusic')openPreferredApp(`https://music.youtube.com/search?q=${e}`,'com.google.android.apps.youtube.music','YouTube Music');
    else if(service==='google')openUrl(`https://www.google.com/search?q=${e}`);
    else if(service==='simpmusic')openSimpMusic(q);
    closeSheet();
  }
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

  async function init(){
    restoreSelection();renderGenres();renderServices(els.sheetServices,false);renderServices(els.manualServices,true);
    document.querySelectorAll('.view-tab').forEach(x=>x.classList.toggle('active',x.dataset.view===state.view));
    const savedPriority=localStorage.getItem(PRIORITY_KEY)||'beatport,spotify';if([...els.previewPriority.options].some(o=>o.value===savedPriority))els.previewPriority.value=savedPriority;
    updateSpotifyStatus();await handleSpotifyCallback();loadShareTarget();void refreshSelectedThenAll();
  }
  void init();

  els.chips.addEventListener('click',e=>{const b=e.target.closest('[data-slug]');if(!b)return;state.genre=GENRES.find(g=>g.slug===b.dataset.slug)||GENRES[0];renderGenres();if(state.view==='history'){state.view='top';document.querySelectorAll('.view-tab').forEach(x=>x.classList.toggle('active',x.dataset.view==='top'));}saveSelection();loadChart();});
  els.tabs.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;state.view=b.dataset.view;document.querySelectorAll('.view-tab').forEach(x=>x.classList.toggle('active',x===b));saveSelection();loadChart();});
  els.filter.addEventListener('input',renderTrackList);els.clearSearch.addEventListener('click',()=>{els.filter.value='';renderTrackList();els.filter.focus();});
  els.retry.addEventListener('click',()=>loadChart(true));els.refresh.addEventListener('click',()=>void refreshSelectedThenAll());
  els.list.addEventListener('click',e=>{const row=e.target.closest('.track-row');if(!row)return;const track=state.tracks[Number(row.dataset.index)];const action=e.target.closest('[data-action]')?.dataset.action;if(action==='play')previewTrack(track,e.target.closest('button'));if(action==='more')openSheet(track);});
  [els.backdrop,els.sheetClose].forEach(x=>x.addEventListener('click',closeSheet));
  els.sheetServices.addEventListener('click',e=>{const b=e.target.closest('[data-service]');if(b&&state.selected)openService(b.dataset.service,state.selected);});
  els.manualServices.addEventListener('click',e=>{const b=e.target.closest('[data-service]');if(!b)return;const t={artist:normalize(els.artist.value),title:normalize(els.title.value)};if(!t.title&&!t.artist)return toast('Artist oder Titel eingeben');openService(b.dataset.service,t);});
  els.manualPreview.addEventListener('click',()=>{const t={artist:normalize(els.artist.value),title:normalize(els.title.value)};if(!t.title&&!t.artist)return toast('Artist oder Titel eingeben');previewTrack(t)});
  els.miniPlay.addEventListener('click',async()=>{if(!els.audio.src)return;if(els.audio.paused){try{await els.audio.play()}catch{}}else els.audio.pause();syncPlay();});
  els.audio.addEventListener('play',syncPlay);els.audio.addEventListener('pause',syncPlay);els.audio.addEventListener('ended',syncPlay);els.audio.addEventListener('loadedmetadata',()=>{els.miniSeek.max=Number.isFinite(els.audio.duration)?els.audio.duration:30;});els.audio.addEventListener('timeupdate',()=>{if(!els.miniSeek.matches(':active'))els.miniSeek.value=els.audio.currentTime||0;els.miniTime.textContent=formatTime(els.audio.currentTime||0);});els.miniSeek.addEventListener('input',()=>{if(Number.isFinite(els.audio.duration))els.audio.currentTime=Number(els.miniSeek.value)});
  els.previewPriority.addEventListener('change',()=>{localStorage.setItem(PRIORITY_KEY,els.previewPriority.value);toast('Hörproben-Reihenfolge gespeichert');});
  els.saveSpotify.addEventListener('click',()=>{const id=normalize(els.spotifyClientId.value);if(!id)return toast('Spotify Client ID eintragen');localStorage.setItem(SPOTIFY_CLIENT_KEY,id);localStorage.removeItem(SPOTIFY_TOKEN_KEY);updateSpotifyStatus();toast('Client ID gespeichert');});
  els.spotifyConnect.addEventListener('click',()=>void startSpotifyAuth());
  els.copyRedirect.addEventListener('click',async()=>{await copyText(spotifyRedirectUri());toast('Redirect URI kopiert');});
  els.spotifyClose.addEventListener('click',()=>{els.spotifyHost.innerHTML='';activePreviewProvider=null;currentPreviewTrack=null;els.mini.classList.add('hidden');renderTrackList();});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;els.install.classList.remove('hidden')});els.install.addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;els.install.classList.add('hidden')});
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
