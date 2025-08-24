'use strict';

const mongoose = require('mongoose');
const Report = require('../models/Report');

// Normalize array of photo urls/objects to schema shape
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

// Allowed transitions with role-based guards & extra validators.
// Returns { ok, error } and mutates report.status if ok (but DOES NOT save) and pushes history.
async function applyStatusTransition(report, targetStatus, actor, opts = {}) {
  if (!report || !actor) return { ok: false, error: 'missing_report_or_actor' };
  const current = report.status;
  const role = actor.role;

  const isAssigned = report.assignedTo?.some(id => String(id) === String(actor.id || actor._id));

  // Officer-specific transitions
  if (role === 'officer') {
    switch (targetStatus) {
      case 'in_progress':
        if (!isAssigned) return { ok: false, error: 'not_assigned' };
        if (!['submitted', 'assigned'].includes(current)) return { ok: false, error: 'invalid_current_status' };
        break;
      case 'awaiting_verification':
        if (!isAssigned) return { ok: false, error: 'not_assigned' };
        if (current !== 'in_progress') return { ok: false, error: 'invalid_current_status' };
        if (!report.photosAfter || report.photosAfter.length === 0) return { ok: false, error: 'after_photos_required' };
        break;
      case 'misrouted':
        if (!isAssigned) return { ok: false, error: 'not_assigned' };
        if (current !== 'in_progress') return { ok: false, error: 'invalid_current_status' };
        if (!opts.reason) return { ok: false, error: 'reason_required' };
        report.misrouteReason = opts.reason.trim();
        break;
      default:
        return { ok: false, error: 'forbidden_target_status' };
    }
  } else if (['admin', 'superadmin'].includes(role)) {
    // Admin superset (simplified: allow any listed except illegal backward from deleted)
    if (current === 'deleted') return { ok: false, error: 'cannot_modify_deleted' };
    if (!Report.schema.path('status').enumValues.includes(targetStatus)) {
      return { ok: false, error: 'unknown_target_status' };
    }
  } else if (role === 'reporter') {
    // Reporter limited transitions
    if (targetStatus === 'verified') {
      if (current !== 'awaiting_verification') return { ok: false, error: 'invalid_current_status' };
    } else if (targetStatus === 'closed') {
      if (current !== 'verified') return { ok: false, error: 'invalid_current_status' };
    } else {
      return { ok: false, error: 'forbidden_target_status' };
    }
  } else {
    return { ok: false, error: 'unknown_role' };
  }

  report.status = targetStatus;
  report.history.push({ by: actor.id || actor._id, role, action: `status:${current}->${targetStatus}` });
  return { ok: true };
}

module.exports = { normalizePhotos, applyStatusTransition };
