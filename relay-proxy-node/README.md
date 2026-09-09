# NexusFlag Edge Relay Proxy (Node.js / TypeScript Architecture)

## 1. Why Node.js for Edge Streaming & Relay Proxies?

Choosing **Node.js (V8 + libuv)** for the Edge Relay Proxy layer provides distinct architectural advantages in enterprise feature flag systems:

### A. Non-Blocking Event-Driven I/O (`libuv`)
* Persistent streaming connections (HTTP/2 SSE) are primarily I/O-bound, not CPU-bound. Sockets spend 99.9% of their time idle waiting for flag invalidation events.
* Node.js uses `epoll` (Linux) and `kqueue` (macOS/BSD) via `libuv`. A single Node.js event loop thread can comfortably hold tens of thousands of idle connections without thread-scheduling overhead.

### B. Single-Language Full-Stack Architecture
* **Code Reuse:** The exact same TypeScript types, AST validation logic, and delta patching algorithms are shared across:
  1. Frontend Admin Dashboard (React/Next.js)
  2. Control Plane API
  3. Edge Relay Proxy
  4. Embedded Client SDK (`@nexusflag/sdk`)
* **Zero Context-Switching:** Eliminates the mental friction and serialization mismatches of maintaining duplicate schemas between Go/Rust and TypeScript.

### C. Native JSON & Serialization Performance
* Feature flag updates are natively encoded as JSON. V8’s built-in C++ JSON parser and serializer (`JSON.stringify` / `JSON.parse`) is highly optimized with SIMD instructions, outperforming many generic Go reflection-based JSON serializers.

### D. Backpressure-Aware Streaming
* When broadcasting invalidations to thousands of connected clients, slow mobile or remote clients can cause write buffer bloat.
* The Node.js implementation checks `res.write()` return values and handles the `'drain'` event, preventing memory leaks caused by stalled downstream consumers.

---

## 2. Industry Precedents
* **Netflix API Gateway (Zuul / Node.js Edge):** Uses Node.js at the presentation edge for request aggregation and push subscriptions.
* **PayPal & Uber:** Switched core gateway and orchestration layers to Node.js for unified developer velocity and high concurrent socket efficiency.

---

## 3. Running the Node.js Relay Proxy

```bash
# Start standalone relay proxy on port 8085
node relay-proxy-node/server.mjs
```

### Health Check Endpoint
```bash
curl http://localhost:8085/health
```
```json
{
  "status": "healthy",
  "runtime": "Node.js v24.13.1",
  "activeConnections": 12,
  "memoryUsageMB": { "rss": "32.45", "heapUsed": "11.20" },
  "uptimeSeconds": 142
}
```

### Stream Test
```bash
curl -N http://localhost:8085/stream?env=production
```
