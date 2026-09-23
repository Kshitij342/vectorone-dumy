/* Admin settings — persists preferences to backend PostgreSQL database via API. */
(function () {
  'use strict';

  const inputs = document.querySelectorAll('.settings-toggle-input');
  const saveBtn = document.getElementById('saveSettingsBtn');

  if (!inputs.length) return;

  const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
  const DEFAULTS = {
    assignmentReminders: true,
    eventInvites: true,
    compactDashboard: false,
    showUnreadBadges: true
  };

  let currentSettings = Object.assign({}, DEFAULTS);

  function getAuthHeader() {
    const token = localStorage.getItem('vectorone_token');
    return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  function reflect(input, enabled) {
    input.checked = Boolean(enabled);
    input.setAttribute('aria-checked', enabled ? 'true' : 'false');
    const wrap = input.closest('.settings-switch');
    if (wrap) wrap.classList.toggle('is-checked', Boolean(enabled));
  }

  function applySideEffects(settings) {
    document.body.classList.toggle('compact-dashboard', Boolean(settings.compactDashboard));
    const showBadges = settings.showUnreadBadges !== false;
    document.querySelectorAll('.badge').forEach(function (badge) {
      badge.classList.toggle('is-hidden', !showBadges);
    });
  }

  function renderAllInputs(settings) {
    inputs.forEach(function (input) {
      const key = input.getAttribute('data-setting');
      const val = key in settings ? settings[key] : DEFAULTS[key];
      reflect(input, val);
    });
    applySideEffects(settings);
  }

  function saveSettingsToApi(updatedSettings, onComplete) {
    fetch(API_BASE + '/admin/settings', {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(updatedSettings)
    })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res.success) {
          currentSettings = Object.assign({}, currentSettings, updatedSettings);
          if (onComplete) onComplete(true);
        } else {
          if (onComplete) onComplete(false, res.message || 'Failed to save settings.');
        }
      })
      .catch(function (err) {
        if (onComplete) onComplete(false, 'Network error while saving settings.');
      });
  }

  /* ---------- initial load from API ---------- */
  function loadLiveSettings() {
    fetch(API_BASE + '/admin/settings', { headers: getAuthHeader() })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && res.data) {
          const loaded = {};
          Object.keys(res.data).forEach(function (k) {
            const v = res.data[k];
            loaded[k] = v === 'true' ? true : (v === 'false' ? false : v);
          });
          currentSettings = Object.assign({}, DEFAULTS, loaded);
          renderAllInputs(currentSettings);
        }
      })
      .catch(function () {
        renderAllInputs(currentSettings);
      });
  }

  /* ---------- live toggle changes ---------- */
  inputs.forEach(function (input) {
    input.addEventListener('change', function () {
      const key = input.getAttribute('data-setting');
      const prevVal = currentSettings[key];
      const newVal = input.checked;

      reflect(input, newVal);
      const patch = {};
      patch[key] = newVal;
      applySideEffects(Object.assign({}, currentSettings, patch));

      saveSettingsToApi(patch, function (success, errMessage) {
        if (!success) {
          alert(errMessage || 'Failed to persist setting change to database.');
          reflect(input, prevVal);
          patch[key] = prevVal;
          applySideEffects(Object.assign({}, currentSettings, patch));
        }
      });
    });
  });

  /* ---------- Save button ---------- */
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      const updated = {};
      inputs.forEach(function (input) {
        updated[input.getAttribute('data-setting')] = input.checked;
      });

      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;

      saveSettingsToApi(updated, function (success, errMessage) {
        if (success) {
          saveBtn.textContent = 'Saved';
          setTimeout(function () { saveBtn.textContent = originalText; saveBtn.disabled = false; }, 1200);
        } else {
          alert(errMessage || 'Failed to save settings.');
          saveBtn.textContent = originalText;
          saveBtn.disabled = false;
        }
      });
    });
  }

  loadLiveSettings();
})();
