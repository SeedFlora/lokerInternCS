'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);
  const storageKey = 'lokerInternCS.saved.v1';
  const formatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const state = { jobs: [], search: '', category: '', type: '', source: '', tier: '', difficulty: '', collection: 'all', sort: 'newest', saved: new Set(), error: false };
  let toastTimer;
  let dialogTrigger;

  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(stored)) state.saved = new Set(stored.filter((id) => typeof id === 'string'));
  } catch { /* The board also works with unavailable browser storage. */ }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function icon(name) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.classList.add('icon');
    node.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#icon-${name}`);
    node.append(use);
    return node;
  }

  function validUrl(value) {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }

  function validApplicationUrl(value) {
    const website = validUrl(value);
    if (website) return website;
    try {
      const url = new URL(value);
      const email = decodeURIComponent(url.pathname);
      return url.protocol === 'mailto:' && !url.search && !url.hash && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? url.href : null;
    } catch { return null; }
  }

  function sourceLink(url, text, className, allowEmail = false) {
    const href = allowEmail ? validApplicationUrl(url) : validUrl(url);
    if (!href) return null;
    const link = element('a', className, text);
    link.href = href;
    if (href.startsWith('mailto:')) link.setAttribute('aria-label', `${text} (buka aplikasi email)`);
    else {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `${text} (buka tab baru)`);
    }
    return link;
  }

  function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
    const date = new Date(value.length === 10 ? `${value}T12:00:00+07:00` : value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateText(value, fallback = 'Tidak dicantumkan') {
    const date = parseDate(value);
    return date ? formatter.format(date) : fallback;
  }

  function mostRelevantDate(job) {
    return parseDate(job.postedDate)?.getTime() || parseDate(job.sharedDate)?.getTime() || parseDate(job.checkedDate)?.getTime() || 0;
  }

  function initials(company) {
    return company.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase() || '↗';
  }

  function companyLogo(job) {
    const authentic = window.CompanyGuide?.logo(job);
    if (authentic) return authentic;
    const logo = element('span', 'company-logo', initials(job.company));
    logo.setAttribute('aria-hidden', 'true');
    const swatches = [['#efedff', '#5743c7'], ['#e9efff', '#3c64a5'], ['#fff0e8', '#a66d43'], ['#f6eafb', '#8754a0']];
    const index = Array.from(job.company).reduce((value, char) => value + char.codePointAt(0), 0) % swatches.length;
    [logo.style.backgroundColor, logo.style.color] = swatches[index];
    return logo;
  }

  function sourceTag(job) {
    const tag = element('span', 'source-tag', [job.sourceType || 'Web', job.sourcePublisher].filter(Boolean).join(' · '));
    tag.dataset.source = job.sourceType || 'Web';
    return tag;
  }

  function announce(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
  }

  function updateSavedCount() {
    $('#saved-count').textContent = state.jobs.filter((job) => state.saved.has(job.id)).length;
  }

  function toggleSaved(job, button) {
    if (state.saved.has(job.id)) state.saved.delete(job.id);
    else state.saved.add(job.id);
    let persisted = true;
    try { localStorage.setItem(storageKey, JSON.stringify([...state.saved])); }
    catch { persisted = false; }
    const saved = state.saved.has(job.id);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', `${saved ? 'Hapus dari simpanan' : 'Simpan lowongan'}: ${job.title}`);
    updateSavedCount();
    announce(saved ? (persisted ? 'Lowongan disimpan di browser ini.' : 'Disimpan untuk sesi ini. Penyimpanan browser tidak tersedia.') : 'Lowongan dihapus dari simpanan.');
    if (state.collection === 'saved' && !saved) render();
  }

  function createCard(job) {
    const article = element('article', 'job-card');
    const top = element('div', 'card-top');
    const meta = element('div', 'company-meta');
    meta.append(element('span', 'company-name', job.company), sourceTag(job));
    const save = element('button', 'save-button');
    save.type = 'button';
    const saved = state.saved.has(job.id);
    save.setAttribute('aria-pressed', String(saved));
    save.setAttribute('aria-label', `${saved ? 'Hapus dari simpanan' : 'Simpan lowongan'}: ${job.title}`);
    save.append(icon('bookmark'));
    save.addEventListener('click', () => toggleSaved(job, save));
    top.append(companyLogo(job), meta, save);

    const title = element('h3', 'card-title');
    const titleButton = element('button', 'title-button', job.title);
    titleButton.type = 'button';
    titleButton.addEventListener('click', () => openDetails(job, titleButton));
    title.append(titleButton);
    const tags = element('div', 'card-tags');
    if (job.category) tags.append(element('span', 'tag tag-category', job.category));
    if (job.mode) tags.append(element('span', 'tag', job.mode));
    if (job.type && job.type.toLowerCase() !== 'internship' && job.type.toLowerCase() !== 'magang') tags.append(element('span', 'tag', job.type));
    const location = element('p', 'card-location');
    location.append(icon('pin'), element('span', '', job.location || 'Lokasi: cek sumber'));
    const summary = element('p', 'card-summary', job.summary || 'Baca persyaratan dan cara melamar selengkapnya di tautan sumber.');
    const status = element('p', 'card-status', job.status || 'Perlu cek sumber');
    if (/tenggat.*lewat|kedaluwarsa|ditutup|expired|tidak lagi menerima/i.test(job.status || '')) status.dataset.state = 'closed';
    else if (/tidak tersedia|sumber tidak/i.test(job.status || '')) status.dataset.state = 'unavailable';
    const footer = element('div', 'card-footer');
    const dateLabel = parseDate(job.postedDate) ? `Dipublikasikan ${dateText(job.postedDate)}` : parseDate(job.sharedDate) ? `Dibagikan ${dateText(job.sharedDate)}` : parseDate(job.checkedDate) ? `Ditinjau ${dateText(job.checkedDate)}` : 'Tanggal: cek sumber';
    const date = element('span', 'date-label', dateLabel);
    const detail = element('button', 'card-detail', 'Lihat detail');
    detail.type = 'button';
    detail.setAttribute('aria-label', `Lihat detail ${job.title} — ${job.company}`);
    detail.append(icon('arrow'));
    detail.addEventListener('click', () => openDetails(job, detail));
    footer.append(date, detail);
    article.append(top, title, tags, location, summary);
    const companyAdvice = window.CompanyGuide?.cardAdvice(job);
    if (companyAdvice) article.append(companyAdvice);
    article.append(status, footer);
    return article;
  }

  function openDetails(job, trigger) {
    dialogTrigger = trigger;
    const content = $('#dialog-content');
    content.replaceChildren();
    const company = element('div', 'dialog-company');
    const meta = element('div');
    meta.append(element('span', 'company-name', job.company), sourceTag(job));
    company.append(companyLogo(job), meta);
    const title = element('h2', 'dialog-title', job.title);
    title.id = 'dialog-title';
    const tags = element('div', 'dialog-tags');
    [job.category, job.type, job.mode].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).forEach((value) => tags.append(element('span', 'tag', value)));
    content.append(company, title, tags, element('p', 'dialog-summary', job.summary || 'Rincian posisi tersedia di tautan sumber.'));
    if (Array.isArray(job.requirements) && job.requirements.length) {
      const block = element('section', 'detail-block');
      const list = element('ul');
      job.requirements.filter((value) => typeof value === 'string').forEach((value) => list.append(element('li', '', value)));
      block.append(element('h3', '', 'Yang perlu kamu tahu'), list);
      content.append(block);
    }
    const facts = element('dl', 'detail-facts');
    const pairs = [
      ['Lokasi', job.location || 'Cek sumber'],
      ['Ketersediaan', job.status || 'Perlu cek sumber'],
      ...(job.sourcePublisher ? [['Penerbit sumber', job.sourcePublisher]] : []),
      ['Tanggal publikasi', dateText(job.postedDate)],
      ['Tanggal dibagikan', dateText(job.sharedDate)],
      ['Pendaftaran mulai', dateText(job.applicationStartDate, 'Belum dicantumkan')],
      ['Batas daftar / melamar', `${dateText(job.deadline, job.deadline ? String(job.deadline) : 'Belum dicantumkan')}${job.deadlineTime ? `, ${job.deadlineTime}` : ''}`],
      ['Terakhir ditinjau', dateText(job.checkedDate)],
      ['Koleksi', job.provenance || 'Riset web'],
    ];
    pairs.forEach(([label, value]) => {
      const pair = element('div');
      pair.append(element('dt', '', label), element('dd', '', value));
      facts.append(pair);
    });
    content.append(facts);
    if (job.applicationDateSource && validUrl(job.applicationDateSource.url)) {
      const dateSource = element('p', 'dialog-source-note');
      dateSource.append(document.createTextNode('Jadwal pendaftaran: '), sourceLink(job.applicationDateSource.url, job.applicationDateSource.label || 'Lihat sumber tanggal', 'date-source-link'));
      content.append(dateSource);
    }
    if (job.notes) {
      const notes = element('section', 'detail-block');
      notes.append(element('h3', '', 'Catatan kurasi'), element('p', '', job.notes));
      content.append(notes);
    }
    content.append(element('p', 'dialog-source-note', 'Tanggal dibagikan bukan tanggal publikasi. Periksa informasi, ketersediaan, dan instruksi melamar langsung di sumber. Tautan situs dibuka di tab baru; alamat email dibuka di aplikasi email.'));
    const actions = element('div', 'dialog-actions');
    const applyUrl = validApplicationUrl(job.applyUrl);
    const sourceUrl = validUrl(job.sourceUrl);
    if (applyUrl && applyUrl !== sourceUrl) {
      const apply = sourceLink(applyUrl, applyUrl.startsWith('mailto:') ? 'Email rekrutmen' : 'Lihat cara melamar', 'primary-link', true);
      apply.append(icon('arrow'));
      actions.append(apply);
      if (sourceUrl) actions.append(sourceLink(sourceUrl, 'Lihat sumber', 'secondary-link'));
    } else if (sourceUrl || applyUrl) {
      const source = sourceLink(sourceUrl || applyUrl, applyUrl?.startsWith('mailto:') && !sourceUrl ? 'Email rekrutmen' : 'Buka lowongan di sumber', 'primary-link', true);
      source.append(icon('arrow'));
      actions.append(source);
    } else actions.append(element('p', 'dialog-source-note', 'Tautan sumber belum tersedia.'));
    content.append(actions);
    for (const [sources, heading] of [[job.additionalSources, 'Sumber pendamping untuk posisi yang sama'], [job.relatedSources, 'Referensi terkait — periksa posisi dan programnya']]) {
      if (!Array.isArray(sources) || !sources.length) continue;
      const block = element('section', 'detail-block');
      const list = element('ul');
      sources.forEach((source) => {
        const link = sourceLink(source.sourceUrl || source.url, source.label || source.title || source.sourcePublisher || 'Sumber pendamping', 'date-source-link');
        if (!link) return;
        const item = element('li');
        item.append(link);
        if (parseDate(source.postedDate)) item.append(document.createTextNode(` — dipublikasikan ${dateText(source.postedDate)}`));
        if (parseDate(source.sharedDate)) item.append(document.createTextNode(` — dibagikan ${dateText(source.sharedDate)}`));
        list.append(item);
      });
      if (list.children.length) {
        block.append(element('h3', '', heading), list);
        content.append(block);
      }
    }
    window.CompanyGuide?.appendAdvice(content, job);
    $('#job-dialog').showModal();
    document.body.style.overflow = 'hidden';
  }

  function closeDetails() { $('#job-dialog').close(); }
  $('#job-dialog .dialog-close').addEventListener('click', closeDetails);
  $('#job-dialog').addEventListener('click', (event) => {
    if (event.target !== $('#job-dialog')) return;
    const bounds = $('#job-dialog').getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDetails();
  });
  $('#job-dialog').addEventListener('close', () => {
    document.body.style.overflow = '';
    dialogTrigger?.focus();
  });

  function matchesCollection(job) {
    if (state.collection === 'saved') return state.saved.has(job.id);
    if (state.collection === 'research') return job.provenance === 'Riset web';
    if (state.collection === 'archive') return job.provenance === 'Arsip postingan';
    return true;
  }

  function render() {
    const query = state.search.trim().toLocaleLowerCase('id-ID');
    const jobs = state.jobs.filter((job) => {
      const haystack = [job.title, job.company, job.sourcePublisher, ...(job.additionalSources || []).map(source => source.sourcePublisher), job.category, job.location, job.mode, job.summary, ...(job.requirements || [])].join(' ').toLocaleLowerCase('id-ID');
      return matchesCollection(job) && (!state.category || job.category === state.category) && (!state.type || job.type === state.type) && (!state.source || job.sourceType === state.source) && (!query || haystack.includes(query)) && (!window.CompanyGuide || window.CompanyGuide.matches(job, state));
    });
    jobs.sort((a, b) => state.sort === 'company' ? a.company.localeCompare(b.company, 'id') : state.sort === 'title' ? a.title.localeCompare(b.title, 'id') : mostRelevantDate(b) - mostRelevantDate(a) || a.company.localeCompare(b.company, 'id'));
    const grid = $('#jobs-grid');
    grid.replaceChildren(...jobs.map(createCard));
    grid.setAttribute('aria-busy', 'false');
    $('#empty-state').hidden = jobs.length > 0;
    const count = $('#results-count');
    count.replaceChildren(element('strong', '', String(jobs.length)), document.createTextNode(` dari ${state.jobs.length} referensi`));
    $('.sort-control').hidden = state.error;
    if (!jobs.length) {
      const savedView = state.collection === 'saved';
      const noData = state.jobs.length === 0;
      $('#empty-title').textContent = state.error ? 'Daftar belum bisa dimuat.' : savedView ? 'Pilihanmu dimulai di sini.' : noData ? 'Koleksi sedang disiapkan.' : 'Belum ada yang cocok.';
      $('#empty-description').textContent = state.error ? 'Periksa koneksi, lalu muat ulang halaman untuk mencoba kembali.' : savedView ? 'Ketuk tanda simpan pada lowongan yang menarik untuk melihatnya lagi di sini.' : noData ? 'Lowongan yang telah ditinjau akan muncul di halaman ini.' : 'Coba kata kunci lain atau perluas filter pencarianmu.';
      $('#empty-reset').textContent = state.error ? 'Coba muat ulang' : 'Tampilkan semua lowongan →';
      $('#empty-reset').hidden = noData && !state.error;
    }
    document.querySelectorAll('[data-collection]').forEach((button) => {
      const active = button.dataset.collection === state.collection;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    updateSavedCount();
  }

  function setCollection(value) { state.collection = value; render(); }
  function resetFilters() {
    if (state.error) { window.location.reload(); return; }
    state.search = state.category = state.type = state.source = state.tier = state.difficulty = '';
    state.collection = 'all';
    state.sort = 'newest';
    $('#search').value = $('#category').value = $('#type').value = $('#source').value = $('#tier').value = $('#difficulty').value = '';
    $('#hero-query').value = '';
    $('#sort').value = 'newest';
    render();
  }
  $('#filters').addEventListener('submit', (event) => event.preventDefault());
  $('#hero-search').addEventListener('submit', (event) => {
    event.preventDefault();
    state.search = $('#hero-query').value;
    $('#search').value = state.search;
    state.collection = 'all';
    render();
    $('#lowongan').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  $('#search').addEventListener('input', (event) => { state.search = event.target.value; render(); });
  ['category', 'type', 'source', 'sort', 'tier', 'difficulty'].forEach((field) => $(`#${field}`).addEventListener('change', (event) => { state[field] = event.target.value; render(); }));
  $('#clear-filters').addEventListener('click', resetFilters);
  $('#empty-reset').addEventListener('click', resetFilters);
  document.querySelectorAll('[data-collection]').forEach((button) => button.addEventListener('click', () => setCollection(button.dataset.collection)));
  $('#header-saved').addEventListener('click', () => { setCollection('saved'); $('#lowongan').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); });

  function populateFilter(selector, values) {
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')).forEach((value) => {
      const option = element('option', '', value);
      option.value = value;
      $(selector).append(option);
    });
  }

  async function load() {
    try {
      const response = await fetch('./data/jobs.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      await window.CompanyGuide?.ready;
      if (!Array.isArray(data.jobs)) throw new Error('Format daftar lowongan tidak sesuai');
      const seen = new Set();
      state.jobs = data.jobs.filter((job) => {
        if (!job || typeof job.id !== 'string' || typeof job.title !== 'string' || typeof job.company !== 'string' || seen.has(job.id)) return false;
        seen.add(job.id);
        return true;
      }).map((job) => ({ ...job, requirements: Array.isArray(job.requirements) ? job.requirements : [] }));
      let savedIdsMerged = false;
      state.jobs.forEach((job) => {
        (Array.isArray(job.legacyIds) ? job.legacyIds : []).forEach((oldId) => {
          if (!state.saved.has(oldId)) return;
          state.saved.delete(oldId);
          state.saved.add(job.id);
          savedIdsMerged = true;
        });
      });
      if (savedIdsMerged) {
        try { localStorage.setItem(storageKey, JSON.stringify([...state.saved])); }
        catch { /* Merged selections still work for this session. */ }
      }
      $('#total-jobs').textContent = state.jobs.length;
      $('#all-count').textContent = state.jobs.length;
      const sources = new Set(state.jobs.map((job) => job.sourceType).filter(Boolean));
      $('#source-count').textContent = `${sources.size} jenis sumber`;
      $('#updated-at').textContent = parseDate(data.updatedAt) ? `Terakhir diperbarui ${dateText(data.updatedAt)}` : 'Periksa tanggal peninjauan setiap lowongan';
      if (typeof data.coverage === 'string' && data.coverage.trim()) $('#coverage').textContent = data.coverage;
      populateFilter('#category', state.jobs.map((job) => job.category));
      populateFilter('#type', state.jobs.map((job) => job.type));
      populateFilter('#source', state.jobs.map((job) => job.sourceType));
      render();
      try {
        if (!window.JobCalendar) throw new Error('Modul kalender tidak tersedia');
        window.JobCalendar.mount(state.jobs, openDetails);
      } catch (error) {
        $('#calendar-root').textContent = 'Kalender belum dapat dimuat. Daftar lowongan tetap tersedia di bawah.';
        console.error('Kalender tidak dapat ditampilkan:', error);
      }
    } catch (error) {
      state.error = true;
      $('#updated-at').textContent = 'Data belum dapat dimuat';
      $('#source-count').textContent = 'Coba muat ulang halaman';
      render();
      $('#calendar-root').textContent = 'Kalender belum dapat dimuat. Periksa koneksi, lalu muat ulang halaman.';
      console.error('Daftar lowongan tidak dapat dimuat:', error);
    }
  }

  load();
})();
