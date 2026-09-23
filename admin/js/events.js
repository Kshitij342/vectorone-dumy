/* Admin events — page logic connected to PostgreSQL API. */
(function () {
  'use strict';
  if (!window.VectorOneAdmin || !window.VectorOneAdmin.createTablePage) return;
  const esc = window.VectorOneAdmin.escapeHtml;

  const events = [];

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function prettyDate(iso) {
    if (!iso) return '—';
    const parts = String(iso).split('T')[0].split('-');
    if (parts.length !== 3) return esc(iso);
    return MONTHS[Number(parts[1]) - 1] + ' ' + parts[2] + ', ' + parts[0];
  }
  function isUpcoming(iso) { return iso ? new Date(iso).getTime() >= Date.now() : true; }
  function isThisMonth(iso) {
    if (!iso) return false;
    const d = new Date(iso), n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }

  window.VectorOneAdmin.createTablePage({
    prefix: 'event',
    statIcon: 'events',
    idKey: 'id',
    labelKey: 'title',
    data: events,
    searchFields: ['title', 'summary', 'description', 'category', 'venue', 'coordinator'],
    stats: [
      { label: 'Total Events', value: '0', trend: 'From database', tone: 'blue' },
      { label: 'Open / Upcoming', value: '0', trend: 'Accepting entries', tone: 'green' },
      { label: 'Total Registrations', value: '0', trend: 'In system', tone: 'purple' },
      { label: 'Completed', value: '0', trend: 'Past events', tone: 'orange' }
    ],
    filters: [
      { id: 'eventCategoryFilter', field: 'category', label: 'Category' },
      { id: 'eventStatusFilter', field: 'status', label: 'Status' },
      {
        id: 'dateFilter', field: 'date', label: 'Date',
        match: function (row, wanted) {
          if (wanted === 'Upcoming') return isUpcoming(row.date);
          if (wanted === 'This Month') return isThisMonth(row.date);
          return true;
        }
      }
    ],
    defaultSort: function (a, b) { return (b.date || '').localeCompare(a.date || ''); },
    columns: [
      { cellClass: 'event-name', cell: function (r) { return '<strong>' + esc(r.title) + '</strong><span>' + esc(r.summary || r.description || '') + '</span>'; } },
      { cell: function (r) { return '<span class="event-category">' + esc(r.category || 'General') + '</span>'; } },
      { cellClass: 'event-date', cell: function (r) { return prettyDate(r.date) + '<span>' + (isUpcoming(r.date) ? 'Upcoming' : 'Past') + '</span>'; } },
      { cell: function (r) { return esc(r.venue || 'Campus'); } },
      { cell: function (r) { return esc(r.coordinator || 'Admin'); } },
      {
        cellClass: 'event-registrations',
        cell: function (r) {
          const cap = r.capacity || 100;
          const reg = r.registered || 0;
          const pct = Math.min(Math.round((reg / cap) * 100), 100);
          return '<div class="reg-count"><strong>' + reg + '</strong><span>of ' + cap + '</span></div>' +
            '<div class="reg-bar' + (pct >= 100 ? ' is-full' : '') + '"><span style="width:' + pct + '%"></span></div>';
        }
      },
      { cell: function (r) { const st = (r.status || 'Upcoming').toString(); return '<span class="status-badge ' + esc(st.toLowerCase()) + '">' + esc(st) + '</span>'; } }
    ],
    detail: function (r) {
      const cap = r.capacity || 100;
      const reg = r.registered || 0;
      return '<div class="detail-grid">' +
        '<div><span>Event</span><strong>' + esc(r.title) + '</strong></div>' +
        '<div><span>Category</span><strong>' + esc(r.category || 'General') + '</strong></div>' +
        '<div><span>Date</span><strong>' + prettyDate(r.date) + '</strong></div>' +
        '<div><span>Venue</span><strong>' + esc(r.venue || 'Campus Auditorium') + '</strong></div>' +
        '<div><span>Coordinator</span><strong>' + esc(r.coordinator || 'Admin') + '</strong></div>' +
        '<div><span>Registrations</span><strong>' + reg + ' / ' + cap + '</strong></div>' +
        '<div><span>Status</span><strong>' + esc(r.status || 'Upcoming') + '</strong></div>' +
        '<div><span>Summary</span><strong>' + esc(r.summary || r.description || '') + '</strong></div>' +
      '</div>';
    },
    form: [
      { name: 'title', label: 'Event Title', full: true, required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Workshop', 'Seminar', 'Cultural', 'Placement', 'Hackathon', 'Sports'] },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'venue', label: 'Venue', required: true },
      { name: 'capacity', label: 'Capacity', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'] },
      { name: 'summary', label: 'Summary', type: 'textarea', full: true }
    ],
    newRecord: function (rows) {
      return { id: '', title: '', category: 'Workshop', date: new Date().toISOString().slice(0, 10), venue: 'Main Auditorium', coordinator: 'Admin', registered: 0, capacity: 100, status: 'Upcoming', summary: '' };
    },
    viewTitle: 'Event Details',
    editTitle: 'Edit Event',
    addTitle: 'Add Event',
    deleteTitle: 'Delete Event',
    addId: 'addEventBtn',
    refreshId: 'refreshEventsBtn',
    exportId: 'exportEventsBtn',
    csv: {
      filename: 'events.csv',
      headers: ['ID', 'Event', 'Category', 'Date', 'Venue', 'Coordinator', 'Registered', 'Capacity', 'Status'],
      row: function (r) { return [r.id, r.title, r.category, r.date, r.venue, r.coordinator, r.registered, r.capacity, r.status]; }
    }
  });
}());
