/* VectorOne — Student Profile Page Logic */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    if (!token) return;

    fetch(API_BASE + '/profile', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
      .then(function (r) {
        if (r.status === 401) {
          localStorage.removeItem('vectorone_token');
          window.location.href = 'login.html';
          return null;
        }
        return r.json();
      })
      .then(function (res) {
        if (res && res.success && res.data) {
          const p = res.data;
          const name = p.fullName || p.name || 'Student';
          const initials = name.split(' ').map(function (part) { return part[0]; }).join('').slice(0, 2).toUpperCase();

          const avatarEl = document.querySelector('.profile-avatar');
          if (avatarEl) avatarEl.textContent = initials;

          const identityH2 = document.querySelector('.profile-identity h2');
          if (identityH2) identityH2.textContent = name;

          const identityP = document.querySelector('.profile-identity p');
          if (identityP && p.department) {
            identityP.textContent = (p.department.name || p.department) + ' · Semester ' + (p.semester || 1);
          }

          document.querySelectorAll('.meta-item').forEach(function (item) {
            const span = item.querySelector('span');
            const strong = item.querySelector('strong');
            if (!span || !strong) return;
            const label = span.textContent.trim().toLowerCase();
            if (label.includes('student id') && p.studentId) strong.textContent = p.studentId;
            else if (label.includes('department') && p.department) strong.textContent = p.department.name || p.department;
            else if (label.includes('email') && (p.email || p.user?.email)) strong.textContent = p.email || p.user.email;
            else if (label.includes('phone') && p.phone) strong.textContent = p.phone;
          });
        }
      })
      .catch(function () {});
  });
})();
