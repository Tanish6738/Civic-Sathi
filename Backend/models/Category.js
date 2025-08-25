'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, unique: true },
    description: { type: String, trim: true },
    keywords: [{ type: String, trim: true }],
    defaultOfficers: [
      { type: Schema.Types.ObjectId, ref: 'User' }
    ],
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true, minimize: true }
);

// Indexes
CategorySchema.index({ keywords: 1 });
// Partial unique index to allow re-use of name when a previous doc is soft-deleted
CategorySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// Helper to generate slug from name (basic) – can evolve to handle collisions but unique + partial unique covers
function toSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

CategorySchema.pre('validate', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = toSlug(this.name || '');
  }
  next();
});

// Sanitize keywords & ensure uniqueness (lowercase)
CategorySchema.pre('save', function (next) {
  if (Array.isArray(this.keywords)) {
    const seen = new Set();
    this.keywords = this.keywords
      .map(k => (k || '').toString().trim().toLowerCase())
      .filter(k => k.length && k.length <= 40 && !seen.has(k) && (seen.add(k) || true));
  }
  next();
});

// Ensure defaultOfficers are unique
CategorySchema.pre('save', function (next) {
  if (Array.isArray(this.defaultOfficers) && this.defaultOfficers.length) {
    const unique = [...new Set(this.defaultOfficers.map(id => id.toString()))];
    this.defaultOfficers = unique;
  }
  next();
});

module.exports = mongoose.model('Category', CategorySchema);
