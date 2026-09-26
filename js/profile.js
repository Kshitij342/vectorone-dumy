/* VectorOne — Student Profile Page Logic */
/* Auth protection is handled by js/auth-guard.js loaded in <head>. */
(function () {
  'use strict';

  /* ─── Helpers ─────────────────────────────────────────────────── */

  var LOADING_TEXT = 'Loading…';
  var LOADING_INITIALS = '–';

  /** Puts every profile field into a loading/blank state immediately. */
  function showLoadingState() {
    var avatarEl = document.querySelector('.profile-avatar');
    if (avatarEl) avatarEl.textContent = LOADING_INITIALS;

    var identityH2 = document.querySelector('.profile-identity h2');
    if (identityH2) identityH2.textContent = LOADING_TEXT;

    var identityP = document.querySelector('.profile-identity p');
    if (identityP) identityP.textContent = LOADING_TEXT;

    document.querySelectorAll('.meta-item').forEach(function (item) {
      var strong = item.querySelector('strong');
      if (strong) strong.textContent = LOADING_TEXT;
    });

    /* Also blank the navbar user-menu so it doesn't show stale HTML */
    document.querySelectorAll('.user-menu-name').forEach(function (el) {
      el.textContent = '';
    });
    document.querySelectorAll('.user-menu-btn .avatar').forEach(function (el) {
      el.textContent = '';
    });
  }

  /** Renders the real profile data returned by the API. */
  function renderProfile(p) {
    var name = p.fullName || p.name || (p.user && p.user.email ? p.user.email.split('@')[0] : '');
    var initials = name
      ? name.split(' ').map(function (part) { return part[0]; }).join('').slice(0, 2).toUpperCase()
      : '?';

    var avatarEl = document.querySelector('.profile-avatar');
    if (avatarEl) avatarEl.textContent = initials;

    var identityH2 = document.querySelector('.profile-identity h2');
    if (identityH2) identityH2.textContent = name || '—';

    var dept = (p.department && (p.department.name || p.department)) || '';
    var sem = p.semester || '';
    var identityP = document.querySelector('.profile-identity p');
    if (identityP) {
      identityP.textContent = dept && sem
        ? dept + ' · Semester ' + sem
        : (dept || sem || '—');
    }

    document.querySelectorAll('.meta-item').forEach(function (item) {
      var span = item.querySelector('span');
      var strong = item.querySelector('strong');
      if (!span || !strong) return;
      var label = span.textContent.trim().toLowerCase();

      if (label.includes('student id')) {
        strong.textContent = p.studentId || '—';
      } else if (label.includes('department')) {
        strong.textContent = dept || '—';
      } else if (label.includes('email')) {
        var email = p.email || (p.user && p.user.email) || '';
        strong.textContent = email || '—';
      } else if (label.includes('phone')) {
        strong.textContent = p.phone || '—';
      } else if (label.includes('batch')) {
        strong.textContent = p.batch || '—';
      } else if (label.includes('cgpa')) {
        strong.textContent = p.cgpa != null ? p.cgpa : '—';
      }
      /* Items with no API data (Attendance, Assignments, Club, Mentor)
         are in the Academic Summary panel — leave them as-is or blank. */
    });

    /* Update the navbar user pill with the real data */
    document.querySelectorAll('.user-menu-name').forEach(function (el) {
      el.textContent = name;
    });
    document.querySelectorAll('.user-menu-btn .avatar').forEach(function (el) {
      el.textContent = initials;
    });
  }

  /** Shows an error message with a retry button. Never shows dummy data. */
  function showErrorState(retryFn) {
    var identityH2 = document.querySelector('.profile-identity h2');
    if (identityH2) identityH2.textContent = 'Unable to load profile';

    var identityP = document.querySelector('.profile-identity p');
    if (identityP) identityP.textContent = '';

    var avatarEl = document.querySelector('.profile-avatar');
    if (avatarEl) avatarEl.textContent = '!';

    document.querySelectorAll('.meta-item').forEach(function (item) {
      var strong = item.querySelector('strong');
      if (strong) strong.textContent = '—';
    });

    /* Insert a Retry button after the profile card if not already there */
    var retryId = 'profile-retry-btn';
    if (!document.getElementById(retryId)) {
      var btn = document.createElement('button');
      btn.id = retryId;
      btn.type = 'button';
      btn.textContent = 'Retry';
      btn.setAttribute('style',
        'margin:1.5rem auto;display:block;padding:.5rem 1.5rem;' +
        'font-size:.95rem;cursor:pointer;border-radius:.5rem;' +
        'border:1.5px solid var(--primary,#6366f1);background:transparent;' +
        'color:var(--primary,#6366f1);'
      );
      btn.addEventListener('click', function () {
        btn.remove();
        showLoadingState();
        retryFn();
      });
      var card = document.querySelector('.profile-card');
      if (card) card.insertAdjacentElement('afterend', btn);
    }
  }

  /* ─── Main fetch ───────────────────────────────────────────────── */

  function fetchProfile() {
    var API_BASE = window.VECTORONE_API_URL || (window.location.origin + '/api');
    var token = localStorage.getItem('vectorone_token');
    if (!token) return; /* auth-guard already handles redirect */

    fetch(API_BASE + '/profile', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    })
      .then(function (r) {
        if (r.status === 401) {
          localStorage.removeItem('vectorone_token');
          localStorage.removeItem('vectorone_user');
          window.location.replace('login.html');
          return null;
        }
        return r.json();
      })
      .then(function (res) {
        if (!res) return; /* redirected */
        if (res.success && res.data) {
          renderProfile(res.data);
        } else {
          showErrorState(fetchProfile);
        }
      })
      .catch(function () {
        showErrorState(fetchProfile);
      });
  }

  /* ─── Boot ─────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    showLoadingState(); /* ← runs BEFORE any async work, so dummy HTML is overwritten at once */
    fetchProfile();
  });

})();
