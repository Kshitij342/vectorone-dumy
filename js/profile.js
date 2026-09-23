/* VectorOne — Student Profile Page Logic */
/* Auth protection is handled by js/auth-guard.js loaded in <head>. */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    var token = localStorage.getItem('vectorone_token');
    if (!token) return;

    fetch(API_BASE + '/profile', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
      .then(function (r) {
        if (r.status === 401) {
          // auth-guard.js will handle removal; belt-and-suspenders:
          localStorage.removeItem('vectorone_token');
          localStorage.removeItem('vectorone_user');
          window.location.replace('login.html');
          return null;
        }
        return r.json();
      })
      .then(function (res) {
        if (res && res.success && res.data) {
          var p = res.data;
          var name = p.fullName || p.name || 'Student';
          var initials = name.split(' ').map(function (part) { return part[0]; }).join('').slice(0, 2).toUpperCase();

          var avatarEl = document.querySelector('.profile-avatar');
          if (avatarEl) avatarEl.textContent = initials;

          var identityH2 = document.querySelector('.profile-identity h2');
          if (identityH2) identityH2.textContent = name;

          var identityP = document.querySelector('.profile-identity p');
          if (identityP && p.department) {
            identityP.textContent = (p.department.name || p.department) + ' · Semester ' + (p.semester || 1);
          }

          document.querySelectorAll('.meta-item').forEach(function (item) {
            var span = item.querySelector('span');
            var strong = item.querySelector('strong');
            if (!span || !strong) return;
            var label = span.textContent.trim().toLowerCase();
            if (label.includes('student id') && p.studentId) strong.textContent = p.studentId;
            else if (label.includes('department') && p.department) strong.textContent = p.department.name || p.department;
            else if (label.includes('email') && (p.email || (p.user && p.user.email))) strong.textContent = p.email || p.user.email;
            else if (label.includes('phone') && p.phone) strong.textContent = p.phone;
          });
        }
      })
      .catch(function () {});
  });
})();
