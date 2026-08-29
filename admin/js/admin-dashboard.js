/* VectorOne Admin Dashboard: frontend-only data rendering and API integration placeholders. */
(function () {
  'use strict';
  const API = { dashboard: '/api/admin/dashboard', search: '/api/admin/search', notifications: '/api/admin/notifications' };
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const icon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M5 20c1-3.5 3.8-5.2 7-5.2s6 1.7 7 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  /* ------------------------------------------------------------------
     Sidebar / UI icon set.
     Keyed by name (never by array index) so adding, removing or
     reordering a nav entry can never shift an icon onto the wrong link.
     All paths follow the existing VectorOne line style: 24x24 viewBox,
     fill="none", currentColor stroke, ~1.6 stroke-width, round caps.
     ------------------------------------------------------------------ */
  const svgIcon = function (body) {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' + body + '</svg>';
  };
  const ICONS = {
    // grid
    dashboard: svgIcon('<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" stroke="currentColor" stroke-width="1.6"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="13" width="7.5" height="7.5" rx="2" stroke="currentColor" stroke-width="1.6"/>'),
    // users / group
    students: svgIcon('<circle cx="9.2" cy="8.4" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M2.8 19.4c.9-3 3.4-4.6 6.4-4.6s5.5 1.6 6.4 4.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M16.4 5.6a3 3 0 0 1 0 5.7M18 19.4c-.3-1.4-.8-2.5-1.6-3.4 2.3.2 4 1.6 4.7 3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
    // teacher at a board
    faculty: svgIcon('<circle cx="12" cy="7.4" r="3.1" stroke="currentColor" stroke-width="1.6"/><path d="M6 20.5v-1.2A4.6 4.6 0 0 1 10.6 14.7h2.8A4.6 4.6 0 0 1 18 19.3v1.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3 3.5h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
    // building
    departments: svgIcon('<path d="M4.5 20.5V6.2a1 1 0 0 1 .7-1l6.5-2.1a1 1 0 0 1 1.3 1v16.4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13 9.5h5.5a1 1 0 0 1 1 1v10H3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.4 8.2h2M7.4 11.6h2M7.4 15h2M15.6 13h1.4M15.6 16.4h1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'),
    // open book
    courses: svgIcon('<path d="M12 6.6C10.4 5.3 8.4 4.6 5.6 4.6a1 1 0 0 0-1 1v11.6a1 1 0 0 0 1 1c2.8 0 4.8.7 6.4 2 1.6-1.3 3.6-2 6.4-2a1 1 0 0 0 1-1V5.6a1 1 0 0 0-1-1c-2.8 0-4.8.7-6.4 2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 6.6v13.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
    // clipboard with a check + clock hint
    attendance: svgIcon('<rect x="4.5" y="4" width="15" height="16.5" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 4v-.5h6V4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.2 12.4l2.2 2.2 4.4-4.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
    // bell
    notices: svgIcon('<path d="M4 18V9a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.5 18h19M9 21h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
    // calendar
    events: svgIcon('<rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
    // clipboard + check
    assignments: svgIcon('<rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 3.5v2.2h6V3.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 12.5l2 2 4-4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
    // file
    resources: svgIcon('<path d="M5 4.5h9.5L19 9v10.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 4.5V9h5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
    // chat bubble
    messages: svgIcon('<path d="M4 6.5A2 2 0 0 1 6 4.5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4.5 4v-4H6a2 2 0 0 1-2-2v-8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
    // document with text lines
    reports: svgIcon('<path d="M6 3.5h7.5L18.5 8.5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13.5 3.5V8.5h5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 13h7M8 16.4h7M8 9.6h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'),
    // bar chart
    analytics: svgIcon('<path d="M3.8 20.2h16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="5.5" y="12" width="3.4" height="5.6" rx="1" stroke="currentColor" stroke-width="1.6"/><rect x="10.3" y="8" width="3.4" height="9.6" rx="1" stroke="currentColor" stroke-width="1.6"/><rect x="15.1" y="4.6" width="3.4" height="13" rx="1" stroke="currentColor" stroke-width="1.6"/>'),
    // gear
    settings: svgIcon('<circle cx="12" cy="12" r="2.8" stroke="currentColor" stroke-width="1.6"/><path d="M19.4 13.5a7.4 7.4 0 0 0 0-3l1.8-1.4-2-3.5-2.1.7a7.4 7.4 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.3a7.4 7.4 0 0 0-2.6 1.5l-2.1-.7-2 3.5L4.6 10.5a7.4 7.4 0 0 0 0 3l-1.8 1.4 2 3.5 2.1-.7c.77.66 1.65 1.16 2.6 1.5l.5 2.3h4l.5-2.3a7.4 7.4 0 0 0 2.6-1.5l2.1.7 2-3.5-1.8-1.4Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'),
    // single user
    profile: svgIcon('<circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.6"/><path d="M4.8 19.2c1.1-3.1 3.9-4.7 7.2-4.7s6.1 1.6 7.2 4.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
    // door + arrow out
    logout: svgIcon('<path d="M14.5 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.8 12h9M18 8.8l3.2 3.2-3.2 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
    // plus
    plus: svgIcon('<path d="M12 5.5v13M5.5 12h13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
    // paper plane (broadcast)
    send: svgIcon('<path d="M20.5 4 3.8 10.6l6.2 2.4 2.4 6.2L20.5 4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 13 20.5 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
    // upload
    upload: svgIcon('<path d="M12 16.5V5.2M8.2 8.8 12 5l3.8 3.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 15v3.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>')
  };
  // Map each quick action to a real icon instead of repeating a plus sign.
  const QUICK_ACTION_ICONS = {
    'Create Student': ICONS.students,
    'Create Faculty': ICONS.faculty,
    'Publish Notice': ICONS.notices,
    'Create Event': ICONS.events,
    'Upload Resource': ICONS.upload,
    'Create Assignment': ICONS.assignments,
    'Generate Report': ICONS.reports,
    'Broadcast Message': ICONS.send
  };
  // Shared with the page scripts that load after this file.
  window.VectorOneAdmin = window.VectorOneAdmin || {};
  window.VectorOneAdmin.icons = ICONS;
  window.VectorOneAdmin.statIcon = function (name) { return ICONS[name] || icon; };
  const stats = [{label:'Total Students',value:4826,trend:'+8.4% this term',tone:'blue'},{label:'Total Faculty',value:312,trend:'+12 this month',tone:'green'},{label:'Departments',value:18,trend:'All active',tone:'purple'},{label:'Courses',value:86,trend:'+4 new courses',tone:'orange'},{label:'Assignments',value:243,trend:'31 awaiting review',tone:'blue'},{label:'Resources',value:1268,trend:'+42 this week',tone:'green'},{label:'Notices',value:128,trend:'9 published today',tone:'purple'},{label:'Events',value:34,trend:'6 this month',tone:'orange'},{label:'Attendance %',value:91.6,suffix:'%',trend:'+2.1% this week',tone:'blue'},{label:'Storage Used',value:68,suffix:'%',trend:'136 GB of 200 GB',tone:'green'},{label:'Pending Approvals',value:17,trend:'Needs attention',tone:'orange'},{label:'System Health',value:99.9,suffix:'%',trend:'All systems operational',tone:'purple'}];
  const navigation = [{label:'Dashboard',file:'admin-dashboard.html',key:'dashboard'},{label:'Students',file:'students.html',key:'students'},{label:'Faculty',file:'faculty.html',key:'faculty'},{label:'Departments',file:'departments.html',key:'departments'},{label:'Courses',file:'courses.html',key:'courses'},{label:'Attendance',file:'attendance.html',key:'attendance'},{label:'Notices',file:'notices.html',key:'notices'},{label:'Events',file:'events.html',key:'events'},{label:'Assignments',file:'assignments.html',key:'assignments'},{label:'Resources',file:'resources.html',key:'resources'},{label:'Messages',file:'messages.html',key:'messages'},{label:'Reports',file:'reports.html',key:'reports'},{label:'Analytics',file:'analytics.html',key:'analytics'},{label:'Settings',file:'settings.html',key:'settings'},{label:'Profile',file:'profile.html',key:'profile'}];
  const registrations = [{name:'Mira Kapoor',meta:'B.Tech Computer Science · 2026',status:'Pending'},{name:'Arjun Nair',meta:'BBA Finance · 2027',status:'Approved'},{name:'Sana Iqbal',meta:'MCA · 2026',status:'Pending'},{name:'Dev Patel',meta:'B.Tech Electronics · 2028',status:'Approved'}];
  const notifications = ['17 student registrations need approval','Department of Design submitted a new course','Storage usage reached 68%','Attendance report is ready','Two faculty accounts were updated'];
  const searchData = [{title:'Mira Kapoor',type:'Student'},{title:'Dr. Rohan Mehta',type:'Faculty'},{title:'Cloud Computing Lab Manual',type:'Resource'},{title:'Annual Tech Symposium',type:'Event'},{title:'Semester Examination Notice',type:'Notice'},{title:'DBMS Assignment Review',type:'Assignment'}];
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('cc-theme', theme);
    const dark = theme === 'dark';
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }
  function currentTheme() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    applyTheme(currentTheme());
    themeToggle.addEventListener('click', function () { applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'); });
  }
  const sidebar = document.getElementById('sidebar'), sidebarToggle = document.getElementById('sidebarToggle'), backdrop = document.getElementById('sidebarBackdrop');
  function closeDrawer() {
    if (!sidebar || !sidebarToggle || !backdrop) return;
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('is-visible');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  }
  if (sidebarToggle && sidebar && backdrop) {
    sidebarToggle.addEventListener('click', function () { if (window.innerWidth <= 1024) { sidebar.classList.contains('is-open') ? closeDrawer() : (sidebar.classList.add('is-open'), backdrop.classList.add('is-visible'), sidebarToggle.setAttribute('aria-expanded', 'true')); } else { const collapsed = document.body.classList.toggle('sidebar-collapsed'); sidebarToggle.setAttribute('aria-expanded', String(!collapsed)); } });
    backdrop.addEventListener('click', closeDrawer);
    window.addEventListener('resize', function () { if (window.innerWidth > 1024) closeDrawer(); });
  }
  const currentPath = window.location.pathname.split('/').pop() || 'admin-dashboard.html';
  const adminNav = document.getElementById('adminNav');
  if (adminNav) {
    adminNav.innerHTML = navigation.map(function (item) {
      // Every admin page lives in /admin/, so nav targets are plain siblings.
      const href = item.file;
      const isActive = currentPath === item.file;
      const glyph = ICONS[item.key] || ICONS.dashboard;
      return '<a href="' + href + '" class="sidebar-link' + (isActive ? ' is-active' : '') + '" data-page="' + item.file + '"' + (isActive ? ' aria-current="page"' : '') + '><span class="nav-icon">' + glyph + '</span><span>' + item.label + '</span></a>';
    }).join('');
    document.querySelectorAll('#adminNav .sidebar-link').forEach(function (link) {
      link.addEventListener('click', function () { document.querySelectorAll('#adminNav .sidebar-link').forEach(function (item) { item.classList.remove('is-active'); }); link.classList.add('is-active'); if (window.innerWidth <= 1024) closeDrawer(); });
    });
  }
  const statsGrid = document.getElementById('statsGrid');
  if (statsGrid) {
    statsGrid.innerHTML = stats.map(function (stat) { return '<article class="stat-card stat-card--' + stat.tone + '"><div class="stat-card-top"><div class="stat-icon stat-icon--' + stat.tone + '">' + icon + '</div></div><p class="stat-value" data-target="' + stat.value + '" data-suffix="' + (stat.suffix || '') + '">0' + (stat.suffix || '') + '</p><p class="stat-label">' + stat.label + '</p><span class="stat-trend stat-trend--up">↗ ' + stat.trend + '</span></article>'; }).join('');
  }
  function animateCounters() { document.querySelectorAll('[data-target]').forEach(function (el) { const target = Number(el.dataset.target), suffix = el.dataset.suffix || ''; if (reducedMotion) { el.textContent = target.toLocaleString() + suffix; return; } const started = performance.now(), duration = 700; function frame(now) { const progress = Math.min((now - started) / duration, 1), value = target * (1 - Math.pow(1 - progress, 3)); el.textContent = (Number.isInteger(target) ? Math.round(value).toLocaleString() : value.toFixed(1)) + suffix; if (progress < 1) requestAnimationFrame(frame); } requestAnimationFrame(frame); }); }
  if (statsGrid) animateCounters();

  // Load real backend stats & registrations if available
  (function loadLiveAdminDashboard() {
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    if (!token || !statsGrid) return;

    fetch(API_BASE + '/admin/dashboard', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.data) {
          if (res.data.stats && statsGrid) {
            statsGrid.innerHTML = res.data.stats.map(function (stat) {
              return '<article class="stat-card stat-card--' + stat.tone + '"><div class="stat-card-top"><div class="stat-icon stat-icon--' + stat.tone + '">' + (ICONS[stat.tone] || icon) + '</div></div><p class="stat-value" data-target="' + stat.value + '" data-suffix="' + (stat.suffix || '') + '">0' + (stat.suffix || '') + '</p><p class="stat-label">' + stat.label + '</p><span class="stat-trend stat-trend--up">↗ ' + stat.trend + '</span></article>';
            }).join('');
            animateCounters();
          }
          if (res.data.registrations && registrationsList && res.data.registrations.length > 0) {
            registrationsList.innerHTML = res.data.registrations.map(function (item) {
              return '<div class="admin-row"><span class="admin-avatar">' + item.name.split(' ').map(function (part) { return part[0]; }).join('') + '</span><div class="row-copy"><strong>' + item.name + '</strong><span>' + item.meta + '</span></div><span class="status-tag ' + (item.status === 'Pending' ? 'is-pending' : 'is-approved') + '">' + item.status + '</span></div>';
            }).join('');
          }
        }
      })
      .catch(function () {});
  })();

  const registrationsList = document.getElementById('registrationsList');
  if (registrationsList) {
    registrationsList.innerHTML = registrations.map(function (item) { return '<div class="admin-row"><span class="admin-avatar">' + item.name.split(' ').map(function (part) { return part[0]; }).join('') + '</span><div class="row-copy"><strong>' + item.name + '</strong><span>' + item.meta + '</span></div><span class="status-tag ' + (item.status === 'Pending' ? 'is-pending' : 'is-approved') + '">' + item.status + '</span></div>'; }).join('');
  }
  const analyticsGrid = document.getElementById('analyticsGrid');
  const chart = function (title, subtitle, values) { return '<article class="analytic-card"><h4>' + title + '</h4><p>' + subtitle + '</p><div class="bar-chart">' + values.map(function (value) { return '<span style="height:' + value + '%"></span>'; }).join('') + '</div><div class="metric-legend"><span>Current period</span><span>Updated now</span></div></article>'; };
  if (analyticsGrid) {
    analyticsGrid.innerHTML = chart('Attendance Chart','Institution-wide attendance',[51,66,59,75,81,73,91]) + chart('Student Growth','New registrations',[30,44,48,52,66,77,89]) + chart('Department Distribution','Students by department',[84,55,72,40,62,49,67]) + chart('Assignments Status','Submitted vs reviewed',[66,78,56,84,70,90,76]) + chart('Events Overview','Monthly engagement',[33,48,62,54,79,87,70]) + chart('Resources Usage','Downloads this period',[48,55,68,76,60,88,92]) + chart('Faculty Distribution','Faculty by school',[64,47,74,56,82,39,61]);
  }
  const noticesList = document.getElementById('noticesList');
  if (noticesList) {
    noticesList.innerHTML = ['Examination timetable published','Faculty development workshop','Scholarship application window'].map(function (item, index) { return '<div class="feed-row">' + icon + '<div class="row-copy"><strong>' + item + '</strong><span>' + (index + 1) + ' hour' + (index ? 's' : '') + ' ago · Notice</span></div></div>'; }).join('');
  }
  const eventsList = document.getElementById('eventsList');
  if (eventsList) {
    eventsList.innerHTML = ['Innovation Day 2026','Alumni mentorship session','Inter-department sports meet'].map(function (item, index) { return '<div class="feed-row">' + icon + '<div class="row-copy"><strong>' + item + '</strong><span>' + ['Aug 08','Aug 12','Aug 18'][index] + ' · Event</span></div></div>'; }).join('');
  }
  function renderFeed(id, items) {
    const list = document.getElementById(id);
    if (!list) return;
    list.innerHTML = items.map(function (item, index) { return '<div class="feed-row">' + icon + '<div class="row-copy"><strong>' + item + '</strong><span>' + ['Pending review','Updated today','New announcement'][index] + '</span></div></div>'; }).join('');
  }
  renderFeed('reviewsList', ['DBMS Lab 4 · 48 submissions','Operating Systems Quiz · 31 submissions','Design Thinking Case Study · 22 submissions']);
  renderFeed('facultyActivityList', ['Dr. N. Sethi added attendance','Prof. R. Mehta uploaded a resource','Ms. P. Rao created an assignment']);
  renderFeed('announcementsList', ['Campus maintenance on Sunday','Library hours extended for exams','Mentorship applications are open']);
  const activityTimeline = document.getElementById('activityTimeline');
  if (activityTimeline) {
    activityTimeline.innerHTML = ['Administrator approved 12 student registrations','Prof. Mehta published Cloud Computing resources','Attendance report generated for Computer Science','New course submitted by the Design department'].map(function (item, index) { return '<li><strong>' + item + '</strong><time>' + (index + 1) + ' hour' + (index ? 's' : '') + ' ago</time></li>'; }).join('');
  }
  const quickActions = document.getElementById('quickActions');
  if (quickActions) {
    const actions = ['Create Student','Create Faculty','Publish Notice','Create Event','Upload Resource','Create Assignment','Generate Report','Broadcast Message'];
    quickActions.innerHTML = actions.map(function (action) { return '<button type="button" class="quick-action" data-action="' + action + '"><span class="nav-icon">' + (QUICK_ACTION_ICONS[action] || ICONS.plus) + '</span><span>' + action + '</span></button>'; }).join('');
  }
  const loginsList = document.getElementById('loginsList');
  if (loginsList) {
    loginsList.innerHTML = ['Dr. Neha Sethi · Faculty','Mira Kapoor · Student','Karan Singh · Student'].map(function (item, index) { return '<div class="compact-row"><span class="admin-avatar">' + item[0] + '</span><div class="row-copy"><strong>' + item + '</strong><span>Successful sign-in</span></div><time>' + (index + 2) + 'm</time></div>'; }).join('');
  }
  const sidebarNotifications = document.getElementById('sidebarNotifications');
  if (sidebarNotifications) {
    sidebarNotifications.innerHTML = notifications.slice(0, 3).map(function (item, index) { return '<div class="compact-row"><span class="admin-avatar">!</span><div class="row-copy"><strong>' + item + '</strong><span>' + (index + 1) + ' hour ago</span></div></div>'; }).join('');
  }
  const deadlinesList = document.getElementById('deadlinesList');
  if (deadlinesList) {
    deadlinesList.innerHTML = ['Assignment review · Today, 5:00 PM','Attendance lock · Tomorrow','Resource audit · Aug 05'].map(function (item) { return '<div class="compact-row"><div class="row-copy"><strong>' + item + '</strong><span>Administrative deadline</span></div></div>'; }).join('');
  }
  const systemStatus = document.getElementById('systemStatus');
  if (systemStatus) {
    systemStatus.innerHTML = [['Server Health','Operational'],['Database Status','Healthy'],['Storage Usage','68% used']].map(function (item) { return '<div class="status-row"><strong>' + item[0] + '</strong><span class="status-pill">' + item[1] + '</span></div>'; }).join('');
  }
  const notificationList = document.getElementById('notificationList');
  if (notificationList) {
    notificationList.innerHTML = notifications.map(function (item, index) { return '<li class="notification-item is-unread"><span class="notification-dot" aria-hidden="true"></span><div><p class="notification-text">' + item + '</p><span class="notification-time">' + (index + 1) + ' hour' + (index ? 's' : '') + ' ago</span></div></li>'; }).join('');
  }
  function wirePopover(buttonId, panelId) {
    const button = document.getElementById(buttonId), panel = document.getElementById(panelId);
    if (!button || !panel) return;
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      const open = panel.hidden;
      document.querySelectorAll('.notification-panel, .user-dropdown').forEach(function (element) { element.hidden = true; });
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (event) {
      if (!panel.contains(event.target) && !button.contains(event.target)) {
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
      }
    });
  }
  wirePopover('notificationBtn', 'notificationPanel');
  wirePopover('userMenuBtn', 'userDropdown');
  const markAllReadBtn = document.getElementById('markAllReadBtn');
  if (markAllReadBtn) markAllReadBtn.addEventListener('click', function () { document.querySelectorAll('.notification-item').forEach(function (item) { item.classList.remove('is-unread'); }); const badge = document.getElementById('notificationBadge'); if (badge) badge.textContent = '0'; });
  const searchInput = document.getElementById('globalSearch'), searchWrap = document.getElementById('searchWrap'), searchPanel = document.getElementById('searchPanel'), searchResults = document.getElementById('searchResultsList'), searchEmpty = document.getElementById('searchEmpty');
  if (searchInput && searchWrap && searchPanel && searchResults) {
    function renderSearch() {
      const query = searchInput.value.trim().toLowerCase();
      const results = searchData.filter(function (item) { return item.title.toLowerCase().includes(query) || item.type.toLowerCase().includes(query); });
      searchResults.innerHTML = results.map(function (item) { return '<li><button type="button" class="search-item"><span class="search-item-text">' + item.title + '</span><span class="search-item-type">' + item.type + '</span></button></li>'; }).join('');
      if (searchEmpty) searchEmpty.hidden = results.length > 0;
    }
    searchInput.addEventListener('focus', function () { searchPanel.hidden = false; renderSearch(); });
    searchInput.addEventListener('input', function () { searchWrap.classList.toggle('has-value', !!searchInput.value); searchPanel.hidden = false; renderSearch(); });
    const searchClear = document.getElementById('searchClear');
    if (searchClear) searchClear.addEventListener('click', function () { searchInput.value = ''; searchInput.focus(); renderSearch(); });
    document.addEventListener('keydown', function (event) { if (event.key === '/' && document.activeElement !== searchInput && !['INPUT','TEXTAREA'].includes(event.target.tagName)) { event.preventDefault(); searchInput.focus(); } if (event.key === 'Escape') { searchPanel.hidden = true; closeDrawer(); } });
  }
  function showActionFeedback(button) {
    const label = button.dataset.action || button.textContent.trim();
    const original = button.textContent;
    button.textContent = 'Ready: ' + label;
    button.disabled = true;
    setTimeout(function () { button.textContent = original; button.disabled = false; }, 1200);
  }
  document.querySelectorAll('[data-action]').forEach(function (button) { button.addEventListener('click', function () { showActionFeedback(button); }); });
  const refreshDashboard = document.getElementById('refreshDashboard');
  if (refreshDashboard) refreshDashboard.addEventListener('click', function (event) { animateCounters(); showActionFeedback(event.currentTarget); });

  /* ==================================================================
     SHARED ADMIN TABLE CONTROLLER
     ------------------------------------------------------------------
     The notices / events / assignments / resources / reports pages are
     all the same screen: stat cards, a search + filter toolbar, a data
     table, an empty state, and a view/edit/delete modal. Rather than
     ship five near-identical copies of that logic, the behaviour lives
     here once and each page supplies only its data and columns.

     Every element lookup is guarded, so a page that omits an optional
     control (an export button, a sort select) simply skips that feature
     instead of throwing.
     ================================================================== */
  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function createTablePage(config) {
    const prefix = config.prefix;
    const byId = function (suffix) { return document.getElementById(prefix + suffix); };
    const tableBody = byId('TableBody');
    // If this page isn't the one the config describes, do nothing at all.
    if (!tableBody) return null;

    const rowsData = config.data.slice();
    const search = byId('Search');
    const empty = byId('Empty');
    const statsHost = byId('Stats');
    const modal = byId('Modal');
    const modalTitle = byId('ModalTitle');
    const modalBody = byId('ModalBody');
    const modalActions = byId('ModalActions');
    const modalClose = byId('ModalClose');
    const filters = (config.filters || []).map(function (filter) {
      return { def: filter, el: document.getElementById(filter.id) };
    }).filter(function (entry) { return !!entry.el; });
    const sortSelect = config.sortId ? document.getElementById(config.sortId) : null;
    const glyph = ICONS[config.statIcon] || icon;
    const idKey = config.idKey || 'id';

    /* ---------- stat cards ---------- */
    function renderStats() {
      if (!statsHost || !config.stats) return;
      statsHost.innerHTML = config.stats.map(function (item) {
        return '<article class="stat-card stat-card--' + item.tone + '">' +
          '<div class="stat-card-top"><div class="stat-icon stat-icon--' + item.tone + '">' + glyph + '</div></div>' +
          '<p class="stat-value">' + escapeHtml(item.value) + '</p>' +
          '<p class="stat-label">' + escapeHtml(item.label) + '</p>' +
          '<span class="stat-trend stat-trend--up">↗ ' + escapeHtml(item.trend) + '</span>' +
          '</article>';
      }).join('');
    }

    /* ---------- filter selects ---------- */
    function populateFilters() {
      filters.forEach(function (entry) {
        if (!entry.def.auto) return;   // options already in the HTML
        const values = [...new Set(rowsData.map(function (row) { return row[entry.def.field]; }))]
          .filter(Boolean).sort();
        entry.el.innerHTML = '<option value="">' + escapeHtml(entry.def.label) + '</option>' +
          values.map(function (v) { return '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>'; }).join('');
      });
    }

    /* ---------- filtering ---------- */
    function getFilteredRows() {
      const query = ((search && search.value) || '').trim().toLowerCase();
      let result = rowsData.filter(function (row) {
        const haystack = (config.searchFields || Object.keys(row))
          .map(function (field) { return row[field]; }).join(' ').toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesFilters = filters.every(function (entry) {
          const wanted = entry.el.value;
          if (!wanted) return true;
          if (typeof entry.def.match === 'function') return entry.def.match(row, wanted);
          return String(row[entry.def.field]) === wanted;
        });
        return matchesQuery && matchesFilters;
      });
      if (sortSelect && typeof config.sort === 'function') {
        result = result.sort(function (a, b) { return config.sort(a, b, sortSelect.value); });
      } else if (typeof config.defaultSort === 'function') {
        result = result.sort(config.defaultSort);
      }
      return result;
    }

    /* ---------- table ---------- */
    function renderTable() {
      const rows = getFilteredRows();
      tableBody.innerHTML = rows.map(function (row) {
        const cells = config.columns.map(function (col) { return '<td' + (col.cellClass ? ' class="' + col.cellClass + '"' : '') + '>' + col.cell(row) + '</td>'; }).join('');
        const actions = '<td><div class="table-actions">' +
          (config.actions || ['view', 'edit', 'delete']).map(function (action) {
            return '<button type="button" class="row-action" data-action="' + action + '" data-id="' +
              escapeHtml(row[idKey]) + '">' + action.charAt(0).toUpperCase() + action.slice(1) + '</button>';
          }).join('') + '</div></td>';
        return '<tr>' + cells + actions + '</tr>';
      }).join('');
      if (empty) empty.hidden = rows.length > 0;
      if (typeof config.afterRender === 'function') config.afterRender(rows);
    }

    /* ---------- modal ---------- */
    function openModal() {
      if (!modal) return;
      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { modal.hidden = true; }, 180);
    }
    function setModalButtons(primaryText, primaryAction) {
      if (!modalActions) return;
      if (!primaryText) {
        modalActions.innerHTML = '<button type="button" class="btn btn-primary" data-modal-dismiss>Close</button>';
      } else {
        modalActions.innerHTML = '<button type="button" class="btn btn-outline" data-modal-dismiss>Cancel</button>' +
          '<button type="button" class="btn btn-primary" data-modal-confirm>' + escapeHtml(primaryText) + '</button>';
      }
      const dismiss = modalActions.querySelector('[data-modal-dismiss]');
      if (dismiss) dismiss.addEventListener('click', closeModal);
      const confirm = modalActions.querySelector('[data-modal-confirm]');
      if (confirm && primaryAction) confirm.addEventListener('click', primaryAction);
    }
    function findRow(id) {
      return rowsData.find(function (row) { return String(row[idKey]) === String(id); });
    }
    function readForm() {
      const form = modalBody && modalBody.querySelector('form');
      if (!form) return null;
      const data = new FormData(form);
      const out = {};
      data.forEach(function (value, key) { out[key] = value; });
      return out;
    }
    function buildForm(row) {
      const source = row || (typeof config.newRecord === 'function' ? config.newRecord(rowsData) : {});
      const fields = (config.form || []).map(function (field) {
        const value = source[field.name] === undefined ? '' : source[field.name];
        const cls = field.full ? ' class="full-width"' : '';
        let control;
        if (field.type === 'select') {
          const options = typeof field.options === 'function' ? field.options(rowsData) : (field.options || []);
          control = '<select name="' + field.name + '">' + options.map(function (opt) {
            return '<option value="' + escapeHtml(opt) + '"' + (String(opt) === String(value) ? ' selected' : '') + '>' + escapeHtml(opt) + '</option>';
          }).join('') + '</select>';
        } else if (field.type === 'textarea') {
          control = '<textarea name="' + field.name + '" rows="4">' + escapeHtml(value) + '</textarea>';
        } else {
          control = '<input name="' + field.name + '" type="' + (field.type || 'text') + '" value="' + escapeHtml(value) + '"' + (field.required ? ' required' : '') + ' />';
        }
        return '<label' + cls + '>' + escapeHtml(field.label) + control + '</label>';
      }).join('');
      return '<form class="admin-form">' + fields + '</form>';
    }

    /* ---------- API Sync ---------- */
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    function getAuthHeader() {
      const token = localStorage.getItem('vectorone_token');
      return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    }

    const endpointMap = {
      notice: '/admin/notices',
      event: '/admin/events',
      assignment: '/admin/assignments',
      resource: '/admin/resources',
    };
    const apiPath = config.apiEndpoint || endpointMap[prefix];

    function fetchTableData() {
      if (!apiPath) return;
      fetch(API_BASE + apiPath, { headers: getAuthHeader() })
        .then(function (res) { return res.json(); })
        .then(function (res) {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            rowsData.length = 0;
            res.data.forEach(function (d) { rowsData.push(d); });
            populateFilters();
            renderTable();
          }
        })
        .catch(function () {});
    }

    /* ---------- row actions (one delegated listener, scoped to the table) ---------- */
    tableBody.addEventListener('click', function (event) {
      const button = event.target.closest('[data-action]');
      if (!button || !tableBody.contains(button)) return;
      const row = findRow(button.dataset.id);
      if (!row) return;
      const action = button.dataset.action;

      if (action === 'view') {
        if (modalTitle) modalTitle.textContent = config.viewTitle || 'Details';
        if (modalBody) modalBody.innerHTML = config.detail ? config.detail(row) : buildForm(row);
        setModalButtons(null);
        openModal();
      } else if (action === 'edit') {
        if (modalTitle) modalTitle.textContent = config.editTitle || 'Edit';
        if (modalBody) modalBody.innerHTML = buildForm(row);
        setModalButtons('Save Changes', function () {
          const values = readForm();
          if (values) {
            Object.keys(values).forEach(function (key) { row[key] = values[key]; });
            if (apiPath && row[idKey]) {
              fetch(API_BASE + apiPath + '/' + encodeURIComponent(row[idKey]), {
                method: 'PUT',
                headers: getAuthHeader(),
                body: JSON.stringify(values)
              }).catch(function (e) { console.warn(e); });
            }
          }
          renderTable();
          closeModal();
        });
        openModal();
      } else if (action === 'delete') {
        if (modalTitle) modalTitle.textContent = config.deleteTitle || 'Delete';
        if (modalBody) modalBody.innerHTML = '<p>Delete <strong>' + escapeHtml(row[config.labelKey || 'title'] || row[idKey]) + '</strong>? This removes it from the current list.</p>';
        setModalButtons('Delete', function () {
          const idx = rowsData.indexOf(row);
          if (idx >= 0) rowsData.splice(idx, 1);
          if (apiPath && row[idKey]) {
            fetch(API_BASE + apiPath + '/' + encodeURIComponent(row[idKey]), {
              method: 'DELETE',
              headers: getAuthHeader()
            }).catch(function (e) { console.warn(e); });
          }
          renderTable();
          closeModal();
        });
        openModal();
      } else if (typeof config.onAction === 'function') {
        config.onAction(action, row, { openModal: openModal, closeModal: closeModal, modalTitle: modalTitle, modalBody: modalBody, setModalButtons: setModalButtons, render: renderTable });
      }
    });

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
    });

    /* ---------- add / refresh / export ---------- */
    const addBtn = config.addId ? document.getElementById(config.addId) : null;
    if (addBtn && config.form) {
      addBtn.addEventListener('click', function () {
        if (modalTitle) modalTitle.textContent = config.addTitle || 'Add';
        if (modalBody) modalBody.innerHTML = buildForm(null);
        setModalButtons(config.addTitle || 'Add', function () {
          const values = readForm();
          if (values) {
            rowsData.unshift(values);
            if (apiPath) {
              fetch(API_BASE + apiPath, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(values)
              }).catch(function (e) { console.warn(e); });
            }
          }
          renderTable();
          closeModal();
        });
        openModal();
      });
    }
    const refreshBtn = config.refreshId ? document.getElementById(config.refreshId) : null;
    if (refreshBtn) refreshBtn.addEventListener('click', function () { fetchTableData(); renderStats(); renderTable(); });

    const exportBtn = config.exportId ? document.getElementById(config.exportId) : null;
    if (exportBtn && config.csv) {
      exportBtn.addEventListener('click', function () {
        const rows = getFilteredRows();
        const cell = function (v) {
          const s = String(v === undefined || v === null ? '' : v);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const lines = [config.csv.headers.join(',')];
        rows.forEach(function (row) { lines.push(config.csv.row(row).map(cell).join(',')); });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = config.csv.filename;
        link.click();
        URL.revokeObjectURL(link.href);
      });
    }

    /* ---------- wire inputs ---------- */
    if (search) search.addEventListener('input', renderTable);
    filters.forEach(function (entry) { entry.el.addEventListener('change', renderTable); });
    if (sortSelect) sortSelect.addEventListener('change', renderTable);

    renderStats();
    populateFilters();
    renderTable();
    fetchTableData();
    return { render: renderTable, rows: rowsData, getFilteredRows: getFilteredRows };
  }

  window.VectorOneAdmin.escapeHtml = escapeHtml;
  window.VectorOneAdmin.createTablePage = createTablePage;
})();
