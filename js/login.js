/* ============================================================
   VectorOne — Login Page Logic
   Handles: theme persistence, password visibility, client-side
   validation, and button loading states. No backend calls —
   the submit handler simulates a request and logs the payload.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------- Theme toggle ---------------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('cc-theme', theme);
    const isDark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  // Sync the toggle's ARIA state with whatever the inline head script picked.
  applyTheme(currentTheme());

  themeToggle.addEventListener('click', function () {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  /* ---------------- Password visibility ---------------- */
  const passwordInput = document.getElementById('password');
  const toggleVisibility = document.getElementById('togglePassword');

  toggleVisibility.addEventListener('click', function () {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    toggleVisibility.setAttribute('aria-pressed', String(!isVisible));
    toggleVisibility.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    passwordInput.focus({ preventScroll: true });
  });

  /* ---------------- Validation ---------------- */
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const submitBtn = document.getElementById('submitBtn');

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(input, errorEl, message) {
    const field = input.closest('.field');
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
      field.classList.add('has-error');
      // restart the shake animation on repeated errors
      field.style.animation = 'none';
      // eslint-disable-next-line no-unused-expressions
      field.offsetHeight;
      field.style.animation = '';
    } else {
      input.setAttribute('aria-invalid', 'false');
      errorEl.textContent = '';
      field.classList.remove('has-error');
    }
  }

  function validateEmail() {
    const value = emailInput.value.trim();
    if (!value) {
      setFieldError(emailInput, emailError, 'Email address is required.');
      return false;
    }
    if (!EMAIL_PATTERN.test(value)) {
      setFieldError(emailInput, emailError, 'Enter a valid email address.');
      return false;
    }
    setFieldError(emailInput, emailError, '');
    return true;
  }

  function validatePassword() {
    const value = passwordInput.value;
    if (!value) {
      setFieldError(passwordInput, passwordError, 'Password is required.');
      return false;
    }
    if (value.length < 6) {
      setFieldError(passwordInput, passwordError, 'Password must be at least 6 characters.');
      return false;
    }
    setFieldError(passwordInput, passwordError, '');
    return true;
  }

  // Validate on blur so errors appear as the person moves through the form,
  // not while they are still mid-keystroke.
  emailInput.addEventListener('blur', validateEmail);
  passwordInput.addEventListener('blur', validatePassword);
  emailInput.addEventListener('input', function () {
    if (emailInput.getAttribute('aria-invalid') === 'true') validateEmail();
  });
  passwordInput.addEventListener('input', function () {
    if (passwordInput.getAttribute('aria-invalid') === 'true') validatePassword();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (!isEmailValid || !isPasswordValid) {
      (isEmailValid ? passwordInput : emailInput).focus();
      return;
    }

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    const selectedRole = document.querySelector('input[name="loginRole"]:checked')?.value || 'student';
    const apiUrl = (window.VECTORONE_API_URL || 'http://localhost:5000/api') + '/auth/login';

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: passwordInput.value,
        role: selectedRole,
      }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;

        if (result.ok && result.data.success) {
          if (result.data.data?.token) {
            localStorage.setItem('vectorone_token', result.data.data.token);
            localStorage.setItem('vectorone_user', JSON.stringify(result.data.data.user));
          }
          window.location.href = selectedRole === 'admin' ? 'admin/admin-dashboard.html' : 'dashboard.html';
        } else {
          const errMsg = result.data.message || 'Invalid email or password.';
          setFieldError(passwordInput, passwordError, errMsg);
          passwordInput.focus();
        }
      })
      .catch(function (err) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        setFieldError(passwordInput, passwordError, 'Unable to connect to server. Ensure backend is running.');
      });
  });

  /* ---------------- Google button ---------------- */
  document.getElementById('googleBtn').addEventListener('click', function () {
    console.log('VectorOne: "Continue with Google" clicked — wire up OAuth here.');
  });
})();
