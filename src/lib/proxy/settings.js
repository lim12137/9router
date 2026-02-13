function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProxyProfiles(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!isObject(item)) return null;
      const id = cleanText(item.id) || `proxy-${index + 1}`;
      const name = cleanText(item.name) || `Proxy ${index + 1}`;
      const allProxy = cleanText(item.allProxy);
      const httpProxy = cleanText(item.httpProxy);
      const httpsProxy = cleanText(item.httpsProxy);
      const noProxy = cleanText(item.noProxy);
      return { id, name, allProxy, httpProxy, httpsProxy, noProxy };
    })
    .filter(Boolean);
}

export function normalizeProviderProxyBindings(value) {
  if (!isObject(value)) return {};

  const out = {};
  for (const [providerId, proxyId] of Object.entries(value)) {
    const cleanProvider = cleanText(providerId);
    const cleanProxyId = cleanText(proxyId);
    if (cleanProvider && cleanProxyId) {
      out[cleanProvider] = cleanProxyId;
    }
  }
  return out;
}

export function getProxyAddress(profile) {
  if (!isObject(profile)) return "";
  return (
    cleanText(profile.allProxy) ||
    cleanText(profile.httpsProxy) ||
    cleanText(profile.httpProxy) ||
    ""
  );
}

export function hasProxyConfig(proxyConfig) {
  if (!isObject(proxyConfig)) return false;
  return Boolean(
    cleanText(proxyConfig.allProxy) ||
      cleanText(proxyConfig.httpProxy) ||
      cleanText(proxyConfig.httpsProxy)
  );
}

export function getProxyConfigForProvider(providerId, settings) {
  if (!providerId || !isObject(settings)) return null;

  const profiles = normalizeProxyProfiles(settings.proxyProfiles);
  const bindings = normalizeProviderProxyBindings(settings.providerProxyBindings);
  const profileId = bindings[providerId] || bindings["*"];

  if (profileId) {
    const matched = profiles.find((p) => p.id === profileId);
    if (matched && hasProxyConfig(matched)) {
      return {
        id: matched.id,
        name: matched.name,
        allProxy: matched.allProxy,
        httpProxy: matched.httpProxy,
        httpsProxy: matched.httpsProxy,
        noProxy: matched.noProxy,
      };
    }
  }

  // Backward compatibility: fall back to legacy single-proxy fields.
  const legacy = {
    allProxy: cleanText(settings.allProxy),
    httpProxy: cleanText(settings.httpProxy),
    httpsProxy: cleanText(settings.httpsProxy),
    noProxy: cleanText(settings.noProxy),
  };

  return hasProxyConfig(legacy) ? legacy : null;
}

