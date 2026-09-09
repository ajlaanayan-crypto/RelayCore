'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FlagConfig, UserContext, EvaluationResult, EnvironmentId } from '@/types/flag';
import { evaluateFlag } from '@/../packages/sdk/src/ast';
import { getBucket } from '@/../packages/sdk/src/murmur3';
import { Terminal, Play, Zap, Hash, RefreshCw } from 'lucide-react';

interface SDKTestBenchProps {
  flags: FlagConfig[];
  environment: EnvironmentId;
  isOpen: boolean;
  onClose: () => void;
}

export const SDKTestBench: React.FC<SDKTestBenchProps> = ({
  flags,
  environment,
  isOpen,
  onClose,
}) => {
  const [selectedFlagKey, setSelectedFlagKey] = useState<string>(flags[0]?.key || 'new_checkout_flow');
  const [context, setContext] = useState<UserContext>({
    userId: 'usr_enterprise_99',
    email: 'sarah@company.com',
    plan: 'enterprise',
    country: 'US',
    appVersion: '2.5.0',
  });

  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evalDuration, setEvalDuration] = useState<number>(0.72);
  const [, setIsEvaluating] = useState<boolean>(false);

  const activeFlag = useMemo(() => {
    return flags.find((f) => f.key === selectedFlagKey) || flags[0];
  }, [flags, selectedFlagKey]);

  const runEvaluation = () => {
    if (!activeFlag) return;
    setIsEvaluating(true);

    const t0 = performance.now();
    const result = evaluateFlag(activeFlag, context);
    const t1 = performance.now();

    const durationUs = Math.max(0.2, (t1 - t0) * 1000);
    setEvalDuration(parseFloat(durationUs.toFixed(2)));
    setEvaluation(result);
    setIsEvaluating(false);
  };

  useEffect(() => {
    if (activeFlag) {
      runEvaluation();
    }
  }, [activeFlag, context]);

  if (!isOpen) return null;

  const hashDetails = activeFlag
    ? getBucket(context.userId, activeFlag.key, activeFlag.salt)
    : { bucket: 0, hash: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-cyan-800/80 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-mono">
                  In-Memory SDK Test Bench & Hash Inspector
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Zero-Network RAM Evaluation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulate client microservice evaluation with local AST traversal and MurmurHash3 bucketing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs transition"
          >
            Close
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Target Feature Flag:
              </label>
              <select
                value={selectedFlagKey}
                onChange={(e) => setSelectedFlagKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                {flags.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.name} ({f.key}) {f.isKillSwitched ? '[KILL-SWITCHED]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Test Personas:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    setContext({
                      userId: 'usr_enterprise_99',
                      email: 'sarah@company.com',
                      plan: 'enterprise',
                      country: 'US',
                      appVersion: '2.5.0',
                    })
                  }
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 border border-slate-700 font-mono"
                >
                  Enterprise VIP
                </button>

                <button
                  onClick={() =>
                    setContext({
                      userId: 'usr_qa_checkout',
                      email: 'qa_tester@company.com',
                      plan: 'free',
                      country: 'IN',
                      appVersion: '2.4.0',
                    })
                  }
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 border border-slate-700 font-mono"
                >
                  QA Whitelist
                </button>

                <button
                  onClick={() =>
                    setContext({
                      userId: 'usr_standard_buyer',
                      email: 'buyer@gmail.com',
                      plan: 'pro',
                      country: 'DE',
                      appVersion: '2.1.0',
                    })
                  }
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 border border-slate-700 font-mono"
                >
                  Standard Consumer
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="text-[11px] uppercase font-bold text-slate-400 font-sans flex items-center justify-between">
                <span>User Context Attributes</span>
                <span className="text-cyan-400">RAM State</span>
              </div>

              <div>
                <span className="text-slate-500">userId:</span>
                <input
                  type="text"
                  value={context.userId}
                  onChange={(e) => setContext({ ...context, userId: e.target.value })}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">email:</span>
                  <input
                    type="text"
                    value={context.email || ''}
                    onChange={(e) => setContext({ ...context, email: e.target.value })}
                    className="mt-1 w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <span className="text-slate-500">plan:</span>
                  <select
                    value={context.plan}
                    onChange={(e) =>
                      setContext({ ...context, plan: e.target.value as 'free' | 'pro' | 'enterprise' })
                    }
                    className="mt-1 w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="enterprise">enterprise</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">country:</span>
                  <input
                    type="text"
                    value={context.country || ''}
                    onChange={(e) => setContext({ ...context, country: e.target.value })}
                    className="mt-1 w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <span className="text-slate-500">appVersion:</span>
                  <input
                    type="text"
                    value={context.appVersion || ''}
                    onChange={(e) => setContext({ ...context, appVersion: e.target.value })}
                    className="mt-1 w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={runEvaluation}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-cyan-950 transition"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Evaluate in RAM SDK</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-800/80 shadow-inner">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
                <span className="font-semibold text-slate-400 uppercase font-mono">
                  Evaluation Outcome
                </span>
                <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                  <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                  <span>Latency: {evalDuration}µs</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Resolved Variation:</div>
                  <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">
                    {evaluation?.variationId || 'None'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Runtime Value:</div>
                  <div className="text-base font-mono font-bold text-white px-2.5 py-1 rounded bg-slate-900 border border-slate-800 inline-block mt-0.5">
                    {JSON.stringify(evaluation?.value)}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Match Reason:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                    evaluation?.reason === 'KILL_SWITCH'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : evaluation?.reason === 'TARGET_LIST'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : evaluation?.reason === 'RULE_MATCH'
                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      : evaluation?.reason === 'PERCENTAGE_ROLLOUT'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {evaluation?.reason}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <Hash className="w-4 h-4 text-cyan-400" />
                  <span>MurmurHash3 Bucketing Breakdown</span>
                </div>
                <span className="text-[10px] text-cyan-400">Deterministic Range 0..99</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Hash Salt:</span>
                  <span className="text-slate-300">{activeFlag?.salt}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Composite Key:</span>
                  <span className="text-cyan-300 truncate max-w-[220px]">
                    {activeFlag?.salt}:{activeFlag?.key}:{context.userId}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">32-Bit Hash (Hex):</span>
                  <span className="text-purple-300">
                    0x{(hashDetails.hash >>> 0).toString(16).toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400 font-bold">Calculated Bucket:</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800">
                    Bucket #{hashDetails.bucket}
                  </span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Bucket Range</span>
                  <span className="text-cyan-400">User at {hashDetails.bucket}%</span>
                </div>
                <div className="relative h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ left: `${hashDetails.bucket}%` }}
                    className="absolute top-0 bottom-0 w-1.5 bg-amber-400 shadow-md shadow-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/60 text-xs text-indigo-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Connected to Edge Relay SSE stream. Toggling a kill switch or editing rules updates this test bench in under 15ms.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
