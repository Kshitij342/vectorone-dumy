/* Admin profile — page logic connected to PostgreSQL API with real DB persistence. */
(function () {
  'use strict';

  const esc = (window.VectorOneAdmin && window.VectorOneAdmin.escapeHtml) || function (v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  const editBtn = document.getElementById('editProfileBtn');
  const modal = document.getElementById('profileModal');
  const modalBody = document.getElementById('profileModalBody');
  const modalActions = document.getElementById('profileModalActions');
  const modalClose = document.getElementById('profileModalClose');
  const nameEl = document.getElementById('profileName');
  const roleEl = document.getElementById('profileRole');
  const avatarEl = document.getElementById('profileAvatar');
  const metaEl = document.getElementById('profileMeta');

  if (!editBtn || !modal) return;

  const profile = {
    name: 'College Administrator',
    title: 'System Administrator',
    office: 'Operations Office',
    employeeId: 'ADM-2048',
    department: 'Operations & Student Services',
    access: 'Full admin',
    email: 'admin@vectorone.edu',
    phone: '+91 98765 44012'
  };

  const fields = [
    { name: 'name', label: 'Full Name', full: true, required: true },
    { name: 'title', label: 'Role Title' },
    { name: 'office', label: 'Office' },
    { name: 'employeeId', label: 'Employee ID' },
    { name: 'department', label: 'Department', full: true },
    { name: 'access', label: 'Access Level' },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone' }
  ];

  function initials(name) {
    if (!name) return 'AD';
    return name.split(' ').filter(Boolean).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
  }

  function paint() {
    if (nameEl) nameEl.textContent = profile.name;
    if (roleEl) roleEl.textContent = profile.title + ' · ' + profile.office;
    if (avatarEl) avatarEl.textContent = initials(profile.name);
    if (metaEl) {
      metaEl.innerHTML = [
        ['Employee ID', profile.employeeId],
        ['Role', profile.title],
        ['Department', profile.department],
        ['Access Level', profile.access],
        ['Email', profile.email],
        ['Phone', profile.phone]
      ].map(function (pair) {
        return '<div class="meta-item"><span>' + esc(pair[0]) + '</span><strong>' + esc(pair[1]) + '</strong></div>';
      }).join('');
    }
    document.querySelectorAll('.user-menu-name').forEach(function (el) { el.textContent = profile.name; });
    document.querySelectorAll('.user-menu-btn .avatar').forEach(function (el) { el.textContent = initials(profile.name); });
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

  function buildForm() {
    const controls = fields.map(function (f) {
      const cls = f.full ? ' class="full-width"' : '';
      return '<label' + cls + '>' + esc(f.label) +
        '<input name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(profile[f.name]) + '"' + (f.required ? ' required' : '') + ' /></label>';
    }).join('');
    return '<form class="admin-form">' + controls + '</form><p class="modal-error-msg" id="profileErrorMsg" style="color: #ef4444; margin-top: 10px; display: none;"></p>';
  }

  function readFormValues() {
    const form = modalBody && modalBody.querySelector('form');
    if (!form) return null;
    const data = new FormData(form);
    const out = {};
    data.forEach(function (val, key) { out[key] = val; });
    return out;
  }

  function syncLocalUser() {
    try {
      const raw = localStorage.getItem('vectorone_user');
      const u = raw ? JSON.parse(raw) : {};
      u.fullName = profile.name;
      u.name = profile.name;
      u.email = profile.email;
      localStorage.setItem('vectorone_user', JSON.stringify(u));
    } catch (e) {}
  }

  function loadLiveAdminProfile() {
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    if (!token) return;

    fetch(API_BASE + '/admin/profile', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.data) {
          const d = res.data;
          profile.name = d.fullName || profile.name;
          profile.email = d.email || profile.email;
          if (d.adminId) profile.employeeId = d.adminId;
          syncLocalUser();
          paint();
        }
      })
      .catch(function () {});
  }

  editBtn.addEventListener('click', function () {
    if (modalBody) modalBody.innerHTML = buildForm();
    if (modalActions) {
      modalActions.innerHTML = '<button type="button" class="btn btn-outline" data-dismiss>Cancel</button>' +
        '<button type="button" class="btn btn-primary" data-save>Save Changes</button>';
      const cancel = modalActions.querySelector('[data-dismiss]');
      const save = modalActions.querySelector('[data-save]');
      if (cancel) cancel.addEventListener('click', closeModal);
      if (save) {
        save.addEventListener('click', function () {
          const values = readFormValues();
          const errEl = document.getElementById('profileErrorMsg');
          if (errEl) errEl.style.display = 'none';

          if (!values || !values.name || !values.name.trim()) {
            if (errEl) { errEl.textContent = 'Full Name is required.'; errEl.style.display = 'block'; }
            return;
          }

          save.disabled = true;
          save.textContent = 'Saving...';

          const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
          const token = localStorage.getItem('vectorone_token');

          fetch(API_BASE + '/admin/profile', {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: values.name.trim(),
              email: values.email ? values.email.trim() : profile.email
            })
          })
            .then(function (r) { return r.json(); })
            .then(function (res) {
              if (res.success && res.data) {
                profile.name = res.data.fullName || values.name.trim();
                profile.email = res.data.email || values.email || profile.email;
                if (values.title) profile.title = values.title;
                if (values.office) profile.office = values.office;
                if (values.phone) profile.phone = values.phone;
                syncLocalUser();
                paint();
                closeModal();
              } else {
                if (errEl) { errEl.textContent = res.message || 'Failed to save profile.'; errEl.style.display = 'block'; }
                save.disabled = false;
                save.textContent = 'Save Changes';
              }
            })
            .catch(function () {
              if (errEl) { errEl.textContent = 'Network error while saving profile.'; errEl.style.display = 'block'; }
              save.disabled = false;
              save.textContent = 'Save Changes';
            });
        });
      }
    }
    openModal();
  });

  if (modalClose) modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  loadLiveAdminProfile();
}());
