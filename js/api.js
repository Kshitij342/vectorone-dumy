/* ============================================================
   VectorOne — Shared API Configuration & Client
   Provides centralized base URL, auth token storage, and fetch wrapper.
   ============================================================ */

(function () {
  'use strict';

  window.VECTORONE_API_URL = window.VECTORONE_API_URL || 'http://localhost:5000/api';

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
      const url = endpoint.startsWith('http') ? endpoint : `${window.VECTORONE_API_URL}${endpoint}`;
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
          // Token expired or invalid
          console.warn('VectorOne: 401 Unauthorized encountered.');
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
