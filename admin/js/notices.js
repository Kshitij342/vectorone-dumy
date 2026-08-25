/* Admin notices — page logic. Uses the shared table controller defined in
   js/admin-dashboard.js (loaded first). Frontend-only demo data. */
(function () {
  'use strict';
  if (!window.VectorOneAdmin || !window.VectorOneAdmin.createTablePage) return;
  const esc = window.VectorOneAdmin.escapeHtml;

  const notices = [
    { id: 'NTC-01', title: 'Semester Examination Timetable', body: 'The end-semester examination schedule for all departments has been published on the student portal. Review your slots and report clashes to the examination cell within three working days.', category: 'Academic', audience: 'All Students', published: '2026-08-20', status: 'Published', priority: 'High' },
    { id: 'NTC-02', title: 'Campus Placement Drive — TCS', body: 'TCS will conduct a campus recruitment drive for final-year students. Eligible students must register through the placement cell before the deadline.', category: 'Placement', audience: 'Final Year', published: '2026-08-18', status: 'Published', priority: 'High' },
    { id: 'NTC-03', title: 'Library Working Hours Extended', body: 'The central library will remain open until 10 PM during the examination period to support student preparation.', category: 'Administrative', audience: 'All Students', published: '2026-08-15', status: 'Published', priority: 'Low' },
    { id: 'NTC-04', title: 'Annual Tech Symposium Registration', body: 'Registrations for the annual technical symposium are now open. Teams of up to four members may participate across all events.', category: 'Events', audience: 'All Students', published: '2026-08-12', status: 'Scheduled', priority: 'Medium' },
    { id: 'NTC-05', title: 'Fee Payment Reminder', body: 'Second-installment tuition fees are due by the end of the month. Late payments attract a penalty as per institute policy.', category: 'Administrative', audience: 'All Students', published: '', status: 'Draft', priority: 'Medium' },
    { id: 'NTC-06', title: 'Scholarship Application Window', body: 'Merit-cum-means scholarship applications are open for the current academic year. Submit supporting documents to the accounts office.', category: 'Academic', audience: 'Eligible Students', published: '2026-08-08', status: 'Published', priority: 'Medium' }
  ];

  const priorityCell = function (p) {
    return '<span class="priority-flag ' + esc(p.toLowerCase()) + '">' + esc(p) + '</span>';
  };
  const statusCell = function (s) {
    return '<span class="status-badge ' + esc(s.toLowerCase()) + '">' + esc(s) + '</span>';
  };

  window.VectorOneAdmin.createTablePage({
    prefix: 'notice',
    statIcon: 'notices',
    idKey: 'id',
    labelKey: 'title',
    data: notices,
    searchFields: ['title', 'category', 'audience', 'body'],
    stats: [
      { label: 'Total Notices', value: 128, trend: '9 published today', tone: 'blue' },
      { label: 'Published', value: 96, trend: '75% live', tone: 'green' },
      { label: 'Scheduled', value: 14, trend: 'Queued', tone: 'purple' },
      { label: 'Drafts', value: 18, trend: 'Awaiting review', tone: 'orange' }
    ],
    filters: [
      { id: 'noticeCategoryFilter', field: 'category', label: 'Category' },
      { id: 'noticeStatusFilter', field: 'status', label: 'Status' }
    ],
    columns: [
      { cellClass: 'notice-title', cell: function (r) { return '<strong>' + esc(r.title) + '</strong><span>' + esc(r.id) + '</span>'; } },
      { cell: function (r) { return esc(r.category); } },
      { cell: function (r) { return '<span class="notice-audience">' + esc(r.audience) + '</span>'; } },
      { cell: function (r) { return r.published ? esc(r.published) : '<span style="color:var(--text-secondary)">—</span>'; } },
      { cell: function (r) { return statusCell(r.status); } },
      { cell: function (r) { return priorityCell(r.priority); } }
    ],
    detail: function (r) {
      return '<div class="notice-preview">' +
        '<div class="detail-grid">' +
          '<div><span>Category</span><strong>' + esc(r.category) + '</strong></div>' +
          '<div><span>Audience</span><strong>' + esc(r.audience) + '</strong></div>' +
          '<div><span>Published</span><strong>' + esc(r.published || 'Not published') + '</strong></div>' +
          '<div><span>Priority</span><strong>' + esc(r.priority) + '</strong></div>' +
        '</div>' +
        '<div class="notice-preview-body">' + esc(r.body) + '</div>' +
      '</div>';
    },
    form: [
      { name: 'title', label: 'Title', full: true, required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Academic', 'Administrative', 'Placement', 'Events'] },
      { name: 'audience', label: 'Audience', type: 'select', options: ['All Students', 'Final Year', 'Eligible Students', 'Faculty'] },
      { name: 'status', label: 'Status', type: 'select', options: ['Published', 'Scheduled', 'Draft'] },
      { name: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
      { name: 'published', label: 'Publish Date', type: 'date' },
      { name: 'body', label: 'Notice Body', type: 'textarea', full: true }
    ],
    newRecord: function (rows) {
      return { id: 'NTC-' + String(rows.length + 1).padStart(2, '0'), title: '', category: 'Academic', audience: 'All Students', status: 'Draft', priority: 'Medium', published: '', body: '' };
    },
    viewTitle: 'Notice Preview',
    editTitle: 'Edit Notice',
    addTitle: 'Create Notice',
    deleteTitle: 'Delete Notice',
    addId: 'addNoticeBtn',
    refreshId: 'refreshNoticesBtn',
    exportId: 'exportNoticesBtn',
    csv: {
      filename: 'notices.csv',
      headers: ['ID', 'Title', 'Category', 'Audience', 'Published', 'Status', 'Priority'],
      row: function (r) { return [r.id, r.title, r.category, r.audience, r.published, r.status, r.priority]; }
    }
  });
}());
