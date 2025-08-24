'use strict';

// Policy utilities for report access & modification
// Assumptions: user object has { _id, id, role }; report has reporter, assignedTo array, status.

function idEquals(a, b) { return String(a) === String(b); }

function canViewReport(user, report) {
  if (!user || !report) return false;
  if (['admin','superadmin'].includes(user.role)) return true;
  if (idEquals(report.reporter, user._id || user.id)) return true;
  if (Array.isArray(report.assignedTo) && report.assignedTo.some(r => idEquals(r, user._id || user.id))) return true;
  return false;
}

function canModifyReport(user, report) {
  if (!user || !report) return false;
  if (['admin','superadmin'].includes(user.role)) return true;
  // Officer can modify only if assigned
  if (user.role === 'officer') {
    return Array.isArray(report.assignedTo) && report.assignedTo.some(r => idEquals(r, user._id || user.id));
  }
  // Reporter can only modify their own report if still early status (e.g., draft or submitted)
  if (user.role === 'reporter') {
    return idEquals(report.reporter, user._id || user.id) && ['draft','submitted'].includes(report.status);
  }
  return false;
}

module.exports = { canViewReport, canModifyReport };
