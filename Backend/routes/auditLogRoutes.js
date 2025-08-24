'use strict';

const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');

router.post('/', auditLogController.createAuditLog);
router.get('/', auditLogController.listAuditLogs);
router.get('/:id', auditLogController.getAuditLogById);

module.exports = router;
