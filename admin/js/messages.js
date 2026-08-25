/* Admin messages — page logic. Frontend-only demo data held in memory.
   Handles conversation selection, search, thread rendering and sending. */
(function () {
  'use strict';

  const esc = (window.VectorOneAdmin && window.VectorOneAdmin.escapeHtml) || function (v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* ---------- elements (all guarded — the page may load partially) ---------- */
  const listHost = document.getElementById('conversationList');
  const threadHost = document.getElementById('messageThread');
  const threadTitle = document.getElementById('threadTitle');
  const threadMeta = document.getElementById('threadMeta');
  const searchInput = document.getElementById('messageSearch');
  const composer = document.getElementById('messageComposer');
  const composerInput = document.getElementById('composerInput');
  const statsHost = document.getElementById('messageStats');
  const filterBtn = document.getElementById('messageFilterBtn');
  const replyBtn = document.getElementById('replyBtn');
  const forwardBtn = document.getElementById('forwardBtn');
  const composeBtn = document.getElementById('composeMessageBtn');
  const refreshBtn = document.getElementById('refreshMessagesBtn');

  if (!listHost || !threadHost) return;

  /* ---------- demo data ---------- */
  const conversations = [
    {
      id: 'c1', name: 'Dr. Neha Sharma', role: 'Faculty', presence: 'Online', unread: 2, time: '09:42',
      messages: [
        { from: 'them', text: 'Good morning. Could you confirm the examination hall allocation for the Database Systems paper?', time: '09:20' },
        { from: 'me', text: 'Morning, Doctor. Hall C-201 and C-202 are reserved for that slot.', time: '09:28' },
        { from: 'them', text: 'Perfect. I will inform the invigilation team today.', time: '09:40' },
        { from: 'them', text: 'Also, the practical marks sheet needs your sign-off before Friday.', time: '09:42' }
      ]
    },
    {
      id: 'c2', name: 'Placement Cell', role: 'Department', presence: 'Active today', unread: 1, time: '08:55',
      messages: [
        { from: 'them', text: 'TCS has confirmed 2 October for the campus drive. We expect around 200 registrations.', time: '08:50' },
        { from: 'me', text: 'Noted. Please raise the venue request for the placement block.', time: '08:53' },
        { from: 'them', text: 'Request submitted. Awaiting approval from Operations.', time: '08:55' }
      ]
    },
    {
      id: 'c3', name: 'Prof. Rohan Verma', role: 'Faculty', presence: 'Away', unread: 0, time: 'Yesterday',
      messages: [
        { from: 'them', text: 'Uploaded the Signals and Systems lecture series to the resources portal.', time: '16:10' },
        { from: 'me', text: 'Thanks, Professor. I have moved it to Published.', time: '16:24' }
      ]
    },
    {
      id: 'c4', name: 'Mira Kapoor', role: 'Student', presence: 'Offline', unread: 0, time: 'Yesterday',
      messages: [
        { from: 'them', text: 'Sir, my registration status still shows pending. Could you check?', time: '11:02' },
        { from: 'me', text: 'Your documents are verified. Approval will reflect within 24 hours.', time: '11:30' },
        { from: 'them', text: 'Thank you so much!', time: '11:31' }
      ]
    },
    {
      id: 'c5', name: 'Accounts Office', role: 'Department', presence: 'Active today', unread: 0, time: 'Mon',
      messages: [
        { from: 'them', text: 'Fee reminder notice is ready for publishing. Awaiting your approval.', time: '14:05' },
        { from: 'me', text: 'Approved. Publish it under Administrative.', time: '14:20' }
      ]
    },
    {
      id: 'c6', name: 'Dr. Meera Nair', role: 'Faculty', presence: 'Offline', unread: 0, time: 'Mon',
      messages: [
        { from: 'them', text: 'Requesting leave from 12 to 14 September for a conference.', time: '10:15' },
        { from: 'me', text: 'Approved. Please arrange a substitute for your Thermodynamics lectures.', time: '10:40' }
      ]
    }
  ];

  let activeId = conversations[0].id;
  let showUnreadOnly = false;

  function initials(name) {
    return name.split(' ').filter(Boolean).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
  }
  function getActive() {
    return conversations.find(function (c) { return c.id === activeId; }) || conversations[0];
  }

  /* ---------- stats ---------- */
  function renderStats() {
    if (!statsHost) return;
    const glyph = (window.VectorOneAdmin && window.VectorOneAdmin.icons && window.VectorOneAdmin.icons.messages) || '';
    const unread = conversations.reduce(function (sum, c) { return sum + c.unread; }, 0);
    const total = conversations.reduce(function (sum, c) { return sum + c.messages.length; }, 0);
    const stats = [
      { label: 'Conversations', value: conversations.length, trend: 'Across campus', tone: 'blue' },
      { label: 'Unread', value: unread, trend: unread ? 'Needs a reply' : 'All caught up', tone: 'orange' },
      { label: 'Total Messages', value: total, trend: 'This week', tone: 'purple' },
      { label: 'Avg Response', value: '18m', trend: '-4m vs last week', tone: 'green' }
    ];
    statsHost.innerHTML = stats.map(function (item) {
      return '<article class="stat-card stat-card--' + item.tone + '">' +
        '<div class="stat-card-top"><div class="stat-icon stat-icon--' + item.tone + '">' + glyph + '</div></div>' +
        '<p class="stat-value">' + esc(item.value) + '</p>' +
        '<p class="stat-label">' + esc(item.label) + '</p>' +
        '<span class="stat-trend stat-trend--up">↗ ' + esc(item.trend) + '</span>' +
        '</article>';
    }).join('');
  }

  /* ---------- conversation list ---------- */
  function visibleConversations() {
    const query = ((searchInput && searchInput.value) || '').trim().toLowerCase();
    return conversations.filter(function (c) {
      if (showUnreadOnly && !c.unread) return false;
      if (!query) return true;
      const last = c.messages.length ? c.messages[c.messages.length - 1].text : '';
      return (c.name + ' ' + c.role + ' ' + last).toLowerCase().includes(query);
    });
  }

  function renderList() {
    const items = visibleConversations();
    if (!items.length) {
      listHost.innerHTML = '<p class="empty-state">No conversations match your search.</p>';
      return;
    }
    listHost.innerHTML = items.map(function (c) {
      const last = c.messages.length ? c.messages[c.messages.length - 1].text : '';
      return '<button type="button" class="conversation-item' + (c.id === activeId ? ' is-active' : '') + '" data-conversation="' + esc(c.id) + '">' +
        '<span class="conversation-avatar">' + esc(initials(c.name)) + '</span>' +
        '<span class="conversation-copy">' +
          '<span class="conversation-top"><strong>' + esc(c.name) + '</strong><time>' + esc(c.time) + '</time></span>' +
          '<span class="conversation-preview">' + esc(last) + '</span>' +
        '</span>' +
        (c.unread ? '<span class="conversation-unread">' + c.unread + '</span>' : '') +
        '</button>';
    }).join('');
  }

  /* ---------- thread ---------- */
  function renderThread() {
    const c = getActive();
    if (threadTitle) threadTitle.textContent = c.name;
    if (threadMeta) threadMeta.textContent = c.role + ' · ' + c.presence;
    threadHost.innerHTML = c.messages.map(function (m) {
      return '<div class="message-bubble ' + (m.from === 'me' ? 'is-outgoing' : 'is-incoming') + '">' +
        esc(m.text) + '<time>' + esc(m.time) + '</time></div>';
    }).join('');
    // Jump to the newest message.
    threadHost.scrollTop = threadHost.scrollHeight;
  }

  function selectConversation(id) {
    activeId = id;
    const c = getActive();
    c.unread = 0;              // opening a thread marks it read
    renderList();
    renderThread();
    renderStats();
  }

  /* ---------- events ---------- */
  listHost.addEventListener('click', function (event) {
    const button = event.target.closest('[data-conversation]');
    if (!button) return;
    selectConversation(button.dataset.conversation);
  });

  if (searchInput) searchInput.addEventListener('input', renderList);

  if (composer) {
    composer.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!composerInput) return;
      const text = composerInput.value.trim();
      if (!text) return;
      const now = new Date();
      getActive().messages.push({
        from: 'me',
        text: text,
        time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
      });
      composerInput.value = '';
      renderThread();
      renderList();
      renderStats();
    });
  }

  if (filterBtn) {
    filterBtn.addEventListener('click', function () {
      showUnreadOnly = !showUnreadOnly;
      filterBtn.textContent = showUnreadOnly ? 'Unread' : 'Inbox';
      filterBtn.setAttribute('aria-pressed', String(showUnreadOnly));
      renderList();
    });
  }

  if (replyBtn && composerInput) {
    replyBtn.addEventListener('click', function () { composerInput.focus(); });
  }
  if (forwardBtn && composerInput) {
    forwardBtn.addEventListener('click', function () {
      const c = getActive();
      const last = c.messages.length ? c.messages[c.messages.length - 1].text : '';
      composerInput.value = 'Forwarded from ' + c.name + ': ' + last;
      composerInput.focus();
    });
  }
  if (composeBtn && composerInput) {
    composeBtn.addEventListener('click', function () {
      composerInput.value = '';
      composerInput.focus();
    });
  }
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () { renderStats(); renderList(); renderThread(); });
  }

  renderStats();
  renderList();
  renderThread();
}());
