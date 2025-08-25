'use strict';

// Registry of notification type -> message formatter.
// Keep side‑effect free. Frontend may mirror this mapping for fallback display.
// Each formatter receives the notification document plain object.

const formatters = {
  'report.misrouted': (n) => `Your report was marked misrouted${n?.payload?.reason ? ': ' + n.payload.reason : ''}.`,
  'report.awaiting_verification': () => 'Your report is awaiting verification.',
  'report.closed': () => 'Your report has been closed.',
  'report.assigned': (n) => `A report was assigned to ${n?.payload?.officerName || 'an officer'}.`,
  'report.verified': () => 'Your report was verified.',
};

function formatNotification(n){
  if (!n || !n.type) return '';
  const fn = formatters[n.type];
  try { return fn ? fn(n) : n.type; } catch(_) { return n.type; }
}

module.exports = { formatNotification, formatters };