/* Admin messages — page logic connected to PostgreSQL and Socket.IO */
(function () {
  'use strict';

  const esc = (window.VectorOneAdmin && window.VectorOneAdmin.escapeHtml) || function (v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* ---------- elements ---------- */
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

  const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
  let conversations = [];
  let activeId = null;
  let showUnreadOnly = false;
  let socket = null;

  function getAuthToken() {
    return localStorage.getItem('vectorone_token') || '';
  }

  function getAuthHeader() {
    const token = getAuthToken();
    return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  function initials(name) {
    if (!name) return 'U';
    return name.split(' ').filter(Boolean).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
  }

  function getActive() {
    return conversations.find(function (c) { return c.id === activeId; }) || conversations[0] || null;
  }

  /* ---------- stats ---------- */
  function renderStats() {
    if (!statsHost) return;
    const glyph = (window.VectorOneAdmin && window.VectorOneAdmin.icons && window.VectorOneAdmin.icons.messages) || '';
    const unread = conversations.reduce(function (sum, c) { return sum + (c.unreadCount || 0); }, 0);
    const total = conversations.reduce(function (sum, c) { return sum + (c.messages ? c.messages.length : 0); }, 0);
    const stats = [
      { label: 'Conversations', value: conversations.length, trend: 'Across campus', tone: 'blue' },
      { label: 'Unread', value: unread, trend: unread ? 'Needs a reply' : 'All caught up', tone: 'orange' },
      { label: 'Total Messages', value: total, trend: 'This system', tone: 'purple' },
      { label: 'Status', value: 'Active', trend: 'Socket connected', tone: 'green' }
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
      if (showUnreadOnly && !c.unreadCount) return false;
      if (!query) return true;
      const last = c.lastMessage || '';
      return ((c.name || '') + ' ' + (c.role || '') + ' ' + last).toLowerCase().includes(query);
    });
  }

  function renderList() {
    const items = visibleConversations();
    if (!items.length) {
      listHost.innerHTML = '<p class="empty-state">No conversations match your search.</p>';
      return;
    }
    listHost.innerHTML = items.map(function (c) {
      const timeStr = c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return '<button type="button" class="conversation-item' + (c.id === activeId ? ' is-active' : '') + '" data-conversation="' + esc(c.id) + '">' +
        '<span class="conversation-avatar">' + esc(initials(c.name)) + '</span>' +
        '<span class="conversation-copy">' +
          '<span class="conversation-top"><strong>' + esc(c.name) + '</strong><time>' + esc(timeStr) + '</time></span>' +
          '<span class="conversation-preview">' + esc(c.lastMessage || c.role || '') + '</span>' +
        '</span>' +
        (c.unreadCount ? '<span class="conversation-unread">' + c.unreadCount + '</span>' : '') +
        '</button>';
    }).join('');
  }

  /* ---------- thread ---------- */
  function renderThread() {
    const c = getActive();
    if (!c) {
      if (threadTitle) threadTitle.textContent = 'No conversation selected';
      if (threadMeta) threadMeta.textContent = '';
      if (threadHost) threadHost.innerHTML = '<p class="empty-state">Select a conversation from the list.</p>';
      return;
    }

    if (threadTitle) threadTitle.textContent = c.name;
    if (threadMeta) threadMeta.textContent = (c.role || 'User') + ' · Active';

    if (threadHost) {
      const msgs = c.messages || [];
      if (!msgs.length) {
        threadHost.innerHTML = '<p class="empty-state">No messages in this conversation yet.</p>';
      } else {
        threadHost.innerHTML = msgs.map(function (m) {
          const isOutgoing = m.from === 'me' || m.from === 'out' || m.isSelf;
          const timeStr = m.time || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
          return '<div class="message-bubble ' + (isOutgoing ? 'is-outgoing' : 'is-incoming') + '">' +
            esc(m.text) + '<time>' + esc(timeStr) + '</time></div>';
        }).join('');
      }
      threadHost.scrollTop = threadHost.scrollHeight;
    }
  }

  function selectConversation(id) {
    activeId = id;
    const c = getActive();
    if (c) c.unreadCount = 0;

    renderList();
    renderThread();
    renderStats();

    // Mark as read in API
    fetch(API_BASE + '/admin/messages/' + id, { headers: getAuthHeader() }).catch(function () {});

    // Socket join
    if (socket && socket.connected) {
      socket.emit('conversation:join', { conversationId: id });
    }
  }

  function loadLiveAdminMessages() {
    fetch(API_BASE + '/admin/messages', { headers: getAuthHeader() })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success && Array.isArray(res.data)) {
          conversations = res.data;
          if (conversations.length > 0) {
            if (!activeId || !conversations.some(c => c.id === activeId)) {
              activeId = conversations[0].id;
            }
          }
          renderStats();
          renderList();
          renderThread();
        }
      })
      .catch(function (e) { console.warn('Failed to load admin messages:', e); });
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
      const activeC = getActive();
      if (!activeC) return;

      composerInput.value = '';

      fetch(API_BASE + '/admin/messages', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ conversationId: activeC.id, text: text })
      })
        .then(function (res) { return res.json(); })
        .then(function (res) {
          if (res.success && res.data) {
            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const newMsg = {
              id: res.data.id,
              from: 'me',
              isSelf: true,
              text: res.data.text,
              time: nowTime
            };
            if (!activeC.messages) activeC.messages = [];
            activeC.messages.push(newMsg);
            activeC.lastMessage = res.data.text;
            activeC.updatedAt = res.data.createdAt || new Date().toISOString();

            renderThread();
            renderList();
            renderStats();
          }
        })
        .catch(function (e) { console.error('Failed to send admin message:', e); });
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
      const last = c && c.lastMessage ? c.lastMessage : '';
      composerInput.value = 'Forwarded from ' + (c ? c.name : '') + ': ' + last;
      composerInput.focus();
    });
  }
  if (composeBtn) {
    composeBtn.addEventListener('click', function () {
      const title = prompt('Enter Announcement Title:');
      if (!title) return;
      const text = prompt('Enter Announcement Message:');
      if (!text) return;

      fetch(API_BASE + '/admin/messages/broadcast', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ title: title, text: text })
      })
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            alert('Broadcast announcement published successfully!');
            loadLiveAdminMessages();
          } else {
            alert(res.message || 'Failed to send broadcast');
          }
        })
        .catch(() => alert('Failed to send broadcast announcement'));
    });
  }
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadLiveAdminMessages);
  }

  // Socket.IO Setup
  function initSocket() {
    const token = getAuthToken();
    if (!token || typeof window.io !== 'function') return;

    try {
      const socketHost = window.VECTORONE_SOCKET_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : window.location.origin);
      socket = window.io(socketHost, {
        auth: { token: token },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', function () {
        if (activeId) {
          socket.emit('conversation:join', { conversationId: activeId });
        }
      });

      socket.on('message:received', function (data) {
        if (!data) return;
        const conv = conversations.find(c => c.id === data.conversationId);
        const currentUser = JSON.parse(localStorage.getItem('vectorone_user') || '{}');
        const isSelf = data.senderId === currentUser.id;

        const newMsg = {
          id: data.id,
          from: isSelf ? 'me' : 'them',
          isSelf: isSelf,
          text: data.text,
          time: data.time || new Date(data.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        if (conv) {
          conv.lastMessage = data.text;
          conv.updatedAt = data.createdAt || new Date().toISOString();
          if (!conv.messages) conv.messages = [];
          if (!conv.messages.some(m => m.id === data.id)) {
            conv.messages.push(newMsg);
          }
        }

        if (data.conversationId === activeId) {
          if (!isSelf) {
            renderThread();
          }
        }
        renderList();
        renderStats();
      });
    } catch (err) {
      console.warn('Admin socket init warning:', err);
    }
  }

  loadLiveAdminMessages();
  initSocket();
}());
