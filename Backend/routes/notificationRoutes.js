'use strict';
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireRole } = require('../middleware/auth');

// Auth required (any logged in role)
router.use(requireRole('reporter','officer','admin','superadmin'));

router.get('/', async (req, res) => {
  try {
    const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

module.exports = router;
