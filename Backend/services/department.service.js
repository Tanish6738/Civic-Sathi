'use strict';

const Department = require('../models/Department');

async function create(data) { return Department.create(data); }
async function list(filters = {}) { return Department.find(filters).sort({ name: 1 }); }
async function getById(id) { return Department.findById(id); }
async function update(id, updates) { return Department.findByIdAndUpdate(id, updates, { new: true }); }
async function remove(id) { return Department.findByIdAndDelete(id); }

module.exports = { create, list, getById, update, remove };
