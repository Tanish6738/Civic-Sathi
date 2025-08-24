'use strict';

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// POST /api/reports
router.post('/', reportController.createReport);

// POST /api/reports/categorize (AI prediction only)
router.post('/categorize', reportController.categorizeReport);

// GET /api/reports
router.get('/', reportController.listReports);

// POST /api/reports/bulk-update
router.post('/bulk-update', reportController.bulkUpdateReports);

// GET /api/reports/:id
router.get('/:id', reportController.getReportById);

// PATCH /api/reports/:id
router.patch('/:id', reportController.updateReport);

// DELETE /api/reports/:id (soft delete)
router.delete('/:id', reportController.softDeleteReport);

module.exports = router;
