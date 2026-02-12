// Sticky Session Service
// Reference: sub2api backend/internal/service/gateway_service.go
// Ensures requests from the same session are routed to the same account

import { createHash } from 'crypto';

/**
 * Sticky session configuration
 */
const STICKY_SESSION_CONFIG = {
  // TTL for session binding in milliseconds (1 hour default)
  TTL: 60 * 60 * 1000,
  // Maximum number of cached sessions per provider (prevent memory bloat)
  MAX_CACHE_SIZE: 1000,
  // Session ID regex pattern (matches metadata.user_id format: session_xxx)
  SESSION_ID_REGEX: /session_([a-zA-Z0-9_-]+)/
};

/**
 * In-memory cache for session bindings
 * Structure: Map<provider, Map<sessionHash, { accountId, expiresAt }>>
 */
const sessionCache = new Map();

/**
 * Parse request to extract session-relevant information
 * Compatible with OpenAI/Claude/Gemini request formats
 * @param {object} body - Request body
 * @param {object} headers - Request headers
 * @returns {ParsedRequest}
 */
export function parseSessionRequest(body, headers) {
  const parsed = {
    body,
    metadataUserId: null,
    system: null,
    messages: [],
    sessionContext: null
  };

  // Extract metadata.user_id (for explicit session binding)
  if (body.metadata?.user_id) {
    parsed.metadataUserId = body.metadata.user_id;
  }

  // Extract system message
  if (typeof body.system === 'string') {
    parsed.system = body.system;
  } else if (Array.isArray(body.system)) {
    parsed.system = body.system;
  }

  // Extract messages (support both messages[] and input[] formats)
  const messages = body.messages || body.input || [];
  parsed.messages = messages;

  // Build session context from headers (for session isolation)
  const userAgent = headers?.get('user-agent') || '';
  const clientIp = headers?.get('x-forwarded-for')?.split(',')[0] ||
                  headers?.get('x-real-ip') ||
                  '127.0.0.1';
  const apiKey = headers?.get('authorization')?.replace('Bearer ', '') || '';

  if (userAgent || clientIp || apiKey) {
    parsed.sessionContext = {
      clientIp,
      userAgent,
      apiKey: apiKey.slice(0, 16) // Partial key for hashing (privacy)
    };
  }

  return parsed;
}

/**
 * Generate session hash from parsed request
 * Priority:
 * 1. metadata.user_id with session_xxx pattern (explicit session)
 * 2. cache_control: {type: "ephemeral"} content
 * 3. Full content hash with session context (fallback)
 * @param {ParsedRequest} parsed - Parsed request
 * @returns {string} Session hash
 */
export function generateSessionHash(parsed) {
  if (!parsed) return '';

  // Priority 1: Extract explicit session_id from metadata.user_id
  if (parsed.metadataUserId) {
    const match = parsed.metadataUserId.match(STICKY_SESSION_CONFIG.SESSION_ID_REGEX);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Priority 2: Extract cache_control ephemeral content
  const cacheableContent = extractCacheableContent(parsed);
  if (cacheableContent) {
    return hashContent(cacheableContent);
  }

  // Priority 3: Full content hash with session context
  const combined = buildCombinedContent(parsed);
  if (combined) {
    return hashContent(combined);
  }

  return '';
}

/**
 * Extract content with cache_control: {type: "ephemeral"}
 * @param {ParsedRequest} parsed - Parsed request
 * @returns {string|null} Cacheable content or null
 */
function extractCacheableContent(parsed) {
  // Check system for cacheable content
  if (Array.isArray(parsed.system)) {
    for (const part of parsed.system) {
      if (part?.cache_control?.type === 'ephemeral' && part?.text) {
        return part.text;
      }
    }
  } else if (typeof parsed.system === 'string' && parsed.system) {
    return parsed.system;
  }

  // Check messages for cacheable content
  for (const msg of parsed.messages) {
    if (!msg || typeof msg !== 'object') continue;

    const content = msg.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part?.cache_control?.type === 'ephemeral') {
          return extractTextFromContent(msg.content);
        }
      }
    }
  }

  return null;
}

/**
 * Build combined content string for hashing
 * Includes session context to isolate different users
 * @param {ParsedRequest} parsed - Parsed request
 * @returns {string} Combined content string
 */
function buildCombinedContent(parsed) {
  const parts = [];

  // Add session context (if available)
  if (parsed.sessionContext) {
    const ctx = parsed.sessionContext;
    parts.push(`${ctx.clientIp}:${ctx.userAgent}:${ctx.apiKey}|`);
  }

  // Add system content
  if (parsed.system) {
    const systemText = typeof parsed.system === 'string'
      ? parsed.system
      : extractSystemText(parsed.system);
    if (systemText) {
      parts.push(systemText);
    }
  }

  // Add message content
  for (const msg of parsed.messages) {
    const msgText = extractMessageText(msg);
    if (msgText) {
      parts.push(msgText);
    }
  }

  return parts.length > 0 ? parts.join('') : '';
}

/**
 * Extract text from system array format
 * @param {Array} system - System parts array
 * @returns {string} Extracted text
 */
function extractSystemText(system) {
  if (!Array.isArray(system)) return '';
  const texts = [];
  for (const part of system) {
    if (part?.text) {
      texts.push(part.text);
    }
  }
  return texts.join('');
}

/**
 * Extract text from message object
 * @param {object} msg - Message object
 * @returns {string} Extracted text
 */
function extractMessageText(msg) {
  if (!msg || typeof msg !== 'object') return '';

  const content = msg.content;
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return extractTextFromContent(content);
  }

  // Gemini format: parts[]
  if (Array.isArray(msg.parts)) {
    const texts = [];
    for (const part of msg.parts) {
      if (part?.text) {
        texts.push(part.text);
      }
    }
    return texts.join('');
  }

  return '';
}

/**
 * Extract text from content array
 * @param {Array} content - Content blocks array
 * @returns {string} Extracted text
 */
function extractTextFromContent(content) {
  if (!Array.isArray(content)) return '';
  const texts = [];
  for (const part of content) {
    if (part?.type === 'text' && part?.text) {
      texts.push(part.text);
    }
  }
  return texts.join('');
}

/**
 * Hash content using SHA-256 and return base36 string
 * @param {string} content - Content to hash
 * @returns {string} Hash in base36 format
 */
function hashContent(content) {
  if (!content) return '';
  const hash = createHash('sha256').update(content).digest('hex');
  // Convert to base36 for shorter string
  return BigInt('0x' + hash.substring(0, 16)).toString(36);
}

/**
 * Get cached account ID for a session
 * @param {string} provider - Provider name
 * @param {string} sessionHash - Session hash
 * @returns {string|null} Account ID or null
 */
export function getSessionAccount(provider, sessionHash) {
  if (!provider || !sessionHash) return null;

  cleanExpiredSessions(provider);

  const providerCache = sessionCache.get(provider);
  if (!providerCache) return null;

  const binding = providerCache.get(sessionHash);
  if (!binding) return null;

  // Check if binding is still valid
  if (Date.now() > binding.expiresAt) {
    providerCache.delete(sessionHash);
    return null;
  }

  return binding.accountId;
}

/**
 * Bind session to account with TTL
 * @param {string} provider - Provider name
 * @param {string} sessionHash - Session hash
 * @param {string} accountId - Account ID
 * @returns {void}
 */
export function bindSessionToAccount(provider, sessionHash, accountId) {
  if (!provider || !sessionHash || !accountId) return;

  let providerCache = sessionCache.get(provider);
  if (!providerCache) {
    providerCache = new Map();
    sessionCache.set(provider, providerCache);
  }

  // Enforce cache size limit
  if (providerCache.size >= STICKY_SESSION_CONFIG.MAX_CACHE_SIZE) {
    // Remove oldest entries (simple FIFO)
    const firstKey = providerCache.keys().next().value;
    if (firstKey) {
      providerCache.delete(firstKey);
    }
  }

  providerCache.set(sessionHash, {
    accountId,
    expiresAt: Date.now() + STICKY_SESSION_CONFIG.TTL
  });
}

/**
 * Clear session binding (when account becomes unavailable)
 * @param {string} provider - Provider name
 * @param {string} accountId - Account ID to unbind
 * @returns {number} Number of sessions cleared
 */
export function clearSessionBindings(provider, accountId) {
  if (!provider || !accountId) return 0;

  const providerCache = sessionCache.get(provider);
  if (!providerCache) return 0;

  let cleared = 0;
  for (const [sessionHash, binding] of providerCache.entries()) {
    if (binding.accountId === accountId) {
      providerCache.delete(sessionHash);
      cleared++;
    }
  }

  return cleared;
}

/**
 * Clean expired sessions for a provider
 * @param {string} provider - Provider name
 * @returns {number} Number of sessions cleaned
 */
export function cleanExpiredSessions(provider) {
  const providerCache = sessionCache.get(provider);
  if (!providerCache) return 0;

  const now = Date.now();
  let cleaned = 0;

  for (const [sessionHash, binding] of providerCache.entries()) {
    if (now > binding.expiresAt) {
      providerCache.delete(sessionHash);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Get session statistics for monitoring
 * @returns {object} Statistics object
 */
export function getSessionStats() {
  const stats = {
    totalSessions: 0,
    sessionsByProvider: {},
    oldestBinding: null,
    newestBinding: null
  };

  const now = Date.now();
  let oldest = now;
  let newest = 0;

  for (const [provider, providerCache] of sessionCache.entries()) {
    const count = providerCache.size;
    stats.totalSessions += count;
    stats.sessionsByProvider[provider] = count;

    for (const binding of providerCache.values()) {
      const createdAt = binding.expiresAt - STICKY_SESSION_CONFIG.TTL;
      if (createdAt < oldest) oldest = createdAt;
      if (createdAt > newest) newest = createdAt;
    }
  }

  if (oldest < now) {
    stats.oldestBinding = new Date(oldest).toISOString();
  }
  if (newest > 0) {
    stats.newestBinding = new Date(newest).toISOString();
  }

  return stats;
}

/**
 * Clear all sessions for a provider (useful for testing)
 * @param {string} provider - Provider name
 * @returns {number} Number of sessions cleared
 */
export function clearAllSessions(provider) {
  if (!provider) return 0;

  const providerCache = sessionCache.get(provider);
  if (!providerCache) return 0;

  const count = providerCache.size;
  sessionCache.delete(provider);
  return count;
}

/**
 * Get TTL configuration
 * @returns {number} TTL in milliseconds
 */
export function getSessionTTL() {
  return STICKY_SESSION_CONFIG.TTL;
}

/**
 * Set TTL configuration (for testing/customization)
 * @param {number} ttl - TTL in milliseconds
 */
export function setSessionTTL(ttl) {
  STICKY_SESSION_CONFIG.TTL = ttl;
}
