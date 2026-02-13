import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage();

/**
 * Run code with per-request proxy settings.
 * This avoids mutating process-wide env vars during concurrent requests.
 */
export function runWithProxyContext(proxyConfig, fn) {
  return storage.run({ proxyConfig: proxyConfig || null }, fn);
}

export function getProxyContext() {
  return storage.getStore()?.proxyConfig || null;
}

