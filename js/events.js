/* ============================================================
   VectorOne — Student Events Page Logic
   Self-contained script for events.html. Ships the same app-shell
   behaviors as dashboard.js / notices.js (theme, sidebar, popovers,
   global search, mini calendar) plus the Events-page-specific logic:
   event data, card rendering, filters + search, the details modal,
   registration, bookmarking, sharing and pagination.
   No backend calls — registration/bookmark state lives in memory only.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------- Sidebar: auto-highlight the active page ---------------- */
  (function highlightActiveNav() {
    const currentFile = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.sidebar-link[data-nav]').forEach(function (link) {
      const linkFile = link.getAttribute('href');
      const isActive = linkFile === currentFile;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  })();

  /* ---------------- Theme toggle (shared across app) ---------------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('cc-theme', theme);
    const isDark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  applyTheme(currentTheme());
  themeToggle.addEventListener('click', function () {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  /* ---------------- Sidebar: collapse (desktop) vs drawer (mobile) ---------------- */
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const MOBILE_BREAKPOINT = 1024;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function openDrawer() {
    sidebar.classList.add('is-open');
    sidebarBackdrop.classList.add('is-visible');
    sidebarToggle.setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    sidebar.classList.remove('is-open');
    sidebarBackdrop.classList.remove('is-visible');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  }

  sidebarToggle.addEventListener('click', function () {
    if (isMobile()) {
      sidebar.classList.contains('is-open') ? closeDrawer() : openDrawer();
    } else {
      const collapsed = document.body.classList.toggle('sidebar-collapsed');
      sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
    }
  });
  sidebarBackdrop.addEventListener('click', closeDrawer);

  // Keep drawer/collapse state sane when crossing the breakpoint live.
  window.addEventListener('resize', function () {
    if (!isMobile()) closeDrawer();
  });

  /* ---------------- Generic popover helper (notifications, user menu) ---------------- */
  function wirePopover(buttonId, panelId) {
    const button = document.getElementById(buttonId);
    const panel = document.getElementById(panelId);

    function open() {
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
    }
    function close() {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
    function isOpen() { return !panel.hidden; }

    button.addEventListener('click', function (event) {
      event.stopPropagation();
      isOpen() ? close() : open();
    });
    document.addEventListener('click', function (event) {
      if (isOpen() && !panel.contains(event.target) && event.target !== button) close();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        close();
        button.focus();
      }
    });

    return { open, close, isOpen };
  }

  wirePopover('userMenuBtn', 'userDropdown');
  const notificationPopover = wirePopover('notificationBtn', 'notificationPanel');

  /* ---------------- Notifications: mark all as read ---------------- */
  const notificationBadge = document.getElementById('notificationBadge');
  const markAllReadBtn = document.getElementById('markAllReadBtn');
  const notificationList = document.getElementById('notificationList');

  markAllReadBtn.addEventListener('click', function () {
    notificationList.querySelectorAll('.notification-item.is-unread').forEach(function (item) {
      item.classList.remove('is-unread');
      const dot = item.querySelector('.notification-dot');
      if (dot) dot.remove();
    });
    notificationBadge.textContent = '0';
    notificationBadge.classList.add('is-hidden');
  });

  /* ---------------- Global search ---------------- */
  const searchWrap = document.getElementById('searchWrap');
  const searchInput = document.getElementById('globalSearch');
  const searchClear = document.getElementById('searchClear');
  const searchPanel = document.getElementById('searchPanel');
  const recentSection = document.getElementById('recentSection');
  const resultsSection = document.getElementById('resultsSection');
  const searchResultsList = document.getElementById('searchResultsList');
  const searchEmpty = document.getElementById('searchEmpty');
  const recentSearchList = document.getElementById('recentSearchList');

  // Small mock dataset the search filters against — frontend only.
  // Each entry carries the same fields a real notice would (title,
  // description, category, author) so search can rank across all of them.
  const SEARCH_INDEX = [
    { title: 'Campus Drive — TCS NQT registrations', description: 'On-campus recruitment drive for final-year students via the National Qualifier Test.', category: 'Placement', author: 'Placement Cell', type: 'Notice' },
    { title: 'Semester 5 internal exam schedule', description: 'Internal assessment timetable released for all Semester 5 subjects.', category: 'Academic', author: 'Academic Office', type: 'Notice' },
    { title: 'Revised datesheet for practicals', description: 'Updated practical examination schedule due to lab availability.', category: 'Examination', author: 'Examination Cell', type: 'Notice' },
    { title: 'Code Sprint 2026', description: 'A 24-hour competitive programming and hackathon event.', category: 'Event', author: 'Coding Club', type: 'Event' },
    { title: 'Intro to UI/UX Workshop', description: 'Hands-on workshop covering design fundamentals and Figma basics.', category: 'Workshop', author: 'Design Cell', type: 'Event' },
    { title: 'Inter-Dept Football Trials', description: 'Trials for the annual inter-department football tournament.', category: 'Sports', author: 'Sports Committee', type: 'Event' },
    { title: 'Alumni Talk: Careers in Product', description: 'A talk by alumni currently working in product management roles.', category: 'Event', author: 'Alumni Cell', type: 'Event' },
    { title: 'Robotics Club', description: 'Student club focused on robotics and embedded systems.', category: 'Club', author: 'Robotics Club', type: 'Club' },
    { title: 'Design Cell', description: 'Campus design and UI/UX student community.', category: 'Club', author: 'Design Cell', type: 'Club' },
    { title: 'Photography Society', description: 'Club for photography enthusiasts across campus.', category: 'Club', author: 'Photography Society', type: 'Club' }
  ];

  // Match tiers: 0 = exact, 1 = starts-with (word boundary), 2 = contains (mid-word).
  // The highlighted range is always snapped outward to full word boundaries,
  // so a match can never visually split a word (e.g. "cam" in "Campus" always
  // highlights the whole word "Campus", never just "Cam").
  function isWordChar(ch) {
    return !!ch && /[a-z0-9]/i.test(ch);
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // Returns { tier, start, end } for the best match of query in text, or null.
  function findMatch(text, query) {
    if (!text || !query) return null;
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase().trim();
    if (!needle) return null;

    const idx = haystack.indexOf(needle);
    if (idx === -1) return null;

    const boundaryBefore = idx === 0 || !isWordChar(text[idx - 1]);
    const boundaryAfter = (idx + needle.length) >= text.length || !isWordChar(text[idx + needle.length]);

    // Snap the highlighted range outward to the nearest word boundaries.
    let start = idx;
    while (start > 0 && isWordChar(text[start - 1])) start--;
    let end = idx + needle.length;
    while (end < text.length && isWordChar(text[end])) end++;

    let tier;
    if (boundaryBefore && boundaryAfter && start === idx && end === idx + needle.length) {
      tier = 0; // exact whole word/phrase match
    } else if (boundaryBefore) {
      tier = 1; // starts at a word boundary — "starts-with"
    } else {
      tier = 2; // match begins mid-word — lowest-priority fallback
    }

    return { tier: tier, start: start, end: end };
  }

  // Wraps the full word(s) containing the match in <mark> — never a partial word.
  function highlightText(text, query) {
    const match = findMatch(text, query);
    if (!match) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, match.start)) +
      '<mark>' + escapeHtml(text.slice(match.start, match.end)) + '</mark>' +
      escapeHtml(text.slice(match.end))
    );
  }

  function bestTier(text, query) {
    const match = findMatch(text, query);
    return match ? match.tier : null;
  }

  function searchDataset(query) {
    const results = [];
    SEARCH_INDEX.forEach(function (entry) {
      const tiers = [
        bestTier(entry.title, query),
        bestTier(entry.description, query),
        bestTier(entry.category, query),
        bestTier(entry.author, query)
      ].filter(function (t) { return t !== null; });

      if (tiers.length === 0) return;

      results.push({
        entry: entry,
        overallTier: Math.min.apply(null, tiers),
        titleTier: bestTier(entry.title, query)
      });
    });

    // Rank: best overall field match first, title matches break ties,
    // original dataset order breaks further ties for stability.
    results.sort(function (a, b) {
      if (a.overallTier !== b.overallTier) return a.overallTier - b.overallTier;
      const aTitle = a.titleTier === null ? 3 : a.titleTier;
      const bTitle = b.titleTier === null ? 3 : b.titleTier;
      return aTitle - bTitle;
    });

    return results.map(function (r) { return r.entry; });
  }

  function renderResults(query) {
    const matches = searchDataset(query);

    searchResultsList.innerHTML = matches
      .map(function (entry) {
        return (
          '<li><button type="button" class="search-item" data-query="' + escapeHtml(entry.title) + '">' +
          '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/></svg>' +
          '<span class="search-item-text">' + highlightText(entry.title, query) + '</span>' +
          '<span class="search-item-type">' + entry.type + '</span>' +
          '</button></li>'
        );
      })
      .join('');

    resultsSection.hidden = matches.length === 0;
    searchEmpty.hidden = matches.length !== 0;
    activeIndex = -1;
  }

  function openSearchPanel() {
    searchPanel.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
  }
  function closeSearchPanel() {
    searchPanel.hidden = true;
    searchInput.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
  }

  function updateHasValue() {
    searchWrap.classList.toggle('has-value', searchInput.value.length > 0);
  }

  function showRecent() {
    recentSection.hidden = false;
    resultsSection.hidden = true;
    searchEmpty.hidden = true;
    activeIndex = -1;
  }

  searchInput.addEventListener('focus', function () {
    openSearchPanel();
    if (!searchInput.value.trim()) showRecent();
  });

  // Debounce (~250ms) so rapid typing doesn't re-rank on every keystroke.
  let searchDebounceTimer = null;
  searchInput.addEventListener('input', function () {
    updateHasValue();
    const query = searchInput.value.trim();
    if (!query) {
      clearTimeout(searchDebounceTimer);
      showRecent();
      return;
    }
    recentSection.hidden = true;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function () { renderResults(query); }, 250);
  });

  if (searchClear) {
    searchClear.addEventListener('click', function () {
      searchInput.value = '';
      updateHasValue();
      showRecent();
      searchInput.focus();
    });
  }

  document.addEventListener('click', function (event) {
    if (!searchWrap.contains(event.target)) closeSearchPanel();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !searchPanel.hidden) {
      closeSearchPanel();
      searchInput.blur();
    }
    // "/" focuses search, like Linear/GitHub — only when not already typing.
    if (event.key === '/' && document.activeElement !== searchInput && !isTypingTarget(event.target)) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  function isTypingTarget(el) {
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
  }

  // ---- Keyboard navigation (↑ ↓ Enter) within whichever list is visible ----
  let activeIndex = -1;

  function getVisibleItems() {
    if (!resultsSection.hidden) return Array.prototype.slice.call(searchResultsList.querySelectorAll('.search-item'));
    if (!recentSection.hidden) return Array.prototype.slice.call(recentSearchList.querySelectorAll('.search-item'));
    return [];
  }

  function setActiveIndex(nextIndex, items) {
    items.forEach(function (item) { item.classList.remove('is-highlighted'); });
    activeIndex = nextIndex;
    const active = items[activeIndex];
    if (active) {
      active.classList.add('is-highlighted');
      active.scrollIntoView({ block: 'nearest' });
      searchInput.setAttribute('aria-activedescendant', active.id || '');
    } else {
      searchInput.setAttribute('aria-activedescendant', '');
    }
  }

  searchInput.addEventListener('keydown', function (event) {
    if (searchPanel.hidden) return;
    const items = getVisibleItems();
    if (!items.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((activeIndex + 1) % items.length, items);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((activeIndex - 1 + items.length) % items.length, items);
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        event.preventDefault();
        items[activeIndex].click();
      }
    }
  });

  // Recent-search chips and live results both fill the input and re-search.
  document.getElementById('recentSearchList').addEventListener('click', handleSearchItemClick);
  searchResultsList.addEventListener('click', handleSearchItemClick);

  function handleSearchItemClick(event) {
    const item = event.target.closest('.search-item');
    if (!item) return;
    searchInput.value = item.dataset.query;
    updateHasValue();
    searchInput.focus();
    recentSection.hidden = true;
    renderResults(item.dataset.query);
  }

  /* ---------------- Mini calendar ---------------- */
  (function buildMiniCalendar() {
    const grid = document.getElementById('miniCalendarGrid');
    const label = document.getElementById('miniCalendarLabel');
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    label.textContent = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let html = weekdays.map(function (day) {
      return '<span class="mini-cal-weekday">' + day + '</span>';
    }).join('');

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Leading days from the previous month, muted.
    for (let i = firstDay - 1; i >= 0; i--) {
      html += '<span class="mini-cal-day is-muted">' + (daysInPrevMonth - i) + '</span>';
    }
    // Current month, with today highlighted.
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate();
      html += '<span class="mini-cal-day' + (isToday ? ' is-today' : '') + '">' + d + '</span>';
    }
    // Trailing days to complete the final week.
    const totalCells = firstDay + daysInMonth;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= trailing; d++) {
      html += '<span class="mini-cal-day is-muted">' + d + '</span>';
    }

    grid.innerHTML = html;
  })();

  /* ============================================================
     EVENT DATA (dummy — replace with a real API response later)
     ============================================================ */
  const CATEGORY_META = {
    Hackathon: { tag: 'tag--hackathon', banner: 'event-card-banner--purple', icon: 'code' },
    Workshop: { tag: 'tag--workshop', banner: 'event-card-banner--orange', icon: 'tool' },
    Seminar: { tag: 'tag--seminar', banner: 'event-card-banner', icon: 'mic' },
    Placement: { tag: 'tag--placement', banner: 'event-card-banner--teal', icon: 'briefcase' },
    Cultural: { tag: 'tag--cultural', banner: 'event-card-banner--red', icon: 'star' },
    Sports: { tag: 'tag--sports', banner: 'event-card-banner--green', icon: 'trophy' },
    Technical: { tag: 'tag--technical', banner: 'event-card-banner', icon: 'cpu' },
    Club: { tag: 'tag--club', banner: 'event-card-banner--purple', icon: 'users' }
  };

  const ICON_PATHS = {
    code: '<path d="M9 8L4.5 12l4.5 4M15 8l4.5 4-4.5 4M13.5 6l-3 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    tool: '<path d="M14.5 6.5a3.5 3.5 0 0 1 4.6 4.6l-7 7a2 2 0 0 1-2.8 0L7 15.8a2 2 0 0 1 0-2.8l7-7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 18l-1.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    mic: '<rect x="9.5" y="3.5" width="5" height="10" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5M9 20.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    briefcase: '<rect x="3.5" y="8" width="17" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 8V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3.5 13h17" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.7l-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    trophy: '<path d="M7 4.5h10v5a5 5 0 0 1-10 0v-5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 6H4.5a2 2 0 0 0 0 4H7M17 6h2.5a2 2 0 0 1 0 4H17M9.5 19.5h5M12 14.5v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    cpu: '<rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="10" y="10" width="4" height="4" stroke="currentColor" stroke-width="1.6"/><path d="M9 3.5V7M15 3.5V7M9 17v3.5M15 17v3.5M3.5 9H7M3.5 15H7M17 9h3.5M17 15h3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    users: '<circle cx="8.5" cy="9" r="3" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="10.5" r="2.4" stroke="currentColor" stroke-width="1.6"/><path d="M3 19c0-2.8 2.5-4.5 5.5-4.5S14 16.2 14 19M14.5 19c0-2.1 1.7-3.6 4-3.6S21 17.4 21 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
  };

  function iconSvg(key, size) {
    size = size || 28;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" aria-hidden="true">' + ICON_PATHS[key] + '</svg>';
  }

  const EVENTS = [
    {
      id: 'evt-01',
      title: 'CodeSprint 2026 — 24-Hour Hackathon',
      category: 'Hackathon',
      description: 'Build a working product in 24 hours across open, fintech and climate tracks. Mentors on-site, prizes for the top three teams, and a demo day judged by industry engineers.',
      date: 'Aug 8, 2026',
      time: '9:00 AM — Aug 9, 9:00 AM',
      venue: 'Innovation Lab, Block C',
      organizer: 'Coding Club',
      speaker: 'Judged by engineers from Razorpay, Zerodha & Freshworks',
      eligibility: 'Teams of 2–4, all years, at least one laptop per team',
      schedule: '9:00 AM Kickoff & team formation · 11:00 AM Hacking begins · Day 2, 9:00 AM Submissions close · 11:00 AM Demos & judging · 2:00 PM Awards',
      seatsTotal: 120,
      seatsLeft: 18,
      deadline: 'Aug 5, 2026',
      featured: true
    },
    {
      id: 'evt-02',
      title: 'AI Workshop: Building with LLMs',
      category: 'Workshop',
      description: 'A hands-on workshop covering prompt design, embeddings and building a small LLM-powered app from scratch.',
      date: 'Aug 3, 2026',
      time: '10:00 AM — 1:00 PM',
      venue: 'Seminar Hall 2',
      organizer: 'AI & ML Club',
      speaker: 'Dr. Ananya Rao, AI & ML Club Faculty Advisor',
      eligibility: 'Open to all years · Laptop required · Basic Python helpful',
      schedule: '10:00 Intro to LLMs · 10:45 Prompting & embeddings · 12:00 Build-along session · 12:45 Q&A',
      seatsTotal: 60,
      seatsLeft: 12,
      deadline: 'Aug 1, 2026'
    },
    {
      id: 'evt-03',
      title: 'Google Cloud Study Jam',
      category: 'Seminar',
      description: 'An introductory session on Google Cloud fundamentals, followed by guided labs and free credits for participants.',
      date: 'Aug 5, 2026',
      time: '2:00 PM — 4:30 PM',
      venue: 'Auditorium A',
      organizer: 'GDG Campus Chapter',
      speaker: 'Google Developer Expert — Cloud',
      eligibility: 'Open to all students · Bring a laptop',
      schedule: '2:00 Cloud fundamentals talk · 2:45 Guided labs · 4:00 Credits & certificates',
      seatsTotal: 80,
      seatsLeft: 41,
      deadline: 'Aug 4, 2026'
    },
    {
      id: 'evt-04',
      title: 'TCS Campus Placement Drive',
      category: 'Placement',
      description: 'On-campus recruitment drive for final-year students via the TCS National Qualifier Test, followed by technical and HR rounds.',
      date: 'Aug 12, 2026',
      time: '8:30 AM onwards',
      venue: 'Placement Cell, Admin Block',
      organizer: 'Placement Cell',
      speaker: 'TCS Talent Acquisition Team',
      eligibility: 'Final-year students · Minimum 6.5 CGPA · No active backlog',
      schedule: '8:30 Reporting & ID check · 9:00 NQT · 12:00 Technical interviews · 3:00 HR round',
      seatsTotal: 200,
      seatsLeft: 54,
      deadline: 'Aug 6, 2026'
    },
    {
      id: 'evt-05',
      title: 'Robotics Workshop: Build Your First Bot',
      category: 'Workshop',
      description: 'Assemble and program a line-following robot from scratch. Kits provided — take your bot home at the end of the session.',
      date: 'Aug 10, 2026',
      time: '11:00 AM — 3:00 PM',
      venue: 'Robotics Lab, Block D',
      organizer: 'Robotics Club',
      speaker: 'Robotics Club Senior Members',
      eligibility: 'Open to all years · No prior experience needed',
      schedule: '11:00 Kit assembly · 1:00 Programming basics · 2:00 Test runs & mini race',
      seatsTotal: 40,
      seatsLeft: 6,
      deadline: 'Aug 8, 2026'
    },
    {
      id: 'evt-06',
      title: 'Cultural Fest — Rangotsav 2026',
      category: 'Cultural',
      description: 'A day of music, dance, drama and art competitions celebrating campus talent, capped off with a live band performance.',
      date: 'Aug 15, 2026',
      time: '4:00 PM — 10:00 PM',
      venue: 'Main Amphitheatre',
      organizer: 'Cultural Committee',
      speaker: 'Live performance by campus bands & guest artists',
      eligibility: 'Open to all students · Free entry with college ID',
      schedule: '4:00 Art & dance competitions · 7:00 Drama showcase · 8:30 Live band performance',
      seatsTotal: 500,
      seatsLeft: 230,
      deadline: 'Aug 14, 2026'
    },
    {
      id: 'evt-07',
      title: 'Inter-College Cricket Tournament',
      category: 'Sports',
      description: 'A knockout cricket tournament between teams from six neighbouring colleges. Come cheer for the home team.',
      date: 'Aug 9, 2026',
      time: '7:30 AM onwards',
      venue: 'Main Sports Ground',
      organizer: 'Sports Committee',
      speaker: 'Umpired by certified match officials',
      eligibility: 'Registered team players · Spectators welcome',
      schedule: '7:30 Reporting · 8:00 Quarter-finals · 1:00 Semi-finals · 4:00 Final',
      seatsTotal: 300,
      seatsLeft: 5,
      deadline: 'Aug 7, 2026'
    },
    {
      id: 'evt-08',
      title: 'Resume Building & LinkedIn Masterclass',
      category: 'Seminar',
      description: 'Learn how to structure a recruiter-ready resume and optimize your LinkedIn profile ahead of placement season.',
      date: 'Aug 4, 2026',
      time: '3:00 PM — 5:00 PM',
      venue: 'Seminar Hall 1',
      organizer: 'Training & Placement Cell',
      speaker: 'Career Coach, Alumni Relations Office',
      eligibility: 'Pre-final and final-year students',
      schedule: '3:00 Resume structure & ATS tips · 4:00 LinkedIn profile audit · 4:45 Q&A',
      seatsTotal: 100,
      seatsLeft: 37,
      deadline: 'Aug 3, 2026'
    },
    {
      id: 'evt-09',
      title: 'Cyber Security Awareness Seminar',
      category: 'Seminar',
      description: 'An overview of common attack vectors, safe browsing practices, and a live demo of a phishing simulation.',
      date: 'Aug 6, 2026',
      time: '1:00 PM — 3:00 PM',
      venue: 'Auditorium B',
      organizer: 'Cyber Security Cell',
      speaker: 'Security Analyst, Campus IT Team',
      eligibility: 'Open to all students and staff',
      schedule: '1:00 Common attack vectors · 1:45 Live phishing demo · 2:30 Safe practices & Q&A',
      seatsTotal: 90,
      seatsLeft: 62,
      deadline: 'Aug 5, 2026'
    },
    {
      id: 'evt-10',
      title: 'Flutter Bootcamp: Zero to App',
      category: 'Technical',
      description: 'A two-day intensive bootcamp on building cross-platform mobile apps with Flutter, ending with a mini app you ship yourself.',
      date: 'Aug 16 – 17, 2026',
      time: '10:00 AM — 4:00 PM (both days)',
      venue: 'Computer Lab 3',
      organizer: 'App Development Club',
      speaker: 'App Development Club Core Team',
      eligibility: 'Basic programming knowledge required · Laptop required',
      schedule: 'Day 1: Flutter basics & UI · Day 2: State management & shipping your app',
      seatsTotal: 45,
      seatsLeft: 0,
      deadline: 'Aug 12, 2026'
    },
    {
      id: 'evt-11',
      title: 'Coding Club Open Meetup',
      category: 'Club',
      description: 'A casual monthly meetup for the Coding Club — lightning talks, pair programming, and planning the next hackathon.',
      date: 'Aug 2, 2026',
      time: '5:00 PM — 6:30 PM',
      venue: 'Innovation Lab, Block C',
      organizer: 'Coding Club',
      speaker: 'Open floor — all members welcome to present',
      eligibility: 'Open to all Coding Club members and prospective members',
      schedule: '5:00 Lightning talks · 5:45 Pair programming · 6:15 Planning for CodeSprint',
      seatsTotal: 50,
      seatsLeft: 29,
      deadline: 'Aug 2, 2026'
    }
  ];

  // In-memory only — resets on page reload. A real backend would persist this.
  const registeredIds = new Set();
  const bookmarkedIds = new Set();

  /* ============================================================
     RENDER: Featured event
     ============================================================ */
  const featuredEventMount = document.getElementById('featuredEventMount');

  function renderFeaturedEvent() {
    const event = EVENTS.find(function (e) { return e.featured; }) || EVENTS[0];
    const meta = CATEGORY_META[event.category];
    const isRegistered = registeredIds.has(event.id);
    const seatsLow = event.seatsLeft <= Math.max(5, Math.round(event.seatsTotal * 0.1));

    featuredEventMount.innerHTML =
      '<div class="featured-event">' +
        '<div class="featured-event-banner">' +
          '<span class="featured-pin"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 15.7l-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 2.5Z" fill="currentColor"/></svg>Featured Event</span>' +
          iconSvg(meta.icon, 88) +
        '</div>' +
        '<div class="featured-event-body">' +
          '<div class="featured-event-top">' +
            '<span class="tag ' + meta.tag + '">' + event.category + '</span>' +
            (seatsLow ? '<span class="priority priority--high">Few seats left</span>' : '') +
          '</div>' +
          '<h2 class="featured-event-title">' + event.title + '</h2>' +
          '<p class="featured-event-desc">' + event.description + '</p>' +
          '<div class="featured-event-meta">' +
            '<span class="featured-meta-item">' + metaIcon('calendar') + '<strong>' + event.date + '</strong></span>' +
            '<span class="featured-meta-item">' + metaIcon('clock') + event.time + '</span>' +
            '<span class="featured-meta-item">' + metaIcon('pin') + event.venue + '</span>' +
            '<span class="featured-meta-item">' + metaIcon('seat') + '<strong>' + event.seatsLeft + '</strong>&nbsp;of ' + event.seatsTotal + ' seats left</span>' +
            '<span class="featured-meta-item">' + metaIcon('user') + event.organizer + '</span>' +
            '<span class="featured-meta-item">' + metaIcon('flag') + 'Register by ' + event.deadline + '</span>' +
          '</div>' +
          '<div class="featured-event-actions">' +
            '<button type="button" class="btn btn-primary event-register' + (isRegistered ? ' is-registered' : '') + '" data-event-id="' + event.id + '"' + (isRegistered ? ' disabled' : '') + '>' +
              (isRegistered
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Registered'
                : 'Register Now') +
            '</button>' +
            '<button type="button" class="btn btn-outline event-add-calendar" data-event-id="' + event.id + '">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9.5h17M8 3v4M16 3v4M12 13v4M10 15h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' +
              'Add to Calendar' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function metaIcon(key) {
    const paths = {
      calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      clock: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      pin: '<path d="M12 21s7-6.6 7-11.5a7 7 0 0 0-14 0C5 14.4 12 21 12 21Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.6"/>',
      seat: '<path d="M6 10V6.5A2.5 2.5 0 0 1 8.5 4h7A2.5 2.5 0 0 1 18 6.5V10M5 10h14a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v3.5M6 15v3.5M4.5 11h15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      user: '<circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.6"/><path d="M4.8 19.2c1.1-3.1 3.9-4.7 7.2-4.7s6.1 1.6 7.2 4.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      flag: '<path d="M6 21V4M6 4h11l-2.5 3.5L17 11H6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
    };
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">' + paths[key] + '</svg>';
  }

  /* ============================================================
     RENDER: Event card grid
     ============================================================ */
  const eventsGrid = document.getElementById('eventsGrid');
  const eventsPageEmpty = document.getElementById('eventsPageEmpty');
  const PAGE_SIZE = 6;
  let currentPage = 1;
  let filteredEvents = EVENTS.slice();

  function cardMetaRow(iconKey, text) {
    return '<span class="event-meta-row">' + metaIcon(iconKey) + '<span>' + text + '</span></span>';
  }

  function renderEventCard(event) {
    const meta = CATEGORY_META[event.category];
    const isRegistered = registeredIds.has(event.id);
    const isBookmarked = bookmarkedIds.has(event.id);
    const soldOut = event.seatsLeft <= 0;
    const seatsLow = !soldOut && event.seatsLeft <= Math.max(5, Math.round(event.seatsTotal * 0.1));

    return (
      '<article class="event-card" data-event-id="' + event.id + '" data-category="' + event.category.toLowerCase() + '" ' +
      'data-search="' + (event.title + ' ' + event.description + ' ' + event.category + ' ' + event.organizer).toLowerCase().replace(/"/g, '&quot;') + '">' +
        '<div class="event-card-banner ' + meta.banner + '">' +
          '<span class="event-card-category tag ' + meta.tag + '">' + event.category + '</span>' +
          iconSvg(meta.icon, 30) +
        '</div>' +
        '<div class="event-card-body">' +
          '<h3 class="event-card-title">' + event.title + '</h3>' +
          '<p class="event-card-desc">' + event.description + '</p>' +
          '<div class="event-card-meta">' +
            cardMetaRow('calendar', event.date) +
            cardMetaRow('clock', event.time) +
            cardMetaRow('pin', event.venue) +
            cardMetaRow('user', event.organizer) +
          '</div>' +
          '<div class="event-card-highlight">' +
            '<span class="event-seats' + (seatsLow ? ' is-low' : '') + '">' + (soldOut ? 'Sold out' : event.seatsLeft + ' seats left') + '</span>' +
            '<span class="event-deadline">Register by ' + event.deadline + '</span>' +
          '</div>' +
          '<div class="event-card-actions">' +
            '<button type="button" class="btn btn-sm btn-primary event-register' + (isRegistered ? ' is-registered' : '') + '" data-event-id="' + event.id + '"' + ((isRegistered || soldOut) ? ' disabled' : '') + '>' +
              (isRegistered ? 'Registered' : (soldOut ? 'Sold Out' : 'Register')) +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-outline event-view-details" data-event-id="' + event.id + '">View Details</button>' +
            '<div class="card-actions">' +
              '<button type="button" class="icon-btn bookmark-btn' + (isBookmarked ? ' is-bookmarked' : '') + '" data-event-id="' + event.id + '" aria-pressed="' + isBookmarked + '" aria-label="' + (isBookmarked ? 'Remove bookmark' : 'Bookmark this event') + '">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-3.8L5.5 20V5.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
              '</button>' +
              '<button type="button" class="icon-btn share-btn" data-event-id="' + event.id + '" aria-label="Share this event">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M8.2 10.7l7.6-4.2M8.2 13.3l7.6 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderEventsGrid() {
    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredEvents.slice(start, start + PAGE_SIZE);

    eventsGrid.innerHTML = pageItems.map(renderEventCard).join('');
    eventsPageEmpty.classList.toggle('is-visible', filteredEvents.length === 0);
    renderPagination(totalPages);
  }

  /* ============================================================
     FILTERS + SEARCH (combined)
     ============================================================ */
  const eventsSearchInput = document.getElementById('eventsPageSearch');
  const eventsFilterChips = document.getElementById('eventsPageFilters');
  let activeCategoryFilter = 'all';

  function applyFilters() {
    const query = (eventsSearchInput.value || '').trim().toLowerCase();
    filteredEvents = EVENTS.filter(function (event) {
      const matchesCategory = activeCategoryFilter === 'all' || event.category.toLowerCase() === activeCategoryFilter;
      const haystack = (event.title + ' ' + event.description + ' ' + event.category + ' ' + event.organizer).toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesCategory && matchesQuery;
    });
    currentPage = 1;
    renderEventsGrid();
  }

  let eventsSearchDebounce = null;
  eventsSearchInput.addEventListener('input', function () {
    clearTimeout(eventsSearchDebounce);
    eventsSearchDebounce = setTimeout(applyFilters, 250);
  });

  eventsFilterChips.addEventListener('click', function (event) {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    eventsFilterChips.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('is-active'); });
    chip.classList.add('is-active');
    activeCategoryFilter = chip.dataset.filter;
    applyFilters();
  });

  /* ============================================================
     PAGINATION
     ============================================================ */
  const paginationMount = document.getElementById('paginationMount');

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationMount.innerHTML = '';
      return;
    }
    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
      pagesHtml += '<button type="button" class="pagination-page' + (i === currentPage ? ' is-active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    paginationMount.innerHTML =
      '<nav class="pagination" aria-label="Events pagination">' +
        '<button type="button" class="pagination-btn pagination-prev" id="eventsPaginationPrev"' + (currentPage === 1 ? ' disabled' : '') + '>' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Previous' +
        '</button>' +
        '<div class="pagination-pages">' + pagesHtml + '</div>' +
        '<button type="button" class="pagination-btn pagination-next" id="eventsPaginationNext"' + (currentPage === totalPages ? ' disabled' : '') + '>' +
          'Next<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
      '</nav>';
  }

  paginationMount.addEventListener('click', function (event) {
    const pageBtn = event.target.closest('.pagination-page');
    const prevBtn = event.target.closest('#eventsPaginationPrev');
    const nextBtn = event.target.closest('#eventsPaginationNext');
    if (pageBtn) currentPage = Number(pageBtn.dataset.page);
    else if (prevBtn && currentPage > 1) currentPage -= 1;
    else if (nextBtn) currentPage += 1;
    else return;
    renderEventsGrid();
    document.getElementById('eventsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ============================================================
     EVENT DETAILS MODAL
     ============================================================ */
  const eventModalOverlay = document.getElementById('eventModalOverlay');
  const eventModalBadges = document.getElementById('eventModalBadges');
  const eventModalTitle = document.getElementById('eventModalTitle');
  const eventModalBanner = document.getElementById('eventModalBanner');
  const eventModalDesc = document.getElementById('eventModalDesc');
  const eventModalMeta = document.getElementById('eventModalMeta');
  const eventModalSchedule = document.getElementById('eventModalSchedule');
  const eventModalEligibility = document.getElementById('eventModalEligibility');
  const eventModalRegisterBtn = document.getElementById('eventModalRegisterBtn');
  const eventModalClose = document.getElementById('eventModalClose');
  const eventModalCloseFooter = document.getElementById('eventModalCloseFooter');
  const eventModalDownload = document.getElementById('eventModalDownload');

  let modalEventId = null;
  let lastFocusedEl = null;

  function findEvent(id) {
    return EVENTS.find(function (e) { return e.id === id; });
  }

  function openEventModal(eventId, trigger) {
    const event = findEvent(eventId);
    if (!event) return;
    modalEventId = eventId;
    const meta = CATEGORY_META[event.category];
    const isRegistered = registeredIds.has(event.id);
    const soldOut = event.seatsLeft <= 0;

    eventModalBadges.innerHTML =
      '<span class="tag ' + meta.tag + '">' + event.category + '</span>' +
      (soldOut ? '<span class="priority priority--high">Sold out</span>' : (event.seatsLeft <= 5 ? '<span class="priority priority--medium">Few seats left</span>' : ''));
    eventModalTitle.textContent = event.title;
    eventModalBanner.className = 'modal-event-banner ' + meta.banner;
    eventModalBanner.innerHTML = iconSvg(meta.icon, 56);
    eventModalDesc.textContent = event.description;

    eventModalMeta.innerHTML =
      '<span class="modal-meta-item">' + metaIcon('calendar') + event.date + '</span>' +
      '<span class="modal-meta-item">' + metaIcon('clock') + event.time + '</span>' +
      '<span class="modal-meta-item">' + metaIcon('pin') + event.venue + '</span>' +
      '<span class="modal-meta-item">' + metaIcon('user') + event.speaker + '</span>' +
      '<span class="modal-meta-item">' + metaIcon('seat') + event.seatsLeft + ' of ' + event.seatsTotal + ' seats left</span>';

    eventModalSchedule.textContent = event.schedule;
    eventModalEligibility.textContent = event.eligibility;

    eventModalRegisterBtn.dataset.eventId = event.id;
    updateRegisterButton(eventModalRegisterBtn, event);

    lastFocusedEl = trigger || document.activeElement;
    eventModalOverlay.hidden = false;
    requestAnimationFrame(function () { eventModalOverlay.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    eventModalClose.focus();
  }

  function closeEventModal() {
    eventModalOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { eventModalOverlay.hidden = true; }, 200);
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  eventModalClose.addEventListener('click', closeEventModal);
  eventModalCloseFooter.addEventListener('click', closeEventModal);
  eventModalOverlay.addEventListener('click', function (event) {
    if (event.target === eventModalOverlay) closeEventModal();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && eventModalOverlay.classList.contains('is-open')) closeEventModal();
  });

  if (eventModalDownload) {
    eventModalDownload.addEventListener('click', function () {
      eventModalDownload.textContent = 'Downloaded';
      setTimeout(function () {
        eventModalDownload.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7.5 11.5L12 16l4.5-4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 18.5h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>Download Brochure';
      }, 1600);
    });
  }

  /* ============================================================
     REGISTRATION (dummy — frontend only)
     ============================================================ */
  function updateRegisterButton(button, event) {
    const soldOut = event.seatsLeft <= 0 && !registeredIds.has(event.id);
    const isRegistered = registeredIds.has(event.id);
    button.disabled = isRegistered || soldOut;
    button.classList.toggle('is-registered', isRegistered);
    button.innerHTML = isRegistered
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Registered'
      : (soldOut ? 'Sold Out' : 'Register Now');
  }

  function registerForEvent(eventId) {
    const event = findEvent(eventId);
    if (!event || registeredIds.has(eventId) || event.seatsLeft <= 0) return;
    registeredIds.add(eventId);
    event.seatsLeft = Math.max(0, event.seatsLeft - 1);

    // Refresh every place this event might currently be rendered.
    renderEventsGrid();
    renderFeaturedEvent();
    if (modalEventId === eventId) updateRegisterButton(eventModalRegisterBtn, event);
    renderMyRegistrations();

    // Call backend API if authenticated
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    if (token && event._rawId) {
      fetch(API_BASE + '/events/' + encodeURIComponent(event._rawId) + '/register', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      }).catch(function () {});
    }
  }

  /* ============================================================
     DELEGATED CLICK HANDLING — cards, featured event & modal are
     all rendered dynamically, so events are bound on containers.
     ============================================================ */
  function handleActionClick(event) {
    const registerBtn = event.target.closest('.event-register');
    const detailsBtn = event.target.closest('.event-view-details');
    const bookmarkBtn = event.target.closest('.bookmark-btn');
    const shareBtn = event.target.closest('.share-btn');
    const calendarBtn = event.target.closest('.event-add-calendar');

    if (registerBtn && !registerBtn.disabled) {
      registerForEvent(registerBtn.dataset.eventId);
      return;
    }
    if (detailsBtn) {
      openEventModal(detailsBtn.dataset.eventId, detailsBtn);
      return;
    }
    if (bookmarkBtn) {
      const id = bookmarkBtn.dataset.eventId;
      const isBookmarked = bookmarkedIds.has(id);
      if (isBookmarked) bookmarkedIds.delete(id); else bookmarkedIds.add(id);
      bookmarkBtn.classList.toggle('is-bookmarked', !isBookmarked);
      bookmarkBtn.setAttribute('aria-pressed', String(!isBookmarked));
      bookmarkBtn.setAttribute('aria-label', !isBookmarked ? 'Remove bookmark' : 'Bookmark this event');
      return;
    }
    if (shareBtn) {
      if (shareBtn.classList.contains('is-copied')) return;
      shareBtn.classList.add('is-copied');
      setTimeout(function () { shareBtn.classList.remove('is-copied'); }, 1600);
      return;
    }
    if (calendarBtn) {
      calendarBtn.classList.add('is-copied');
      const original = calendarBtn.innerHTML;
      calendarBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Added';
      setTimeout(function () { calendarBtn.innerHTML = original; calendarBtn.classList.remove('is-copied'); }, 1600);
      return;
    }
  }

  eventsGrid.addEventListener('click', handleActionClick);
  featuredEventMount.addEventListener('click', handleActionClick);
  document.getElementById('eventModalFooter').addEventListener('click', function (event) {
    const registerBtn = event.target.closest('.event-register');
    if (registerBtn && !registerBtn.disabled) registerForEvent(registerBtn.dataset.eventId);
  });

  /* ============================================================
     PAGE HEADER — Refresh & View Calendar
     ============================================================ */
  const refreshBtn = document.getElementById('eventsRefreshBtn');
  const viewCalendarBtn = document.getElementById('eventsViewCalendarBtn');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      if (refreshBtn.classList.contains('is-refreshing')) return;
      refreshBtn.classList.add('is-refreshing');
      eventsSearchInput.value = '';
      activeCategoryFilter = 'all';
      eventsFilterChips.querySelectorAll('.filter-chip').forEach(function (c, i) {
        c.classList.toggle('is-active', i === 0);
      });
      setTimeout(function () {
        applyFilters();
        renderFeaturedEvent();
        refreshBtn.classList.remove('is-refreshing');
      }, 500);
    });
  }

  if (viewCalendarBtn) {
    viewCalendarBtn.addEventListener('click', function () {
      const calendarPanel = document.getElementById('calendarPreviewPanel');
      if (!calendarPanel) return;
      calendarPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      calendarPanel.classList.add('is-pulsing');
      setTimeout(function () { calendarPanel.classList.remove('is-pulsing'); }, 1200);
    });
  }

  /* ============================================================
     RIGHT SIDEBAR — My Registered Events (updates on registration)
     ============================================================ */
  const myRegistrationsMount = document.getElementById('myRegistrationsList');

  function renderMyRegistrations() {
    if (!myRegistrationsMount) return;
    const items = EVENTS.filter(function (e) { return registeredIds.has(e.id); });
    if (items.length === 0) {
      myRegistrationsMount.innerHTML = '<p class="empty-hint">You haven\'t registered for any events yet.</p>';
      return;
    }
    myRegistrationsMount.innerHTML = items.map(function (event) {
      return (
        '<div class="mini-event-item">' +
          '<span class="mini-event-dot schedule-dot--green" aria-hidden="true"></span>' +
          '<div><p class="mini-event-title">' + event.title + '</p>' +
          '<p class="mini-event-sub">' + event.date + ' · ' + event.venue + '</p></div>' +
        '</div>'
      );
    }).join('');
  }

  /* ============================================================
     INITIAL RENDER
     ============================================================ */
  renderFeaturedEvent();
  renderEventsGrid();
  renderMyRegistrations();

  (function loadLiveEvents() {
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

    fetch(API_BASE + '/events?limit=50', { headers: headers })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const liveEvents = res.data.map(function (d, i) {
            const dateStr = d.startDate ? new Date(d.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
            const cat = d.category || 'Technical';
            return {
              id: d.eventId || ('evt-' + (i + 1)),
              _rawId: d.id,
              title: d.title,
              category: cat,
              description: d.description || '',
              date: dateStr,
              time: d.startTime ? (d.startTime + (d.endTime ? ' — ' + d.endTime : '')) : '10:00 AM — 1:00 PM',
              venue: d.venue || 'Campus Main',
              organizer: d.organizer || 'VectorOne Campus',
              speaker: d.description ? d.description.slice(0, 80) : '',
              eligibility: 'Open to all students',
              schedule: 'Detailed schedule available at the venue',
              seatsTotal: d.capacity || 100,
              seatsLeft: d.capacity ? Math.max(0, d.capacity - (d._count?.registrations || 0)) : 40,
              deadline: dateStr,
              featured: i === 0
            };
          });

          EVENTS.length = 0;
          liveEvents.forEach(function (e) { EVENTS.push(e); });
          renderFeaturedEvent();
          renderEventsGrid();
          renderMyRegistrations();
        }
      })
      .catch(function () {});
  })();

  /* ---------------- Button ripple (delegated — cards render dynamically) ---------------- */
  document.addEventListener('click', function (event) {
    const button = event.target.closest('.btn');
    if (!button || button.disabled) return;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
    button.style.position = button.style.position || 'relative';
    button.appendChild(ripple);
    ripple.addEventListener('animationend', function () { ripple.remove(); });
  });
})();
