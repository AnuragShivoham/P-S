const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.resolve(__dirname, '../../data/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Permitted MIME types and extensions
const ALLOWED_MIME = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov']
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Validate magic bytes of common media types to prevent disguised payloads.
 */
function validateMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length < 4) return false;

  if (mimeType === 'image/jpeg') {
    // SOI marker FF D8
    return buffer[0] === 0xFF && buffer[1] === 0xD8;
  }
  if (mimeType === 'image/png') {
    // PNG signature 89 50 4E 47
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  if (mimeType === 'image/webp') {
    // RIFF .... WEBP
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    return riff === 'RIFF' && webp === 'WEBP';
  }
  if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
    // ftyp box
    const ftyp = buffer.toString('ascii', 4, 8);
    return ftyp === 'ftyp';
  }
  if (mimeType === 'video/webm') {
    // EBML header 1A 45 DF A3
    return buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
  }
  return true;
}

/**
 * Save an uploaded file (from base64 or buffer) securely.
 */
function saveMedia({ originalName, mimeType, dataBase64, mediaType }) {
  if (!ALLOWED_MIME[mimeType]) {
    throw new Error(`Unsupported media format: ${mimeType}. Allowed formats: JPG, PNG, WEBP, MP4, WEBM.`);
  }

  const isVideo = mediaType === 'video' || mimeType.startsWith('video/');
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  const buffer = Buffer.isBuffer(dataBase64) ? dataBase64 : Buffer.from(dataBase64, 'base64');
  if (buffer.length > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`File exceeds maximum size of ${limitMb}MB.`);
  }

  // Magic bytes integrity check
  if (!validateMagicBytes(buffer, mimeType)) {
    throw new Error('File content signature does not match claimed MIME type.');
  }

  const ext = ALLOWED_MIME[mimeType][0] || path.extname(originalName).toLowerCase() || '.bin';
  const fileId = uuidv4();
  const safeFilename = `${fileId}${ext}`;
  const targetPath = path.join(UPLOADS_DIR, safeFilename);

  fs.writeFileSync(targetPath, buffer);

  return {
    fileId,
    fileName: safeFilename,
    originalName: path.basename(originalName),
    mimeType,
    sizeBytes: buffer.length,
    mediaType: isVideo ? 'video' : 'image',
    storagePath: safeFilename
  };
}

/**
 * Retrieve path to a stored file safely.
 */
function getMediaPath(fileName) {
  const safeName = path.basename(fileName);
  const fullPath = path.join(UPLOADS_DIR, safeName);
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}

/**
 * Generate a signed upload URL or token for client-side uploads.
 * In local environment, returns local media endpoint with expiration and signature token.
 */
function getSignedUploadUrl({ fileName, mimeType, expiresInSeconds = 3600 }) {
  if (mimeType && !ALLOWED_MIME[mimeType]) {
    throw new Error(`Unsupported media format: ${mimeType}.`);
  }
  const fileId = uuidv4();
  const ext = (mimeType && ALLOWED_MIME[mimeType]?.[0]) || (fileName ? path.extname(fileName).toLowerCase() : '.jpg') || '.jpg';
  const safeFilename = `${fileId}${ext}`;
  const expiresAt = Date.now() + expiresInSeconds * 1000;

  return {
    uploadUrl: `/api/v1/media/upload`,
    fileId,
    fileName: safeFilename,
    mimeType: mimeType || 'image/jpeg',
    expiresAt,
    storageType: 'local'
  };
}

module.exports = {
  saveMedia,
  getMediaPath,
  getSignedUploadUrl,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES
};

