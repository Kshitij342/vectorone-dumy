/* ============================================================
   VectorOne — Dashboard Logic
   Shares the 'cc-theme' localStorage key with login/register.
   Handles: sidebar collapse (desktop) / drawer (mobile), the
   notification and user popovers, live search with a small mock
   dataset, notice-row navigation, bookmark toggling, a generated
   mini calendar, and a subtle button ripple. No backend calls.
   ============================================================ */

(function () {
  'use strict';
  /* Auth protection is handled by js/auth-guard.js loaded in <head>.
     Do not duplicate the token check here. */
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
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }
  if (themeToggle) {
    applyTheme(currentTheme());
    themeToggle.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------------- User settings persistence ---------------- */
  const SETTINGS_STORAGE_KEY = 'vectorone-settings';
  const SETTINGS_DEFAULTS = {
    assignmentReminders: true,
    eventInvites: true,
    compactDashboard: false,
    showUnreadBadges: true
  };

  function readSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      return Object.assign({}, SETTINGS_DEFAULTS, stored);
    } catch (error) {
      return Object.assign({}, SETTINGS_DEFAULTS);
    }
  }

  function writeSettings(settings) {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  function applySettingsState() {
    const settings = readSettings();
    document.querySelectorAll('.settings-toggle-input').forEach(function (input) {
      const key = input.getAttribute('data-setting');
      const enabled = Boolean(settings[key] ?? SETTINGS_DEFAULTS[key]);
      input.checked = enabled;
      input.setAttribute('aria-checked', enabled ? 'true' : 'false');
      const switchWrap = input.closest('.settings-switch');
      if (switchWrap) switchWrap.classList.toggle('is-checked', enabled);
    });

    const unreadBadgeSetting = settings.showUnreadBadges !== false;
    document.querySelectorAll('.badge').forEach(function (badge) {
      badge.classList.toggle('is-hidden', !unreadBadgeSetting);
    });

    document.body.classList.toggle('compact-dashboard', Boolean(settings.compactDashboard));
  }

  document.querySelectorAll('.settings-toggle-input').forEach(function (input) {
    input.addEventListener('change', function () {
      const key = input.getAttribute('data-setting');
      const settings = readSettings();
      settings[key] = input.checked;
      writeSettings(settings);
      input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      const switchWrap = input.closest('.settings-switch');
      if (switchWrap) switchWrap.classList.toggle('is-checked', input.checked);

      if (key === 'showUnreadBadges') {
        document.querySelectorAll('.badge').forEach(function (badge) {
          badge.classList.toggle('is-hidden', !input.checked);
        });
      }

      if (key === 'compactDashboard') {
        document.body.classList.toggle('compact-dashboard', input.checked);
      }
    });
  });

  applySettingsState();

  /* ---------------- Sidebar: collapse (desktop) vs drawer (mobile) ---------------- */
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const MOBILE_BREAKPOINT = 1024;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function openDrawer() {
    if (!sidebar || !sidebarBackdrop || !sidebarToggle) return;
    sidebar.classList.add('is-open');
    sidebarBackdrop.classList.add('is-visible');
    sidebarToggle.setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    if (!sidebar || !sidebarBackdrop || !sidebarToggle) return;
    sidebar.classList.remove('is-open');
    sidebarBackdrop.classList.remove('is-visible');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      if (!sidebar) return;
      if (isMobile()) {
        sidebar.classList.contains('is-open') ? closeDrawer() : openDrawer();
      } else {
        const collapsed = document.body.classList.toggle('sidebar-collapsed');
        sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
      }
    });
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeDrawer);
  }

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

  if (markAllReadBtn && notificationList && notificationBadge) {
    markAllReadBtn.addEventListener('click', function () {
      notificationList.querySelectorAll('.notification-item.is-unread').forEach(function (item) {
        item.classList.remove('is-unread');
        const dot = item.querySelector('.notification-dot');
        if (dot) dot.remove();
      });
      notificationBadge.textContent = '0';
      notificationBadge.classList.add('is-hidden');

      const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('vectorone_token');
      if (token) {
        fetch(API_BASE + '/notifications/read-all', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        }).catch(function () { });
      }
    });
  }

  // Live User Info & Notification Sync
  (function syncLiveUserState() {
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    if (!token) return;

    fetch(API_BASE + '/auth/me', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function (r) {
        if (r.status === 401) {
          localStorage.removeItem('vectorone_token');
          localStorage.removeItem('vectorone_user');
          if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
          }
          return null;
        }
        return r.json();
      })
      .then(function (res) {
        if (res && res.success && res.data) {
          const user = res.data;
          const student = user.student;
          const fullName = student?.fullName || user.email.split('@')[0];
          const initials = fullName.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();

          document.querySelectorAll('.user-menu-name').forEach(function (el) { el.textContent = fullName; });
          document.querySelectorAll('.avatar, .user-menu-btn .avatar').forEach(function (el) { el.textContent = initials; });

          // If on profile.html, update profile layout
          const profileHero = document.querySelector('.profile-identity');
          if (profileHero) {
            const h2 = profileHero.querySelector('h2');
            if (h2) h2.textContent = fullName;
            const p = profileHero.querySelector('p');
            if (p && student?.department) p.textContent = (student.department.name || 'Computer Science') + ' · Semester ' + (student.semester || 1);
            const avatar = document.querySelector('.profile-avatar');
            if (avatar) avatar.textContent = initials;
          }
        }
      })
      .catch(function () { });

    // Notifications
    fetch(API_BASE + '/notifications', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && Array.isArray(res.data) && notificationBadge) {
          const unreadCount = res.data.filter(function (n) { return !n.isRead; }).length;
          notificationBadge.textContent = String(unreadCount);
          notificationBadge.classList.toggle('is-hidden', unreadCount === 0);

          if (notificationList && res.data.length > 0) {
            notificationList.innerHTML = res.data.map(function (n) {
              return '<li class="notification-item' + (!n.isRead ? ' is-unread' : '') + '">' +
                '<p class="notification-title">' + n.title + '</p>' +
                '<p class="notification-body">' + (n.message || '') + '</p>' +
                '</li>';
            }).join('');
          }
        }
      })
      .catch(function () { });
  })();

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

  if (!searchWrap || !searchInput || !searchPanel || !searchResultsList || !recentSearchList) {
    // Pages like Settings share the same app shell but omit the search widgets.
    // Skip dashboard-only search setup on those pages instead of crashing.
  } else {

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
  }

  /* ---------------- Recent notices: row navigation ---------------- */
  document.querySelectorAll('#noticesTableBody tr[data-href]').forEach(function (row) {
    row.addEventListener('click', function () {
      window.location.href = row.dataset.href;
    });
    row.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        window.location.href = row.dataset.href;
      }
    });
  });

  /* ---------------- Event bookmarks ---------------- */
  document.querySelectorAll('.bookmark-btn').forEach(function (button) {
    button.addEventListener('click', function () {
      const isBookmarked = button.classList.toggle('is-bookmarked');
      button.setAttribute('aria-pressed', String(isBookmarked));
      button.setAttribute('aria-label', isBookmarked ? 'Remove bookmark' : 'Bookmark this event');
    });
  });

  /* ---------------- Event register buttons (frontend-only toggle) ---------------- */
  document.querySelectorAll('.event-register').forEach(function (button) {
    if (button.disabled) return;
    button.addEventListener('click', function () {
      button.textContent = 'Registered';
      button.disabled = true;
      button.classList.remove('btn-primary');
      button.classList.add('btn-outline');
    });
  });

  /* ---------------- Mini calendar ---------------- */
  (function buildMiniCalendar() {
    const grid = document.getElementById('miniCalendarGrid');
    const label = document.getElementById('miniCalendarLabel');
    if (!grid || !label) return;

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

  /* ---------------- Notices: filter chips + inline search + sort ---------------- */
  const noticeFilterChips = document.getElementById('noticeFilterChips');
  const noticesSearchInput = document.getElementById('noticesSearchInput');
  const noticesSortByDate = document.getElementById('noticesSortByDate');
  const noticesTableBody = document.getElementById('noticesTableBody');
  const noticesEmpty = document.getElementById('noticesEmpty');

  if (noticeFilterChips && noticesTableBody) {
    let activeFilter = 'all';
    const rows = Array.prototype.slice.call(noticesTableBody.querySelectorAll('tr'));

    function applyNoticeFilters() {
      const query = (noticesSearchInput.value || '').trim().toLowerCase();
      let visibleCount = 0;

      rows.forEach(function (row) {
        const matchesCategory = activeFilter === 'all' || row.dataset.category === activeFilter;
        const title = row.querySelector('.notice-title');
        const matchesQuery = !query || (title && title.textContent.toLowerCase().includes(query));
        const show = matchesCategory && matchesQuery;
        row.classList.toggle('is-filtered-out', !show);
        if (show) visibleCount++;
      });

      noticesEmpty.hidden = visibleCount !== 0;
    }

    noticeFilterChips.addEventListener('click', function (event) {
      const chip = event.target.closest('.filter-chip');
      if (!chip) return;
      noticeFilterChips.querySelectorAll('.filter-chip').forEach(function (c) {
        c.classList.remove('is-active');
      });
      chip.classList.add('is-active');
      activeFilter = chip.dataset.filter;
      applyNoticeFilters();
    });

    noticesSearchInput.addEventListener('input', applyNoticeFilters);

    if (noticesSortByDate) {
      let sortDescending = true;
      noticesSortByDate.addEventListener('click', function () {
        sortDescending = !sortDescending;
        noticesSortByDate.classList.toggle('is-desc', sortDescending);
        const sorted = rows.slice().sort(function (a, b) {
          const dateA = new Date(a.dataset.date).getTime();
          const dateB = new Date(b.dataset.date).getTime();
          return sortDescending ? dateB - dateA : dateA - dateB;
        });
        sorted.forEach(function (row) { noticesTableBody.appendChild(row); });
      });
    }

    // Live API notices fetch
    (function loadLiveStudentDashboard() {
      const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
      fetch(API_BASE + '/notices?limit=10')
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            noticesTableBody.innerHTML = res.data.map(function (n) {
              const dateStr = n.publishedAt ? new Date(n.publishedAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recent';
              return '<tr data-category="' + (n.category || 'Academic') + '" data-date="' + (n.publishedAt || '') + '" data-href="notices.html">' +
                '<td><span class="tag tag--' + (n.category ? n.category.toLowerCase() : 'academic') + '">' + (n.category || 'Academic') + '</span></td>' +
                '<td class="notice-title"><a href="notices.html">' + n.title + '</a></td>' +
                '<td>' + (n.author?.fullName || 'Academic Office') + '</td>' +
                '<td><time datetime="' + (n.publishedAt || '') + '">' + dateStr + '</time></td>' +
                '</tr>';
            }).join('');
          }
        })
        .catch(function () { });
    })();
  }

  /* ---------------- Recent Activity: Load More ---------------- */
  const activityLoadMore = document.getElementById('activityLoadMore');
  const activityMoreGroup = document.getElementById('activityMoreGroup');

  if (activityLoadMore && activityMoreGroup) {
    activityLoadMore.addEventListener('click', function () {
      activityMoreGroup.hidden = false;
      activityLoadMore.classList.add('is-hidden');
    });
  }

  /* ---------------- Notices page: filter chips + search ---------------- */
  const noticesPageFilters = document.getElementById('noticesPageFilters');
  const noticesPageSearch = document.getElementById('noticesPageSearch');
  const noticesList = document.getElementById('noticesList');
  const noticesPageEmpty = document.getElementById('noticesPageEmpty');

  if (noticesPageFilters && noticesList) {
    let activePageFilter = 'all';
    const noticeCards = Array.prototype.slice.call(
      noticesList.querySelectorAll('.notice-card:not(.notice-card--pinned)')
    );

    function applyPageFilters() {
      const query = (noticesPageSearch.value || '').trim().toLowerCase();
      let visibleCount = 0;

      noticeCards.forEach(function (card) {
        const matchesCategory = activePageFilter === 'all' || card.dataset.category === activePageFilter;
        const matchesQuery = !query || (card.dataset.title || '').includes(query);
        const show = matchesCategory && matchesQuery;
        card.classList.toggle('is-filtered-out', !show);
        if (show) visibleCount++;
      });

      if (noticesPageEmpty) noticesPageEmpty.classList.toggle('is-visible', visibleCount === 0);
    }

    noticesPageFilters.addEventListener('click', function (event) {
      const chip = event.target.closest('.filter-chip');
      if (!chip) return;
      noticesPageFilters.querySelectorAll('.filter-chip').forEach(function (c) {
        c.classList.remove('is-active');
      });
      chip.classList.add('is-active');
      activePageFilter = chip.dataset.filter;
      applyPageFilters();
    });

    if (noticesPageSearch) noticesPageSearch.addEventListener('input', applyPageFilters);
  }

  /* ---------------- Notices page: share button feedback ---------------- */
  document.querySelectorAll('.share-btn').forEach(function (button) {
    button.addEventListener('click', function () {
      if (button.classList.contains('is-copied')) return;
      button.classList.add('is-copied');
      const original = button.getAttribute('aria-label');
      button.setAttribute('aria-label', 'Link copied');
      setTimeout(function () {
        button.classList.remove('is-copied');
        button.setAttribute('aria-label', original);
      }, 1600);
    });
  });

  /* ---------------- Notices page: read-more modal ---------------- */
  const noticeModalOverlay = document.getElementById('noticeModalOverlay');

  if (noticeModalOverlay) {
    const noticeModalTitle = document.getElementById('noticeModalTitle');
    const noticeModalBadges = document.getElementById('noticeModalBadges');
    const noticeModalPostedBy = document.getElementById('noticeModalPostedBy');
    const noticeModalDate = document.getElementById('noticeModalDate');
    const noticeModalBody = document.getElementById('noticeModalBody');
    const noticeModalAttachment = document.getElementById('noticeModalAttachment');
    const noticeModalAttachmentName = document.getElementById('noticeModalAttachmentName');
    const noticeModalClose = document.getElementById('noticeModalClose');
    const noticeModalCloseFooter = document.getElementById('noticeModalCloseFooter');

    const CATEGORY_TAG_CLASS = {
      Academic: 'tag--academic',
      Examination: 'tag--exam',
      Placement: 'tag--placement',
      Sports: 'tag--sports',
      Club: 'tag--club',
      Workshop: 'tag--workshop',
      Scholarship: 'tag--scholarship',
      Hostel: 'tag--hostel'
    };
    const PRIORITY_CLASS = {
      High: 'priority--high',
      Medium: 'priority--medium',
      Low: 'priority--low'
    };

    let lastFocusedEl = null;

    function openNoticeModal(trigger) {
      const data = trigger.dataset;

      noticeModalTitle.textContent = data.title || '';
      noticeModalPostedBy.textContent = 'Posted by ' + (data.postedBy || '—');
      noticeModalDate.textContent = data.date || '—';

      noticeModalBadges.innerHTML = '';
      if (data.category) {
        const tagClass = CATEGORY_TAG_CLASS[data.category] || 'tag--academic';
        const tagEl = document.createElement('span');
        tagEl.className = 'tag ' + tagClass;
        tagEl.textContent = data.category;
        noticeModalBadges.appendChild(tagEl);
      }
      if (data.priority) {
        const prClass = PRIORITY_CLASS[data.priority] || 'priority--medium';
        const prEl = document.createElement('span');
        prEl.className = 'priority ' + prClass;
        prEl.textContent = data.priority;
        noticeModalBadges.appendChild(prEl);
      }

      noticeModalBody.innerHTML = (data.body || '')
        .split('||')
        .map(function (para) { return '<p>' + para + '</p>'; })
        .join('');

      if (data.attachment) {
        noticeModalAttachment.hidden = false;
        noticeModalAttachmentName.textContent = data.attachment;
      } else {
        noticeModalAttachment.hidden = true;
      }

      lastFocusedEl = trigger;
      noticeModalOverlay.hidden = false;
      requestAnimationFrame(function () { noticeModalOverlay.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
      noticeModalClose.focus();
    }

    function closeNoticeModal() {
      noticeModalOverlay.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { noticeModalOverlay.hidden = true; }, 200);
      if (lastFocusedEl) lastFocusedEl.focus();
    }

    document.querySelectorAll('.notice-readmore').forEach(function (button) {
      button.addEventListener('click', function () { openNoticeModal(button); });
    });

    noticeModalClose.addEventListener('click', closeNoticeModal);
    noticeModalCloseFooter.addEventListener('click', closeNoticeModal);
    noticeModalOverlay.addEventListener('click', function (event) {
      if (event.target === noticeModalOverlay) closeNoticeModal();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && noticeModalOverlay.classList.contains('is-open')) closeNoticeModal();
    });

    const noticeModalDownload = document.getElementById('noticeModalDownload');
    if (noticeModalDownload) {
      noticeModalDownload.addEventListener('click', function () {
        // Frontend-only demo: no real file to download.
        noticeModalDownload.textContent = 'Downloaded';
        setTimeout(function () {
          noticeModalDownload.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7.5 11.5L12 16l4.5-4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 18.5h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>Download PDF';
        }, 1600);
      });
    }
  }

  /* ---------------- Notices page: pagination (visual) ---------------- */
  const paginationPages = document.getElementById('paginationPages');
  const paginationPrev = document.getElementById('paginationPrev');
  const paginationNext = document.getElementById('paginationNext');

  if (paginationPages) {
    const pageButtons = Array.prototype.slice.call(paginationPages.querySelectorAll('.pagination-page'));

    function setActivePage(pageNumber) {
      pageButtons.forEach(function (btn) {
        btn.classList.toggle('is-active', Number(btn.dataset.page) === pageNumber);
      });
      if (paginationPrev) paginationPrev.disabled = pageNumber === 1;
      if (paginationNext) paginationNext.disabled = pageNumber === pageButtons.length;
      noticesList && noticesList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    paginationPages.addEventListener('click', function (event) {
      const btn = event.target.closest('.pagination-page');
      if (!btn) return;
      setActivePage(Number(btn.dataset.page));
    });

    if (paginationPrev) {
      paginationPrev.addEventListener('click', function () {
        const current = Number(paginationPages.querySelector('.is-active').dataset.page);
        if (current > 1) setActivePage(current - 1);
      });
    }
    if (paginationNext) {
      paginationNext.addEventListener('click', function () {
        const current = Number(paginationPages.querySelector('.is-active').dataset.page);
        if (current < pageButtons.length) setActivePage(current + 1);
      });
    }
  }

  /* ---------------- Subtle button ripple ---------------- */
  document.querySelectorAll('.btn').forEach(function (button) {
    button.addEventListener('click', function (event) {
      if (button.disabled) return;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
      button.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); });
    });
  });
})();
