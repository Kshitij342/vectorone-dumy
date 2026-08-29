/* ============================================================
   VectorOne — Student Calendar Page Logic
   Self-contained script for calendar.html. Ships the same app-shell
   behaviors as dashboard.js / notices.js / events.js (theme, sidebar,
   popovers, global search) plus the Calendar-page-specific modules:

     DATA        — mock dataset + a thin Api layer shaped to match
                   the real backend routes this will call later
                   (GET /api/calendar, /events, /today, /upcoming,
                   /holidays, /date/:id) — see the Api object below.
     UTILITIES   — date math / formatting helpers.
     RENDER      — pure DOM-building functions (summary cards, the
                   month/week/day grid, sidebar panels, drawer, modal).
     EVENT HANDLING — listeners that call RENDER after DATA changes
                   (navigation, filters, search, clicks).

   No backend calls yet — Api.* functions resolve from the local
   mock dataset via a Promise, so swapping in real fetch() calls
   later is a one-line change per function.
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

  /* ============================================================
     DATA — mock dataset + Api layer
     ============================================================
     The functions below are shaped exactly like what a real fetch()
     call would return, so wiring this to a backend later means
     replacing the body of each Api.* function with a fetch() call —
     nothing in RENDER or EVENT HANDLING needs to change.

       Api.getCalendar()        -> GET /api/calendar
       Api.getEvents(range)     -> GET /api/calendar/events?from=&to=
       Api.getToday()           -> GET /api/calendar/today
       Api.getUpcoming()        -> GET /api/calendar/upcoming
       Api.getHolidays()        -> GET /api/calendar/holidays
       Api.getDate(dateKey)     -> GET /api/calendar/date/:id
     ============================================================ */

  // Fixed "today" for this demo build so the seed data reads naturally.
  const TODAY = new Date(2026, 6, 30); // July 30, 2026
  TODAY.setHours(0, 0, 0, 0);

  const EVENT_TYPES = {
    assignment: { label: 'Assignment', tag: 'tag--assignment', dot: 'event-dot--assignment', chip: 'calendar-chip--assignment' },
    'cal-event': { label: 'Event', tag: 'tag--cal-event', dot: 'event-dot--cal-event', chip: 'calendar-chip--cal-event' },
    exam: { label: 'Exam', tag: 'tag--exam', dot: 'event-dot--exam', chip: 'calendar-chip--exam' },
    holiday: { label: 'Holiday', tag: 'tag--holiday', dot: 'event-dot--holiday', chip: 'calendar-chip--holiday' },
    class: { label: 'Class', tag: 'tag--class', dot: 'event-dot--class', chip: 'calendar-chip--class' },
    reminder: { label: 'Reminder', tag: 'tag--reminder', dot: 'event-dot--reminder', chip: 'calendar-chip--reminder' }
  };

  // One-off events — assignments, events, exams, holidays, reminders.
  const RAW_EVENTS = [
    { id: 'ev-01', date: '2026-07-29', type: 'exam', title: 'Data Structures Quiz', time: '10:00 AM', location: 'Room 302', faculty: 'Prof. Sharma', status: 'Completed', description: 'A short in-class quiz covering trees, graphs and hashing.', attachment: null },
    { id: 'ev-02', date: '2026-07-30', type: 'reminder', title: 'Library Book Return Due', time: 'All day', location: 'Central Library', faculty: 'Library Office', status: 'Due today', description: 'Return borrowed books to avoid a late fee. Renewals available online.', attachment: null },
    { id: 'ev-03', date: '2026-07-31', type: 'assignment', title: 'DBMS Lab 5 Submission', time: '11:59 PM', location: 'Online Portal', faculty: 'Prof. Sharma', status: 'Upcoming', description: 'Submit the normalized schema and sample queries for Lab 5 on the course portal.', attachment: 'DBMS_Lab5_Guidelines.pdf' },
    { id: 'ev-04', date: '2026-08-02', type: 'cal-event', title: 'Coding Club Open Meetup', time: '5:00 PM – 6:30 PM', location: 'Innovation Lab, Block C', faculty: 'Coding Club', status: 'Upcoming', description: 'A casual monthly meetup — lightning talks, pair programming, and planning the next hackathon.', attachment: null },
    { id: 'ev-05', date: '2026-08-03', type: 'reminder', title: 'Submit Medical Certificate', time: 'All day', location: 'Admin Office', faculty: 'Admin Office', status: 'Upcoming', description: 'Students who missed the Data Structures Quiz on medical grounds must submit a certificate.', attachment: null },
    { id: 'ev-06', date: '2026-08-05', type: 'assignment', title: 'OS Assignment 3 Due', time: '11:59 PM', location: 'Online Portal', faculty: 'Dr. Mehta', status: 'Upcoming', description: 'Implement and report on the producer–consumer problem using semaphores.', attachment: 'OS_Assignment3_Spec.pdf' },
    { id: 'ev-07', date: '2026-08-06', type: 'cal-event', title: 'Resume Building & LinkedIn Masterclass', time: '3:00 PM – 5:00 PM', location: 'Seminar Hall 1', faculty: 'Training & Placement Cell', status: 'Upcoming', description: 'Learn how to structure a recruiter-ready resume and optimize your LinkedIn profile.', attachment: null },
    { id: 'ev-08', date: '2026-08-08', type: 'cal-event', title: 'CodeSprint 2026 Hackathon', time: '9:00 AM – Aug 9, 9:00 AM', location: 'Innovation Lab, Block C', faculty: 'Coding Club', status: 'Upcoming', description: 'Build a working product in 24 hours across open, fintech and climate tracks.', attachment: 'CodeSprint_Rulebook.pdf' },
    { id: 'ev-09', date: '2026-08-10', type: 'exam', title: 'DBMS Internal Exam', time: '10:00 AM – 12:00 PM', location: 'Exam Hall 1', faculty: 'Examination Cell', status: 'Upcoming', description: 'Covers normalization, transactions, and SQL query optimization. Bring your admit card.', attachment: 'DBMS_Exam_Syllabus.pdf' },
    { id: 'ev-10', date: '2026-08-12', type: 'exam', title: 'Operating Systems Mid-Sem', time: '10:00 AM – 12:00 PM', location: 'Exam Hall 2', faculty: 'Examination Cell', status: 'Upcoming', description: 'Covers process scheduling, deadlocks, and memory management.', attachment: 'OS_Exam_Syllabus.pdf' },
    { id: 'ev-11', date: '2026-08-15', type: 'holiday', title: 'Independence Day', time: 'All day', location: 'College Closed', faculty: '—', status: 'Holiday', description: 'National holiday. The campus, library and hostel mess will follow the holiday schedule.', attachment: null },
    { id: 'ev-12', date: '2026-08-16', type: 'cal-event', title: 'Cultural Fest — Rangotsav 2026', time: '4:00 PM – 10:00 PM', location: 'Main Amphitheatre', faculty: 'Cultural Committee', status: 'Upcoming', description: 'A day of music, dance, drama and art competitions celebrating campus talent.', attachment: null },
    { id: 'ev-13', date: '2026-08-18', type: 'assignment', title: 'Web Dev Project Milestone 1', time: '11:59 PM', location: 'Online Portal', faculty: 'Prof. Iyer', status: 'Upcoming', description: 'Submit the wireframes and component breakdown for your team project.', attachment: null },
    { id: 'ev-14', date: '2026-08-21', type: 'exam', title: 'Web Development Quiz', time: '11:00 AM', location: 'Lab 3', faculty: 'Prof. Iyer', status: 'Upcoming', description: 'A short quiz on semantic HTML, flexbox/grid, and accessibility basics.', attachment: null },
    { id: 'ev-15', date: '2026-08-25', type: 'reminder', title: 'Fee Payment Deadline', time: 'All day', location: 'Accounts Office', faculty: 'Accounts Office', status: 'Upcoming', description: 'Semester 5 tuition fee payment closes today. A late fee applies after this date.', attachment: 'Fee_Structure_2026.pdf' },
    { id: 'ev-16', date: '2026-08-28', type: 'holiday', title: 'Raksha Bandhan', time: 'All day', location: 'College Closed', faculty: '—', status: 'Holiday', description: 'National holiday observed across the campus.', attachment: null }
  ];

  // Recurring weekly timetable (day: 0=Sun … 6=Sat) — generates "class" events.
  const TIMETABLE = [
    { day: 1, time: '09:00 AM', endTime: '10:00 AM', title: 'Data Structures', location: 'Room 302', faculty: 'Prof. Sharma' },
    { day: 1, time: '11:00 AM', endTime: '01:00 PM', title: 'Database Systems Lab', location: 'Lab 1', faculty: 'Dr. Mehta' },
    { day: 2, time: '10:00 AM', endTime: '11:00 AM', title: 'Operating Systems', location: 'Room 205', faculty: 'Dr. Mehta' },
    { day: 2, time: '02:00 PM', endTime: '03:00 PM', title: 'Web Development', location: 'Room 210', faculty: 'Prof. Iyer' },
    { day: 3, time: '09:00 AM', endTime: '10:00 AM', title: 'Data Structures', location: 'Room 302', faculty: 'Prof. Sharma' },
    { day: 3, time: '01:00 PM', endTime: '02:00 PM', title: 'Mentor Meeting', location: 'Admin Block', faculty: 'Prof. Sharma' },
    { day: 4, time: '10:00 AM', endTime: '11:00 AM', title: 'Operating Systems', location: 'Room 205', faculty: 'Dr. Mehta' },
    { day: 4, time: '11:00 AM', endTime: '01:00 PM', title: 'Database Systems Lab', location: 'Lab 1', faculty: 'Dr. Mehta' },
    { day: 5, time: '02:00 PM', endTime: '03:00 PM', title: 'Web Development', location: 'Room 210', faculty: 'Prof. Iyer' }
  ];

  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function parseTimeToMinutes(timeStr) {
    const match = /(\d{1,2}):(\d{2})\s?(AM|PM)/i.exec(timeStr || '');
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const isPM = /PM/i.test(match[3]);
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Build the full in-memory event index: raw events + generated class
  // occurrences, skipping class generation on any date marked Holiday.
  function buildEventIndex() {
    const holidayDates = new Set(RAW_EVENTS.filter(function (e) { return e.type === 'holiday'; }).map(function (e) { return e.date; }));
    const index = {};

    RAW_EVENTS.forEach(function (event) {
      if (!index[event.date]) index[event.date] = [];
      index[event.date].push(event);
    });

    // Generate class occurrences across a wide window so every visible
    // month (however far the user navigates) has its recurring classes.
    const rangeStart = new Date(2026, 5, 1);
    const rangeEnd = new Date(2026, 11, 31);
    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      const key = dateKey(d);
      if (holidayDates.has(key)) continue;
      TIMETABLE.filter(function (slot) { return slot.day === d.getDay(); }).forEach(function (slot, i) {
        const classEvent = {
          id: 'class-' + key + '-' + i,
          date: key,
          type: 'class',
          title: slot.title,
          time: slot.time + ' – ' + slot.endTime,
          startMinutes: parseTimeToMinutes(slot.time),
          endMinutes: parseTimeToMinutes(slot.endTime),
          location: slot.location,
          faculty: slot.faculty,
          status: 'Scheduled',
          description: 'Regular scheduled class session.',
          attachment: null
        };
        if (!index[key]) index[key] = [];
        index[key].push(classEvent);
      });
    }

    // Sort each day's events by start time where available.
    Object.keys(index).forEach(function (key) {
      index[key].sort(function (a, b) {
        const am = a.startMinutes != null ? a.startMinutes : (parseTimeToMinutes(a.time) || 0);
        const bm = b.startMinutes != null ? b.startMinutes : (parseTimeToMinutes(b.time) || 0);
        return am - bm;
      });
    });

    return index;
  }

  const EVENT_INDEX = buildEventIndex();

  function eventsOn(key) {
    return EVENT_INDEX[key] || [];
  }

  function eventsInRange(start, end) {
    const out = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push.apply(out, eventsOn(dateKey(d)));
    }
    return out;
  }

  // API connection with fallback to local event index
  const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
  function authHeaders() {
    const t = localStorage.getItem('vectorone_token');
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }

  function mockResolve(value, delay) {
    return new Promise(function (resolve) { setTimeout(function () { resolve(value); }, delay || 180); });
  }

  const Api = {
    getCalendar: function () {
      return fetch(API_BASE + '/calendar/events', { headers: authHeaders() })
        .then(function (r) { return r.json(); })
        .then(function () { return { today: dateKey(TODAY) }; })
        .catch(function () { return { today: dateKey(TODAY) }; });
    },
    getEvents: function (fromDate, toDate) {
      return fetch(API_BASE + '/calendar/events', { headers: authHeaders() })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const mapped = res.data.map(function (d) {
              const start = d.startDate ? new Date(d.startDate) : TODAY;
              const dk = dateKey(start);
              return {
                id: d.id,
                date: dk,
                type: d.type ? d.type.toLowerCase() : 'event',
                title: d.title,
                time: d.startTime ? (d.startTime + (d.endTime ? ' – ' + d.endTime : '')) : '10:00 AM – 1:00 PM',
                location: d.location || 'Campus',
                faculty: 'Academic Office',
                status: 'Scheduled',
                description: d.description || '',
                attachment: null
              };
            });
            return mapped;
          }
          return eventsInRange(fromDate, toDate);
        })
        .catch(function () {
          return eventsInRange(fromDate, toDate);
        });
    },
    getToday: function () { return mockResolve(eventsOn(dateKey(TODAY))); },
    getUpcoming: function (limit) {
      const upcoming = RAW_EVENTS
        .filter(function (e) { return e.type !== 'class' && new Date(e.date) >= TODAY; })
        .sort(function (a, b) { return new Date(a.date) - new Date(b.date); })
        .slice(0, limit || 5);
      return mockResolve(upcoming);
    },
    getHolidays: function () {
      const holidays = RAW_EVENTS
        .filter(function (e) { return e.type === 'holiday' && new Date(e.date) >= TODAY; })
        .sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
      return mockResolve(holidays);
    },
    getDate: function (key) { return mockResolve(eventsOn(key)); }
  };

  /* ============================================================
     UTILITIES
     ============================================================ */
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function startOfWeek(d) {
    const copy = new Date(d);
    copy.setDate(copy.getDate() - copy.getDay());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
  function daysUntil(dateStr) {
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - TODAY) / 86400000);
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  // Same word-safe highlighter used by the navbar search — a match
  // never splits a word, it always highlights the whole word.
  function isWordChar(ch) { return !!ch && /[a-z0-9]/i.test(ch); }
  function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase().trim();
    if (!needle) return escapeHtml(text);
    const idx = haystack.indexOf(needle);
    if (idx === -1) return escapeHtml(text);
    let start = idx;
    while (start > 0 && isWordChar(text[start - 1])) start--;
    let end = idx + needle.length;
    while (end < text.length && isWordChar(text[end])) end++;
    return escapeHtml(text.slice(0, start)) + '<mark>' + escapeHtml(text.slice(start, end)) + '</mark>' + escapeHtml(text.slice(end));
  }

  /* ============================================================
     STATE
     ============================================================ */
  let currentView = 'month'; // 'month' | 'week' | 'day'
  let anchorDate = new Date(TODAY);   // month/week/day being viewed
  let selectedDate = new Date(TODAY); // clicked/focused date
  let activeCategoryFilter = 'all';
  let activeQuickFilter = 'all'; // all | today | week | month | upcoming
  let searchQuery = '';

  /* ============================================================
     RENDER — Summary cards
     ============================================================ */
  const statCards = {
    todayEvents: document.getElementById('statTodayEvents'),
    upcomingAssignments: document.getElementById('statUpcomingAssignments'),
    upcomingExams: document.getElementById('statUpcomingExams'),
    holidaysThisMonth: document.getElementById('statHolidaysThisMonth'),
    attendance: document.getElementById('statAttendance')
  };

  function renderSummaryCards() {
    Object.keys(statCards).forEach(function (key) {
      if (statCards[key]) statCards[key].closest('.stat-card').classList.add('is-loading');
    });

    Promise.all([Api.getToday(), Api.getUpcoming(50), Api.getHolidays()]).then(function (results) {
      const todays = results[0];
      const upcoming = results[1];
      const holidays = results[2];

      const nonClassToday = todays.filter(function (e) { return e.type !== 'class'; });
      const upcomingAssignments = upcoming.filter(function (e) { return e.type === 'assignment'; }).length;
      const upcomingExams = upcoming.filter(function (e) { return e.type === 'exam'; }).length;
      const holidaysThisMonth = holidays.filter(function (e) {
        const d = new Date(e.date);
        return d.getMonth() === TODAY.getMonth() && d.getFullYear() === TODAY.getFullYear();
      }).length;

      setStatValue('statTodayEvents', nonClassToday.length);
      setStatValue('statUpcomingAssignments', upcomingAssignments);
      setStatValue('statUpcomingExams', upcomingExams);
      setStatValue('statHolidaysThisMonth', holidaysThisMonth);
      setStatValue('statAttendance', '92%');

      Object.keys(statCards).forEach(function (key) {
        if (statCards[key]) statCards[key].closest('.stat-card').classList.remove('is-loading');
      });
    });
  }

  function setStatValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /* ============================================================
     RENDER — helpers shared across views
     ============================================================ */
  function eventMatchesFilters(event) {
    if (activeCategoryFilter !== 'all' && event.type !== activeCategoryFilter) return false;

    if (activeQuickFilter !== 'all') {
      const d = new Date(event.date);
      if (activeQuickFilter === 'today' && !isSameDay(d, TODAY)) return false;
      if (activeQuickFilter === 'week') {
        const weekStart = startOfWeek(TODAY);
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
        if (d < weekStart || d > weekEnd) return false;
      }
      if (activeQuickFilter === 'month' && (d.getMonth() !== TODAY.getMonth() || d.getFullYear() !== TODAY.getFullYear())) return false;
      if (activeQuickFilter === 'upcoming' && d < TODAY) return false;
    }

    if (searchQuery) {
      const haystack = (event.title + ' ' + (event.faculty || '') + ' ' + (event.location || '') + ' ' + EVENT_TYPES[event.type].label).toLowerCase();
      if (!haystack.includes(searchQuery.toLowerCase())) return false;
    }

    return true;
  }

  function chipHtml(event) {
    const meta = EVENT_TYPES[event.type];
    const label = searchQuery ? highlightText(event.title, searchQuery) : escapeHtml(event.title);
    const dimmed = searchQuery && !eventMatchesFilters(event) ? ' style="opacity:.35"' : '';
    return (
      '<span class="calendar-chip ' + meta.chip + '" data-event-id="' + event.id + '" role="button" tabindex="0" ' +
      'aria-label="' + escapeHtml(EVENT_TYPES[event.type].label + ': ' + event.title) + '"' + dimmed + '>' + label + '</span>'
    );
  }

  /* ============================================================
     RENDER — Month view
     ============================================================ */
  const calendarMount = document.getElementById('calendarMount');
  const calendarNavLabel = document.getElementById('calendarNavLabel');

  function buildMonthMatrix(year, month) {
    const firstDay = new Date(year, month, 1);
    const startPad = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = startPad + daysInMonth;
    const endPad = (7 - (totalCells % 7)) % 7;

    const cells = [];
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: d, muted: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), muted: false });
    }
    for (let d = 1; d <= endPad; d++) {
      cells.push({ date: new Date(year, month + 1, d), muted: true });
    }
    return cells;
  }

  function renderMonthView() {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const cells = buildMonthMatrix(year, month);
    const MAX_VISIBLE = 3;

    const weekdaysHtml = WEEKDAY_SHORT.map(function (w) { return '<span>' + w + '</span>'; }).join('');

    const cellsHtml = cells.map(function (cell) {
      const key = dateKey(cell.date);
      const dayEvents = eventsOn(key);
      const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
      const isToday = isSameDay(cell.date, TODAY);
      const isSelected = isSameDay(cell.date, selectedDate);
      const visible = dayEvents.slice(0, MAX_VISIBLE);
      const overflow = dayEvents.length - visible.length;

      const classes = ['calendar-cell'];
      if (cell.muted) classes.push('is-muted');
      if (isWeekend) classes.push('is-weekend');
      if (isToday) classes.push('is-today');
      if (isSelected) classes.push('is-selected');

      return (
        '<div class="' + classes.join(' ') + '" data-date="' + key + '" role="button" tabindex="' + (isSelected ? '0' : '-1') + '" ' +
        'aria-label="' + cell.date.toDateString() + (dayEvents.length ? ', ' + dayEvents.length + ' events' : '') + '">' +
          '<span class="calendar-cell-date">' + cell.date.getDate() + '</span>' +
          '<div class="calendar-cell-events">' +
            visible.map(chipHtml).join('') +
            (overflow > 0 ? '<span class="calendar-chip-more" data-date="' + key + '">+' + overflow + ' more</span>' : '') +
          '</div>' +
        '</div>'
      );
    }).join('');

    calendarMount.innerHTML =
      '<div class="panel calendar-panel">' +
        '<div class="calendar-weekdays">' + weekdaysHtml + '</div>' +
        '<div class="calendar-month-grid" id="calendarGrid">' + cellsHtml + '</div>' +
      '</div>';

    calendarNavLabel.textContent = MONTH_NAMES[month] + ' ' + year;
    syncJumpSelects(year, month);
  }

  /* ============================================================
     RENDER — Week view (agenda columns)
     ============================================================ */
  function renderWeekView() {
    const weekStart = startOfWeek(anchorDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    const columnsHtml = days.map(function (d) {
      const key = dateKey(d);
      const dayEvents = eventsOn(key);
      const isToday = isSameDay(d, TODAY);
      return (
        '<div class="calendar-week-day' + (isToday ? ' is-today' : '') + '" data-date="' + key + '" role="button" tabindex="0">' +
          '<div class="calendar-week-day-head">' +
            '<span class="calendar-week-day-name">' + WEEKDAY_SHORT[d.getDay()] + '</span>' +
            '<span class="calendar-week-day-num">' + d.getDate() + '</span>' +
          '</div>' +
          '<div class="calendar-week-day-events">' +
            (dayEvents.length ? dayEvents.map(chipHtml).join('') : '<span class="calendar-empty-day" style="padding:6px 0;font-size:11px;">No events</span>') +
          '</div>' +
        '</div>'
      );
    }).join('');

    calendarMount.innerHTML = '<div class="panel calendar-panel"><div class="calendar-week-grid">' + columnsHtml + '</div></div>';

    const rangeLabel = MONTH_NAMES[weekStart.getMonth()].slice(0, 3) + ' ' + weekStart.getDate() + ' – ' +
      MONTH_NAMES[days[6].getMonth()].slice(0, 3) + ' ' + days[6].getDate() + ', ' + days[6].getFullYear();
    calendarNavLabel.textContent = rangeLabel;
    syncJumpSelects(anchorDate.getFullYear(), anchorDate.getMonth());
  }

  /* ============================================================
     RENDER — Day view (hourly agenda)
     ============================================================ */
  function renderDayView() {
    const key = dateKey(anchorDate);
    const dayEvents = eventsOn(key);
    const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

    const allDay = dayEvents.filter(function (e) { return e.startMinutes == null && e.time && /all day/i.test(e.time); });
    const timed = dayEvents.filter(function (e) { return allDay.indexOf(e) === -1; });

    function eventsForHour(hour) {
      return timed.filter(function (e) {
        const startMin = e.startMinutes != null ? e.startMinutes : parseTimeToMinutes(e.time);
        if (startMin == null) return false;
        return Math.floor(startMin / 60) === hour;
      });
    }

    let slotsHtml = '';
    if (allDay.length) {
      slotsHtml += '<div class="calendar-day-slot"><span class="calendar-day-slot-time">All day</span><div class="calendar-day-slot-events">' +
        allDay.map(agendaCardHtml).join('') + '</div></div>';
    }
    HOURS.forEach(function (hour) {
      const hourEvents = eventsForHour(hour);
      const label = (hour % 12 === 0 ? 12 : hour % 12) + ':00 ' + (hour < 12 ? 'AM' : 'PM');
      slotsHtml +=
        '<div class="calendar-day-slot"><span class="calendar-day-slot-time">' + label + '</span>' +
        '<div class="calendar-day-slot-events">' +
          (hourEvents.length ? hourEvents.map(agendaCardHtml).join('') : '') +
        '</div></div>';
    });

    calendarMount.innerHTML =
      '<div class="panel calendar-panel">' +
        (dayEvents.length ? '<div class="calendar-day-agenda">' + slotsHtml + '</div>' : '<p class="calendar-empty-day">No events scheduled for this day.</p>') +
      '</div>';

    calendarNavLabel.textContent = anchorDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    syncJumpSelects(anchorDate.getFullYear(), anchorDate.getMonth());
  }

  function agendaCardHtml(event) {
    const meta = EVENT_TYPES[event.type];
    const title = searchQuery ? highlightText(event.title, searchQuery) : escapeHtml(event.title);
    return (
      '<div class="calendar-agenda-card calendar-agenda-card--' + event.type.replace('cal-event', 'cal-event') + '" data-event-id="' + event.id + '" role="button" tabindex="0">' +
        '<span class="event-dot ' + meta.dot + '"></span>' +
        '<div><p class="calendar-agenda-title">' + title + '</p>' +
        '<p class="calendar-agenda-sub">' + event.time + (event.location ? ' · ' + escapeHtml(event.location) : '') + '</p></div>' +
      '</div>'
    );
  }

  /* ============================================================
     RENDER — dispatcher + toolbar sync
     ============================================================ */
  const monthSelect = document.getElementById('calendarMonthSelect');
  const yearSelect = document.getElementById('calendarYearSelect');

  function syncJumpSelects(year, month) {
    if (monthSelect) monthSelect.value = String(month);
    if (yearSelect) yearSelect.value = String(year);
  }

  function renderCalendar(skipTransition) {
    const doRender = function () {
      if (currentView === 'month') renderMonthView();
      else if (currentView === 'week') renderWeekView();
      else renderDayView();
    };
    if (skipTransition) { doRender(); return; }
    calendarMount.classList.add('is-transitioning-out');
    setTimeout(function () {
      doRender();
      requestAnimationFrame(function () { calendarMount.classList.remove('is-transitioning-out'); });
    }, 90);
  }

  /* ============================================================
     RENDER — Right sidebar: Today's Schedule
     ============================================================ */
  const todayScheduleList = document.getElementById('todayScheduleList');

  function currentMinutesNow() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function renderTodaySchedule() {
    Api.getToday().then(function (events) {
      const timed = events.filter(function (e) { return e.startMinutes != null || parseTimeToMinutes(e.time) != null; });
      const nowMin = currentMinutesNow();

      if (!timed.length) {
        todayScheduleList.innerHTML = '<li class="empty-hint" style="list-style:none;">No scheduled items today.</li>';
        return;
      }

      todayScheduleList.innerHTML = timed.map(function (event) {
        const startMin = event.startMinutes != null ? event.startMinutes : parseTimeToMinutes(event.time);
        const endMin = event.endMinutes != null ? event.endMinutes : startMin + 60;
        const isCurrent = isSameDay(TODAY, new Date()) && nowMin >= startMin && nowMin <= endMin;
        const meta = EVENT_TYPES[event.type];
        const dotClass = event.type === 'class' ? 'schedule-dot--orange' : (event.type === 'exam' ? 'schedule-dot--orange' : 'schedule-dot--blue');
        return (
          '<li class="' + (isCurrent ? 'is-current' : '') + '" data-event-id="' + event.id + '" role="button" tabindex="0">' +
            '<span class="schedule-time">' + (event.time.split(' ')[0] || '') + '</span>' +
            '<span class="schedule-dot ' + dotClass + '" aria-hidden="true"></span>' +
            '<span>' + escapeHtml(event.title) + (event.location ? ' — ' + escapeHtml(event.location) : '') + '</span>' +
          '</li>'
        );
      }).join('');
    });
  }

  /* ============================================================
     RENDER — Right sidebar: Upcoming Deadlines
     ============================================================ */
  const upcomingList = document.getElementById('upcomingDeadlinesList');
  const COUNTDOWN_COLORS = { assignment: 'stat-icon--blue', 'cal-event': 'stat-icon--purple', exam: 'stat-icon--red' };

  function renderUpcomingPanel() {
    Api.getUpcoming(5).then(function (events) {
      if (!events.length) {
        upcomingList.innerHTML = '<p class="empty-hint">Nothing upcoming right now.</p>';
        return;
      }
      upcomingList.innerHTML = events.map(function (event) {
        const days = daysUntil(event.date);
        const label = days <= 0 ? 'Today' : (days === 1 ? '1d' : days + 'd');
        const colorClass = COUNTDOWN_COLORS[event.type] || 'stat-icon--blue';
        return (
          '<div class="upcoming-item" data-event-id="' + event.id + '" role="button" tabindex="0">' +
            '<div class="upcoming-countdown ' + colorClass + '">' + label.replace('d', '') + (label.indexOf('d') > -1 ? '<span>days</span>' : '<span>today</span>') + '</div>' +
            '<div><p class="mini-event-title">' + escapeHtml(event.title) + '</p>' +
            '<p class="mini-event-sub">' + EVENT_TYPES[event.type].label + ' · ' + event.date + '</p></div>' +
          '</div>'
        );
      }).join('');
    });
  }

  /* ============================================================
     RENDER — Right sidebar: Academic Timeline
     ============================================================ */
  const timelineMount = document.getElementById('academicTimeline');

  function renderTimeline() {
    const weekStart = startOfWeek(TODAY);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const tomorrow = new Date(TODAY); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthEnd = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0);

    const nonClass = RAW_EVENTS.filter(function (e) { return new Date(e.date) >= TODAY; });

    const groups = [
      { label: 'Today', items: nonClass.filter(function (e) { return isSameDay(new Date(e.date), TODAY); }) },
      { label: 'Tomorrow', items: nonClass.filter(function (e) { return isSameDay(new Date(e.date), tomorrow); }) },
      { label: 'This Week', items: nonClass.filter(function (e) { const d = new Date(e.date); return d > tomorrow && d <= weekEnd; }) },
      { label: 'Upcoming', items: nonClass.filter(function (e) { const d = new Date(e.date); return d > weekEnd; }).slice(0, 3) }
    ];

    timelineMount.innerHTML = groups.map(function (group) {
      const itemsHtml = group.items.length
        ? group.items.map(function (e) {
            return '<div class="timeline-item-row"><span class="event-dot ' + EVENT_TYPES[e.type].dot + '"></span>' + escapeHtml(e.title) + '</div>';
          }).join('')
        : '<div class="timeline-item-row" style="opacity:.6;">Nothing scheduled</div>';
      return (
        '<div class="timeline-group">' +
          '<p class="timeline-group-label">' + group.label + '</p>' +
          '<div class="timeline-group-items">' + itemsHtml + '</div>' +
        '</div>'
      );
    }).join('');
  }

  /* ============================================================
     RENDER — Right sidebar: Holiday panel
     ============================================================ */
  const holidayListMount = document.getElementById('holidayPanelList');

  function renderHolidayPanel() {
    Api.getHolidays().then(function (holidays) {
      if (!holidays.length) {
        holidayListMount.innerHTML = '<p class="empty-hint">No upcoming holidays.</p>';
        return;
      }
      holidayListMount.innerHTML = holidays.map(function (h) {
        const days = daysUntil(h.date);
        return (
          '<div class="holiday-item" data-event-id="' + h.id + '" role="button" tabindex="0">' +
            '<div><p class="holiday-item-name">' + escapeHtml(h.title) + '</p>' +
            '<p class="holiday-item-date">' + h.date + '</p></div>' +
            '<span class="holiday-item-days">' + (days <= 0 ? 'Today' : days + 'd') + '</span>' +
          '</div>'
        );
      }).join('');
    });
  }

  /* ============================================================
     RENDER — Event details modal
     ============================================================ */
  const eventModalOverlay = document.getElementById('eventModalOverlay');
  const eventModalBadges = document.getElementById('eventModalBadges');
  const eventModalTitle = document.getElementById('eventModalTitle');
  const eventModalDesc = document.getElementById('eventModalDesc');
  const eventModalMeta = document.getElementById('eventModalMeta');
  const eventModalAttachment = document.getElementById('eventModalAttachment');
  const eventModalAttachmentName = document.getElementById('eventModalAttachmentName');
  const eventModalClose = document.getElementById('eventModalClose');
  const eventModalCloseFooter = document.getElementById('eventModalCloseFooter');
  const eventModalDownload = document.getElementById('eventModalDownload');
  const eventModalViewDetails = document.getElementById('eventModalViewDetails');

  let lastFocusedEl = null;

  function findEventById(id) {
    for (const key in EVENT_INDEX) {
      const found = EVENT_INDEX[key].find(function (e) { return e.id === id; });
      if (found) return found;
    }
    return null;
  }

  function openEventModal(eventId, trigger) {
    const event = findEventById(eventId);
    if (!event) return;
    const meta = EVENT_TYPES[event.type];

    eventModalBadges.innerHTML = '<span class="tag ' + meta.tag + '">' + meta.label + '</span><span class="priority priority--medium">' + escapeHtml(event.status) + '</span>';
    eventModalTitle.textContent = event.title;
    eventModalDesc.textContent = event.description;

    eventModalMeta.innerHTML =
      metaRow('calendar', event.date) +
      metaRow('clock', event.time) +
      metaRow('pin', event.location) +
      metaRow('user', event.faculty || '\u2014');

    if (event.attachment) {
      eventModalAttachment.hidden = false;
      eventModalAttachmentName.textContent = event.attachment;
    } else {
      eventModalAttachment.hidden = true;
    }

    lastFocusedEl = trigger || document.activeElement;
    eventModalOverlay.hidden = false;
    requestAnimationFrame(function () { eventModalOverlay.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    eventModalClose.focus();
  }

  function metaRow(iconKey, text) {
    const paths = {
      calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      clock: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      pin: '<path d="M12 21s7-6.6 7-11.5a7 7 0 0 0-14 0C5 14.4 12 21 12 21Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.6"/>',
      user: '<circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.6"/><path d="M4.8 19.2c1.1-3.1 3.9-4.7 7.2-4.7s6.1 1.6 7.2 4.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
    };
    return '<span class="modal-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">' + paths[iconKey] + '</svg>' + escapeHtml(text) + '</span>';
  }

  function closeEventModal() {
    eventModalOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { eventModalOverlay.hidden = true; }, 200);
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  eventModalClose.addEventListener('click', closeEventModal);
  eventModalCloseFooter.addEventListener('click', closeEventModal);
  if (eventModalViewDetails) eventModalViewDetails.addEventListener('click', closeEventModal);
  eventModalOverlay.addEventListener('click', function (event) { if (event.target === eventModalOverlay) closeEventModal(); });
  if (eventModalDownload) {
    eventModalDownload.addEventListener('click', function () {
      eventModalDownload.textContent = 'Downloaded';
      setTimeout(function () {
        eventModalDownload.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7.5 11.5L12 16l4.5-4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 18.5h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>Download';
      }, 1600);
    });
  }

  /* ============================================================
     RENDER — Date details drawer
     ============================================================ */
  const drawerOverlay = document.getElementById('drawerOverlay');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerSubtitle = document.getElementById('drawerSubtitle');
  const drawerBody = document.getElementById('drawerBody');
  const drawerClose = document.getElementById('drawerClose');

  function openDateDrawer(key) {
    const d = new Date(key + 'T00:00:00');
    const events = eventsOn(key);

    drawerTitle.textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    drawerSubtitle.textContent = events.length + (events.length === 1 ? ' event' : ' events');

    drawerBody.innerHTML = events.length
      ? events.map(function (event) {
          const meta = EVENT_TYPES[event.type];
          return (
            '<div class="calendar-agenda-card calendar-agenda-card--' + event.type + '" data-event-id="' + event.id + '" role="button" tabindex="0">' +
              '<span class="event-dot ' + meta.dot + '"></span>' +
              '<div><p class="calendar-agenda-title">' + escapeHtml(event.title) + '</p>' +
              '<p class="calendar-agenda-sub">' + meta.label + ' · ' + event.time + (event.location ? ' · ' + escapeHtml(event.location) : '') + '</p></div>' +
            '</div>'
          );
        }).join('')
      : '<p class="drawer-empty">No events on this day.</p>';

    drawerOverlay.hidden = false;
    requestAnimationFrame(function () { drawerOverlay.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    drawerClose.focus();
  }

  function closeDateDrawer() {
    drawerOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { drawerOverlay.hidden = true; }, 260);
  }

  drawerClose.addEventListener('click', closeDateDrawer);
  drawerOverlay.addEventListener('click', function (event) { if (event.target === drawerOverlay) closeDateDrawer(); });
  drawerBody.addEventListener('click', function (event) {
    const card = event.target.closest('[data-event-id]');
    if (card) openEventModal(card.dataset.eventId, card);
  });

  /* ============================================================
     EVENT HANDLING — Toolbar: prev / today / next, view tabs
     ============================================================ */
  const prevBtn = document.getElementById('calendarPrevBtn');
  const nextBtn = document.getElementById('calendarNextBtn');
  const todayNavBtn = document.getElementById('calendarTodayBtn');
  const viewTabs = document.getElementById('calendarViewTabs');

  function shiftAnchor(direction) {
    if (currentView === 'month') anchorDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + direction, 1);
    else if (currentView === 'week') { anchorDate = new Date(anchorDate); anchorDate.setDate(anchorDate.getDate() + direction * 7); }
    else { anchorDate = new Date(anchorDate); anchorDate.setDate(anchorDate.getDate() + direction); }
    renderCalendar();
  }

  prevBtn.addEventListener('click', function () { shiftAnchor(-1); });
  nextBtn.addEventListener('click', function () { shiftAnchor(1); });
  todayNavBtn.addEventListener('click', function () {
    anchorDate = new Date(TODAY);
    selectedDate = new Date(TODAY);
    renderCalendar();
  });

  viewTabs.addEventListener('click', function (event) {
    const tab = event.target.closest('.calendar-view-tab');
    if (!tab) return;
    viewTabs.querySelectorAll('.calendar-view-tab').forEach(function (t) { t.classList.remove('is-active'); });
    tab.classList.add('is-active');
    currentView = tab.dataset.view;
    renderCalendar();
  });

  /* ---------------- Month / Year jump dropdowns ---------------- */
  (function populateJumpSelects() {
    monthSelect.innerHTML = MONTH_NAMES.map(function (name, i) { return '<option value="' + i + '">' + name + '</option>'; }).join('');
    const years = [];
    for (let y = TODAY.getFullYear() - 1; y <= TODAY.getFullYear() + 2; y++) years.push(y);
    yearSelect.innerHTML = years.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
  })();

  monthSelect.addEventListener('change', function () {
    anchorDate = new Date(Number(yearSelect.value), Number(monthSelect.value), 1);
    currentView = 'month';
    viewTabs.querySelectorAll('.calendar-view-tab').forEach(function (t) { t.classList.toggle('is-active', t.dataset.view === 'month'); });
    renderCalendar();
  });
  yearSelect.addEventListener('change', function () {
    anchorDate = new Date(Number(yearSelect.value), Number(monthSelect.value), 1);
    renderCalendar();
  });

  /* ============================================================
     EVENT HANDLING — Header: Today & Refresh buttons
     ============================================================ */
  const headerTodayBtn = document.getElementById('headerTodayBtn');
  const headerRefreshBtn = document.getElementById('headerRefreshBtn');

  if (headerTodayBtn) {
    headerTodayBtn.addEventListener('click', function () {
      anchorDate = new Date(TODAY);
      selectedDate = new Date(TODAY);
      currentView = 'month';
      viewTabs.querySelectorAll('.calendar-view-tab').forEach(function (t) { t.classList.toggle('is-active', t.dataset.view === 'month'); });
      renderCalendar();
    });
  }
  if (headerRefreshBtn) {
    headerRefreshBtn.addEventListener('click', function () {
      if (headerRefreshBtn.classList.contains('is-refreshing')) return;
      headerRefreshBtn.classList.add('is-refreshing');
      setTimeout(function () {
        renderAll();
        headerRefreshBtn.classList.remove('is-refreshing');
      }, 500);
    });
  }

  /* ============================================================
     EVENT HANDLING — Search (debounced, word-safe highlighting)
     ============================================================ */
  const calendarSearchInput = document.getElementById('calendarSearchInput');
  let searchDebounce = null;

  calendarSearchInput.addEventListener('input', function () {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () {
      searchQuery = calendarSearchInput.value.trim();
      renderCalendar(true);
    }, 250);
  });

  // Keyboard navigation across visible chips while the search box is focused.
  let searchMatchIndex = -1;
  calendarSearchInput.addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return;
    const chips = Array.prototype.slice.call(calendarMount.querySelectorAll('[data-event-id]'))
      .filter(function (el) { return el.style.opacity !== '0.35'; });
    if (!chips.length) return;

    if (event.key === 'ArrowDown') { event.preventDefault(); searchMatchIndex = (searchMatchIndex + 1) % chips.length; }
    else if (event.key === 'ArrowUp') { event.preventDefault(); searchMatchIndex = (searchMatchIndex - 1 + chips.length) % chips.length; }
    else if (event.key === 'Enter') {
      if (searchMatchIndex >= 0 && chips[searchMatchIndex]) openEventModal(chips[searchMatchIndex].dataset.eventId, chips[searchMatchIndex]);
      return;
    }
    chips.forEach(function (c) { c.classList.remove('is-selected'); });
    chips[searchMatchIndex].classList.add('is-selected');
    chips[searchMatchIndex].scrollIntoView({ block: 'nearest' });
  });

  /* ============================================================
     EVENT HANDLING — Filter chips (category + quick filters)
     ============================================================ */
  const filterChipsMount = document.getElementById('calendarFilterChips');

  filterChipsMount.addEventListener('click', function (event) {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    const group = chip.dataset.group;
    filterChipsMount.querySelectorAll('.filter-chip[data-group="' + group + '"]').forEach(function (c) { c.classList.remove('is-active'); });
    chip.classList.add('is-active');
    if (group === 'category') activeCategoryFilter = chip.dataset.filter;
    else activeQuickFilter = chip.dataset.filter;
    renderCalendar(true);
  });

  /* ============================================================
     EVENT HANDLING — Delegated clicks on the calendar (cells + chips)
     ============================================================ */
  calendarMount.addEventListener('click', function (event) {
    const chip = event.target.closest('.calendar-chip, .calendar-agenda-card');
    const more = event.target.closest('.calendar-chip-more');
    const cell = event.target.closest('.calendar-cell, .calendar-week-day');

    if (chip) {
      openEventModal(chip.dataset.eventId, chip);
      return;
    }
    if (more) {
      openDateDrawer(more.dataset.date);
      return;
    }
    if (cell) {
      selectedDate = new Date(cell.dataset.date + 'T00:00:00');
      openDateDrawer(cell.dataset.date);
      renderCalendar(true);
    }
  });

  // Keyboard support directly on calendar cells (Enter/Space activates,
  // arrow keys move the roving focus between date cells).
  calendarMount.addEventListener('keydown', function (event) {
    const cell = event.target.closest('.calendar-cell');
    if (!cell) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectedDate = new Date(cell.dataset.date + 'T00:00:00');
      openDateDrawer(cell.dataset.date);
      renderCalendar(true);
      return;
    }

    const arrowMap = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 };
    if (arrowMap[event.key] == null) return;
    event.preventDefault();
    const allCells = Array.prototype.slice.call(calendarMount.querySelectorAll('.calendar-cell'));
    const idx = allCells.indexOf(cell);
    const target = allCells[idx + arrowMap[event.key]];
    if (target) {
      cell.setAttribute('tabindex', '-1');
      target.setAttribute('tabindex', '0');
      target.focus();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (eventModalOverlay.classList.contains('is-open')) closeEventModal();
      if (drawerOverlay.classList.contains('is-open')) closeDateDrawer();
    }
  });

  // Right-sidebar rows (schedule / upcoming / holidays) also open the modal.
  [todayScheduleList, upcomingList, holidayListMount].forEach(function (mount) {
    mount.addEventListener('click', function (event) {
      const row = event.target.closest('[data-event-id]');
      if (row) openEventModal(row.dataset.eventId, row);
    });
  });

  /* ---------------- Button ripple (delegated — content renders dynamically) ---------------- */
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

  /* ============================================================
     INIT
     ============================================================ */
  function renderAll() {
    renderSummaryCards();
    renderCalendar(true);
    renderTodaySchedule();
    renderUpcomingPanel();
    renderTimeline();
    renderHolidayPanel();
  }

  renderAll();
})();
