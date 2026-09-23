/* Admin reports — page logic connected to PostgreSQL report overview endpoints. */
(function () {
  'use strict';
  if (!window.VectorOneAdmin || !window.VectorOneAdmin.createTablePage) return;
  const esc = window.VectorOneAdmin.escapeHtml;

  const reports = [];

  const page = window.VectorOneAdmin.createTablePage({
    prefix: 'report',
    apiEndpoint: '/admin/reports',
    statIcon: 'reports',
    idKey: 'id',
    labelKey: 'title',
    data: reports,
    actions: ['view'], // Reports are read-only views generated from database queries
    searchFields: ['title', 'summary', 'category', 'owner', 'period'],
    stats: [
      { label: 'System Reports', value: '0', trend: 'Calculated from DB', tone: 'blue' },
      { label: 'Ready to View', value: '0', trend: 'All verified', tone: 'green' },
      { label: 'Data Source', value: 'PostgreSQL', trend: 'Real-time', tone: 'purple' },
      { label: 'Compliance Score', value: '0%', trend: 'Verified', tone: 'orange' }
    ],
    filters: [
      { id: 'reportCategoryFilter', field: 'category', label: 'Category' },
      { id: 'reportPeriodFilter', field: 'period', label: 'Period' }
    ],
    defaultSort: function (a, b) { return (b.updated || '').localeCompare(a.updated || ''); },
    columns: [
      { cellClass: 'report-name', cell: function (r) { return '<strong>' + esc(r.title) + '</strong><span>' + esc(r.summary) + '</span>'; } },
      { cell: function (r) { return esc(r.category || 'Academic'); } },
      { cell: function (r) { return esc(r.owner || 'Administration'); } },
      { cell: function (r) { return '<span class="report-period">' + esc(r.period || 'Monthly') + '</span>'; } },
      { cellClass: 'report-updated', cell: function (r) { return esc(r.updated || 'Recent'); } },
      { cell: function (r) { return '<span class="status-badge ' + esc((r.status || 'Ready').toLowerCase()) + '">' + esc(r.status || 'Ready') + '</span>'; } }
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
        '<div class="report-metrics" style="margin-top: 15px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">' +
          (r.metrics || []).map(function (m) {
            return '<div class="report-metric" style="padding: 10px; background: var(--bg-hover); border-radius: 6px;">' +
              '<span style="display: block; font-size: 12px; color: var(--text-secondary);">' + esc(m.label) + '</span>' +
              '<strong style="font-size: 18px; color: var(--text-primary);">' + esc(m.value) + '</strong></div>';
          }).join('') +
        '</div>' +
      '</div>';
    },
    exportId: 'exportReportsBtn',
    csv: {
      filename: 'reports.csv',
      headers: ['ID', 'Report', 'Category', 'Owner', 'Period', 'Last Updated', 'Status'],
      row: function (r) { return [r.id, r.title, r.category, r.owner, r.period, r.updated, r.status]; }
    }
  });

  // Wire "+ Generate New" button to perform async refresh without page reload
  const genBtn = document.getElementById('addReportBtn');
  if (genBtn) {
    genBtn.addEventListener('click', function (e) {
      if (e) e.preventDefault();
      const btn = this;
      btn.disabled = true;
      btn.textContent = 'Generating...';

      if (page && typeof page.refresh === 'function') {
        page.refresh(function (err) {
          btn.disabled = false;
          btn.textContent = '+ Generate New';
          if (err) {
            alert('Failed to generate reports: ' + (typeof err === 'string' ? err : 'Network error'));
          }
        });
      } else {
        btn.disabled = false;
        btn.textContent = '+ Generate New';
      }
    });
  }
}());
