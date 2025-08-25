'use strict';

const Report = require('../models/Report');
const User = require('../models/User');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const { categorizeReportAI } = require('../utils/aiCategorizer');
const Department = require('../models/Department');
const { applyStatusTransition, normalizePhotos } = require('../utils/reportUtils');
const { canModifyReport } = require('../policies/reportPolicies');
const { notifyReportStatus } = require('../utils/notify');

// Consistent response helper
function respond(res, { success = true, status = 200, data = null, message = '' }) {
  return res.status(status).json({ success, data, message });
}

// normalizePhotos now imported from utils/reportUtils

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

    // Attempt department inference if not explicitly provided
    let deptDoc = null;
    let deptName = department || null;
    if (!deptName && category) {
      try {
        deptDoc = await Department.findOne({ categories: category._id }).populate('officers', 'role status name email');
        if (deptDoc) deptName = deptDoc.name;
      } catch (e) {
        console.error('Department lookup by category failed:', e.message);
      }
    } else if (deptName) {
      try {
        deptDoc = await Department.findOne({ name: deptName }).populate('officers', 'role status name email');
      } catch (e) {
        console.error('Department lookup by name failed:', e.message);
      }
    }

    // Auto-assignment logic
    let chosenOfficerId = null;
    let chosenOfficerName = null;
    if (deptDoc) {
      try {
        // Collect candidate active officers (role=officer, status active)
        const direct = (deptDoc.officers || []).filter(o => o && o.role === 'officer' && (!o.status || o.status === 'active'));
        // Augment with officers whose user.department string matches
        let extra = [];
        if (deptDoc.name) {
          extra = await User.find({ role: 'officer', department: deptDoc.name, status: 'active' }).select('role status name email');
        }
        const candidatesMap = new Map();
        for (const o of direct) candidatesMap.set(String(o._id), o);
        for (const o of extra) if (!candidatesMap.has(String(o._id))) candidatesMap.set(String(o._id), o);
        const candidates = Array.from(candidatesMap.values());
        if (candidates.length) {
          const candidateIds = candidates.map(c => c._id);
          // Aggregate open workload counts
          const openStatuses = ['assigned','in_progress','awaiting_verification'];
            const agg = await Report.aggregate([
            { $match: { assignedTo: { $in: candidateIds }, status: { $in: openStatuses } } },
            { $unwind: '$assignedTo' },
            { $match: { assignedTo: { $in: candidateIds } } },
            { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
          ]);
          const loadMap = new Map(agg.map(a => [String(a._id), a.count]));
          let best = null;
          for (const c of candidates) {
            const load = loadMap.get(String(c._id)) || 0;
            if (!best || load < best.load) {
              best = { id: c._id, name: c.name || c.email || 'officer', load };
            }
          }
          if (best) {
            chosenOfficerId = best.id;
            chosenOfficerName = best.name;
          }
        }
      } catch (e) {
        console.error('Auto-assignment failed:', e.message);
      }
    }

    const initialStatus = chosenOfficerId ? 'assigned' : 'submitted';
    if (chosenOfficerId) {
      // annotate creation action
      historyEntry.action = 'created (auto-assigned)';
    }

  const report = await Report.create({
      title: title.trim(),
      description: description.trim(),
      department: deptName || undefined,
      category: category ? category._id : undefined,
      reporter: reporter._id,
      photosBefore: photosBeforeNormalized,
      status: initialStatus,
      assignedTo: chosenOfficerId ? [chosenOfficerId] : [],
      history: [historyEntry]
    });

    if (chosenOfficerId) {
      report.history.push({ by: chosenOfficerId, role: 'officer', action: `auto-assigned (load-balanced)` });
      await report.save();
      // Notify reporter & officer(s)
      try { const { notifyReportStatus } = require('../utils/notify'); await notifyReportStatus(report, 'assigned', { _id: chosenOfficerId, name: chosenOfficerName }); } catch(_) {}
    }

    return respond(res, { data: report, message: chosenOfficerId ? `Report created and auto-assigned to ${chosenOfficerName}` : 'Report created' });
  } catch (err) {
    console.error('createReport error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/reports
// List reports with optional filters & pagination (supports reporter, status, category, search)
exports.listReports = async (req, res) => {
  try {
    const { reporter: reporterParam, status, page = 1, limit = 10, category: categoryParam, search } = req.query;
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

    if (categoryParam) {
      if (mongoose.Types.ObjectId.isValid(categoryParam)) {
        filters.category = categoryParam;
      } else {
        // attempt name match (case-insensitive)
        const catDoc = await Category.findOne({ name: new RegExp('^' + categoryParam + '$', 'i') }).select('_id');
        if (catDoc) filters.category = catDoc._id; else filters.category = null; // force empty result
      }
    }

    if (search) {
      const rx = new RegExp(search, 'i');
      filters.$or = [{ title: rx }, { description: rx }];
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

// POST /api/reports/bulk-update
// Body: { ids: [..], status?, assignedTo?, categoryId? }
// Auth: Only users with role admin or superadmin (req.user.role expected injected by auth middleware)
exports.bulkUpdateReports = async (req, res) => {
  try {
    const actor = req.user; // assume middleware sets req.user with { id, role }
    if (!actor || !['admin', 'superadmin'].includes(actor.role)) {
      return respond(res, { success: false, status: 403, message: 'Forbidden: insufficient role' });
    }

    const { ids, status, assignedTo, categoryId } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return respond(res, { success: false, status: 400, message: 'ids array required' });
    }

    // Validate ids
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return respond(res, { success: false, status: 400, message: 'No valid report ids provided' });
    }

    const update = {};
    const historyActionParts = [];
    const allowedStatuses = ['draft','submitted','assigned','in_progress','awaiting_verification','verified','closed','deleted'];
    if (status) {
      if (!allowedStatuses.includes(status)) {
        return respond(res, { success: false, status: 400, message: 'Invalid status value' });
      }
      update.status = status;
      historyActionParts.push(`bulk set status -> ${status}`);
    }
    if (Array.isArray(assignedTo)) {
      // validate user ids
      const assigneesValid = assignedTo.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (assigneesValid.length) {
        update.assignedTo = assigneesValid;
        historyActionParts.push(`assigned ${assigneesValid.length} user(s)`);
      }
    }
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return respond(res, { success: false, status: 400, message: 'Invalid categoryId' });
      }
      update.category = categoryId;
      historyActionParts.push('changed category');
    }
    if (Object.keys(update).length === 0) {
      return respond(res, { success: false, status: 400, message: 'No update fields provided' });
    }

    // Apply update and append history entries individually so we keep audit trail
    const reports = await Report.find({ _id: { $in: validIds } }).select('_id history');
    await Report.updateMany({ _id: { $in: validIds } }, { $set: update });
    const actionString = historyActionParts.join('; ');
    const historyEntry = { by: actor.id || actor._id, role: actor.role, action: actionString };
    // Push history in memory then save each (avoid multi update race for history array)
    await Promise.all(reports.map(async r => { r.history.push(historyEntry); await r.save(); }));

    return respond(res, { data: { modified: reports.length }, message: 'Bulk update complete' });
  } catch (err) {
    console.error('bulkUpdateReports error:', err);
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
      status: targetStatus,
      photosAfter,
      assignedTo, // array of user ids
      categoryId,
      action, // free-text description of this update for history
      byUserId // user performing update or will fallback to req.user
    } = req.body || {};

    const actor = req.user || (byUserId ? { id: byUserId, role: 'reporter' } : null);
    if (actor && !canModifyReport(actor, report)) {
      return respond(res, { success: false, status: 403, message: 'Forbidden' });
    }

    if (title) report.title = title.trim();
    if (description) report.description = description.trim();
    let transitionedTo = null;
    if (targetStatus) {
      const tr = await applyStatusTransition(report, targetStatus, actor || { role: 'reporter', id: report.reporter });
      if (!tr.ok) {
        return respond(res, { success: false, status: 409, message: tr.error });
      }
      transitionedTo = targetStatus;
    }
    if (categoryId) report.category = categoryId;
    if (Array.isArray(assignedTo)) report.assignedTo = assignedTo;
    if (photosAfter) {
      const normalizedAfter = normalizePhotos(photosAfter);
      report.photosAfter = [...(report.photosAfter || []), ...normalizedAfter];
    }

    if ((byUserId || actor) && action) {
      // Resolve byUserId (could be clerkId)
      let actorId = null;
      let role = 'reporter';
      const candidate = byUserId || actor.id || actor._id;
      if (mongoose.Types.ObjectId.isValid(candidate)) {
        const u = await User.findById(candidate).select('_id role');
        if (u) { actorId = u._id; role = u.role || role; }
      }
      if (!actorId && candidate && typeof candidate === 'string') {
        const u = await User.findOne({ clerkId: candidate }).select('_id role');
        if (u) { actorId = u._id; role = u.role || role; }
      }
      if (actorId) {
        report.history.push({ by: actorId, role, action: action.trim() });
      }
    }

    await report.save();
    // Fire notifications post-persist for statuses of interest
    if (transitionedTo) {
      try { await notifyReportStatus(report, transitionedTo, req.user); } catch(_){}
    }
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
      const dept = await Department.findOne({ categories: categoryDoc._id })
        .populate('officers', 'name email phone role status');
      if (dept) {
        department = { id: dept._id, name: dept.name };
        // Primary: officers referenced on department (active only if status present)
        officers = (dept.officers || [])
          .filter(o => !o.status || o.status === 'active')
          .map(o => ({ id: o._id, name: o.name, email: o.email, phone: o.phone }));
        // Fallback / augmentation: add users whose string department matches dept.name and role=officer
        try {
          const extra = await User.find({ role: 'officer', department: dept.name, status: 'active' })
            .select('name email phone');
          for (const u of extra) {
            if (!officers.find(x => String(x.id) === String(u._id))) {
              officers.push({ id: u._id, name: u.name, email: u.email, phone: u.phone });
            }
          }
        } catch (offErr) {
          console.error('categorizeReport officer augmentation error:', offErr.message);
        }
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
