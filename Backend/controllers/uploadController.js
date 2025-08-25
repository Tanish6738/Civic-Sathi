const imagekit = require('../utils/imagekit');

// Handles file upload via multipart/form-data (field name: file)
// Expects multer middleware to populate req.file (buffer storage)
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided (expected field name "file").' });
    }

    if (!imagekit.configured) {
      return res.status(500).json({ success: false, message: 'ImageKit not configured. Ask server admin to set environment variables.' });
    }

    const originalName = req.file.originalname || 'upload';

    const result = await imagekit.upload({
      file: req.file.buffer, // supports Buffer
      fileName: originalName.replace(/[^a-zA-Z0-9._-]/g, '_'),
      folder: req.body.folder || 'uploads',
      useUniqueFileName: true,
      tags: req.body.tags ? String(req.body.tags).split(',').map(t => t.trim()).filter(Boolean) : undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        height: result.height,
        width: result.width,
        size: result.size,
        fileType: result.fileType,
        AITags: result.AITags || null
      }
    });
  } catch (err) {
    console.error('[uploadController] Upload failed:', err?.message);
    return res.status(500).json({ success: false, message: 'Upload failed', error: err?.message });
  }
};
