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

function createProxyAgent(proxyUrl) {
  if (!proxyUrl) return null;
  const lower = proxyUrl.toLowerCase();
  if (lower.startsWith("socks://") || lower.startsWith("socks4://") || lower.startsWith("socks5://")) {
    return new SocksProxyAgent(proxyUrl);
  }
  return new HttpsProxyAgent(proxyUrl);
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
    const { httpProxy, httpsProxy, allProxy, noProxy, testUrl } = body;

    // Set proxy environment variables for this test
    if (httpProxy) process.env.HTTP_PROXY = httpProxy;
    if (httpsProxy) process.env.HTTPS_PROXY = httpsProxy;
    if (allProxy) process.env.ALL_PROXY = allProxy;
    if (noProxy) process.env.NO_PROXY = noProxy;

    // Clear any previous proxy settings
    if (!httpProxy) delete process.env.HTTP_PROXY;
    if (!httpsProxy) delete process.env.HTTPS_PROXY;
    if (!allProxy) delete process.env.ALL_PROXY;
    if (!noProxy) delete process.env.NO_PROXY;

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
        });
      } else {
        return NextResponse.json(
          { success: false, error: `HTTP ${status}`, usedProxy: !!proxyUrl },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error.message, usedProxy: !!proxyUrl },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Proxy test error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
