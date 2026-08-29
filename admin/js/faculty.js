(function () {
  'use strict';
  /* Page icon pulled from the shared ICONS map in admin-dashboard.js
     (loaded before this file). Falls back to an empty string rather
     than a Unicode glyph so nothing renders at the wrong size. */
  const statGlyph = (window.VectorOneAdmin && window.VectorOneAdmin.icons && window.VectorOneAdmin.icons.faculty) || '';


  const faculty = [
    { id: 'FAC-201', name: 'Dr. Neha Sharma', department: 'Computer Science', designation: 'Professor', email: 'neha.sharma@vectorone.edu', phone: '+91 98765 20321', courses: 'AI, Data Structures', status: 'Active' },
    { id: 'FAC-202', name: 'Prof. Rohan Verma', department: 'Electronics', designation: 'Associate Professor', email: 'rohan.verma@vectorone.edu', phone: '+91 98765 20112', courses: 'Signals, Embedded Systems', status: 'Active' },
    { id: 'FAC-203', name: 'Dr. Meera Nair', department: 'Mechanical', designation: 'HOD', email: 'meera.nair@vectorone.edu', phone: '+91 98765 23145', courses: 'Thermodynamics', status: 'On Leave' },
    { id: 'FAC-204', name: 'Mr. Kavish Joshi', department: 'Business Administration', designation: 'Assistant Professor', email: 'kavish.joshi@vectorone.edu', phone: '+91 98765 31458', courses: 'Finance, Marketing', status: 'Active' },
    { id: 'FAC-205', name: 'Dr. Aisha Khan', department: 'Civil Engineering', designation: 'Professor', email: 'aisha.khan@vectorone.edu', phone: '+91 98765 28090', courses: 'Bridge Design', status: 'Active' },
    { id: 'FAC-206', name: 'Prof. Vikas Malhotra', department: 'Information Technology', designation: 'Senior Lecturer', email: 'vikas.malhotra@vectorone.edu', phone: '+91 98765 34019', courses: 'DBMS, Web Dev', status: 'Suspended' },
    { id: 'FAC-207', name: 'Dr. Priya Sethi', department: 'Applied Sciences', designation: 'Associate Professor', email: 'priya.sethi@vectorone.edu', phone: '+91 98765 27891', courses: 'Chemistry, Physics', status: 'Active' },
    { id: 'FAC-208', name: 'Ms. Sanya Iyer', department: 'Design', designation: 'Lecturer', email: 'sanya.iyer@vectorone.edu', phone: '+91 98765 20984', courses: 'Design Thinking', status: 'Active' }
  ];

  const deptFilter = document.getElementById('deptFilter');
  const designationFilter = document.getElementById('designationFilter');
  const statusFilter = document.getElementById('statusFilter');
  const facultyTableBody = document.getElementById('facultyTableBody');
  const facultySearch = document.getElementById('facultySearch');
  const facultyEmpty = document.getElementById('facultyEmpty');
  const facultyStats = document.getElementById('facultyStats');
  const facultyModal = document.getElementById('facultyModal');
  const facultyModalTitle = document.getElementById('facultyModalTitle');
  const facultyModalBody = document.getElementById('facultyModalBody');
  const facultyModalActions = document.getElementById('facultyModalActions');
  const facultyModalClose = document.getElementById('facultyModalClose');

  const defaultStats = [
    { label: 'Total Faculty', value: 312, trend: '+12 this month', tone: 'blue' },
    { label: 'Departments', value: 18, trend: 'All active', tone: 'green' },
    { label: 'Full-Time', value: 248, trend: '79.5%', tone: 'purple' },
    { label: 'On Leave', value: 14, trend: '4.5%', tone: 'orange' }
  ];

  function renderStats() {
    facultyStats.innerHTML = defaultStats.map(function (item) {
      return '<article class="stat-card stat-card--' + item.tone + '"><div class="stat-card-top"><div class="stat-icon stat-icon--' + item.tone + '">' + statGlyph + '</div></div><p class="stat-value">' + item.value + '</p><p class="stat-label">' + item.label + '</p><span class="stat-trend stat-trend--up">↗ ' + item.trend + '</span></article>';
    }).join('');
  }

  function initials(name) {
    return name.split(' ').map(function (part) { return part[0]; }).join('').slice(0, 2).toUpperCase();
  }

  function populateFilters() {
    const departments = [...new Set(faculty.map(function (item) { return item.department; }))].sort();
    const designations = [...new Set(faculty.map(function (item) { return item.designation; }))].sort();
    deptFilter.innerHTML = '<option value="">Department</option>' + departments.map(function (dept) { return '<option value="' + dept + '">' + dept + '</option>'; }).join('');
    designationFilter.innerHTML = '<option value="">Designation</option>' + designations.map(function (designation) { return '<option value="' + designation + '">' + designation + '</option>'; }).join('');
  }

  function getFilteredRows() {
    const query = (facultySearch.value || '').trim().toLowerCase();
    const selectedDept = deptFilter.value;
    const selectedDesignation = designationFilter.value;
    const selectedStatus = statusFilter.value;

    return faculty.filter(function (member) {
      const matchesQuery = !query || [member.name, member.department, member.email, member.designation, member.courses].join(' ').toLowerCase().includes(query);
      const matchesDept = !selectedDept || member.department === selectedDept;
      const matchesDesignation = !selectedDesignation || member.designation === selectedDesignation;
      const matchesStatus = !selectedStatus || member.status === selectedStatus;
      return matchesQuery && matchesDept && matchesDesignation && matchesStatus;
    }).sort(function (a, b) {
      const sort = document.getElementById('sortFaculty').value;
      if (sort === 'department') return a.department.localeCompare(b.department) || a.name.localeCompare(b.name);
      if (sort === 'designation') return a.designation.localeCompare(b.designation) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }

  function renderFacultyTable() {
    const rows = getFilteredRows();
    facultyTableBody.innerHTML = rows.map(function (member) {
      return '<tr>' +
        '<td>' + member.id + '</td>' +
        '<td><span class="faculty-photo">' + initials(member.name) + '</span></td>' +
        '<td>' + member.name + '</td>' +
        '<td>' + member.department + '</td>' +
        '<td>' + member.designation + '</td>' +
        '<td>' + member.email + '</td>' +
        '<td>' + member.phone + '</td>' +
        '<td>' + member.courses + '</td>' +
        '<td><span class="status-badge ' + member.status.toLowerCase().replace(/\s+/g, '-') + '">' + member.status + '</span></td>' +
        '<td><div class="table-actions"><button type="button" class="row-action" data-action="view" data-id="' + member.id + '">View</button><button type="button" class="row-action" data-action="edit" data-id="' + member.id + '">Edit</button><button type="button" class="row-action" data-action="delete" data-id="' + member.id + '">Delete</button></div></td>' +
        '</tr>';
    }).join('');

    facultyEmpty.hidden = rows.length > 0;
  }

  function openModal() {
    facultyModal.hidden = false;
    requestAnimationFrame(function () { facultyModal.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    facultyModal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { facultyModal.hidden = true; }, 180);
  }

  function renderModalButtons(primaryText, primaryAction) {
    facultyModalActions.innerHTML = '<button type="button" class="btn btn-outline" id="cancelFacultyModal">Cancel</button><button type="button" class="btn btn-primary" id="confirmFacultyModal">' + primaryText + '</button>';
    document.getElementById('cancelFacultyModal').addEventListener('click', closeModal);
    document.getElementById('confirmFacultyModal').addEventListener('click', primaryAction);
  }

  function getFacultyById(id) {
    return faculty.find(function (member) { return member.id === id; });
  }

  function buildFacultyForm(member) {
    const source = member || { id: 'FAC-' + (faculty.length + 101), name: '', department: 'Computer Science', designation: 'Assistant Professor', email: '', phone: '', courses: '', status: 'Active' };
    return '<form class="faculty-form" id="facultyForm">' +
      '<label>Faculty ID<input name="id" value="' + source.id + '" required /></label>' +
      '<label>Name<input name="name" value="' + (source.name || '') + '" required /></label>' +
      '<label>Department<select name="department">' + [...new Set(faculty.map(function (item) { return item.department; }))].map(function (dept) { return '<option value="' + dept + '" ' + (dept === source.department ? 'selected' : '') + '>' + dept + '</option>'; }).join('') + '</select></label>' +
      '<label>Designation<select name="designation"><option value="Professor" ' + (source.designation === 'Professor' ? 'selected' : '') + '>Professor</option><option value="Associate Professor" ' + (source.designation === 'Associate Professor' ? 'selected' : '') + '>Associate Professor</option><option value="Assistant Professor" ' + (source.designation === 'Assistant Professor' ? 'selected' : '') + '>Assistant Professor</option><option value="HOD" ' + (source.designation === 'HOD' ? 'selected' : '') + '>HOD</option><option value="Senior Lecturer" ' + (source.designation === 'Senior Lecturer' ? 'selected' : '') + '>Senior Lecturer</option><option value="Lecturer" ' + (source.designation === 'Lecturer' ? 'selected' : '') + '>Lecturer</option></select></label>' +
      '<label class="full-width">Email<input name="email" type="email" value="' + (source.email || '') + '" required /></label>' +
      '<label>Phone<input name="phone" value="' + (source.phone || '') + '" required /></label>' +
      '<label>Status<select name="status"><option value="Active" ' + (source.status === 'Active' ? 'selected' : '') + '>Active</option><option value="On Leave" ' + (source.status === 'On Leave' ? 'selected' : '') + '>On Leave</option><option value="Suspended" ' + (source.status === 'Suspended' ? 'selected' : '') + '>Suspended</option></select></label>' +
      '<label class="full-width">Courses<input name="courses" value="' + (source.courses || '') + '" /></label>' +
      '</form>';
  }

  const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
  function getAuthHeader() {
    const token = localStorage.getItem('vectorone_token');
    return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  function fetchFacultyFromApi() {
    fetch(API_BASE + '/admin/faculty?limit=100', { headers: getAuthHeader() })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          faculty.length = 0;
          res.data.forEach(function (f) { faculty.push(f); });
          populateFilters();
          renderFacultyTable();
        }
      })
      .catch(function (err) {
        console.warn('VectorOne: using local faculty data');
      });
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const id = button.dataset.id;
    const member = getFacultyById(id);
    const action = button.dataset.action;

    if (action === 'view') {
      facultyModalTitle.textContent = 'View Faculty';
      facultyModalBody.innerHTML = '<div class="faculty-detail"><p><strong>ID:</strong> ' + member.id + '</p><p><strong>Name:</strong> ' + member.name + '</p><p><strong>Department:</strong> ' + member.department + '</p><p><strong>Designation:</strong> ' + member.designation + '</p><p><strong>Email:</strong> ' + member.email + '</p><p><strong>Phone:</strong> ' + member.phone + '</p><p><strong>Courses:</strong> ' + member.courses + '</p><p><strong>Status:</strong> ' + member.status + '</p></div>';
      facultyModalActions.innerHTML = '<button type="button" class="btn btn-primary" id="closeFacultyView">Close</button>';
      document.getElementById('closeFacultyView').addEventListener('click', closeModal);
      openModal();
      return;
    }

    if (action === 'edit') {
      facultyModalTitle.textContent = 'Edit Faculty';
      facultyModalBody.innerHTML = buildFacultyForm(member);
      renderModalButtons('Save Changes', function () {
        const form = document.getElementById('facultyForm');
        const data = new FormData(form);
        const updatedFields = {
          id: String(data.get('id')),
          name: String(data.get('name')),
          department: String(data.get('department')),
          designation: String(data.get('designation')),
          email: String(data.get('email')),
          phone: String(data.get('phone')),
          status: String(data.get('status')),
          courses: String(data.get('courses'))
        };

        Object.assign(member, updatedFields);
        renderFacultyTable();
        closeModal();

        fetch(API_BASE + '/admin/faculty/' + member.id, {
          method: 'PUT',
          headers: getAuthHeader(),
          body: JSON.stringify(updatedFields)
        }).catch(function (e) { console.warn(e); });
      });
      openModal();
      return;
    }

    if (action === 'delete') {
      facultyModalTitle.textContent = 'Delete Faculty';
      facultyModalBody.innerHTML = '<p>Delete <strong>' + member.name + '</strong>? This action removes them from the current roster.</p>';
      renderModalButtons('Delete Faculty', function () {
        const idx = faculty.findIndex(function (item) { return item.id === member.id; });
        if (idx >= 0) faculty.splice(idx, 1);
        renderFacultyTable();
        closeModal();

        fetch(API_BASE + '/admin/faculty/' + member.id, {
          method: 'DELETE',
          headers: getAuthHeader()
        }).catch(function (e) { console.warn(e); });
      });
      openModal();
    }
  });

  document.getElementById('addFacultyBtn').addEventListener('click', function () {
    facultyModalTitle.textContent = 'Add Faculty';
    facultyModalBody.innerHTML = buildFacultyForm();
    renderModalButtons('Add Faculty', function () {
      const form = document.getElementById('facultyForm');
      const data = new FormData(form);
      const newMember = {
        id: String(data.get('id')),
        name: String(data.get('name')),
        department: String(data.get('department')),
        designation: String(data.get('designation')),
        email: String(data.get('email')),
        phone: String(data.get('phone')),
        courses: String(data.get('courses')),
        status: String(data.get('status'))
      };
      faculty.unshift(newMember);
      renderFacultyTable();
      closeModal();

      fetch(API_BASE + '/admin/faculty', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(newMember)
      }).catch(function (e) { console.warn(e); });
    });
    openModal();
  });

  facultyModalClose.addEventListener('click', closeModal);
  facultyModal.addEventListener('click', function (event) {
    if (event.target === facultyModal) closeModal();
  });

  facultySearch.addEventListener('input', renderFacultyTable);
  deptFilter.addEventListener('change', renderFacultyTable);
  designationFilter.addEventListener('change', renderFacultyTable);
  statusFilter.addEventListener('change', renderFacultyTable);
  document.getElementById('sortFaculty').addEventListener('change', renderFacultyTable);

  document.getElementById('exportFacultyBtn').addEventListener('click', function () {
    const rows = getFilteredRows();
    const csv = ['Faculty ID,Name,Department,Designation,Email,Phone,Courses,Status'];
    rows.forEach(function (row) {
      csv.push([row.id, row.name, row.department, row.designation, row.email, row.phone, row.courses, row.status].join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'faculty-report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  document.getElementById('refreshFacultyBtn').addEventListener('click', function () {
    fetchFacultyFromApi();
    renderFacultyTable();
  });

  renderStats();
  populateFilters();
  renderFacultyTable();
  fetchFacultyFromApi();
})();
