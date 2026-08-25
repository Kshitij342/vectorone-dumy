/* Admin analytics — page logic moved out of the inline <script> in analytics.html.
   Frontend-only demo data held in memory. All lookups are guarded so this file is
   inert if loaded on a page that does not have the analytics markup. */
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

  /* ---------- demo data ---------- */
  const summary = [
    { label: 'Student Retention', value: '91.8%', trend: '+2.4% this term', tone: 'blue', icon: 'students' },
    { label: 'Faculty Productivity', value: '86.7%', trend: '+4.1% this month', tone: 'green', icon: 'faculty' },
    { label: 'Resource Usage', value: '68.3%', trend: 'Healthy capacity', tone: 'purple', icon: 'resources' },
    { label: 'Campus Satisfaction', value: '4.7/5', trend: '+0.3 since last cycle', tone: 'orange', icon: 'analytics' }
  ];

  const enrollment = [
    { label: 'Jan', applied: 38, admitted: 52, retained: 60 },
    { label: 'Feb', applied: 49, admitted: 60, retained: 67 },
    { label: 'Mar', applied: 60, admitted: 68, retained: 74 },
    { label: 'Apr', applied: 71, admitted: 76, retained: 81 },
    { label: 'May', applied: 82, admitted: 84, retained: 88 },
    { label: 'Jun', applied: 93, admitted: 92, retained: 95 },
    { label: 'Jul', applied: 100, admitted: 96, retained: 98 }
  ];

  const departments = [
    { label: 'Computer Science', attendance: 92, results: 88, placement: 84 },
    { label: 'Electronics', attendance: 89, results: 84, placement: 76 },
    { label: 'Mechanical', attendance: 86, results: 81, placement: 71 },
    { label: 'Business', attendance: 90, results: 86, placement: 79 },
    { label: 'Design', attendance: 84, results: 83, placement: 68 }
  ];

  const keyMetrics = [
    { label: 'Attendance', value: '91.6%', note: 'Across all departments' },
    { label: 'Course Completion', value: '84.2%', note: 'Current semester' },
    { label: 'Placements', value: '73.4%', note: 'Final-year batch' },
    { label: 'Portal Engagement', value: '88.1%', note: 'Weekly active students' }
  ];

  const focusAreas = [
    { label: 'Improve lab attendance', note: 'Mechanical & Civil below target' },
    { label: 'Expand mentorship coverage', note: '18 students unassigned' },
    { label: 'Optimize resource allocation', note: 'Lab Block C at 96% usage' },
    { label: 'Track placement readiness', note: 'Mock interviews pending' }
  ];

  /* ---------- renderers ---------- */
  function icon(key) {
    return (window.VectorOneAdmin && window.VectorOneAdmin.icons && window.VectorOneAdmin.icons[key]) || '';
  }

  function renderSummary() {
    if (!summaryHost) return;
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
}());
