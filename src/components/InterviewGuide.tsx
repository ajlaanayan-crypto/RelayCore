'use client';

import React, { useState } from 'react';
import { Cpu, X, Server, Zap, ShieldAlert, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

interface InterviewGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InterviewGuide: React.FC<InterviewGuideProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'narrative' | 'architecture' | 'tradeoffs' | 'resilience'>('narrative');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-indigo-950/50 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-mono">
                  NexusFlag: System Design & Staff Interview Guide
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                  Principal / Staff Caliber
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Architectural justifications, failure-mode analysis, and interview pitch narrative
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 text-xs font-mono">
          {[
            { id: 'narrative', label: '1. The Interview Narrative (Pitch Script)' },
            { id: 'architecture', label: '2. High-Level Design (4 Tiers)' },
            { id: 'tradeoffs', label: '3. Engineering Trade-Off Matrix' },
            { id: 'resilience', label: '4. System Resilience & Edge Cases' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2.5 font-semibold transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-300 bg-indigo-950/30'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-300 text-xs leading-relaxed">
          {activeTab === 'narrative' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/60">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  How to Pitch NexusFlag in 4 Steps
                </h4>
                <p className="text-slate-300">
                  Deliver this opening pitch during system design rounds to establish deep architectural ownership:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold font-mono text-xs">
                    <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    The Core Problem
                  </div>
                  <p className="text-slate-300 italic">
                    &quot;Most engineering teams couple deployment with release, making rollback slow, fraught with danger, and dependent on full CI/CD pipelines. I designed NexusFlag to decouple code deployments from feature releases through a zero-latency, distributed evaluation engine.&quot;
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-xs">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    The Latency Achievement
                  </div>
                  <p className="text-slate-300 italic">
                    &quot;Instead of making an outbound HTTP request across the network every time an application checks an if/else condition, our client SDK evaluates rules entirely in local RAM (&lt;10µs) using an in-memory Abstract Syntax Tree and deterministic MurmurHash3 bucketing.&quot;
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-[10px]">
                      3
                    </span>
                    The Real-Time Pipeline
                  </div>
                  <p className="text-slate-300 italic">
                    &quot;Updates do not rely on polling. The moment a flag changes or a kill-switch is pressed, an invalidation message travels through Redis Pub/Sub to Node.js event-driven edge proxies, which stream delta updates to connected clients using HTTP/2 Server-Sent Events in under 100 milliseconds.&quot;
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-xs">
                    <span className="w-5 h-5 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center text-[10px]">
                      4
                    </span>
                    Reliability &amp; Blast Radius
                  </div>
                  <p className="text-slate-300 italic">
                    &quot;The architecture guarantees safety: even if the central database, Redis cluster, and edge proxies all crash simultaneously, client applications continue operating seamlessly using local memory and encrypted disk snapshots.&quot;
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                <div className="text-cyan-400 font-bold">[ NexusFlag 4-Tier Separation ]</div>
                <div className="p-3 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <pre>{`[ Admin Dashboard ]
       │ (REST Mutations / Git-style Diff Promotion)
       ▼
[ Control Plane API ] ──(Write Master)──► [ Primary Database (PostgreSQL) ]
       │                                         │
       │ (Publish Invalidation)                  ▼ (Change Data Capture)
       ├──────────────────────────────► [ In-Memory Cache (Redis Cluster) ]
       ▼
[ Streaming Edge Relay Proxies (Go) ] ◄──────── (Read Rulesets)
       │
       │ (Persistent Multiplexed HTTP/2 SSE Streams)
       ▼
[ Embedded Client SDKs (In-RAM Engine) ] ──(Batched Telemetry)──► [ Analytics ]`}</pre>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    Control Plane vs Data Plane
                  </span>
                  <p className="text-slate-400 text-xs">
                    The Control Plane handles RBAC, rules authoring, Git-style diffs, and audit logging. The Data Plane lives strictly inside the consumer service’s host memory. Zero network traffic during request execution.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Deterministic MurmurHash3 Bucketing
                  </span>
                  <p className="text-slate-400 text-xs">
                    Hashing <code className="text-cyan-300">salt:flagKey:userId</code> modulo 100 ensures completely uniform user distribution with monotonic rollout stability. Expanding 10% to 25% guarantees 0% user churn.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tradeoffs' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-800 text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-mono">
                      <th className="p-3">Decision Axis</th>
                      <th className="p-3 text-cyan-400">Chosen Architecture</th>
                      <th className="p-3 text-slate-500">Rejected Alternative</th>
                      <th className="p-3">Staff Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    <tr>
                      <td className="p-3 font-semibold text-white">Streaming Protocol</td>
                      <td className="p-3 text-cyan-300 font-mono">HTTP/2 Server-Sent Events (SSE)</td>
                      <td className="p-3 text-slate-400 font-mono">WebSockets</td>
                      <td className="p-3">
                        SSE is unidirectional, lightweight, supports native HTTP/2 multiplexing, auto-reconnects with event IDs, and avoids WebSocket binary framing overhead.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Rule Evaluation</td>
                      <td className="p-3 text-purple-300 font-mono">In-Memory RAM AST (&lt;10µs)</td>
                      <td className="p-3 text-slate-400 font-mono">Remote REST / Central Redis</td>
                      <td className="p-3">
                        Remote HTTP checks add 10-15ms network latency and create a single point of failure. In-RAM evaluation takes 0.7µs and never fails on network drop.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Relay Concurrency</td>
                      <td className="p-3 text-emerald-300 font-mono">Node.js (libuv Event Loop) / Go</td>
                      <td className="p-3 text-slate-400 font-mono">Thread-per-request (Java / C++)</td>
                      <td className="p-3">
                        Persistent SSE connections are I/O bound. Node.js non-blocking epoll/kqueue handles tens of thousands of idle connections effortlessly without thread scheduling overhead or language context-switching.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">User Bucketing</td>
                      <td className="p-3 text-amber-300 font-mono">MurmurHash3 (32-bit non-crypto)</td>
                      <td className="p-3 text-slate-400 font-mono">SHA-256 / MD5</td>
                      <td className="p-3">
                        Cryptographic hashes like SHA-256 cost 20-50x more CPU cycles. MurmurHash3 provides near-perfect uniform distribution with extreme speed.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'resilience' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Cold Boot Offline Resilience
                </div>
                <p className="text-slate-400 text-xs">
                  The client SDK writes an encrypted snapshot to disk/local storage. If a microservice cold-boots during a total network partition, it serves rules from the snapshot immediately without stalling or crashing.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Thundering Herd Protection
                </div>
                <p className="text-slate-400 text-xs">
                  When edge proxies restart, 100,000 clients attempting synchronous reconnect would cause DDoS. NexusFlag uses exponential backoff with full jitter: <code className="text-amber-300">t = random(0, min(max, base * 2^attempt))</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Delta-Only Invalidation
                </div>
                <p className="text-slate-400 text-xs">
                  Instead of pushing a 2MB ruleset payload over every active stream when one flag changes, the control plane broadcasts an incremental JSON Patch containing only the modified flag and version ID.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Poison Pill Protection
                </div>
                <p className="text-slate-400 text-xs">
                  If an engineer inputs an invalid regular expression or corrupted schema, the SDK intercepts the evaluation error, logs a telemetry warning, and safely returns the application&apos;s hardcoded fallback value.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
