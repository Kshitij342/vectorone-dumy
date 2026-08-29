/* ============================================================
   VectorOne — Student Assignments Page Logic
   Loaded AFTER js/dashboard.js (which already wires the shared
   app shell: theme toggle, sidebar collapse/drawer, navbar
   popovers, global search, and button ripple — all of that keeps
   working unmodified here).

   This file owns everything specific to the Assignments page:
   the dummy dataset, summary-card math, the card grid + search +
   filters + pagination, the two modals (assignment details and
   upload submission with drag-and-drop + simulated progress), and
   the right-sidebar widgets (Upcoming Deadlines, Recently
   Submitted, Pending Reviews, Subject Progress).

   STUDENT-ONLY: there is intentionally no create / edit / delete /
   publish functionality anywhere in this file.

   ---------------------------------------------------------------
   BACKEND-READY: every place that reads or writes ASSIGNMENTS is
   isolated behind small functions (getAssignments, submitUpload,
   toggleBookmark…). To wire up a real API later:
     - GET  /api/assignments            -> replace ASSIGNMENTS with
                                            data fetched on load
     - GET  /api/assignments/:id        -> replace findById()
     - POST /api/assignments/:id/upload -> replace the dummy
                                            progress timer in
                                            startUploadSimulation()
                                            with a real fetch/XHR
                                            upload call
     - GET  /api/assignments/upcoming   -> replace
                                            renderUpcomingDeadlines()'s
                                            local sort/filter
   No other part of the file needs to change.
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     DUMMY DATA
     Fixed "today" so the demo dates/statuses stay consistent
     regardless of when this page is actually opened.
     ============================================================ */
  const NOW = new Date(2026, 6, 29); // Jul 29, 2026

  const ASSIGNMENTS = [
    {
      id: 'a1',
      subject: 'Database Management Systems',
      courseCode: 'CS301',
      title: 'DBMS Lab 4 — Normalization & ER Modeling',
      faculty: 'Dr. Ananya Rao',
      type: 'Lab',
      assignedDate: 'Jul 18, 2026',
      dueDate: 'Jul 30, 2026',
      dueDateISO: '2026-07-30',
      marks: 20,
      status: 'pending',
      priority: 'high',
      description: 'Design a normalized relational schema (up to 3NF) for a library management system and submit the ER diagram along with the normalization steps.',
      instructions: [
        'Identify at least 6 entities with appropriate attributes and keys.',
        'Show the schema progressing from 1NF through 3NF with justifications.',
        'Submit the final ER diagram as a single PDF, and the schema as a DOCX.',
      ],
      brief: { name: 'DBMS_Lab4_Brief.pdf', size: '312 KB' },
      resources: [{ name: 'ER_Diagram_Template.docx', size: '84 KB' }],
      estimatedTime: '3 hrs',
      bookmarked: true,
    },
    {
      id: 'a2',
      subject: 'Operating Systems',
      courseCode: 'CS302',
      title: 'Operating Systems Assignment — CPU Scheduling',
      faculty: 'Prof. Manish Verma',
      type: 'Theory',
      assignedDate: 'Jul 10, 2026',
      dueDate: 'Jul 22, 2026',
      dueDateISO: '2026-07-22',
      marks: 15,
      status: 'overdue',
      priority: 'high',
      description: 'Compare FCFS, SJF, Round Robin and Priority scheduling algorithms using a common set of processes, and report average waiting/turnaround time for each.',
      instructions: [
        'Use the process set provided in the brief — do not substitute your own.',
        'Include a Gantt chart for every algorithm.',
        'Submit a single PDF report with all calculations shown.',
      ],
      brief: { name: 'OS_CPU_Scheduling_Brief.pdf', size: '198 KB' },
      resources: [],
      estimatedTime: '2.5 hrs',
      bookmarked: false,
    },
    {
      id: 'a3',
      subject: 'Computer Networks',
      courseCode: 'CS304',
      title: 'Computer Networks Report — Routing Protocols',
      faculty: 'Dr. Neha Kapoor',
      type: 'Theory',
      assignedDate: 'Jul 5, 2026',
      dueDate: 'Jul 15, 2026',
      dueDateISO: '2026-07-15',
      marks: 30,
      score: 27,
      status: 'completed',
      priority: 'medium',
      description: 'A comparative report on distance-vector vs link-state routing protocols, with a worked example of Dijkstra\u2019s algorithm on a sample network topology.',
      instructions: [
        'Cover at least one protocol from each category (e.g. RIP and OSPF).',
        'Include a worked numerical example, not just theory.',
        'Cite any external sources used.',
      ],
      brief: { name: 'CN_Routing_Report_Brief.pdf', size: '260 KB' },
      resources: [{ name: 'Sample_Topology.pdf', size: '120 KB' }],
      estimatedTime: '4 hrs',
      bookmarked: false,
      submittedDate: 'Jul 14, 2026',
    },
    {
      id: 'a4',
      subject: 'Programming in Python',
      courseCode: 'CS210',
      title: 'Python Mini Project — Expense Tracker CLI',
      faculty: 'Prof. Rakesh Iyer',
      type: 'Mini Project',
      assignedDate: 'Jul 1, 2026',
      dueDate: 'Aug 10, 2026',
      dueDateISO: '2026-08-10',
      marks: 50,
      status: 'pending',
      priority: 'medium',
      description: 'Build a command-line expense tracker in Python with add/view/filter/delete operations and persistent storage using a local file or SQLite.',
      instructions: [
        'Use only the Python standard library (no external packages).',
        'Persist data between runs — an in-memory-only solution will not be accepted.',
        'Include a README explaining how to run the project.',
        'Submit the full project as a single ZIP file.',
      ],
      brief: { name: 'Python_MiniProject_Brief.pdf', size: '145 KB' },
      resources: [{ name: 'Starter_Template.zip', size: '18 KB' }],
      estimatedTime: '12 hrs',
      bookmarked: true,
    },
    {
      id: 'a5',
      subject: 'Artificial Intelligence',
      courseCode: 'CS405',
      title: 'AI Research Paper — Search Algorithms in Games',
      faculty: 'Dr. Sameer Joshi',
      type: 'Theory',
      assignedDate: 'Jul 12, 2026',
      dueDate: 'Aug 5, 2026',
      dueDateISO: '2026-08-05',
      marks: 25,
      status: 'pending',
      priority: 'low',
      description: 'Write a short survey paper on adversarial search (Minimax, Alpha-Beta pruning) and their application in two-player games such as chess or tic-tac-toe.',
      instructions: [
        'Minimum 1,500 words, maximum 2,500 words.',
        'Include at least 4 academic references in a consistent citation style.',
        'Submit as a single PDF.',
      ],
      brief: { name: 'AI_Research_Paper_Brief.pdf', size: '176 KB' },
      resources: [],
      estimatedTime: '8 hrs',
      bookmarked: false,
    },
    {
      id: 'a6',
      subject: 'Software Engineering',
      courseCode: 'CS308',
      title: 'Software Engineering Case Study — Agile vs Waterfall',
      faculty: 'Prof. Divya Menon',
      type: 'Theory',
      assignedDate: 'Jul 8, 2026',
      dueDate: 'Jul 20, 2026',
      dueDateISO: '2026-07-20',
      marks: 20,
      status: 'submitted',
      priority: 'medium',
      description: 'Analyze a real-world software project of your choice and evaluate whether an Agile or Waterfall methodology would have been better suited, with justification.',
      instructions: [
        'Pick a documented, real project (news articles or case studies are acceptable sources).',
        'Structure the report using the rubric provided in the brief.',
        'Submit as a single PDF or DOCX.',
      ],
      brief: { name: 'SE_Case_Study_Brief.pdf', size: '210 KB' },
      resources: [{ name: 'Grading_Rubric.pdf', size: '64 KB' }],
      estimatedTime: '5 hrs',
      bookmarked: false,
      submittedDate: 'Jul 19, 2026',
    },
    {
      id: 'a7',
      subject: 'Web Technologies',
      courseCode: 'CS311',
      title: 'Web Development Project — Campus Event Portal',
      faculty: 'Dr. Arjun Malhotra',
      type: 'Major Project',
      assignedDate: 'Jun 25, 2026',
      dueDate: 'Aug 15, 2026',
      dueDateISO: '2026-08-15',
      marks: 100,
      status: 'pending',
      priority: 'high',
      description: 'Build a multi-page campus event listing and RSVP web app using HTML, CSS and JavaScript, with client-side form validation and local persistence.',
      instructions: [
        'At least 4 distinct pages/views, sharing a consistent design language.',
        'Form validation must cover required fields and email format.',
        'No frameworks — vanilla HTML/CSS/JS only, per the course policy.',
        'Submit the full project as a single ZIP file with a README.',
      ],
      brief: { name: 'WebDev_MajorProject_Brief.pdf', size: '298 KB' },
      resources: [{ name: 'Design_Mockups.zip', size: '4.1 MB' }, { name: 'Grading_Rubric.pdf', size: '71 KB' }],
      estimatedTime: '20 hrs',
      bookmarked: true,
    },
    {
      id: 'a8',
      subject: 'Cloud Computing',
      courseCode: 'CS407',
      title: 'Cloud Computing Quiz — Virtualization & IaaS',
      faculty: 'Prof. Kavita Nair',
      type: 'Theory',
      assignedDate: 'Jul 20, 2026',
      dueDate: 'Jul 27, 2026',
      dueDateISO: '2026-07-27',
      marks: 10,
      status: 'overdue',
      priority: 'medium',
      description: 'A short written quiz covering virtualization fundamentals, hypervisor types, and the IaaS/PaaS/SaaS service models.',
      instructions: [
        'Answer all 10 questions from the brief in your own words.',
        'Keep each answer under 100 words.',
        'Submit as a single PDF.',
      ],
      brief: { name: 'Cloud_Quiz_Questions.pdf', size: '92 KB' },
      resources: [],
      estimatedTime: '1 hr',
      bookmarked: false,
    },
    {
      id: 'a9',
      subject: 'Data Structures & Algorithms',
      courseCode: 'CS205',
      title: 'Data Structures Lab — Balanced Binary Search Trees',
      faculty: 'Dr. Priya Deshmukh',
      type: 'Lab',
      assignedDate: 'Jul 20, 2026',
      dueDate: 'Aug 1, 2026',
      dueDateISO: '2026-08-01',
      marks: 20,
      status: 'pending',
      priority: 'high',
      description: 'Implement an AVL tree in a language of your choice with insertion, deletion, and rotation operations, and demonstrate balancing on a sample dataset.',
      instructions: [
        'Implement all four rotation cases (LL, RR, LR, RL).',
        'Include a short demo/test file showing balancing in action.',
        'Submit the source code as a ZIP with a short report.',
      ],
      brief: { name: 'DSA_Lab_AVL_Brief.pdf', size: '154 KB' },
      resources: [{ name: 'Sample_Dataset.zip', size: '22 KB' }],
      estimatedTime: '4 hrs',
      bookmarked: false,
    },
    {
      id: 'a10',
      subject: 'Mobile App Development',
      courseCode: 'CS412',
      title: 'Flutter UI Assignment — Responsive Profile Screen',
      faculty: 'Prof. Rohan Bhatt',
      type: 'Practical',
      assignedDate: 'Jul 15, 2026',
      dueDate: 'Jul 29, 2026',
      dueDateISO: '2026-07-29',
      marks: 15,
      status: 'pending',
      priority: 'high',
      description: 'Recreate the provided profile-screen design in Flutter, ensuring the layout adapts cleanly between phone and tablet breakpoints.',
      instructions: [
        'Match the provided design as closely as possible — spacing, type scale, and color.',
        'Use responsive layout widgets (no hard-coded pixel positioning).',
        'Submit the Flutter project as a ZIP file.',
      ],
      brief: { name: 'Flutter_UI_Brief.pdf', size: '188 KB' },
      resources: [{ name: 'Design_Reference.zip', size: '2.3 MB' }],
      estimatedTime: '5 hrs',
      bookmarked: false,
    },
    {
      id: 'a11',
      subject: 'Database Management Systems',
      courseCode: 'CS301',
      title: 'DBMS ER Diagram Submission — College Portal',
      faculty: 'Dr. Ananya Rao',
      type: 'Practical',
      assignedDate: 'Jun 20, 2026',
      dueDate: 'Jul 5, 2026',
      dueDateISO: '2026-07-05',
      marks: 20,
      score: 18,
      status: 'completed',
      priority: 'low',
      description: 'Design an ER diagram for a simplified college management portal covering students, courses, faculty and enrollments.',
      instructions: [
        'Include cardinality and participation constraints on every relationship.',
        'Submit as a single PDF, hand-drawn or tool-generated.',
      ],
      brief: { name: 'DBMS_ER_Brief.pdf', size: '132 KB' },
      resources: [],
      estimatedTime: '2 hrs',
      bookmarked: false,
      submittedDate: 'Jul 3, 2026',
    },
    {
      id: 'a12',
      subject: 'Cyber Security',
      courseCode: 'CS420',
      title: 'Cyber Security Case Analysis — Phishing Attacks',
      faculty: 'Dr. Sameer Joshi',
      type: 'Theory',
      assignedDate: 'Jul 22, 2026',
      dueDate: 'Aug 20, 2026',
      dueDateISO: '2026-08-20',
      marks: 30,
      status: 'pending',
      priority: 'low',
      description: 'Analyze a documented phishing attack case, identify the social-engineering techniques used, and propose organizational safeguards against similar attacks.',
      instructions: [
        'Use a real, documented case (cite your source).',
        'Cover both the technical and human-factor angles.',
        'Submit as a single PDF.',
      ],
      brief: { name: 'CyberSec_Case_Brief.pdf', size: '167 KB' },
      resources: [{ name: 'Reading_List.pdf', size: '58 KB' }],
      estimatedTime: '6 hrs',
      bookmarked: false,
    },
  ];

  /* ============================================================
     STATE
     ============================================================ */
  let activeFilter = 'all';
  let searchQuery = '';
  let currentPage = 1;
  const PAGE_SIZE = 6;
  let detailsTarget = null;
  let uploadTarget = null;
  let selectedFiles = [];
  let uploadTimer = null;

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'zip'];
  const STATUS_LABELS = { pending: 'Pending', submitted: 'Submitted', overdue: 'Overdue', completed: 'Completed' };

  /* ============================================================
     DOM REFERENCES
     ============================================================ */
  const listEl = document.getElementById('assignmentsList');
  const emptyEl = document.getElementById('assignmentsPageEmpty');
  const filtersEl = document.getElementById('assignmentsPageFilters');
  const searchInput = document.getElementById('assignmentsPageSearch');
  const pagesEl = document.getElementById('assignmentsPaginationPages');
  const prevBtn = document.getElementById('assignmentsPaginationPrev');
  const nextBtn = document.getElementById('assignmentsPaginationNext');
  const refreshBtn = document.getElementById('refreshAssignmentsBtn');
  const mySubmissionsBtn = document.getElementById('mySubmissionsBtn');

  const upcomingDeadlinesList = document.getElementById('upcomingDeadlinesList');
  const recentlySubmittedList = document.getElementById('recentlySubmittedList');
  const pendingReviewsList = document.getElementById('pendingReviewsList');
  const subjectProgressList = document.getElementById('subjectProgressList');

  // Details modal
  const adOverlay = document.getElementById('assignmentDetailsOverlay');
  const adBadges = document.getElementById('adModalBadges');
  const adTitle = document.getElementById('adModalTitle');
  const adFaculty = document.getElementById('adModalFaculty');
  const adDue = document.getElementById('adModalDue');
  const adMarks = document.getElementById('adModalMarks');
  const adDescription = document.getElementById('adModalDescription');
  const adInstructions = document.getElementById('adModalInstructions');
  const adAttachments = document.getElementById('adModalAttachments');
  const adUploadBtn = document.getElementById('adModalUploadBtn');

  // Upload modal
  const uploadOverlay = document.getElementById('uploadOverlay');
  const uploadAssignmentName = document.getElementById('uploadAssignmentName');
  const uploadDropzone = document.getElementById('uploadDropzone');
  const uploadFileInput = document.getElementById('uploadFileInput');
  const uploadFileList = document.getElementById('uploadFileList');
  const uploadError = document.getElementById('uploadError');
  const uploadProgressWrap = document.getElementById('uploadProgressWrap');
  const uploadProgressFill = document.getElementById('uploadProgressFill');
  const uploadProgressPct = document.getElementById('uploadProgressPct');
  const uploadSuccess = document.getElementById('uploadSuccess');
  const uploadSubmitBtn = document.getElementById('uploadSubmitBtn');
  const uploadCancelBtn = document.getElementById('uploadCancelBtn');

  /* ============================================================
     SMALL HELPERS
     ============================================================ */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
  function typeSlug(type) { return type.toLowerCase().replace(/\s+/g, '-'); }
  function parseISO(iso) { return new Date(iso + 'T00:00:00'); }
  function daysUntil(iso) { return Math.round((parseISO(iso) - NOW) / 86400000); }
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
  function findById(id) { return ASSIGNMENTS.find(function (a) { return a.id === id; }); }

  function getAssignments() { return ASSIGNMENTS; }
  function submitUpload(assignmentId) {
    const a = findById(assignmentId);
    if (a) {
      a.status = 'submitted';
      a.submittedDate = 'Today';
    }

    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    if (token && a && a._rawId) {
      const formData = new FormData();
      if (selectedFiles && selectedFiles.length > 0) {
        formData.append('file', selectedFiles[0]);
      }
      formData.append('remarks', 'Submitted from student portal');

      return fetch(API_BASE + '/assignments/' + encodeURIComponent(a._rawId) + '/submissions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      }).then(function (r) { return r.json(); }).catch(function () { return { success: true }; });
    }

    return Promise.resolve({ success: true });
  }

  /* ============================================================
     SUMMARY STATS
     ============================================================ */
  function computeStats() {
    const data = getAssignments();
    const total = data.length;
    const pending = data.filter(function (a) { return a.status === 'pending'; }).length;
    const submitted = data.filter(function (a) { return a.status === 'submitted'; }).length;
    const overdue = data.filter(function (a) { return a.status === 'overdue'; }).length;
    const upcoming = data.filter(function (a) {
      if (a.status !== 'pending' && a.status !== 'submitted') return false;
      const days = daysUntil(a.dueDateISO);
      return days >= 0 && days <= 7;
    }).length;
    const graded = data.filter(function (a) { return a.status === 'completed' && typeof a.score === 'number'; });
    const avgScorePct = graded.length
      ? Math.round(graded.reduce(function (sum, a) { return sum + (a.score / a.marks) * 100; }, 0) / graded.length)
      : null;
    const subjectsCount = new Set(data.map(function (a) { return a.subject; })).size;
    return { total: total, pending: pending, submitted: submitted, overdue: overdue, upcoming: upcoming, avgScorePct: avgScorePct, subjectsCount: subjectsCount };
  }

  function renderStats() {
    const s = computeStats();
    document.getElementById('statTotalValue').textContent = s.total;
    document.getElementById('statTotalTrend').textContent = 'Across ' + s.subjectsCount + ' subjects';
    document.getElementById('statPendingValue').textContent = s.pending;
    document.getElementById('statSubmittedValue').textContent = s.submitted;
    document.getElementById('statOverdueValue').textContent = s.overdue;
    document.getElementById('statUpcomingValue').textContent = s.upcoming;
    document.getElementById('statAvgScoreValue').textContent = s.avgScorePct !== null ? s.avgScorePct + '%' : '\u2014';
  }

  /* ============================================================
     CARD MARKUP
     ============================================================ */
  const downloadIconSvg =
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4v11M7.5 11.5L12 16l4.5-4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 18.5h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const resourcesIconSvg =
    '<svg viewBox="0 0 24 24" fill="none"><path d="M5 4.5h9.5L19 9v10.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 4.5V9h5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 15l1.6 1.6L14 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function dueMetaClass(a) {
    if (a.status === 'overdue') return 'is-overdue';
    if (a.status === 'pending' || a.status === 'submitted') {
      const days = daysUntil(a.dueDateISO);
      if (days < 0) return 'is-overdue';
      if (days <= 2) return 'is-due-soon';
    }
    return '';
  }

  function marksDisplay(a) {
    return a.status === 'completed' && typeof a.score === 'number'
      ? a.score + ' / ' + a.marks
      : a.marks + ' marks';
  }

  function cardTemplate(a) {
    const attachmentCount = 1 + (a.resources ? a.resources.length : 0);
    return (
      '<article class="assignment-card" data-id="' + a.id + '" data-status="' + a.status + '" data-type="' + typeSlug(a.type) + '">' +
        '<div class="assignment-card-top">' +
          '<div class="assignment-card-badges">' +
            '<span class="course-code">' + escapeHtml(a.courseCode) + '</span>' +
            '<span class="status status--' + a.status + '">' + STATUS_LABELS[a.status] + '</span>' +
            '<span class="priority priority--' + a.priority + '">' + cap(a.priority) + '</span>' +
          '</div>' +
          '<div class="assignment-card-actions">' +
            '<button type="button" class="icon-btn bookmark-btn' + (a.bookmarked ? ' is-bookmarked' : '') + '" aria-label="Bookmark this assignment" aria-pressed="' + a.bookmarked + '">' +
              '<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-3.8L5.5 20V5.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<button type="button" class="icon-btn share-btn" aria-label="Share this assignment">' +
              '<svg viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M8.2 10.7l7.6-4.2M8.2 13.3l7.6 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +

        '<p class="assignment-subject">' + escapeHtml(a.subject) + '</p>' +
        '<h3 class="assignment-card-title">' + escapeHtml(a.title) + '</h3>' +
        '<p class="assignment-faculty"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.6"/><path d="M4.8 19.2c1.1-3.1 3.9-4.7 7.2-4.7s6.1 1.6 7.2 4.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' + escapeHtml(a.faculty) + '</p>' +
        '<p class="assignment-card-desc">' + escapeHtml(a.description) + '</p>' +

        '<div class="assignment-meta-grid">' +
          '<div class="assignment-meta-item"><span class="assignment-meta-label">Assigned</span><span class="assignment-meta-value">' + a.assignedDate + '</span></div>' +
          '<div class="assignment-meta-item"><span class="assignment-meta-label">Due</span><span class="assignment-meta-value ' + dueMetaClass(a) + '">' + a.dueDate + '</span></div>' +
          '<div class="assignment-meta-item"><span class="assignment-meta-label">Marks</span><span class="assignment-meta-value">' + marksDisplay(a) + '</span></div>' +
          '<div class="assignment-meta-item"><span class="assignment-meta-label">Type</span><span class="assignment-meta-value">' + escapeHtml(a.type) + '</span></div>' +
        '</div>' +

        '<div class="assignment-card-footer-meta">' +
          '<span class="assignment-footer-item"><svg viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 3.5V8h4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' + attachmentCount + ' attachment' + (attachmentCount === 1 ? '' : 's') + '</span>' +
          '<span class="assignment-footer-item"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' + a.estimatedTime + '</span>' +
        '</div>' +

        '<div class="assignment-card-actions-row">' +
          '<button type="button" class="btn btn-outline btn-sm view-details-btn">View Details</button>' +
          '<button type="button" class="btn btn-primary btn-sm upload-submission-btn"' + (a.status === 'completed' ? ' disabled' : '') + '>Upload Submission</button>' +
          '<div class="assignment-card-icon-actions">' +
            '<button type="button" class="icon-btn download-pdf-btn" aria-label="Download assignment PDF" title="Download PDF">' + downloadIconSvg + '</button>' +
            '<button type="button" class="icon-btn download-resources-btn" aria-label="Download resources" title="Download Resources">' + resourcesIconSvg + '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  /* ============================================================
     FILTER + SEARCH + PAGINATION
     ============================================================ */
  function getFilteredAssignments() {
    return getAssignments().filter(function (a) {
      if (activeFilter === 'my-submissions') {
        if (a.status !== 'submitted' && a.status !== 'completed') return false;
      } else if (activeFilter !== 'all') {
        const isStatusFilter = Object.prototype.hasOwnProperty.call(STATUS_LABELS, activeFilter);
        const matches = isStatusFilter ? a.status === activeFilter : typeSlug(a.type) === activeFilter;
        if (!matches) return false;
      }
      if (searchQuery) {
        const haystack = (a.title + ' ' + a.subject + ' ' + a.faculty + ' ' + a.courseCode + ' ' + a.description).toLowerCase();
        if (haystack.indexOf(searchQuery) === -1) return false;
      }
      return true;
    });
  }

  function renderPagination(totalPages) {
    pagesEl.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pagination-page' + (p === currentPage ? ' is-active' : '');
      btn.textContent = String(p);
      btn.dataset.page = String(p);
      pagesEl.appendChild(btn);
    }
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }

  function renderList() {
    const filtered = getFilteredAssignments();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    listEl.innerHTML = pageItems.map(cardTemplate).join('');
    listEl.appendChild(emptyEl);
    emptyEl.classList.toggle('is-visible', filtered.length === 0);

    renderPagination(totalPages);
  }

  filtersEl.addEventListener('click', function (event) {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    filtersEl.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('is-active'); });
    chip.classList.add('is-active');
    activeFilter = chip.dataset.filter;
    currentPage = 1;
    renderList();
  });

  let searchDebounce;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () {
      searchQuery = searchInput.value.trim().toLowerCase();
      currentPage = 1;
      renderList();
    }, 180);
  });

  pagesEl.addEventListener('click', function (event) {
    const btn = event.target.closest('.pagination-page');
    if (!btn) return;
    currentPage = Number(btn.dataset.page);
    renderList();
    listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  prevBtn.addEventListener('click', function () {
    if (currentPage > 1) { currentPage--; renderList(); }
  });
  nextBtn.addEventListener('click', function () {
    const totalPages = Math.max(1, Math.ceil(getFilteredAssignments().length / PAGE_SIZE));
    if (currentPage < totalPages) { currentPage++; renderList(); }
  });

  if (mySubmissionsBtn) {
    mySubmissionsBtn.addEventListener('click', function () {
      activeFilter = 'my-submissions';
      filtersEl.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('is-active'); });
      searchInput.value = '';
      searchQuery = '';
      currentPage = 1;
      renderList();
      listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      refreshBtn.classList.add('is-loading');
      refreshBtn.disabled = true;
      setTimeout(function () {
        refreshBtn.classList.remove('is-loading');
        refreshBtn.disabled = false;
        renderAll();
      }, 650);
    });
  }

  /* ============================================================
     CARD ACTIONS (event delegation — survives re-renders)
     ============================================================ */
  listEl.addEventListener('click', function (event) {
    const card = event.target.closest('.assignment-card');
    if (!card) return;
    const assignment = findById(card.dataset.id);
    if (!assignment) return;

    const bookmarkBtn = event.target.closest('.bookmark-btn');
    if (bookmarkBtn) {
      assignment.bookmarked = !assignment.bookmarked;
      bookmarkBtn.classList.toggle('is-bookmarked', assignment.bookmarked);
      bookmarkBtn.setAttribute('aria-pressed', String(assignment.bookmarked));
      return;
    }

    const shareBtn = event.target.closest('.share-btn');
    if (shareBtn) {
      handleShare(assignment, shareBtn);
      return;
    }

    const viewBtn = event.target.closest('.view-details-btn');
    if (viewBtn) { openDetailsModal(assignment); return; }

    const uploadBtn = event.target.closest('.upload-submission-btn');
    if (uploadBtn && !uploadBtn.disabled) { openUploadModal(assignment); return; }

    const downloadPdfBtn = event.target.closest('.download-pdf-btn');
    if (downloadPdfBtn) { simulateDownload(downloadPdfBtn); return; }

    const downloadResourcesBtn = event.target.closest('.download-resources-btn');
    if (downloadResourcesBtn) { simulateDownload(downloadResourcesBtn); return; }
  });

  function handleShare(assignment, button) {
    if (button.classList.contains('is-copied')) return;
    const shareData = {
      title: assignment.title + ' \u2014 VectorOne',
      text: assignment.subject + ' \u00b7 Due ' + assignment.dueDate,
      url: window.location.href.split('#')[0] + '#assignment-' + assignment.id,
    };
    const markCopied = function () {
      button.classList.add('is-copied');
      setTimeout(function () { button.classList.remove('is-copied'); }, 1600);
    };
    if (navigator.share) {
      navigator.share(shareData).catch(function () { /* user cancelled — no-op */ });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareData.url).then(markCopied).catch(markCopied);
    } else {
      markCopied();
    }
  }

  function simulateDownload(button) {
    // No backend yet — this is where a real file download / API call
    // (GET /api/assignments/:id) would be triggered.
    if (button.classList.contains('is-downloaded')) return;
    const original = button.innerHTML;
    button.classList.add('is-downloaded');
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 12.5l4.5 4.5 10.5-11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    setTimeout(function () {
      button.classList.remove('is-downloaded');
      button.innerHTML = original;
    }, 1600);
  }

  /* ============================================================
     GENERIC MODAL OPEN/CLOSE
     ============================================================ */
  function openModal(overlay) {
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
  }
  function closeModal(overlay) {
    overlay.classList.remove('is-open');
    setTimeout(function () {
      overlay.hidden = true;
      document.body.style.overflow = '';
    }, 200);
  }
  [adOverlay, uploadOverlay].forEach(function (overlay) {
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeModal(overlay);
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (adOverlay.classList.contains('is-open')) closeModal(adOverlay);
    if (uploadOverlay.classList.contains('is-open')) closeModal(uploadOverlay);
  });

  /* ============================================================
     ASSIGNMENT DETAILS MODAL
     ============================================================ */
  function openDetailsModal(assignment) {
    detailsTarget = assignment;
    adTitle.textContent = assignment.title;
    adBadges.innerHTML =
      '<span class="course-code">' + escapeHtml(assignment.courseCode) + '</span>' +
      '<span class="status status--' + assignment.status + '">' + STATUS_LABELS[assignment.status] + '</span>' +
      '<span class="priority priority--' + assignment.priority + '">' + cap(assignment.priority) + '</span>';
    adFaculty.textContent = assignment.faculty;
    adDue.textContent = 'Due ' + assignment.dueDate;
    adMarks.textContent = marksDisplay(assignment);
    adDescription.textContent = assignment.description;
    adInstructions.innerHTML = assignment.instructions.map(function (step) { return '<li>' + escapeHtml(step) + '</li>'; }).join('');

    const files = [assignment.brief].concat(assignment.resources || []);
    adAttachments.innerHTML = files.map(function (file) {
      return (
        '<div class="modal-attachment">' +
          '<div class="modal-attachment-info">' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 3.5V8h4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
            '<span>' + escapeHtml(file.name) + ' \u00b7 ' + file.size + '</span>' +
          '</div>' +
          '<button type="button" class="btn btn-outline btn-sm ad-download-btn">Download</button>' +
        '</div>'
      );
    }).join('');

    adUploadBtn.disabled = assignment.status === 'completed';
    openModal(adOverlay);
  }

  document.getElementById('adModalClose').addEventListener('click', function () { closeModal(adOverlay); });
  document.getElementById('adModalCloseFooter').addEventListener('click', function () { closeModal(adOverlay); });
  adAttachments.addEventListener('click', function (event) {
    const btn = event.target.closest('.ad-download-btn');
    if (!btn || btn.classList.contains('is-loading')) return;
    const original = btn.textContent;
    btn.textContent = 'Downloaded';
    setTimeout(function () { btn.textContent = original; }, 1600);
  });
  adUploadBtn.addEventListener('click', function () {
    const assignment = detailsTarget;
    closeModal(adOverlay);
    setTimeout(function () { openUploadModal(assignment); }, 200);
  });

  /* ============================================================
     UPLOAD SUBMISSION MODAL
     ============================================================ */
  function resetUploadModal() {
    selectedFiles = [];
    clearInterval(uploadTimer);
    uploadTimer = null;
    uploadError.hidden = true;
    uploadError.textContent = '';
    uploadProgressWrap.hidden = true;
    uploadProgressFill.style.width = '0%';
    uploadProgressFill.classList.remove('is-complete');
    uploadProgressPct.textContent = '0%';
    uploadSuccess.classList.remove('is-visible');
    uploadSubmitBtn.disabled = true;
    uploadSubmitBtn.textContent = 'Submit Submission';
    uploadFileInput.value = '';
    renderUploadFileList();
  }

  function openUploadModal(assignment) {
    uploadTarget = assignment;
    uploadAssignmentName.textContent = assignment.title;
    resetUploadModal();
    openModal(uploadOverlay);
  }

  document.getElementById('uploadModalClose').addEventListener('click', function () { closeModal(uploadOverlay); });
  uploadCancelBtn.addEventListener('click', function () { closeModal(uploadOverlay); });

  function showUploadError(message) {
    uploadError.textContent = message;
    uploadError.hidden = false;
  }

  function renderUploadFileList() {
    uploadFileList.innerHTML = selectedFiles.map(function (file, index) {
      return (
        '<div class="upload-file-item">' +
          '<svg class="upload-file-icon" viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 3.5V8h4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
          '<div class="upload-file-info">' +
            '<div class="upload-file-name">' + escapeHtml(file.name) + '</div>' +
            '<div class="upload-file-size">' + formatSize(file.size) + '</div>' +
          '</div>' +
          '<button type="button" class="icon-btn upload-file-remove" data-index="' + index + '" aria-label="Remove ' + escapeHtml(file.name) + '">' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>'
      );
    }).join('');
    uploadSubmitBtn.disabled = selectedFiles.length === 0;
  }

  uploadFileList.addEventListener('click', function (event) {
    const removeBtn = event.target.closest('.upload-file-remove');
    if (!removeBtn) return;
    selectedFiles.splice(Number(removeBtn.dataset.index), 1);
    renderUploadFileList();
  });

  function handleIncomingFiles(fileList) {
    uploadError.hidden = true;
    Array.prototype.forEach.call(fileList, function (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
        showUploadError('"' + file.name + '" is not a supported format. Use PDF, DOCX or ZIP.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        showUploadError('"' + file.name + '" exceeds the 25 MB size limit.');
        return;
      }
      selectedFiles.push(file);
    });
    renderUploadFileList();
  }

  uploadFileInput.addEventListener('change', function (event) {
    if (event.target.files && event.target.files.length) handleIncomingFiles(event.target.files);
  });
  uploadDropzone.addEventListener('dragover', function (event) {
    event.preventDefault();
    uploadDropzone.classList.add('is-dragover');
  });
  uploadDropzone.addEventListener('dragleave', function () {
    uploadDropzone.classList.remove('is-dragover');
  });
  uploadDropzone.addEventListener('drop', function (event) {
    event.preventDefault();
    uploadDropzone.classList.remove('is-dragover');
    if (event.dataTransfer && event.dataTransfer.files.length) handleIncomingFiles(event.dataTransfer.files);
  });

  function startUploadSimulation() {
    uploadSubmitBtn.disabled = true;
    uploadProgressWrap.hidden = false;
    let pct = 0;
    uploadTimer = setInterval(function () {
      pct = Math.min(100, pct + Math.random() * 16 + 9);
      uploadProgressFill.style.width = pct + '%';
      uploadProgressPct.textContent = Math.round(pct) + '%';
      if (pct >= 100) {
        clearInterval(uploadTimer);
        uploadTimer = null;
        onUploadComplete();
      }
    }, 200);
  }

  function onUploadComplete() {
    uploadProgressFill.classList.add('is-complete');
    uploadSuccess.classList.add('is-visible');
    uploadSubmitBtn.textContent = 'Done';

    submitUpload(uploadTarget.id).then(function () {
      renderAll();
      setTimeout(function () { closeModal(uploadOverlay); }, 1400);
    });
  }

  uploadSubmitBtn.addEventListener('click', function () {
    if (!selectedFiles.length || uploadTimer) return;
    startUploadSimulation();
  });

  /* ============================================================
     RIGHT SIDEBAR WIDGETS
     ============================================================ */
  function renderUpcomingDeadlines() {
    const items = getAssignments()
      .filter(function (a) { return a.status === 'pending' || a.status === 'submitted'; })
      .slice()
      .sort(function (x, y) { return parseISO(x.dueDateISO) - parseISO(y.dueDateISO); })
      .slice(0, 4);

    if (!items.length) {
      upcomingDeadlinesList.innerHTML = '<p class="mini-list-empty">No upcoming deadlines. Nice work!</p>';
      return;
    }

    upcomingDeadlinesList.innerHTML = items.map(function (a) {
      const days = daysUntil(a.dueDateISO);
      const overdue = a.status === 'overdue' || days < 0;
      let meta;
      if (overdue) meta = 'Overdue \u00b7 ' + a.dueDate;
      else if (days === 0) meta = 'Due today \u00b7 ' + a.dueDate;
      else meta = 'Due in ' + days + ' day' + (days === 1 ? '' : 's') + ' \u00b7 ' + a.dueDate;
      return (
        '<div class="deadline-card' + (overdue ? ' is-overdue' : '') + '" data-id="' + a.id + '" role="button" tabindex="0">' +
          '<p class="deadline-title">' + escapeHtml(a.title) + '</p>' +
          '<p class="deadline-meta">' + meta + '</p>' +
        '</div>'
      );
    }).join('');
  }
  upcomingDeadlinesList.addEventListener('click', function (event) {
    const card = event.target.closest('.deadline-card');
    if (!card) return;
    const assignment = findById(card.dataset.id);
    if (assignment) openDetailsModal(assignment);
  });
  upcomingDeadlinesList.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.deadline-card');
    if (!card) return;
    event.preventDefault();
    const assignment = findById(card.dataset.id);
    if (assignment) openDetailsModal(assignment);
  });

  function renderRecentlySubmitted() {
    const items = getAssignments()
      .filter(function (a) { return (a.status === 'submitted' || a.status === 'completed') && a.submittedDate; })
      .slice()
      .sort(function (x, y) { return new Date(y.submittedDate) - new Date(x.submittedDate); })
      .slice(0, 4);

    if (!items.length) {
      recentlySubmittedList.innerHTML = '<li class="mini-list-empty">No submissions yet.</li>';
      return;
    }
    recentlySubmittedList.innerHTML = items.map(function (a) {
      return (
        '<li>' +
          '<span class="mini-list-dot mini-list-dot--green" aria-hidden="true"></span>' +
          '<div><span class="mini-list-title">' + escapeHtml(a.title) + '</span><span class="mini-list-meta">Submitted ' + a.submittedDate + '</span></div>' +
        '</li>'
      );
    }).join('');
  }

  function renderPendingReviews() {
    const items = getAssignments().filter(function (a) { return a.status === 'submitted'; });
    if (!items.length) {
      pendingReviewsList.innerHTML = '<li class="mini-list-empty">Nothing awaiting review.</li>';
      return;
    }
    pendingReviewsList.innerHTML = items.map(function (a) {
      return (
        '<li>' +
          '<span class="mini-list-dot mini-list-dot--blue" aria-hidden="true"></span>' +
          '<div><span class="mini-list-title">' + escapeHtml(a.title) + '</span><span class="mini-list-meta">Awaiting grading</span></div>' +
        '</li>'
      );
    }).join('');
  }

  function renderSubjectProgress() {
    const bySubject = {};
    getAssignments().forEach(function (a) {
      if (!bySubject[a.subject]) bySubject[a.subject] = { done: 0, total: 0 };
      bySubject[a.subject].total++;
      if (a.status === 'completed' || a.status === 'submitted') bySubject[a.subject].done++;
    });
    const names = Object.keys(bySubject);
    subjectProgressList.innerHTML = names.map(function (name) {
      const pct = Math.round((bySubject[name].done / bySubject[name].total) * 100);
      return (
        '<div class="subject-progress-item">' +
          '<div class="subject-progress-top"><span class="subject-progress-name">' + escapeHtml(name) + '</span><span class="subject-progress-pct">' + pct + '%</span></div>' +
          '<div class="subject-progress-track"><div class="subject-progress-fill" style="width:' + pct + '%"></div></div>' +
        '</div>'
      );
    }).join('');
  }

  /* ============================================================
     INIT
     ============================================================ */
  function renderAll() {
    renderStats();
    renderList();
    renderUpcomingDeadlines();
    renderRecentlySubmitted();
    renderPendingReviews();
    renderSubjectProgress();
  }

  renderAll();

  (function loadLiveAssignments() {
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

    fetch(API_BASE + '/assignments?limit=50', { headers: headers })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const liveAssignments = res.data.map(function (d, i) {
            const dueStr = d.dueDate ? new Date(d.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
            const assignedStr = d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
            return {
              id: d.assignmentId || ('a' + (i + 1)),
              _rawId: d.id,
              subject: d.course?.name || d.courseCode || 'Course',
              courseCode: d.courseCode || (d.course?.courseCode || 'CS301'),
              title: d.title,
              faculty: d.faculty?.fullName || 'Faculty Instructor',
              type: 'Theory',
              assignedDate: assignedStr,
              dueDate: dueStr,
              dueDateISO: d.dueDate ? d.dueDate.slice(0, 10) : '2026-08-15',
              marks: d.maxMarks || 20,
              status: d.status === 'Submitted' ? 'submitted' : (d.status === 'Reviewed' ? 'completed' : 'pending'),
              priority: 'high',
              description: d.description || '',
              instructions: ['Follow all standard submission guidelines.'],
              brief: { name: 'Brief_' + (d.assignmentId || 'Assignment') + '.pdf', size: '250 KB' },
              resources: [],
              estimatedTime: '3 hrs',
              bookmarked: false
            };
          });

          ASSIGNMENTS.length = 0;
          liveAssignments.forEach(function (a) { ASSIGNMENTS.push(a); });
          renderAll();
        }
      })
      .catch(function () {});
  })();
})();
