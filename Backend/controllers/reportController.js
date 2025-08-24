'use strict';

const Report = require('../models/Report');
const User = require('../models/User');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const { categorizeReportAI } = require('../utils/aiCategorizer');
const Department = require('../models/Department');

// Consistent response helper
function respond(res, { success = true, status = 200, data = null, message = '' }) {
  return res.status(status).json({ success, data, message });
}

// Helper to normalize array of photo urls/objects to schema shape
function normalizePhotos(arr) {
  if (!arr) return [];
  if (!Array.isArray(arr)) arr = [arr];
  return arr
    .map(p => {
      if (!p) return null;
      if (typeof p === 'string') return { url: p.trim() };
      if (p.url) return { url: String(p.url).trim(), meta: p.meta };
      return null;
    })
    .filter(Boolean);
}

// POST /api/reports
// Create a new report
exports.createReport = async (req, res) => {
  try {
    const {
      title,
      description,
      department,
      categoryId, // may be null/undefined per spec (manual assignment later)
      reporterId,
      location, // currently unused – kept for future enhancement
      photosBefore
    } = req.body || {};

    if (!title || !description || !reporterId) {
      return respond(res, { success: false, status: 400, message: 'title, description, reporterId are required' });
    }

    // Resolve reporter (allow either Mongo _id or clerkId)
    let reporter = null;
    if (mongoose.Types.ObjectId.isValid(reporterId)) {
      reporter = await User.findById(reporterId).select('_id role');
    }
    if (!reporter) {
      reporter = await User.findOne({ clerkId: reporterId }).select('_id role');
    }
    if (!reporter) {
      return respond(res, { success: false, status: 400, message: 'Invalid reporterId (no matching user)' });
    }

    let category = null;
    if (categoryId) {
      category = await Category.findById(categoryId).select('_id');
      if (!category) {
        return respond(res, { success: false, status: 400, message: 'Invalid categoryId' });
      }
    } else {
      // Auto categorize via AI
      try {
        const categories = await Category.find({}).select('name');
        const predictedName = await categorizeReportAI(description, categories);
        if (predictedName && predictedName !== 'UNKNOWN') {
          const match = categories.find(c => c.name.toLowerCase() === predictedName.toLowerCase());
          if (match) category = match; // assign
        }
      } catch (e) {
        console.error('AI categorize (createReport) failed:', e.message);
      }
    }

    const photosBeforeNormalized = normalizePhotos(photosBefore);

    const historyEntry = {
      by: reporter._id,
      role: reporter.role || 'reporter',
      action: 'created'
    };

    const report = await Report.create({
      title: title.trim(),
      description: description.trim(),
      department: department || undefined,
  category: category ? category._id : undefined,
      reporter: reporter._id,
      photosBefore: photosBeforeNormalized,
      status: 'submitted',
      history: [historyEntry]
    });

    return respond(res, { data: report, message: 'Report created' });
  } catch (err) {
    console.error('createReport error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/reports
// List reports with optional filters & pagination
exports.listReports = async (req, res) => {
  try {
    const { reporter: reporterParam, status, page = 1, limit = 10 } = req.query;
    const filters = {};

    // Reporter filtering: accept either Mongo ObjectId or external clerkId
    if (reporterParam) {
      let reporterObjectId = null;
      if (mongoose.Types.ObjectId.isValid(reporterParam)) {
        reporterObjectId = reporterParam; // likely already a Mongo _id
      } else {
        // Try to resolve as clerkId
        try {
          const userDoc = await User.findOne({ clerkId: reporterParam }).select('_id');
          if (userDoc) reporterObjectId = userDoc._id;
        } catch (e) {
          // ignore lookup errors, we'll treat as not found
        }
      }

      if (!reporterObjectId) {
        // Reporter not found -> return empty list (not an error)
        return respond(res, {
          data: {
            items: [],
            pagination: { page: 1, limit: parseInt(limit, 10) || 10, total: 0, totalPages: 1 }
          }
        });
      }
      filters.reporter = reporterObjectId;
    }

    if (status) {
      filters.status = status;
    } else {
      filters.status = { $ne: 'deleted' }; // default exclude soft-deleted
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = Report.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('category', 'name')
      .populate('reporter', 'name role');

    const [items, total] = await Promise.all([
      query.select('-__v'),
      Report.countDocuments(filters)
    ]);

    return respond(res, {
      data: {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (err) {
    console.error('listReports error:', err?.message || err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/reports/:id
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'Report id required' });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, { success: false, status: 400, message: 'Invalid report id format' });
    }
    const report = await Report.findById(id)
      .populate('category', 'name')
      .populate('reporter', 'name email role')
      .populate('assignedTo', 'name email role');
    if (!report) return respond(res, { success: false, status: 404, message: 'Report not found' });
    return respond(res, { data: report });
  } catch (err) {
    console.error('getReportById error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/reports/:id
exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'Report id required' });

    const report = await Report.findById(id);
    if (!report) return respond(res, { success: false, status: 404, message: 'Report not found' });

    const {
      title,
      description,
      status,
      photosAfter,
      assignedTo, // array of user ids
      categoryId,
      action, // free-text description of this update for history
      byUserId // user performing update
    } = req.body || {};

    if (title) report.title = title.trim();
    if (description) report.description = description.trim();
    if (status) report.status = status; // TODO: validate status transitions
    if (categoryId) report.category = categoryId;
    if (Array.isArray(assignedTo)) report.assignedTo = assignedTo;
    if (photosAfter) {
      const normalizedAfter = normalizePhotos(photosAfter);
      report.photosAfter = [...(report.photosAfter || []), ...normalizedAfter];
    }

    if (byUserId && action) {
      // Resolve byUserId (could be clerkId)
      let actorId = null;
      let role = 'reporter';
      if (mongoose.Types.ObjectId.isValid(byUserId)) {
        const u = await User.findById(byUserId).select('_id role');
        if (u) { actorId = u._id; role = u.role || role; }
      }
      if (!actorId) {
        const u = await User.findOne({ clerkId: byUserId }).select('_id role');
        if (u) { actorId = u._id; role = u.role || role; }
      }
      if (actorId) {
        report.history.push({ by: actorId, role, action: action.trim() });
      }
    }

    await report.save();
    return respond(res, { data: report, message: 'Report updated' });
  } catch (err) {
    console.error('updateReport error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// DELETE /api/reports/:id (soft delete)
exports.softDeleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'Report id required' });
    const report = await Report.findById(id);
    if (!report) return respond(res, { success: false, status: 404, message: 'Report not found' });
    report.status = 'deleted';
    report.history.push({ by: report.reporter, role: 'reporter', action: 'soft-deleted' });
    await report.save();
    return respond(res, { data: report, message: 'Report soft-deleted' });
  } catch (err) {
    console.error('softDeleteReport error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// POST /api/reports/categorize (AI only)
exports.categorizeReport = async (req, res) => {
  try {
    const { description } = req.body || {};
    if (!description) return respond(res, { success: false, status: 400, message: 'description required' });
    const categories = await Category.find({}).select('name');
    const predictedName = await categorizeReportAI(description, categories);
    let categoryDoc = null;
    if (predictedName && predictedName !== 'UNKNOWN') {
      categoryDoc = categories.find(c => c.name.toLowerCase() === predictedName.toLowerCase()) || null;
    }
    let department = null;
    let officers = [];
    if (categoryDoc) {
      const dept = await Department.findOne({ categories: categoryDoc._id }).populate('officers', 'name email phone role');
      if (dept) {
        department = { id: dept._id, name: dept.name };
        officers = (dept.officers || []).map(o => ({ id: o._id, name: o.name, email: o.email, phone: o.phone }));
      }
    }
    return respond(res, { data: {
      category: categoryDoc ? { id: categoryDoc._id, name: categoryDoc.name } : null,
      department,
      officers
    }});
  } catch (err) {
    console.error('categorizeReport error:', err.message || err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};
