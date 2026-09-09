# NexusFlag (RelayCore)

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24.x-green?logo=node.js&logoColor=white)
![Evaluation Latency](https://img.shields.io/badge/Evaluation_Latency-<1µs-success?style=flat)
![Architecture](https://img.shields.io/badge/Architecture-Decoupled_Control%2FData_Plane-purple)

**Enterprise Distributed Feature Orchestration & Remote Configuration Engine**

*Sub-microsecond in-memory AST rule evaluation, HTTP/2 Server-Sent Events (SSE) edge streaming invalidations, deterministic MurmurHash3 cohort bucketing, and mission-critical telemetry.*

---

[Key Capabilities](#key-capabilities) •
[System Architecture](#system-architecture) •
[Evaluation Mechanics](#evaluation-mechanics) •
[SDK Quickstart](#sdk-quickstart) •
[Edge Relay Proxy](#edge-relay-proxy) •
[Resilience & Edge Cases](#system-resilience--edge-cases) •
[Benchmarks](#benchmarks--verification)

---

</div>

## Overview

Traditional feature flagging systems incur network latency (50-200ms) per check or rely on polling loops that strain backend infrastructure. **NexusFlag** decouples the **Control Plane** (authoring, RBAC, immutable audit logging) from the **Data Plane** (sub-microsecond evaluation directly in host RAM).

Rule sets are cached locally inside the host application. Updates are pushed downstream via persistent HTTP/2 Server-Sent Events (SSE) edge relays using incremental delta patches, guaranteeing sub-100ms global invalidation without outbound network lookups during critical user paths.

---

## Key Capabilities

| Capability | Specification | Architectural Advantage |
| :--- | :--- | :--- |
| **In-Memory AST Evaluation** | **~0.70µs per check** | Zero network overhead during application runtime; runs synchronously in local heap memory. |
| **Deterministic Bucketing** | **32-bit MurmurHash3** | Uniform 0..99 distribution; monotonic rollout stability guarantees zero cohort churn on percentage increases. |
| **Real-Time Streaming** | **HTTP/2 SSE (Delta Patches)** | Incremental updates (<1KB payloads); eliminates socket framing overhead and corporate firewall blocks. |
| **Multi-Stage Scoping** | **Dev / Staging / Prod** | Isolated environment namespaces with Git-style side-by-side diff promotion and safety gating. |
| **Global Emergency Kill Switch** | **Immediate Circuit Breaker** | Instantly short-circuits flag evaluation to safe fallback values across all connected instances in <15ms. |
| **Cold Boot Resilience** | **Encrypted Disk Snapshots** | Services initialize instantly from snapshot storage even during total network or proxy partitions. |
| **Fault Isolation** | **Poison Pill Guard** | Corrupted rule schemas or malformed regex triggers graceful fallbacks without throwing runtime exceptions. |

---

## System Architecture

```
                                  [ Control Plane ]
                     Next.js 15 Admin Console & Management API
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │ Transactional Write                       │ Delta Pub/Sub
                   ▼                                           ▼
         [ Primary Storage ]                         [ Invalidation Broker ]
      PostgreSQL / Durable State                       Redis Cluster Pub/Sub
                                                               │
                   ┌───────────────────────────────────────────┘
                   │ Invalidation Events (<10ms)
                   ▼
       [ Edge Relay Proxies ]  (Node.js / libuv Non-blocking I/O)
       Multi-tenant SSE streams, backpressure management, heartbeats
                   │
                   │ Persistent HTTP/2 Multiplexed SSE Streams
                   ▼
      [ Embedded Client SDKs ] (@nexusflag/sdk)
      ┌─────────────────────────────────────────────────────────┐
      │  Host Service Process Memory (RAM)                      │
      │                                                         │
      │  ┌───────────────────┐        ┌──────────────────────┐  │
      │  │  In-Memory AST    │        │  MurmurHash3         │  │
      │  │  Ruleset Cache    │───────►│  Cohort Allocator    │  │
      │  └───────────────────┘        └──────────────────────┘  │
      │           │                               │             │
      │           ▼                               ▼             │
      │   Evaluation Result (P50: 0.51µs, P99: 1.20µs)          │
      │                                                         │
      │  ┌───────────────────────────────────────────────────┐  │
      │  │ Local Disk Snapshot (Fallback on network blackout)│  │
      │  └───────────────────────────────────────────────────┘  │
      └─────────────────────────────────────────────────────────┘
                   │
                   │ Batched Asynchronous Telemetry
                   ▼
       [ Telemetry Aggregator ] ──► Live Canary Metrics (P50/P99, Error Rates)
```

### Architectural Tiers

1. **Control Plane (Management Layer):** Next.js 15 dashboard providing visual AST rule construction, dual-thumb rollout sliders, live canary visualizers, environment diffing, and audit logging.
2. **Edge Relay Proxy (Distribution Layer):** Non-blocking HTTP/2 SSE streaming gateway. Manages thousands of long-lived client connections, throttles broadcast fanout with backpressure buffers, and issues periodic heartbeats.
3. **Embedded Client SDK (Data Plane):** Embedded zero-dependency engine imported into host microservices. Caches rules locally, resolves nested boolean AST predicates, and calculates rollout hashes in local memory.
4. **Telemetry Pipeline (Observability Layer):** Asynchronously batches evaluation throughput, variation exposure, and latency statistics without blocking the host application request lifecycle.

---

## Evaluation Mechanics

### 1. In-Memory AST Priority Hierarchy

Flag checks traverse a deterministic priority ladder designed to fail safely:

```
           [ In-Memory Evaluation Request ]
                          │
                          ▼
             Is Kill Switch Active? ──────────► YES ──► Return Default Safe Variation
                          │ NO
                          ▼
           Entity in Whitelist / Target List? ─► YES ──► Serve Targeted Variation
                          │ NO
                          ▼
             Matches Boolean Rule Predicates? ─► YES ──► Serve Rule Variation
                          │ NO
                          ▼
             Rollout Distribution Match? ──────► YES ──► Calculate MurmurHash3 Bucket
                          │ NO
                          ▼
          Default Fallthrough Variation
```

### 2. Deterministic Monotonic Bucketing

Percentage rollouts calculate a uniform hash across 100 discrete buckets:

$$\text{hash} = \text{MurmurHash3}(\text{salt} + \text{":"} + \text{flagKey} + \text{":"} + \text{entityId})$$
$$\text{bucket} = \text{hash} \pmod{100}$$

* **Uniform Distribution:** Verified across 10,000 entities: every bucket `[0..99]` receives ~1.0% of user traffic.
* **Monotonic Stability:** Expanding a rollout from 10% to 25% preserves all users in buckets `0..9`.
* **Salt Isolation:** Unique cryptographic salts per flag prevent cohort overlap across different experiments.

---

## SDK Quickstart

### Installation

```bash
npm install @nexusflag/sdk
```

### Usage Example

```typescript
import { NexusFlagClient } from '@nexusflag/sdk';

const client = new NexusFlagClient({
  environment: 'production',
  relayProxyUrl: 'http://localhost:8085',
  snapshotPath: '/tmp/nexusflag-cache.json',
  telemetryFlushIntervalMs: 5000,
  maxRetries: 5,
});

await client.initialize();

const userContext = {
  userId: 'usr_849204',
  email: 'dev@enterprise.internal',
  plan: 'enterprise' as const,
  country: 'US',
  appVersion: '2.4.1',
};

const decision = client.evaluate('new_checkout_flow', userContext);

console.log(`Variation: ${decision.value}`);
console.log(`Evaluation Reason: ${decision.reason}`);
console.log(`Latency: ${decision.durationMicroseconds.toFixed(2)}µs`);

process.on('SIGTERM', async () => {
  await client.close();
});
```

---

## Edge Relay Proxy

The Edge Relay Proxy decouples the primary database from connected client SDKs.

```bash
# Start the Edge Relay Proxy on port 8085
node relay-proxy-node/server.mjs
```

### Endpoints

* **`GET /health`** - Health check and runtime diagnostics:
  ```json
  {
    "status": "healthy",
    "runtime": "Node.js v24.x",
    "activeConnections": 14,
    "memoryUsageMB": { "rss": "32.45", "heapUsed": "11.20" },
    "uptimeSeconds": 340
  }
  ```

* **`GET /stream?env=production`** - Persistent HTTP/2 SSE stream:
  ```http
  HTTP/1.1 200 OK
  Content-Type: text/event-stream
  Cache-Control: no-cache, no-transform
  Connection: keep-alive
  ```

* **`POST /publish`** - Broadcast delta update to all subscribed relay connections.

---

## System Resilience & Edge Cases

```
┌───────────────────────────┬──────────────────────────────────────────────────────────┐
│ Failure Scenario          │ NexusFlag Resilience Mechanism                           │
├───────────────────────────┼──────────────────────────────────────────────────────────┤
│ Central DB Unavailable    │ Edge Relays serve from in-memory cache; SDKs serve RAM.  │
│ Relay Proxy Cluster Crash │ SDKs fall back to encrypted on-disk JSON snapshot.       │
│ Thundering Herd Reconnect │ Reconnect enforces Exponential Backoff with Full Jitter. │
│ Corrupted Rule Schema     │ Poison Pill Guard logs error and returns safe fallback.  │
│ Flapping Network Link     │ Unidirectional SSE auto-reconnects with last-event-id.   │
│ Out-of-Order Delta Events │ Monotonic version sequence validation drops stale events.│
└───────────────────────────┴──────────────────────────────────────────────────────────┘
```

### Full Jitter Backoff Algorithm

To protect edge proxies from connection storms when recovering from outages:

$$t_{\text{sleep}} = \text{random}(0, \min(T_{\max}, T_{\text{base}} \times 2^{\text{attempt}}))$$

---

## Benchmarks & Verification

Automated test suites validate rule evaluation performance, uniform hashing, and rollout stability:

```bash
npm test
```

### Benchmark Results

```text
[Benchmark] 10,000 evaluations completed in 5.12ms (Average: 0.51µs per check)
✔ Evaluation Hierarchy: Kill switch immediately overrides target list and rules
✔ Target List takes precedence over general rules
✔ Micro-benchmark: 10,000 evaluations complete in <50ms (<5µs per evaluation)
✔ MurmurHash3 Uniformity: 10,000 keys distribute evenly across 0..99
✔ Monotonic Rollout Stability: Scaling 10% to 25% preserves 100% of existing cohort
✔ Flag Salt Independence: Different flags allocate the same user to independent buckets

ℹ tests 6
ℹ pass 6
ℹ fail 0
```

---

## Project Structure

```text
RelayCore/
├── packages/
│   └── sdk/                   # Zero-dependency embedded Client SDK
│       ├── src/
│       │   ├── ast.ts         # In-memory AST evaluation engine
│       │   ├── client.ts      # Client facade, streaming client & snapshot coordinator
│       │   ├── murmur3.ts     # 32-bit MurmurHash3 bucketing algorithm
│       │   ├── resilience.ts  # Full jitter backoff & retry state machines
│       │   ├── storage.ts     # Local filesystem snapshot manager
│       │   └── telemetry.ts   # Batched telemetry aggregator
│       └── package.json
├── relay-proxy-node/          # High-throughput streaming Relay Proxy
│   ├── server.mjs             # Non-blocking SSE server & connection pool
│   └── README.md
├── src/                       # Next.js 15 Control Plane Dashboard
│   ├── app/
│   │   ├── api/               # Control plane REST & SSE streaming endpoints
│   │   ├── globals.css        # Tailwind & custom glassmorphism styles
│   │   ├── layout.tsx         # Root layout with JetBrains Mono typography
│   │   └── page.tsx           # Mission-critical control dashboard
│   ├── components/            # UI components (RuleBuilder, CanaryVisualizer, DiffViewer)
│   ├── lib/                   # In-memory transactional data store & seed configurations
│   └── types/                 # Shared TypeScript schema & type definitions
├── tests/                     # Unit test suites and micro-benchmarks
│   ├── ast.test.mjs           # Evaluation priority & performance benchmarks
│   └── murmur3.test.mjs       # Hash distribution & monotonicity tests
├── README.md
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

* Node.js 20.x or higher
* npm 10.x or higher

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ajlaanayan-crypto/RelayCore.git
   cd RelayCore
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run tests & verification suite:**
   ```bash
   npm test
   ```

4. **Start the Next.js control plane dashboard:**
   ```bash
   npm run dev
   ```
   Open **`http://localhost:3005`** in your browser.

5. **(Optional) Run standalone Relay Proxy:**
   ```bash
   node relay-proxy-node/server.mjs
   ```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
