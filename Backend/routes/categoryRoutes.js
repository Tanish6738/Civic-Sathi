'use strict';

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { requireRole } = require('../middleware/auth');

// Public (or authenticated) reads; writes locked down by role middleware
router.post('/', requireRole('admin','superadmin'), categoryController.createCategory);
router.get('/', categoryController.listCategories);
router.get('/:id', categoryController.getCategoryById);
router.patch('/:id', requireRole('admin','superadmin'), categoryController.updateCategory);
router.delete('/:id', requireRole('admin','superadmin'), categoryController.softDeleteCategory);
router.post('/:id/restore', requireRole('admin','superadmin'), categoryController.restoreCategory);
router.post('/bulk', requireRole('admin','superadmin'), categoryController.bulkImportCategories);
router.get('/export/all', requireRole('admin','superadmin'), categoryController.exportCategories);

module.exports = router;
