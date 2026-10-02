/* Legacy VectorOne student module: intentionally kept as a no-data shell to avoid shipping demo metrics or fixture data. */
(function () {
  'use strict';

  const statsHost = document.getElementById('studentStats');
  const studentsTable = document.getElementById('studentsBody');

  if (statsHost) {
    statsHost.innerHTML = '<div class="empty-state">No student records available.</div>';
  }

  if (studentsTable) {
    studentsTable.innerHTML = '<tr><td colspan="10" class="empty-state-row">No students found.</td></tr>';
  }
})();
