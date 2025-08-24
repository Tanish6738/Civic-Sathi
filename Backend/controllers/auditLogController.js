'use strict';

const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Report = require('../models/Report');
const mongoose = require('mongoose');

function respond(res, { success = true, status = 200, data = null, message = '' }) {
  return res.status(status).json({ success, data, message });
}

// POST /api/audit-logs
exports.createAuditLog = async (req, res) => {
  try {
  const { user, action, report, meta } = req.body || {};
    if (!user || !action) {
      return respond(res, { success: false, status: 400, message: 'user and action are required' });
    }
    // Basic existence checks (non-blocking if performance needed)
    if (!mongoose.Types.ObjectId.isValid(user)) {
      return respond(res, { success: false, status: 400, message: 'Invalid user id format' });
    }
    const userExists = await User.exists({ _id: user });
    if (!userExists) return respond(res, { success: false, status: 400, message: 'Invalid user id' });
    if (report) {
      if (!mongoose.Types.ObjectId.isValid(report)) {
        return respond(res, { success: false, status: 400, message: 'Invalid report id format' });
      }
      const repExists = await Report.exists({ _id: report });
      if (!repExists) return respond(res, { success: false, status: 400, message: 'Invalid report id' });
    }
    const log = await AuditLog.create({ user, action: action.trim(), report: report || undefined, meta });
    return respond(res, { data: log, message: 'Audit log created' });
  } catch (err) {
    console.error('createAuditLog error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/audit-logs
exports.listAuditLogs = async (req, res) => {
  try {
    const { user: userId, report: reportId, action, page = 1, limit = 50 } = req.query;
    const filters = {};
    if (userId) filters.user = userId;
    if (reportId) filters.report = reportId;
    if (action) filters.action = new RegExp(`^${action}$`, 'i');
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;
    const [items, total] = await Promise.all([
      AuditLog.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('user', 'name email role').populate('report', 'title status'),
      AuditLog.countDocuments(filters)
    ]);
    return respond(res, { data: { items, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 } } });
  } catch (err) {
    console.error('listAuditLogs error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/audit-logs/:id
exports.getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
  if (!mongoose.Types.ObjectId.isValid(id)) return respond(res, { success: false, status: 400, message: 'Invalid id format' });
    const log = await AuditLog.findById(id).populate('user', 'name email role').populate('report', 'title status');
    if (!log) return respond(res, { success: false, status: 404, message: 'Audit log not found' });
    return respond(res, { data: log });
  } catch (err) {
    console.error('getAuditLogById error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};
