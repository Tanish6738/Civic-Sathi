'use strict';

const Category = require('../models/Category');
const User = require('../models/User'); // for potential officer validation (optional)
const { canManageCategory, canViewCategory } = require('../policies/structurePolicies');
const { parsePagination } = require('../utils/validation');
const { softDeleteCategory, restoreCategory } = require('../services/structureLifecycle.service');
const AuditLog = require('../models/AuditLog');

function respond(res, { success = true, status = 200, data = null, message = '', errorCode = null, meta }) {
  return res.status(status).json({ success, data, message, errorCode, meta });
}

// POST /api/categories
exports.createCategory = async (req, res) => {
  try {
  if (!canManageCategory(req.user)) return respond(res, { success: false, status: 403, message: 'Forbidden' });
    const { name, description, keywords, defaultOfficers } = req.body || {};
    if (!name) return respond(res, { success: false, status: 400, message: 'name is required' });
    if (name.trim().length < 3 || name.trim().length > 80) {
      return respond(res, { success: false, status: 400, message: 'name length 3-80 chars', errorCode: 'INVALID_NAME_LENGTH' });
    }
    if (description && description.trim().length > 500) {
      return respond(res, { success: false, status: 400, message: 'description too long', errorCode: 'INVALID_DESCRIPTION_LENGTH' });
    }

    const cat = await Category.create({
      name: name.trim(),
      description: description?.trim(),
      keywords: Array.isArray(keywords) ? keywords.map(k => String(k).trim()).filter(Boolean) : [],
      defaultOfficers: Array.isArray(defaultOfficers) ? defaultOfficers : []
    });
    // Audit
    if (req.user) {
      try { await AuditLog.create({ user: req.user.id, action: 'CATEGORY_CREATE', meta: { categoryId: cat._id, name: cat.name } }); } catch(e) {}
    }
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
  if (!canViewCategory(req.user)) return respond(res, { success: false, status: 403, message: 'Forbidden' });
    const { search, includeDeleted, deletedOnly, sort } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filters = {};
    if (deletedOnly === 'true') {
      if (!canManageCategory(req.user)) return respond(res, { success:false, status:403, message:'Forbidden' });
      filters.isDeleted = true;
    } else if (!(includeDeleted === 'true' && canManageCategory(req.user))) {
      filters.isDeleted = { $ne: true };
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      filters.$or = [{ name: regex }, { keywords: regex }];
    }
    const total = await Category.countDocuments(filters);
    const activeCountPromise = Category.countDocuments({ isDeleted: { $ne: true } });
    const deletedCountPromise = Category.countDocuments({ isDeleted: true });
    let sortSpec = { name: 1 };
    if (sort) {
      // allow sort=name,-name,createdAt,-createdAt
      const fields = sort.split(',').map(f=>f.trim()).filter(Boolean);
      sortSpec = {};
      fields.forEach(f=>{ if (f.startsWith('-')) sortSpec[f.substring(1)] = -1; else sortSpec[f]=1; });
      if (!Object.keys(sortSpec).length) sortSpec = { name:1 };
    }
    const cats = await Category.find(filters)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .select('-__v');
    const [activeCount, deletedCount] = await Promise.all([activeCountPromise, deletedCountPromise]);
    return respond(res, { data: cats, meta: { page, limit, total, activeCount, deletedCount } });
  } catch (err) {
    console.error('listCategories error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/categories/:id
exports.getCategoryById = async (req, res) => {
  try {
  if (!canViewCategory(req.user)) return respond(res, { success: false, status: 403, message: 'Forbidden' });
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
  if (!canManageCategory(req.user)) return respond(res, { success: false, status: 403, message: 'Forbidden' });
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
    if (updates.name && (updates.name.length < 3 || updates.name.length > 80)) {
      return respond(res, { success: false, status: 400, message: 'name length 3-80 chars', errorCode: 'INVALID_NAME_LENGTH' });
    }
    if (updates.description) updates.description = String(updates.description).trim();
    if (updates.description && updates.description.length > 500) {
      return respond(res, { success: false, status: 400, message: 'description too long', errorCode: 'INVALID_DESCRIPTION_LENGTH' });
    }
    const before = await Category.findById(id);
    if (!before || before.isDeleted) return respond(res, { success: false, status: 404, message: 'Category not found' });
    const cat = await Category.findByIdAndUpdate(id, updates, { new: true });
    if (!cat || cat.isDeleted) return respond(res, { success: false, status: 404, message: 'Category not found' });
    if (req.user) {
      try {
        const diff = {};
        ['name','description','keywords','defaultOfficers'].forEach(f=>{
          if (JSON.stringify(before[f]) !== JSON.stringify(cat[f])) diff[f] = { before: before[f], after: cat[f] };
        });
        if (Object.keys(diff).length) {
          await AuditLog.create({ user: req.user.id, action: 'CATEGORY_UPDATE', meta: { categoryId: cat._id, diff } });
        }
      } catch(e) {}
    }
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
  if (!canManageCategory(req.user)) return respond(res, { success: false, status: 403, message: 'Forbidden' });
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'id required' });
    try {
      const result = await softDeleteCategory(id);
      if (req.user) {
        try { await AuditLog.create({ user: req.user.id, action: 'CATEGORY_SOFT_DELETE', meta: { categoryId: id, removedFrom: result.modifiedDepartments } }); } catch(e) {}
      }
      return respond(res, { data: result.category, message: `Category soft-deleted (removed from ${result.modifiedDepartments} departments)` });
    } catch (e) {
      if (e.message === 'Category not found') return respond(res, { success: false, status: 404, message: e.message });
      return respond(res, { success: false, status: 500, message: 'Internal server error' });
    }
  } catch (err) {
    console.error('softDeleteCategory error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// POST /api/categories/:id/restore
exports.restoreCategory = async (req, res) => {
  try {
    if (!canManageCategory(req.user)) return respond(res, { success:false, status:403, message:'Forbidden' });
    const { id } = req.params;
    if (!id) return respond(res, { success:false, status:400, message:'id required' });
    try {
      const result = await restoreCategory(id);
      if (req.user) {
        try { await AuditLog.create({ user: req.user.id, action: 'CATEGORY_RESTORE', meta: { categoryId: id, alreadyRestored: !!result.alreadyRestored } }); } catch(e) {}
      }
      return respond(res, { data: result.category, message: result.alreadyRestored ? 'Category already active' : 'Category restored' });
    } catch(e) {
      if (e.message === 'Category not found') return respond(res, { success:false, status:404, message:e.message });
      return respond(res, { success:false, status:500, message:'Internal server error' });
    }
  } catch(err) {
    console.error('restoreCategory error:', err);
    return respond(res, { success:false, status:500, message:'Internal server error' });
  }
};

// POST /api/categories/bulk  (Phase 7)
// Body: { categories:[{name,description,keywords,defaultOfficers}], options:{ restoreDeleted:true, skipInvalid:true } }
exports.bulkImportCategories = async (req, res) => {
  try {
    if (!canManageCategory(req.user)) return respond(res, { success:false, status:403, message:'Forbidden' });
    const { categories = [], options = {} } = req.body || {};
    if (!Array.isArray(categories) || !categories.length) return respond(res, { success:false, status:400, message:'categories array required' });
    const restoreDeleted = !!options.restoreDeleted;
    const skipInvalid = options.skipInvalid !== false; // default true
    const created = [], updated = [], restored = [], errors = [];
    for (let i=0;i<categories.length;i++) {
      const row = categories[i] || {};
      const ctx = { index:i };
      try {
        let { name, description, keywords, defaultOfficers } = row;
        if (!name || typeof name !== 'string') throw new Error('NAME_REQUIRED');
        name = name.trim();
        if (name.length < 3 || name.length > 80) throw new Error('INVALID_NAME_LENGTH');
        if (description) description = String(description).trim();
        if (description && description.length > 500) throw new Error('INVALID_DESCRIPTION_LENGTH');
        if (keywords && !Array.isArray(keywords)) throw new Error('INVALID_KEYWORDS');
        let existing = await Category.findOne({ name }).exec();
        if (existing) {
          // if soft-deleted and restore requested
          if (existing.isDeleted && restoreDeleted) {
            existing.isDeleted = false;
            if (description !== undefined) existing.description = description;
            if (Array.isArray(keywords)) existing.keywords = keywords;
            if (Array.isArray(defaultOfficers)) existing.defaultOfficers = defaultOfficers;
            await existing.save();
            restored.push({ name, id: existing._id });
            if (req.user) { try { await AuditLog.create({ user:req.user.id, action:'CATEGORY_RESTORE', meta:{ categoryId: existing._id, via:'bulk' } }); } catch(e) {} }
          } else {
            // update existing (upsert semantics)
            const before = existing.toObject();
            let changed = false;
            if (description !== undefined && description !== existing.description) { existing.description = description; changed = true; }
            if (Array.isArray(keywords)) { existing.keywords = keywords; changed = true; }
            if (Array.isArray(defaultOfficers)) { existing.defaultOfficers = defaultOfficers; changed = true; }
            if (changed) {
              await existing.save();
              updated.push({ name, id: existing._id });
              if (req.user) { try {
                const diff = {}; ['description','keywords','defaultOfficers'].forEach(f=>{ if (JSON.stringify(before[f])!==JSON.stringify(existing[f])) diff[f]={ before: before[f], after: existing[f] }; });
                if (Object.keys(diff).length) await AuditLog.create({ user:req.user.id, action:'CATEGORY_UPDATE', meta:{ categoryId: existing._id, diff, via:'bulk' } });
              } catch(e) {} }
            } else {
              // unchanged - ignore
            }
          }
        } else {
          const cat = await Category.create({ name, description, keywords: Array.isArray(keywords)?keywords:[], defaultOfficers: Array.isArray(defaultOfficers)?defaultOfficers:[] });
          created.push({ name, id: cat._id });
          if (req.user) { try { await AuditLog.create({ user:req.user.id, action:'CATEGORY_CREATE', meta:{ categoryId: cat._id, via:'bulk' } }); } catch(e) {} }
        }
      } catch(e) {
        if (!skipInvalid) return respond(res, { success:false, status:400, message:`Row ${i} error: ${e.message}`, errorCode:e.message });
        errors.push({ index:i, error:e.message });
      }
    }
    return respond(res, { data: { created, updated, restored, errors }, message:'Bulk import processed' });
  } catch(err) {
    console.error('bulkImportCategories error:', err);
    return respond(res, { success:false, status:500, message:'Internal server error' });
  }
};

// GET /api/categories/export?format=csv|json  (Phase 7)
exports.exportCategories = async (req, res) => {
  try {
    if (!canManageCategory(req.user)) return respond(res, { success:false, status:403, message:'Forbidden' });
    const { format = 'csv', includeDeleted, fields } = req.query;
    const filter = {};
    if (!(includeDeleted === 'true')) filter.isDeleted = { $ne:true };
    let fieldList = ['name','description','keywords','defaultOfficers','isDeleted','createdAt','updatedAt'];
    if (fields) fieldList = fields.split(',').map(f=>f.trim()).filter(Boolean);
    const cats = await Category.find(filter).select(fieldList.join(' ')).lean();
    if (format === 'json') {
      return res.status(200).json({ success:true, data: cats });
    }
    // CSV
    const header = fieldList.join(',');
    const rows = cats.map(c => fieldList.map(f => {
      let v = c[f];
      if (Array.isArray(v)) v = v.join('|');
      if (v === undefined || v === null) v = '';
      const str = String(v).replace(/"/g,'""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    }).join(','));
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="categories.csv"');
    return res.status(200).send(csv);
  } catch(err) {
    console.error('exportCategories error:', err);
    return respond(res, { success:false, status:500, message:'Internal server error' });
  }
};
