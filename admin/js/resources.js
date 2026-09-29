/* Admin resources — page logic. Uses the shared table controller defined in
   js/admin-dashboard.js (loaded first). */
(function () {
  'use strict';
  if (!window.VectorOneAdmin || !window.VectorOneAdmin.createTablePage) return;
  const esc = window.VectorOneAdmin.escapeHtml;

  const resources = [];

  const page = window.VectorOneAdmin.createTablePage({
    prefix: 'resource',
    statIcon: 'resources',
    idKey: 'id',
    labelKey: 'title',
    data: resources,
    searchFields: ['title', 'type', 'department', 'uploader'],
    stats: [
      { label: 'Total Resources', value: 0, trend: 'No resources yet', tone: 'blue' },
      { label: 'Published', value: 0, trend: '—', tone: 'green' },
      { label: 'Total Downloads', value: 0, trend: '—', tone: 'purple' },
      { label: 'Storage Used', value: '—', trend: '—', tone: 'orange' }
    ],
    filters: [
      { id: 'resourceTypeFilter', field: 'type', label: 'Type' },
      { id: 'resourceDeptFilter', field: 'department', label: 'Department' }
    ],
    defaultSort: function (a, b) { return b.downloads - a.downloads; },
    columns: [
      {
        cellClass: 'resource-name',
        cell: function (r) {
          return '<div class="resource-file">' +
            '<span class="resource-type-chip ' + esc(r.ext.toLowerCase()) + '">' + esc(r.ext) + '</span>' +
            '<span class="resource-file-copy"><strong>' + esc(r.title) + '</strong><span>' + esc(r.id) + '</span></span>' +
          '</div>';
        }
      },
      { cell: function (r) { return esc(r.type); } },
      { cell: function (r) { return esc(r.department); } },
      { cell: function (r) { return esc(r.uploader); } },
      { cellClass: 'resource-size', cell: function (r) { return esc(r.size); } },
      { cell: function (r) { return '<span class="status-badge ' + esc(r.status.toLowerCase()) + '">' + esc(r.status) + '</span>'; } }
    ],
    detail: function (r) {
      return '<div class="detail-grid">' +
        '<div><span>Title</span><strong>' + esc(r.title) + '</strong></div>' +
        '<div><span>Type</span><strong>' + esc(r.type) + ' (' + esc(r.ext) + ')</strong></div>' +
        '<div><span>Department</span><strong>' + esc(r.department) + '</strong></div>' +
        '<div><span>Uploaded By</span><strong>' + esc(r.uploader) + '</strong></div>' +
        '<div><span>File Size</span><strong>' + esc(r.size) + '</strong></div>' +
        '<div><span>Downloads</span><strong>' + r.downloads + '</strong></div>' +
        '<div><span>Status</span><strong>' + esc(r.status) + '</strong></div>' +
      '</div>';
    },
    form: [
      { name: 'title', label: 'Title', full: true, required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['PDF', 'Video', 'Presentation', 'Document', 'Spreadsheet', 'Link', 'Other'] },
      { name: 'ext', label: 'File Extension', type: 'select', options: ['PDF', 'MP4', 'PPTX', 'DOCX', 'XLSX'] },
      {
        name: 'department',
        label: 'Department',
        type: 'select',
        options: function (rows) {
          if (Array.isArray(window.VectorOneAdmin.availableDepartments) && window.VectorOneAdmin.availableDepartments.length > 0) {
            return window.VectorOneAdmin.availableDepartments;
          }
          const list = [...new Set(rows.map(function (r) { return r.department; }))].filter(Boolean).sort();
          return list.length > 0 ? list : ['Computer Science', 'Electronics', 'Mechanical', 'Business Administration', 'Civil Engineering'];
        }
      },
      { name: 'uploader', label: 'Uploaded By', required: true },
      { name: 'size', label: 'File Size' },
      { name: 'downloads', label: 'Downloads', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['Published', 'Review', 'Draft', 'Archived'] }
    ],
    newRecord: function (rows) {
      return { id: 'RES-' + String(rows.length + 1).padStart(2, '0'), title: '', type: 'PDF', ext: 'PDF', department: 'Computer Science', uploader: 'Administrator', size: '0 MB', downloads: 0, status: 'Draft' };
    },
    viewTitle: 'Resource Details',
    editTitle: 'Edit Resource',
    addTitle: 'Upload Resource',
    deleteTitle: 'Delete Resource',
    addId: 'uploadResourceBtn',
    refreshId: 'refreshResourcesBtn',
    exportId: 'exportResourcesBtn',
    csv: {
      filename: 'resources.csv',
      headers: ['ID', 'Title', 'Type', 'Department', 'Uploaded By', 'Size', 'Downloads', 'Status'],
      row: function (r) { return [r.id, r.title, r.type, r.department, r.uploader, r.size, r.downloads, r.status]; }
    }
  });

  /* Fetch live department list from API to populate the filter & form options */
  (function loadDepartmentsForFilter() {
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    const deptSelect = document.getElementById('resourceDeptFilter');

    fetch(API_BASE + '/admin/departments', {
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const names = res.data.map(function (d) { return d.name; }).filter(Boolean).sort();
          window.VectorOneAdmin.availableDepartments = names;

          if (deptSelect) {
            const current = deptSelect.value;
            deptSelect.innerHTML = '<option value="">Department</option>' +
              names.map(function (name) {
                return '<option value="' + esc(name) + '"' + (name === current ? ' selected' : '') + '>' + esc(name) + '</option>';
              }).join('');
          }
        }
      })
      .catch(function () {});
  })();
}());
