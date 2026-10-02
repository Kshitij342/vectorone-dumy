/* Admin analytics — data is loaded from the live API when available.
   The page starts empty so it never ships demo/mock analytics to production. */
(function () {
  'use strict';

  const esc = (window.VectorOneAdmin && window.VectorOneAdmin.escapeHtml) || function (v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  const summaryHost = document.getElementById('analyticsSummary');
  const enrollmentHost = document.getElementById('enrollmentCharts');
  const departmentHost = document.getElementById('departmentCharts');
  const metricsHost = document.getElementById('keyMetricsList');
  const focusHost = document.getElementById('focusAreasList');
  const refreshBtn = document.getElementById('refreshAnalyticsBtn');
  const exportBtn = document.getElementById('exportAnalyticsBtn');

  // Not the analytics page — do nothing.
  if (!summaryHost && !enrollmentHost && !departmentHost) return;

  const summary = [];
  const enrollment = [];
  const departments = [];
  const keyMetrics = [];
  const focusAreas = [];

  /* ---------- renderers ---------- */
  function icon(key) {
    return (window.VectorOneAdmin && window.VectorOneAdmin.icons && window.VectorOneAdmin.icons[key]) || '';
  }

  function renderSummary() {
    if (!summaryHost) return;
    if (!summary.length) {
      summaryHost.innerHTML = '<div class="empty-state">No analytics summary yet. Add records to populate this section.</div>';
      return;
    }
    summaryHost.innerHTML = summary.map(function (item) {
      return '<article class="stat-card stat-card--' + item.tone + '">' +
        '<div class="stat-card-top"><div class="stat-icon stat-icon--' + item.tone + '">' + icon(item.icon) + '</div></div>' +
        '<p class="stat-value">' + esc(item.value) + '</p>' +
        '<p class="stat-label">' + esc(item.label) + '</p>' +
        '<span class="stat-trend stat-trend--up">↗ ' + esc(item.trend) + '</span>' +
        '</article>';
    }).join('');
  }

  // A small three-bar chart per card. Values are percentages, so heights are safe.
  function chartCard(title, caption, series) {
    return '<article class="analytic-card">' +
      '<h4>' + esc(title) + '</h4>' +
      '<p>' + esc(caption) + '</p>' +
      '<div class="bar-chart" role="img" aria-label="' + esc(title + ': ' + series.map(function (s) { return s.name + ' ' + s.value + '%'; }).join(', ')) + '">' +
        series.map(function (s) {
          return '<span style="height:' + Math.max(4, Math.min(100, s.value)) + '%" title="' + esc(s.name + ': ' + s.value + '%') + '"></span>';
        }).join('') +
      '</div></article>';
  }

  function renderEnrollment() {
    if (!enrollmentHost) return;
    if (!enrollment.length) {
      enrollmentHost.innerHTML = '<div class="empty-state">No enrollment data available yet.</div>';
      return;
    }
    enrollmentHost.innerHTML = enrollment.map(function (m) {
      return chartCard(m.label, 'Applied / Admitted / Retained', [
        { name: 'Applied', value: m.applied },
        { name: 'Admitted', value: m.admitted },
        { name: 'Retained', value: m.retained }
      ]);
    }).join('');
  }

  function renderDepartments() {
    if (!departmentHost) return;
    if (!departments.length) {
      departmentHost.innerHTML = '<div class="empty-state">No department analytics available yet.</div>';
      return;
    }
    departmentHost.innerHTML = departments.map(function (d) {
      return chartCard(d.label, 'Attendance / Results / Placement', [
        { name: 'Attendance', value: d.attendance },
        { name: 'Results', value: d.results },
        { name: 'Placement', value: d.placement }
      ]);
    }).join('');
  }

  function renderList(host, items) {
    if (!host) return;
    if (!items.length) {
      host.innerHTML = '<div class="empty-state">No records available.</div>';
      return;
    }
    host.innerHTML = items.map(function (item) {
      return '<div class="compact-row"><div class="row-copy">' +
        '<strong>' + esc(item.label) + (item.value ? ': ' + esc(item.value) : '') + '</strong>' +
        '<span>' + esc(item.note) + '</span>' +
        '</div></div>';
    }).join('');
  }

  function renderAll() {
    renderSummary();
    renderEnrollment();
    renderDepartments();
    renderList(metricsHost, keyMetrics);
    renderList(focusHost, focusAreas);
  }

  /* ---------- actions ---------- */
  if (refreshBtn) refreshBtn.addEventListener('click', renderAll);

  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      const cell = function (v) {
        const s = String(v === undefined || v === null ? '' : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const lines = ['Section,Label,Value,Detail'];
      summary.forEach(function (s) { lines.push(['Summary', s.label, s.value, s.trend].map(cell).join(',')); });
      enrollment.forEach(function (m) { lines.push(['Enrollment', m.label, m.admitted + '%', 'applied ' + m.applied + '%, retained ' + m.retained + '%'].map(cell).join(',')); });
      departments.forEach(function (d) { lines.push(['Department', d.label, d.results + '%', 'attendance ' + d.attendance + '%, placement ' + d.placement + '%'].map(cell).join(',')); });
      keyMetrics.forEach(function (m) { lines.push(['Key Metric', m.label, m.value, m.note].map(cell).join(',')); });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'analytics-snapshot.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  renderAll();

  // Load live analytics from API
  (function loadLiveAnalytics() {
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    if (!token) return;

    fetch(API_BASE + '/admin/analytics/overview', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.data) {
          if (res.data.summary && summaryHost) {
            summary.length = 0;
            res.data.summary.forEach(function (s) { summary.push(s); });
            renderSummary();
          }
          if (res.data.keyMetrics && metricsHost) {
            keyMetrics.length = 0;
            res.data.keyMetrics.forEach(function (k) { keyMetrics.push(k); });
            renderList(metricsHost, keyMetrics);
          }
        }
      })
      .catch(function () {});
  })();
}());
