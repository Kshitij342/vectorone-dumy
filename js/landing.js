/* ============================================================
   VectorOne — Landing Page Logic
   Shares the 'cc-theme' localStorage key with login / register /
   dashboard. Handles: theme toggle, mobile nav drawer, scroll-spy
   on the primary nav, scroll-triggered reveal animations, animated
   statistic counters, and the same subtle button ripple used
   across the rest of the app. No backend calls.
   ============================================================ */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Theme toggle (shared across app) ---------------- */
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

  /* ---------------- Navbar: subtle shadow once the page scrolls ---------------- */
  const navbar = document.getElementById('navbar');
  function updateNavbarScrollState() {
    navbar.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  updateNavbarScrollState();
  window.addEventListener('scroll', updateNavbarScrollState, { passive: true });

  /* ---------------- Mobile nav drawer (same open/close recipe as the sidebar drawer) ---------------- */
  const mobileNavToggle = document.getElementById('mobileNavToggle');
  const mobileNavPanel = document.getElementById('mobileNavPanel');
  const mobileNavBackdrop = document.getElementById('mobileNavBackdrop');
  const MOBILE_NAV_BREAKPOINT = 1024;

  function openMobileNav() {
    mobileNavPanel.classList.add('is-open');
    mobileNavBackdrop.classList.add('is-visible');
    mobileNavToggle.setAttribute('aria-expanded', 'true');
    mobileNavToggle.setAttribute('aria-label', 'Close menu');
  }
  function closeMobileNav() {
    mobileNavPanel.classList.remove('is-open');
    mobileNavBackdrop.classList.remove('is-visible');
    mobileNavToggle.setAttribute('aria-expanded', 'false');
    mobileNavToggle.setAttribute('aria-label', 'Open menu');
  }
  function isMobileNavOpen() {
    return mobileNavPanel.classList.contains('is-open');
  }

  mobileNavToggle.addEventListener('click', function () {
    isMobileNavOpen() ? closeMobileNav() : openMobileNav();
  });
  mobileNavBackdrop.addEventListener('click', closeMobileNav);
  mobileNavPanel.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMobileNav);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isMobileNavOpen()) {
      closeMobileNav();
      mobileNavToggle.focus();
    }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > MOBILE_NAV_BREAKPOINT) closeMobileNav();
  });

  /* ---------------- Scroll-spy: highlight whichever section is in view ---------------- */
  const navLinks = document.querySelectorAll('.landing-nav-link[data-nav]');
  const sectionIds = Array.from(
    new Set(Array.from(navLinks).map(function (link) { return link.getAttribute('data-nav'); }))
  );
  const sections = sectionIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);

  function setActiveNav(id) {
    navLinks.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('data-nav') === id);
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActiveNav(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ---------------- Scroll reveal: fade + slide up as sections enter view ---------------- */
  const revealTargets = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window && revealTargets.length) {
    const reveal = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealTargets.forEach(function (target, index) {
      if (!prefersReducedMotion) {
        target.style.transitionDelay = (index % 4) * 60 + 'ms';
      }
      reveal.observe(target);
    });
  } else {
    revealTargets.forEach(function (target) { target.classList.add('in-view'); });
  }

  /* ---------------- Animated statistic counters ---------------- */
  const counters = document.querySelectorAll('.js-counter');

  function formatCount(value) {
    return value.toLocaleString('en-US');
  }

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count-to'), 10) || 0;
    const suffix = el.getAttribute('data-suffix') || '';

    if (prefersReducedMotion) {
      el.textContent = formatCount(target) + suffix;
      return;
    }

    const duration = 1400;
    let start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatCount(Math.floor(eased * target)) + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = formatCount(target) + suffix;
      }
    }
    window.requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window && counters.length) {
    const counterObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (counter) { counterObserver.observe(counter); });
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------------- Footer year ---------------- */
  const footerYear = document.getElementById('footerYear');
  if (footerYear) footerYear.textContent = String(new Date().getFullYear());

  /* ---------------- Subtle button ripple (identical to dashboard.js) ---------------- */
  document.querySelectorAll('.btn').forEach(function (button) {
    button.addEventListener('click', function (event) {
      if (button.disabled) return;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
      button.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); });
    });
  });
})();
