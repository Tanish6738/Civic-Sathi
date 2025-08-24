'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ActionPhotoSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    type: { type: String, trim: true } // e.g., evidence, progress, completion
  },
  { _id: false }
);

const ActionSchema = new Schema(
  {
    report: { type: Schema.Types.ObjectId, ref: 'Report', required: true, index: true },
    officer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    note: { type: String, trim: true },
    photos: [ActionPhotoSchema],
    createdAt: { type: Date, default: Date.now }
  },
  { minimize: true }
);

ActionSchema.index({ officer: 1, createdAt: -1 });

module.exports = mongoose.model('Action', ActionSchema);
