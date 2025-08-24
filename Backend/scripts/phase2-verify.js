#!/usr/bin/env node
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Report = require('../models/Report');

async function main() {
  const mongo = process.env.MONGO_URI || 'mongodb://localhost:27017/civic_test';
  await mongoose.connect(mongo, { dbName: mongo.split('/').pop() });
  const schema = Report.schema.paths;
  const statusEnum = schema.status?.enumValues || [];
  const requiredStatuses = ['submitted','assigned','in_progress','awaiting_verification','verified','closed','misrouted'];
  const missing = requiredStatuses.filter(s => !statusEnum.includes(s));
  if (missing.length) {
    console.error('MISSING STATUSES:', missing);
    process.exitCode = 1;
  } else {
    console.log('All required statuses present.');
  }
  if (!schema.misrouteReason) {
    console.error('misrouteReason field missing');
    process.exitCode = 1;
  } else {
    console.log('misrouteReason field exists.');
  }
  // Quick index check (list indexes after ensuring collection sync)
  await Report.init();
  const indexes = await Report.collection.indexes();
  const hasComposite = indexes.some(i => i.key.assignedTo === 1 && i.key.status === 1 && i.key.updatedAt === -1);
  if (!hasComposite) {
    console.error('Composite index {assignedTo:1,status:1,updatedAt:-1} missing');
    process.exitCode = 1;
  } else {
    console.log('Composite index present.');
  }
  await mongoose.disconnect();
  if (process.exitCode) {
    console.log('Phase 2 verification FAILED');
  } else {
    console.log('Phase 2 verification PASSED');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
