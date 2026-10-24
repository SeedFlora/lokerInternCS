'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);
  const state = { profiles: [], byId: new Map(), jobsMap: {}, query: '', tier: '', difficulty: '', expanded: false, error: false };
  let dialogTrigger;
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function url(value) {
    try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; }
    catch { return null; }
  }
  function link(value, text, cls) {
    const href = url(value);
    if (!href) return null;
    const a = el('a', cls, text);
    a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function profileFor(job) { return state.byId.get(state.jobsMap[job.id]) || null; }
  function reviewDateText(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Tanggal belum tersedia';
    const date = new Date(`${value}T12:00:00+07:00`);
    if (Number.isNaN(date.getTime())) return 'Tanggal belum tersedia';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
  }
  function badge(text, kind) {
    const span = el('span', `advice-badge ${kind || ''}`, text);
    return span;
  }
  function badges(profile) {
    const row = el('div', 'advice-badges');
    const tier = profile.recommendationTier || 'Belum dinilai';
    const difficulty = profile.difficulty || 'Belum cukup data';
    const tierName = { S: 'T0', A: 'T1', B: 'T2' }[tier];
    row.append(badge(tierName ? `Tier ${tierName}` : 'Belum dinilai', `tier-${tier.toLowerCase().replaceAll(' ', '-')}`));
    row.append(badge(`Seleksi: ${difficulty}`, difficulty === 'Sulit' ? 'difficulty-hard' : difficulty === 'Mudah (relatif)' ? 'difficulty-easy' : 'difficulty-medium'));
    return row;
  }
  function logo(profile) {
    if (!profile) return null;
    const frame = el('span', 'company-logo authentic-logo');
    frame.setAttribute('aria-hidden', 'true');
    const initials = profile.label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase();
    const fallback = el('span', 'logo-fallback', profile.kind === 'unknown' ? '↗' : initials);
    frame.append(fallback);
    if (typeof profile.logo === 'string' && /^\.\/assets\/companies\/[a-z0-9._-]+$/i.test(profile.logo) && !/codex/i.test(profile.logo.split('/').pop())) {
      const image = el('img');
      image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
      image.src = profile.logo;
      image.addEventListener('load', () => { fallback.hidden = true; });
      image.addEventListener('error', () => { image.remove(); fallback.hidden = false; });
      frame.append(image);
    }
    return frame;
  }
  function sourceList(profile, heading = 'Sumber dan ulasan') {
    const block = el('section', 'guide-source-block');
    block.append(el('h3', '', heading));
    const list = el('ul', 'guide-sources');
    (profile.sources || []).forEach((source) => {
      const a = link(source.url, source.title || source.url);
      if (!a) return;
      const li = el('li');
      li.append(el('span', 'source-kind', source.kind || 'Sumber'));
      li.append(a);
      if (source.date) li.append(el('small', '', `Tanggal sumber: ${source.date}`));
      list.append(li);
    });
    if (!list.children.length) block.append(el('p', '', 'Belum ada sumber seleksi yang cukup untuk membuat klaim khusus perusahaan ini. Gunakan syarat pada lowongan sebagai acuan awal.'));
    else block.append(list);
    return block;
  }
  function advice(profile, inline = false) {
    const block = el('section', inline ? 'company-advice-inline' : 'company-advice');
    if (inline) block.append(el('h3', '', `Rekomendasi & tips — ${profile.label}`));
    block.append(badges(profile));
    const reasons = el('div', 'guide-reasons');
    const tierReason = el('div');
    tierReason.append(el('h3', '', 'Kenapa direkomendasikan'), el('p', '', profile.recommendationReason || 'Belum cukup bukti untuk menilai kecocokan peluang ini.'));
    const difficultyReason = el('div');
    difficultyReason.append(el('h3', '', 'Kenapa tingkat seleksinya demikian'), el('p', '', profile.difficultyReason || 'Tahapan dan tingkat kompetisi belum dapat dipastikan dari sumber yang tersedia.'));
    reasons.append(tierReason, difficultyReason); block.append(reasons);
    block.append(el('p', 'confidence-line', `Keyakinan penilaian: ${profile.confidence || 'Rendah'} · Ditinjau ${reviewDateText(profile.reviewCheckedAt)}`));
    const review = el('section', 'review-panel');
    review.append(el('h3', '', 'Cerita kandidat & peserta magang'), el('p', '', profile.reviewSummary || 'Belum ditemukan ulasan seleksi yang cukup spesifik untuk peran pada daftar ini.'));
    review.append(el('p', 'review-caveat', profile.reviewCaveat || 'Pengalaman individu dapat berbeda menurut posisi, lokasi, dan tahun. Penilaian kesulitan bukan peluang penerimaan yang terukur.'));
    block.append(review);
    if (profile.tips?.length) {
      const tips = el('section', 'company-tips'); tips.append(el('h3', '', 'Tips persiapan yang bisa kamu lakukan'));
      const list = el('ol');
      profile.tips.forEach((tip) => {
        const li = el('li'); li.append(el('h4', '', tip.title), el('p', '', tip.detail));
        li.append(el('span', 'tip-basis', tip.basis || 'Saran kurasi'));
        const relevant = (tip.sourceIds || []).map((id) => (profile.sources || []).find((s) => s.id === id)).filter(Boolean);
        if (relevant.length) {
          const refs = el('span', 'tip-refs');
          relevant.forEach((s, index) => { const a = link(s.url, `Sumber ${index + 1}`); if (a) refs.append(a); });
          li.append(refs);
        }
        list.append(li);
      });
      tips.append(list); block.append(tips);
    }
    block.append(sourceList(profile));
    block.append(el('p', 'guide-footnote', 'Tier menilai kecocokan peluang untuk mahasiswa CS. Ulasan dan penilaian ini bukan jaminan lolos atau pengganti informasi rekrutmen resmi.'));
    return block;
  }
  function openProfile(profile, trigger) {
    dialogTrigger = trigger;
    const content = $('#company-dialog-content'); content.replaceChildren();
    const top = el('div', 'company-profile-heading');
    top.append(logo(profile), el('p', '', profile.kind === 'employer' ? 'PANDUAN PERUSAHAAN' : 'PANDUAN SUMBER / PROGRAM'));
    const title = el('h2', 'dialog-title', profile.label); title.id = 'company-dialog-title';
    content.append(top, title, advice(profile));
    if (profile.website) { const a = link(profile.website, 'Kunjungi situs resmi ↗', 'secondary-link'); if (a) content.append(a); }
    $('#company-dialog').showModal(); document.body.style.overflow = 'hidden';
  }
  function cardAdvice(job) {
    const profile = profileFor(job);
    if (!profile || profile.kind !== 'employer') return null;
    const row = el('div', 'card-advice'); row.append(badges(profile));
    row.append(el('span', 'company-level-note', 'Perkiraan pada profil perusahaan'));
    const button = el('button', 'advice-link', 'Alasan, ulasan & tips ↗'); button.type = 'button';
    button.setAttribute('aria-label', `Alasan tier dan tips ${profile.label}`);
    button.addEventListener('click', () => openProfile(profile, button)); row.append(button);
    return row;
  }
  function matches(job, filters) {
    if (!filters.tier && !filters.difficulty) return true;
    const profile = profileFor(job);
    const tier = profile?.recommendationTier || 'Belum dinilai';
    const difficulty = profile?.difficulty || 'Belum cukup data';
    return (!filters.tier || filters.tier === tier) && (!filters.difficulty || filters.difficulty === difficulty);
  }
  function render() {
    const query = state.query.toLocaleLowerCase('id-ID').trim();
    const profiles = state.profiles.filter((p) => p.kind === 'employer').filter((p) => (!state.tier || state.tier === p.recommendationTier) && (!state.difficulty || state.difficulty === p.difficulty) && (!query || [p.label, ...(p.aliases || [])].join(' ').toLocaleLowerCase('id-ID').includes(query)));
    const order = { S: 0, A: 1, B: 2, 'Belum dinilai': 3 };
    profiles.sort((a, b) => (order[a.recommendationTier] ?? 3) - (order[b.recommendationTier] ?? 3) || a.label.localeCompare(b.label, 'id'));
    const grid = $('#company-grid'); grid.replaceChildren();
    const levels = ['Sulit', 'Sedang', 'Mudah (relatif)', 'Belum cukup data'];
    const header = el('div', 'tier-board-head'); header.setAttribute('role', 'row');
    ['TIER', ...levels].forEach((name) => { const cell = el('div', 'tier-column-heading', name); cell.setAttribute('role', 'columnheader'); header.append(cell); });
    grid.append(header);
    const tiers = [{ value: 'S', label: 'T0', caption: 'PRIORITAS TINGGI' }, { value: 'A', label: 'T1', caption: 'PILIHAN BAGUS' }, { value: 'B', label: 'T2', caption: 'SESUAI TUJUAN' }, { value: 'Belum dinilai', label: '?', caption: 'BELUM DINILAI' }];
    tiers.forEach((tier) => {
      const inTier = profiles.filter((p) => p.recommendationTier === tier.value);
      if (!inTier.length) return;
      const row = el('div', 'tier-row'); row.dataset.tier = tier.value; row.setAttribute('role', 'row');
      const rank = el('div', 'tier-rank'); rank.setAttribute('role', 'rowheader'); rank.append(el('strong', '', tier.label), el('span', '', tier.caption)); row.append(rank);
      levels.forEach((level) => {
        const cell = el('div', 'tier-cell'); cell.setAttribute('role', 'cell');
        const companies = inTier.filter((p) => p.difficulty === level);
        companies.forEach((profile) => {
          const button = el('button', 'tier-tile'); button.type = 'button';
          button.setAttribute('aria-label', `Panduan perusahaan ${profile.label}`);
          button.title = `${profile.label} · ${tier.label} · ${level}\nKeyakinan: ${profile.confidence || 'Rendah'}\n${profile.recommendationReason}`;
          const emblem = el('span', 'tier-tile-logo'); emblem.append(logo(profile));
          const name = el('span', 'tier-tile-name', profile.label);
          const hint = el('span', 'tier-tile-info', 'i'); hint.setAttribute('aria-hidden', 'true');
          button.append(emblem, name, hint); button.addEventListener('click', () => openProfile(profile, button)); cell.append(button);
        });
        if (!companies.length) { const empty = el('span', 'tier-cell-empty', '—'); empty.setAttribute('aria-label', 'Tidak ada perusahaan'); cell.append(empty); }
        row.append(cell);
      });
      grid.append(row);
    });
    $('#guide-results').textContent = state.error ? 'Panduan belum bisa dimuat. Daftar lowongan tetap dapat dijelajahi.' : profiles.length ? `${profiles.length} perusahaan · Klik ikon untuk alasan, ulasan, dan tips.` : 'Belum ada perusahaan yang sesuai filter ini.';
    $('#guide-expand').hidden = true;
  }
  $('#guide-filters').addEventListener('submit', (e) => e.preventDefault());
  const resetGuide = el('button', 'guide-reset', 'Atur ulang');
  resetGuide.type = 'button';
  resetGuide.addEventListener('click', () => {
    state.query = state.tier = state.difficulty = '';
    ['guide-query', 'guide-tier', 'guide-difficulty'].forEach((id) => $(`#${id}`).value = '');
    render();
  });
  $('#guide-filters').append(resetGuide);
  $('#guide-query').addEventListener('input', (e) => { state.query = e.target.value; state.expanded = false; render(); });
  ['tier', 'difficulty'].forEach((field) => $(`#guide-${field}`).addEventListener('change', (e) => { state[field] = e.target.value; state.expanded = false; render(); }));
  $('#guide-expand').addEventListener('click', () => { state.expanded = !state.expanded; render(); });
  $('#company-dialog .dialog-close').addEventListener('click', () => $('#company-dialog').close());
  $('#company-dialog').addEventListener('click', (e) => {
    if (e.target !== $('#company-dialog')) return;
    const r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
  });
  $('#company-dialog').addEventListener('close', () => { document.body.style.overflow = ''; dialogTrigger?.focus(); });
  const ready = (async () => {
    try {
      const response = await fetch('./data/companies.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Panduan belum tersedia');
      const data = await response.json();
      if (!Array.isArray(data.companies)) throw new Error('Format panduan tidak sesuai');
      state.profiles = data.companies.filter((p) => p && typeof p.id === 'string' && typeof p.label === 'string');
      state.byId = new Map(state.profiles.map((p) => [p.id, p]));
      state.jobsMap = data.jobsMap || {};
      render();
    } catch { state.error = true; render(); }
  })();
  window.CompanyGuide = { ready, profileFor, logo: (job) => logo(profileFor(job)), cardAdvice, matches, appendAdvice: (container, job) => { const p = profileFor(job); if (p?.kind === 'employer') container.append(advice(p, true)); } };
})();
