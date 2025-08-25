const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFile } = require('../controllers/uploadController');

// Use memory storage so we can send the buffer directly to ImageKit
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// POST /api/upload  (multipart/form-data with field name "file")
router.post('/', upload.single('file'), uploadFile);

module.exports = router;
