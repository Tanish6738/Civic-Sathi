#!/usr/bin/env node
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Department = require('../models/Department');
const Report = require('../models/Report');
const categoryController = require('../controllers/categoryController');
const departmentController = require('../controllers/departmentController');

const DB = process.env.MONGO_URI || 'mongodb://localhost:27017/civic_structure_test';

function mockRes(){return{statusCode:200,body:null,status(c){this.statusCode=c;return this;},json(p){this.body=p;return this;}};}
async function callController(fn,{user,body={},params={},query={}}){const req={user,body,params,query,headers:{}};const res=mockRes();await fn(req,res);return res;}

async function main(){
  await mongoose.connect(DB,{dbName:DB.split('/').pop()});
  await Promise.all([User.deleteMany({}),Category.deleteMany({}),Department.deleteMany({}),Report.deleteMany({})]);
  let failures=0;const assert=(c,m)=>{if(!c){console.error('FAIL:',m);failures++;}else console.log('PASS:',m);};
  const admin=await User.create({name:'Admin',email:'admin@example.com',role:'admin',clerkId:'a1'});
  const officer=await User.create({name:'Officer',email:'off@example.com',role:'officer',clerkId:'o1'});
  const reporter=await User.create({name:'Reporter',email:'rep@example.com',role:'reporter',clerkId:'r1'});
  let r=await callController(categoryController.createCategory,{user:admin,body:{name:'Water Supply',keywords:['water','Water']}});assert(r.statusCode===200,'Admin created category Water Supply');const cat1=r.body.data;
  r=await callController(categoryController.createCategory,{user:admin,body:{name:'Road Safety',keywords:['road','safety']}});assert(r.statusCode===200,'Admin created category Road Safety');const cat2=r.body.data;
  r=await callController(departmentController.createDepartment,{user:admin,body:{name:'Infrastructure Dept',categories:[cat1._id,cat2._id],officers:[officer._id]}});assert(r.statusCode===200,'Department created with two categories');const dept=r.body.data;
  await Report.create({title:'Pothole',description:'Large pothole',reporter:reporter._id,category:cat1._id,status:'submitted'});
  r=await callController(departmentController.updateDepartment,{user:admin,params:{id:dept._id},body:{categories:[cat2._id]}});assert(r.statusCode===409,'Removing category with active report blocked');
  r=await callController(categoryController.softDeleteCategory,{user:admin,params:{id:cat2._id}});assert(r.statusCode===200 && r.body.message.includes('soft-deleted'),'Soft delete cat2 cascaded');
  r=await callController(departmentController.getDepartmentById,{user:admin,params:{id:dept._id}});const catNames=(r.body.data.categories||[]).map(c=>c.name);assert(catNames.includes('Water Supply')&&!catNames.includes('Road Safety'),'Soft-deleted category excluded from department fetch');
  for(let i=0;i<25;i++){await callController(departmentController.createDepartment,{user:admin,body:{name:`Dept${i+1}`,categories:[],officers:[]}});}r=await callController(departmentController.getDepartments,{user:admin,query:{page:2,limit:10}});assert(r.statusCode===200 && r.body.meta && r.body.meta.page===2 && r.body.data.length===10,'Department pagination working');
  if(failures){console.error(`\nStructure Phase 3-4 verification FAILED (${failures})`);process.exitCode=1;}else{console.log('\nStructure Phase 3-4 verification PASSED');}
  await mongoose.disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});