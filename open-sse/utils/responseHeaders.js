const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "proxy-connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization"
]);

const SECURITY_HEADERS = new Set([
  "set-cookie",
  "set-cookie2"
]);

const CPA_MANAGED_HEADERS = new Set([
  "content-length",
  "content-encoding"
]);

const FILTERED_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  ...SECURITY_HEADERS,
  ...CPA_MANAGED_HEADERS
]);

function normalizeHeaderValue(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

function shouldFilterHeader(name) {
  if (!name) return true;
  const lower = String(name).toLowerCase();
  if (lower.startsWith(":")) return true; // HTTP/2 pseudo headers
  return FILTERED_HEADERS.has(lower);
}

export function filterUpstreamHeaders(headers) {
  const result = {};
  if (!headers) return result;

  const addHeader = (key, value) => {
    if (shouldFilterHeader(key)) return;
    const normalized = normalizeHeaderValue(value);
    if (normalized === null) return;
    result[key] = normalized;
  };

  if (typeof headers.entries === "function") {
    for (const [key, value] of headers.entries()) {
      addHeader(key, value);
    }
    return result;
  }

  for (const [key, value] of Object.entries(headers)) {
    addHeader(key, value);
  }

  return result;
}

export function mergeUpstreamHeaders(baseHeaders, upstreamHeaders) {
  const merged = new Headers(baseHeaders || {});
  const filtered = filterUpstreamHeaders(upstreamHeaders);

  for (const [key, value] of Object.entries(filtered)) {
    if (!merged.has(key)) {
      merged.set(key, value);
    }
  }

  return merged;
}
