import { getProviderConnections, validateApiKey, updateProviderConnection, getSettings } from "@/lib/localDb";
import {
  isAccountUnavailable,
  getUnavailableUntil,
  getEarliestRateLimitedUntil,
  formatRetryAfter,
  checkFallbackError,
  filterAvailableAccounts,
  TEMP_UNSCHEDULE_CONFIG,
  getRetryBackoffDelay
} from "open-sse/services/accountFallback.js";
import { getSessionAccount, bindSessionToAccount, clearSessionBindings, generateSessionHash, parseSessionRequest } from "open-sse/services/stickySession.js";
import * as log from "../utils/logger.js";

// Mutex to prevent race conditions during account selection
let selectionMutex = Promise.resolve();

/**
 * Get provider credentials from localDb
 * Filters out unavailable accounts and returns the selected account based on strategy
 * @param {string} provider - Provider name
 * @param {string|null} excludeConnectionId - Connection ID to exclude (for retry with next account)
 */
export async function getProviderCredentials(provider, excludeConnectionId = null) {
  // Acquire mutex to prevent race conditions
  const currentMutex = selectionMutex;
  let resolveMutex;
  selectionMutex = new Promise(resolve => { resolveMutex = resolve; });

  try {
    await currentMutex;

    const connections = await getProviderConnections({ provider, isActive: true });
    log.debug("AUTH", `${provider} | total connections: ${connections.length}, excludeId: ${excludeConnectionId || "none"}`);

    if (connections.length === 0) {
      // Check all connections (including inactive) to see if rate limited
      const allConnections = await getProviderConnections({ provider });
      log.debug("AUTH", `${provider} | all connections (incl inactive): ${allConnections.length}`);
      if (allConnections.length > 0) {
        const earliest = getEarliestRateLimitedUntil(allConnections);
        if (earliest) {
          log.warn("AUTH", `${provider} | all ${allConnections.length} accounts rate limited (${formatRetryAfter(earliest)})`);
          return { allRateLimited: true, retryAfter: earliest, retryAfterHuman: formatRetryAfter(earliest) };
        }
        log.warn("AUTH", `${provider} | ${allConnections.length} accounts found but none active`);
        allConnections.forEach(c => {
          log.debug("AUTH", `  → ${c.id?.slice(0, 8)} | isActive=${c.isActive} | rateLimitedUntil=${c.rateLimitedUntil || "none"} | testStatus=${c.testStatus}`);
        });
      }
      log.warn("AUTH", `No credentials for ${provider}`);
      return null;
    }

    // Filter out unavailable accounts and excluded connection
    const availableConnections = filterAvailableAccounts(connections, excludeConnectionId);

    log.debug("AUTH", `${provider} | available: ${availableConnections.length}/${connections.length}`);
    connections.forEach(c => {
      const excluded = excludeConnectionId && c.id === excludeConnectionId;
      const rateLimited = isAccountUnavailable(c.rateLimitedUntil);
      if (excluded || rateLimited) {
        log.debug("AUTH", `  → ${c.id?.slice(0, 8)} | ${excluded ? "excluded" : ""} ${rateLimited ? `rateLimited until ${c.rateLimitedUntil}` : ""}`);
      }
    });

    if (availableConnections.length === 0) {
      const earliest = getEarliestRateLimitedUntil(connections);
      if (earliest) {
        // Find the connection with the earliest rateLimitedUntil to get its error info
        const rateLimitedConns = connections.filter(c => c.rateLimitedUntil && new Date(c.rateLimitedUntil).getTime() > Date.now());
        const earliestConn = rateLimitedConns.sort((a, b) => new Date(a.rateLimitedUntil) - new Date(b.rateLimitedUntil))[0];
        log.warn("AUTH", `${provider} | all ${connections.length} active accounts rate limited (${formatRetryAfter(earliest)}) | lastErrorCode=${earliestConn?.errorCode}, lastError=${earliestConn?.lastError?.slice(0, 50)}`);
        return {
          allRateLimited: true,
          retryAfter: earliest,
          retryAfterHuman: formatRetryAfter(earliest),
          lastError: earliestConn?.lastError || null,
          lastErrorCode: earliestConn?.errorCode || null
        };
      }
      log.warn("AUTH", `${provider} | all ${connections.length} accounts unavailable`);
      return null;
    }

    const settings = await getSettings();
    const strategy = settings.fallbackStrategy || "fill-first";

    let connection;
    if (strategy === "round-robin") {
      const stickyLimit = settings.stickyRoundRobinLimit || 3;

      // Sort by lastUsed (most recent first) to find current candidate
      const byRecency = [...availableConnections].sort((a, b) => {
        if (!a.lastUsedAt && !b.lastUsedAt) return (a.priority || 999) - (b.priority || 999);
        if (!a.lastUsedAt) return 1;
        if (!b.lastUsedAt) return -1;
        return new Date(b.lastUsedAt) - new Date(a.lastUsedAt);
      });

      const current = byRecency[0];
      const currentCount = current?.consecutiveUseCount || 0;

      if (current && current.lastUsedAt && currentCount < stickyLimit) {
        // Stay with current account
        connection = current;
        // Update lastUsedAt and increment count (await to ensure persistence)
        await updateProviderConnection(connection.id, {
          lastUsedAt: new Date().toISOString(),
          consecutiveUseCount: (connection.consecutiveUseCount || 0) + 1
        });
      } else {
        // Pick the least recently used (excluding current if possible)
        const sortedByOldest = [...availableConnections].sort((a, b) => {
          if (!a.lastUsedAt && !b.lastUsedAt) return (a.priority || 999) - (b.priority || 999);
          if (!a.lastUsedAt) return -1;
          if (!b.lastUsedAt) return 1;
          return new Date(a.lastUsedAt) - new Date(b.lastUsedAt);
        });

        connection = sortedByOldest[0];

        // Update lastUsedAt and reset count to 1 (await to ensure persistence)
        await updateProviderConnection(connection.id, {
          lastUsedAt: new Date().toISOString(),
          consecutiveUseCount: 1
        });
      }
    } else {
      // Default: fill-first (already sorted by priority in getProviderConnections)
      connection = availableConnections[0];
    }

    return {
      apiKey: connection.apiKey,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      projectId: connection.projectId,
      copilotToken: connection.providerSpecificData?.copilotToken,
      providerSpecificData: connection.providerSpecificData,
      connectionId: connection.id,
      // Include current status for optimization check
      testStatus: connection.testStatus,
      lastError: connection.lastError,
      rateLimitedUntil: connection.rateLimitedUntil
    };
  } finally {
    if (resolveMutex) resolveMutex();
  }
}

/**
 * Get provider credentials with sticky session support
 * Returns account based on session binding if available
 * @param {string} provider - Provider name
 * @param {object|null} sessionRequest - Parsed session request
 * @param {string|null} excludeConnectionId - Connection ID to exclude
 */
export async function getProviderCredentialsWithSession(provider, sessionRequest = null, excludeConnectionId = null) {
  // If session info provided, check for existing binding
  if (sessionRequest) {
    const sessionHash = generateSessionHash(sessionRequest);
    if (sessionHash) {
      const boundAccountId = getSessionAccount(provider, sessionHash);
      if (boundAccountId) {
        // Check if bound account is still available
        const connections = await getProviderConnections({ provider, isActive: true });
        const boundAccount = connections.find(c => c.id === boundAccountId);

        if (boundAccount && !isAccountUnavailable(boundAccount.rateLimitedUntil)) {
          log.info("AUTH", `${provider} | sticky session hit: ${boundAccountId.slice(0, 8)}...`);
          // Update lastUsedAt
          await updateProviderConnection(boundAccount.id, {
            lastUsedAt: new Date().toISOString()
          });
          return {
            apiKey: boundAccount.apiKey,
            accessToken: boundAccount.accessToken,
            refreshToken: boundAccount.refreshToken,
            projectId: boundAccount.projectId,
            copilotToken: boundAccount.providerSpecificData?.copilotToken,
            providerSpecificData: boundAccount.providerSpecificData,
            connectionId: boundAccount.id,
            testStatus: boundAccount.testStatus,
            lastError: boundAccount.lastError,
            rateLimitedUntil: boundAccount.rateLimitedUntil,
            fromStickySession: true
          };
        } else {
          // Bound account unavailable, clear binding
          log.info("AUTH", `${provider} | clearing stale session binding`);
          clearSessionBindings(provider, boundAccountId);
        }
      }
    }
  }

  // Fallback to regular account selection
  return getProviderCredentials(provider, excludeConnectionId);
}

/**
 * Bind session to account after successful request
 * @param {string} provider - Provider name
 * @param {object} sessionRequest - Parsed session request
 * @param {string} accountId - Account ID to bind
 */
export async function bindSession(provider, sessionRequest, accountId) {
  if (!sessionRequest || !accountId) return;

  const sessionHash = generateSessionHash(sessionRequest);
  if (sessionHash) {
    bindSessionToAccount(provider, sessionHash, accountId);
    log.debug("AUTH", `${provider} | session bound to ${accountId.slice(0, 8)}...`);
  }
}

/**
 * Mark account as unavailable — reads backoffLevel from DB, calculates cooldown with exponential backoff, saves new level
 * Also clears all session bindings for this account
 * Enhanced with temporary unschedule support for retryable errors
 * @returns {{ shouldFallback: boolean, cooldownMs: number, isRetryable: boolean }}
 */
export async function markAccountUnavailable(connectionId, status, errorText, provider = null) {
  // Read current connection to get backoffLevel
  const connections = await getProviderConnections({ provider });
  const conn = connections.find(c => c.id === connectionId);
  const backoffLevel = conn?.backoffLevel || 0;

  const { shouldFallback, cooldownMs, newBackoffLevel, isRetryable } = checkFallbackError(status, errorText, backoffLevel);
  if (!shouldFallback) return { shouldFallback: false, cooldownMs: 0, isRetryable: true };

  const reason = typeof errorText === "string" ? errorText.slice(0, 100) : "Provider error";

  // If retryable, apply temporary unschedule instead of permanent cooldown
  if (isRetryable) {
    const tempUnschedulableUntil = getUnavailableUntil(TEMP_UNSCHEDULE_CONFIG.DURATION);

    await updateProviderConnection(connectionId, {
      tempUnschedulableUntil,
      testStatus: "temp_unavailable",
      lastError: reason,
      errorCode: status,
      lastErrorAt: new Date().toISOString()
    });

    if (provider && status && reason) {
      console.warn(`⏸️ ${provider} [${status}]: ${reason} (temporary unschedule, retry on same account)`);
    }

    return {
      shouldFallback: false, // Don't fallback yet
      cooldownMs: 0, // Ready for immediate retry
      isRetryable: true
    };
  }

  // Permanent error - apply full cooldown
  const rateLimitedUntil = getUnavailableUntil(cooldownMs);

  await updateProviderConnection(connectionId, {
    rateLimitedUntil,
    testStatus: "unavailable",
    lastError: reason,
    errorCode: status,
    lastErrorAt: new Date().toISOString(),
    backoffLevel: newBackoffLevel ?? backoffLevel
  });

  // Clear all session bindings for this account (force re-routing)
  if (provider) {
    const cleared = clearSessionBindings(provider, connectionId);
    if (cleared > 0) {
      log.info("AUTH", `${provider} | cleared ${cleared} session binding(s) for unavailable account`);
    }
  }

  if (provider && status && reason) {
    console.error(`❌ ${provider} [${status}]: ${reason}`);
  }

  return { shouldFallback: true, cooldownMs, isRetryable: false };
}

/**
 * Clear account error status (only if currently has error)
 * Optimized to avoid unnecessary DB updates
 * Also clears temporary unschedule state
 */
export async function clearAccountError(connectionId, currentConnection) {
  // Only update if currently has error status
  const hasError = currentConnection.testStatus === "unavailable" ||
                   currentConnection.testStatus === "temp_unavailable" ||
                   currentConnection.lastError ||
                   currentConnection.rateLimitedUntil ||
                   currentConnection.tempUnschedulableUntil;

  if (!hasError) return; // Skip if already clean

  await updateProviderConnection(connectionId, {
    testStatus: "active",
    lastError: null,
    lastErrorAt: null,
    rateLimitedUntil: null,
    tempUnschedulableUntil: null,
    backoffLevel: 0
  });
  log.info("AUTH", `Account ${connectionId.slice(0,8)} error cleared`);
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Validate API key (optional - for local use can skip)
 */
export async function isValidApiKey(apiKey) {
  if (!apiKey) return false;
  return await validateApiKey(apiKey);
}
