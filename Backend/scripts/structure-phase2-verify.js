#!/usr/bin/env node
'use strict';

// Verifies Department & Category Phase 1–2 implementation (schema + policies)
// Similar style to existing phase verification scripts.

require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Department = require('../models/Department');
const User = require('../models/User');
const categoryController = require('../controllers/categoryController');
const departmentController = require('../controllers/departmentController');

const DB = process.env.MONGO_URI || 'mongodb://localhost:27017/civic_structure_test';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

async function callController(fn, { user, body = {}, params = {}, query = {} }) {
  const req = { user, body, params, query, headers: {} };
  const res = mockRes();
  await fn(req, res);
  return res;
}

async function main() {
  await mongoose.connect(DB, { dbName: DB.split('/').pop() });
  await Promise.all([
    Category.deleteMany({}),
    Department.deleteMany({}),
    User.deleteMany({})
  ]);

  let failures = 0;
  function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); failures++; } else { console.log('PASS:', msg); } }

  // Create users
  const admin = await User.create({ name: 'Admin', email: 'admin@example.com', role: 'admin', clerkId: 'admin123' });
  const reporter = await User.create({ name: 'Reporter', email: 'rep@example.com', role: 'reporter', clerkId: 'rep123' });

  // 1. Schema field presence
  assert(Category.schema.path('isDeleted') !== undefined, 'Category has isDeleted field');
  assert(Category.schema.path('slug') !== undefined, 'Category has slug field');
  assert(Department.schema.path('isDeleted') !== undefined, 'Department has isDeleted field');

  // 2. Policy enforcement: reporter cannot create category
  let res = await callController(categoryController.createCategory, { user: reporter, body: { name: 'Road Maintenance' } });
  assert(res.statusCode === 403, 'Reporter forbidden to create category');

  // 3. Admin can create category & slug generated
  res = await callController(categoryController.createCategory, { user: admin, body: { name: 'Road Maintenance', keywords: ['Road', ' potholes '], defaultOfficers: [] } });
  assert(res.statusCode === 200 && res.body?.data?.slug, 'Admin created category with slug');
  const createdCat = res.body.data;
  assert(createdCat.slug === 'road-maintenance', 'Slug normalized correctly');

  // 4. Soft delete category restricted
  res = await callController(categoryController.softDeleteCategory, { user: reporter, params: { id: createdCat._id } });
  assert(res.statusCode === 403, 'Reporter forbidden to soft delete category');
  res = await callController(categoryController.softDeleteCategory, { user: admin, params: { id: createdCat._id } });
  assert(res.statusCode === 200 && res.body.data.isDeleted === true, 'Admin soft deleted category');

  // 5. Department creation policy
  res = await callController(departmentController.createDepartment, { user: reporter, body: { name: 'Infrastructure' } });
  assert(res.statusCode === 403, 'Reporter forbidden to create department');
  res = await callController(departmentController.createDepartment, { user: admin, body: { name: 'Infrastructure', description: 'Handles infra', categories: [], officers: [] } });
  assert(res.statusCode === 200, 'Admin created department');

  // 6. Index checks (ensure defined indexes exist after init)
  await Category.init();
  await Department.init();
  const catIndexes = await Category.collection.indexes();
  const deptIndexes = await Department.collection.indexes();
  const hasCatPartialName = catIndexes.some(i => i.key.name === 1 && i.partialFilterExpression && i.partialFilterExpression.isDeleted === false);
  const hasDeptPartialName = deptIndexes.some(i => i.key.name === 1 && i.key.isDeleted === 1 && i.partialFilterExpression && i.partialFilterExpression.isDeleted === false);
  assert(hasCatPartialName, 'Category partial unique name index present');
  assert(hasDeptPartialName, 'Department partial unique name/isDeleted index present');

  // 7. Keywords normalization (lowercase, trimmed, unique <= 40 chars)
  res = await callController(categoryController.createCategory, { user: admin, body: { name: 'Parks & Recreation', keywords: ['Parks', 'parks', ' Playgrounds '] } });
  assert(res.statusCode === 200, 'Created second category for keyword test');
  const kwCat = res.body.data;
  assert(Array.isArray(kwCat.keywords) && kwCat.keywords.length === 2 && kwCat.keywords.every(k => k === k.toLowerCase()), 'Keywords normalized & deduped');

  // 8. Listing excludes soft-deleted category
  res = await callController(categoryController.listCategories, { user: admin, query: {} });
  const names = (res.body.data || []).map(c => c.name);
  assert(!names.includes('Road Maintenance') && names.includes('Parks & Recreation'), 'Soft-deleted category excluded from list');

  // Summary
  if (failures) {
    console.error(`\nStructure Phase 1-2 verification FAILED (${failures} issues)`);
    process.exitCode = 1;
  } else {
    console.log('\nStructure Phase 1-2 verification PASSED');
  }
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
