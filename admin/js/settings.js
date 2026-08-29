/* Admin settings — persists the preference switches to localStorage and reflects
   them on load. Kept separate from the Student portal's settings key so the two
   portals don't overwrite each other. Frontend-only. */
(function () {
  'use strict';

  const inputs = document.querySelectorAll('.settings-toggle-input');
  const saveBtn = document.getElementById('saveSettingsBtn');

  // Not the settings page (no switches) — do nothing.
  if (!inputs.length) return;

  const STORAGE_KEY = 'vectorone-admin-settings';
  const DEFAULTS = {
    assignmentReminders: true,
    eventInvites: true,
    compactDashboard: false,
    showUnreadBadges: true
  };

  function readSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      return Object.assign({}, DEFAULTS, stored);
    } catch (error) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function writeSettings(settings) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (error) { /* storage may be unavailable */ }
  }

  function reflect(input, enabled) {
    input.checked = enabled;
    input.setAttribute('aria-checked', enabled ? 'true' : 'false');
    const wrap = input.closest('.settings-switch');
    if (wrap) wrap.classList.toggle('is-checked', enabled);
  }

  function applySideEffects(settings) {
    document.body.classList.toggle('compact-dashboard', Boolean(settings.compactDashboard));
    const showBadges = settings.showUnreadBadges !== false;
    document.querySelectorAll('.badge').forEach(function (badge) {
      badge.classList.toggle('is-hidden', !showBadges);
    });
  }

  /* ---------- initial state ---------- */
  const settings = readSettings();
  inputs.forEach(function (input) {
    const key = input.getAttribute('data-setting');
    const enabled = key in settings ? Boolean(settings[key]) : Boolean(DEFAULTS[key]);
    reflect(input, enabled);
  });
  applySideEffects(settings);

  /* ---------- live changes persist immediately ---------- */
  inputs.forEach(function (input) {
    input.addEventListener('change', function () {
      const key = input.getAttribute('data-setting');
      const current = readSettings();
      current[key] = input.checked;
      writeSettings(current);
      reflect(input, input.checked);
      applySideEffects(current);
    });
  });

  /* ---------- explicit Save gives visible confirmation ---------- */
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      const current = readSettings();
      inputs.forEach(function (input) {
        current[input.getAttribute('data-setting')] = input.checked;
      });
      writeSettings(current);
      const original = saveBtn.textContent;
      saveBtn.textContent = 'Saved';
      saveBtn.disabled = true;
      setTimeout(function () { saveBtn.textContent = original; saveBtn.disabled = false; }, 1200);

      const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('vectorone_token');
      if (token) {
        fetch(API_BASE + '/admin/settings', {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify(current)
        }).catch(function () {});
      }
    });
  }

  // Load live admin settings from API
  (function loadLiveAdminSettings() {
    const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('vectorone_token');
    if (!token) return;

    fetch(API_BASE + '/admin/settings', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.data) {
          const liveSettings = Object.assign({}, DEFAULTS, res.data);
          inputs.forEach(function (input) {
            const key = input.getAttribute('data-setting');
            if (key in liveSettings) reflect(input, Boolean(liveSettings[key]));
          });
          applySideEffects(liveSettings);
        }
      })
      .catch(function () {});
  })();
}());
