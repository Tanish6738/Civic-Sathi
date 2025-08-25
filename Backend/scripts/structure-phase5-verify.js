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
  // Create category
  let r=await callController(categoryController.createCategory,{user:admin,body:{name:'Sanitation',keywords:['Clean']}});assert(r.statusCode===200,'Create category');
  let logs=await AuditLog.find({action:'CATEGORY_CREATE'});assert(logs.length===1,'CATEGORY_CREATE audit recorded');
  const catId=r.body.data._id;
  // Update category
  r=await callController(categoryController.updateCategory,{user:admin,params:{id:catId},body:{description:'Waste & cleanliness'}});assert(r.statusCode===200,'Update category');
  logs=await AuditLog.find({action:'CATEGORY_UPDATE'});assert(logs.length===1 && logs[0].meta.diff.description,'CATEGORY_UPDATE diff recorded');
  // Soft delete category
  r=await callController(categoryController.softDeleteCategory,{user:admin,params:{id:catId}});assert(r.statusCode===200,'Soft delete category');
  logs=await AuditLog.find({action:'CATEGORY_SOFT_DELETE'});assert(logs.length===1,'CATEGORY_SOFT_DELETE recorded');
  // Department create (with initial description so we can diff description later)
  r=await callController(departmentController.createDepartment,{user:admin,body:{name:'Civic Works',description:'Initial department description',categories:[],officers:[]}});assert(r.statusCode===200,'Create department');
  logs=await AuditLog.find({action:'DEPARTMENT_CREATE'});assert(logs.length===1,'DEPARTMENT_CREATE recorded');
  const deptId=r.body.data._id;
  // Department update (change description only)
  r=await callController(departmentController.updateDepartment,{user:admin,params:{id:deptId},body:{description:'Updated department description'}});assert(r.statusCode===200,'Update department');
  logs=await AuditLog.find({action:'DEPARTMENT_UPDATE'});
  const deptUpdateDescDiff = logs.length===1 && logs[0].meta && logs[0].meta.diff && logs[0].meta.diff.description;
  assert(deptUpdateDescDiff,'DEPARTMENT_UPDATE diff recorded');
  // Department soft delete
  r=await callController(departmentController.deleteDepartment,{user:admin,params:{id:deptId}});assert(r.statusCode===200,'Soft delete department');
  logs=await AuditLog.find({action:'DEPARTMENT_SOFT_DELETE'});assert(logs.length===1,'DEPARTMENT_SOFT_DELETE recorded');
  if(failures){console.error(`\nStructure Phase 5 verification FAILED (${failures})`);process.exitCode=1;}else{console.log('\nStructure Phase 5 verification PASSED');}
  await mongoose.disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});