'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const PhotoSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed }
  },
  { _id: false }
);

const HistoryEntrySchema = new Schema(
  {
    by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['reporter', 'officer', 'admin', 'superadmin'], required: true },
    action: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ReportSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: false, index: true },
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTo: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'assigned',
        'in_progress',
        'awaiting_verification',
        'verified',
        'closed',
        'misrouted',
        'deleted'
      ],
      default: 'draft',
      index: true
    },
    // Optional reason captured when an officer marks misrouted.
    misrouteReason: { type: String, trim: true, maxlength: 500 },
    photosBefore: [PhotoSchema],
    photosAfter: [PhotoSchema],
    history: [HistoryEntrySchema]
  },
  { timestamps: true }
);

// Indexes for query performance
ReportSchema.index({ status: 1, category: 1 });
ReportSchema.index({ reporter: 1, createdAt: -1 });
ReportSchema.index({ assignedTo: 1, status: 1 });
// Composite for officer dashboard sorting by recent updates
ReportSchema.index({ assignedTo: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);
