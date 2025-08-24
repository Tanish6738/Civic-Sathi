'use strict';

const User = require('../models/User');

// Utility: consistent response helper
function respond(res, { success = true, status = 200, data = null, message = '' }) {
  return res.status(status).json({ success, data, message });
}

// POST /api/users/sync
// Sync Clerk user -> MongoDB
exports.syncUser = async (req, res) => {
  try {
  const { clerkId, email, name, phone, role, department, location } = req.body || {};

    if (!clerkId || !email) {
      return respond(res, { success: false, status: 400, message: 'clerkId and email are required' });
    }

    // Find existing by clerkId OR email
    let user = await User.findOne({ $or: [{ clerkId }, { email }] });

    if (user) {
      return respond(res, { data: user, message: 'User already exists' });
    }

    // Sanitize location: only keep if valid coordinates array [lng, lat]
    let sanitizedLocation;
    if (location) {
      if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        sanitizedLocation = {
          type: 'Point',
          coordinates: [Number(location.coordinates[0]), Number(location.coordinates[1])]
        };
      } else if (typeof location.lng === 'number' && typeof location.lat === 'number') {
        sanitizedLocation = { type: 'Point', coordinates: [location.lng, location.lat] };
      }
      // If invalid, we just omit it
    }

    user = await User.create({
      clerkId,
      email,
      name: name || 'Unnamed User',
      phone,
      role, // optional; could enforce default logic
      department,
      ...(sanitizedLocation ? { location: sanitizedLocation } : {}),
    });

    return respond(res, { data: user, message: 'User created' });
  } catch (err) {
    console.error('syncUser error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'User id is required' });
    let user = null;
    const isLikelyObjectId = /^[a-fA-F0-9]{24}$/.test(id);
    if (isLikelyObjectId) {
      user = await User.findById(id);
    }
    if (!user) {
      // fallback treat param as clerkId
      user = await User.findOne({ clerkId: id });
    }
    if (!user) return respond(res, { success: false, status: 404, message: 'User not found' });

    return respond(res, { data: user });
  } catch (err) {
    console.error('getUserById error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// GET /api/users
exports.listUsers = async (req, res) => {
  try {
    const { role, department, page = 1, limit = 20 } = req.query;
    const filters = { status: { $ne: 'inactive' } };
    if (role) filters.role = role;
    if (department) filters.department = department;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      User.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(filters),
    ]);

    return respond(res, {
      data: {
        items,
        pagination: {
          page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    console.error('listUsers error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'User id is required' });

    const allowed = ['name', 'phone', 'department', 'location', 'role'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    // TODO: enforce that only admin/superadmin can change role
    if ('role' in updates) {
      // placeholder security check
      // delete updates.role if requester not admin
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) return respond(res, { success: false, status: 404, message: 'User not found' });

    return respond(res, { data: user, message: 'User updated' });
  } catch (err) {
    console.error('updateUser error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// PUT /api/users/:id/phone
exports.updateUserPhone = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone } = req.body || {};
    if (!id) return respond(res, { success: false, status: 400, message: 'User id is required' });
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return respond(res, { success: false, status: 400, message: 'Valid 10-digit phone required' });
    }
    const user = await User.findByIdAndUpdate(id, { phone }, { new: true, runValidators: true });
    if (!user) return respond(res, { success: false, status: 404, message: 'User not found' });
    return respond(res, { data: user, message: 'Phone updated' });
  } catch (err) {
    console.error('updateUserPhone error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};

// DELETE /api/users/:id (soft delete)
exports.softDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return respond(res, { success: false, status: 400, message: 'User id is required' });

    // TODO: admin/superadmin authorization check

    const user = await User.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
    if (!user) return respond(res, { success: false, status: 404, message: 'User not found' });

    return respond(res, { data: user, message: 'User soft-deleted' });
  } catch (err) {
    console.error('softDeleteUser error:', err);
    return respond(res, { success: false, status: 500, message: 'Internal server error' });
  }
};
