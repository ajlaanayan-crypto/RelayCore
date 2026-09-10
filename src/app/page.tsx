'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FlagConfig, EnvironmentId, DeltaPatchEvent } from '@/types/flag';
import { HeaderStats } from '@/components/HeaderStats';
import { KillSwitchModal } from '@/components/KillSwitchModal';
import { RolloutSlider } from '@/components/RolloutSlider';
import { RuleBuilder } from '@/components/RuleBuilder';
import { CanaryVisualizer } from '@/components/CanaryVisualizer';
import { DiffViewer } from '@/components/DiffViewer';
import { AuditLedger } from '@/components/AuditLedger';
import { SDKTestBench } from '@/components/SDKTestBench';
import { InterviewGuide } from '@/components/InterviewGuide';
import {
  ShieldAlert,
  Sliders,
  Code2,
  TrendingUp,
  Radio,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function Home() {
  const [currentEnv, setCurrentEnv] = useState<EnvironmentId>('production');
  const [flags, setFlags] = useState<FlagConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [streamConnected, setStreamConnected] = useState<boolean>(false);

  const [killModalFlag, setKillModalFlag] = useState<FlagConfig | null>(null);
  const [isDiffOpen, setIsDiffOpen] = useState<boolean>(false);
  const [isTestBenchOpen, setIsTestBenchOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const [expandedFlagKey, setExpandedFlagKey] = useState<string>('new_checkout_flow');
  const [activeTab, setActiveTab] = useState<'rollout' | 'rules' | 'canary'>('rollout');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchFlags = useCallback(async (env: EnvironmentId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/flags?env=${env}`);
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags || []);
        if (data.flags?.length > 0 && !data.flags.some((f: FlagConfig) => f.key === expandedFlagKey)) {
          setExpandedFlagKey(data.flags[0].key);
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [expandedFlagKey]);

  useEffect(() => {
    fetchFlags(currentEnv);
  }, [currentEnv, fetchFlags]);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(`/api/stream?env=${currentEnv}`);

      eventSource.onopen = () => {
        setStreamConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const event: DeltaPatchEvent = JSON.parse(e.data);
          if (event.type === 'HEARTBEAT') return;

          if (event.type === 'FLAG_PATCH' && event.flag) {
            setFlags((prev) =>
              prev.map((f) => (f.key === event.flag!.key ? event.flag! : f))
            );
            showToast(`Updated flag '${event.flag.key}' (v${event.flag.version})`);
          } else if (event.type === 'FLAG_KILL' && event.flagKey) {
            setFlags((prev) =>
              prev.map((f) =>
                f.key === event.flagKey ? { ...f, isKillSwitched: true, version: f.version + 1 } : f
              )
            );
            showToast(`EMERGENCY KILL SWITCH engaged for '${event.flagKey}'!`);
          } else if (event.type === 'FLAG_DELETE' && event.flagKey) {
            setFlags((prev) => prev.filter((f) => f.key !== event.flagKey));
            showToast(`Flag '${event.flagKey}' deleted`);
          }
        } catch {
        }
      };

      eventSource.onerror = () => {
        setStreamConnected(false);
      };
    } catch {
      setStreamConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentEnv]);

  const activeFlag = flags.find((f) => f.key === expandedFlagKey) || flags[0];

  const handleUpdateRollout = async (newRollout: { variationId: string; percentage: number }[]) => {
    if (!activeFlag) return;
    const updated = { ...activeFlag, rollout: newRollout };

    try {
      const res = await fetch(`/api/flags/${activeFlag.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: currentEnv,
          flag: updated,
          actor: 'staff_eng@nexusflag.io',
          reason: 'Updated percentage rollout distribution',
        }),
      });

      if (res.ok) {
        setFlags((prev) => prev.map((f) => (f.key === activeFlag.key ? updated : f)));
        showToast(`Rollout distribution updated for '${activeFlag.key}'`);
      }
    } catch {
    }
  };

  const handleSaveRules = async (rules: FlagConfig['rules']) => {
    if (!activeFlag) return;
    const updated = { ...activeFlag, rules };

    try {
      const res = await fetch(`/api/flags/${activeFlag.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: currentEnv,
          flag: updated,
          actor: 'architect@nexusflag.io',
          reason: 'Updated in-memory AST targeting rules',
        }),
      });

      if (res.ok) {
        setFlags((prev) => prev.map((f) => (f.key === activeFlag.key ? updated : f)));
        showToast(`Targeting rules updated for '${activeFlag.key}'`);
      }
    } catch {
    }
  };

  const killSwitchedCount = flags.filter((f) => f.isKillSwitched).length;

  return (
    <main className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col">
      <HeaderStats
        currentEnv={currentEnv}
        onEnvChange={(env) => setCurrentEnv(env)}
        activeFlagCount={flags.length}
        killSwitchedCount={killSwitchedCount}
        streamConnected={streamConnected}
        onOpenDiff={() => setIsDiffOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenTestBench={() => setIsTestBenchOpen(true)}
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900/95 border border-cyan-500/80 text-xs font-mono text-cyan-200 shadow-2xl shadow-cyan-950/80 animate-bounce">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Zero-Network Architecture
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  HTTP/2 SSE Delta Stream Active
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                NexusFlag Distributed Control Center
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl">
                Microservices evaluate checks locally in memory (&lt;10µs) without central network bottlenecks. Invalidation messages stream instantaneously to edge proxies via Redis Pub/Sub.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTestBenchOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-950 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open SDK Test Bench</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Managed Flags ({flags.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono uppercase">
                Env: {currentEnv}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                Loading configuration matrix...
              </div>
            ) : (
              <div className="space-y-2.5">
                {flags.map((flag) => {
                  const isSelected = flag.key === expandedFlagKey;
                  const isKilled = flag.isKillSwitched;

                  return (
                    <div
                      key={flag.key}
                      onClick={() => setExpandedFlagKey(flag.key)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isKilled
                          ? isSelected
                            ? 'bg-rose-950/40 border-rose-600 shadow-lg shadow-rose-950/40'
                            : 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700'
                          : isSelected
                          ? 'bg-slate-900 border-cyan-500/80 shadow-lg shadow-cyan-950/30'
                          : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isKilled ? 'bg-rose-500 pulse-alarm' : 'bg-emerald-400'
                              }`}
                            />
                            <span className="text-xs font-mono font-bold text-white">
                              {flag.key}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              v{flag.version}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">
                            {flag.name}
                          </h4>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setKillModalFlag(flag);
                          }}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition ${
                            isKilled
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-900/60'
                              : 'bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isKilled ? 'KILLED' : 'KILL SWITCH'}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                        {flag.description}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <div className="flex items-center gap-3">
                          <span>{flag.variations.length} Variations</span>
                          <span>{flag.rules?.length || 0} Rules</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span suppressHydrationWarning>{new Date(flag.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-5">
            {activeFlag ? (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white font-mono">{activeFlag.name}</h3>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                          {activeFlag.key}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{activeFlag.description}</p>
                    </div>

                    <button
                      onClick={() => setKillModalFlag(activeFlag)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg transition ${
                        activeFlag.isKillSwitched
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
                          : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>
                        {activeFlag.isKillSwitched ? 'Restore Normal Evaluation' : 'Panic Kill Switch'}
                      </span>
                    </button>
                  </div>

                  {activeFlag.isKillSwitched && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        CIRCUIT BREAKER ENGAGED: Flag is serving default fallback (<code className="text-rose-300 font-bold font-mono">{activeFlag.defaultVariationId}</code>) to all connected clients.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <div className="text-slate-500">Flag Salt</div>
                      <div className="text-cyan-300 font-bold truncate">{activeFlag.salt}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <div className="text-slate-500">Version</div>
                      <div className="text-white font-bold">v{activeFlag.version}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <div className="text-slate-500">Default Variation</div>
                      <div className="text-indigo-300 font-bold truncate">{activeFlag.defaultVariationId}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <div className="text-slate-500">Updated By</div>
                      <div className="text-slate-300 truncate">{activeFlag.updatedBy?.split('@')[0]}</div>
                    </div>
                  </div>
                </div>

                <div className="flex border-b border-slate-800 gap-2">
                  <button
                    onClick={() => setActiveTab('rollout')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                      activeTab === 'rollout'
                        ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Percentage Rollout</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('rules')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                      activeTab === 'rules'
                        ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>In-Memory AST Rules</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('canary')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                      activeTab === 'canary'
                        ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Canary Telemetry</span>
                  </button>
                </div>

                {activeTab === 'rollout' && (
                  <RolloutSlider flag={activeFlag} onUpdateRollout={handleUpdateRollout} />
                )}

                {activeTab === 'rules' && (
                  <RuleBuilder flag={activeFlag} onSaveRules={handleSaveRules} />
                )}

                {activeTab === 'canary' && (
                  <CanaryVisualizer flag={activeFlag} environment={currentEnv} />
                )}
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 font-mono text-xs">
                Select a feature flag to configure rules and rollout.
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80">
          <AuditLedger environment={currentEnv} />
        </div>
      </div>

      {killModalFlag && (
        <KillSwitchModal
          flag={killModalFlag}
          environment={currentEnv}
          isOpen={true}
          onClose={() => setKillModalFlag(null)}
          onSuccess={(updated) => {
            setFlags((prev) => prev.map((f) => (f.key === updated.key ? updated : f)));
            showToast(`Kill switch toggled for '${updated.key}'`);
          }}
        />
      )}

      <DiffViewer
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        onPromotionComplete={() => fetchFlags(currentEnv)}
      />

      <SDKTestBench
        flags={flags}
        environment={currentEnv}
        isOpen={isTestBenchOpen}
        onClose={() => setIsTestBenchOpen(false)}
      />

      <InterviewGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </main>
  );
}
