'use strict';

const Category = require('../models/Category');
const User = require('../models/User'); // for potential officer validation (optional)

function respond(res, { success = true, status = 200, data = null, message = '' }) {
  return res.status(status).json({ success, data, message });
}

// POST /api/categories
exports.createCategory = async (req, res) => {
  try {
    const { name, description, keywords, defaultOfficers } = req.body || {};
    if (!name) return respond(res, { success: false, status: 400, message: 'name is required' });

    const cat = await Category.create({
      name: name.trim(),
      description: description?.trim(),
      keywords: Array.isArray(keywords) ? keywords.map(k => String(k).trim()).filter(Boolean) : [],
      defaultOfficers: Array.isArray(defaultOfficers) ? defaultOfficers : []
    });
    return respond(res, { data: cat, message: 'Category created' });
  } catch (err) {
    if (err.code === 11000) {
      return respond(res, { success: false, status: 409, message: 'Category name already exists' });
    }
    console.error('createCategory error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/categories
exports.listCategories = async (req, res) => {
  try {
    const { search } = req.query;
    const filters = { isDeleted: { $ne: true } };
    if (search) {
      const regex = new RegExp(search, 'i');
      filters.$or = [{ name: regex }, { keywords: regex }];
    }
    const cats = await Category.find(filters).sort({ name: 1 }).select('-__v');
    return respond(res, { data: cats });
  } catch (err) {
    console.error('listCategories error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/categories/:id
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    const cat = await Category.findById(id);
    if (!cat || cat.isDeleted) return respond(res, { success: false, status: 404, message: 'Category not found' });
    return respond(res, { data: cat });
  } catch (err) {
    console.error('getCategoryById error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/categories/:id
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    const allowed = ['name', 'description', 'keywords', 'defaultOfficers'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'keywords' && Array.isArray(req.body[key])) {
          updates[key] = req.body[key].map(k => String(k).trim()).filter(Boolean);
        } else {
          updates[key] = req.body[key];
        }
      }
    }
    if (updates.name) updates.name = String(updates.name).trim();
    if (updates.description) updates.description = String(updates.description).trim();
    const cat = await Category.findByIdAndUpdate(id, updates, { new: true });
    if (!cat || cat.isDeleted) return respond(res, { success: false, status: 404, message: 'Category not found' });
    return respond(res, { data: cat, message: 'Category updated' });
  } catch (err) {
    if (err.code === 11000) {
      return respond(res, { success: false, status: 409, message: 'Category name already exists' });
    }
    console.error('updateCategory error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// DELETE /api/categories/:id (soft delete)
exports.softDeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    const cat = await Category.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!cat) return respond(res, { success: false, status: 404, message: 'Category not found' });
    return respond(res, { data: cat, message: 'Category soft-deleted' });
  } catch (err) {
    console.error('softDeleteCategory error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};
