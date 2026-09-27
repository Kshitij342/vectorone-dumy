/* ============================================================
   VectorOne — Auth Guard  (js/auth-guard.js)
   Load this as the FIRST <script> inside <head> on every
   protected student page, BEFORE api.js and page scripts.

   Responsibilities:
   1. Immediately redirect to login.html if vectorone_token is absent.
   2. Async-verify the token with GET /api/auth/me; on 401 clear
      both keys and redirect.
   3. Handle ALL logout triggers on the page with a single
      document-level delegated click listener — covers both
      #logoutLink (sidebar) and .user-dropdown-danger (top-right
      dropdown) without duplicating listeners.
   ============================================================ */

(function () {
  'use strict';

  var TOKEN_KEY = 'vectorone_token';
  var USER_KEY  = 'vectorone_user';

  console.log('[Perf Log] Dashboard loaded');

  /* ── 1. Helpers ─────────────────────────────────────────── */

  function resolveApiBase() {
    if (window.VECTORONE_API_URL) return window.VECTORONE_API_URL;
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return window.location.origin + '/api';
  }

  function resolveLoginHref() {
    var depth = window.location.pathname.split('/').filter(Boolean).length;
    if (depth > 1) return '../login.html';
    return 'login.html';
  }

  function clearAuthAndRedirect() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.replace(resolveLoginHref());
  }

  /* ── 2. Immediate token check (synchronous, blocking) ───── */

  var token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    window.location.replace(resolveLoginHref());
    document.write('');
    throw new Error('VectorOne: unauthenticated — redirecting to login');
  }

  /* ── 3. Synchronous UI Hydration from stored user state ────
     Populates user menu name, avatar, and welcome heading immediately
     at zero-latency before any async network requests resolve.   */
  function hydrateCachedUser() {
    try {
      var rawUser = localStorage.getItem(USER_KEY);
      if (!rawUser) return;
      var user = JSON.parse(rawUser);
      if (!user) return;

      var fullName = user.fullName || user.student?.fullName || user.admin?.fullName || (user.email ? user.email.split('@')[0] : '');
      if (fullName) {
        var initials = fullName.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
        document.querySelectorAll('.user-menu-name').forEach(function (el) { el.textContent = fullName; });
        document.querySelectorAll('.avatar, .user-menu-btn .avatar').forEach(function (el) { el.textContent = initials; });
        document.querySelectorAll('.welcome-user-name').forEach(function (el) { el.textContent = ', ' + fullName; });
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateCachedUser);
  } else {
    hydrateCachedUser();
  }

  /* ── 4. Async backend verification ────────────────────────
     Non-blocking: the page renders normally, but if the backend
     rejects the token we wipe it and redirect.                */

  fetch(resolveApiBase() + '/auth/me', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(function (response) {
      if (response.status === 401) {
        clearAuthAndRedirect();
      }
    })
    .catch(function () {
      /* Network unavailable — do NOT log the user out. */
    });

  /* ── 5. Centralised logout handler ─────────────────────── */

  if (!window.__vectoroneLogoutHandlerRegistered) {
    window.__vectoroneLogoutHandlerRegistered = true;

    document.addEventListener('click', function (event) {
      var target = event.target;
      var node = target;
      while (node && node !== document) {
        var id  = node.id;
        var cls = node.className || '';

        var isSidebarLogout  = (id === 'logoutLink');
        var isDropdownLogout = (typeof cls === 'string' && cls.indexOf('user-dropdown-danger') !== -1);

        if (isSidebarLogout || isDropdownLogout) {
          event.preventDefault();
          clearAuthAndRedirect();
          return;
        }
        node = node.parentNode;
      }
    }, true);
  }

})();