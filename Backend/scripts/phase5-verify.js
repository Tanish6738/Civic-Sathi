#!/usr/bin/env node
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Report = require('../models/Report');
const { canViewReport, canModifyReport } = require('../policies/reportPolicies');
const { applyStatusTransition } = require('../utils/reportUtils');

async function main() {
  const mongo = process.env.MONGO_URI || 'mongodb://localhost:27017/civic_test';
  await mongoose.connect(mongo, { dbName: mongo.split('/').pop() });
  const reporter = await User.create({ name: 'R', email: 'r@example.com', role: 'reporter' });
  const officer = await User.create({ name: 'O', email: 'o@example.com', role: 'officer' });
  const otherOfficer = await User.create({ name: 'O2', email: 'o2@example.com', role: 'officer' });
  const admin = await User.create({ name: 'A', email: 'a@example.com', role: 'admin' });

  const report = await Report.create({ title: 'Test', description: 'Desc', reporter: reporter._id, status: 'submitted', assignedTo: [officer._id], history: [] });

  // Policy checks
  const pv1 = canViewReport(officer, report); // assigned officer
  const pv2 = canViewReport(otherOfficer, report); // not assigned
  const pm1 = canModifyReport(officer, report); // assigned
  const pm2 = canModifyReport(otherOfficer, report); // not assigned
  const pm3 = canModifyReport(reporter, report); // reporter can while submitted
  const pm4 = canModifyReport(reporter, Object.assign({}, report.toObject(), { status: 'in_progress' }));

  if (!pv1 || pv2 || !pm1 || pm2 || !pm3 || pm4) {
    console.error('Policy function logic failed');
    process.exit(1);
  }

  // Transition invalid: officer tries awaiting_verification directly
  let tr = await applyStatusTransition(report, 'awaiting_verification', officer);
  if (tr.ok) { console.error('Invalid transition allowed'); process.exit(1); }
  // Valid in_progress
  tr = await applyStatusTransition(report, 'in_progress', officer);
  if (!tr.ok) { console.error('Valid transition failed'); process.exit(1); }
  report.photosAfter.push({ url: 'x://after.jpg' });
  tr = await applyStatusTransition(report, 'awaiting_verification', officer);
  if (!tr.ok) { console.error('Transition to awaiting_verification failed'); process.exit(1); }

  console.log('Phase 5 policy & transition checks PASSED');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
