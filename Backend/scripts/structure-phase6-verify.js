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
function mockRes(){return{statusCode:200,body:null,status(c){this.statusCode=c;return this;},json(p){this.body=p;return this;}};}
async function callController(fn,{user,body={},params={},query={}}){const req={user,body,params,query,headers:{}};const res=mockRes();await fn(req,res);return res;}
async function main(){
  await mongoose.connect(DB,{dbName:DB.split('/').pop()});
  await Promise.all([User.deleteMany({}),Category.deleteMany({}),Department.deleteMany({}),AuditLog.deleteMany({})]);
  let failures=0;const assert=(c,m)=>{if(!c){console.error('FAIL:',m);failures++;}else console.log('PASS:',m);};
  const admin=await User.create({name:'Admin',email:'admin@example.com',role:'admin',clerkId:'aA'});

  // Create two categories
  let r=await callController(categoryController.createCategory,{user:admin,body:{name:'Water',description:'Water mgmt'}});assert(r.statusCode===200,'Create category Water');
  const waterId=r.body.data._id;
  r=await callController(categoryController.createCategory,{user:admin,body:{name:'Roads',description:'Road infra'}});assert(r.statusCode===200,'Create category Roads');
  const roadsId=r.body.data._id;

  // Soft delete one
  r=await callController(categoryController.softDeleteCategory,{user:admin,params:{id:waterId}});assert(r.statusCode===200,'Soft delete Water');

  // List active only default
  r=await callController(categoryController.listCategories,{user:admin,query:{}});assert(r.body.meta.total===1 && r.body.meta.activeCount===1 && r.body.meta.deletedCount===1,'List active categories meta counts');
  // List deletedOnly
  r=await callController(categoryController.listCategories,{user:admin,query:{deletedOnly:'true',limit:50}});
  // Debug: ensure we see what came back
  // console.log('DeletedOnly categories payload', r.body);
  assert(r.body.data.length===1 && String(r.body.data[0]._id)===String(waterId),'List deletedOnly categories');
  // Include deleted for managers
  r=await callController(categoryController.listCategories,{user:admin,query:{includeDeleted:'true'}});assert(r.body.data.length===2,'Include deleted categories');

  // Restore category
  r=await callController(categoryController.restoreCategory,{user:admin,params:{id:waterId}});assert(r.statusCode===200 && r.body.data.isDeleted!==true,'Restore category');
  let logs=await AuditLog.find({action:'CATEGORY_RESTORE'});assert(logs.length===1,'CATEGORY_RESTORE audit');

  // Department create and soft delete
  r=await callController(departmentController.createDepartment,{user:admin,body:{name:'Infrastructure',description:'Handles infra',categories:[roadsId,waterId]}});assert(r.statusCode===200,'Create department');
  const deptId=r.body.data._id;
  r=await callController(departmentController.deleteDepartment,{user:admin,params:{id:deptId}});assert(r.statusCode===200,'Soft delete department');
  // List deletedOnly departments
  r=await callController(departmentController.getDepartments,{user:admin,query:{deletedOnly:'true',limit:50}});assert(r.body.data.length===1 && String(r.body.data[0]._id)===String(deptId),'List deletedOnly departments');
  // Restore department
  r=await callController(departmentController.restoreDepartment,{user:admin,params:{id:deptId}});assert(r.statusCode===200 && r.body.data.isDeleted!==true,'Restore department');
  logs=await AuditLog.find({action:'DEPARTMENT_RESTORE'});assert(logs.length===1,'DEPARTMENT_RESTORE audit');

  // Sorting check (desc name)
  r=await callController(categoryController.listCategories,{user:admin,query:{sort:'-name'}});const names=r.body.data.map(c=>c.name);const sorted=[...names].sort().reverse();assert(JSON.stringify(names)===JSON.stringify(sorted),'Category sort -name');

  if(failures){console.error(`\nStructure Phase 6 verification FAILED (${failures})`);process.exitCode=1;}else{console.log('\nStructure Phase 6 verification PASSED');}
  await mongoose.disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});
