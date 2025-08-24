'use strict';

const express = require('express');
const router = express.Router();
const actionController = require('../controllers/actionController');

router.post('/', actionController.createAction);
router.get('/', actionController.listActions);
router.get('/:id', actionController.getActionById);
router.patch('/:id', actionController.updateAction);
router.delete('/:id', actionController.deleteAction);

module.exports = router;
