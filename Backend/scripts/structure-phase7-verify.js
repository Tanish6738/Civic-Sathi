#!/usr/bin/env node
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const categoryController = require('../controllers/categoryController');
const departmentController = require('../controllers/departmentController');

const DB = process.env.MONGO_URI || 'mongodb://localhost:27017/civic_structure_test';
function mockRes(){return{statusCode:200,body:null,headers:{},setHeader(){},status(c){this.statusCode=c;return this;},json(p){this.body=p;return this;},send(d){this.body=d;return this;}};}
async function callController(fn,{user,body={},params={},query={}}){const req={user,body,params,query,headers:{}};const res=mockRes();await fn(req,res);return res;}
async function main(){
  await mongoose.connect(DB,{dbName:DB.split('/').pop()});
  await Promise.all([User.deleteMany({}),Category.deleteMany({}),Department.deleteMany({}),AuditLog.deleteMany({})]);
  let failures=0;const assert=(c,m)=>{if(!c){console.error('FAIL:',m);failures++;}else console.log('PASS:',m);};
  const admin=await User.create({name:'Admin',email:'admin@example.com',role:'admin',clerkId:'aA'});

  // Bulk import categories
  let r=await callController(categoryController.bulkImportCategories,{user:admin,body:{categories:[{name:'Water',description:'Water mgmt'},{name:'Roads'},{name:'Parks',keywords:['Green','Trees']}]}});
  assert(r.statusCode===200 && r.body.data.created.length===3,'Bulk create categories');
  // Re-import with updates & one invalid row
  r=await callController(categoryController.bulkImportCategories,{user:admin,body:{categories:[{name:'Water',description:'Updated desc'},{name:'Roads',keywords:['asphalt']},{name:'X',description:'Too short name'},{name:'Parks',keywords:['Green','Trees','Play']}]}});
  assert(r.statusCode===200 && r.body.data.updated.length===3 && r.body.data.errors.length===1,'Bulk update + skip invalid');

  // Soft delete Water then bulk restore with restoreDeleted flag
  const water = await Category.findOne({name:'Water'});
  await Category.updateOne({_id:water._id},{isDeleted:true});
  r=await callController(categoryController.bulkImportCategories,{user:admin,body:{categories:[{name:'Water',description:'Restored via bulk'}],options:{restoreDeleted:true}}});
  assert(r.body.data.restored.length===1,'Bulk restore soft-deleted category');

  // Export JSON
  r=await callController(categoryController.exportCategories,{user:admin,query:{format:'json'}});
  assert(r.statusCode===200 && Array.isArray(r.body.data) && r.body.data.length>=3,'Export JSON categories');

  // Create department
  const catIds = (await Category.find({}).select('_id')).map(c=>c._id);
  r=await callController(departmentController.createDepartment,{user:admin,body:{name:'Infrastructure'}});
  assert(r.statusCode===200,'Create department for bulk-assign');
  const deptId = r.body.data._id;
  // Bulk-assign categories
  r=await callController(departmentController.bulkAssign,{user:admin,body:{departmentId:deptId,addCategories:catIds}});
  assert(r.statusCode===200 && r.body.data.categories.length===catIds.length,'Bulk assign categories to department');

  // Bulk-assign officers invalid
  r=await callController(departmentController.bulkAssign,{user:admin,body:{departmentId:deptId,addOfficers:['invalidid']}});
  assert(r.statusCode===400,'Bulk assign invalid officer returns 400');

  // Audit logs produced
  const bulkUpdateLogs = await AuditLog.find({ action:'CATEGORY_UPDATE', 'meta.via':'bulk'});
  assert(bulkUpdateLogs.length>=1,'Bulk category update audit logs');
  const bulkAssignLogs = await AuditLog.find({ action:'DEPARTMENT_UPDATE', 'meta.via':'bulk-assign'});
  assert(bulkAssignLogs.length===1,'Bulk assign audit log');

  if(failures){console.error(`\nStructure Phase 7 verification FAILED (${failures})`);process.exitCode=1;}else{console.log('\nStructure Phase 7 verification PASSED');}
  await mongoose.disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});
