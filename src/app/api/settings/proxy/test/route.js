import { NextResponse } from "next/server";

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

    // Import proxyFetch to test
    const { default: proxyFetch } = await import("../../../../../../open-sse/utils/proxyFetch");

    // Test with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await proxyFetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status < 500) {
        return NextResponse.json({ success: true, message: "Proxy connection successful" });
      } else {
        return NextResponse.json(
          { success: false, error: `HTTP ${response.status}` },
          { status: 400 }
        );
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        return NextResponse.json(
          { success: false, error: "Connection timeout" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
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
