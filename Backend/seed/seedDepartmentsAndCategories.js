#!/usr/bin/env node
'use strict';

/*
 Seed Departments and Categories
 Usage: node backend/seed/seedDepartmentsAndCategories.js
 Ensure a .env file with MONGODB_URI is present.
*/

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load env (support running from root or backend dir)
const envPath = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'Backend', '.env'),
  path.join(__dirname, '..', '.env')
].find(p => require('fs').existsSync(p));
if (envPath) dotenv.config({ path: envPath });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGODB_URI (or MONGO_URI) not set. Create a .env file.');
  process.exit(1);
}

// Models
const Category = require('../models/Category');
const Department = require('../models/Department');

const categoryData = [
  {
    name: 'Citizen Services',
    description: 'Public-facing services like certificates and grievances',
    keywords: [
      'Citizen Charter Timeline',
      'Grievances',
      'Birth Certificate',
      'Death Certificate',
      'Marriage Certificate',
      'CRM Services'
    ]
  },
  {
    name: 'Payments & Taxes',
    description: 'Government payments, bills, and tax related services',
    keywords: [
      'Property Tax',
      'Water Charges',
      'Bill Tracking',
      'Others'
    ]
  },
  {
    name: 'Licenses & Approvals',
    description: 'Official licenses and municipal approvals',
    keywords: [
      'Restaurant Licenses',
      'Tree Cutting Approvals'
    ]
  },
  {
    name: 'Road & Infrastructure',
    description: 'City infrastructure related issues',
    keywords: [
      'Potholes',
      'Street Lights',
      'Garbage Collection'
    ]
  },
  {
    name: 'Public Health',
    description: 'Healthcare and sanitation related services',
    keywords: [
      'Hospital',
      'Clinic',
      'Ambulance',
      'Sanitation'
    ]
  }
];

const departmentData = [
  {
    name: 'Tax Department',
    description: 'Handles all tax and payment related services',
    categories: ['Payments & Taxes']
  },
  {
    name: 'Civil Department',
    description: 'Handles general civic services and infrastructure',
    categories: ['Citizen Services', 'Road & Infrastructure']
  },
  {
    name: 'Health Department',
    description: 'Responsible for health and sanitation',
    categories: ['Public Health']
  },
  {
    name: 'Licensing Department',
    description: 'Responsible for permits and licenses',
    categories: ['Licenses & Approvals']
  }
];

async function run() {
  const started = Date.now();
  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected');

    console.log('🧹 Clearing existing Departments & Categories...');
    const [catDelRes, deptDelRes] = await Promise.all([
      Category.deleteMany({}),
      Department.deleteMany({})
    ]);
    console.log(`   • Removed ${catDelRes.deletedCount} categories, ${deptDelRes.deletedCount} departments`);

    console.log('📥 Inserting categories...');
    const categories = await Category.insertMany(categoryData, { ordered: true });
    console.log(`   • Inserted ${categories.length} categories`);

    // Map category names to ids
    const catMap = categories.reduce((acc, c) => { acc[c.name] = c._id; return acc; }, {});

    console.log('📥 Preparing departments...');
    const deptDocs = departmentData.map(d => ({
      name: d.name,
      description: d.description,
      categories: (d.categories || []).map(n => catMap[n]).filter(Boolean)
    }));

    console.log('📥 Inserting departments...');
    const departments = await Department.insertMany(deptDocs, { ordered: true });
    console.log(`   • Inserted ${departments.length} departments`);

    console.log(`✅ Seeded ${categories.length} categories and ${departments.length} departments successfully in ${(Date.now()-started)}ms`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    if (err?.errors) console.error(Object.values(err.errors).map(e=>e.message));
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(()=>{});
  }
}

run();
