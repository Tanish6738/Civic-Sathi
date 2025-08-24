#!/usr/bin/env node
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { applyStatusTransition } = require('../utils/reportUtils');

async function main() {
  const mongo = process.env.MONGO_URI || 'mongodb://localhost:27017/civic_test';
  await mongoose.connect(mongo, { dbName: mongo.split('/').pop() });

  // Create test users & report in-memory
  const reporter = await User.create({ name: 'Reporter A', email: 'rA@example.com', role: 'reporter' });
  const officer = await User.create({ name: 'Officer A', email: 'oA@example.com', role: 'officer' });

  let report = await Report.create({
    title: 'Pothole', description: 'Large pothole', reporter: reporter._id, status: 'submitted', assignedTo: [officer._id], history: [{ by: reporter._id, role: 'reporter', action: 'created' }]
  });

  // Transition to in_progress
  let tr = await applyStatusTransition(report, 'in_progress', officer);
  if (!tr.ok) throw new Error('Transition to in_progress failed: ' + tr.error);
  await report.save();

  // Add after photo & move to awaiting_verification
  report.photosAfter.push({ url: 'http://x/after1.jpg' });
  tr = await applyStatusTransition(report, 'awaiting_verification', officer);
  if (!tr.ok) throw new Error('Transition to awaiting_verification failed: ' + tr.error);
  await report.save();

  // Misroute scenario (create second report)
  let report2 = await Report.create({ title: 'Tree issue', description: 'Fallen tree', reporter: reporter._id, status: 'in_progress', assignedTo: [officer._id], history: [] });
  tr = await applyStatusTransition(report2, 'misrouted', officer, { reason: 'Should go to Parks' });
  if (!tr.ok) throw new Error('Transition to misrouted failed: ' + tr.error);
  await report2.save();

  console.log('Phase 3 core transitions OK');

  // Phase 4 basic notification smoke (create notification manually)
  await Notification.create({ user: reporter._id, type: 'report.awaiting_verification', refReport: report._id });
  const count = await Notification.countDocuments({ user: reporter._id });
  if (count === 0) throw new Error('Notification creation failed');
  console.log('Phase 4 notification model basic OK');

  await mongoose.disconnect();
  console.log('Phase 3-4 verification PASSED');
}

main().catch(e => { console.error(e); process.exit(1); });
