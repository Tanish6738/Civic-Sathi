'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    keywords: [{ type: String, trim: true }],
    defaultOfficers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CategorySchema.index({ name: 1 }, { unique: true });
CategorySchema.index({ keywords: 1 });

module.exports = mongoose.model('Category', CategorySchema);
