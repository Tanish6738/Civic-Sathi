'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/departmentController');
const { requireRole } = require('../middleware/auth');

router.post('/', requireRole('admin','superadmin'), ctrl.createDepartment);
router.get('/', ctrl.getDepartments);
router.get('/:id', ctrl.getDepartmentById);
router.put('/:id', requireRole('admin','superadmin'), ctrl.updateDepartment);
router.delete('/:id', requireRole('admin','superadmin'), ctrl.deleteDepartment);
router.post('/:id/restore', requireRole('admin','superadmin'), ctrl.restoreDepartment);
router.post('/bulk-assign', requireRole('admin','superadmin'), ctrl.bulkAssign);

module.exports = router;
