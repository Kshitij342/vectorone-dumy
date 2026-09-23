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

  /* ── 1. Helpers ─────────────────────────────────────────── */

  function resolveApiBase() {
    if (window.VECTORONE_API_URL) return window.VECTORONE_API_URL;
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return window.location.origin + '/api';
  }

  /* All admin pages live inside /admin/, so login.html is one level up. */
  var LOGIN_HREF = '../login.html';

  function clearAuthAndRedirect() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.replace(LOGIN_HREF);
  }

  function redirectToLogin() {
    /* Redirect without clearing the token — used when a student tries to
       access an admin page.  Their student session should remain intact. */
    window.location.replace(LOGIN_HREF);
  }

  /* ── 2. Immediate synchronous token check ──────────────────
     Runs while the page is still parsing, before body content
     renders, so the user never sees a flash of admin UI.     */

  var token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    window.location.replace(LOGIN_HREF);
    document.write('');
    throw new Error('VectorOne Admin: unauthenticated — redirecting to login');
  }

  /* ── 3. Async backend verification + role check ────────────
     Non-blocking: renders the page shell, but redirects if the
     backend rejects the token or if the role is not ADMIN.   */

  fetch(resolveApiBase() + '/auth/me', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(function (response) {
      if (response.status === 401) {
        /* Token is invalid / expired — wipe everything. */
        clearAuthAndRedirect();
        return null;
      }
      return response.json();
    })
    .then(function (data) {
      if (!data) return; /* already redirected */

      /* data shape: { success, data: { role, ... } }
         The backend may put role directly on data or nested in data.data. */
      var user = (data.data) || data;
      var role = (user.role || '').toUpperCase();

      if (role !== 'ADMIN') {
        /* Student (or other) is trying to access admin — bounce them back.
           Do NOT remove their token; their own session is still valid. */
        redirectToLogin();
      }
      /* else: role === 'ADMIN' — allow the page to stay. */
    })
    .catch(function () {
      /* Network unavailable — do NOT log the user out.
         The page keeps working with the locally stored token. */
    });

  /* ── 4. Centralised logout handler (event delegation) ─────
     Admin sidebar uses .sidebar-link--danger (no ID).
     Top-right dropdown uses .user-dropdown-danger.
     Both are covered here via capture-phase delegation.
     The guard flag prevents double-registration if this file
     is ever accidentally included twice.                     */

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
    }, true /* useCapture — fires before any inline onclick */);
  }

})();
