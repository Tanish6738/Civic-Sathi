'use strict';

const User = require('../models/User');

// Optional user attachment: if a clerk id (or bearer token with it) is provided, attach user doc to req.user
async function attachUser(req, _res, next) {
  try {
    let clerkId = req.headers['x-clerk-id'];
    // Support Authorization: Bearer <clerkId>
    if (!clerkId && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts[0].toLowerCase() === 'bearer' && parts[1]) clerkId = parts[1];
    }
    if (clerkId) {
      const user = await User.findOne({ clerkId }).select('_id name role email department');
      if (user) {
        req.user = { id: user._id, _id: user._id, role: user.role, clerkId, email: user.email, name: user.name, department: user.department };
      }
    }
  } catch (e) {
    console.error('[attachUser] failed:', e.message);
  } finally {
    return next();
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
  }
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
  }
  return next();
}

// Generic role guard: any of the provided roles, or 403.
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    }
    return next();
  };
}

module.exports = { attachUser, requireAdmin, requireRole };
