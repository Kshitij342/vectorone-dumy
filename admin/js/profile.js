/* Admin profile — page logic. Frontend-only; edits live in memory for the session.
   Reuses the shared modal styling from css/admin-dashboard.css. */
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

  // Not the profile page — do nothing.
  if (!editBtn || !modal) return;

  /* Editable profile fields. Labels match the read-only meta grid. */
  const profile = {
    name: 'Aarav Deshmukh',
    title: 'College Administrator',
    office: 'Operations Office',
    employeeId: 'ADM-2048',
    department: 'Operations & Student Services',
    access: 'Full admin',
    email: 'aarav.deshmukh@vectorone.edu',
    phone: '+91 98765 44012'
  };

  const fields = [
    { name: 'name', label: 'Full Name', full: true },
    { name: 'title', label: 'Role Title' },
    { name: 'office', label: 'Office' },
    { name: 'employeeId', label: 'Employee ID' },
    { name: 'department', label: 'Department', full: true },
    { name: 'access', label: 'Access Level' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone' }
  ];

  function initials(name) {
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
        '<input name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(profile[f.name]) + '" /></label>';
    }).join('');
    return '<form class="admin-form">' + controls + '</form>';
  }

  function readForm() {
    const form = modalBody && modalBody.querySelector('form');
    if (!form) return;
    fields.forEach(function (f) {
      const input = form.querySelector('[name="' + f.name + '"]');
      if (input && input.value.trim()) profile[f.name] = input.value.trim();
    });
  }

  editBtn.addEventListener('click', function () {
    if (modalBody) modalBody.innerHTML = buildForm();
    if (modalActions) {
      modalActions.innerHTML = '<button type="button" class="btn btn-outline" data-dismiss>Cancel</button>' +
        '<button type="button" class="btn btn-primary" data-save>Save Changes</button>';
      const cancel = modalActions.querySelector('[data-dismiss]');
      const save = modalActions.querySelector('[data-save]');
      if (cancel) cancel.addEventListener('click', closeModal);
      if (save) save.addEventListener('click', function () { readForm(); paint(); closeModal(); });
    }
    openModal();
  });

  if (modalClose) modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  paint();
}());
