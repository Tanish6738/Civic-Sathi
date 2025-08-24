'use strict';

const mongoose = require('mongoose');
const Department = require('../models/Department');
const Category = require('../models/Category');
const User = require('../models/User');

function respond(res, { success = true, status = 200, data = null, message = '' }) {
  return res.status(status).json({ success, data, message });
}

// Helper to validate an array of ObjectId strings
function filterValidObjectIds(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.filter(id => mongoose.Types.ObjectId.isValid(id));
}

// POST /api/departments
exports.createDepartment = async (req, res) => {
  try {
    const { name, description, categories = [], officers = [] } = req.body || {};
    if (!name) return respond(res, { success: false, status: 400, message: 'name is required' });

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

    return respond(res, { data: populated, message: 'Department created' });
  } catch (err) {
    console.error('createDepartment error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/departments
exports.getDepartments = async (req, res) => {
  try {
    const { name, category } = req.query;
    const filters = {};
    if (name) filters.name = new RegExp(name.trim(), 'i');
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filters.categories = category;
    }
    const depts = await Department.find(filters)
      .sort({ name: 1 })
      .populate('categories', 'name')
      .populate('officers', 'name role');
    return respond(res, { data: depts });
  } catch (err) {
    console.error('getDepartments error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/departments/:id
exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    if (!mongoose.Types.ObjectId.isValid(id)) return respond(res, { success: false, status: 400, message: 'Invalid id format' });
    const dept = await Department.findById(id)
      .populate('categories', 'name description keywords')
      .populate('officers', 'name email role department');
    if (!dept) return respond(res, { success: false, status: 404, message: 'Department not found' });
    return respond(res, { data: dept });
  } catch (err) {
    console.error('getDepartmentById error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// PUT /api/departments/:id
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    if (!mongoose.Types.ObjectId.isValid(id)) return respond(res, { success: false, status: 400, message: 'Invalid id format' });

    const dept = await Department.findById(id);
    if (!dept) return respond(res, { success: false, status: 404, message: 'Department not found' });

    const { name, description, categories, officers } = req.body || {};

    if (name && name.trim() !== dept.name) {
      const exists = await Department.findOne({ name: name.trim(), _id: { $ne: id } }).lean();
      if (exists) return respond(res, { success: false, status: 409, message: 'Department name already exists' });
      dept.name = name.trim();
    }
    if (description !== undefined) dept.description = description?.trim();

    if (categories) {
      const catIds = filterValidObjectIds(categories);
      const catCount = catIds.length ? await Category.countDocuments({ _id: { $in: catIds } }) : 0;
      if (catCount !== catIds.length) return respond(res, { success: false, status: 400, message: 'One or more category ids invalid' });
      dept.categories = catIds;
    }

    if (officers) {
      const offIds = filterValidObjectIds(officers);
      const offCount = offIds.length ? await User.countDocuments({ _id: { $in: offIds } }) : 0;
      if (offCount !== offIds.length) return respond(res, { success: false, status: 400, message: 'One or more officer ids invalid' });
      dept.officers = offIds;
    }

    await dept.save();
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
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    if (!mongoose.Types.ObjectId.isValid(id)) return respond(res, { success: false, status: 400, message: 'Invalid id format' });

    const dept = await Department.findByIdAndDelete(id);
    if (!dept) return respond(res, { success: false, status: 404, message: 'Department not found' });
    return respond(res, { data: dept, message: 'Department deleted' });
  } catch (err) {
    console.error('deleteDepartment error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};
