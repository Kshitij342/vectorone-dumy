(function () {
  'use strict';
  /* Page icon pulled from the shared ICONS map in admin-dashboard.js
     (loaded before this file). Falls back to an empty string rather
     than a Unicode glyph so nothing renders at the wrong size. */
  const statGlyph = (window.VectorOneAdmin && window.VectorOneAdmin.icons && window.VectorOneAdmin.icons.courses) || '';


  const courses = [
    { code: 'CS201', name: 'Data Structures', department: 'Computer Science', faculty: 'Dr. Neha Sharma', semester: '3', credits: 4, students: 148, status: 'Active' },
    { code: 'EC204', name: 'Signals and Systems', department: 'Electronics', faculty: 'Prof. Rohan Verma', semester: '4', credits: 4, students: 116, status: 'Active' },
    { code: 'ME303', name: 'Thermodynamics', department: 'Mechanical', faculty: 'Dr. Meera Nair', semester: '5', credits: 3, students: 98, status: 'Draft' },
    { code: 'BA110', name: 'Financial Accounting', department: 'Business Administration', faculty: 'Mr. Kavish Joshi', semester: '2', credits: 3, students: 86, status: 'Active' },
    { code: 'IT410', name: 'Database Management', department: 'Information Technology', faculty: 'Prof. Vikas Malhotra', semester: '6', credits: 4, students: 122, status: 'Archived' }
  ];

  const courseStats = document.getElementById('courseStats');
  const courseTableBody = document.getElementById('courseTableBody');
  const courseSearch = document.getElementById('courseSearch');
  const deptCourseFilter = document.getElementById('departmentCourseFilter');
  const semCourseFilter = document.getElementById('semesterCourseFilter');
  const yearCourseFilter = document.getElementById('yearCourseFilter');
  const statusCourseFilter = document.getElementById('statusCourseFilter');
  const courseModal = document.getElementById('courseModal');
  const courseModalTitle = document.getElementById('courseModalTitle');
  const courseModalBody = document.getElementById('courseModalBody');
  const courseModalActions = document.getElementById('courseModalActions');
  const courseModalClose = document.getElementById('courseModalClose');

  function renderStats() {
    const stats = [
      { label: 'Total Courses', value: 86, trend: '+4 new', tone: 'blue' },
      { label: 'Active', value: 64, trend: '74.4%', tone: 'green' },
      { label: 'Departments', value: 18, trend: 'All active', tone: 'purple' },
      { label: 'Enrolled Students', value: 4826, trend: '+3.1%', tone: 'orange' }
    ];
    courseStats.innerHTML = stats.map(function (item) {
      return '<article class="stat-card stat-card--' + item.tone + '"><div class="stat-card-top"><div class="stat-icon stat-icon--' + item.tone + '">' + statGlyph + '</div></div><p class="stat-value">' + item.value + '</p><p class="stat-label">' + item.label + '</p><span class="stat-trend stat-trend--up">↗ ' + item.trend + '</span></article>';
    }).join('');
  }

  function populateFilters() {
    const depts = [...new Set(courses.map(function (item) { return item.department; }))].sort();
    const sems = [...new Set(courses.map(function (item) { return item.semester; }))].sort();
    const years = ['1', '2', '3', '4'];
    deptCourseFilter.innerHTML = '<option value="">Department</option>' + depts.map(function (dept) { return '<option value="' + dept + '">' + dept + '</option>'; }).join('');
    semCourseFilter.innerHTML = '<option value="">Semester</option>' + sems.map(function (sem) { return '<option value="' + sem + '">' + sem + '</option>'; }).join('');
    yearCourseFilter.innerHTML = '<option value="">Year</option>' + years.map(function (year) { return '<option value="' + year + '">' + year + '</option>'; }).join('');
  }

  function getFilteredCourses() {
    const q = (courseSearch.value || '').trim().toLowerCase();
    return courses.filter(function (course) {
      const matchesText = !q || [course.code, course.name, course.department, course.faculty].join(' ').toLowerCase().includes(q);
      const matchesDept = !deptCourseFilter.value || course.department === deptCourseFilter.value;
      const matchesSem = !semCourseFilter.value || course.semester === semCourseFilter.value;
      const matchesYear = !yearCourseFilter.value || Number(course.semester) <= Number(yearCourseFilter.value) * 2;
      const matchesStatus = !statusCourseFilter.value || course.status === statusCourseFilter.value;
      return matchesText && matchesDept && matchesSem && matchesYear && matchesStatus;
    });
  }

  function renderCourses() {
    const rows = getFilteredCourses();
    courseTableBody.innerHTML = rows.map(function (course) {
      return '<tr><td>' + course.code + '</td><td>' + course.name + '</td><td>' + course.department + '</td><td>' + course.faculty + '</td><td>' + course.semester + '</td><td>' + course.credits + '</td><td>' + course.students + '</td><td><span class="status-badge ' + course.status.toLowerCase() + '">' + course.status + '</span></td><td><div class="table-actions"><button type="button" class="row-action" data-action="view" data-id="' + course.code + '">View</button><button type="button" class="row-action" data-action="edit" data-id="' + course.code + '">Edit</button><button type="button" class="row-action" data-action="delete" data-id="' + course.code + '">Delete</button></div></td></tr>';
    }).join('');
    document.getElementById('courseEmpty').hidden = rows.length > 0;
  }

  function openModal() {
    courseModal.hidden = false;
    requestAnimationFrame(function () { courseModal.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    courseModal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { courseModal.hidden = true; }, 180);
  }

  function getCourseByCode(code) {
    return courses.find(function (item) { return item.code === code; });
  }

  function courseForm(course) {
    const source = course || { code: 'CS999', name: '', department: 'Computer Science', faculty: 'Dr. Neha Sharma', semester: '1', credits: 3, students: 0, status: 'Active' };
    return '<form class="course-form" id="courseForm"><label>Course Code<input name="code" value="' + source.code + '" required /></label><label>Course Name<input name="name" value="' + (source.name || '') + '" required /></label><label>Department<select name="department"><option value="Computer Science" ' + (source.department === 'Computer Science' ? 'selected' : '') + '>Computer Science</option><option value="Electronics" ' + (source.department === 'Electronics' ? 'selected' : '') + '>Electronics</option><option value="Mechanical" ' + (source.department === 'Mechanical' ? 'selected' : '') + '>Mechanical</option><option value="Business Administration" ' + (source.department === 'Business Administration' ? 'selected' : '') + '>Business Administration</option><option value="Information Technology" ' + (source.department === 'Information Technology' ? 'selected' : '') + '>Information Technology</option></select></label><label>Faculty<input name="faculty" value="' + (source.faculty || '') + '" required /></label><label>Semester<select name="semester"><option value="1" ' + (source.semester === '1' ? 'selected' : '') + '>1</option><option value="2" ' + (source.semester === '2' ? 'selected' : '') + '>2</option><option value="3" ' + (source.semester === '3' ? 'selected' : '') + '>3</option><option value="4" ' + (source.semester === '4' ? 'selected' : '') + '>4</option><option value="5" ' + (source.semester === '5' ? 'selected' : '') + '>5</option><option value="6" ' + (source.semester === '6' ? 'selected' : '') + '>6</option></select></label><label>Credits<input type="number" name="credits" value="' + (source.credits || 0) + '" /></label><label>Students<input type="number" name="students" value="' + (source.students || 0) + '" /></label><label>Status<select name="status"><option value="Active" ' + (source.status === 'Active' ? 'selected' : '') + '>Active</option><option value="Draft" ' + (source.status === 'Draft' ? 'selected' : '') + '>Draft</option><option value="Archived" ' + (source.status === 'Archived' ? 'selected' : '') + '>Archived</option></select></label></form>';
  }

  function modalButtons(primaryText, handler, isDanger) {
    const btnClass = isDanger ? 'btn btn-danger' : 'btn btn-primary';
    courseModalActions.innerHTML = '<button type="button" class="btn btn-outline" id="cancelCourseModal">Cancel</button><button type="button" class="' + btnClass + '" id="confirmCourseModal">' + primaryText + '</button>';
    document.getElementById('cancelCourseModal').addEventListener('click', closeModal);
    document.getElementById('confirmCourseModal').addEventListener('click', handler);
  }

  const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
  function getAuthHeader() {
    const token = localStorage.getItem('vectorone_token');
    return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  function fetchCoursesFromApi() {
    fetch(API_BASE + '/admin/courses', { headers: getAuthHeader() })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          courses.length = 0;
          res.data.forEach(function (c) { courses.push(c); });
          populateFilters();
          renderCourses();
        }
      })
      .catch(function (err) {
        console.warn('VectorOne: using local course data');
      });
  }

  document.addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    const course = getCourseByCode(trigger.dataset.id);
    const action = trigger.dataset.action;

    if (action === 'view') {
      courseModalTitle.textContent = 'View Course';
      courseModalBody.innerHTML = '<p><strong>Code:</strong> ' + course.code + '</p><p><strong>Name:</strong> ' + course.name + '</p><p><strong>Department:</strong> ' + course.department + '</p><p><strong>Faculty:</strong> ' + course.faculty + '</p><p><strong>Semester:</strong> ' + course.semester + '</p><p><strong>Credits:</strong> ' + course.credits + '</p><p><strong>Students:</strong> ' + course.students + '</p><p><strong>Status:</strong> ' + course.status + '</p>';
      courseModalActions.innerHTML = '<button type="button" class="btn btn-primary" id="closeCourseView">Close</button>';
      document.getElementById('closeCourseView').addEventListener('click', closeModal);
      openModal();
      return;
    }

    if (action === 'edit') {
      courseModalTitle.textContent = 'Edit Course';
      courseModalBody.innerHTML = courseForm(course);
      modalButtons('Save Changes', function () {
        const form = document.getElementById('courseForm');
        const data = new FormData(form);
        const updatedFields = {
          code: String(data.get('code')),
          name: String(data.get('name')),
          department: String(data.get('department')),
          faculty: String(data.get('faculty')),
          semester: String(data.get('semester')),
          credits: Number(data.get('credits')),
          students: Number(data.get('students')),
          status: String(data.get('status'))
        };

        Object.assign(course, updatedFields);
        renderCourses();
        closeModal();

        fetch(API_BASE + '/admin/courses/' + course.code, {
          method: 'PUT',
          headers: getAuthHeader(),
          body: JSON.stringify(updatedFields)
        }).catch(function (e) { console.warn(e); });
      });
      openModal();
      return;
    }

    if (action === 'delete') {
      if (!course) return;
      courseModalTitle.textContent = 'Delete Course';
      courseModalBody.innerHTML =
        '<div style="padding: 4px 0;">' +
        '<p style="margin-bottom: 8px; font-size: 14px; color: var(--text);">Are you sure you want to delete course <strong>' + course.name + '</strong> (' + course.code + ')?</p>' +
        '<p style="color: #64748b; font-size: 13px; margin-bottom: 0;">This action permanently removes the course from the catalog.</p>' +
        '<div id="courseModalError" style="display:none; margin-top:14px; padding:10px 14px; background:rgba(239,68,68,0.1); border:1px solid #ef4444; border-radius:8px; color:#ef4444; font-size:13px;"></div>' +
        '</div>';

      modalButtons('Delete Course', function () {
        const confirmBtn = document.getElementById('confirmCourseModal');
        const cancelBtn = document.getElementById('cancelCourseModal');
        const errorEl = document.getElementById('courseModalError');

        if (!confirmBtn || confirmBtn.disabled) return;
        confirmBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
        confirmBtn.textContent = 'Deleting...';
        if (errorEl) errorEl.style.display = 'none';

        fetch(API_BASE + '/admin/courses/' + encodeURIComponent(course.code), {
          method: 'DELETE',
          headers: getAuthHeader()
        })
          .then(function (res) {
            return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
          })
          .then(function (result) {
            if (result.ok && result.data && result.data.success) {
              const index = courses.findIndex(function (item) { return item.code === course.code; });
              if (index >= 0) courses.splice(index, 1);
              renderCourses();
              closeModal();
              fetchCoursesFromApi();
            } else {
              const msg = (result.data && result.data.message) ? result.data.message : 'Failed to delete course.';
              if (errorEl) {
                errorEl.textContent = msg;
                errorEl.style.display = 'block';
              } else {
                alert(msg);
              }
              confirmBtn.disabled = false;
              if (cancelBtn) cancelBtn.disabled = false;
              confirmBtn.textContent = 'Delete Course';
            }
          })
          .catch(function (err) {
            console.warn(err);
            if (errorEl) {
              errorEl.textContent = 'Unable to connect to server.';
              errorEl.style.display = 'block';
            } else {
              alert('Unable to connect to server.');
            }
            confirmBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
            confirmBtn.textContent = 'Delete Course';
          });
      }, true);
      openModal();
    }
  });

  document.getElementById('addCourseBtn').addEventListener('click', function () {
    courseModalTitle.textContent = 'Add Course';
    courseModalBody.innerHTML = courseForm();
    modalButtons('Add Course', function () {
      const form = document.getElementById('courseForm');
      const data = new FormData(form);
      const newCourse = {
        code: String(data.get('code')),
        name: String(data.get('name')),
        department: String(data.get('department')),
        faculty: String(data.get('faculty')),
        semester: String(data.get('semester')),
        credits: Number(data.get('credits')),
        students: Number(data.get('students')),
        status: String(data.get('status'))
      };

      courses.unshift(newCourse);
      renderCourses();
      closeModal();

      fetch(API_BASE + '/admin/courses', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(newCourse)
      }).catch(function (e) { console.warn(e); });
    });
    openModal();
  });

  courseModalClose.addEventListener('click', closeModal);
  courseModal.addEventListener('click', function (event) { if (event.target === courseModal) closeModal(); });
  courseSearch.addEventListener('input', renderCourses);
  deptCourseFilter.addEventListener('change', renderCourses);
  semCourseFilter.addEventListener('change', renderCourses);
  yearCourseFilter.addEventListener('change', renderCourses);
  statusCourseFilter.addEventListener('change', renderCourses);
  document.getElementById('refreshCoursesBtn').addEventListener('click', function () {
    fetchCoursesFromApi();
    renderCourses();
  });

  renderStats();
  populateFilters();
  renderCourses();
  fetchCoursesFromApi();
})();
