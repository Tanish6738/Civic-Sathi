'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/departmentController');

router.post('/', ctrl.createDepartment);
router.get('/', ctrl.getDepartments);
router.get('/:id', ctrl.getDepartmentById);
router.put('/:id', ctrl.updateDepartment);
router.delete('/:id', ctrl.deleteDepartment);

module.exports = router;
