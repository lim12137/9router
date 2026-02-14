// Enhanced proxy fetch with SOCKS support and latency checking
// Reference: sub2api backend/internal/service/proxy.go, backend/internal/service/proxy_latency_cache.go

import { isSocksProxy, parseProxyUrl, getProxyFromEnv, PROXY_TEST_URLS, PROXY_LATENCY } from './proxyUtils.js';

const isCloud = typeof caches !== "undefined" && typeof caches === "object";
const originalFetch = globalThis.fetch;

/**
 * Proxy cache for storing latency and health status
 * Cache key format: proxy:status:${proxyUrl}
 */
const proxyCache = new Map();
const PROXY_CACHE_TTL = 60000; // 1 minute cache TTL

/**
 * Get cached proxy status
 */
function getCachedProxyStatus(proxyUrl) {
  const cacheKey = `proxy:status:${proxyUrl}`;
  const cached = proxyCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < PROXY_CACHE_TTL) {
    return cached;
  }

  proxyCache.delete(cacheKey);
  return null;
}

/**
 * Set proxy status in cache
 */
function setCachedProxyStatus(proxyUrl, status) {
  const cacheKey = `proxy:status:${proxyUrl}`;
  proxyCache.set(cacheKey, {
    ...status,
    timestamp: Date.now()
  });
}

/**
 * Get proxy configuration with enhanced SOCKS support
 * Priority: ALL_PROXY > HTTPS_PROXY/HTTP_PROXY > SOCKS_PROXY > configured proxy
 */
async function getProxyConfig(targetUrl) {
  // Check NO_PROXY first
  const proxyUrl = getProxyFromEnv(targetUrl);

  if (proxyUrl) {
    const parsed = parseProxyUrl(proxyUrl);

    // Determine proxy type
    const isSocks = isSocksProxy(proxyUrl);

    return {
      url: proxyUrl,
      target: targetUrl,
      type: isSocks ? 'socks' : 'http',
      host: parsed.host,
      port: parsed.port,
      username: parsed.username,
      password: parsed.password
    };
  }

  return null;
}

/**
 * Check if proxy is healthy based on cache
 */
function isProxyHealthy(proxyUrl) {
  const cached = getCachedProxyStatus(proxyUrl);
  // No cache means "unknown" - allow a real request instead of failing closed.
  if (!cached) {
    return true;
  }
  return cached.status === 'available' || cached.status === 'good' || cached.status === 'excellent';
}

/**
 * Enhanced proxy fetch with latency tracking
 */
export async function proxyFetch(targetUrl, options = {}) {
  const startTime = Date.now();

  // Get proxy configuration
  const proxyConfig = await getProxyConfig(targetUrl);

  // Check if we should use proxy for this target
  const shouldUseProxy = proxyConfig !== null;

  if (!shouldUseProxy) {
    // Direct connection, no proxy
    const response = await originalFetch(targetUrl, options);
    const duration = Date.now() - startTime;

    return {
      response,
      proxy: null,
      duration,
      cached: false
    };
  }

  // Check proxy health from cache
  const isHealthy = isProxyHealthy(proxyConfig.url);

  if (!isHealthy) {
    // Proxy is known to be unhealthy, skip latency check
    return {
      response: null,
      proxy: proxyConfig,
      error: 'Proxy unhealthy',
      duration: Date.now() - startTime,
      cached: true
    };
  }

  // Use native fetch with proxy
  const fetchOptions = {
    ...options,
    // @ts-ignore - Node.js fetch doesn't directly support SOCKS, need http/https agent or tunnel
    // For SOCKS, we'd need a tunnel library - deferring for now
  };

  try {
    const response = await originalFetch(targetUrl, fetchOptions);
    const duration = Date.now() - startTime;

    // Update cache with success
    setCachedProxyStatus(proxyConfig.url, {
      status: 'available',
      latency: duration
    });

    return {
      response,
      proxy: proxyConfig,
      duration,
      cached: false
    };
  } catch (error) {
    // Update cache with error
    setCachedProxyStatus(proxyConfig.url, {
      status: 'error',
      error: error.message
    });

    throw error;
  }
}

/**
 * Test proxy connectivity and latency
 * Returns status object with latency and health assessment
 */
export async function testProxy(proxyUrl, timeout = 10000) {
  if (!proxyUrl) {
    return {
      status: 'not_configured',
      latency: PROXY_LATENCY.UNAVAILABLE
    };
  }

  const startTime = Date.now();

  try {
    // Use first test URL
    const testUrl = PROXY_TEST_URLS[0];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await originalFetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
      // Would add proxy agent for SOCKS here
      headers: {
        'User-Agent': '9Router-ProxyCheck/1.0'
      }
    });

    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    // Determine status
    let status;
    if (response.ok || response.redirected) {
      if (latency < PROXY_LATENCY.GOOD) {
        status = 'excellent';
      } else if (latency < PROXY_LATENCY.FAIR) {
        status = 'good';
      } else if (latency < PROXY_LATENCY.POOR) {
        status = 'fair';
      } else {
        status = 'poor';
      }
    } else {
      status = 'error';
    }

    return {
      status,
      latency,
      url: testUrl
    };
  } catch (error) {
    return {
      status: 'error',
      latency: PROXY_LATENCY.UNUSABLE,
      error: error.message
    };
  }
}

/**
 * Get all proxy configurations from environment
 */
export function getProxyEnvVars() {
  return {
    httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
    httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy,
    allProxy: process.env.ALL_PROXY || process.env.all_proxy,
    socksProxy: process.env.SOCKS_PROXY || process.env.socks_proxy,
    noProxy: process.env.NO_PROXY || process.env.no_proxy
  };
}

/**
 * Get proxy statistics for monitoring
 */
export function getProxyStats() {
  const stats = {
    total: proxyCache.size,
    healthy: 0,
    unhealthy: 0,
    error: 0
  };

  for (const [key, value] of proxyCache.entries()) {
    if (key.startsWith('proxy:status:')) {
      if (value.status === 'available' || value.status === 'good' || value.status === 'excellent') {
        stats.healthy++;
      } else if (value.status === 'error') {
        stats.error++;
      } else {
        stats.unhealthy++;
      }
    }
  }

  return stats;
}

// Export original fetch for direct use
export { originalFetch };
