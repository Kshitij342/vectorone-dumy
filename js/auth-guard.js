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

  /* ── 1. Helpers ─────────────────────────────────────────── */

  function resolveApiBase() {
    // Prefer the value set by api.js if it has already run,
    // otherwise fall back to a safe local default.
    if (window.VECTORONE_API_URL) return window.VECTORONE_API_URL;
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return window.location.origin + '/api';
  }

  function resolveLoginHref() {
    // Works whether the page lives at root or inside /admin/
    var depth = window.location.pathname.split('/').filter(Boolean).length;
    if (depth > 1) return '../login.html';
    return 'login.html';
  }

  function clearAuthAndRedirect() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.replace(resolveLoginHref());
  }

  /* ── 2. Immediate token check (synchronous, blocking) ─────
     Runs before the rest of the page parses, so the user never
     sees a flash of protected content.                        */

  var token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    // Stop parsing; nothing else should run.
    window.location.replace(resolveLoginHref());
    // Use document.write to halt further script execution on
    // browsers that continue after location.replace.
    document.write('');
    throw new Error('VectorOne: unauthenticated — redirecting to login');
  }

  /* ── 3. Async backend verification ────────────────────────
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
      /* Network unavailable — do NOT log the user out.
         Let the page work with the locally-stored token. */
    });

  /* ── 4. Centralised logout handler (event delegation) ─────
     Covers:
       • #logoutLink          (sidebar footer on all pages)
       • .user-dropdown-danger (top-right user dropdown)

     Using document-level delegation means this works even if
     the DOM hasn't fully loaded yet (events bubble up from
     any depth).  The guard flag prevents double-registration
     in case this file is accidentally included twice.         */

  if (!window.__vectoroneLogoutHandlerRegistered) {
    window.__vectoroneLogoutHandlerRegistered = true;

    document.addEventListener('click', function (event) {
      var target = event.target;

      // Walk up from the click target to see if any ancestor
      // is a logout trigger.
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
    }, true /* useCapture — fires before any inline onclick */);
  }

})();