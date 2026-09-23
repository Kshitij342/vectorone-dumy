/* Admin notices — page logic connected to PostgreSQL API. */
(function () {
  'use strict';
  if (!window.VectorOneAdmin || !window.VectorOneAdmin.createTablePage) return;
  const esc = window.VectorOneAdmin.escapeHtml;

  const notices = [];

  const priorityCell = function (p) {
    const val = (p || 'Medium').toString();
    return '<span class="priority-flag ' + esc(val.toLowerCase()) + '">' + esc(val) + '</span>';
  };
  const statusCell = function (s) {
    const val = (s || 'Draft').toString();
    return '<span class="status-badge ' + esc(val.toLowerCase()) + '">' + esc(val) + '</span>';
  };

  window.VectorOneAdmin.createTablePage({
    prefix: 'notice',
    statIcon: 'notices',
    idKey: 'id',
    labelKey: 'title',
    data: notices,
    searchFields: ['title', 'category', 'audience', 'body'],
    stats: [
      { label: 'Total Notices', value: '0', trend: 'From database', tone: 'blue' },
      { label: 'Published', value: '0', trend: 'Live on portal', tone: 'green' },
      { label: 'Scheduled', value: '0', trend: 'Queued', tone: 'purple' },
      { label: 'Drafts', value: '0', trend: 'Awaiting review', tone: 'orange' }
    ],
    filters: [
      { id: 'noticeCategoryFilter', field: 'category', label: 'Category' },
      { id: 'noticeStatusFilter', field: 'status', label: 'Status' }
    ],
    columns: [
      { cellClass: 'notice-title', cell: function (r) { return '<strong>' + esc(r.title) + '</strong><span>' + esc(r.id) + '</span>'; } },
      { cell: function (r) { return esc(r.category || 'Academic'); } },
      { cell: function (r) { return '<span class="notice-audience">' + esc(r.audience || 'All Students') + '</span>'; } },
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
        '<div class="notice-preview-body">' + esc(r.body || '') + '</div>' +
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
      return { id: '', title: '', category: 'Academic', audience: 'All Students', status: 'Draft', priority: 'Medium', published: '', body: '' };
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
