import { COOLDOWN_MS, BACKOFF_CONFIG, HTTP_STATUS } from "../config/constants.js";

/**
 * Temporary unschedule configuration
 * Based on sub2api's temp unschedule mechanism for Google/intermittent errors
 */
export const TEMP_UNSCHEDULE_CONFIG = {
  // Duration for temporary unschedule (1 minute)
  DURATION: 60 * 1000,
  // Maximum retry attempts on same account before fallback
  MAX_RETRIES: 3,
  // Error patterns that trigger temporary unschedule (retryable on same account)
  RETRYABLE_PATTERNS: [
    // Google intermittent 400 errors
    'google',
    'invalid_argument',
    'invalid value',
    // Empty response errors
    'empty response',
    'precondition failed',
    // Network/timeout errors
    'timeout',
    'deadline exceeded',
    'connection reset',
    'econnreset',
    'etimedout'
  ]
};

/**
 * Calculate exponential backoff cooldown for rate limits (429)
 * Level 0: 1s, Level 1: 2s, Level 2: 4s... → max 2 min
 * @param {number} backoffLevel - Current backoff level
 * @returns {number} Cooldown in milliseconds
 */
export function getQuotaCooldown(backoffLevel = 0) {
  const cooldown = BACKOFF_CONFIG.base * Math.pow(2, backoffLevel);
  return Math.min(cooldown, BACKOFF_CONFIG.max);
}

/**
 * Calculate retry backoff delay (exponential)
 * @param {number} attempt - Current retry attempt (0-based)
 * @returns {number} Delay in milliseconds
 */
export function getRetryBackoffDelay(attempt = 0) {
  const baseDelay = 1000; // 1 second base
  const maxDelay = 10000; // 10 seconds max
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Check if error is retryable on same account (temporary unschedule)
 * Based on sub2api's shouldFailoverUpstreamError logic
 * @param {number} status - HTTP status code
 * @param {string} errorText - Error message text
 * @returns {{ retryable: boolean, reason: string, tempUnscheduleMs?: number }}
 */
export function checkRetryableError(status, errorText) {
  if (!errorText && !status) return { retryable: false, reason: '' };

  const errorStr = typeof errorText === 'string' ? errorText : JSON.stringify(errorText || '');
  const lowerError = errorStr.toLowerCase();

  // Check against retryable patterns
  for (const pattern of TEMP_UNSCHEDULE_CONFIG.RETRYABLE_PATTERNS) {
    if (lowerError.includes(pattern)) {
      return {
        retryable: true,
        reason: `Pattern match: ${pattern}`,
        tempUnscheduleMs: TEMP_UNSCHEDULE_CONFIG.DURATION
      };
    }
  }

  // Bad Gateway (502) - often temporary
  if (status === HTTP_STATUS.BAD_GATEWAY) {
    return {
      retryable: true,
      reason: 'Bad Gateway (temporary)',
      tempUnscheduleMs: TEMP_UNSCHEDULE_CONFIG.DURATION
    };
  }

  // Service Unavailable (503) - often temporary
  if (status === HTTP_STATUS.SERVICE_UNAVAILABLE) {
    return {
      retryable: true,
      reason: 'Service Unavailable (temporary)',
      tempUnscheduleMs: TEMP_UNSCHEDULE_CONFIG.DURATION
    };
  }

  // Gateway Timeout (504) - temporary
  if (status === HTTP_STATUS.GATEWAY_TIMEOUT) {
    return {
      retryable: true,
      reason: 'Gateway Timeout (temporary)',
      tempUnscheduleMs: TEMP_UNSCHEDULE_CONFIG.DURATION
    };
  }

  // Request Timeout (408) - temporary
  if (status === HTTP_STATUS.REQUEST_TIMEOUT) {
    return {
      retryable: true,
      reason: 'Request Timeout (temporary)',
      tempUnscheduleMs: TEMP_UNSCHEDULE_CONFIG.DURATION
    };
  }

  return { retryable: false, reason: '' };
}

/**
 * Check if error should trigger account fallback (switch to next account)
 * Enhanced with retryable error detection for temporary issues
 * @param {number} status - HTTP status code
 * @param {string} errorText - Error message text
 * @param {number} backoffLevel - Current backoff level for exponential backoff
 * @returns {{ shouldFallback: boolean, cooldownMs: number, newBackoffLevel?: number, isRetryable: boolean, reason?: string }}
 */
export function checkFallbackError(status, errorText, backoffLevel = 0) {
  // First check if error is retryable on same account
  const { retryable, reason: retryReason } = checkRetryableError(status, errorText);

  // Check error message FIRST - specific patterns take priority over status codes
  if (errorText) {
    const errorStr = typeof errorText === "string" ? errorText : JSON.stringify(errorText);
    const lowerError = errorStr.toLowerCase();

    if (lowerError.includes("no credentials")) {
      return {
        shouldFallback: true,
        cooldownMs: COOLDOWN_MS.notFound,
        isRetryable: false,
        reason: "No credentials"
      };
    }

    if (lowerError.includes("request not allowed")) {
      return {
        shouldFallback: true,
        cooldownMs: COOLDOWN_MS.requestNotAllowed,
        isRetryable: false,
        reason: "Request not allowed"
      };
    }

    // Rate limit keywords - exponential backoff
    if (
      lowerError.includes("rate limit") ||
      lowerError.includes("too many requests") ||
      lowerError.includes("quota exceeded") ||
      lowerError.includes("capacity") ||
      lowerError.includes("overloaded") ||
      lowerError.includes("rate_limited")
    ) {
      const newLevel = Math.min(backoffLevel + 1, BACKOFF_CONFIG.maxLevel);
      return {
        shouldFallback: true,
        cooldownMs: getQuotaCooldown(backoffLevel),
        newBackoffLevel: newLevel,
        isRetryable: false,
        reason: "Rate limit exceeded"
      };
    }
  }

  // Permanent errors - immediate fallback
  if (status === HTTP_STATUS.UNAUTHORIZED) {
    return {
      shouldFallback: true,
      cooldownMs: COOLDOWN_MS.unauthorized,
      isRetryable: false,
      reason: "Unauthorized"
    };
  }

  if (status === HTTP_STATUS.PAYMENT_REQUIRED || status === HTTP_STATUS.FORBIDDEN) {
    return {
      shouldFallback: true,
      cooldownMs: COOLDOWN_MS.paymentRequired,
      isRetryable: false,
      reason: "Payment required or forbidden"
    };
  }

  if (status === HTTP_STATUS.NOT_FOUND) {
    return {
      shouldFallback: true,
      cooldownMs: COOLDOWN_MS.notFound,
      isRetryable: false,
      reason: "Not found"
    };
  }

  // 429 - Rate limit with exponential backoff
  if (status === HTTP_STATUS.RATE_LIMITED) {
    const newLevel = Math.min(backoffLevel + 1, BACKOFF_CONFIG.maxLevel);
    return {
      shouldFallback: true,
      cooldownMs: getQuotaCooldown(backoffLevel),
      newBackoffLevel: newLevel,
      isRetryable: false,
      reason: "Rate limited (429)"
    };
  }

  // If error is retryable, mark it for same-account retry
  if (retryable) {
    return {
      shouldFallback: false, // Don't fallback to next account yet
      cooldownMs: 0, // Immediate retry
      isRetryable: true,
      reason: retryReason
    };
  }

  // Other transient errors - fallback to next account
  const transientStatuses = [
    HTTP_STATUS.NOT_ACCEPTABLE,
    HTTP_STATUS.SERVER_ERROR,
  ];
  if (transientStatuses.includes(status)) {
    return {
      shouldFallback: true,
      cooldownMs: COOLDOWN_MS.transient,
      isRetryable: false,
      reason: `Transient error (${status})`
    };
  }

  // All other errors - fallback with transient cooldown
  return {
    shouldFallback: true,
    cooldownMs: COOLDOWN_MS.transient,
    isRetryable: false,
    reason: "Unknown error"
  };
}

/**
 * Check if account is currently unavailable (cooldown not expired)
 * Also checks temporary unschedule
 * @param {object} account - Account object with rateLimitedUntil and tempUnschedulableUntil
 * @returns {boolean} True if unavailable
 */
export function isAccountUnavailable(account) {
  if (!account) return false;

  // Check permanent cooldown
  if (account.rateLimitedUntil) {
    const until = new Date(account.rateLimitedUntil).getTime();
    if (until > Date.now()) return true;
  }

  // Check temporary unschedule
  if (account.tempUnschedulableUntil) {
    const until = new Date(account.tempUnschedulableUntil).getTime();
    if (until > Date.now()) return true;
  }

  return false;
}

/**
 * Calculate unavailable until timestamp
 */
export function getUnavailableUntil(cooldownMs) {
  return new Date(Date.now() + cooldownMs).toISOString();
}

/**
 * Get earliest rateLimitedUntil from a list of accounts
 * @param {Array} accounts - Array of account objects with rateLimitedUntil
 * @returns {string|null} Earliest rateLimitedUntil ISO string, or null
 */
export function getEarliestRateLimitedUntil(accounts) {
  let earliest = null;
  const now = Date.now();
  for (const acc of accounts) {
    if (!acc.rateLimitedUntil) continue;
    const until = new Date(acc.rateLimitedUntil).getTime();
    if (until <= now) continue;
    if (!earliest || until < earliest) earliest = until;
  }
  if (!earliest) return null;
  return new Date(earliest).toISOString();
}

/**
 * Format rateLimitedUntil to human-readable "reset after Xm Ys"
 * @param {string} rateLimitedUntil - ISO timestamp
 * @returns {string} e.g. "reset after 2m 30s"
 */
export function formatRetryAfter(rateLimitedUntil) {
  if (!rateLimitedUntil) return "";
  const diffMs = new Date(rateLimitedUntil).getTime() - Date.now();
  if (diffMs <= 0) return "reset after 0s";
  const totalSec = Math.ceil(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return `reset after ${parts.join(" ")}`;
}

/**
 * Filter available accounts (not in cooldown)
 * @param {Array} accounts - Array of accounts
 * @param {string|null} excludeId - Account ID to exclude
 * @returns {Array} Filtered available accounts
 */
export function filterAvailableAccounts(accounts, excludeId = null) {
  const now = Date.now();
  return accounts.filter(acc => {
    if (excludeId && acc.id === excludeId) return false;

    // Check permanent cooldown
    if (acc.rateLimitedUntil) {
      const until = new Date(acc.rateLimitedUntil).getTime();
      if (until > now) return false;
    }

    // Check temporary unschedule
    if (acc.tempUnschedulableUntil) {
      const until = new Date(acc.tempUnschedulableUntil).getTime();
      if (until > now) return false;
    }

    return true;
  });
}

/**
 * Reset account state when request succeeds
 * Clears cooldown, resets backoff level to 0, clears temporary unschedule
 * @param {object} account - Account object
 * @returns {object} Updated account with reset state
 */
export function resetAccountState(account) {
  if (!account) return account;
  return {
    ...account,
    rateLimitedUntil: null,
    backoffLevel: 0,
    tempUnschedulableUntil: null,
    lastError: null,
    status: "active"
  };
}

/**
 * Apply temporary unschedule to account
 * @param {object} account - Account object
 * @param {number} durationMs - Duration of temporary unschedule
 * @returns {object} Updated account with temporary unschedule
 */
export function applyTempUnschedule(account, durationMs = TEMP_UNSCHEDULE_CONFIG.DURATION) {
  if (!account) return account;
  return {
    ...account,
    tempUnschedulableUntil: getUnavailableUntil(durationMs)
  };
}

/**
 * Apply error state to account
 * @param {object} account - Account object
 * @param {number} status - HTTP status code
 * @param {string} errorText - Error message
 * @returns {object} Updated account with error state
 */
export function applyErrorState(account, status, errorText) {
  if (!account) return account;

  const backoffLevel = account.backoffLevel || 0;
  const { cooldownMs, newBackoffLevel, isRetryable } = checkFallbackError(status, errorText, backoffLevel);

  // If retryable, apply temporary unschedule instead of permanent cooldown
  if (isRetryable) {
    return {
      ...account,
      tempUnschedulableUntil: getUnavailableUntil(TEMP_UNSCHEDULE_CONFIG.DURATION),
      lastError: { status, message: errorText, timestamp: new Date().toISOString(), isRetryable: true },
      status: "temp_unavailable"
    };
  }

  return {
    ...account,
    rateLimitedUntil: cooldownMs > 0 ? getUnavailableUntil(cooldownMs) : null,
    backoffLevel: newBackoffLevel ?? backoffLevel,
    lastError: { status, message: errorText, timestamp: new Date().toISOString(), isRetryable: false },
    status: "error"
  };
}
