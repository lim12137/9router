// Proxy configuration and utilities
// Reference: sub2api backend/internal/service/proxy.go

/**
 * Parse proxy URL to extract components
 * Supports: http://, https://, socks4://, socks5://
 * Formats:
 *   - http://user:pass@host:port
 *   - https://user:pass@host:port
 *   - socks4://user:pass@host:port
 *   - socks5://user:pass@host:port
 *   - host:port (no auth)
 */
export function parseProxyUrl(proxyUrl) {
  if (!proxyUrl || typeof proxyUrl !== 'string') {
    return null;
  }

  try {
    const url = new URL(proxyUrl);

    return {
      protocol: url.protocol.replace(':', ''), // Remove trailing colon
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) :
        url.protocol === 'https:' ? 443 :
        url.protocol === 'socks5:' ? 1080 :
        url.protocol === 'socks4:' ? 1080 :
        80, // Default HTTP port
      username: url.username || '',
      password: url.password || '',
      // Full URL for proxy agent
      url: proxyUrl
    };
  } catch (error) {
    // Invalid proxy URL
    return null;
  }
}

/**
 * Check if proxy URL uses SOCKS protocol
 */
export function isSocksProxy(url) {
  if (!url) return false;
  try {
    const protocol = new URL(url).protocol.replace(/:$/, '');
    return protocol === 'socks' || protocol === 'socks5' || protocol === 'socks4';
  } catch {
    return false;
  }
}

/**
 * Get proxy configuration from environment variables
 * Priority: ALL_PROXY > HTTP_PROXY/HTTPS_PROXY > SOCKS_PROXY
 */
export function getProxyFromEnv(targetUrl) {
  // Check NO_PROXY first
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;
  if (noProxy) {
    if (shouldBypassProxy(targetUrl, noProxy)) {
      return null;
    }
  }

  const url = new URL(targetUrl);
  const protocol = url.protocol.replace(':', '');

  // Protocol-specific env vars
  const protocolUpper = protocol.toUpperCase().replace('SOCKS', 'SOCKS'); // socks4 -> SOCKS, socks5 -> SOCKS
  const envProxy = process.env[`${protocolUpper}_PROXY`] || process.env[`${protocolUpper}_PROXY`.toLowerCase()];

  // Generic fallback
  const allProxy = process.env.ALL_PROXY || process.env.all_proxy;

  return envProxy || allProxy || null;
}

/**
 * Check if target URL should bypass proxy
 */
function shouldBypassProxy(targetUrl, noProxy) {
  if (!noProxy) return false;

  const hostname = new URL(targetUrl).hostname.toLowerCase();
  const patterns = noProxy.split(',').map(p => p.trim().toLowerCase());

  return patterns.some(pattern => {
    if (pattern === '*') return true;
    if (pattern.startsWith('.')) {
      return hostname.endsWith(pattern) || hostname === pattern.slice(1);
    }
    return hostname === pattern;
  });
}

/**
 * Default proxy test URLs for connectivity check
 */
export const PROXY_TEST_URLS = [
  'https://www.google.com',
  'https://api.github.com',
  'https://www.cloudflare.com',
  'https://1.1.1.1'
];

/**
 * Proxy latency thresholds
 */
export const PROXY_LATENCY = {
  UNAVAILABLE: -1,      // Proxy not configured
  EXCELLENT: 0,        // < 100ms
  GOOD: 100,             // 100-300ms
  FAIR: 300,             // 300-600ms
  POOR: 600,             // 600-1200ms
  UNUSABLE: 1200,        // > 1200ms
};

/**
 * Test proxy connectivity and latency
 * Returns Promise with latency result
 */
export async function testProxyLatency(proxyUrl, timeout = 10000) {
  if (!proxyUrl) {
    return { status: 'not_configured', latency: PROXY_LATENCY.UNAVAILABLE };
  }

  const startTime = Date.now();

  try {
    const proxyConfig = parseProxyUrl(proxyUrl);
    if (!proxyConfig) {
      return { status: 'invalid', latency: PROXY_LATENCY.UNAVAILABLE };
    }

    // Use first test URL
    const testUrl = PROXY_TEST_URLS[0];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
      // Add proxy agent support would go here
      // For now, we'll test direct connectivity
      headers: {
        'User-Agent': '9Router-ProxyCheck/1.0'
      }
    });

    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    if (response.ok || response.redirected) {
      return {
        status: latency < PROXY_LATENCY.GOOD ? 'excellent' :
                latency < PROXY_LATENCY.FAIR ? 'good' :
                latency < PROXY_LATENCY.POOR ? 'fair' : 'poor',
        latency,
        url: testUrl
      };
    }

    return {
      status: 'error',
      latency,
      error: `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      status: 'error',
      latency: PROXY_LATENCY.UNUSABLE,
      error: error.message
    };
  }
}
