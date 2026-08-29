/* ============================================================
   VectorOne — Student Resources Page Logic
   Self-contained script for resources.html. Ships the same
   app-shell behaviors as dashboard.js / events.js (theme, sidebar,
   popovers, global search, mini calendar, delegated ripple) plus
   the Resources-page-specific logic: resource data, grid/list
   rendering, search + filters + sort, pagination, the preview
   modal, the share dialog, download simulation with a progress
   indicator and success toast, and bookmarking persisted to
   localStorage.

   STUDENT-ONLY: there is no upload / edit / delete / publish
   functionality anywhere in this file.

   ---------------------------------------------------------------
   BACKEND-READY: real API calls later just replace the bodies of
   these functions — nothing else needs to change:
     GET    /api/resources             -> getResources()
     GET    /api/resources/:id         -> findResource(id)
     GET    /api/resources/search      -> applyFiltersAndSearch()
     GET    /api/resources/categories  -> FILTER_LABELS / subject grouping
     GET    /api/resources/recent      -> renderRecentlyUploaded()
     GET    /api/resources/popular     -> renderPopularResources()
     POST   /api/resources/bookmark    -> setBookmark(id, true)
     DELETE /api/resources/bookmark/:id-> setBookmark(id, false)
     POST   /api/resources/download    -> startDownload(resource, ...)
     POST   /api/resources/share       -> openShareModal(resource)
   No backend calls are made — everything here is mock/local state.
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

    return { open: open, close: close, isOpen: isOpen };
  }

  wirePopover('userMenuBtn', 'userDropdown');
  wirePopover('notificationBtn', 'notificationPanel');

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

  const SEARCH_INDEX = [
    { title: 'DBMS Unit 4 — Normalization Notes', description: 'Lecture notes covering functional dependencies and normal forms up to BCNF.', category: 'Notes', author: 'Dr. Ananya Rao', type: 'Resource' },
    { title: 'Operating Systems — Chapter 5 PDF', description: 'Memory management chapter from the Silberschatz textbook.', category: 'PDF', author: 'Prof. Manish Verma', type: 'Resource' },
    { title: 'CS301 DBMS — Previous Year Papers', description: 'Question papers from the last five years for CS301.', category: 'Previous Papers', author: 'Examination Cell', type: 'Resource' },
    { title: 'Introduction to Algorithms (CLRS)', description: 'Full reference ebook for algorithm design and analysis.', category: 'Ebooks', author: 'Library', type: 'Resource' },
    { title: 'Campus Drive — TCS NQT registrations', description: 'On-campus recruitment drive for final-year students.', category: 'Placement', author: 'Placement Cell', type: 'Notice' },
    { title: 'Code Sprint 2026', description: 'A 24-hour competitive programming and hackathon event.', category: 'Event', author: 'Coding Club', type: 'Event' },
    { title: 'Robotics Club', description: 'Student club focused on robotics and embedded systems.', category: 'Club', author: 'Robotics Club', type: 'Club' }
  ];

  function isWordChar(ch) {
    return !!ch && /[a-z0-9]/i.test(ch);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function findMatch(text, query) {
    if (!text || !query) return null;
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase().trim();
    if (!needle) return null;

    const idx = haystack.indexOf(needle);
    if (idx === -1) return null;

    const boundaryBefore = idx === 0 || !isWordChar(text[idx - 1]);
    const boundaryAfter = (idx + needle.length) >= text.length || !isWordChar(text[idx + needle.length]);

    let start = idx;
    while (start > 0 && isWordChar(text[start - 1])) start--;
    let end = idx + needle.length;
    while (end < text.length && isWordChar(text[end])) end++;

    let tier;
    if (boundaryBefore && boundaryAfter && start === idx && end === idx + needle.length) {
      tier = 0;
    } else if (boundaryBefore) {
      tier = 1;
    } else {
      tier = 2;
    }

    return { tier: tier, start: start, end: end };
  }

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
    if (event.key === '/' && document.activeElement !== searchInput && !isTypingTarget(event.target)) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  function isTypingTarget(el) {
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
  }

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

  recentSearchList.addEventListener('click', handleSearchItemClick);
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

    for (let i = firstDay - 1; i >= 0; i--) {
      html += '<span class="mini-cal-day is-muted">' + (daysInPrevMonth - i) + '</span>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate();
      html += '<span class="mini-cal-day' + (isToday ? ' is-today' : '') + '">' + d + '</span>';
    }
    const totalCells = firstDay + daysInMonth;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= trailing; d++) {
      html += '<span class="mini-cal-day is-muted">' + d + '</span>';
    }

    grid.innerHTML = html;
  })();

  /* ============================================================
     RESOURCE DATA (dummy — replace with GET /api/resources later)
     ============================================================ */
  const NOW = new Date(2026, 6, 29); // Jul 29, 2026 — matches the rest of the app's demo "today"

  const RESOURCES = [
    { id: 'r1', title: 'DBMS Unit 4 — Normalization Notes', subject: 'Database Management Systems', courseCode: 'CS301', faculty: 'Dr. Ananya Rao', type: 'notes', format: 'pdf', fileName: 'DBMS_Unit4_Normalization.pdf', size: '2.1 MB', uploadDate: 'Jul 20, 2026', uploadDateISO: '2026-07-20', downloads: 342, rating: 4.6, ratingCount: 128, description: 'Lecture notes covering functional dependencies, decomposition and normal forms up to BCNF, with worked examples.', tags: ['Normalization', 'ER Model', '3NF'] },
    { id: 'r2', title: 'Operating Systems — Chapter 5 (Memory Management)', subject: 'Operating Systems', courseCode: 'CS302', faculty: 'Prof. Manish Verma', type: 'pdf', format: 'pdf', fileName: 'OS_Silberschatz_Ch5.pdf', size: '6.4 MB', uploadDate: 'Jun 15, 2026', uploadDateISO: '2026-06-15', downloads: 289, rating: 4.4, ratingCount: 95, description: 'Textbook chapter on paging, segmentation and virtual memory, scanned and OCR-searchable.', tags: ['Textbook', 'Memory Management'] },
    { id: 'r3', title: 'Agile Methodologies — SE Slide Deck', subject: 'Software Engineering', courseCode: 'CS308', faculty: 'Prof. Divya Menon', type: 'ppt', format: 'pptx', fileName: 'SE_Agile_Methodologies.pptx', size: '3.8 MB', uploadDate: 'Jul 22, 2026', uploadDateISO: '2026-07-22', downloads: 156, rating: 4.2, ratingCount: 54, description: 'Lecture slides covering Scrum, Kanban and the SDLC comparison used in the mid-term case study.', tags: ['Agile', 'Scrum', 'SDLC'] },
    { id: 'r4', title: 'DBMS Lab Manual — All Experiments', subject: 'Database Management Systems', courseCode: 'CS301', faculty: 'Dr. Ananya Rao', type: 'lab-manual', format: 'pdf', fileName: 'DBMS_Lab_Manual_Full.pdf', size: '4.5 MB', uploadDate: 'Jul 5, 2026', uploadDateISO: '2026-07-05', downloads: 410, rating: 4.8, ratingCount: 201, description: 'Complete lab manual with all 10 experiments, sample schemas and expected SQL output.', tags: ['Lab', 'SQL', 'Experiments'] },
    { id: 'r5', title: 'Python Assignment Brief — Expense Tracker', subject: 'Programming in Python', courseCode: 'CS210', faculty: 'Prof. Rakesh Iyer', type: 'assignments', format: 'docx', fileName: 'Python_ExpenseTracker_Brief.docx', size: '220 KB', uploadDate: 'Jul 1, 2026', uploadDateISO: '2026-07-01', downloads: 198, rating: 4.3, ratingCount: 61, description: 'Original assignment brief and grading rubric for the Python mini-project.', tags: ['Mini Project', 'Python'] },
    { id: 'r6', title: 'CS301 DBMS — Previous Year Papers (2021–2025)', subject: 'Database Management Systems', courseCode: 'CS301', faculty: 'Examination Cell', type: 'previous-papers', format: 'pdf', fileName: 'CS301_PYQ_2021_2025.pdf', size: '5.2 MB', uploadDate: 'Jun 28, 2026', uploadDateISO: '2026-06-28', downloads: 512, rating: 4.7, ratingCount: 243, description: 'Compiled question papers from the last five academic years, with the current syllabus mapping noted.', tags: ['PYQ', 'Exam Prep'] },
    { id: 'r7', title: 'Introduction to Algorithms (CLRS) — Ebook', subject: 'Data Structures & Algorithms', courseCode: 'CS205', faculty: 'Library', type: 'ebooks', format: 'pdf', fileName: 'CLRS_Intro_to_Algorithms.pdf', size: '18.6 MB', uploadDate: 'May 10, 2026', uploadDateISO: '2026-05-10', downloads: 620, rating: 4.9, ratingCount: 340, description: 'Full reference ebook for algorithm design, complexity analysis and proofs.', tags: ['Reference', 'Algorithms'] },
    { id: 'r8', title: 'Computer Networks Question Bank', subject: 'Computer Networks', courseCode: 'CS304', faculty: 'Dr. Neha Kapoor', type: 'question-bank', format: 'pdf', fileName: 'CN_Question_Bank.pdf', size: '1.4 MB', uploadDate: 'Jul 18, 2026', uploadDateISO: '2026-07-18', downloads: 233, rating: 4.5, ratingCount: 88, description: 'Unit-wise question bank with previous internal assessment questions and model answers.', tags: ['Exam Prep', 'Routing'] },
    { id: 'r9', title: 'AVL Tree Rotations — Video Lecture', subject: 'Data Structures & Algorithms', courseCode: 'CS205', faculty: 'Dr. Priya Deshmukh', type: 'video', format: 'mp4', fileName: 'AVL_Rotations_Lecture.mp4', size: '142 MB', uploadDate: 'Jul 24, 2026', uploadDateISO: '2026-07-24', downloads: 175, rating: 4.6, ratingCount: 72, description: 'Recorded lecture walking through all four AVL rotation cases with worked examples on the whiteboard.', tags: ['Video', 'Trees'] },
    { id: 'r10', title: 'OS Practical File — Shell Scripting', subject: 'Operating Systems', courseCode: 'CS302', faculty: 'Prof. Manish Verma', type: 'practical', format: 'zip', fileName: 'OS_Practical_ShellScripting.zip', size: '890 KB', uploadDate: 'Jul 12, 2026', uploadDateISO: '2026-07-12', downloads: 121, rating: 4.1, ratingCount: 39, description: 'Sample shell scripts and the practical file template for the process-management lab set.', tags: ['Practical', 'Shell'] },
    { id: 'r11', title: 'AI Faculty Notes — Search Algorithms', subject: 'Artificial Intelligence', courseCode: 'CS405', faculty: 'Dr. Sameer Joshi', type: 'faculty-notes', format: 'pdf', fileName: 'AI_Search_Algorithms_FacultyNotes.pdf', size: '1.9 MB', uploadDate: 'Jul 26, 2026', uploadDateISO: '2026-07-26', downloads: 143, rating: 4.7, ratingCount: 56, description: "Dr. Joshi's own annotated notes on Minimax and Alpha-Beta pruning, shared ahead of the research paper deadline.", tags: ['Minimax', 'Alpha-Beta'] },
    { id: 'r12', title: 'Cloud Computing — IaaS / PaaS / SaaS Notes', subject: 'Cloud Computing', courseCode: 'CS407', faculty: 'Prof. Kavita Nair', type: 'notes', format: 'docx', fileName: 'Cloud_ServiceModels_Notes.docx', size: '640 KB', uploadDate: 'Jul 27, 2026', uploadDateISO: '2026-07-27', downloads: 98, rating: 4.0, ratingCount: 28, description: 'Concise notes comparing the three cloud service models with real provider examples.', tags: ['Cloud', 'Virtualization'] },
    { id: 'r13', title: 'Web Technologies — Full Stack Slide Deck', subject: 'Web Technologies', courseCode: 'CS311', faculty: 'Dr. Arjun Malhotra', type: 'ppt', format: 'pptx', fileName: 'WebTech_FullStack_Deck.pptx', size: '5.1 MB', uploadDate: 'Jun 5, 2026', uploadDateISO: '2026-06-05', downloads: 267, rating: 4.3, ratingCount: 77, description: 'Slide deck covering the HTML/CSS/JS fundamentals used across the major project.', tags: ['HTML', 'CSS', 'JavaScript'] },
    { id: 'r14', title: 'Cyber Security — Previous Year Papers', subject: 'Cyber Security', courseCode: 'CS420', faculty: 'Examination Cell', type: 'previous-papers', format: 'pdf', fileName: 'CyberSec_PYQ.pdf', size: '2.7 MB', uploadDate: 'Jun 20, 2026', uploadDateISO: '2026-06-20', downloads: 187, rating: 4.4, ratingCount: 65, description: 'Past examination papers for Cyber Security with the current weightage distribution highlighted.', tags: ['PYQ', 'Security'] },
    { id: 'r15', title: 'Flutter Practical Assignments Bundle', subject: 'Mobile App Development', courseCode: 'CS412', faculty: 'Prof. Rohan Bhatt', type: 'practical', format: 'zip', fileName: 'Flutter_Practical_Bundle.zip', size: '12.3 MB', uploadDate: 'Jul 15, 2026', uploadDateISO: '2026-07-15', downloads: 134, rating: 4.2, ratingCount: 41, description: 'Starter Flutter projects for each practical session, ready to open in Android Studio.', tags: ['Flutter', 'UI'] },
    { id: 'r16', title: 'Data Structures Question Bank — Unit Wise', subject: 'Data Structures & Algorithms', courseCode: 'CS205', faculty: 'Dr. Priya Deshmukh', type: 'question-bank', format: 'pdf', fileName: 'DSA_Question_Bank.pdf', size: '1.1 MB', uploadDate: 'Jul 8, 2026', uploadDateISO: '2026-07-08', downloads: 276, rating: 4.6, ratingCount: 102, description: 'Unit-wise question bank spanning arrays through graphs, aligned with the internal assessment pattern.', tags: ['Exam Prep', 'Trees', 'Graphs'] }
  ];

  const FILTER_LABELS = {
    notes: 'Notes', pdf: 'PDF', ppt: 'PPT', 'lab-manual': 'Lab Manual', assignments: 'Assignments',
    'previous-papers': 'Previous Papers', ebooks: 'Ebooks', 'question-bank': 'Question Bank',
    video: 'Video', practical: 'Practical', 'faculty-notes': 'Faculty Notes'
  };

  const FORMAT_META = {
    pdf: { thumb: 'resource-thumb--pdf', badge: 'file-badge--pdf', label: 'PDF' },
    docx: { thumb: 'resource-thumb--doc', badge: 'file-badge--doc', label: 'DOCX' },
    pptx: { thumb: 'resource-thumb--ppt', badge: 'file-badge--ppt', label: 'PPTX' },
    zip: { thumb: 'resource-thumb--zip', badge: 'file-badge--zip', label: 'ZIP' },
    mp4: { thumb: 'resource-thumb--video', badge: 'file-badge--video', label: 'MP4' },
    xls: { thumb: 'resource-thumb--xls', badge: 'file-badge--xls', label: 'XLS' }
  };

  function formatIconSvg(format, size) {
    const s = size || 26;
    const icons = {
      pdf: '<path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 3.5V8h4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
      docx: '<path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 3.5V8h4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 13h6M9 16h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
      pptx: '<rect x="3.5" y="5" width="17" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M9 20h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9.5 8.5v5l4-2.5-4-2.5Z" fill="currentColor"/>',
      zip: '<rect x="4" y="4" width="16" height="16" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M12 4v3M12 9v2M12 13v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="17" r="1.6" stroke="currentColor" stroke-width="1.4"/>',
      mp4: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor"/>',
      xls: '<rect x="3.5" y="4" width="17" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 9.5h17M9.5 4v16" stroke="currentColor" stroke-width="1.5"/>'
    };
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" aria-hidden="true">' + (icons[format] || icons.pdf) + '</svg>';
  }

  function starsSvg(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      const filled = i <= Math.round(rating);
      html += '<svg viewBox="0 0 24 24" fill="none" class="' + (filled ? 'is-filled' : '') + '"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.7l-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 3.5Z" fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    }
    return html;
  }

  function daysUntil(iso) {
    return Math.round((new Date(iso + 'T00:00:00') - NOW) / 86400000);
  }
  function findResource(id) {
    return RESOURCES.find(function (r) { return r.id === id; });
  }

  /* ============================================================
     BOOKMARKS — persisted to localStorage
     ============================================================ */
  const BOOKMARK_KEY = 'vectorone-resource-bookmarks';
  let bookmarkedIds = new Set();
  try {
    const stored = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]');
    bookmarkedIds = new Set(stored);
  } catch (e) {
    bookmarkedIds = new Set();
  }
  function persistBookmarks() {
    try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(Array.from(bookmarkedIds))); } catch (e) { /* storage unavailable — state stays in memory */ }
  }
  function setBookmark(id, on) {
    if (on) bookmarkedIds.add(id); else bookmarkedIds.delete(id);
    persistBookmarks();
  }

  /* ============================================================
     SESSION STATE — downloads this session (frontend-only)
     ============================================================ */
  const downloadedIds = new Set(['r4', 'r6']); // pre-seeded so "Recent Downloads" isn't empty on first load
  let downloadedTodayCount = 18; // mock batch-wide counter
  const downloadCountsById = {}; // per-resource downloads, overrides the static seed count once incremented

  /* ============================================================
     TOASTS
     ============================================================ */
  const toastStack = document.getElementById('toastStack');
  function showToast(message, kind) {
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + (kind || 'success');
    const icon = kind === 'info'
      ? '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 12.5l4.5 4.5 10.5-11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    toast.innerHTML = icon + '<span>' + escapeHtml(message) + '</span>';
    toastStack.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('is-leaving');
      setTimeout(function () { toast.remove(); }, 220);
    }, 2800);
  }

  /* ============================================================
     COUNT-UP ANIMATION FOR STAT VALUES
     ============================================================ */
  function animateValue(el, to, suffix) {
    const from = Number(el.dataset.rawValue || 0);
    const duration = 500;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (to - from) * eased);
      el.textContent = value + (suffix || '');
      if (progress < 1) requestAnimationFrame(tick);
      else el.dataset.rawValue = String(to);
    }
    requestAnimationFrame(tick);
  }

  /* ============================================================
     STATE
     ============================================================ */
  let activeFilter = 'all';
  let searchQuery = '';
  let sortMode = 'newest';
  let viewMode = localStorage.getItem('vectorone-resources-view') === 'list' ? 'list' : 'grid';
  let currentPage = 1;
  const PAGE_SIZE = 9;
  let filteredResources = RESOURCES.slice();

  /* ============================================================
     STATS
     ============================================================ */
  function computeStats() {
    const total = RESOURCES.length;
    const recent = RESOURCES.filter(function (r) { return daysUntil(r.uploadDateISO) >= -14; }).length;
    const mySubjects = new Set(RESOURCES.map(function (r) { return r.subject; })).size;
    return { total: total, recent: recent, subjects: mySubjects };
  }

  function renderStats() {
    const s = computeStats();
    animateValue(document.getElementById('statTotalValue'), s.total);
    animateValue(document.getElementById('statRecentValue'), s.recent);
    animateValue(document.getElementById('statDownloadedTodayValue'), downloadedTodayCount);
    animateValue(document.getElementById('statMyDownloadsValue'), downloadedIds.size);
    animateValue(document.getElementById('statSubjectsValue'), s.subjects);
    animateValue(document.getElementById('statFavoritesValue'), bookmarkedIds.size);
  }

  /* ============================================================
     RESOURCE CARD MARKUP
     ============================================================ */
  function metaIcon(key) {
    const paths = {
      calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      download: '<path d="M12 4v11M7.5 11.5L12 16l4.5-4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 18.5h15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      user: '<circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.6"/><path d="M4.8 19.2c1.1-3.1 3.9-4.7 7.2-4.7s6.1 1.6 7.2 4.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      size: '<path d="M4 7.5h16M4 12h16M4 16.5h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' + paths[key] + '</svg>';
  }

  function currentDownloadCount(r) {
    return downloadCountsById[r.id] !== undefined ? downloadCountsById[r.id] : r.downloads;
  }

  function renderResourceCard(r) {
    const meta = FORMAT_META[r.format];
    const isBookmarked = bookmarkedIds.has(r.id);
    const isDownloaded = downloadedIds.has(r.id);

    return (
      '<article class="resource-card" data-id="' + r.id + '" data-type="' + r.type + '" ' +
      'data-search="' + escapeHtml((r.title + ' ' + r.subject + ' ' + r.faculty + ' ' + r.courseCode + ' ' + r.fileName + ' ' + r.tags.join(' ')).toLowerCase()) + '">' +
        '<div class="resource-thumb ' + meta.thumb + '">' +
          '<span class="resource-thumb-badge file-badge ' + meta.badge + '">' + meta.label + '</span>' +
          formatIconSvg(r.format, 30) +
        '</div>' +
        '<div class="resource-card-body">' +
          '<div class="resource-card-title-block">' +
            '<div class="resource-card-top-row">' +
              '<span class="resource-subject">' + escapeHtml(r.subject) + '</span>' +
            '</div>' +
            '<h3 class="resource-card-title">' + escapeHtml(r.title) + '</h3>' +
            '<p class="resource-card-sub">' + escapeHtml(r.courseCode) + ' \u00b7 ' + escapeHtml(r.faculty) + '</p>' +
            '<p class="resource-card-desc">' + escapeHtml(r.description) + '</p>' +
          '</div>' +
          '<div class="resource-tags">' + r.tags.map(function (t) { return '<span class="resource-tag-chip">' + escapeHtml(t) + '</span>'; }).join('') + '</div>' +
          '<div class="resource-card-meta">' +
            '<div class="resource-meta-left">' +
              '<span class="resource-meta-item">' + metaIcon('calendar') + r.uploadDate + '</span>' +
              '<span class="resource-meta-item">' + metaIcon('size') + r.size + '</span>' +
              '<span class="resource-meta-item">' + metaIcon('download') + '<span class="js-download-count">' + currentDownloadCount(r) + '</span></span>' +
            '</div>' +
            '<span class="rating-stars" title="' + r.rating + ' out of 5">' + starsSvg(r.rating) + '<span class="rating-value">' + r.rating.toFixed(1) + '</span></span>' +
          '</div>' +
        '</div>' +
        '<div class="resource-card-actions">' +
          '<button type="button" class="btn btn-sm btn-outline resource-preview-btn" data-id="' + r.id + '">Preview</button>' +
          '<button type="button" class="btn btn-sm btn-primary resource-download-btn' + (isDownloaded ? ' is-downloaded' : '') + '" data-id="' + r.id + '">' +
            (isDownloaded ? 'Downloaded' : 'Download') +
          '</button>' +
          '<div class="card-actions">' +
            '<button type="button" class="icon-btn bookmark-btn' + (isBookmarked ? ' is-bookmarked' : '') + '" data-id="' + r.id + '" aria-pressed="' + isBookmarked + '" aria-label="' + (isBookmarked ? 'Remove from favorites' : 'Add to favorites') + '">' +
              '<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-3.8L5.5 20V5.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<button type="button" class="icon-btn resource-share-btn" data-id="' + r.id + '" aria-label="Share this resource">' +
              '<svg viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M8.2 10.7l7.6-4.2M8.2 13.3l7.6 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
            '</button>' +
            '<div class="more-menu-wrap">' +
              '<button type="button" class="icon-btn resource-more-btn" data-id="' + r.id + '" aria-haspopup="true" aria-expanded="false" aria-label="More options">' +
                '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5.5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="18.5" r="1.6" fill="currentColor"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  /* ============================================================
     SKELETON LOADING
     ============================================================ */
  function skeletonCardHtml() {
    return (
      '<div class="skeleton-card">' +
        '<div class="skeleton-thumb"></div>' +
        '<div class="skeleton-body">' +
          '<div class="skeleton-line skeleton-line--short"></div>' +
          '<div class="skeleton-line skeleton-line--wide"></div>' +
          '<div class="skeleton-line skeleton-line--mid"></div>' +
        '</div>' +
      '</div>'
    );
  }
  function renderSkeleton(count) {
    resourcesGrid.innerHTML = new Array(count || 6).fill(0).map(skeletonCardHtml).join('');
  }

  /* ============================================================
     RENDER GRID + PAGINATION
     ============================================================ */
  const resourcesGrid = document.getElementById('resourcesGrid');
  const resourcesPageEmpty = document.getElementById('resourcesPageEmpty');
  const resultCountEl = document.getElementById('resultCount');

  function renderResourcesGrid() {
    const totalPages = Math.max(1, Math.ceil(filteredResources.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredResources.slice(start, start + PAGE_SIZE);

    resourcesGrid.innerHTML = pageItems.map(renderResourceCard).join('');
    resourcesGrid.classList.toggle('is-list-view', viewMode === 'list');
    resourcesPageEmpty.classList.toggle('is-visible', filteredResources.length === 0);
    resultCountEl.innerHTML = '<strong>' + filteredResources.length + '</strong> resource' + (filteredResources.length === 1 ? '' : 's');
    renderPagination(totalPages);
  }

  /* ============================================================
     SORT
     ============================================================ */
  function sortResources(list) {
    const sorted = list.slice();
    switch (sortMode) {
      case 'oldest':
        sorted.sort(function (a, b) { return new Date(a.uploadDateISO) - new Date(b.uploadDateISO); });
        break;
      case 'downloads':
        sorted.sort(function (a, b) { return currentDownloadCount(b) - currentDownloadCount(a); });
        break;
      case 'rating':
        sorted.sort(function (a, b) { return b.rating - a.rating; });
        break;
      case 'alpha':
        sorted.sort(function (a, b) { return a.title.localeCompare(b.title); });
        break;
      case 'newest':
      default:
        sorted.sort(function (a, b) { return new Date(b.uploadDateISO) - new Date(a.uploadDateISO); });
    }
    return sorted;
  }

  /* ============================================================
     FILTER + SEARCH (combined) — future: GET /api/resources/search
     ============================================================ */
  const resourcesSearchInput = document.getElementById('resourcesPageSearch');
  const resourcesFilterChips = document.getElementById('resourcesPageFilters');

  function applyFiltersAndSearch() {
    const query = searchQuery.trim().toLowerCase();
    let base = RESOURCES.slice();

    if (activeFilter === 'favorites') {
      base = base.filter(function (r) { return bookmarkedIds.has(r.id); });
    } else if (activeFilter === 'recent') {
      base = base.filter(function (r) { return daysUntil(r.uploadDateISO) >= -14; });
    } else if (activeFilter === 'my-downloads') {
      base = base.filter(function (r) { return downloadedIds.has(r.id); });
    } else if (activeFilter !== 'all') {
      base = base.filter(function (r) { return r.type === activeFilter; });
    }

    if (query) {
      base = base.filter(function (r) {
        const haystack = (r.title + ' ' + r.subject + ' ' + r.faculty + ' ' + r.courseCode + ' ' + r.fileName + ' ' + r.tags.join(' ')).toLowerCase();
        return haystack.indexOf(query) !== -1;
      });
    }

    filteredResources = sortResources(base);
    currentPage = 1;
    renderResourcesGrid();
  }

  let resourcesSearchDebounce = null;
  resourcesSearchInput.addEventListener('input', function () {
    searchQuery = resourcesSearchInput.value;
    clearTimeout(resourcesSearchDebounce);
    resourcesSearchDebounce = setTimeout(applyFiltersAndSearch, 220);
  });

  resourcesFilterChips.addEventListener('click', function (event) {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    resourcesFilterChips.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('is-active'); });
    chip.classList.add('is-active');
    activeFilter = chip.dataset.filter;
    applyFiltersAndSearch();
  });

  document.getElementById('resourcesSortSelect').addEventListener('change', function (event) {
    sortMode = event.target.value;
    applyFiltersAndSearch();
  });

  document.getElementById('resetFiltersBtn').addEventListener('click', function () {
    activeFilter = 'all';
    searchQuery = '';
    resourcesSearchInput.value = '';
    resourcesFilterChips.querySelectorAll('.filter-chip').forEach(function (c, i) { c.classList.toggle('is-active', i === 0); });
    applyFiltersAndSearch();
  });

  /* ============================================================
     VIEW MODE TOGGLE
     ============================================================ */
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewListBtn = document.getElementById('viewListBtn');
  function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('vectorone-resources-view', mode);
    viewGridBtn.classList.toggle('is-active', mode === 'grid');
    viewGridBtn.setAttribute('aria-pressed', String(mode === 'grid'));
    viewListBtn.classList.toggle('is-active', mode === 'list');
    viewListBtn.setAttribute('aria-pressed', String(mode === 'list'));
    resourcesGrid.classList.toggle('is-list-view', mode === 'list');
  }
  viewGridBtn.addEventListener('click', function () { setViewMode('grid'); });
  viewListBtn.addEventListener('click', function () { setViewMode('list'); });

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
      '<nav class="pagination" aria-label="Resources pagination">' +
        '<button type="button" class="pagination-btn pagination-prev" id="resourcesPaginationPrev"' + (currentPage === 1 ? ' disabled' : '') + '>' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Previous' +
        '</button>' +
        '<div class="pagination-pages">' + pagesHtml + '</div>' +
        '<button type="button" class="pagination-btn pagination-next" id="resourcesPaginationNext"' + (currentPage === totalPages ? ' disabled' : '') + '>' +
          'Next<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
      '</nav>';
  }

  paginationMount.addEventListener('click', function (event) {
    const pageBtn = event.target.closest('.pagination-page');
    const prevBtn = event.target.closest('#resourcesPaginationPrev');
    const nextBtn = event.target.closest('#resourcesPaginationNext');
    if (pageBtn) currentPage = Number(pageBtn.dataset.page);
    else if (prevBtn && currentPage > 1) currentPage -= 1;
    else if (nextBtn) currentPage += 1;
    else return;
    renderResourcesGrid();
    resourcesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ============================================================
     DOWNLOAD — simulated progress + toast (future: POST /api/resources/download)
     ============================================================ */
  function startDownload(resource, button) {
    if (button.classList.contains('is-downloading')) return;
    button.classList.add('is-downloading');
    const originalText = button.textContent;
    button.textContent = 'Downloading…';

    const track = document.createElement('div');
    track.className = 'download-progress-track';
    const fill = document.createElement('div');
    fill.className = 'download-progress-fill';
    track.appendChild(fill);
    button.appendChild(track);

    let pct = 0;
    const timer = setInterval(function () {
      pct = Math.min(100, pct + Math.random() * 22 + 12);
      fill.style.width = pct + '%';
      if (pct >= 100) {
        clearInterval(timer);
        finishDownload(resource, button, originalText, track);
      }
    }, 140);
  }

  function finishDownload(resource, button, originalText, track) {
    track.remove();
    button.classList.remove('is-downloading');
    button.classList.add('is-downloaded');
    button.textContent = 'Downloaded';

    const wasNew = !downloadedIds.has(resource.id);
    downloadedIds.add(resource.id);
    if (wasNew) {
      downloadCountsById[resource.id] = currentDownloadCount(resource) + 1;
      downloadedTodayCount += 1;
    }

    document.querySelectorAll('.resource-card[data-id="' + resource.id + '"] .js-download-count').forEach(function (el) {
      el.textContent = currentDownloadCount(resource);
    });

    showToast('"' + resource.title + '" downloaded successfully.', 'success');
    renderStats();
    renderRecentDownloads();

    setTimeout(function () {
      button.textContent = originalText === 'Download' ? 'Downloaded' : originalText;
    }, 100);
  }

  /* ============================================================
     DELEGATED CARD ACTIONS
     ============================================================ */
  let openMoreMenuId = null;

  function closeMoreMenu() {
    const existing = document.querySelector('.more-menu');
    if (existing) existing.remove();
    openMoreMenuId = null;
  }

  function toggleMoreMenu(id, button) {
    if (openMoreMenuId === id) { closeMoreMenu(); return; }
    closeMoreMenu();
    openMoreMenuId = id;
    const wrap = button.closest('.more-menu-wrap');
    const menu = document.createElement('div');
    menu.className = 'more-menu';
    menu.innerHTML =
      '<button type="button" class="more-menu-copy-title" data-id="' + id + '"><svg viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Copy title</button>' +
      '<button type="button" class="more-menu-report" data-id="' + id + '"><svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 16.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/></svg>Report an issue</button>';
    wrap.appendChild(menu);
    button.setAttribute('aria-expanded', 'true');
  }

  document.addEventListener('click', function (event) {
    if (!event.target.closest('.more-menu-wrap') && openMoreMenuId) closeMoreMenu();
  });

  function handleGridClick(event) {
    const card = event.target.closest('.resource-card');
    if (!card) return;
    const resource = findResource(card.dataset.id);
    if (!resource) return;

    const previewBtn = event.target.closest('.resource-preview-btn');
    if (previewBtn) { openPreviewModal(resource); return; }

    const downloadBtn = event.target.closest('.resource-download-btn');
    if (downloadBtn) { startDownload(resource, downloadBtn); return; }

    const bookmarkBtn = event.target.closest('.bookmark-btn');
    if (bookmarkBtn) {
      const nowBookmarked = !bookmarkedIds.has(resource.id);
      setBookmark(resource.id, nowBookmarked);
      bookmarkBtn.classList.toggle('is-bookmarked', nowBookmarked);
      bookmarkBtn.setAttribute('aria-pressed', String(nowBookmarked));
      bookmarkBtn.setAttribute('aria-label', nowBookmarked ? 'Remove from favorites' : 'Add to favorites');
      renderStats();
      renderFavoriteResources();
      if (activeFilter === 'favorites') applyFiltersAndSearch();
      return;
    }

    const shareBtn = event.target.closest('.resource-share-btn');
    if (shareBtn) { openShareModal(resource); return; }

    const moreBtn = event.target.closest('.resource-more-btn');
    if (moreBtn) { toggleMoreMenu(resource.id, moreBtn); return; }

    const copyTitleBtn = event.target.closest('.more-menu-copy-title');
    if (copyTitleBtn) {
      copyText(resource.title);
      showToast('Title copied to clipboard.', 'info');
      closeMoreMenu();
      return;
    }
    const reportBtn = event.target.closest('.more-menu-report');
    if (reportBtn) {
      showToast('Thanks — this resource has been flagged for review.', 'info');
      closeMoreMenu();
      return;
    }
  }
  resourcesGrid.addEventListener('click', handleGridClick);

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { /* clipboard unavailable — no-op */ });
    }
  }

  /* ============================================================
     PREVIEW MODAL
     ============================================================ */
  const previewOverlay = document.getElementById('previewModalOverlay');
  const previewBadges = document.getElementById('previewModalBadges');
  const previewTitle = document.getElementById('previewModalTitle');
  const previewDesc = document.getElementById('previewModalDesc');
  const previewMeta = document.getElementById('previewModalMeta');
  const previewTags = document.getElementById('previewModalTags');
  const previewInfoGrid = document.getElementById('previewInfoGrid');
  const previewBookmarkBtn = document.getElementById('previewModalBookmark');
  const previewShareBtn = document.getElementById('previewModalShare');
  const previewDownloadBtn = document.getElementById('previewModalDownload');

  let previewTarget = null;
  let lastFocusedEl = null;

  function openPreviewModal(resource) {
    previewTarget = resource;
    const meta = FORMAT_META[resource.format];

    previewBadges.innerHTML =
      '<span class="file-badge ' + meta.badge + '">' + meta.label + '</span>' +
      '<span class="tag tag--academic">' + FILTER_LABELS[resource.type] + '</span>';
    previewTitle.textContent = resource.title;
    previewDesc.textContent = resource.description;

    previewMeta.innerHTML =
      '<span class="modal-meta-item">' + metaIcon('user') + resource.faculty + '</span>' +
      '<span class="modal-meta-item">' + metaIcon('calendar') + resource.uploadDate + '</span>' +
      '<span class="modal-meta-item"><span class="rating-stars">' + starsSvg(resource.rating) + '</span><span class="rating-value">' + resource.rating.toFixed(1) + '</span><span class="rating-count">(' + resource.ratingCount + ')</span></span>';

    previewTags.innerHTML = resource.tags.map(function (t) { return '<span class="resource-tag-chip">' + escapeHtml(t) + '</span>'; }).join('');

    previewInfoGrid.innerHTML =
      '<div class="preview-info-item"><span class="preview-info-label">Subject</span><span class="preview-info-value">' + escapeHtml(resource.subject) + '</span></div>' +
      '<div class="preview-info-item"><span class="preview-info-label">Course Code</span><span class="preview-info-value">' + escapeHtml(resource.courseCode) + '</span></div>' +
      '<div class="preview-info-item"><span class="preview-info-label">File</span><span class="preview-info-value">' + escapeHtml(resource.fileName) + '</span></div>' +
      '<div class="preview-info-item"><span class="preview-info-label">File Size</span><span class="preview-info-value">' + resource.size + '</span></div>' +
      '<div class="preview-info-item"><span class="preview-info-label">Downloads</span><span class="preview-info-value">' + currentDownloadCount(resource) + '</span></div>' +
      '<div class="preview-info-item"><span class="preview-info-label">Format</span><span class="preview-info-value">' + meta.label + '</span></div>';

    const isBookmarked = bookmarkedIds.has(resource.id);
    previewBookmarkBtn.classList.toggle('is-bookmarked', isBookmarked);
    previewBookmarkBtn.setAttribute('aria-pressed', String(isBookmarked));

    lastFocusedEl = document.activeElement;
    previewOverlay.hidden = false;
    requestAnimationFrame(function () { previewOverlay.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    document.getElementById('previewModalClose').focus();
  }

  function closePreviewModal() {
    previewOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { previewOverlay.hidden = true; }, 200);
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  document.getElementById('previewModalClose').addEventListener('click', closePreviewModal);
  document.getElementById('previewModalCloseFooter').addEventListener('click', closePreviewModal);
  previewOverlay.addEventListener('click', function (event) { if (event.target === previewOverlay) closePreviewModal(); });

  previewBookmarkBtn.addEventListener('click', function () {
    if (!previewTarget) return;
    const nowBookmarked = !bookmarkedIds.has(previewTarget.id);
    setBookmark(previewTarget.id, nowBookmarked);
    previewBookmarkBtn.classList.toggle('is-bookmarked', nowBookmarked);
    previewBookmarkBtn.setAttribute('aria-pressed', String(nowBookmarked));
    document.querySelectorAll('.resource-card[data-id="' + previewTarget.id + '"] .bookmark-btn').forEach(function (btn) {
      btn.classList.toggle('is-bookmarked', nowBookmarked);
      btn.setAttribute('aria-pressed', String(nowBookmarked));
    });
    renderStats();
    renderFavoriteResources();
  });
  previewShareBtn.addEventListener('click', function () { if (previewTarget) openShareModal(previewTarget); });
  previewDownloadBtn.addEventListener('click', function () { if (previewTarget) startDownload(previewTarget, previewDownloadBtn); });

  /* ============================================================
     SHARE DIALOG (future: POST /api/resources/share)
     ============================================================ */
  const shareOverlay = document.getElementById('shareModalOverlay');
  const shareResourceName = document.getElementById('shareModalResourceName');
  const shareLinkInput = document.getElementById('shareLinkInput');
  const shareCopyBtn = document.getElementById('shareCopyBtn');
  const shareInternalBtn = document.getElementById('shareInternalBtn');

  function openShareModal(resource) {
    shareResourceName.innerHTML = 'Sharing <strong>' + escapeHtml(resource.title) + '</strong>';
    shareLinkInput.value = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'resources.html#resource-' + resource.id;
    lastFocusedEl = document.activeElement;
    shareOverlay.hidden = false;
    requestAnimationFrame(function () { shareOverlay.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
  }
  function closeShareModal() {
    shareOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { shareOverlay.hidden = true; }, 200);
    if (lastFocusedEl) lastFocusedEl.focus();
  }
  document.getElementById('shareModalClose').addEventListener('click', closeShareModal);
  document.getElementById('shareModalCloseFooter').addEventListener('click', closeShareModal);
  shareOverlay.addEventListener('click', function (event) { if (event.target === shareOverlay) closeShareModal(); });

  shareCopyBtn.addEventListener('click', function () {
    shareLinkInput.select();
    copyText(shareLinkInput.value);
    showToast('Link copied to clipboard.', 'success');
  });
  shareInternalBtn.addEventListener('click', function () {
    showToast('Shared with your batch.', 'success');
    closeShareModal();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (previewOverlay.classList.contains('is-open')) closePreviewModal();
    if (shareOverlay.classList.contains('is-open')) closeShareModal();
  });

  /* ============================================================
     RIGHT SIDEBAR WIDGETS
     ============================================================ */
  function resourceIconChip(r) {
    const meta = FORMAT_META[r.format];
    return '<span class="mini-resource-icon ' + meta.thumb + '">' + formatIconSvg(r.format, 15) + '</span>';
  }

  function renderRecentDownloads() {
    const mount = document.getElementById('recentDownloadsList');
    const items = Array.from(downloadedIds).map(findResource).filter(Boolean).slice(-4).reverse();
    if (!items.length) {
      mount.innerHTML = '<p class="empty-hint">Nothing downloaded yet this session.</p>';
      return;
    }
    mount.innerHTML = items.map(function (r) {
      return (
        '<div class="mini-resource-item" data-id="' + r.id + '">' +
          resourceIconChip(r) +
          '<div><p class="mini-resource-title">' + escapeHtml(r.title) + '</p><p class="mini-resource-sub">' + r.size + '</p></div>' +
        '</div>'
      );
    }).join('');
  }

  function renderPopularResources() {
    const mount = document.getElementById('popularResourcesList');
    const items = RESOURCES.slice().sort(function (a, b) { return currentDownloadCount(b) - currentDownloadCount(a); }).slice(0, 4);
    mount.innerHTML = items.map(function (r) {
      return (
        '<div class="mini-resource-item" data-id="' + r.id + '">' +
          resourceIconChip(r) +
          '<div><p class="mini-resource-title">' + escapeHtml(r.title) + '</p><p class="mini-resource-sub">' + currentDownloadCount(r) + ' downloads</p></div>' +
        '</div>'
      );
    }).join('');
  }

  function renderFavoriteResources() {
    const mount = document.getElementById('favoriteResourcesList');
    const items = RESOURCES.filter(function (r) { return bookmarkedIds.has(r.id); }).slice(0, 5);
    if (!items.length) {
      mount.innerHTML = '<p class="empty-hint">No favorites yet — tap the bookmark icon on any resource.</p>';
      return;
    }
    mount.innerHTML = items.map(function (r) {
      return (
        '<div class="mini-resource-item" data-id="' + r.id + '">' +
          resourceIconChip(r) +
          '<div><p class="mini-resource-title">' + escapeHtml(r.title) + '</p><p class="mini-resource-sub">' + escapeHtml(r.subject) + '</p></div>' +
        '</div>'
      );
    }).join('');
  }

  function renderRecentlyUploaded() {
    const mount = document.getElementById('recentlyUploadedList');
    const items = RESOURCES.slice().sort(function (a, b) { return new Date(b.uploadDateISO) - new Date(a.uploadDateISO); }).slice(0, 4);
    mount.innerHTML = items.map(function (r) {
      return (
        '<div class="mini-resource-item" data-id="' + r.id + '">' +
          resourceIconChip(r) +
          '<div><p class="mini-resource-title">' + escapeHtml(r.title) + '</p><p class="mini-resource-sub">' + r.uploadDate + '</p></div>' +
        '</div>'
      );
    }).join('');
  }

  function renderSubjectProgress() {
    const mount = document.getElementById('subjectProgressList');
    const bySubject = {};
    RESOURCES.forEach(function (r) { bySubject[r.subject] = (bySubject[r.subject] || 0) + 1; });
    const maxCount = Math.max.apply(null, Object.values(bySubject));
    const names = Object.keys(bySubject).sort(function (a, b) { return bySubject[b] - bySubject[a]; }).slice(0, 5);
    mount.innerHTML = names.map(function (name) {
      const count = bySubject[name];
      const pct = Math.round((count / maxCount) * 100);
      return (
        '<div class="subject-progress-item">' +
          '<div class="subject-progress-top"><span class="subject-progress-name">' + escapeHtml(name) + '</span><span class="subject-progress-count">' + count + '</span></div>' +
          '<div class="subject-progress-track"><div class="subject-progress-fill" style="width:' + pct + '%"></div></div>' +
        '</div>'
      );
    }).join('');
  }

  function renderStorageUsage() {
    const used = 4.3, total = 15;
    document.getElementById('storageUsageText').textContent = used + ' GB of ' + total + ' GB';
    document.getElementById('storageUsageFill').style.width = Math.round((used / total) * 100) + '%';
    const breakdown = [
      { label: 'PDFs & Docs', pct: 58, colorVar: 'var(--danger)' },
      { label: 'Videos', pct: 24, colorVar: 'var(--accent-purple)' },
      { label: 'Slides & Sheets', pct: 18, colorVar: 'var(--warning)' }
    ];
    document.getElementById('storageBreakdown').innerHTML = breakdown.map(function (b) {
      return '<div class="storage-breakdown-item"><span class="storage-breakdown-dot" style="background:' + b.colorVar + '"></span>' + b.label + ' \u2014 ' + b.pct + '%</div>';
    }).join('');
  }

  /* ============================================================
     PAGE HEADER — Refresh & My Downloads
     ============================================================ */
  document.getElementById('resourcesRefreshBtn').addEventListener('click', function () {
    const btn = this;
    if (btn.classList.contains('is-refreshing')) return;
    btn.classList.add('is-refreshing');
    renderSkeleton(6);
    setTimeout(function () {
      applyFiltersAndSearch();
      renderStats();
      btn.classList.remove('is-refreshing');
      showToast('Resources refreshed.', 'info');
    }, 550);
  });

  document.getElementById('myDownloadsBtn').addEventListener('click', function () {
    activeFilter = 'my-downloads';
    resourcesFilterChips.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('is-active'); });
    searchQuery = '';
    resourcesSearchInput.value = '';
    applyFiltersAndSearch();
    resourcesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ============================================================
     INITIAL RENDER & LIVE API FETCH
     ============================================================ */
  renderSkeleton(6);
  setTimeout(function () {
    filteredResources = sortResources(RESOURCES.slice());
    renderResourcesGrid();
    renderStats();
    renderRecentDownloads();
    renderPopularResources();
    renderFavoriteResources();
    renderRecentlyUploaded();
    renderSubjectProgress();
    renderStorageUsage();

    (function loadLiveResources() {
      const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('vectorone_token');
      const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

      fetch(API_BASE + '/resources?limit=50', { headers: headers })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const liveResources = res.data.map(function (d, i) {
              const ext = (d.fileExtension || 'PDF').toLowerCase();
              const dateStr = d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
              return {
                id: d.resourceId || ('r' + (i + 1)),
                _rawId: d.id,
                title: d.title,
                subject: d.department?.name || 'General Course',
                courseCode: d.department?.deptId || 'DEP-101',
                faculty: d.uploadedBy?.fullName || 'Faculty Member',
                type: d.type ? d.type.toLowerCase() : 'notes',
                format: ext,
                fileName: d.fileName || (d.title + '.' + ext),
                size: d.fileSize || '2.4 MB',
                uploadDate: dateStr,
                uploadDateISO: d.createdAt ? d.createdAt.slice(0, 10) : '2026-07-20',
                downloads: d.downloadCount || 10,
                rating: 4.8,
                ratingCount: 15,
                description: d.description || 'Academic study material provided for reference and revision.',
                tags: ['Notes', 'Course Material']
              };
            });

            RESOURCES.length = 0;
            liveResources.forEach(function (r) { RESOURCES.push(r); });
            filteredResources = sortResources(RESOURCES.slice());
            renderResourcesGrid();
            renderStats();
            renderRecentDownloads();
            renderPopularResources();
            renderFavoriteResources();
            renderRecentlyUploaded();
            renderSubjectProgress();
            renderStorageUsage();
          }
        })
        .catch(function () {});
    })();
  }, 550);

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
