"use strict";

// Simple policy helpers (expandable later)
function roleIn(user, roles) { return !!user && roles.includes(user.role); }

// View policies – currently permissive (any user or anonymous can view). If future restriction needed, adjust.
function canViewCategory(user) { return true; }
function canViewDepartment(user) { return true; }

// Manage (create/update/delete) restricted to admin & superadmin
function canManageCategory(user) { return roleIn(user, ['admin','superadmin']); }
function canManageDepartment(user) { return roleIn(user, ['admin','superadmin']); }

module.exports = { canViewCategory, canManageCategory, canViewDepartment, canManageDepartment };