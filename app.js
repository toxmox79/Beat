(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    artist: $('artistInput'), title: $('titleInput'), url: $('urlInput'), preview: $('queryPreview'),
    install: $('installBtn'), toast: $('toast'), extended: $('extendedToggle'),
    historySection: $('historySection'), historyList: $('historyList'),
    previewEmpty: $('previewEmpty'), previewLoading: $('previewLoading'), previewPlayer: $('previewPlayer'),
    previewError: $('previewError'), previewAudio: $('previewAudio'), previewPlay: $('previewPlayBtn'),
    previewSeek: $('previewSeek'), previewCurrent: $('previewCurrent'), previewDuration: $('previewDuration'),
    previewArtwork: $('previewArtwork'), previewTitle: $('previewTitle'), previewArtist: $('previewArtist'),
    previewMatch: $('previewMatch'), previewStoreLink: $('previewStoreLink'), previewResultNav: $('previewResultNav'),
    resultCounter: $('resultCounter'), prevResult: $('prevResultBtn'), nextResult: $('nextResultBtn'), findPreview: $('findPreviewBtn'),
    miniPlayer: $('miniPlayer'), miniArtwork: $('miniArtwork'), miniTitle: $('miniTitle'), miniArtist: $('miniArtist'),
    miniCurrent: $('miniCurrent'), miniDuration: $('miniDuration'), miniPlay: $('miniPlayBtn'), miniSeek: $('miniSeek'),
    miniExpand: $('miniExpandBtn')
  };

  let deferredInstallPrompt = null;
  const HISTORY_KEY = 'beatbridge-history-v1';
  let previewResults = [];
  let previewIndex = 0;
  let previewRequestId = 0;
  let currentPreview = null;

  function normalize(s = '') { return String(s).replace(/\s+/g, ' ').trim(); }

  function query() {
    return normalize([els.artist.value, els.title.value].filter(Boolean).join(' - '));
  }

  function serviceQuery(service) {
    let q = query();
    if (!q) return '';
    if (els.extended.checked && ['soundcloud', 'youtube', 'ytmusic'].includes(service) && !/(mix|remix|edit|version|bootleg|rework)/i.test(q)) {
      q += ' extended mix';
    }
    return q;
  }

  function updatePreview() {
    const q = query();
    els.preview.textContent = q ? `Suche: ${q}` : 'Noch kein Track ausgewählt.';
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), 2300);
  }

  function parseSharedText(raw = '') {
    let text = String(raw).replace(/\+/g, ' ');
    try { text = decodeURIComponent(text); } catch {}
    text = normalize(text);
    if (!text) return {};
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    const url = urlMatch ? urlMatch[0] : '';
    let s = normalize(text.replace(url || '', ''));
    s = s.replace(/\s*[|–-]\s*Beatport.*$/i, '').replace(/\bon Beatport\b.*$/i, '').trim();

    let m = s.match(/^(.+?)\s+by\s+(.+?)$/i);
    if (m) return { title: normalize(m[1]), artist: normalize(m[2]), url };

    m = s.match(/^(.+?)\s+[–—-]\s+(.+)$/);
    if (m) return { artist: normalize(m[1]), title: normalize(m[2]), url };

    return { title: s, url };
  }

  function titleFromBeatportUrl(url = '') {
    try {
      const u = new URL(url);
      if (!/beatport\.com$/i.test(u.hostname) && !/\.beatport\.com$/i.test(u.hostname)) return '';
      const m = u.pathname.match(/\/track\/([^/]+)/i);
      if (!m) return '';
      return m[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    } catch { return ''; }
  }

  function applyData(data, overwrite = true) {
    if (!data) return;
    if (data.artist && (overwrite || !els.artist.value)) els.artist.value = data.artist;
    if (data.title && (overwrite || !els.title.value)) els.title.value = data.title;
    if (data.url && (overwrite || !els.url.value)) els.url.value = data.url;
    if (!els.title.value && els.url.value) els.title.value = titleFromBeatportUrl(els.url.value);
    updatePreview();
  }

  function loadShareTarget() {
    const p = new URLSearchParams(location.search);
    const sharedTitle = p.get('title') || '';
    const sharedText = p.get('text') || '';
    const sharedUrl = p.get('url') || '';
    if (!(sharedTitle || sharedText || sharedUrl)) return;

    const a = parseSharedText(sharedTitle);
    const b = parseSharedText(sharedText);
    const merged = {
      artist: a.artist || b.artist || '',
      title: a.title || b.title || '',
      url: sharedUrl || b.url || a.url || ''
    };
    applyData(merged, true);
    if (merged.title || merged.url) toast('Von „Teilen“ übernommen');
    history.replaceState({}, '', location.pathname);
  }

  function openUrl(url) {
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) location.href = url;
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }

  async function openService(service) {
    const q = serviceQuery(service);
    if (!q) { toast('Bitte Artist oder Titel eingeben'); els.artist.focus(); return; }
    rememberCurrent();
    const e = encodeURIComponent(q);

    switch (service) {
      case 'soundcloud': openUrl(`https://soundcloud.com/search?q=${e}`); break;
      case 'spotify': openUrl(`https://open.spotify.com/search/${e}`); break;
      case 'youtube': openUrl(`https://www.youtube.com/results?search_query=${e}`); break;
      case 'ytmusic': openUrl(`https://music.youtube.com/search?q=${e}`); break;
      case 'google': openUrl(`https://www.google.com/search?q=${e}`); break;
      case 'simpmusic': {
        await copyText(q);
        toast('Suche kopiert – in SimpMusic einfügen');
        setTimeout(() => { location.href = 'simpmusic://'; }, 120);
        setTimeout(() => {
          if (document.visibilityState === 'visible') openUrl('https://simpmusic.org/');
        }, 1000);
        break;
      }
    }
  }

  function cleanForMatch(s = '') {
    return normalize(s)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(original|extended|radio|club|mix|remix|edit|version|rework|bootleg)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function tokenScore(a = '', b = '') {
    const aa = new Set(cleanForMatch(a).split(' ').filter(Boolean));
    const bb = new Set(cleanForMatch(b).split(' ').filter(Boolean));
    if (!aa.size || !bb.size) return 0;
    let hit = 0;
    aa.forEach(x => { if (bb.has(x)) hit++; });
    return (2 * hit) / (aa.size + bb.size);
  }

  function resultScore(r) {
    const artist = normalize(els.artist.value);
    const title = normalize(els.title.value);
    const artistScore = artist ? tokenScore(artist, r.artistName || '') : .45;
    const titleScore = title ? tokenScore(title, r.trackName || '') : .45;
    let bonus = 0;
    const wanted = `${artist} ${title}`.toLowerCase();
    const got = `${r.artistName || ''} ${r.trackName || ''}`.toLowerCase();
    if (/original mix/i.test(wanted) && /original mix/i.test(got)) bonus += .08;
    if (/extended mix/i.test(wanted) && /extended mix/i.test(got)) bonus += .08;
    if (/remix/i.test(wanted) && /remix/i.test(got)) bonus += .06;
    return Math.min(1, artistScore * .42 + titleScore * .58 + bonus);
  }

  function itunesSearch(term) {
    return new Promise((resolve, reject) => {
      const id = ++previewRequestId;
      const cb = `__beatbridgeItunes_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const timeout = setTimeout(() => finish(new Error('Zeitüberschreitung bei der Hörprobensuche')), 9000);
      let done = false;

      function cleanup() {
        clearTimeout(timeout);
        delete window[cb];
        script.remove();
      }
      function finish(err, data) {
        if (done) return;
        done = true;
        cleanup();
        if (id !== previewRequestId) return resolve({ results: [] });
        err ? reject(err) : resolve(data || { results: [] });
      }

      window[cb] = data => finish(null, data);
      script.onerror = () => finish(new Error('Hörprobensuche konnte nicht geladen werden'));
      script.src = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=DE&media=music&entity=song&limit=8&explicit=Yes&callback=${encodeURIComponent(cb)}`;
      document.head.appendChild(script);
    });
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function setPreviewState(state, message = '') {
    els.previewEmpty.classList.toggle('hidden', state !== 'empty');
    els.previewLoading.classList.toggle('hidden', state !== 'loading');
    els.previewPlayer.classList.toggle('hidden', state !== 'player');
    els.previewError.classList.toggle('hidden', state !== 'error');
    if (state === 'error') els.previewError.textContent = message;
  }

  function showMiniPlayer(show = true) {
    els.miniPlayer.classList.toggle('hidden', !show);
    document.body.classList.toggle('has-mini', show);
  }

  function syncTrackMeta(r) {
    const art = (r.artworkUrl100 || '').replace('100x100bb', '300x300bb');
    const title = r.trackName || 'Unbekannter Titel';
    const artist = r.artistName || 'Unbekannter Artist';

    els.previewTitle.textContent = title;
    els.previewArtist.textContent = artist;
    els.previewArtwork.src = art;
    els.previewArtwork.alt = `Cover von ${title}`;

    els.miniTitle.textContent = title;
    els.miniArtist.textContent = artist;
    els.miniArtwork.src = art;
    els.miniArtwork.alt = `Cover von ${title}`;
  }

  function syncPlaybackUI() {
    const playing = !els.previewAudio.paused && !els.previewAudio.ended;
    const glyph = playing ? 'Ⅱ' : '▶';
    const label = playing ? 'Hörprobe pausieren' : 'Hörprobe abspielen';

    [els.previewPlay, els.miniPlay].forEach(btn => {
      btn.textContent = glyph;
      btn.classList.toggle('playing', playing);
      btn.setAttribute('aria-label', label);
    });
  }

  function stopPreview(reset = true, hideMini = false) {
    els.previewAudio.pause();
    if (reset) {
      try { els.previewAudio.currentTime = 0; } catch {}
      els.previewSeek.value = '0';
      els.miniSeek.value = '0';
      els.previewCurrent.textContent = '0:00';
      els.miniCurrent.textContent = '0:00';
    }
    syncPlaybackUI();
    if (hideMini) {
      currentPreview = null;
      showMiniPlayer(false);
    }
  }

  async function playAudio() {
    if (!els.previewAudio.src) return false;
    if (els.previewAudio.ended) {
      try { els.previewAudio.currentTime = 0; } catch {}
    }
    try {
      await els.previewAudio.play();
      syncPlaybackUI();
      return true;
    } catch {
      syncPlaybackUI();
      toast('Zum Starten bitte ▶ im Player antippen');
      return false;
    }
  }

  async function renderPreviewResult(index, autoPlay = false) {
    if (!previewResults.length) return;
    previewIndex = Math.max(0, Math.min(index, previewResults.length - 1));
    const r = previewResults[previewIndex];
    currentPreview = r;

    els.previewAudio.pause();
    els.previewAudio.src = r.previewUrl || '';
    els.previewAudio.load();
    syncTrackMeta(r);

    const score = resultScore(r);
    els.previewMatch.textContent = score >= .82 ? 'Sehr guter Treffer' : score >= .62 ? 'Wahrscheinlicher Treffer' : 'Möglicher Treffer';
    els.previewStoreLink.href = r.trackViewUrl || '#';
    els.resultCounter.textContent = `${previewIndex + 1}/${previewResults.length}`;
    els.previewResultNav.classList.toggle('hidden', previewResults.length <= 1);
    els.prevResult.disabled = previewIndex <= 0;
    els.nextResult.disabled = previewIndex >= previewResults.length - 1;

    els.previewSeek.value = '0';
    els.miniSeek.value = '0';
    els.previewSeek.max = '30';
    els.miniSeek.max = '30';
    els.previewCurrent.textContent = '0:00';
    els.miniCurrent.textContent = '0:00';
    els.previewDuration.textContent = '0:30';
    els.miniDuration.textContent = '0:30';

    setPreviewState('player');
    showMiniPlayer(true);
    syncPlaybackUI();
    rememberCurrent(r);

    if (autoPlay) await playAudio();
  }

  async function findPreview(autoPlay = false) {
    const q = query();
    if (!q) { toast('Bitte Artist oder Titel eingeben'); els.artist.focus(); return; }

    // The old preview may keep playing while the user prepares another track.
    // It is only switched when a valid new result has actually been found.
    previewResults = [];
    els.findPreview.disabled = true;
    setPreviewState('loading');
    try {
      const data = await itunesSearch(q);
      const results = (data.results || []).filter(r => r.kind === 'song' && r.previewUrl);
      results.sort((a, b) => resultScore(b) - resultScore(a));
      previewResults = results.slice(0, 5);
      if (!previewResults.length) {
        setPreviewState('error', 'Keine passende Hörprobe gefunden. Der laufende Mini-Player bleibt unverändert.');
        return;
      }
      await renderPreviewResult(0, autoPlay);
    } catch (err) {
      setPreviewState('error', err && err.message ? err.message : 'Hörprobe konnte nicht geladen werden.');
    } finally {
      els.findPreview.disabled = false;
    }
  }

  async function togglePreviewPlayback() {
    if (!els.previewAudio.src) return;
    if (els.previewAudio.paused || els.previewAudio.ended) await playAudio();
    else els.previewAudio.pause();
  }

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  }

  function previewSnapshot(r) {
    if (!r || !r.previewUrl) return null;
    return {
      previewUrl: r.previewUrl,
      trackName: r.trackName || '',
      artistName: r.artistName || '',
      artworkUrl100: r.artworkUrl100 || '',
      trackViewUrl: r.trackViewUrl || '',
      kind: 'song'
    };
  }

  function rememberCurrent(preview = null) {
    const item = {
      artist: normalize(els.artist.value),
      title: normalize(els.title.value),
      url: normalize(els.url.value),
      t: Date.now()
    };
    if (!item.artist && !item.title) return;

    const key = `${item.artist}|${item.title}`.toLowerCase();
    const hist = getHistory();
    const old = hist.find(x => `${x.artist}|${x.title}`.toLowerCase() === key);
    item.preview = previewSnapshot(preview) || (old && old.preview) || null;

    const next = hist.filter(x => `${x.artist}|${x.title}`.toLowerCase() !== key);
    next.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, 10)));
    renderHistory();
  }

  async function playHistoryItem(item) {
    applyData(item, true);
    if (item.preview && item.preview.previewUrl) {
      previewResults = [item.preview];
      await renderPreviewResult(0, true);
      return;
    }
    await findPreview(true);
  }

  function renderHistory() {
    const hist = getHistory();
    els.historySection.classList.toggle('hidden', !hist.length);
    els.historyList.innerHTML = '';

    hist.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';

      const select = document.createElement('button');
      select.type = 'button';
      select.className = 'history-select';

      const text = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = item.title || 'Ohne Titel';
      const small = document.createElement('small');
      small.textContent = item.artist || 'Unbekannter Artist';
      text.append(strong, small);

      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '›';
      select.append(text, arrow);
      select.addEventListener('click', () => {
        applyData(item, true);
        document.querySelector('.editor-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'history-play';
      play.textContent = '▶';
      play.setAttribute('aria-label', `${item.artist || ''} ${item.title || ''} anhören`.trim());
      play.title = item.preview ? 'Sofort anhören' : 'Hörprobe suchen und abspielen';
      play.addEventListener('click', () => playHistoryItem(item));

      row.append(select, play);
      els.historyList.appendChild(row);
    });
  }

  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return toast('Zwischenablage ist leer');
      applyData(parseSharedText(text), true);
      toast('Zwischenablage übernommen');
    } catch {
      toast('Browser erlaubt das Lesen der Zwischenablage nicht');
    }
  }

  function seekTo(value) {
    if (!Number.isFinite(els.previewAudio.duration)) return;
    els.previewAudio.currentTime = Math.min(Number(value), els.previewAudio.duration || 30);
  }

  ['artist', 'title', 'url'].forEach(k => els[k].addEventListener('input', updatePreview));
  document.querySelectorAll('[data-service]').forEach(btn => btn.addEventListener('click', () => openService(btn.dataset.service)));

  els.findPreview.addEventListener('click', () => findPreview(false));
  els.previewPlay.addEventListener('click', togglePreviewPlayback);
  els.miniPlay.addEventListener('click', togglePreviewPlayback);

  els.prevResult.addEventListener('click', () => renderPreviewResult(previewIndex - 1, !els.previewAudio.paused));
  els.nextResult.addEventListener('click', () => renderPreviewResult(previewIndex + 1, !els.previewAudio.paused));

  els.previewSeek.addEventListener('input', () => seekTo(els.previewSeek.value));
  els.miniSeek.addEventListener('input', () => seekTo(els.miniSeek.value));

  els.miniExpand.addEventListener('click', () => {
    document.querySelector('.preview-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  els.previewAudio.addEventListener('loadedmetadata', () => {
    const d = Number.isFinite(els.previewAudio.duration) ? els.previewAudio.duration : 30;
    els.previewSeek.max = String(d);
    els.miniSeek.max = String(d);
    els.previewDuration.textContent = formatTime(d);
    els.miniDuration.textContent = formatTime(d);
  });

  els.previewAudio.addEventListener('timeupdate', () => {
    const t = els.previewAudio.currentTime || 0;
    els.previewSeek.value = String(t);
    els.miniSeek.value = String(t);
    els.previewCurrent.textContent = formatTime(t);
    els.miniCurrent.textContent = formatTime(t);
  });

  els.previewAudio.addEventListener('play', syncPlaybackUI);
  els.previewAudio.addEventListener('pause', syncPlaybackUI);
  els.previewAudio.addEventListener('ended', () => {
    try { els.previewAudio.currentTime = 0; } catch {}
    els.previewSeek.value = '0';
    els.miniSeek.value = '0';
    els.previewCurrent.textContent = '0:00';
    els.miniCurrent.textContent = '0:00';
    syncPlaybackUI();
  });

  $('openBeatportBtn').addEventListener('click', () => openUrl('https://www.beatport.com/'));
  $('pasteBtn').addEventListener('click', pasteClipboard);
  $('clearBtn').addEventListener('click', () => {
    els.artist.value = ''; els.title.value = ''; els.url.value = '';
    previewResults = [];
    stopPreview(true, true);
    els.previewAudio.removeAttribute('src');
    els.previewAudio.load();
    setPreviewState('empty');
    updatePreview();
    els.artist.focus();
  });
  $('clearHistoryBtn').addEventListener('click', () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    toast('Verlauf gelöscht');
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredInstallPrompt = e; els.install.classList.remove('hidden');
  });
  els.install.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.install.classList.add('hidden');
  });
  window.addEventListener('appinstalled', () => toast('BeatBridge wurde installiert'));

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
  }

  setPreviewState('empty');
  showMiniPlayer(false);
  renderHistory();
  updatePreview();
  loadShareTarget();

  if (new URLSearchParams(location.search).get('open') === 'beatport') {
    history.replaceState({}, '', location.pathname);
    setTimeout(() => openUrl('https://www.beatport.com/'), 80);
  }
})();
