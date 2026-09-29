const express = require('express');
const router = express.Router();
const fs = require('fs');
const mediaService = require('../services/mediaService');
const db = require('../db/database');

/**
 * GET /api/v1/media/:fileIdOrName
 * Serves media safely without exposing filesystem paths.
 * Supports HTTP Range requests for video seeking.
 */
router.get('/:identifier', (req, res) => {
  const { identifier } = req.params;

  // Lookup in DB or by filename
  let record = db.prepare('SELECT * FROM problem_media WHERE id = ? OR file_name = ?').get(identifier, identifier);
  const fileName = record ? record.file_name : identifier;

  const fullPath = mediaService.getMediaPath(fileName);
  if (!fullPath) {
    return res.status(404).json({ error: 'Media file not found' });
  }

  const stat = fs.statSync(fullPath);
  const fileSize = stat.size;
  const mimeType = record ? record.mime_type : 'application/octet-stream';

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(fullPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400'
    };
    res.writeHead(200, head);
    fs.createReadStream(fullPath).pipe(res);
  }
});

/**
 * POST /api/v1/media/signed-url
 * Returns upload instructions/signed URL metadata for client uploads.
 */
router.post('/signed-url', (req, res) => {
  try {
    const { fileName, mimeType } = req.body;
    const info = mediaService.getSignedUploadUrl({ fileName, mimeType });
    res.json(info);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/v1/media/upload
 * Accepts direct base64/data_url media upload.
 */
router.post('/upload', (req, res) => {
  try {
    const { originalName, mimeType, dataBase64, data_url, mediaType } = req.body;
    let payload = dataBase64;
    let resolvedMime = mimeType;

    if (data_url && typeof data_url === 'string' && data_url.includes(',')) {
      const parts = data_url.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match && !resolvedMime) resolvedMime = match[1];
      payload = parts[1];
    }

    if (!payload) {
      return res.status(400).json({ error: 'dataBase64 or data_url payload is required.' });
    }

    const saved = mediaService.saveMedia({
      originalName: originalName || 'upload',
      mimeType: resolvedMime || 'image/jpeg',
      dataBase64: payload,
      mediaType: mediaType || (resolvedMime?.startsWith('video/') ? 'video' : 'image')
    });

    res.status(201).json({
      media: saved,
      url: `/api/v1/media/${saved.fileId}`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

