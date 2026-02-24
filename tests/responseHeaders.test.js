import test from "node:test";
import assert from "node:assert/strict";
import { filterUpstreamHeaders, mergeUpstreamHeaders } from "../open-sse/utils/responseHeaders.js";
import { errorResponse } from "../open-sse/utils/error.js";

test("filterUpstreamHeaders filters hop-by-hop, sensitive, and pseudo headers", () => {
  const input = {
    "Connection": "keep-alive",
    "Transfer-Encoding": "chunked",
    "Content-Length": "123",
    "Content-Encoding": "gzip",
    "Set-Cookie": "secret",
    ":status": "200",
    "X-Request-Id": "abc",
    "Retry-After": "30"
  };

  const result = filterUpstreamHeaders(input);

  assert.deepEqual(result, {
    "X-Request-Id": "abc",
    "Retry-After": "30"
  });
});

test("filterUpstreamHeaders normalizes array values to comma-separated strings", () => {
  const result = filterUpstreamHeaders({
    "X-Foo": ["a", "b"]
  });

  assert.deepEqual(result, {
    "X-Foo": "a,b"
  });
});

test("mergeUpstreamHeaders preserves base headers and appends filtered upstream headers", () => {
  const merged = mergeUpstreamHeaders(
    {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    new Headers({
      "content-type": "text/plain",
      "x-request-id": "abc"
    })
  );

  assert.equal(merged.get("content-type"), "application/json");
  assert.equal(merged.get("access-control-allow-origin"), "*");
  assert.equal(merged.get("x-request-id"), "abc");
});

test("errorResponse forwards allowed headers and strips sensitive headers", () => {
  const response = errorResponse(502, "bad gateway", {
    "X-Request-Id": "abc",
    "Set-Cookie": "secret"
  });

  assert.equal(response.headers.get("x-request-id"), "abc");
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.has("set-cookie"), false);
});
