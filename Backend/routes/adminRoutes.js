'use strict';

const express = require('express');
const router = express.Router();
const { getAnalytics, getCallActivity, getWebComplaints } = require('../controllers/analytics.controller');
const { requireAdmin } = require('../middleware/auth');

// GET /api/admin/analytics
router.get('/analytics', requireAdmin, getAnalytics);
router.get('/call-activity', requireAdmin, getCallActivity);
router.get('/web-complaints', requireAdmin, getWebComplaints);

module.exports = router;
