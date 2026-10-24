(() => {
  'use strict';

  const DAY = 86400000;
  const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const monthFormat = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shortFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const weekdayFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'UTC' });
  const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }
  function stamp(date) { return date.toISOString().slice(0, 10); }
  function readDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && stamp(date) === value ? date : null;
  }
  function todayStamp() {
    const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Jakarta' }).formatToParts(new Date());
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function addDays(date, amount) { return new Date(date.getTime() + amount * DAY); }
  function inMonth(date, month) { return date.getUTCMonth() === month.getUTCMonth() && date.getUTCFullYear() === month.getUTCFullYear(); }
  function shiftedMonth(date, amount) {
    const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    first.setUTCDate(Math.min(date.getUTCDate(), lastDay));
    return first;
  }
  function plainText(value) { return String(value || '').normalize('NFKD').toLocaleLowerCase('id-ID'); }
  function sourceLink(job) {
    const source = job.applicationDateSource;
    if (!source || typeof source.url !== 'string') return null;
    try {
      const url = new URL(source.url);
      if (!['https:', 'http:'].includes(url.protocol)) return null;
      const link = node('a', 'calendar-source-link', `${source.label || 'Sumber tanggal'} ↗`);
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return link;
    } catch { return null; }
  }

  function mount(inputJobs, openDetails) {
    const root = document.querySelector('#calendar-root');
    if (!root) return;
    const jobs = Array.isArray(inputJobs) ? inputJobs : [];
    const today = todayStamp();
    let selected = readDate(today);
    let month = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1));
    let query = '';
    let kind = 'all';
    let agendaLimit = 8;
    const events = [];
    const periods = [];
    function postingSources(job) {
      return [job, ...(Array.isArray(job.additionalSources) ? job.additionalSources : [])];
    }
    for (const job of jobs) {
      const start = readDate(job.applicationStartDate);
      const end = readDate(job.deadline);
      const seenPosts = new Set();
      postingSources(job).forEach(source => {
        [['postedDate', 'posted', 'Dipublikasikan'], ['sharedDate', 'shared', 'Dibagikan ke arsip']].forEach(([field, type, label]) => {
          if (!readDate(source[field])) return;
          const key = `${type}:${source[field]}:${source.sourceUrl || ''}`;
          if (seenPosts.has(key)) return;
          seenPosts.add(key);
          events.push({ job, date: source[field], group: 'posts', type, label, publisher: source.sourcePublisher || '' });
        });
      });
      if (start) events.push({ job, date: job.applicationStartDate, group: 'applications', type: 'opening', label: 'Mulai apply' });
      if (end) events.push({ job, date: job.deadline, group: 'applications', type: 'deadline', label: 'Batas daftar' });
      if (start && end && start <= end) periods.push({ job, start: job.applicationStartDate, end: job.deadline });
    }
    const matchesJob = job => !query || plainText([job.company, job.title, job.category, job.location, job.sourcePublisher, ...(job.additionalSources || []).map(source => source.sourcePublisher)].join(' ')).includes(query);
    const filteredEvents = () => events.filter(event => matchesJob(event.job) && (kind === 'all' || kind === event.group));
    const filteredPeriods = () => kind === 'posts' ? [] : periods.filter(period => matchesJob(period.job));
    root.replaceChildren();

    const stats = node('div', 'calendar-summary');
    const postCount = jobs.filter(job => postingSources(job).some(source => readDate(source.postedDate) || readDate(source.sharedDate))).length;
    const deadlineCount = jobs.filter(job => readDate(job.deadline)).length;
    for (const [value, label] of [[postCount, 'punya tanggal posting / arsip'], [periods.length, 'punya rentang apply lengkap'], [deadlineCount, 'punya batas daftar']]) {
      const item = node('div', 'calendar-stat');
      item.append(node('strong', '', String(value)), node('span', '', label));
      stats.append(item);
    }
    root.append(stats);

    const toolbar = node('div', 'calendar-toolbar');
    const searchLabel = node('label', 'calendar-search-label', 'Cari di kalender');
    const search = node('input', 'calendar-search');
    search.type = 'search';
    search.placeholder = 'Perusahaan, posisi, atau lokasi';
    search.id = 'calendar-search';
    searchLabel.append(search);
    const typeLabel = node('label', 'calendar-kind-label', 'Tampilkan');
    const type = node('select', 'calendar-kind');
    type.id = 'calendar-kind';
    for (const [value, label] of [['all', 'Semua tanggal'], ['posts', 'Postingan & arsip'], ['applications', 'Periode apply & batas daftar']]) {
      const option = node('option', '', label);
      option.value = value;
      type.append(option);
    }
    typeLabel.append(type);
    const reset = node('button', 'calendar-reset', 'Atur ulang');
    reset.type = 'button';
    reset.addEventListener('click', () => { query = ''; kind = 'all'; search.value = ''; type.value = 'all'; agendaLimit = 8; render(); });
    toolbar.append(searchLabel, typeLabel, reset);
    root.append(toolbar);

    const layout = node('div', 'calendar-layout');
    const main = node('div', 'calendar-panel');
    const monthHeader = node('div', 'calendar-month-header');
    const monthTitle = node('h3', 'calendar-month-title');
    monthTitle.id = 'calendar-month-title';
    monthTitle.setAttribute('aria-live', 'polite');
    const navigation = node('div', 'calendar-navigation');
    const previous = node('button', 'calendar-nav-button', '‹');
    previous.type = 'button';
    previous.setAttribute('aria-label', 'Bulan sebelumnya');
    const todayButton = node('button', 'calendar-today-button', 'Hari ini');
    todayButton.type = 'button';
    const next = node('button', 'calendar-nav-button', '›');
    next.type = 'button';
    next.setAttribute('aria-label', 'Bulan berikutnya');
    navigation.append(previous, todayButton, next);
    monthHeader.append(monthTitle, navigation);
    const legend = node('div', 'calendar-legend');
    for (const [className, label] of [['posts', 'Posting / dibagikan'], ['applications', 'Mulai / batas daftar']]) {
      const item = node('span', 'calendar-legend-item', label);
      item.prepend(node('i', `calendar-dot calendar-dot-${className}`));
      legend.append(item);
    }
    const rangeLegend = node('span', 'calendar-legend-item', 'Rentang apply');
    rangeLegend.prepend(node('i', 'calendar-range-key'));
    legend.append(rangeLegend);
    const grid = node('div', 'calendar-grid');
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-labelledby', monthTitle.id);
    grid.setAttribute('aria-describedby', 'calendar-keyboard-note');
    const monthNote = node('p', 'calendar-month-note');
    monthNote.setAttribute('role', 'status');
    const keyboardNote = node('p', 'calendar-keyboard-note', 'Pilih tanggal untuk melihat detail. Keyboard: panah untuk berpindah hari, Page Up / Down untuk berpindah bulan.');
    keyboardNote.id = 'calendar-keyboard-note';
    main.append(monthHeader, legend, grid, monthNote, keyboardNote);
    const side = node('div', 'calendar-side');
    const agenda = node('section', 'calendar-agenda');
    agenda.setAttribute('aria-labelledby', 'calendar-agenda-title');
    const deadlines = node('section', 'calendar-deadlines');
    deadlines.setAttribute('aria-labelledby', 'calendar-deadlines-title');
    side.append(agenda, deadlines);
    layout.append(main, side);
    root.append(layout);

    const missing = node('details', 'calendar-missing');
    missing.append(node('summary', '', 'Tentang tanggal yang belum tersedia'));
    missing.append(node('p', '', `${jobs.length - postCount} lowongan belum memiliki tanggal publikasi atau tanggal dibagikan. Tanggal terakhir ditinjau tidak dijadikan tanggal posting.`));
    missing.append(node('p', '', `${jobs.length - periods.length} lowongan belum memiliki rentang apply lengkap. Tenggat yang sudah diketahui tetap ditampilkan, meskipun tanggal pembukaannya belum tersedia.`));
    missing.append(node('p', '', 'Rentang apply mengikuti tanggal pada sumber, bukan durasi magang atau kepastian bahwa lowongan masih menerima lamaran. Selalu periksa sumber sebelum apply.'));
    root.append(missing);

    function setDate(date, focusDate = false) {
      selected = date;
      month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      agendaLimit = 8;
      render();
      if (focusDate) grid.querySelector(`[data-date="${stamp(selected)}"]`)?.focus();
    }
    previous.addEventListener('click', () => setDate(shiftedMonth(selected, -1)));
    next.addEventListener('click', () => setDate(shiftedMonth(selected, 1)));
    todayButton.addEventListener('click', () => setDate(readDate(today)));
    search.addEventListener('input', () => { query = plainText(search.value.trim()); agendaLimit = 8; render(); });
    type.addEventListener('change', () => { kind = type.value; agendaLimit = 8; render(); });

    function jobCard(job, label, detail, eventType) {
      const card = node('li', `calendar-job-card calendar-job-${eventType}`);
      const button = node('button', 'calendar-job-open');
      button.type = 'button';
      const top = node('span', 'calendar-job-top');
      top.append(node('span', 'calendar-job-company', job.company || 'Perusahaan'), node('span', `calendar-event-badge calendar-event-${eventType}`, label));
      button.append(top, node('strong', 'calendar-job-title', job.title || 'Lihat lowongan'), node('span', 'calendar-job-detail', detail));
      if (job.status) button.append(node('span', 'calendar-job-status', `Status saat ditinjau: ${job.status}`));
      button.setAttribute('aria-label', `${label}: ${job.company}, ${job.title}. ${detail}. Buka detail lowongan`);
      button.addEventListener('click', () => { if (typeof openDetails === 'function') openDetails(job, button); });
      card.append(button);
      if (['opening', 'deadline', 'period'].includes(eventType)) {
        const source = sourceLink(job);
        if (source) card.append(source);
      }
      return card;
    }

    function renderGrid(currentEvents, currentPeriods) {
      monthTitle.textContent = monthFormat.format(month);
      grid.replaceChildren();
      const headers = node('div', 'calendar-weekdays');
      headers.setAttribute('role', 'row');
      weekdays.forEach(day => {
        const header = node('span', '', day);
        header.setAttribute('role', 'columnheader');
        headers.append(header);
      });
      grid.append(headers);
      const offset = (month.getUTCDay() + 6) % 7;
      const first = addDays(month, -offset);
      const counts = new Map();
      currentEvents.forEach(event => {
        if (!counts.has(event.date)) counts.set(event.date, { posts: 0, applications: 0 });
        counts.get(event.date)[event.group] += 1;
      });
      for (let week = 0; week < 6; week++) {
        const row = node('div', 'calendar-week');
        row.setAttribute('role', 'row');
        for (let day = 0; day < 7; day++) {
          const date = addDays(first, week * 7 + day);
          const key = stamp(date);
          const count = counts.get(key) || { posts: 0, applications: 0 };
          const activeCount = currentPeriods.filter(period => period.start <= key && period.end >= key).length;
          const cell = node('div', 'calendar-cell');
          cell.setAttribute('role', 'gridcell');
          cell.setAttribute('aria-selected', String(key === stamp(selected)));
          const button = node('button', 'calendar-day');
          button.type = 'button';
          button.dataset.date = key;
          button.tabIndex = key === stamp(selected) ? 0 : -1;
          if (!inMonth(date, month)) button.classList.add('calendar-day-outside');
          if (key === today) { button.classList.add('calendar-day-today'); button.setAttribute('aria-current', 'date'); }
          if (key === stamp(selected)) button.classList.add('calendar-day-selected');
          if (activeCount) button.classList.add('calendar-day-period');
          button.setAttribute('aria-label', `${weekdayFormat.format(date)}, ${dateFormat.format(date)}. ${count.posts} postingan atau dibagikan, ${count.applications} mulai atau batas daftar, ${activeCount} rentang apply mencakup tanggal ini${key === today ? '. Hari ini' : ''}`);
          button.append(node('span', 'calendar-day-number', String(date.getUTCDate())));
          const markers = node('span', 'calendar-day-markers');
          markers.setAttribute('aria-hidden', 'true');
          if (count.posts) {
            const mark = node('span', 'calendar-day-marker calendar-marker-posts', String(count.posts));
            mark.prepend(node('i', 'calendar-dot calendar-dot-posts'));
            markers.append(mark);
          }
          if (count.applications) {
            const mark = node('span', 'calendar-day-marker calendar-marker-applications', String(count.applications));
            mark.prepend(node('i', 'calendar-dot calendar-dot-applications'));
            markers.append(mark);
          }
          button.append(markers);
          button.addEventListener('click', () => setDate(date, true));
          button.addEventListener('keydown', event => {
            let destination;
            if (event.key === 'ArrowLeft') destination = addDays(date, -1);
            if (event.key === 'ArrowRight') destination = addDays(date, 1);
            if (event.key === 'ArrowUp') destination = addDays(date, -7);
            if (event.key === 'ArrowDown') destination = addDays(date, 7);
            if (event.key === 'Home') destination = addDays(date, -((date.getUTCDay() + 6) % 7));
            if (event.key === 'End') destination = addDays(date, 6 - ((date.getUTCDay() + 6) % 7));
            if (event.key === 'PageUp') destination = shiftedMonth(date, event.shiftKey ? -12 : -1);
            if (event.key === 'PageDown') destination = shiftedMonth(date, event.shiftKey ? 12 : 1);
            if (destination) { event.preventDefault(); setDate(destination, true); }
          });
          cell.append(button);
          row.append(cell);
        }
        grid.append(row);
      }
      const count = currentEvents.filter(event => inMonth(readDate(event.date), month)).length;
      const monthStart = stamp(month);
      const monthEnd = stamp(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)));
      const ranges = currentPeriods.filter(period => period.start <= monthEnd && period.end >= monthStart).length;
      monthNote.textContent = `${count} penanda tanggal · ${ranges} rentang apply beririsan dengan bulan ini`;
    }

    function renderAgenda(currentEvents, currentPeriods) {
      agenda.replaceChildren();
      const heading = node('h3', 'calendar-side-title', dateFormat.format(selected));
      heading.id = 'calendar-agenda-title';
      const selectedKey = stamp(selected);
      const dayEvents = currentEvents.filter(event => event.date === selectedKey).sort((a, b) => {
        const priority = { deadline: 0, opening: 1, posted: 2, shared: 3 };
        return priority[a.type] - priority[b.type] || (a.job.company || '').localeCompare(b.job.company || '', 'id-ID');
      });
      const active = currentPeriods.filter(period => period.start <= selectedKey && period.end >= selectedKey);
      const status = node('p', 'calendar-agenda-status', `${dayEvents.length} penanda tanggal · ${active.length} rentang apply`);
      status.setAttribute('role', 'status');
      agenda.append(node('p', 'calendar-panel-eyebrow', selectedKey === today ? 'AGENDA HARI INI' : 'AGENDA TANGGAL PILIHAN'), heading, status);
      if (dayEvents.length) {
        const list = node('ul', 'calendar-job-list');
        dayEvents.slice(0, agendaLimit).forEach(event => {
          let detail = event.type === 'shared' ? 'Tanggal dibagikan ke arsip; tanggal publikasi asli belum tentu sama.' : event.type === 'posted' ? 'Tanggal publikasi yang tercantum pada sumber.' : event.type === 'opening' ? 'Tanggal mulai apply menurut sumber.' : `Batas daftar menurut sumber${event.job.deadlineTime ? `, ${event.job.deadlineTime}` : ''}.`;
          if (event.publisher) detail += ` Penerbit: ${event.publisher}.`;
          list.append(jobCard(event.job, event.label, detail, event.type));
        });
        agenda.append(list);
        if (dayEvents.length > agendaLimit) {
          const more = node('button', 'calendar-show-more', `Lihat ${dayEvents.length - agendaLimit} penanda lainnya`);
          more.type = 'button';
          more.addEventListener('click', () => {
            const firstNewIndex = agendaLimit;
            agendaLimit = dayEvents.length;
            renderAgenda(currentEvents, currentPeriods);
            agenda.querySelector('.calendar-job-list')?.querySelectorAll('.calendar-job-open')[firstNewIndex]?.focus();
          });
          agenda.append(more);
        }
      } else {
        agenda.append(node('p', 'calendar-empty', query ? 'Tidak ada penanda yang cocok pada tanggal ini. Coba tanggal lain atau atur ulang pencarian.' : 'Belum ada postingan, pembukaan, atau tenggat yang tercatat pada tanggal ini.'));
      }
      if (active.length) {
        agenda.append(node('h4', 'calendar-period-heading', 'Dalam rentang tanggal sumber'));
        const list = node('ul', 'calendar-job-list calendar-period-list');
        active.forEach(period => {
          const detail = `${dateFormat.format(readDate(period.start))} – ${dateFormat.format(readDate(period.end))}${period.job.deadlineTime ? `, ${period.job.deadlineTime}` : ''}`;
          list.append(jobCard(period.job, 'Periode apply', detail, 'period'));
        });
        agenda.append(list);
      }
    }

    function renderDeadlines(currentEvents) {
      deadlines.replaceChildren();
      if (kind === 'posts') { deadlines.hidden = true; return; }
      deadlines.hidden = false;
      const heading = node('h3', 'calendar-side-title', 'Batas daftar bulan ini');
      heading.id = 'calendar-deadlines-title';
      deadlines.append(heading);
      const monthly = currentEvents.filter(event => event.type === 'deadline' && inMonth(readDate(event.date), month)).sort((a, b) => a.date.localeCompare(b.date) || (a.job.company || '').localeCompare(b.job.company || '', 'id-ID'));
      if (!monthly.length) { deadlines.append(node('p', 'calendar-empty', 'Belum ada batas daftar tercatat untuk bulan ini. Coba bulan berikutnya.')); return; }
      const list = node('ul', 'calendar-deadline-list');
      monthly.forEach(event => {
        const item = node('li');
        const button = node('button', 'calendar-deadline-pick');
        button.type = 'button';
        button.append(node('span', 'calendar-deadline-date', shortFormat.format(readDate(event.date))), node('span', 'calendar-deadline-company', event.job.company));
        button.setAttribute('aria-label', `${dateFormat.format(readDate(event.date))}, batas daftar ${event.job.company}: ${event.job.title}. Lihat agenda tanggal ini`);
        if (event.date < today) button.append(node('span', 'calendar-deadline-past', 'Lewat'));
        button.addEventListener('click', () => { setDate(readDate(event.date), true); agenda.querySelector('h3')?.scrollIntoView({ block: 'nearest' }); });
        item.append(button);
        list.append(item);
      });
      deadlines.append(list);
    }

    function render() {
      const currentEvents = filteredEvents();
      const currentPeriods = filteredPeriods();
      renderGrid(currentEvents, currentPeriods);
      renderAgenda(currentEvents, currentPeriods);
      renderDeadlines(currentEvents);
    }
    render();
  }

  window.JobCalendar = { mount };
})();
