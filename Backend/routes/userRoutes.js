'use strict';

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /api/users/sync
router.post('/sync', userController.syncUser);

// GET /api/users
router.get('/', userController.listUsers);

// GET /api/users/:id
router.get('/:id', userController.getUserById);

// PATCH /api/users/:id
router.patch('/:id', userController.updateUser);

// DELETE /api/users/:id (soft delete)
router.delete('/:id', userController.softDeleteUser);

module.exports = router;
