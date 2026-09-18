(function () {
  'use strict';

  // Read URL query parameters for token & email
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const emailInput = document.getElementById('email');
  const newPasswordInput = document.getElementById('newPassword');
  const passwordError = document.getElementById('passwordError');
  const resetForm = document.getElementById('resetPasswordForm');
  const submitBtn = document.getElementById('submitBtn');
  const resetMessage = document.getElementById('resetMessage');

  if (email && emailInput) {
    emailInput.value = email;
  }

  // Theme toggle
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('cc-theme', next);
    });
  }

  resetForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    passwordError.textContent = '';
    resetMessage.style.display = 'none';

    const userEmail = emailInput.value.trim();
    const newPassword = newPasswordInput.value;

    if (!userEmail) {
      passwordError.textContent = 'Email address is required.';
      return;
    }
    if (!token) {
      passwordError.textContent = 'Reset token is missing from URL.';
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      passwordError.textContent = 'Password must be at least 6 characters.';
      return;
    }

    submitBtn.disabled = true;

    try {
      const res = await window.VectorOneAPI.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: userEmail, token: token, newPassword: newPassword }),
      });

      submitBtn.disabled = false;

      if (res.ok && res.success) {
        resetMessage.style.color = '#10B981';
        resetMessage.textContent = res.message || 'Password reset successfully! Redirecting to login...';
        resetMessage.style.display = 'block';
        setTimeout(function () {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        passwordError.textContent = res.message || 'Failed to reset password. Token may be invalid or expired.';
      }
    } catch (err) {
      submitBtn.disabled = false;
      passwordError.textContent = 'Network error while attempting to reset password.';
    }
  });
})();
