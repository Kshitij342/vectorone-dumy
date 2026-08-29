/* Student messages — page logic.
   Extracted from the inline <script> that used to live in messages.html, with
   null guards added, the conversation list wired up, and message text inserted
   as text rather than raw HTML. Frontend-only: threads live in memory. */
(function () {
  'use strict';

  const list = document.getElementById('chatList');
  const bubbles = document.getElementById('chatBubbles');
  const threadName = document.getElementById('chatThreadName');
  const threadStatus = document.getElementById('chatThreadStatus');
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageBtn');

  // Not the messages page — do nothing.
  if (!bubbles) return;

  /* Demo threads, keyed by the data-chat value on each conversation row. */
  const threads = {
    rao: {
      name: 'Dr. Rao',
      status: 'Online',
      messages: [
        { from: 'in', text: 'Your normalized ER diagram is close. Add the relationship between Student and Enrollment before submission.', time: '9:12 AM' },
        { from: 'out', text: 'Thanks, I’ll revise the cardinality and resubmit before 11:59 PM.', time: '9:14 AM' },
        { from: 'in', text: 'Great. Don’t forget to include the composite key and the faculty assignment.', time: '9:15 AM' }
      ]
    },
    ananya: {
      name: 'Ananya',
      status: 'Last seen 18m ago',
      messages: [
        { from: 'in', text: 'Are we still meeting at 4 to split the project modules?', time: '8:40 AM' },
        { from: 'out', text: 'Yes — library, second floor. I’ll bring the API notes.', time: '8:52 AM' },
        { from: 'in', text: 'Perfect. I’ll take the frontend and you take the schema.', time: '8:55 AM' }
      ]
    },
    placement: {
      name: 'Placement Cell',
      status: 'Official channel',
      messages: [
        { from: 'in', text: 'TCS campus drive is confirmed for 2 October. Registration closes on 25 September.', time: 'Yesterday' },
        { from: 'out', text: 'Registered. Is the aptitude round online or on campus?', time: 'Yesterday' },
        { from: 'in', text: 'On campus, in the placement block. Carry your ID card and two resume copies.', time: 'Yesterday' }
      ]
    },
    affairs: {
      name: 'Student Affairs',
      status: 'Official channel',
      messages: [
        { from: 'in', text: 'The merit-cum-means scholarship window is open until the end of the month.', time: 'Mon' },
        { from: 'out', text: 'Which documents do I need to submit?', time: 'Mon' },
        { from: 'in', text: 'Income certificate, last semester marksheet and a copy of your fee receipt.', time: 'Mon' }
      ]
    }
  };

  let activeKey = 'rao';

  function addBubble(message) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + (message.from === 'out' ? 'outgoing' : 'incoming');
    const body = document.createElement('p');
    body.textContent = message.text;          // text, not innerHTML — no injection
    const stamp = document.createElement('time');
    stamp.textContent = message.time;
    bubble.appendChild(body);
    bubble.appendChild(stamp);
    bubbles.appendChild(bubble);
  }

  function renderThread() {
    const thread = threads[activeKey];
    if (!thread) return;
    if (threadName) threadName.textContent = thread.name;
    if (threadStatus) threadStatus.textContent = thread.status;
    bubbles.innerHTML = '';
    thread.messages.forEach(addBubble);
    bubbles.scrollTop = bubbles.scrollHeight;
  }

  function selectThread(key) {
    if (!threads[key]) return;
    activeKey = key;
    if (list) {
      list.querySelectorAll('[data-chat]').forEach(function (item) {
        item.classList.toggle('is-active', item.dataset.chat === key);
      });
    }
    renderThread();
  }

  const API_BASE = window.VECTORONE_API_URL || 'http://localhost:5000/api';
  function getAuthHeader() {
    const token = localStorage.getItem('vectorone_token');
    return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  function fetchLiveMessages() {
    fetch(API_BASE + '/messages', { headers: getAuthHeader() })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          // Sync with first conversation if found
          const conv = res.data[0];
          if (conv && conv.messages && conv.messages.length > 0) {
            threads.rao.messages = conv.messages.map(function (m) {
              return {
                from: m.senderId === (JSON.parse(localStorage.getItem('vectorone_user') || '{}').id) ? 'out' : 'in',
                text: m.text,
                time: new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              };
            });
            renderThread();
          }
        }
      })
      .catch(function () {});
  }

  function sendMessage() {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const message = {
      from: 'out',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    };
    const thread = threads[activeKey];
    if (thread) thread.messages.push(message);
    addBubble(message);
    input.value = '';
    bubbles.scrollTop = bubbles.scrollHeight;
    input.focus();

    // Send to backend API
    fetch(API_BASE + '/messages', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ text: text })
    }).catch(function (e) { console.warn(e); });
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
      if (event.key === 'Enter') { event.preventDefault(); sendMessage(); }
    });
  }

  renderThread();
  fetchLiveMessages();
})();
