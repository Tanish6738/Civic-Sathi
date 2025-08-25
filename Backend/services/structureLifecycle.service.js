"use strict";

const mongoose = require('mongoose');
const Category = require('../models/Category');
const Department = require('../models/Department');
const Report = require('../models/Report');

async function softDeleteCategory(categoryId, { session } = {}) {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) throw new Error('Invalid category id');
  const cat = await Category.findById(categoryId).session(session);
  if (!cat) throw new Error('Category not found');
  if (cat.isDeleted) return { category: cat, modifiedDepartments: 0, alreadyDeleted: true };
  cat.isDeleted = true;
  await cat.save({ session });
  const res = await Department.updateMany(
    { categories: categoryId },
    { $pull: { categories: categoryId } },
    { session }
  );
  return { category: cat, modifiedDepartments: res.modifiedCount || 0 };
}

async function softDeleteDepartment(deptId, { blockIfActiveReports = true, session } = {}) {
  if (!mongoose.Types.ObjectId.isValid(deptId)) throw new Error('Invalid department id');
  const dept = await Department.findById(deptId).session(session);
  if (!dept) throw new Error('Department not found');
  if (dept.isDeleted) return { department: dept, alreadyDeleted: true };
  if (blockIfActiveReports) {
    const activeCount = await Report.countDocuments({ category: { $in: dept.categories }, status: { $in: ['submitted','assigned','in_progress'] } }).session(session);
    if (activeCount) {
      const err = new Error('ACTIVE_REPORTS_BLOCK');
      err.code = 'ACTIVE_REPORTS_BLOCK';
      throw err;
    }
  }
  dept.isDeleted = true;
  await dept.save({ session });
  return { department: dept };
}

async function restoreCategory(categoryId, { session } = {}) {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) throw new Error('Invalid category id');
  const cat = await Category.findById(categoryId).session(session);
  if (!cat) throw new Error('Category not found');
  if (!cat.isDeleted) return { category: cat, alreadyRestored: true };
  cat.isDeleted = false;
  await cat.save({ session });
  return { category: cat };
}

async function restoreDepartment(deptId, { session } = {}) {
  if (!mongoose.Types.ObjectId.isValid(deptId)) throw new Error('Invalid department id');
  const dept = await Department.findById(deptId).session(session);
  if (!dept) throw new Error('Department not found');
  if (!dept.isDeleted) return { department: dept, alreadyRestored: true };
  dept.isDeleted = false;
  await dept.save({ session });
  return { department: dept };
}

module.exports = { softDeleteCategory, softDeleteDepartment, restoreCategory, restoreDepartment };