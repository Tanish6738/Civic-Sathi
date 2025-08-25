'use strict';

const mongoose = require('mongoose');
const Department = require('../models/Department');
const Category = require('../models/Category');
const User = require('../models/User');
const { canManageDepartment, canViewDepartment } = require('../policies/structurePolicies');
const { parsePagination } = require('../utils/validation');
const Report = require('../models/Report');
const { softDeleteDepartment, restoreDepartment } = require('../services/structureLifecycle.service');
const AuditLog = require('../models/AuditLog');

function respond(res, { success = true, status = 200, data = null, message = '', errorCode = null, meta }) {
  return res.status(status).json({ success, data, message, errorCode, meta });
}

// Helper to validate an array of ObjectId strings
function filterValidObjectIds(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.filter(id => mongoose.Types.ObjectId.isValid(id));
}

// POST /api/departments
exports.createDepartment = async (req, res) => {
  try {
  if (!canManageDepartment(req.user)) return respond(res, { success: false, status: 403, message: 'Forbidden' });
    const { name, description, categories = [], officers = [] } = req.body || {};
    if (!name) return respond(res, { success: false, status: 400, message: 'name is required' });
    if (name.trim().length < 3 || name.trim().length > 80) return respond(res, { success: false, status: 400, message: 'name length 3-80 chars', errorCode: 'INVALID_NAME_LENGTH' });
    if (description && description.trim().length > 500) return respond(res, { success: false, status: 400, message: 'description too long', errorCode: 'INVALID_DESCRIPTION_LENGTH' });

    const existing = await Department.findOne({ name: name.trim() }).lean();
    if (existing) return respond(res, { success: false, status: 409, message: 'Department name already exists' });

    const validCategoryIds = filterValidObjectIds(categories);
    const validOfficerIds = filterValidObjectIds(officers);

    // Ensure referenced docs exist (soft validation)
    const [catCount, officerCount] = await Promise.all([
      validCategoryIds.length ? Category.countDocuments({ _id: { $in: validCategoryIds } }) : 0,
      validOfficerIds.length ? User.countDocuments({ _id: { $in: validOfficerIds } }) : 0
    ]);
    if (catCount !== validCategoryIds.length) return respond(res, { success: false, status: 400, message: 'One or more category ids invalid' });
    if (officerCount !== validOfficerIds.length) return respond(res, { success: false, status: 400, message: 'One or more officer ids invalid' });

  const dept = await Department.create({
      name: name.trim(),
      description: description?.trim(),
      categories: validCategoryIds,
      officers: validOfficerIds
    });

    const populated = await dept.populate([
      { path: 'categories', select: 'name description' },
      { path: 'officers', select: 'name email role' }
    ]);

    if (req.user) {
      try { await AuditLog.create({ user: req.user.id, action: 'DEPARTMENT_CREATE', meta: { departmentId: dept._id, name: dept.name } }); } catch(e) {}
    }
    return respond(res, { data: populated, message: 'Department created' });
  } catch (err) {
    console.error('createDepartment error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/departments
exports.getDepartments = async (req, res) => {
  try {
  if (!canViewDepartment(req.user)) return respond(res, { success: false, status: 403, message: 'Forbidden' });
    const { name, category, includeDeleted, deletedOnly, sort } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filters = {};
    if (deletedOnly === 'true') {
      if (!canManageDepartment(req.user)) return respond(res, { success:false, status:403, message:'Forbidden' });
      filters.isDeleted = true;
    } else if (!(includeDeleted === 'true' && canManageDepartment(req.user))) {
      filters.isDeleted = { $ne: true };
    }
    if (name) filters.name = new RegExp(name.trim(), 'i');
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filters.categories = category;
    }
    const total = await Department.countDocuments(filters);
    const activeCountPromise = Department.countDocuments({ isDeleted: { $ne: true } });
    const deletedCountPromise = Department.countDocuments({ isDeleted: true });
    let sortSpec = { name: 1 };
    if (sort) {
      const fields = sort.split(',').map(f=>f.trim()).filter(Boolean);
      sortSpec = {};
      fields.forEach(f=>{ if (f.startsWith('-')) sortSpec[f.substring(1)] = -1; else sortSpec[f]=1; });
      if (!Object.keys(sortSpec).length) sortSpec = { name:1 };
    }
    const depts = await Department.find(filters)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .populate({ path: 'categories', select: 'name description', match: { isDeleted: { $ne: true } } })
      .populate('officers', 'name role');
    const [activeCount, deletedCount] = await Promise.all([activeCountPromise, deletedCountPromise]);
    return respond(res, { data: depts, meta: { page, limit, total, activeCount, deletedCount } });
  } catch (err) {
    console.error('getDepartments error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/departments/:id
exports.getDepartmentById = async (req, res) => {
  try {
  if (!canViewDepartment(req.user)) return respond(res, { success: false, status: 403, message: 'Forbidden' });
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    if (!mongoose.Types.ObjectId.isValid(id)) return respond(res, { success: false, status: 400, message: 'Invalid id format' });
  const dept = await Department.findById(id)
      .populate({ path: 'categories', select: 'name description keywords', match: { isDeleted: { $ne: true } } })
      .populate('officers', 'name email role department');
  if (!dept || dept.isDeleted) return respond(res, { success: false, status: 404, message: 'Department not found' });
    return respond(res, { data: dept });
  } catch (err) {
    console.error('getDepartmentById error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// PUT /api/departments/:id
exports.updateDepartment = async (req, res) => {
  try {
  if (!canManageDepartment(req.user)) return respond(res, { success: false, status: 403, message: 'Forbidden' });
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    if (!mongoose.Types.ObjectId.isValid(id)) return respond(res, { success: false, status: 400, message: 'Invalid id format' });

    const dept = await Department.findById(id);
    if (!dept) return respond(res, { success: false, status: 404, message: 'Department not found' });

  const { name, description, categories, officers } = req.body || {};

  // Capture state BEFORE any mutations for diff/audit purposes
  const before = dept.toObject();

  if (name && name.trim() !== dept.name) {
      const exists = await Department.findOne({ name: name.trim(), _id: { $ne: id } }).lean();
      if (exists) return respond(res, { success: false, status: 409, message: 'Department name already exists' });
      dept.name = name.trim();
    }
    if (description !== undefined) dept.description = description?.trim();

  if (categories) {
      const catIds = filterValidObjectIds(categories);
      const catCount = catIds.length ? await Category.countDocuments({ _id: { $in: catIds }, isDeleted: { $ne: true } }) : 0;
      if (catCount !== catIds.length) return respond(res, { success: false, status: 400, message: 'One or more category ids invalid' });
      const removed = dept.categories.filter(id => !catIds.map(c => c.toString()).includes(id.toString()));
      if (removed.length) {
        const active = await Report.countDocuments({ category: { $in: removed }, status: { $in: ['submitted','assigned','in_progress'] } });
        if (active) return respond(res, { success: false, status: 409, message: 'Cannot remove category with active reports', errorCode: 'ACTIVE_REPORTS' });
      }
      dept.categories = catIds;
    }

    if (officers) {
      const offIds = filterValidObjectIds(officers);
      const offCount = offIds.length ? await User.countDocuments({ _id: { $in: offIds } }) : 0;
      if (offCount !== offIds.length) return respond(res, { success: false, status: 400, message: 'One or more officer ids invalid' });
      dept.officers = offIds;
    }

    await dept.save();
    if (req.user) {
      try {
        const after = dept.toObject();
        const diff = {};
        ['name','description','categories','officers'].forEach(f=>{
          if (JSON.stringify(before[f]) !== JSON.stringify(after[f])) diff[f] = { before: before[f], after: after[f] };
        });
        if (Object.keys(diff).length) {
          await AuditLog.create({ user: req.user.id, action: 'DEPARTMENT_UPDATE', meta: { departmentId: dept._id, diff } });
        }
      } catch(e) {}
    }
    const populated = await dept.populate([
      { path: 'categories', select: 'name description' },
      { path: 'officers', select: 'name email role' }
    ]);
    return respond(res, { data: populated, message: 'Department updated' });
  } catch (err) {
    console.error('updateDepartment error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// DELETE /api/departments/:id
exports.deleteDepartment = async (req, res) => {
  try {
  if (!canManageDepartment(req.user)) return respond(res, { success: false, status: 403, message: 'Forbidden' });
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    if (!mongoose.Types.ObjectId.isValid(id)) return respond(res, { success: false, status: 400, message: 'Invalid id format' });

    try {
      const { department } = await softDeleteDepartment(id, { blockIfActiveReports: true });
      if (req.user) {
        try { await AuditLog.create({ user: req.user.id, action: 'DEPARTMENT_SOFT_DELETE', meta: { departmentId: id } }); } catch(e) {}
      }
      return respond(res, { data: department, message: 'Department soft-deleted' });
    } catch (e) {
      if (e.code === 'ACTIVE_REPORTS_BLOCK') return respond(res, { success: false, status: 409, message: 'Cannot delete department with active reports', errorCode: 'ACTIVE_REPORTS' });
      if (e.message === 'Department not found') return respond(res, { success: false, status: 404, message: e.message });
      return respond(res, { success: false, status: 500, message: 'Internal server error' });
    }
  } catch (err) {
    console.error('deleteDepartment error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// POST /api/departments/:id/restore
exports.restoreDepartment = async (req, res) => {
  try {
    if (!canManageDepartment(req.user)) return respond(res, { success:false, status:403, message:'Forbidden' });
    const { id } = req.params;
    if (!id) return respond(res, { success:false, status:400, message:'id required' });
    try {
      const { department, alreadyRestored } = await restoreDepartment(id);
      if (req.user) {
        try { await AuditLog.create({ user: req.user.id, action: 'DEPARTMENT_RESTORE', meta: { departmentId: id, alreadyRestored: !!alreadyRestored } }); } catch(e) {}
      }
      return respond(res, { data: department, message: alreadyRestored ? 'Department already active' : 'Department restored' });
    } catch(e) {
      if (e.message === 'Department not found') return respond(res, { success:false, status:404, message:e.message });
      return respond(res, { success:false, status:500, message:'Internal server error' });
    }
  } catch(err) {
    console.error('restoreDepartment error:', err);
    return respond(res, { success:false, status:500, message:'Internal server error' });
  }
};

// POST /api/departments/bulk-assign  (Phase 7)
// Body: { departmentId, addCategories:[], addOfficers:[] }
exports.bulkAssign = async (req, res) => {
  try {
    if (!canManageDepartment(req.user)) return respond(res, { success:false, status:403, message:'Forbidden' });
    const { departmentId, addCategories = [], addOfficers = [] } = req.body || {};
    if (!departmentId) return respond(res, { success:false, status:400, message:'departmentId required' });
    // Validation
    if (!Array.isArray(addCategories) || !Array.isArray(addOfficers)) return respond(res, { success:false, status:400, message:'addCategories/addOfficers must be arrays' });
    const invalidCatIds = addCategories.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidCatIds.length) return respond(res, { success:false, status:400, message:'Invalid category id format', errorCode:'INVALID_CATEGORY_ID' });
    const invalidOfficerIds = addOfficers.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidOfficerIds.length) return respond(res, { success:false, status:400, message:'Invalid officer id format', errorCode:'INVALID_OFFICER_ID' });

  const catIds = addCategories.map(id => new mongoose.Types.ObjectId(id));
    if (catIds.length) {
      const catCount = await Category.countDocuments({ _id: { $in: catIds }, isDeleted: { $ne: true } });
      if (catCount !== catIds.length) return respond(res, { success:false, status:400, message:'One or more category ids invalid', errorCode:'INVALID_CATEGORY' });
    }
  const officerIds = addOfficers.map(id => new mongoose.Types.ObjectId(id));
    if (officerIds.length) {
      const offCount = await User.countDocuments({ _id: { $in: officerIds } });
      if (offCount !== officerIds.length) return respond(res, { success:false, status:400, message:'One or more officer ids invalid', errorCode:'INVALID_OFFICER' });
    }
    const before = await Department.findById(departmentId).lean();
    if (!before || before.isDeleted) return respond(res, { success:false, status:404, message:'Department not found' });
    const updateOps = {};
    if (catIds.length) updateOps.categories = { $each: catIds };
    if (officerIds.length) updateOps.officers = { $each: officerIds };
    let updated = await Department.findByIdAndUpdate(
      departmentId,
      Object.keys(updateOps).length ? { $addToSet: updateOps } : {},
      { new: true }
    );
    if (!updated) return respond(res, { success:false, status:404, message:'Department not found' });
    if (req.user && Object.keys(updateOps).length) {
      try {
        const diff = {};
        ['categories','officers'].forEach(f=>{ if (JSON.stringify(before[f])!==JSON.stringify(updated[f])) diff[f] = { before: before[f], after: updated[f] }; });
        if (Object.keys(diff).length) await AuditLog.create({ user:req.user.id, action:'DEPARTMENT_UPDATE', meta:{ departmentId, diff, via:'bulk-assign' } });
      } catch(e) {}
    }
    return respond(res, { data: updated, message:'Bulk assignment applied' });
  } catch(err) {
    console.error('bulkAssign error:', err);
    return respond(res, { success:false, status:500, message:'Internal server error' });
  }
};
