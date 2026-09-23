/* Admin resources — page logic. Uses the shared table controller defined in
   js/admin-dashboard.js (loaded first). */
(function () {
  'use strict';
  if (!window.VectorOneAdmin || !window.VectorOneAdmin.createTablePage) return;
  const esc = window.VectorOneAdmin.escapeHtml;

  const resources = [
    { id: 'RES-01', title: 'Cloud Computing Lab Manual', ext: 'PDF', type: 'PDF', department: 'Computer Science', uploader: 'Dr. Neha Sharma', size: '4.2 MB', downloads: 318, status: 'Published' },
    { id: 'RES-02', title: 'Signals and Systems Lecture Series', ext: 'MP4', type: 'Video', department: 'Electronics', uploader: 'Prof. Rohan Verma', size: '212 MB', downloads: 145, status: 'Published' },
    { id: 'RES-03', title: 'Thermodynamics Formula Sheet', ext: 'PDF', type: 'PDF', department: 'Mechanical', uploader: 'Dr. Meera Nair', size: '1.1 MB', downloads: 402, status: 'Published' },
    { id: 'RES-04', title: 'Marketing Strategy Deck', ext: 'PPTX', type: 'Presentation', department: 'Business Administration', uploader: 'Mr. Kavish Joshi', size: '8.6 MB', downloads: 96, status: 'Review' },
    { id: 'RES-05', title: 'Structural Analysis Notes', ext: 'DOCX', type: 'Document', department: 'Civil Engineering', uploader: 'Dr. Aisha Khan', size: '2.4 MB', downloads: 187, status: 'Published' },
    { id: 'RES-06', title: 'DBMS Practice Question Bank', ext: 'PDF', type: 'PDF', department: 'Information Technology', uploader: 'Prof. Vikas Malhotra', size: '3.8 MB', downloads: 254, status: 'Draft' }
  ];

  const page = window.VectorOneAdmin.createTablePage({
    prefix: 'resource',
    statIcon: 'resources',
    idKey: 'id',
    labelKey: 'title',
    data: resources,
    searchFields: ['title', 'type', 'department', 'uploader'],
    stats: [
      { label: 'Total Resources', value: 1268, trend: '+42 this week', tone: 'blue' },
      { label: 'Published', value: 1094, trend: '86% live', tone: 'green' },
      { label: 'Total Downloads', value: '18.4K', trend: '+1.2K this month', tone: 'purple' },
      { label: 'Storage Used', value: '136 GB', trend: 'of 200 GB', tone: 'orange' }
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
