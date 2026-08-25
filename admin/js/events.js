/* Admin events — page logic. Uses the shared table controller defined in
   js/admin-dashboard.js (loaded first). Frontend-only demo data. */
(function () {
  'use strict';
  if (!window.VectorOneAdmin || !window.VectorOneAdmin.createTablePage) return;
  const esc = window.VectorOneAdmin.escapeHtml;

  const events = [
    { id: 'EVT-01', title: 'Annual Tech Symposium', summary: 'Two-day inter-college technical festival', category: 'Seminar', date: '2026-09-04', venue: 'Main Auditorium', coordinator: 'Dr. Neha Sharma', registered: 412, capacity: 500, status: 'Open' },
    { id: 'EVT-02', title: 'Cloud Computing Workshop', summary: 'Hands-on AWS and Azure lab session', category: 'Workshop', date: '2026-09-11', venue: 'Lab Block C', coordinator: 'Prof. Rohan Verma', registered: 60, capacity: 60, status: 'Closed' },
    { id: 'EVT-03', title: 'Alumni Mentorship Meet', summary: 'Career guidance with graduating batches', category: 'Seminar', date: '2026-09-18', venue: 'Seminar Hall 2', coordinator: 'Dr. Meera Nair', registered: 145, capacity: 250, status: 'Open' },
    { id: 'EVT-04', title: 'Inter-Department Sports Meet', summary: 'Athletics, football and cricket finals', category: 'Cultural', date: '2026-09-25', venue: 'Sports Ground', coordinator: 'Mr. Kavish Joshi', registered: 320, capacity: 600, status: 'Open' },
    { id: 'EVT-05', title: 'TCS Placement Drive', summary: 'Campus recruitment for final-year students', category: 'Placement', date: '2026-10-02', venue: 'Placement Cell', coordinator: 'Dr. Priya Sethi', registered: 198, capacity: 200, status: 'Open' },
    { id: 'EVT-06', title: 'Design Thinking Bootcamp', summary: 'Product ideation and prototyping sprint', category: 'Workshop', date: '2026-08-14', venue: 'Design Studio', coordinator: 'Ms. Sanya Iyer', registered: 45, capacity: 45, status: 'Closed' }
  ];

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function prettyDate(iso) {
    const parts = String(iso).split('-');
    if (parts.length !== 3) return esc(iso);
    return MONTHS[Number(parts[1]) - 1] + ' ' + parts[2] + ', ' + parts[0];
  }
  function isUpcoming(iso) { return new Date(iso).getTime() >= Date.now(); }
  function isThisMonth(iso) {
    const d = new Date(iso), n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }

  window.VectorOneAdmin.createTablePage({
    prefix: 'event',
    statIcon: 'events',
    idKey: 'id',
    labelKey: 'title',
    data: events,
    searchFields: ['title', 'summary', 'category', 'venue', 'coordinator'],
    stats: [
      { label: 'Total Events', value: 34, trend: '6 this month', tone: 'blue' },
      { label: 'Open for Registration', value: 21, trend: 'Accepting entries', tone: 'green' },
      { label: 'Total Registrations', value: 1180, trend: '+94 this week', tone: 'purple' },
      { label: 'Closed', value: 13, trend: 'Capacity reached', tone: 'orange' }
    ],
    filters: [
      { id: 'eventCategoryFilter', field: 'category', label: 'Category' },
      { id: 'eventStatusFilter', field: 'status', label: 'Status' },
      {
        id: 'dateFilter', field: 'date', label: 'Date',
        match: function (row, wanted) {
          if (wanted === 'Upcoming') return isUpcoming(row.date);
          if (wanted === 'This Month') return isThisMonth(row.date);
          return true;
        }
      }
    ],
    defaultSort: function (a, b) { return a.date.localeCompare(b.date); },
    columns: [
      { cellClass: 'event-name', cell: function (r) { return '<strong>' + esc(r.title) + '</strong><span>' + esc(r.summary) + '</span>'; } },
      { cell: function (r) { return '<span class="event-category">' + esc(r.category) + '</span>'; } },
      { cellClass: 'event-date', cell: function (r) { return prettyDate(r.date) + '<span>' + (isUpcoming(r.date) ? 'Upcoming' : 'Past') + '</span>'; } },
      { cell: function (r) { return esc(r.venue); } },
      { cell: function (r) { return esc(r.coordinator); } },
      {
        cellClass: 'event-registrations',
        cell: function (r) {
          const pct = Math.min(Math.round((r.registered / r.capacity) * 100), 100);
          return '<div class="reg-count"><strong>' + r.registered + '</strong><span>of ' + r.capacity + '</span></div>' +
            '<div class="reg-bar' + (pct >= 100 ? ' is-full' : '') + '"><span style="width:' + pct + '%"></span></div>';
        }
      },
      { cell: function (r) { return '<span class="status-badge ' + esc(r.status.toLowerCase()) + '">' + esc(r.status) + '</span>'; } }
    ],
    detail: function (r) {
      return '<div class="detail-grid">' +
        '<div><span>Event</span><strong>' + esc(r.title) + '</strong></div>' +
        '<div><span>Category</span><strong>' + esc(r.category) + '</strong></div>' +
        '<div><span>Date</span><strong>' + prettyDate(r.date) + '</strong></div>' +
        '<div><span>Venue</span><strong>' + esc(r.venue) + '</strong></div>' +
        '<div><span>Coordinator</span><strong>' + esc(r.coordinator) + '</strong></div>' +
        '<div><span>Registrations</span><strong>' + r.registered + ' / ' + r.capacity + '</strong></div>' +
        '<div><span>Status</span><strong>' + esc(r.status) + '</strong></div>' +
        '<div><span>Summary</span><strong>' + esc(r.summary) + '</strong></div>' +
      '</div>';
    },
    form: [
      { name: 'title', label: 'Event Title', full: true, required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Workshop', 'Seminar', 'Cultural', 'Placement'] },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'venue', label: 'Venue', required: true },
      { name: 'coordinator', label: 'Coordinator', required: true },
      { name: 'registered', label: 'Registered', type: 'number' },
      { name: 'capacity', label: 'Capacity', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Closed'] },
      { name: 'summary', label: 'Summary', type: 'textarea', full: true }
    ],
    newRecord: function (rows) {
      return { id: 'EVT-' + String(rows.length + 1).padStart(2, '0'), title: '', category: 'Workshop', date: '', venue: '', coordinator: '', registered: 0, capacity: 100, status: 'Open', summary: '' };
    },
    viewTitle: 'Event Details',
    editTitle: 'Edit Event',
    addTitle: 'Add Event',
    deleteTitle: 'Delete Event',
    addId: 'addEventBtn',
    refreshId: 'refreshEventsBtn',
    exportId: 'exportEventsBtn',
    csv: {
      filename: 'events.csv',
      headers: ['ID', 'Event', 'Category', 'Date', 'Venue', 'Coordinator', 'Registered', 'Capacity', 'Status'],
      row: function (r) { return [r.id, r.title, r.category, r.date, r.venue, r.coordinator, r.registered, r.capacity, r.status]; }
    }
  });
}());
