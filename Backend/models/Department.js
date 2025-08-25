'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    officers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true, minimize: true }
);

// Indexes
DepartmentSchema.index({ categories: 1 });
DepartmentSchema.index({ officers: 1 });
DepartmentSchema.index({ name: 1, isDeleted: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// De-duplicate arrays pre-save
DepartmentSchema.pre('save', function (next) {
  if (Array.isArray(this.officers)) {
    this.officers = [...new Set(this.officers.map(id => id.toString()))];
  }
  if (Array.isArray(this.categories)) {
    this.categories = [...new Set(this.categories.map(id => id.toString()))];
  }
  next();
});

module.exports = mongoose.model('Department', DepartmentSchema);
