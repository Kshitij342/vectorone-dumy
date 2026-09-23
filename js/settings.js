/* VectorOne — Student Settings Page Logic */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const inputs = document.querySelectorAll('.settings-toggle-input');
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (!inputs.length) return;

    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    if (!token) return;

    // Load settings from API
    fetch(API_BASE + '/settings', {
      headers: { 'Authorization': 'Bearer ' + token }
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
        if (res && res.success && res.data) {
          inputs.forEach(function (input) {
            const key = input.getAttribute('data-setting');
            if (key in res.data) {
              const enabled = Boolean(res.data[key]);
              input.checked = enabled;
              input.setAttribute('aria-checked', enabled ? 'true' : 'false');
              const wrap = input.closest('.settings-switch');
              if (wrap) wrap.classList.toggle('is-checked', enabled);
            }
          });
        }
      })
      .catch(function () {});

    // Save settings to API
    function persistSettings() {
      const current = {};
      inputs.forEach(function (input) {
        const key = input.getAttribute('data-setting');
        current[key] = input.checked;
      });

      fetch(API_BASE + '/settings', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(current)
      }).catch(function () {});
    }

    inputs.forEach(function (input) {
      input.addEventListener('change', persistSettings);
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        persistSettings();
        const orig = saveBtn.textContent;
        saveBtn.textContent = 'Saved';
        setTimeout(function () { saveBtn.textContent = orig; }, 1200);
      });
    }
  });
})();
