'use strict';

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAdmin } = require('../middleware/auth');

// POST /api/users/sync
router.post('/sync', userController.syncUser);

// GET /api/users
router.get('/', userController.listUsers);

// GET /api/users/:id
router.get('/:id', userController.getUserById);

// PATCH /api/users/:id (admin/superadmin only)
router.patch('/:id', requireAdmin, userController.updateUser);

// PUT /api/users/:id/phone
router.put('/:id/phone', userController.updateUserPhone);

// DELETE /api/users/:id (soft delete)
router.delete('/:id', userController.softDeleteUser);

module.exports = router;
