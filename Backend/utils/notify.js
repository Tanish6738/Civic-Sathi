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

module.exports = { notifyUsers, notifyMisroute, notifyAwaitingVerification };
