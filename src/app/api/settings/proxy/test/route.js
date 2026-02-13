import { NextResponse } from "next/server";
import http from "http";
import https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

function resolveProxyUrl(targetUrl, { httpProxy, httpsProxy, allProxy }) {
  const protocol = new URL(targetUrl).protocol;

  if (allProxy) return allProxy.trim();
  if (protocol === "https:") return (httpsProxy || httpProxy || "").trim() || null;
  return (httpProxy || httpsProxy || "").trim() || null;
}

function normalizeSocksAlias(proxyUrl) {
  if (!proxyUrl) return proxyUrl;
  const trimmed = proxyUrl.trim();
  return trimmed
    .replace(/^sock5:\/\//i, "socks5://")
    .replace(/^sock4a:\/\//i, "socks4a://")
    .replace(/^sock4:\/\//i, "socks4://")
    .replace(/^sock:\/\//i, "socks://");
}

function createProxyAgent(proxyUrl) {
  if (!proxyUrl) return null;
  const normalized = normalizeSocksAlias(proxyUrl);
  const lower = normalized.toLowerCase();
  if (
    lower.startsWith("socks://") ||
    lower.startsWith("socks4://") ||
    lower.startsWith("socks4a://") ||
    lower.startsWith("socks5://") ||
    lower.startsWith("socks5h://")
  ) {
    return new SocksProxyAgent(normalized);
  }
  return new HttpsProxyAgent(normalized);
}

function requestHead(url, agent, timeoutMs = 10000) {
  const target = new URL(url);
  const isHttps = target.protocol === "https:";
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: "HEAD",
        headers: {
          "User-Agent": "9Router-ProxyCheck/1.0",
        },
        timeout: timeoutMs,
        agent: agent || undefined,
      },
      (res) => {
        // Drain and close socket quickly; we only need status code.
        res.resume();
        resolve(res.statusCode || 0);
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("Connection timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Test proxy connection by making a simple request
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const profile = body?.proxyProfile && typeof body.proxyProfile === "object"
      ? body.proxyProfile
      : body;
    const { httpProxy, httpsProxy, allProxy, noProxy, testUrl } = profile || {};

    // Test URL (default to a reliable endpoint)
    const url = testUrl || "https://www.google.com";
    const proxyUrl = resolveProxyUrl(url, { httpProxy, httpsProxy, allProxy });
    const proxyAgent = createProxyAgent(proxyUrl);

    try {
      const status = await requestHead(url, proxyAgent, 10000);
      if (status > 0 && status < 500) {
        return NextResponse.json({
          success: true,
          message: "Proxy connection successful",
          statusCode: status,
          usedProxy: !!proxyUrl,
          proxyUrl: proxyUrl || null,
          noProxy: noProxy || "",
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `HTTP ${status}`,
          usedProxy: !!proxyUrl,
          proxyUrl: proxyUrl || null,
        });
      }
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        usedProxy: !!proxyUrl,
        proxyUrl: proxyUrl || null,
      });
    }
  } catch (error) {
    console.error("Proxy test error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
