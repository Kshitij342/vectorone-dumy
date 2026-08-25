(function () {
  'use strict';
  /* Page icon pulled from the shared ICONS map in admin-dashboard.js
     (loaded before this file). Falls back to an empty string rather
     than a Unicode glyph so nothing renders at the wrong size. */
  const statGlyph = (window.VectorOneAdmin && window.VectorOneAdmin.icons && window.VectorOneAdmin.icons.students) || '';


  const students = [
    {id:'VO2024001', name:'Aarav Mehta', dept:'Computer Science', year:'2', division:'A', semester:'3', email:'aarav.mehta@vectorone.edu', phone:'+91 98765 10234', attendance:94, status:'Active'},
    {id:'VO2024002', name:'Diya Sharma', dept:'Information Technology', year:'3', division:'B', semester:'5', email:'diya.sharma@vectorone.edu', phone:'+91 98765 21879', attendance:91, status:'Active'},
    {id:'VO2024003', name:'Rohan Iyer', dept:'Mechanical Engineering', year:'4', division:'A', semester:'7', email:'rohan.iyer@vectorone.edu', phone:'+91 98765 33210', attendance:87, status:'Active'},
    {id:'VO2024004', name:'Ananya Gupta', dept:'Computer Science', year:'1', division:'C', semester:'1', email:'ananya.gupta@vectorone.edu', phone:'+91 98765 44661', attendance:96, status:'Active'},
    {id:'VO2024005', name:'Kabir Khan', dept:'Electronics', year:'2', division:'B', semester:'3', email:'kabir.khan@vectorone.edu', phone:'+91 98765 55902', attendance:74, status:'Suspended'},
    {id:'VO2024006', name:'Meera Nair', dept:'Business Administration', year:'4', division:'A', semester:'7', email:'meera.nair@vectorone.edu', phone:'+91 98765 66913', attendance:89, status:'Graduated'},
    {id:'VO2024007', name:'Vivaan Patel', dept:'Information Technology', year:'1', division:'A', semester:'1', email:'vivaan.patel@vectorone.edu', phone:'+91 98765 77324', attendance:92, status:'Active'},
    {id:'VO2024008', name:'Ishita Roy', dept:'Computer Science', year:'3', division:'C', semester:'5', email:'ishita.roy@vectorone.edu', phone:'+91 98765 88535', attendance:98, status:'Active'}
  ];

  const stats = [
    { label: 'Total Students', value: '4,826', trend: '+8.4% this term', tone: 'blue' },
    { label: 'Active Students', value: '4,341', trend: '89.9% enrolled', tone: 'green' },
    { label: 'Graduated', value: '1,284', trend: '+214 this year', tone: 'purple' },
    { label: 'New Admissions', value: '218', trend: '+32 this week', tone: 'orange' }
  ];

  const studentStats = document.getElementById('studentStats');
  const studentsBody = document.getElementById('studentsBody');
  const studentCount = document.getElementById('studentCount');
  const studentsEmpty = document.getElementById('studentsEmpty');
  const modal = document.getElementById('studentModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  const modalActions = document.getElementById('modalActions');
  const modalClose = document.getElementById('modalClose');

  function renderStats() {
    studentStats.innerHTML = stats.map(function (item) {
      return '<article class="stat-card stat-card--' + item.tone + '"><div class="stat-card-top"><div class="stat-icon stat-icon--' + item.tone + '">' + statGlyph + '</div></div><p class="stat-value">' + item.value + '</p><p class="stat-label">' + item.label + '</p><span class="stat-trend stat-trend--up">↗ ' + item.trend + '</span></article>';
    }).join('');
  }

  function initials(name) {
    return name.split(' ').map(function (part) { return part[0]; }).join('').slice(0, 2).toUpperCase();
  }

  function populateDepartments() {
    const deptSelect = document.getElementById('departmentFilter');
    const departments = [...new Set(students.map(function (s) { return s.dept; }))].sort();
    deptSelect.innerHTML = '<option value="">Department</option>' + departments.map(function (dept) { return '<option value="' + dept + '">' + dept + '</option>'; }).join('');
  }

  function getFilteredStudents() {
    const query = (document.getElementById('studentSearch').value || '').trim().toLowerCase();
    const department = document.getElementById('departmentFilter').value;
    const year = document.getElementById('yearFilter').value;
    const division = document.getElementById('divisionFilter').value;
    const semester = document.getElementById('semesterFilter').value;
    const status = document.getElementById('statusFilter').value;
    const sort = document.getElementById('sortStudents').value;

    return students.filter(function (student) {
      const matchesQuery = !query || [student.id, student.name, student.dept, student.email, student.phone].join(' ').toLowerCase().includes(query);
      const matchesDepartment = !department || student.dept === department;
      const matchesYear = !year || student.year === year;
      const matchesDivision = !division || student.division === division;
      const matchesSemester = !semester || student.semester === semester;
      const matchesStatus = !status || student.status === status;
      return matchesQuery && matchesDepartment && matchesYear && matchesDivision && matchesSemester && matchesStatus;
    }).sort(function (a, b) {
      if (sort === 'id') return a.id.localeCompare(b.id);
      if (sort === 'attendance') return b.attendance - a.attendance;
      return a.name.localeCompare(b.name);
    });
  }

  function renderStudents() {
    const rows = getFilteredStudents();
    studentsBody.innerHTML = rows.map(function (student) {
      return '<tr>' +
        '<td>' + student.id + '</td>' +
        '<td><span class="student-photo">' + initials(student.name) + '</span></td>' +
        '<td class="student-name">' + student.name + '</td>' +
        '<td>' + student.dept + '</td>' +
        '<td>' + student.year + '</td>' +
        '<td>' + student.division + '</td>' +
        '<td>' + student.semester + '</td>' +
        '<td>' + student.email + '</td>' +
        '<td>' + student.phone + '</td>' +
        '<td><span class="attendance">' + student.attendance + '%</span></td>' +
        '<td><span class="status-pill-student ' + student.status.toLowerCase() + '">' + student.status + '</span></td>' +
        '<td><div class="student-actions"><button class="row-action" data-op="view" data-id="' + student.id + '">View</button><button class="row-action" data-op="edit" data-id="' + student.id + '">Edit</button></div></td>' +
        '</tr>';
    }).join('');
    studentCount.textContent = rows.length + ' of ' + students.length + ' students';
    studentsEmpty.hidden = rows.length > 0;
  }

  function openModal() {
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { modal.hidden = true; }, 180);
  }

  function detailTemplate(student) {
    return '<div class="student-detail-grid">' +
      '<div><span>Student ID</span><strong>' + student.id + '</strong></div>' +
      '<div><span>Name</span><strong>' + student.name + '</strong></div>' +
      '<div><span>Department</span><strong>' + student.dept + '</strong></div>' +
      '<div><span>Year / Division</span><strong>' + student.year + ' · ' + student.division + '</strong></div>' +
      '<div><span>Semester</span><strong>' + student.semester + '</strong></div>' +
      '<div><span>Attendance</span><strong>' + student.attendance + '%</strong></div>' +
      '<div><span>Email</span><strong>' + student.email + '</strong></div>' +
      '<div><span>Phone</span><strong>' + student.phone + '</strong></div>' +
    '</div>';
  }

  function formTemplate(student) {
    const source = student || { id: 'VO2024', name: '', dept: 'Computer Science', year: '1', division: 'A', semester: '1', email: '', phone: '', attendance: 0, status: 'Active' };
    return '<form class="student-form" id="studentForm">' +
      '<label>Student ID<input name="id" value="' + source.id + '" required /></label>' +
      '<label>Name<input name="name" value="' + (source.name || '') + '" required /></label>' +
      '<label>Department<select name="dept"><option value="Computer Science" ' + (source.dept === 'Computer Science' ? 'selected' : '') + '>Computer Science</option><option value="Information Technology" ' + (source.dept === 'Information Technology' ? 'selected' : '') + '>Information Technology</option><option value="Mechanical Engineering" ' + (source.dept === 'Mechanical Engineering' ? 'selected' : '') + '>Mechanical Engineering</option><option value="Electronics" ' + (source.dept === 'Electronics' ? 'selected' : '') + '>Electronics</option><option value="Business Administration" ' + (source.dept === 'Business Administration' ? 'selected' : '') + '>Business Administration</option></select></label>' +
      '<label>Year<select name="year"><option value="1" ' + (source.year === '1' ? 'selected' : '') + '>1</option><option value="2" ' + (source.year === '2' ? 'selected' : '') + '>2</option><option value="3" ' + (source.year === '3' ? 'selected' : '') + '>3</option><option value="4" ' + (source.year === '4' ? 'selected' : '') + '>4</option></select></label>' +
      '<label>Division<select name="division"><option value="A" ' + (source.division === 'A' ? 'selected' : '') + '>A</option><option value="B" ' + (source.division === 'B' ? 'selected' : '') + '>B</option><option value="C" ' + (source.division === 'C' ? 'selected' : '') + '>C</option></select></label>' +
      '<label>Semester<select name="semester"><option value="1" ' + (source.semester === '1' ? 'selected' : '') + '>1</option><option value="3" ' + (source.semester === '3' ? 'selected' : '') + '>3</option><option value="5" ' + (source.semester === '5' ? 'selected' : '') + '>5</option><option value="7" ' + (source.semester === '7' ? 'selected' : '') + '>7</option></select></label>' +
      '<label>Email<input name="email" type="email" value="' + (source.email || '') + '" required /></label>' +
      '<label>Phone<input name="phone" value="' + (source.phone || '') + '" required /></label>' +
      '<label class="full-width">Status<select name="status"><option value="Active" ' + (source.status === 'Active' ? 'selected' : '') + '>Active</option><option value="Suspended" ' + (source.status === 'Suspended' ? 'selected' : '') + '>Suspended</option><option value="Graduated" ' + (source.status === 'Graduated' ? 'selected' : '') + '>Graduated</option></select></label>' +
      '</form>';
  }

  function renderModalActions(label, handler) {
    modalActions.innerHTML = '<button type="button" class="btn btn-outline" id="cancelStudentAction">Cancel</button><button type="button" class="btn btn-primary" id="confirmStudentAction">' + label + '</button>';
    document.getElementById('cancelStudentAction').addEventListener('click', closeModal);
    document.getElementById('confirmStudentAction').addEventListener('click', handler);
  }

  document.addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-op]');
    if (!trigger) return;

    const student = students.find(function (item) { return item.id === trigger.dataset.id; });

    if (trigger.dataset.op === 'view') {
      modalTitle.textContent = 'View Student';
      modalContent.innerHTML = detailTemplate(student);
      modalActions.innerHTML = '<button class="btn btn-primary" type="button" id="closeStudentView">Close</button>';
      document.getElementById('closeStudentView').addEventListener('click', closeModal);
      openModal();
      return;
    }

    if (trigger.dataset.op === 'edit') {
      modalTitle.textContent = 'Edit Student';
      modalContent.innerHTML = formTemplate(student);
      renderModalActions('Save Changes', function () {
        const form = document.getElementById('studentForm');
        const data = new FormData(form);
        student.id = String(data.get('id'));
        student.name = String(data.get('name'));
        student.dept = String(data.get('dept'));
        student.year = String(data.get('year'));
        student.division = String(data.get('division'));
        student.semester = String(data.get('semester'));
        student.email = String(data.get('email'));
        student.phone = String(data.get('phone'));
        student.status = String(data.get('status'));
        renderStudents();
        closeModal();
      });
      openModal();
    }
  });

  document.getElementById('addStudentBtn').addEventListener('click', function () {
    modalTitle.textContent = 'Add Student';
    modalContent.innerHTML = formTemplate();
    renderModalActions('Add Student', function () {
      const form = document.getElementById('studentForm');
      const data = new FormData(form);
      students.unshift({
        id: String(data.get('id')),
        name: String(data.get('name')),
        dept: String(data.get('dept')),
        year: String(data.get('year')),
        division: String(data.get('division')),
        semester: String(data.get('semester')),
        email: String(data.get('email')),
        phone: String(data.get('phone')),
        attendance: 100,
        status: 'Active'
      });
      renderStudents();
      closeModal();
    });
    openModal();
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeModal();
  });

  document.getElementById('studentSearch').addEventListener('input', renderStudents);
  document.getElementById('departmentFilter').addEventListener('change', renderStudents);
  document.getElementById('yearFilter').addEventListener('change', renderStudents);
  document.getElementById('divisionFilter').addEventListener('change', renderStudents);
  document.getElementById('semesterFilter').addEventListener('change', renderStudents);
  document.getElementById('statusFilter').addEventListener('change', renderStudents);
  document.getElementById('sortStudents').addEventListener('change', renderStudents);
  document.getElementById('refreshBtn').addEventListener('click', renderStudents);
  document.getElementById('exportBtn').addEventListener('click', function () {
    const rows = getFilteredStudents();
    const csv = ['ID,Name,Department,Year,Division,Semester,Email,Phone,Attendance,Status'];
    rows.forEach(function (student) {
      csv.push([student.id, student.name, student.dept, student.year, student.division, student.semester, student.email, student.phone, student.attendance, student.status].join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  });

  renderStats();
  populateDepartments();
  renderStudents();
})();
