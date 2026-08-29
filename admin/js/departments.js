(function () {
  'use strict';
  /* Page icon pulled from the shared ICONS map in admin-dashboard.js
     (loaded before this file). Falls back to an empty string rather
     than a Unicode glyph so nothing renders at the wrong size. */
  const statGlyph = (window.VectorOneAdmin && window.VectorOneAdmin.icons && window.VectorOneAdmin.icons.departments) || '';


  const departments = [
    { id: 'DEP-101', name: 'Computer Science', hod: 'Dr. Neha Sharma', faculty: 26, students: 1275, courses: 12, status: 'Active' },
    { id: 'DEP-102', name: 'Electronics', hod: 'Prof. Rohan Verma', faculty: 18, students: 860, courses: 9, status: 'Active' },
    { id: 'DEP-103', name: 'Mechanical', hod: 'Dr. Meera Nair', faculty: 21, students: 904, courses: 10, status: 'Under Review' },
    { id: 'DEP-104', name: 'Business Administration', hod: 'Mr. Kavish Joshi', faculty: 14, students: 640, courses: 8, status: 'Active' },
    { id: 'DEP-105', name: 'Civil Engineering', hod: 'Dr. Aisha Khan', faculty: 17, students: 740, courses: 7, status: 'Inactive' }
  ];

  const stats = [
    { label: 'Total Departments', value: 18, trend: 'All active', tone: 'blue' },
    { label: 'Total Students', value: 4826, trend: '+8.4%', tone: 'green' },
    { label: 'Total Faculty', value: 312, trend: '+12 this month', tone: 'purple' },
    { label: 'Courses', value: 86, trend: '+4 new', tone: 'orange' }
  ];

  const departmentStats = document.getElementById('departmentStats');
  const departmentGrid = document.getElementById('departmentGrid');
  const departmentSearch = document.getElementById('departmentSearch');
  const statusDeptFilter = document.getElementById('statusDeptFilter');
  const departmentModal = document.getElementById('departmentModal');
  const departmentModalTitle = document.getElementById('departmentModalTitle');
  const departmentModalBody = document.getElementById('departmentModalBody');
  const departmentModalActions = document.getElementById('departmentModalActions');
  const departmentModalClose = document.getElementById('departmentModalClose');

  function renderStats() {
    departmentStats.innerHTML = stats.map(function (item) {
      return '<article class="stat-card stat-card--' + item.tone + '"><div class="stat-card-top"><div class="stat-icon stat-icon--' + item.tone + '">' + statGlyph + '</div></div><p class="stat-value">' + item.value + '</p><p class="stat-label">' + item.label + '</p><span class="stat-trend stat-trend--up">↗ ' + item.trend + '</span></article>';
    }).join('');
  }

  function getFilteredDepartments() {
    const query = (departmentSearch.value || '').trim().toLowerCase();
    const selectedStatus = statusDeptFilter.value;
    return departments.filter(function (dept) {
      const matchesQuery = !query || [dept.name, dept.hod, dept.id].join(' ').toLowerCase().includes(query);
      const matchesStatus = !selectedStatus || dept.status === selectedStatus;
      return matchesQuery && matchesStatus;
    });
  }

  function renderDepartments() {
    const rows = getFilteredDepartments();
    departmentGrid.innerHTML = rows.map(function (dept) {
      return '<article class="department-card">' +
        '<div class="department-card-header"><h3>' + dept.name + '</h3><span class="status-badge ' + dept.status.toLowerCase().replace(/\s+/g, '-') + '">' + dept.status + '</span></div>' +
        '<div class="department-meta">' +
          '<div class="department-meta-row"><span>Department ID</span><strong>' + dept.id + '</strong></div>' +
          '<div class="department-meta-row"><span>HOD</span><strong>' + dept.hod + '</strong></div>' +
          '<div class="department-meta-row"><span>Faculty</span><strong>' + dept.faculty + '</strong></div>' +
          '<div class="department-meta-row"><span>Students</span><strong>' + dept.students + '</strong></div>' +
          '<div class="department-meta-row"><span>Courses</span><strong>' + dept.courses + '</strong></div>' +
        '</div>' +
        '<div class="department-actions"><button type="button" data-action="view" data-id="' + dept.id + '">View</button><button type="button" data-action="edit" data-id="' + dept.id + '">Edit</button><button type="button" data-action="delete" data-id="' + dept.id + '">Delete</button></div>' +
      '</article>';
    }).join('');
  }

  function openModal() {
    departmentModal.hidden = false;
    requestAnimationFrame(function () { departmentModal.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    departmentModal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { departmentModal.hidden = true; }, 180);
  }

  function deptForm(dept) {
    const source = dept || { id: 'DEP-' + (departments.length + 100), name: '', hod: '', faculty: 0, students: 0, courses: 0, status: 'Active' };
    return '<form class="department-form" id="departmentForm"><label>Department ID<input name="id" value="' + source.id + '" required /></label><label>Name<input name="name" value="' + (source.name || '') + '" required /></label><label>HOD<input name="hod" value="' + (source.hod || '') + '" required /></label><label>Faculty count<input type="number" name="faculty" value="' + (source.faculty || 0) + '" required /></label><label>Student count<input type="number" name="students" value="' + (source.students || 0) + '" required /></label><label>Course count<input type="number" name="courses" value="' + (source.courses || 0) + '" required /></label><label>Status<select name="status"><option value="Active" ' + (source.status === 'Active' ? 'selected' : '') + '>Active</option><option value="Under Review" ' + (source.status === 'Under Review' ? 'selected' : '') + '>Under Review</option><option value="Inactive" ' + (source.status === 'Inactive' ? 'selected' : '') + '>Inactive</option></select></label></form>';
  }

  function renderModalButtons(primaryLabel, onClick) {
    departmentModalActions.innerHTML = '<button type="button" class="btn btn-outline" id="cancelDepartmentModal">Cancel</button><button type="button" class="btn btn-primary" id="confirmDepartmentModal">' + primaryLabel + '</button>';
    document.getElementById('cancelDepartmentModal').addEventListener('click', closeModal);
    document.getElementById('confirmDepartmentModal').addEventListener('click', onClick);
  }

  const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
  function getAuthHeader() {
    const token = localStorage.getItem('vectorone_token');
    return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  function fetchDepartmentsFromApi() {
    fetch(API_BASE + '/admin/departments', { headers: getAuthHeader() })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          departments.length = 0;
          res.data.forEach(function (d) { departments.push(d); });
          renderDepartments();
        }
      })
      .catch(function (err) {
        console.warn('VectorOne: using local department data');
      });
  }

  function getDepartmentById(id) {
    return departments.find(function (dept) { return dept.id === id; });
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const dept = getDepartmentById(button.dataset.id);
    const action = button.dataset.action;

    if (action === 'view') {
      departmentModalTitle.textContent = 'View Department';
      departmentModalBody.innerHTML = '<div class="department-view"><p><strong>ID:</strong> ' + dept.id + '</p><p><strong>Name:</strong> ' + dept.name + '</p><p><strong>HOD:</strong> ' + dept.hod + '</p><p><strong>Faculty count:</strong> ' + dept.faculty + '</p><p><strong>Student count:</strong> ' + dept.students + '</p><p><strong>Course count:</strong> ' + dept.courses + '</p><p><strong>Status:</strong> ' + dept.status + '</p></div>';
      departmentModalActions.innerHTML = '<button type="button" class="btn btn-primary" id="closeDepartmentView">Close</button>';
      document.getElementById('closeDepartmentView').addEventListener('click', closeModal);
      openModal();
      return;
    }

    if (action === 'edit') {
      departmentModalTitle.textContent = 'Edit Department';
      departmentModalBody.innerHTML = deptForm(dept);
      renderModalButtons('Save Changes', function () {
        const form = document.getElementById('departmentForm');
        const data = new FormData(form);
        const updatedFields = {
          id: String(data.get('id')),
          name: String(data.get('name')),
          hod: String(data.get('hod')),
          faculty: Number(data.get('faculty')),
          students: Number(data.get('students')),
          courses: Number(data.get('courses')),
          status: String(data.get('status'))
        };

        Object.assign(dept, updatedFields);
        renderDepartments();
        closeModal();

        fetch(API_BASE + '/admin/departments/' + dept.id, {
          method: 'PUT',
          headers: getAuthHeader(),
          body: JSON.stringify(updatedFields)
        }).catch(function (e) { console.warn(e); });
      });
      openModal();
      return;
    }

    if (action === 'delete') {
      departmentModalTitle.textContent = 'Delete Department';
      departmentModalBody.innerHTML = '<p>Delete <strong>' + dept.name + '</strong>? This removes it from the current department list.</p>';
      renderModalButtons('Delete Department', function () {
        const idx = departments.findIndex(function (item) { return item.id === dept.id; });
        if (idx >= 0) departments.splice(idx, 1);
        renderDepartments();
        closeModal();

        fetch(API_BASE + '/admin/departments/' + dept.id, {
          method: 'DELETE',
          headers: getAuthHeader()
        }).catch(function (e) { console.warn(e); });
      });
      openModal();
    }
  });

  document.getElementById('addDepartmentBtn').addEventListener('click', function () {
    departmentModalTitle.textContent = 'Add Department';
    departmentModalBody.innerHTML = deptForm();
    renderModalButtons('Add Department', function () {
      const form = document.getElementById('departmentForm');
      const data = new FormData(form);
      const newDept = {
        id: String(data.get('id')),
        name: String(data.get('name')),
        hod: String(data.get('hod')),
        faculty: Number(data.get('faculty')),
        students: Number(data.get('students')),
        courses: Number(data.get('courses')),
        status: String(data.get('status'))
      };

      departments.unshift(newDept);
      renderDepartments();
      closeModal();

      fetch(API_BASE + '/admin/departments', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(newDept)
      }).catch(function (e) { console.warn(e); });
    });
    openModal();
  });

  departmentSearch.addEventListener('input', renderDepartments);
  statusDeptFilter.addEventListener('change', renderDepartments);
  document.getElementById('refreshDepartmentsBtn').addEventListener('click', function () {
    fetchDepartmentsFromApi();
    renderDepartments();
  });
  departmentModalClose.addEventListener('click', closeModal);
  departmentModal.addEventListener('click', function (event) { if (event.target === departmentModal) closeModal(); });

  renderStats();
  renderDepartments();
  fetchDepartmentsFromApi();
})();
