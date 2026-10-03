const express = require('express');
const router = express.Router();
const fs = require('fs');
const mediaService = require('../services/mediaService');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/v1/media/:fileIdOrName
 * Serves media safely without exposing filesystem paths.
 * Supports HTTP Range requests for video seeking.
 */
router.get('/:identifier', (req, res) => {
  const { identifier } = req.params;

  const record = db.prepare('SELECT * FROM problem_media WHERE id = ? OR file_name = ?').get(identifier, identifier);
  const privateUpload = record ? null : db.prepare('SELECT * FROM private_media_uploads WHERE file_name = ?').get(identifier);
  if (!record && !privateUpload) return res.status(404).json({ error: 'Media file not found' });

  if (record) {
    const problem = db.prepare('SELECT user_id, status FROM societal_problems WHERE id = ?').get(record.problem_id);
    const isPublic = problem && ['PUBLISHED', 'ADOPTED'].includes(problem.status);
    const isOwner = req.user && problem?.user_id === req.user.id;
    const isReviewer = req.user && ['admin', 'mentor', 'university'].includes(req.user.role);
    if (!isPublic && !isOwner && !isReviewer) return res.status(req.user ? 403 : 401).json({ error: 'Media access denied.' });
  } else if (!req.user || (privateUpload.owner_id !== req.user.id && !['admin', 'mentor', 'university'].includes(req.user.role))) {
    return res.status(req.user ? 403 : 401).json({ error: 'Media access denied.' });
  }

  const fileName = record ? record.file_name : privateUpload.file_name;

  const fullPath = mediaService.getMediaPath(fileName);
  if (!fullPath) {
    return res.status(404).json({ error: 'Media file not found' });
  }

  const stat = fs.statSync(fullPath);
  const fileSize = stat.size;
  const mimeType = record ? record.mime_type : 'application/octet-stream';
  const mediaCacheControl = record ? 'public, max-age=86400' : 'private, no-store';

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
      'Cache-Control': mediaCacheControl,
      'Referrer-Policy': 'no-referrer',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Cache-Control': mediaCacheControl,
      'Referrer-Policy': 'no-referrer'
    };
    res.writeHead(200, head);
    fs.createReadStream(fullPath).pipe(res);
  }
});

/**
 * POST /api/v1/media/signed-url
 * Returns upload instructions/signed URL metadata for client uploads.
 */
router.post('/signed-url', authMiddleware, (req, res) => {
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
router.post('/upload', authMiddleware, (req, res) => {
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

    const uploadStats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM private_media_uploads WHERE owner_id = ?) +
        (SELECT COUNT(*) FROM problem_media pm JOIN societal_problems sp ON sp.id = pm.problem_id WHERE sp.user_id = ?) AS file_count,
        (SELECT COALESCE(SUM(size_bytes), 0) FROM private_media_uploads WHERE owner_id = ?) +
        (SELECT COALESCE(SUM(pm.size_bytes), 0) FROM problem_media pm JOIN societal_problems sp ON sp.id = pm.problem_id WHERE sp.user_id = ?) AS total_bytes
    `).get(req.user.id, req.user.id, req.user.id, req.user.id);
    const incomingBytes = Buffer.from(payload, 'base64').length;
    if (uploadStats.file_count >= 100 || uploadStats.total_bytes + incomingBytes > 250 * 1024 * 1024) {
      return res.status(429).json({ error: 'Upload quota reached for this account.' });
    }

    const saved = mediaService.saveMedia({
      originalName: originalName || 'upload',
      mimeType: resolvedMime || 'image/jpeg',
      dataBase64: payload,
      mediaType: mediaType || (resolvedMime?.startsWith('video/') ? 'video' : 'image')
    });
    db.prepare('INSERT INTO private_media_uploads (file_name, owner_id, size_bytes) VALUES (?, ?, ?)')
      .run(saved.fileName, req.user.id, saved.sizeBytes);

    res.status(201).json({
      media: saved,
      url: `/api/v1/media/${saved.fileId}`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

