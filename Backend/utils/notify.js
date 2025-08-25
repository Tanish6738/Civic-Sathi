'use strict';
const Notification = require('../models/Notification');
const User = require('../models/User');
const Report = require('../models/Report');

async function notifyUsers(userIds, type, { refReport, payload } = {}) {
  if (!Array.isArray(userIds) || userIds.length === 0) return 0;
  const docs = userIds.map(u => ({ user: u, type, refReport, payload }));
  await Notification.insertMany(docs);
  return docs.length;
}

async function notifyMisroute(report) {
  const reporterId = report.reporter;
  // admins and superadmins
  const admins = await User.find({ role: { $in: ['admin','superadmin'] } }).select('_id').lean();
  const ids = [reporterId, ...admins.map(a => a._id)];
  return notifyUsers(ids, 'report.misrouted', { refReport: report._id, payload: { reason: report.misrouteReason } });
}

async function notifyAwaitingVerification(report) {
  return notifyUsers([report.reporter], 'report.awaiting_verification', { refReport: report._id });
}

// Generic status-based notifications (extend as needed)
async function notifyReportStatus(report, newStatus, actor) {
  if (!report) return 0;
  const basePayload = { status: newStatus, actor: actor?._id };
  switch (newStatus) {
    case 'assigned':
      if (Array.isArray(report.assignedTo) && report.assignedTo.length) {
        return notifyUsers([...new Set([report.reporter, ...report.assignedTo])], 'report.assigned', { refReport: report._id, payload: { ...basePayload, officerName: actor?.name } });
      }
      break;
    case 'closed':
      return notifyUsers([report.reporter], 'report.closed', { refReport: report._id, payload: basePayload });
    case 'verified':
      return notifyUsers([report.reporter], 'report.verified', { refReport: report._id, payload: basePayload });
    default:
      return 0;
  }
  return 0;
}

module.exports = { notifyUsers, notifyMisroute, notifyAwaitingVerification, notifyReportStatus };
