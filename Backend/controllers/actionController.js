'use strict';

const Action = require('../models/Action');
const Report = require('../models/Report');
const User = require('../models/User');
const mongoose = require('mongoose');

function respond(res, { success = true, status = 200, data = null, message = '' }) {
  return res.status(status).json({ success, data, message });
}

function normalizePhotos(arr) {
  if (!arr) return [];
  if (!Array.isArray(arr)) arr = [arr];
  return arr
    .map(p => {
      if (!p) return null;
      if (typeof p === 'string') return { url: p };
      if (p.url) return { url: String(p.url), type: p.type };
      return null;
    })
    .filter(Boolean);
}

// POST /api/actions
exports.createAction = async (req, res) => {
  try {
    const { report, officer, note, photos } = req.body || {};
    if (!report || !officer) {
      return respond(res, { success: false, status: 400, message: 'report and officer are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(report)) {
      return respond(res, { success: false, status: 400, message: 'Invalid report id format' });
    }
    if (!mongoose.Types.ObjectId.isValid(officer)) {
      return respond(res, { success: false, status: 400, message: 'Invalid officer id format' });
    }
    const [repDoc, officerDoc] = await Promise.all([
      Report.findById(report).select('_id'),
      User.findById(officer).select('_id role')
    ]);
    if (!repDoc) return respond(res, { success: false, status: 400, message: 'Invalid report id' });
    if (!officerDoc) return respond(res, { success: false, status: 400, message: 'Invalid officer id' });
    const act = await Action.create({
      report: repDoc._id,
      officer: officerDoc._id,
      note: note?.trim(),
      photos: normalizePhotos(photos)
    });
    return respond(res, { data: act, message: 'Action created' });
  } catch (err) {
    console.error('createAction error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/actions
exports.listActions = async (req, res) => {
  try {
    const { report: reportId, officer: officerId, page = 1, limit = 50 } = req.query;
    const filters = {};
    if (reportId) {
      if (!mongoose.Types.ObjectId.isValid(reportId)) {
        return respond(res, { data: { items: [], pagination: { page: 1, limit: parseInt(limit,10)||50, total: 0, totalPages: 1 } } });
      }
      filters.report = reportId;
    }
    if (officerId) {
      if (!mongoose.Types.ObjectId.isValid(officerId)) {
        return respond(res, { data: { items: [], pagination: { page: 1, limit: parseInt(limit,10)||50, total: 0, totalPages: 1 } } });
      }
      filters.officer = officerId;
    }
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    const [items, total] = await Promise.all([
      Action.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('officer', 'name role').populate('report', 'title status'),
      Action.countDocuments(filters)
    ]);
    return respond(res, { data: { items, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 } } });
  } catch (err) {
    console.error('listActions error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/actions/:id
exports.getActionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
  if (!mongoose.Types.ObjectId.isValid(id)) return respond(res, { success: false, status: 400, message: 'Invalid id format' });
    const act = await Action.findById(id).populate('officer', 'name role').populate('report', 'title status');
    if (!act) return respond(res, { success: false, status: 404, message: 'Action not found' });
    return respond(res, { data: act });
  } catch (err) {
    console.error('getActionById error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/actions/:id
exports.updateAction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
  if (!mongoose.Types.ObjectId.isValid(id)) return respond(res, { success: false, status: 400, message: 'Invalid id format' });
    const act = await Action.findById(id);
    if (!act) return respond(res, { success: false, status: 404, message: 'Action not found' });
    const { note, photos } = req.body || {};
    if (note) act.note = note.trim();
    if (photos) act.photos = [...act.photos, ...normalizePhotos(photos)];
    await act.save();
    return respond(res, { data: act, message: 'Action updated' });
  } catch (err) {
    console.error('updateAction error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// DELETE /api/actions/:id (hard delete)
exports.deleteAction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    const act = await Action.findByIdAndDelete(id);
    if (!act) return respond(res, { success: false, status: 404, message: 'Action not found' });
    return respond(res, { data: act, message: 'Action deleted' });
  } catch (err) {
    console.error('deleteAction error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};
