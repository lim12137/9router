import { Agent, ProxyAgent } from "undici";
import * as socksPackage from "socks";
import net from "node:net";
import tls from "node:tls";
import { lookup as dnsLookup } from "node:dns/promises";
import { getProxyContext } from "./context.js";

const SocksClient = socksPackage.SocksClient;

const PATCH_FLAG = Symbol.for("9router.proxy.fetch.patched");
const DISPATCHER_CACHE = new Map();
const WARNED_PROXY_URLS = new Set();

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSocksAlias(proxyUrl) {
  const trimmed = cleanText(proxyUrl);
  if (!trimmed) return "";
  return trimmed
    .replace(/^sock5:\/\//i, "socks5://")
    .replace(/^sock4a:\/\//i, "socks4a://")
    .replace(/^sock4:\/\//i, "socks4://")
    .replace(/^sock:\/\//i, "socks://");
}

function getTargetUrl(input) {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof input.url === "string") return input.url;
  return null;
}

function parseTargetUrl(input) {
  try {
    const raw = getTargetUrl(input);
    if (!raw) return null;
    return new URL(raw);
  } catch {
    // Relative URLs and malformed URLs should bypass proxy logic.
    return null;
  }
}

function shouldBypassProxy(targetUrl, noProxyValue) {
  const noProxy = cleanText(noProxyValue);
  if (!noProxy) return false;

  const host = targetUrl.hostname.toLowerCase();
  const hostWithPort = `${targetUrl.hostname.toLowerCase()}:${targetUrl.port || (targetUrl.protocol === "https:" ? "443" : "80")}`;

  return noProxy
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .some((pattern) => {
      if (pattern === "*") return true;

      // Exact host:port
      if (pattern.includes(":") && hostWithPort === pattern) return true;

      // Wildcard suffix (*.example.com)
      if (pattern.startsWith("*.")) {
        const suffix = pattern.slice(1); // ".example.com"
        return host.endsWith(suffix);
      }

      // Leading dot suffix (.example.com)
      if (pattern.startsWith(".")) {
        return host.endsWith(pattern) || host === pattern.slice(1);
      }

      return host === pattern;
    });
}

function resolveProxyUrl(targetUrl, proxyConfig) {
  if (!targetUrl || !proxyConfig) return null;
  if (shouldBypassProxy(targetUrl, proxyConfig.noProxy)) return null;

  const allProxy = cleanText(proxyConfig.allProxy);
  const httpProxy = cleanText(proxyConfig.httpProxy);
  const httpsProxy = cleanText(proxyConfig.httpsProxy);

  if (allProxy) return allProxy;
  if (targetUrl.protocol === "https:") return httpsProxy || httpProxy || null;
  if (targetUrl.protocol === "http:") return httpProxy || httpsProxy || null;
  return null;
}

function isSocksProtocol(proxyUrl) {
  const protocol = normalizeSocksAlias(proxyUrl).toLowerCase();
  return (
    protocol.startsWith("socks://") ||
    protocol.startsWith("socks4://") ||
    protocol.startsWith("socks4a://") ||
    protocol.startsWith("socks5://") ||
    protocol.startsWith("socks5h://")
  );
}

function parseSocksProxy(proxyUrl) {
  let url;
  try {
    url = new URL(normalizeSocksAlias(proxyUrl));
  } catch {
    return null;
  }

  const protocol = url.protocol.toLowerCase();
  let type = 5;
  let shouldLookup = false;

  switch (protocol) {
    case "socks4:":
      type = 4;
      shouldLookup = true;
      break;
    case "socks4a:":
      type = 4;
      break;
    case "socks5:":
      type = 5;
      shouldLookup = true;
      break;
    case "socks:":
    case "socks5h:":
      type = 5;
      break;
    default:
      return null;
  }

  const host = cleanText(url.hostname);
  const port = Number.parseInt(url.port, 10) || 1080;
  if (!host || Number.isNaN(port) || port <= 0) {
    return null;
  }

  const proxy = { host, port, type };
  if (url.username) {
    proxy.userId = decodeURIComponent(url.username);
  }
  if (url.password) {
    proxy.password = decodeURIComponent(url.password);
  }

  return { proxy, shouldLookup };
}

function createSocksConnector(proxyUrl) {
  const parsed = parseSocksProxy(proxyUrl);
  if (!parsed) return null;

  const { proxy, shouldLookup } = parsed;
  return function socksConnector(options, callback) {
    let settled = false;
    const settle = (err, socket) => {
      if (settled) return;
      settled = true;
      callback(err, socket);
    };

    (async () => {
      const hostname = options.hostname || options.host;
      if (!hostname) {
        throw new Error("Missing target hostname");
      }

      const rawPort = Number.parseInt(options.port, 10);
      const port = Number.isFinite(rawPort)
        ? rawPort
        : (options.protocol === "https:" ? 443 : 80);

      let destinationHost = hostname;
      if (shouldLookup && !net.isIP(destinationHost)) {
        const resolved = await dnsLookup(destinationHost);
        destinationHost = resolved.address;
      }

      const { socket } = await SocksClient.createConnection({
        proxy,
        destination: {
          host: destinationHost,
          port,
        },
        command: "connect",
      });

      if (options.protocol === "https:") {
        const tlsSocket = tls.connect({
          socket,
          host: hostname,
          servername:
            options.servername || (net.isIP(hostname) ? undefined : hostname),
        });

        tlsSocket.once("error", (err) => settle(err, null));
        tlsSocket.once("secureConnect", () => settle(null, tlsSocket));
        return;
      }

      settle(null, socket);
    })().catch((error) => {
      settle(error, null);
    });
  };
}

function createDispatcher(proxyUrl) {
  if (isSocksProtocol(proxyUrl)) {
    const connector = createSocksConnector(proxyUrl);
    if (!connector) return null;
    try {
      return new Agent({ connect: connector });
    } catch {
      return null;
    }
  }

  try {
    return new ProxyAgent(proxyUrl);
  } catch {
    return null;
  }
}

function getDispatcher(proxyUrl) {
  const cached = DISPATCHER_CACHE.get(proxyUrl);
  if (cached) return cached;

  const dispatcher = createDispatcher(proxyUrl);
  if (!dispatcher) return null;

  DISPATCHER_CACHE.set(proxyUrl, dispatcher);
  return dispatcher;
}

if (!globalThis[PATCH_FLAG] && typeof globalThis.fetch === "function") {
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async function patchedFetch(input, init) {
    const proxyConfig = getProxyContext();
    if (!proxyConfig) {
      return originalFetch(input, init);
    }

    const targetUrl = parseTargetUrl(input);
    if (!targetUrl) {
      return originalFetch(input, init);
    }

    const proxyUrl = resolveProxyUrl(targetUrl, proxyConfig);
    if (!proxyUrl) {
      return originalFetch(input, init);
    }

    const dispatcher = getDispatcher(proxyUrl);
    if (!dispatcher) {
      if (!WARNED_PROXY_URLS.has(proxyUrl)) {
        WARNED_PROXY_URLS.add(proxyUrl);
        console.warn(`[Proxy] Unsupported proxy protocol for fetch dispatcher: ${proxyUrl}`);
      }
      return originalFetch(input, init);
    }

    const options = init ? { ...init } : {};
    if (!options.dispatcher) {
      options.dispatcher = dispatcher;
    }
    return originalFetch(input, options);
  };

  globalThis[PATCH_FLAG] = true;
}
