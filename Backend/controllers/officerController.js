"use strict";

const mongoose = require("mongoose");
const Report = require("../models/Report");
const {
  normalizePhotos,
  applyStatusTransition,
} = require("../utils/reportUtils");
const {
  notifyMisroute,
  notifyAwaitingVerification,
} = require("../utils/notify");
const logger = require("../utils/logger");
const { inc } = require("../utils/metrics");

function respond(
  res,
  { success = true, status = 200, data = null, error = null }
) {
  return res.status(status).json({ success, data, error });
}

// GET /api/officer/reports?status=&search=&page=&limit=
exports.listAssigned = async (req, res) => {
  try {
    const user = req.user;
    const { status, search, page = 1, limit = 10 } = req.query;
    const filt = { assignedTo: user._id };
    if (status) filt.status = status;
    else filt.status = { $nin: ["deleted", "closed"] };
    if (search) {
      const rx = new RegExp(search, "i");
      filt.$or = [{ title: rx }, { description: rx }];
    }
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (p - 1) * l;
    const [items, total] = await Promise.all([
      Report.find(filt)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(l)
        .select("title status updatedAt category")
        .populate("category", "name"),
      Report.countDocuments(filt),
    ]);
    return respond(res, {
      data: {
        items,
        pagination: {
          page: p,
          limit: l,
          total,
          totalPages: Math.ceil(total / l),
        },
      },
    });
  } catch (e) {
    console.error("officer.listAssigned", e);
    return respond(res, { success: false, status: 500, error: "server_error" });
  }
};

// GET /api/officer/dashboard
exports.dashboard = async (req, res) => {
  try {
    const uid = req.user._id;
    const statuses = [
      "submitted",
      "assigned",
      "in_progress",
      "awaiting_verification",
      "misrouted",
    ];
    const agg = await Report.aggregate([
      { $match: { assignedTo: uid, status: { $in: statuses } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const counts = statuses.reduce((acc, s) => {
      acc[s] = 0;
      return acc;
    }, {});
    for (const r of agg) counts[r._id] = r.count;
    const active = await Report.countDocuments({
      assignedTo: uid,
      status: { $in: ["in_progress"] },
    });
    return respond(res, { data: { counts, activeInProgress: active } });
  } catch (e) {
    console.error("officer.dashboard", e);
    return respond(res, { success: false, status: 500, error: "server_error" });
  }
};

// GET /api/officer/reports/history?from=&to=&page=&limit=
exports.history = async (req, res) => {
  try {
    const { from, to, page = 1, limit = 10 } = req.query;
    const uid = req.user._id;
    const filt = {
      assignedTo: uid,
      status: { $in: ["closed", "verified", "misrouted"] },
    };
    if (from || to) {
      filt.updatedAt = {};
      if (from) filt.updatedAt.$gte = new Date(from);
      if (to) filt.updatedAt.$lte = new Date(to);
    }
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (p - 1) * l;
    const [items, total] = await Promise.all([
      Report.find(filt)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(l)
        .select("title status updatedAt")
        .lean(),
      Report.countDocuments(filt),
    ]);
    return respond(res, {
      data: {
        items,
        pagination: {
          page: p,
          limit: l,
          total,
          totalPages: Math.ceil(total / l),
        },
      },
    });
  } catch (e) {
    console.error("officer.history", e);
    return respond(res, { success: false, status: 500, error: "server_error" });
  }
};

async function loadAssignedReport(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: "invalid_id" };
  const r = await Report.findById(id);
  if (!r) return { error: "not_found" };
  const assigned = r.assignedTo?.some(
    (x) => String(x) === String(req.user._id)
  );
  if (!assigned && !["admin", "superadmin"].includes(req.user.role))
    return { error: "not_assigned" };
  return { report: r };
}

// POST /api/officer/reports/:id/start
exports.startWork = async (req, res) => {
  try {
    const { report, error } = await loadAssignedReport(req, res);
    if (error) return respond(res, { success: false, status: 404, error });
    const tr = await applyStatusTransition(report, "in_progress", req.user);
    logger.info(req.cid, "officer_start_work", {
      report: report._id,
      officer: req.user._id,
    });
    if (!tr.ok)
      return respond(res, { success: false, status: 409, error: tr.error });
    await report.save();
    inc("officer_status_transition", { to: "in_progress" });
    // Notification for awaiting verification
    try {
      await notifyAwaitingVerification(report);
    } catch (_) {}
    return respond(res, { data: report });
  } catch (e) {
    console.error("officer.startWork", e);
    return respond(res, { success: false, status: 500, error: "server_error" });
  }
};

// PATCH /api/officer/reports/:id/after-photos { photos: [] }
exports.addAfterPhotos = async (req, res) => {
  try {
    const { report, error } = await loadAssignedReport(req, res);
    if (error) return respond(res, { success: false, status: 404, error });
    const { photos } = req.body || {};
    const normalized = normalizePhotos(photos);
    const max = 10;
    if ((report.photosAfter?.length || 0) + normalized.length > max) {
      return respond(res, {
        success: false,
        status: 400,
        error: "after_photos_limit",
      });
    }
    report.photosAfter = [...(report.photosAfter || []), ...normalized];
    report.history.push({
      by: req.user._id,
      role: req.user.role,
      action: `added_after_photos:${normalized.length}`,
    });
    inc("officer_added_after_photos");
    logger.info(req.cid, "officer_added_after_photos", {
      report: report._id,
      count: normalized.length,
    });
    await report.save();
    return respond(res, { data: { count: report.photosAfter.length } });
  } catch (e) {
    console.error("officer.addAfterPhotos", e);
    return respond(res, { success: false, status: 500, error: "server_error" });
  }
};

// POST /api/officer/reports/:id/submit-verification
exports.submitVerification = async (req, res) => {
  try {
    const { report, error } = await loadAssignedReport(req, res);
    if (error) return respond(res, { success: false, status: 404, error });
    const tr = await applyStatusTransition(
      report,
      "awaiting_verification",
      req.user
    );
    inc("officer_status_transition", { to: "awaiting_verification" });
    logger.info(req.cid, "officer_submit_verification", { report: report._id });
    if (!tr.ok)
      return respond(res, { success: false, status: 409, error: tr.error });
    await report.save();
    try {
      await notifyMisroute(report);
    } catch (_) {}
    return respond(res, { data: report });
  } catch (e) {
    console.error("officer.submitVerification", e);
    return respond(res, { success: false, status: 500, error: "server_error" });
  }
};

// POST /api/officer/reports/:id/misroute { reason }
exports.misroute = async (req, res) => {
  try {
    const { report, error } = await loadAssignedReport(req, res);
    if (error) return respond(res, { success: false, status: 404, error });
    const { reason } = req.body || {};
    const tr = await applyStatusTransition(report, "misrouted", req.user, {
      reason,
    });
    inc("officer_status_transition", { to: "misrouted" });
    logger.warn(req.cid, "officer_misroute", { report: report._id, reason });
    if (!tr.ok)
      return respond(res, { success: false, status: 409, error: tr.error });
    await report.save();
    return respond(res, { data: report });
  } catch (e) {
    console.error("officer.misroute", e);
    return respond(res, { success: false, status: 500, error: "server_error" });
  }
};
