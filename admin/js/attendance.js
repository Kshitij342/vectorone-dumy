(function () {
  'use strict';
  /* Page icon pulled from the shared ICONS map in admin-dashboard.js
     (loaded before this file). Falls back to an empty string rather
     than a Unicode glyph so nothing renders at the wrong size. */
  const statGlyph = (window.VectorOneAdmin && window.VectorOneAdmin.icons && window.VectorOneAdmin.icons.attendance) || '';


  const records = [
    { id: 'VO2024001', name: 'Aarav Mehta', department: 'Computer Science', year: '2', division: 'A', present: 22, absent: 2, percentage: 91, status: 'Excellent' },
    { id: 'VO2024002', name: 'Diya Sharma', department: 'Information Technology', year: '3', division: 'B', present: 21, absent: 3, percentage: 88, status: 'Good' },
    { id: 'VO2024003', name: 'Rohan Iyer', department: 'Mechanical Engineering', year: '4', division: 'A', present: 18, absent: 5, percentage: 78, status: 'Warning' },
    { id: 'VO2024004', name: 'Ananya Gupta', department: 'Computer Science', year: '1', division: 'C', present: 23, absent: 1, percentage: 96, status: 'Excellent' },
    { id: 'VO2024005', name: 'Kabir Khan', department: 'Electronics', year: '2', division: 'B', present: 15, absent: 8, percentage: 65, status: 'Critical' },
    { id: 'VO2024006', name: 'Meera Nair', department: 'Business Administration', year: '4', division: 'A', present: 19, absent: 3, percentage: 86, status: 'Good' }
  ];

  const attendanceStats = document.getElementById('attendanceStats');
  const attendanceTableBody = document.getElementById('attendanceTableBody');
  const attendanceSearch = document.getElementById('attendanceSearch');
  const deptFilter = document.getElementById('attendanceDeptFilter');
  const yearFilter = document.getElementById('attendanceYearFilter');
  const divisionFilter = document.getElementById('attendanceDivisionFilter');
  const dateFilter = document.getElementById('attendanceDateFilter');
  const attendanceVisual = document.getElementById('attendanceVisual');

  function renderStats() {
    const stats = [
      { label: 'Overall Attendance', value: '91.4%', tone: 'blue' },
      { label: 'Present', value: '1,964', tone: 'green' },
      { label: 'Absent', value: '182', tone: 'orange' },
      { label: 'At Risk', value: '46', tone: 'purple' }
    ];
    attendanceStats.innerHTML = stats.map(function (item) {
      return '<article class="stat-card stat-card--' + item.tone + '"><div class="stat-card-top"><div class="stat-icon stat-icon--' + item.tone + '">' + statGlyph + '</div></div><p class="stat-value">' + item.value + '</p><p class="stat-label">' + item.label + '</p><span class="stat-trend stat-trend--up">↗ This week</span></article>';
    }).join('');
  }

  function populateFilters() {
    const departments = [...new Set(records.map(function (item) { return item.department; }))].sort();
    const years = [...new Set(records.map(function (item) { return item.year; }))].sort();
    const divisions = [...new Set(records.map(function (item) { return item.division; }))].sort();
    deptFilter.innerHTML = '<option value="">Department</option>' + departments.map(function (dept) { return '<option value="' + dept + '">' + dept + '</option>'; }).join('');
    yearFilter.innerHTML = '<option value="">Year</option>' + years.map(function (year) { return '<option value="' + year + '">' + year + '</option>'; }).join('');
    divisionFilter.innerHTML = '<option value="">Division</option>' + divisions.map(function (division) { return '<option value="' + division + '">' + division + '</option>'; }).join('');
  }

  function getFilteredRows() {
    const q = (attendanceSearch.value || '').trim().toLowerCase();
    return records.filter(function (row) {
      const matchesQ = !q || [row.name, row.id, row.department].join(' ').toLowerCase().includes(q);
      const matchesDept = !deptFilter.value || row.department === deptFilter.value;
      const matchesYear = !yearFilter.value || row.year === yearFilter.value;
      const matchesDivision = !divisionFilter.value || row.division === divisionFilter.value;
      const matchesDate = !dateFilter.value || dateFilter.value === '2025-08-13';
      return matchesQ && matchesDept && matchesYear && matchesDivision && matchesDate;
    });
  }

  function renderVisual() {
    const total = records.length;
    const excellent = records.filter(function (row) { return row.status === 'Excellent'; }).length;
    const good = records.filter(function (row) { return row.status === 'Good'; }).length;
    const warning = records.filter(function (row) { return row.status === 'Warning'; }).length;
    const critical = records.filter(function (row) { return row.status === 'Critical'; }).length;
    attendanceVisual.innerHTML = [
      { label: 'Excellent', value: excellent, total: total },
      { label: 'Good', value: good, total: total },
      { label: 'Warning', value: warning, total: total },
      { label: 'Critical', value: critical, total: total }
    ].map(function (item) {
      return '<div class="visual-card"><strong>' + item.value + '</strong><span>' + item.label + ' students</span></div>';
    }).join('');
  }

  function renderTable() {
    const rows = getFilteredRows();
    attendanceTableBody.innerHTML = rows.map(function (row) {
      return '<tr><td>' + row.id + '</td><td>' + row.name + '</td><td>' + row.department + '</td><td>' + row.year + '</td><td>' + row.division + '</td><td>' + row.present + '</td><td>' + row.absent + '</td><td>' + row.percentage + '%</td><td><span class="status-chip ' + row.status.toLowerCase() + '">' + row.status + '</span></td></tr>';
    }).join('');
  }

  attendanceSearch.addEventListener('input', renderTable);
  deptFilter.addEventListener('change', renderTable);
  yearFilter.addEventListener('change', renderTable);
  divisionFilter.addEventListener('change', renderTable);
  dateFilter.addEventListener('change', renderTable);
  document.getElementById('refreshAttendanceBtn').addEventListener('click', function () { renderTable(); renderVisual(); });
  document.getElementById('downloadAttendanceBtn').addEventListener('click', function () {
    const csv = ['Student ID,Student,Department,Year,Division,Present,Absent,Attendance %,Status'];
    getFilteredRows().forEach(function (row) {
      csv.push([row.id, row.name, row.department, row.year, row.division, row.present, row.absent, row.percentage, row.status].join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attendance-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  });

  renderStats();
  populateFilters();
  renderVisual();
  renderTable();
})();
