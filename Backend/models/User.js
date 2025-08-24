'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// User Schema
// Note: Only createdAt is explicitly requested; we don't enable full timestamps.
const UserSchema = new Schema(
  {
  clerkId: { type: String, index: true, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, match: /^[0-9]{10}$/ },
    role: {
      type: String,
      enum: ['reporter', 'officer', 'admin', 'superadmin'],
      default: 'reporter',
      index: true
    },
    department: { type: String, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function (val) {
            return !val || (val.length === 2 && val.every(n => typeof n === 'number'));
          },
          message: 'Location must be an array of [lng, lat]'
        }
      }
    },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    minimize: true
  }
);

// Geospatial index
UserSchema.index({ location: '2dsphere' });

// Helpful compound index for lookups by role & department
UserSchema.index({ role: 1, department: 1 });

// Pre-save to strip invalid location docs that would break 2dsphere index
UserSchema.pre('save', function(next) {
  if (this.location && (!Array.isArray(this.location.coordinates) || this.location.coordinates.length !== 2)) {
    this.location = undefined; // remove invalid location
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
