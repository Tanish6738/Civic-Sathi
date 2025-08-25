'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  type: { type: String, required: true, trim: true },
  refReport: { type: Schema.Types.ObjectId, ref: 'Report' },
  payload: { type: Schema.Types.Mixed },
  readAt: { type: Date }
},{ timestamps: { createdAt: true, updatedAt: false } });

// Existing type/time index
NotificationSchema.index({ type: 1, createdAt: -1 });
// Frequent query patterns: by user sorted by recency
NotificationSchema.index({ user: 1, createdAt: -1 });
// Unread lookups (partial index could be used; generic compound works broadly)
NotificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
