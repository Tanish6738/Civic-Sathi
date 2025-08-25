"use strict";

const mongoose = require('mongoose');

function isValidObjectId(id) { return mongoose.Types.ObjectId.isValid(id); }

function parsePagination(query, { maxLimit = 100, defaultLimit = 20 } = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  page = Number.isNaN(page) || page < 1 ? 1 : page;
  limit = Number.isNaN(limit) || limit < 1 ? defaultLimit : Math.min(limit, maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { isValidObjectId, parsePagination };