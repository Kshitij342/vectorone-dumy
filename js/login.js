/* ============================================================
   VectorOne — Login Page Logic
   Handles: theme persistence, password visibility, client-side
   validation, API authentication, Google OAuth flow, and Forgot Password.
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
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }

  applyTheme(currentTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------------- Password visibility ---------------- */
  const passwordInput = document.getElementById('password');
  const toggleVisibility = document.getElementById('togglePassword');

  if (toggleVisibility && passwordInput) {
    toggleVisibility.addEventListener('click', function () {
      const isVisible = passwordInput.type === 'text';
      passwordInput.type = isVisible ? 'password' : 'text';
      toggleVisibility.setAttribute('aria-pressed', String(!isVisible));
      toggleVisibility.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
      passwordInput.focus({ preventScroll: true });
    });
  }

  /* ---------------- Validation & Submit ---------------- */
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const submitBtn = document.getElementById('submitBtn');

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(input, errorEl, message) {
    const field = input.closest('.field');
    if (!field || !errorEl) return;
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

  if (emailInput) {
    emailInput.addEventListener('blur', validateEmail);
    emailInput.addEventListener('input', function () {
      if (emailInput.getAttribute('aria-invalid') === 'true') validateEmail();
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('blur', validatePassword);
    passwordInput.addEventListener('input', function () {
      if (passwordInput.getAttribute('aria-invalid') === 'true') validatePassword();
    });
  }

  if (form) {
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
      const defaultApiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : `${window.location.origin}/api`;
      const apiUrl = (window.VECTORONE_API_URL || defaultApiBase) + '/auth/login';

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
        .catch(function () {
          submitBtn.classList.remove('is-loading');
          submitBtn.disabled = false;
          setFieldError(passwordInput, passwordError, 'Unable to connect to server. Ensure backend is running.');
        });
    });
  }

  /* ---------------- Forgot Password Handling ---------------- */
  const forgotLink = document.querySelector('a.link-inline[href="#"]');
  if (forgotLink) {
    forgotLink.addEventListener('click', async function (e) {
      e.preventDefault();
      const emailVal = emailInput ? emailInput.value.trim() : '';
      const targetEmail = prompt('Enter your email address to receive a password reset link:', emailVal);
      if (!targetEmail) return;

      const defaultApiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : `${window.location.origin}/api`;
      const apiUrl = (window.VECTORONE_API_URL || defaultApiBase) + '/auth/forgot-password';
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail }),
        });
        const res = await response.json();
        alert(res.message || 'If that email exists, a reset link has been sent.');
      } catch (err) {
        alert('Failed to send reset password request to server.');
      }
    });
  }

  /* ---------------- Real Google Sign-In Handler ---------------- */

  const googleBtn = document.getElementById('googleBtn');

  function initGoogleSignIn() {
    if (!window.google?.accounts?.id) {
      console.error('Google Identity Services SDK failed to load.');
      return;
    }

    const clientId = window.GOOGLE_CLIENT_ID || '';

    if (!clientId) {
      console.error('Google Client ID is missing.');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCallback,
    });

    window.google.accounts.id.renderButton(
      googleBtn,
      {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 350
      }
    );
  }

  async function handleGoogleCallback(response) {
    if (!response?.credential) {
      alert('Google authentication failed or was cancelled.');
      return;
    }

    const defaultApiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : `${window.location.origin}/api`;
    const apiUrl = (window.VECTORONE_API_URL || defaultApiBase) + '/auth/google';

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credential: response.credential
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.data?.token) {
          localStorage.setItem(
            'vectorone_token',
            data.data.token
          );

          localStorage.setItem(
            'vectorone_user',
            JSON.stringify(data.data.user)
          );
        }

        window.location.href =
          data.data.user?.role === 'ADMIN'
            ? 'admin/admin-dashboard.html'
            : 'dashboard.html';

        return;
      }

      console.error('Google login failed:', data);
      alert(data.message || 'Google authentication failed.');

    } catch (err) {
      console.error('Google authentication error:', err);
      const isNetworkError = err instanceof TypeError || err.name === 'TypeError';
      const msg = isNetworkError
        ? 'Unable to connect to the VectorOne backend. Please check your network connection.'
        : (err.message || 'Google authentication failed.');
      alert(msg);
    }
  }

  /* Load Google Identity Services */
  if (googleBtn) {
    const googleScript = document.createElement('script');

    googleScript.src = 'https://accounts.google.com/gsi/client';
    googleScript.async = true;
    googleScript.defer = true;

    googleScript.onload = initGoogleSignIn;

    googleScript.onerror = function () {
      console.error('Failed to load Google Identity Services.');
    };

    document.head.appendChild(googleScript);
  }
})();
