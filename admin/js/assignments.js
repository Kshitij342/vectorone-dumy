/* Admin assignments — page logic. Uses the shared table controller defined in
   js/admin-dashboard.js (loaded first). Frontend-only demo data. */
(function () {
  'use strict';
  if (!window.VectorOneAdmin || !window.VectorOneAdmin.createTablePage) return;
  const esc = window.VectorOneAdmin.escapeHtml;

  const assignments = [
    { id: 'ASG-01', title: 'DBMS Normalization Lab', course: 'Database Systems', faculty: 'Dr. Neha Sharma', due: '2026-08-28', submitted: 48, total: 52, status: 'Open' },
    { id: 'ASG-02', title: 'Operating Systems Quiz', course: 'Operating Systems', faculty: 'Prof. Rohan Verma', due: '2026-08-22', submitted: 31, total: 45, status: 'Late' },
    { id: 'ASG-03', title: 'Thermodynamics Problem Set', course: 'Mechanical Engineering', faculty: 'Dr. Meera Nair', due: '2026-09-02', submitted: 12, total: 40, status: 'Open' },
    { id: 'ASG-04', title: 'Marketing Case Study', course: 'Business Administration', faculty: 'Mr. Kavish Joshi', due: '2026-08-19', submitted: 38, total: 38, status: 'Reviewed' },
    { id: 'ASG-05', title: 'Bridge Design Report', course: 'Civil Engineering', faculty: 'Dr. Aisha Khan', due: '2026-08-30', submitted: 22, total: 34, status: 'Submitted' },
    { id: 'ASG-06', title: 'Web Development Project', course: 'Information Technology', faculty: 'Prof. Vikas Malhotra', due: '2026-09-06', submitted: 27, total: 50, status: 'Open' }
  ];

  function isOverdue(iso, status) { return status !== 'Reviewed' && new Date(iso).getTime() < Date.now(); }

  window.VectorOneAdmin.createTablePage({
    prefix: 'assignment',
    statIcon: 'assignments',
    idKey: 'id',
    labelKey: 'title',
    data: assignments,
    searchFields: ['title', 'course', 'faculty'],
    stats: [
      { label: 'Total Assignments', value: 243, trend: '31 awaiting review', tone: 'blue' },
      { label: 'Open', value: 118, trend: 'Currently active', tone: 'green' },
      { label: 'Awaiting Review', value: 31, trend: 'Needs grading', tone: 'orange' },
      { label: 'Avg Submission', value: '82%', trend: '+3% this week', tone: 'purple' }
    ],
    filters: [
      { id: 'assignmentCourseFilter', field: 'course', label: 'Course', auto: true },
      { id: 'assignmentFacultyFilter', field: 'faculty', label: 'Faculty', auto: true },
      { id: 'assignmentStatusFilter', field: 'status', label: 'Status' }
    ],
    defaultSort: function (a, b) { return a.due.localeCompare(b.due); },
    columns: [
      { cellClass: 'assignment-title', cell: function (r) { return '<strong>' + esc(r.title) + '</strong><span>' + esc(r.id) + '</span>'; } },
      { cell: function (r) { return '<span class="assignment-course">' + esc(r.course) + '</span>'; } },
      { cell: function (r) { return esc(r.faculty); } },
      { cell: function (r) { return '<span class="due-date' + (isOverdue(r.due, r.status) ? ' is-overdue' : '') + '">' + esc(r.due) + '<span>' + (isOverdue(r.due, r.status) ? 'Overdue' : 'On track') + '</span></span>'; } },
      {
        cellClass: 'submission-meter',
        cell: function (r) {
          const pct = Math.min(Math.round((r.submitted / r.total) * 100), 100);
          return '<div class="meter-label"><strong>' + r.submitted + '/' + r.total + '</strong><span>' + pct + '%</span></div>' +
            '<div class="meter-track' + (pct < 60 ? ' is-behind' : '') + '"><span style="width:' + pct + '%"></span></div>';
        }
      },
      { cell: function (r) { return '<span class="status-badge ' + esc(r.status.toLowerCase()) + '">' + esc(r.status) + '</span>'; } }
    ],
    detail: function (r) {
      return '<div class="detail-grid">' +
        '<div><span>Assignment</span><strong>' + esc(r.title) + '</strong></div>' +
        '<div><span>Course</span><strong>' + esc(r.course) + '</strong></div>' +
        '<div><span>Faculty</span><strong>' + esc(r.faculty) + '</strong></div>' +
        '<div><span>Due Date</span><strong>' + esc(r.due) + '</strong></div>' +
        '<div><span>Submissions</span><strong>' + r.submitted + ' / ' + r.total + '</strong></div>' +
        '<div><span>Status</span><strong>' + esc(r.status) + '</strong></div>' +
      '</div>';
    },
    form: [
      { name: 'title', label: 'Title', full: true, required: true },
      { name: 'course', label: 'Course', required: true },
      { name: 'faculty', label: 'Faculty', required: true },
      { name: 'due', label: 'Due Date', type: 'date', required: true },
      { name: 'submitted', label: 'Submitted', type: 'number' },
      { name: 'total', label: 'Total Students', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Submitted', 'Reviewed', 'Late'] }
    ],
    newRecord: function (rows) {
      return { id: 'ASG-' + String(rows.length + 1).padStart(2, '0'), title: '', course: '', faculty: '', due: '', submitted: 0, total: 40, status: 'Open' };
    },
    viewTitle: 'Assignment Details',
    editTitle: 'Edit Assignment',
    addTitle: 'Add Assignment',
    deleteTitle: 'Delete Assignment',
    addId: 'addAssignmentBtn',
    refreshId: 'refreshAssignmentsBtn',
    exportId: 'exportAssignmentsBtn',
    csv: {
      filename: 'assignments.csv',
      headers: ['ID', 'Title', 'Course', 'Faculty', 'Due', 'Submitted', 'Total', 'Status'],
      row: function (r) { return [r.id, r.title, r.course, r.faculty, r.due, r.submitted, r.total, r.status]; }
    }
  });
}());
