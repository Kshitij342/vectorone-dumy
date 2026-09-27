/* ============================================================
   VectorOne — Admin Auth Guard  (admin/js/auth-guard.js)
   Load as the FIRST two <script> tags in every admin page <head>:

     <script src="../js/api.js"></script>
     <script src="js/auth-guard.js"></script>

   Responsibilities:
   1. Immediately redirect to ../login.html if vectorone_token absent.
   2. Call GET /api/auth/me — on 401 clear both keys and redirect.
   3. If authenticated user's role is NOT "ADMIN", redirect to ../login.html
      (does NOT wipe the token — the student's session stays intact so they
       can still access student pages; only the admin page is blocked).
   4. Handle ALL logout triggers on admin pages with a single delegated
      click listener covering:
        • .sidebar-link--danger  (sidebar footer — no ID on admin pages)
        • .user-dropdown-danger  (top-right user dropdown)
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

  var LOGIN_HREF = '../login.html';

  function clearAuthAndRedirect() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.replace(LOGIN_HREF);
  }

  function redirectToLogin() {
    window.location.replace(LOGIN_HREF);
  }

  /* ── 2. Immediate synchronous token & role check ─────────── */

  var token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    window.location.replace(LOGIN_HREF);
    document.write('');
    throw new Error('VectorOne Admin: unauthenticated — redirecting to login');
  }

  // Fast-path synchronous role check from cached user object
  var userRaw = localStorage.getItem(USER_KEY);
  if (userRaw) {
    try {
      var cachedUser = JSON.parse(userRaw);
      if (cachedUser && cachedUser.role && cachedUser.role.toUpperCase() !== 'ADMIN') {
        window.location.replace(LOGIN_HREF);
        document.write('');
        throw new Error('VectorOne Admin: unauthorized role — redirecting to login');
      }
    } catch (e) {}
  }

  /* ── 3. Synchronous Admin UI Hydration from stored user state ─ */
  function hydrateCachedAdminUser() {
    try {
      var rawUser = localStorage.getItem(USER_KEY);
      if (!rawUser) return;
      var user = JSON.parse(rawUser);
      if (!user) return;

      var fullName = user.fullName || user.admin?.fullName || user.student?.fullName || (user.email ? user.email.split('@')[0] : '');
      if (fullName) {
        var initials = fullName.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
        document.querySelectorAll('.user-menu-name').forEach(function (el) { el.textContent = fullName; });
        document.querySelectorAll('.avatar, .user-menu-btn .avatar').forEach(function (el) { el.textContent = initials; });
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateCachedAdminUser);
  } else {
    hydrateCachedAdminUser();
  }

  /* ── 4. Async backend verification + role check ──────────── */

  fetch(resolveApiBase() + '/auth/me', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(function (response) {
      if (response.status === 401) {
        clearAuthAndRedirect();
        return null;
      }
      return response.json();
    })
    .then(function (data) {
      if (!data) return;

      var user = (data.data) || data;
      var role = (user.role || '').toUpperCase();

      if (role !== 'ADMIN') {
        redirectToLogin();
      }
    })
    .catch(function () {
      /* Network unavailable — do NOT log the user out. */
    });

  /* ── 5. Centralised logout handler ─────────────────────── */

  if (!window.__vectoroneAdminLogoutHandlerRegistered) {
    window.__vectoroneAdminLogoutHandlerRegistered = true;

    document.addEventListener('click', function (event) {
      var node = event.target;

      while (node && node !== document) {
        var cls = (node.className && typeof node.className === 'string')
          ? node.className
          : '';

        var isSidebarLogout  = cls.indexOf('sidebar-link--danger') !== -1;
        var isDropdownLogout = cls.indexOf('user-dropdown-danger')  !== -1;

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
