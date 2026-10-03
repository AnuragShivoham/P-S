/**
 * Network and API configuration for SOCRATES frontend.
 * Provides environment-aware URLs for REST, WebSockets, media, and previews.
 */

// Strip trailing slash if provided in environment variable
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

/**
 * Gets the base WebSocket URL.
 * Automatically resolves from VITE_WS_URL, VITE_API_URL, or falls back to development port 3001.
 */
export function getWsBaseUrl() {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/\/+$/, '');
  }
  
  if (API_BASE_URL) {
    // Convert http:// -> ws:// and https:// -> wss://
    return API_BASE_URL.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
  }

  if (import.meta.env.PROD) {
    throw new Error('VITE_API_URL or VITE_WS_URL must be configured for production.');
  }

  // Fallback for local development or same-host deployments
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const port = window.location.port;

  // In local Vite dev server where frontend runs on 5173 / 3000 / 5174, default backend is 3001
  if (port === '5173' || port === '3000' || port === '5174') {
    return `${protocol}//${window.location.hostname}:3001`;
  }

  return `${protocol}//${window.location.host}`;
}

/**
 * Returns full API URL for a path (e.g. '/api/v1/projects')
 */
export function getApiUrl(path = '') {
  if (import.meta.env.PROD && !API_BASE_URL) {
    throw new Error('VITE_API_URL must be set to the backend HTTPS origin for production.');
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Constructs a full WebSocket URL with optional query parameters.
 * @param {string} path - e.g. '/api/v1/terminal' or '/api/v1/session'
 * @param {object} params - query parameters like { projectId, token }
 */
export function getWsUrl(path = '', params = {}) {
  const base = getWsBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const qs = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, value);
    }
  });

  const queryString = qs.toString();
  return queryString ? `${base}${cleanPath}?${queryString}` : `${base}${cleanPath}`;
}

/**
 * Returns URL for media attachments
 */
export function getMediaUrl(mediaId) {
  return getApiUrl(`/api/v1/media/${mediaId}`);
}

/**
 * Returns URL for the project live preview frame
 */
export function getPreviewUrl(projectId, subpath = '', token = '') {
  const cleanSubpath = subpath ? (subpath.startsWith('/') ? subpath.slice(1) : subpath) : '';
  const path = token
    ? `/api/v1/preview/${projectId}/${encodeURIComponent(token)}/${cleanSubpath}`
    : cleanSubpath
      ? `/api/v1/preview/${projectId}/${cleanSubpath}`
      : `/api/v1/preview/${projectId}`;
  return getApiUrl(path);
}
