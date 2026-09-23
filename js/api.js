/* ============================================================
   VectorOne — Shared API Configuration & Client
   Provides centralized base URL, auth token storage, and fetch wrapper.
   ============================================================ */

(function () {
  'use strict';

  // Determine API base URL dynamically without hardcoding localhost in production
  function resolveApiBaseUrl() {
    if (window.VECTORONE_API_URL) return window.VECTORONE_API_URL;

    const hostname = window.location.hostname;
    const port = window.location.port;

    // Local development defaults
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port === '5000') {
        return `${window.location.origin}/api`;
      }
      return 'http://localhost:5000/api';
    }

    // Production / hosted environment fallback
    return `${window.location.origin}/api`;
  }

  window.VECTORONE_API_URL = resolveApiBaseUrl();

  function resolveSocketUrl() {
    if (window.VECTORONE_SOCKET_URL) return window.VECTORONE_SOCKET_URL;
    const apiBase = window.VECTORONE_API_URL;
    return apiBase.replace(/\/api\/?$/, '');
  }

  window.VECTORONE_SOCKET_URL = resolveSocketUrl();

  const TOKEN_KEY = 'vectorone_token';
  const USER_KEY = 'vectorone_user';

  window.VectorOneAPI = {
    getBaseUrl: function () {
      return window.VECTORONE_API_URL;
    },

    getToken: function () {
      return localStorage.getItem(TOKEN_KEY);
    },

    setToken: function (token) {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    },

    getUser: function () {
      try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    setUser: function (user) {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    },

    logout: function () {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      const isAdmin = window.location.pathname.includes('/admin/');
      window.location.href = isAdmin ? '../login.html' : 'login.html';
    },

    request: async function (endpoint, options = {}) {
      const url = endpoint.startsWith('http') ? endpoint : `${window.VECTORONE_API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const token = this.getToken();

      const headers = Object.assign({}, options.headers || {});
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.method && options.method !== 'GET') {
        headers['Content-Type'] = 'application/json';
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 401) {
          console.warn('VectorOne: 401 Unauthorized encountered.');
          // Don't auto-redirect on auth check pages like login/register
          const path = window.location.pathname;
          if (!path.endsWith('login.html') && !path.endsWith('register.html') && !path.endsWith('reset-password.html')) {
            this.logout();
          }
        }

        const data = await response.json();
        return { ok: response.ok, status: response.status, ...data };
      } catch (error) {
        console.error('VectorOne API Request Error:', error);
        return { ok: false, status: 0, message: 'Network connection failed' };
      }
    },
  };
})();
/* Logout is handled centrally by js/auth-guard.js via event delegation.
   Do NOT add a duplicate logoutLink listener here. */