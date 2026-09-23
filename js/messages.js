/* Student messages — page logic with full PostgreSQL integration & Socket.IO real-time delivery */
(function () {
  'use strict';

  const list = document.getElementById('chatList');
  const bubbles = document.getElementById('chatBubbles');
  const threadName = document.getElementById('chatThreadName');
  const threadStatus = document.getElementById('chatThreadStatus');
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageBtn');

  if (!bubbles || !list) return;

  const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
  let conversations = [];
  let activeConvId = null;
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
    return name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getActiveConv() {
    return conversations.find(c => c.id === activeConvId) || conversations[0] || null;
  }

  function renderList() {
    if (!list) return;
    if (conversations.length === 0) {
      list.innerHTML = '<div class="chat-item"><div class="chat-meta"><strong>No conversations yet</strong><span>Start a chat or announcement</span></div></div>';
      return;
    }

    list.innerHTML = conversations.map(c => {
      const isActive = c.id === activeConvId;
      const timeStr = c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
      return `<div class="chat-item ${isActive ? 'is-active' : ''}" data-chat="${esc(c.id)}">
        <div class="chat-avatar">${esc(initials(c.name))}</div>
        <div class="chat-meta">
          <strong>${esc(c.name)}</strong>
          <span>${esc(c.lastMessage || c.role || '')}</span>
        </div>
        ${timeStr ? `<div class="chat-time">${esc(timeStr)}</div>` : ''}
      </div>`;
    }).join('');
  }

  function addBubble(message) {
    if (!bubbles) return;
    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + (message.from === 'out' || message.isSelf ? 'outgoing' : 'incoming');
    const body = document.createElement('p');
    body.textContent = message.text;
    const stamp = document.createElement('time');
    stamp.textContent = message.time || (message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');
    bubble.appendChild(body);
    bubble.appendChild(stamp);
    bubbles.appendChild(bubble);
  }

  function renderThread() {
    const conv = getActiveConv();
    if (!conv) {
      if (threadName) threadName.textContent = 'No conversation selected';
      if (threadStatus) threadStatus.textContent = '';
      if (bubbles) bubbles.innerHTML = '';
      return;
    }

    if (threadName) threadName.textContent = conv.name;
    if (threadStatus) threadStatus.textContent = conv.role + ' · Active';
    if (bubbles) {
      bubbles.innerHTML = '';
      (conv.messages || []).forEach(addBubble);
      bubbles.scrollTop = bubbles.scrollHeight;
    }
  }

  function selectThread(convId) {
    activeConvId = convId;
    renderList();
    renderThread();

    // Mark as read in backend
    fetch(API_BASE + '/messages/' + convId + '/read', {
      method: 'POST',
      headers: getAuthHeader()
    }).catch(() => {});

    // Join Socket.IO room if connected
    if (socket && socket.connected) {
      socket.emit('conversation:join', { conversationId: convId });
    }
  }

  function fetchLiveMessages() {
    fetch(API_BASE + '/messages', { headers: getAuthHeader() })
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          conversations = res.data;
          if (conversations.length > 0) {
            if (!activeConvId || !conversations.some(c => c.id === activeConvId)) {
              activeConvId = conversations[0].id;
            }
          }
          renderList();
          renderThread();
        }
      })
      .catch(e => console.warn('Failed to fetch messages:', e));
  }

  function sendMessage() {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const activeC = getActiveConv();
    if (!activeC) return;

    input.value = '';

    fetch(API_BASE + '/messages', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ conversationId: activeC.id, text: text })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          const msgObj = {
            id: res.data.id,
            from: 'out',
            isSelf: true,
            text: res.data.text,
            time: new Date(res.data.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          };
          if (!activeC.messages) activeC.messages = [];
          activeC.messages.push(msgObj);
          activeC.lastMessage = res.data.text;
          activeC.updatedAt = res.data.createdAt;
          addBubble(msgObj);
          renderList();
          if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;
        }
      })
      .catch(e => console.error('Failed to send message:', e));
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

      socket.on('connect', () => {
        if (activeConvId) {
          socket.emit('conversation:join', { conversationId: activeConvId });
        }
      });

      socket.on('message:received', (data) => {
        if (!data) return;
        const conv = conversations.find(c => c.id === data.conversationId);
        const currentUser = JSON.parse(localStorage.getItem('vectorone_user') || '{}');
        const isSelf = data.senderId === currentUser.id;

        const newMsg = {
          id: data.id,
          from: isSelf ? 'out' : 'in',
          isSelf: isSelf,
          text: data.text,
          time: data.time || new Date(data.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        };

        if (conv) {
          conv.lastMessage = data.text;
          conv.updatedAt = data.createdAt || new Date().toISOString();
          if (!conv.messages) conv.messages = [];
          if (!conv.messages.some(m => m.id === data.id)) {
            conv.messages.push(newMsg);
          }
        }

        if (data.conversationId === activeConvId) {
          if (!isSelf) {
            addBubble(newMsg);
            if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;
          }
        }
        renderList();
      });
    } catch (err) {
      console.warn('Socket.IO connection warning:', err);
    }
  }

  if (list) {
    list.addEventListener('click', function (event) {
      const item = event.target.closest('[data-chat]');
      if (!item) return;
      selectThread(item.dataset.chat);
    });
  }

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (input) {
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  fetchLiveMessages();
  initSocket();
})();
