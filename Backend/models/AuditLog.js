'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, trim: true },
    report: { type: Schema.Types.ObjectId, ref: 'Report', index: true }, // optional
    meta: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
  },
  { minimize: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
