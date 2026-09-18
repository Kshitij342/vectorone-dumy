/* ============================================================
   VectorOne — Register Page Logic
   Same theme system as login.js (shared 'cc-theme' key so the
   preference carries across pages). Adds: dual password
   visibility toggles, per-field validation, a password strength
   meter, and a live password-match indicator. No backend calls —
   submit simulates a request and logs the payload.
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

  applyTheme(currentTheme());

  themeToggle.addEventListener('click', function () {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  /* ---------------- Password visibility (both fields) ---------------- */
  function wireVisibilityToggle(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    button.addEventListener('click', function () {
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      button.setAttribute('aria-pressed', String(!isVisible));
      button.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
      input.focus({ preventScroll: true });
    });
  }
  wireVisibilityToggle('password', 'togglePassword');
  wireVisibilityToggle('confirmPassword', 'toggleConfirmPassword');

  /* ---------------- Field references ---------------- */
  const form = document.getElementById('registerForm');
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const studentIdInput = document.getElementById('studentId');
  const yearSelect = document.getElementById('year');
  const departmentSelect = document.getElementById('department');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const termsCheckbox = document.getElementById('terms');
  const submitBtn = document.getElementById('submitBtn');

  const strengthMeter = document.getElementById('strengthMeter');
  const strengthLabel = document.getElementById('strengthLabel');
  const matchIndicator = document.getElementById('matchIndicator');

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------------- Shared error helper ---------------- */
  function setFieldError(input, errorEl, message) {
    const field = input.closest('.field');
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
      field.classList.add('has-error');
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

  /* ---------------- Individual validators ---------------- */
  function validateFullName() {
    const errorEl = document.getElementById('fullNameError');
    const value = fullNameInput.value.trim();
    if (!value) return setFieldError(fullNameInput, errorEl, 'Full name is required.'), false;
    if (value.length < 2) return setFieldError(fullNameInput, errorEl, 'Enter your full name.'), false;
    setFieldError(fullNameInput, errorEl, '');
    return true;
  }

  function validateEmail() {
    const errorEl = document.getElementById('emailError');
    const value = emailInput.value.trim();
    if (!value) return setFieldError(emailInput, errorEl, 'College email is required.'), false;
    if (!EMAIL_PATTERN.test(value)) return setFieldError(emailInput, errorEl, 'Enter a valid email address.'), false;
    setFieldError(emailInput, errorEl, '');
    return true;
  }

  function validateStudentId() {
    const errorEl = document.getElementById('studentIdError');
    const value = studentIdInput.value.trim();
    if (!value) return setFieldError(studentIdInput, errorEl, 'Student ID is required.'), false;
    setFieldError(studentIdInput, errorEl, '');
    return true;
  }

  function validateYear() {
    const errorEl = document.getElementById('yearError');
    if (!yearSelect.value) return setFieldError(yearSelect, errorEl, 'Select your year.'), false;
    setFieldError(yearSelect, errorEl, '');
    return true;
  }

  function validateDepartment() {
    const errorEl = document.getElementById('departmentError');
    if (!departmentSelect.value) return setFieldError(departmentSelect, errorEl, 'Select your department.'), false;
    setFieldError(departmentSelect, errorEl, '');
    return true;
  }

  function validatePassword() {
    const errorEl = document.getElementById('passwordError');
    const value = passwordInput.value;
    if (!value) return setFieldError(passwordInput, errorEl, 'Password is required.'), false;
    if (value.length < 8) return setFieldError(passwordInput, errorEl, 'Use at least 8 characters.'), false;
    setFieldError(passwordInput, errorEl, '');
    return true;
  }

  function validateConfirmPassword() {
    const errorEl = document.getElementById('confirmPasswordError');
    const value = confirmPasswordInput.value;
    if (!value) return setFieldError(confirmPasswordInput, errorEl, 'Confirm your password.'), false;
    if (value !== passwordInput.value) return setFieldError(confirmPasswordInput, errorEl, 'Passwords do not match.'), false;
    setFieldError(confirmPasswordInput, errorEl, '');
    return true;
  }

  function validateTerms() {
    const errorEl = document.getElementById('termsError');
    if (!termsCheckbox.checked) {
      errorEl.textContent = 'You must accept the terms to continue.';
      return false;
    }
    errorEl.textContent = '';
    return true;
  }

  /* ---------------- Password strength meter ---------------- */
  const STRENGTH_LABELS = { 0: '', 1: 'Weak', 2: 'Fair', 3: 'Good', 4: 'Strong' };

  function scorePassword(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return value ? Math.max(score, 1) : 0;
  }

  function updateStrengthMeter() {
    const score = scorePassword(passwordInput.value);
    strengthMeter.setAttribute('data-score', String(score));
    strengthLabel.setAttribute('data-score', String(score));
    strengthLabel.textContent = STRENGTH_LABELS[score];
  }

  /* ---------------- Live password match indicator ---------------- */
  function updateMatchIndicator() {
    matchIndicator.classList.remove('match-indicator--ok', 'match-indicator--bad');
    if (!confirmPasswordInput.value) {
      matchIndicator.textContent = '';
      return;
    }
    if (confirmPasswordInput.value === passwordInput.value) {
      matchIndicator.textContent = 'Passwords match';
      matchIndicator.classList.add('match-indicator--ok');
    } else {
      matchIndicator.textContent = 'Passwords do not match';
      matchIndicator.classList.add('match-indicator--bad');
    }
  }

  /* ---------------- Event wiring ---------------- */
  fullNameInput.addEventListener('blur', validateFullName);
  emailInput.addEventListener('blur', validateEmail);
  studentIdInput.addEventListener('blur', validateStudentId);
  yearSelect.addEventListener('change', validateYear);
  departmentSelect.addEventListener('change', validateDepartment);
  termsCheckbox.addEventListener('change', validateTerms);

  fullNameInput.addEventListener('input', function () {
    if (fullNameInput.getAttribute('aria-invalid') === 'true') validateFullName();
  });
  emailInput.addEventListener('input', function () {
    if (emailInput.getAttribute('aria-invalid') === 'true') validateEmail();
  });
  studentIdInput.addEventListener('input', function () {
    if (studentIdInput.getAttribute('aria-invalid') === 'true') validateStudentId();
  });

  passwordInput.addEventListener('input', function () {
    updateStrengthMeter();
    if (passwordInput.getAttribute('aria-invalid') === 'true') validatePassword();
    if (confirmPasswordInput.value) updateMatchIndicator();
  });
  passwordInput.addEventListener('blur', validatePassword);

  confirmPasswordInput.addEventListener('input', function () {
    updateMatchIndicator();
    if (confirmPasswordInput.getAttribute('aria-invalid') === 'true') validateConfirmPassword();
  });
  confirmPasswordInput.addEventListener('blur', validateConfirmPassword);

  /* ---------------- Submit ---------------- */
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const validators = [
      validateFullName,
      validateEmail,
      validateStudentId,
      validateYear,
      validateDepartment,
      validatePassword,
      validateConfirmPassword,
      validateTerms,
    ];

    // Run every validator (don't short-circuit) so all errors surface at once.
    const results = validators.map(function (fn) { return fn(); });
    const firstInvalidIndex = results.indexOf(false);

    if (firstInvalidIndex !== -1) {
      const focusTargets = [
        fullNameInput, emailInput, studentIdInput, yearSelect,
        departmentSelect, passwordInput, confirmPasswordInput, termsCheckbox,
      ];
      focusTargets[firstInvalidIndex].focus();
      return;
    }

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    const apiUrl = (window.VECTORONE_API_URL || 'http://localhost:5000/api') + '/auth/register';

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullNameInput.value.trim(),
        email: emailInput.value.trim(),
        studentId: studentIdInput.value.trim(),
        year: yearSelect.value,
        department: departmentSelect.value,
        password: passwordInput.value,
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
          window.location.href = 'dashboard.html';
        } else {
          const errMsg = result.data.message || (result.data.errors && result.data.errors[0]) || 'Registration failed.';
          const errorEl = document.getElementById('emailError');
          setFieldError(emailInput, errorEl, errMsg);
          emailInput.focus();
        }
      })
      .catch(function (err) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        const errorEl = document.getElementById('emailError');
        setFieldError(emailInput, errorEl, 'Unable to connect to server. Ensure backend is running.');
      });
  });

  /* ---------------- Google button ---------------- */
  const googleBtn = document.getElementById('googleBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', function () {
      if (typeof window.google === 'undefined' || !window.google.accounts) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = initGoogleSignIn;
        script.onerror = function () {
          alert('Failed to load Google Sign-In SDK. Google OAuth code implemented; real external OAuth flow unavailable without network access to Google.');
        };
        document.head.appendChild(script);
      } else {
        initGoogleSignIn();
      }
    });
  }

  function initGoogleSignIn() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      const clientId = window.GOOGLE_CLIENT_ID || '';
      if (!clientId) {
        alert('Google OAuth code implemented; real external OAuth flow not tested because credentials/configuration are unavailable.');
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCallback,
      });
      window.google.accounts.id.prompt();
    } else {
      alert('Google OAuth code implemented; real external OAuth flow not tested because credentials/configuration are unavailable.');
    }
  }

  async function handleGoogleCallback(response) {
    if (!response || !response.credential) {
      alert('Google authentication cancelled or invalid credential.');
      return;
    }
    const apiUrl = (window.VECTORONE_API_URL || 'http://localhost:5000/api') + '/auth/google';
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.data?.token) {
          localStorage.setItem('vectorone_token', data.data.token);
          localStorage.setItem('vectorone_user', JSON.stringify(data.data.user));
        }
        window.location.href = data.data.user?.role === 'ADMIN' ? 'admin/admin-dashboard.html' : 'dashboard.html';
      } else {
        alert(data.message || 'Google authentication failed.');
      }
    } catch (err) {
      alert('Network error during Google authentication.');
    }
  }
})();
