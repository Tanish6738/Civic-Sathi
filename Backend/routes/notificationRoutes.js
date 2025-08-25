'use strict';
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireRole } = require('../middleware/auth');
const mongoose = require('mongoose');

// Auth required (any logged in role)
router.use(requireRole('reporter','officer','admin','superadmin'));

// GET /api/notifications?limit=&after=ISODate
router.get('/', async (req, res) => {
  try {
    let { limit = 20, after } = req.query;
    limit = Math.min(Math.max(parseInt(limit,10)||20,1),100);
    const filt = { user: req.user._id };
    if (after) {
      const d = new Date(after);
      if (!isNaN(d)) filt.createdAt = { $lt: d };
    }
    const items = await Notification.find(filt).sort({ createdAt: -1 }).limit(limit).lean();
    const nextCursor = items.length === limit ? items[items.length -1].createdAt : null;
    res.json({ success: true, data: { items, nextCursor } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req,res)=>{
  try {
    const count = await Notification.countDocuments({ user: req.user._id, readAt: null });
    res.json({ success: true, data: { count } });
  } catch(e){
    res.status(500).json({ success:false, error:'server_error' });
  }
});

// POST /api/notifications/mark-read { ids: [] }
router.post('/mark-read', async (req,res)=>{
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(id => mongoose.Types.ObjectId.isValid(id)) : [];
    if (!ids.length) return res.status(400).json({ success:false, error:'no_ids' });
    await Notification.updateMany({ _id: { $in: ids }, user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ success:true });
  } catch(e){
    res.status(500).json({ success:false, error:'server_error' });
  }
});

// POST /api/notifications/mark-all-read { before? }
router.post('/mark-all-read', async (req,res)=>{
  try {
    const { before } = req.body || {};
    const filt = { user: req.user._id, readAt: null };
    if (before) {
      const d = new Date(before);
      if (!isNaN(d)) filt.createdAt = { $lte: d };
    }
    await Notification.updateMany(filt, { $set: { readAt: new Date() } });
    res.json({ success:true });
  } catch(e){
    res.status(500).json({ success:false, error:'server_error' });
  }
});

module.exports = router;
