'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    officers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }]
  },
  { timestamps: true }
);

DepartmentSchema.index({ name: 1 }, { unique: true });
DepartmentSchema.index({ categories: 1 });

module.exports = mongoose.model('Department', DepartmentSchema);
