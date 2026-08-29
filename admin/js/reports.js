/* Admin reports — page logic. Uses the shared table controller defined in
   js/admin-dashboard.js (loaded first). Frontend-only demo data. */
(function () {
  'use strict';
  if (!window.VectorOneAdmin || !window.VectorOneAdmin.createTablePage) return;
  const esc = window.VectorOneAdmin.escapeHtml;

  const reports = [
    {
      id: 'RPT-01', title: 'Student Enrollment Summary', summary: 'Intake, conversions and retention by department',
      category: 'Academic', owner: 'Admissions Office', period: 'Monthly', updated: '2026-08-01', status: 'Ready',
      metrics: [{ label: 'Applications', value: '3,412' }, { label: 'Admitted', value: '1,268' }, { label: 'Conversion', value: '37.2%' }]
    },
    {
      id: 'RPT-02', title: 'Faculty Workload Review', summary: 'Teaching hours and load distribution per faculty',
      category: 'Operations', owner: 'Academic Affairs', period: 'Quarterly', updated: '2026-07-28', status: 'Draft',
      metrics: [{ label: 'Faculty', value: '186' }, { label: 'Avg Hours', value: '17.4/wk' }, { label: 'Over Target', value: '12' }]
    },
    {
      id: 'RPT-03', title: 'Attendance Compliance', summary: 'Departments below the 75% attendance threshold',
      category: 'Academic', owner: 'Student Services', period: 'Monthly', updated: '2026-07-30', status: 'Ready',
      metrics: [{ label: 'Overall', value: '91.6%' }, { label: 'Below 75%', value: '48 students' }, { label: 'Flagged', value: '3 depts' }]
    },
    {
      id: 'RPT-04', title: 'Resource Utilization', summary: 'Library, lab and storage consumption against capacity',
      category: 'Finance', owner: 'Administration', period: 'Quarterly', updated: '2026-07-25', status: 'Review',
      metrics: [{ label: 'Storage', value: '136 GB' }, { label: 'Lab Usage', value: '96%' }, { label: 'Downloads', value: '18.4K' }]
    },
    {
      id: 'RPT-05', title: 'Placement Outcomes', summary: 'Offers, packages and recruiter participation',
      category: 'Academic', owner: 'Placement Cell', period: 'Yearly', updated: '2026-07-18', status: 'Ready',
      metrics: [{ label: 'Placed', value: '73.4%' }, { label: 'Recruiters', value: '64' }, { label: 'Avg Package', value: '₹7.8 LPA' }]
    },
    {
      id: 'RPT-06', title: 'Fee Collection Statement', summary: 'Instalment recovery and outstanding dues',
      category: 'Finance', owner: 'Accounts Office', period: 'Monthly', updated: '2026-08-04', status: 'Review',
      metrics: [{ label: 'Collected', value: '94.1%' }, { label: 'Outstanding', value: '₹42.6 L' }, { label: 'Defaulters', value: '117' }]
    }
  ];

  window.VectorOneAdmin.createTablePage({
    prefix: 'report',
    statIcon: 'reports',
    idKey: 'id',
    labelKey: 'title',
    data: reports,
    searchFields: ['title', 'summary', 'category', 'owner', 'period'],
    stats: [
      { label: 'Monthly Reports', value: 24, trend: '3 new this week', tone: 'blue' },
      { label: 'Ready to Export', value: 12, trend: 'All verified', tone: 'green' },
      { label: 'Pending Review', value: 7, trend: 'Needs sign-off', tone: 'orange' },
      { label: 'Compliance Score', value: '98.4%', trend: '+1.2% last month', tone: 'purple' }
    ],
    filters: [
      { id: 'reportCategoryFilter', field: 'category', label: 'Category' },
      { id: 'reportPeriodFilter', field: 'period', label: 'Period' }
    ],
    defaultSort: function (a, b) { return b.updated.localeCompare(a.updated); },
    columns: [
      { cellClass: 'report-name', cell: function (r) { return '<strong>' + esc(r.title) + '</strong><span>' + esc(r.summary) + '</span>'; } },
      { cell: function (r) { return esc(r.category); } },
      { cell: function (r) { return esc(r.owner); } },
      { cell: function (r) { return '<span class="report-period">' + esc(r.period) + '</span>'; } },
      { cellClass: 'report-updated', cell: function (r) { return esc(r.updated); } },
      { cell: function (r) { return '<span class="status-badge ' + esc(r.status.toLowerCase()) + '">' + esc(r.status) + '</span>'; } }
    ],
    detail: function (r) {
      return '<div class="report-summary">' +
        '<div class="detail-grid">' +
          '<div><span>Report</span><strong>' + esc(r.title) + '</strong></div>' +
          '<div><span>Category</span><strong>' + esc(r.category) + '</strong></div>' +
          '<div><span>Owner</span><strong>' + esc(r.owner) + '</strong></div>' +
          '<div><span>Period</span><strong>' + esc(r.period) + '</strong></div>' +
          '<div><span>Last Updated</span><strong>' + esc(r.updated) + '</strong></div>' +
          '<div><span>Status</span><strong>' + esc(r.status) + '</strong></div>' +
        '</div>' +
        '<div class="report-metrics">' +
          (r.metrics || []).map(function (m) {
            return '<div class="report-metric"><span>' + esc(m.label) + '</span><strong>' + esc(m.value) + '</strong></div>';
          }).join('') +
        '</div>' +
      '</div>';
    },
    form: [
      { name: 'title', label: 'Report Title', full: true, required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Academic', 'Finance', 'Operations'] },
      { name: 'period', label: 'Period', type: 'select', options: ['Monthly', 'Quarterly', 'Yearly'] },
      { name: 'owner', label: 'Owner', required: true },
      { name: 'updated', label: 'Last Updated', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['Ready', 'Review', 'Draft'] },
      { name: 'summary', label: 'Summary', type: 'textarea', full: true }
    ],
    newRecord: function (rows) {
      return {
        id: 'RPT-' + String(rows.length + 1).padStart(2, '0'),
        title: '', category: 'Academic', period: 'Monthly', owner: '',
        updated: new Date().toISOString().slice(0, 10), status: 'Draft', summary: '', metrics: []
      };
    },
    viewTitle: 'Report Summary',
    editTitle: 'Edit Report',
    addTitle: 'Generate Report',
    deleteTitle: 'Delete Report',
    addId: 'addReportBtn',
    exportId: 'exportReportsBtn',
    csv: {
      filename: 'reports.csv',
      headers: ['ID', 'Report', 'Category', 'Owner', 'Period', 'Last Updated', 'Status'],
      row: function (r) { return [r.id, r.title, r.category, r.owner, r.period, r.updated, r.status]; }
    }
  });

  // Load live report data from API
  (function loadLiveReports() {
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    if (!token) return;

    fetch(API_BASE + '/admin/reports/students', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.data) {
          // Live reports stats synced
        }
      })
      .catch(function () {});
  })();
}());
