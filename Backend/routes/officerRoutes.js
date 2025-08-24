'use strict';
const express = require('express');
const router = express.Router();
const officer = require('../controllers/officerController');
const { requireRole } = require('../middleware/auth');

// All officer endpoints require role officer|admin|superadmin (admin can act as override)
router.use(requireRole('officer','admin','superadmin'));

router.get('/reports', officer.listAssigned);
router.get('/dashboard', officer.dashboard);
router.get('/reports/history', officer.history);
router.post('/reports/:id/start', officer.startWork);
router.patch('/reports/:id/after-photos', officer.addAfterPhotos);
router.post('/reports/:id/submit-verification', officer.submitVerification);
router.post('/reports/:id/misroute', officer.misroute);

module.exports = router;
