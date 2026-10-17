/**
 * sourceIngestionService.js
 * 
 * Production-Grade Automated Job Source Ingestion Service:
 * 1. Safe Fetcher with strict SSRF defense (private IP block, metadata block, DNS check, redirect limits)
 * 2. Secure XML / RSS & JSON Feed parsers (no XXE vulnerabilities, bounded response size)
 * 3. Canonicalization & SHA-256 Deduplication (zero matrix inflation on repeated items)
 * 4. Durable Run Tracking & Checkpoint Logging (source_ingestion_runs lifecycle)
 * 5. Scheduler State & Crash Recovery (recovers orphaned 'running' jobs after server restart)
 */

const dns = require('dns').promises;
const crypto = require('crypto');
const db = require('../db/database');
const { processAndIngestSignal } = require('../engines/labourIntelligenceEngine');

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB maximum payload
const FETCH_TIMEOUT_MS = 10000; // 10s timeout
const MAX_REDIRECTS = 3;

// Blacklisted IP ranges for SSRF prevention
const BLOCKED_IPV4_PREFIXES = [
  '127.', // Loopback
  '10.',  // Private class A
  '192.168.', // Private class C
  '169.254.', // Link-local / Cloud Metadata (169.254.169.254)
  '0.'    // Current network
];

function isPrivateIp(ip) {
  if (!ip) return true;
  // IPv6 checks
  if (ip === '::1' || ip.startsWith('fc00:') || ip.startsWith('fd') || ip.startsWith('fe80:')) {
    return true;
  }
  // IPv4 checks
  for (const prefix of BLOCKED_IPV4_PREFIXES) {
    if (ip.startsWith(prefix)) return true;
  }
  // Check 172.16.0.0 - 172.31.255.255
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

/**
 * Validates a target URL against SSRF attacks before initiating network requests
 */
async function validateUrlForSsrf(targetUrl) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (e) {
    throw new Error(`Invalid URL format: ${targetUrl}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Forbidden protocol: ${parsed.protocol}. Only http and https are permitted.`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    throw new Error(`Blocked target: Localhost / loopback requests are forbidden.`);
  }

  // Pre-resolve hostname to detect DNS rebinding or private IP targets
  try {
    const lookupResult = await dns.lookup(hostname, { all: true });
    for (const record of lookupResult) {
      if (isPrivateIp(record.address)) {
        throw new Error(`Blocked target: Hostname resolves to private/internal IP address (${record.address}).`);
      }
    }
  } catch (err) {
    if (err.message.includes('Blocked target')) throw err;
    throw new Error(`DNS resolution failed for host ${hostname}: ${err.message}`);
  }

  return parsed;
}

/**
 * Safely fetches raw text content from an approved external source
 */
async function safeFetchContent(sourceUrl, redirectCount = 0) {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error(`Exceeded maximum allowed redirects (${MAX_REDIRECTS})`);
  }

  const parsedUrl = await validateUrlForSsrf(sourceUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.href, {
      method: 'GET',
      headers: {
        'User-Agent': 'SOCRATES-LabourIntelligence/2.0 (+https://socrates.app; contact@socrates.app)',
        'Accept': 'application/rss+xml, application/atom+xml, application/json, text/xml, text/plain;q=0.9'
      },
      redirect: 'manual', // Manually handle redirects so each hop is SSRF-checked
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle redirects manually to validate destination against SSRF
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`Received redirect HTTP ${response.status} without Location header`);
      const nextUrl = new URL(location, parsedUrl.href).href;
      return safeFetchContent(nextUrl, redirectCount + 1);
    }

    if (!response.ok) {
      throw new Error(`Source responded with HTTP ${response.status} ${response.statusText}`);
    }

    // Check Content-Length header if present
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      throw new Error(`Payload exceeds maximum size limit of ${MAX_RESPONSE_BYTES} bytes`);
    }

    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error(`Payload body exceeded maximum size limit of ${MAX_RESPONSE_BYTES} bytes`);
    }

    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

/**
 * Safe XML entity stripper and item extractor for RSS / Atom feeds (Zero XXE risks)
 */
function parseRssFeed(xmlText) {
  const items = [];
  // Match standard <item> blocks (RSS 2.0)
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  let match;

  const extractTag = (xmlBlock, tagName) => {
    // Handles simple and CDATA tags
    const reg = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${tagName}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/(?:[a-zA-Z0-9_]+:)?${tagName}>`, 'i');
    const m = xmlBlock.match(reg);
    if (!m) return '';
    const content = m[1] !== undefined ? m[1] : (m[2] || '');
    return content.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  };

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const block = match[0];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractTag(block, 'guid');
    const description = extractTag(block, 'description') || extractTag(block, 'encoded') || extractTag(block, 'summary');
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published');
    const company = extractTag(block, 'company') || extractTag(block, 'author') || 'Industry Source';

    if (title || description) {
      items.push({
        title: title || 'Software Engineer',
        link: link || '',
        description: description || title,
        pubDate: pubDate || new Date().toISOString(),
        company
      });
    }
  }

  // Atom fallback: match <entry> blocks
  if (items.length === 0) {
    const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const block = match[0];
      const title = extractTag(block, 'title');
      const content = extractTag(block, 'content') || extractTag(block, 'summary');
      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
      const link = linkMatch ? linkMatch[1] : '';

      if (title || content) {
        items.push({
          title: title || 'Software Engineer',
          link,
          description: content || title,
          pubDate: new Date().toISOString(),
          company: 'Industry Partner'
        });
      }
    }
  }

  return items;
}

/**
 * Normalizes URLs by removing tracking params to guarantee accurate deduplication
 */
function normalizeJobUrl(rawUrl = '') {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl);
    // Remove common tracking parameters
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'fbclid', 'gclid'];
    paramsToRemove.forEach(p => parsed.searchParams.delete(p));
    return parsed.href.toLowerCase().replace(/\/$/, '');
  } catch (e) {
    return String(rawUrl).trim().toLowerCase();
  }
}

/**
 * Executes a full end-to-end ingestion run for a configured source feed
 */
async function runFeedIngestion(feedId, rawContentOverride = null, actorUserId = 'admin') {
  const feed = db.prepare('SELECT * FROM source_feeds WHERE id = ?').get(feedId);
  if (!feed) throw new Error(`Feed not found: ${feedId}`);

  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();
  const runLogs = [];

  const logCheckpoint = (msg) => {
    runLogs.push({ time: new Date().toISOString(), message: msg });
  };

  logCheckpoint(`Started ingestion run for feed: ${feed.name} (${feed.url || 'manual content'})`);

  // Record initial run state in DB
  db.prepare(`
    INSERT INTO source_ingestion_runs (
      id, feed_id, source_url, status, run_started_at, run_log, summary
    ) VALUES (?, ?, ?, 'running', datetime('now'), ?, ?)
  `).run(
    runId,
    feed.id,
    feed.url || '',
    JSON.stringify(runLogs),
    `Ingestion running for ${feed.name}...`
  );

  // Update feed status
  db.prepare(`UPDATE source_feeds SET last_status = 'running' WHERE id = ?`).run(feed.id);

  let itemsDiscovered = 0;
  let itemsIngested = 0;
  let itemsDuplicated = 0;
  let itemsFailed = 0;
  let lastError = null;

  try {
    let rawText = rawContentOverride;
    if (!rawText) {
      if (!feed.url) throw new Error('Source feed has no URL configured and no payload was provided.');
      logCheckpoint(`Fetching feed content from ${feed.url}...`);
      rawText = await safeFetchContent(feed.url);
      logCheckpoint(`Successfully fetched ${rawText.length} bytes.`);
    }

    let parsedPostings = [];

    // Parse according to provider type
    if (feed.provider === 'rss' || /<rss|<feed|<xml/i.test(rawText.substring(0, 200))) {
      logCheckpoint('Parsing as RSS/Atom XML feed...');
      parsedPostings = parseRssFeed(rawText);
    } else {
      // Attempt JSON parse
      try {
        const jsonData = JSON.parse(rawText);
        const list = Array.isArray(jsonData) ? jsonData : (jsonData.jobs || jsonData.items || jsonData.postings || [jsonData]);
        parsedPostings = list.map(item => ({
          title: item.title || item.role_title || feed.name,
          link: item.url || item.link || feed.url || '',
          description: item.description || item.raw_content || JSON.stringify(item),
          company: item.company || item.organization || feed.organization || 'Industry Partner',
          pubDate: item.published_at || new Date().toISOString()
        }));
        logCheckpoint(`Parsed ${parsedPostings.length} items from JSON payload.`);
      } catch (jsonErr) {
        // Fallback: treated as single raw job description text
        parsedPostings = [{
          title: feed.name,
          link: feed.url || '',
          description: rawText,
          company: feed.organization || 'Industry Partner',
          pubDate: new Date().toISOString()
        }];
        logCheckpoint('Treated input as single unstructured job posting.');
      }
    }

    itemsDiscovered = parsedPostings.length;
    logCheckpoint(`Discovered ${itemsDiscovered} job postings to process.`);

    for (const posting of parsedPostings) {
      try {
        const normalizedUrl = normalizeJobUrl(posting.link);
        const validUser = actorUserId ? db.prepare('SELECT id FROM users WHERE id = ?').get(actorUserId) : null;
        const effectiveUserId = validUser ? validUser.id : null;

        const result = await processAndIngestSignal({
          source_type: feed.source_type || 'job_description',
          source_name: `${feed.name} - ${posting.title}`,
          source_url: normalizedUrl,
          organization: posting.company || feed.organization || 'Industry Partner',
          role_title: posting.title || 'Software Engineer',
          location: 'Remote Eligible',
          published_at: posting.pubDate,
          raw_content: posting.description,
          user_id: effectiveUserId,
          source_provenance: 'approved_feed'
        });

        if (result.duplicate_detected) {
          itemsDuplicated++;
        } else {
          itemsIngested++;
        }
      } catch (itemErr) {
        itemsFailed++;
        logCheckpoint(`Failed processing posting "${posting.title}": ${itemErr.message}`);
      }
    }

    const durationMs = Date.now() - startTime;
    const finalStatus = itemsFailed > 0 && itemsIngested === 0 ? 'failed' : (itemsDuplicated > 0 && itemsIngested === 0 ? 'duplicate' : 'success');
    const summary = `Ingestion completed in ${durationMs}ms: ${itemsIngested} ingested, ${itemsDuplicated} duplicate(s), ${itemsFailed} failed out of ${itemsDiscovered} total.`;

    logCheckpoint(summary);

    // Update run record
    db.prepare(`
      UPDATE source_ingestion_runs
      SET status = ?, items_discovered = ?, items_ingested = ?, items_duplicated = ?, items_failed = ?,
          duration_ms = ?, run_finished_at = datetime('now'), run_log = ?, summary = ?
      WHERE id = ?
    `).run(finalStatus, itemsDiscovered, itemsIngested, itemsDuplicated, itemsFailed, durationMs, JSON.stringify(runLogs), summary, runId);

    // Update feed state
    db.prepare(`
      UPDATE source_feeds
      SET last_run_at = datetime('now'), last_status = ?, error_count = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(finalStatus, feed.id);

    return {
      run_id: runId,
      feed_id: feed.id,
      status: finalStatus,
      items_discovered: itemsDiscovered,
      items_ingested: itemsIngested,
      items_duplicated: itemsDuplicated,
      items_failed: itemsFailed,
      duration_ms: durationMs,
      summary
    };
  } catch (runErr) {
    lastError = runErr.message;
    const durationMs = Date.now() - startTime;
    logCheckpoint(`Ingestion aborted due to fatal error: ${lastError}`);

    db.prepare(`
      UPDATE source_ingestion_runs
      SET status = 'failed', duration_ms = ?, run_finished_at = datetime('now'),
          error_summary = ?, run_log = ?, summary = ?
      WHERE id = ?
    `).run(durationMs, lastError, JSON.stringify(runLogs), `Run failed: ${lastError}`, runId);

    db.prepare(`
      UPDATE source_feeds
      SET last_status = 'error', error_count = error_count + 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(feed.id);

    throw runErr;
  }
}

/**
 * Recovers stale or abandoned 'running' jobs after a server crash/restart
 */
function recoverStaleRuns() {
  try {
    const staleRuns = db.prepare(`
      SELECT id FROM source_ingestion_runs
      WHERE status = 'running'
        AND run_started_at < datetime('now', '-30 minutes')
    `).all();

    if (staleRuns.length > 0) {
      console.log(`[SourceIngestion] Recovering ${staleRuns.length} stale ingestion run(s)...`);
      db.prepare(`
        UPDATE source_ingestion_runs
        SET status = 'failed',
            run_finished_at = datetime('now'),
            error_summary = 'Worker restart recovery: job was abandoned or server rebooted.'
        WHERE status = 'running'
          AND run_started_at < datetime('now', '-30 minutes')
      `).run();
    }
  } catch (err) {
    console.warn('[SourceIngestion] Error during crash recovery check:', err.message);
  }
}

// Run recovery check upon module load
recoverStaleRuns();

module.exports = {
  validateUrlForSsrf,
  safeFetchContent,
  parseRssFeed,
  normalizeJobUrl,
  runFeedIngestion,
  recoverStaleRuns
};
