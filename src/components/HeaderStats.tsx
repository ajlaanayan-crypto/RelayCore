'use client';

import React from 'react';
import { EnvironmentId } from '@/types/flag';
import { Activity, ShieldAlert, Cpu, Radio, GitBranch, Terminal } from 'lucide-react';

interface HeaderStatsProps {
  currentEnv: EnvironmentId;
  onEnvChange: (env: EnvironmentId) => void;
  activeFlagCount: number;
  killSwitchedCount: number;
  streamConnected: boolean;
  onOpenDiff: () => void;
  onOpenGuide: () => void;
  onOpenTestBench: () => void;
}

export const HeaderStats: React.FC<HeaderStatsProps> = ({
  currentEnv,
  onEnvChange,
  activeFlagCount,
  killSwitchedCount,
  streamConnected,
  onOpenDiff,
  onOpenGuide,
  onOpenTestBench,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-700 shadow-lg shadow-cyan-500/20">
            <Radio className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${streamConnected ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${streamConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                NEXUS<span className="text-cyan-400">FLAG</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                v2.4 Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400">Zero-Network Feature Orchestration & Edge Relay</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          {(['development', 'staging', 'production'] as EnvironmentId[]).map((env) => {
            const isActive = currentEnv === env;
            return (
              <button
                key={env}
                onClick={() => onEnvChange(env)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium uppercase tracking-wider transition-all ${
                  isActive
                    ? env === 'production'
                      ? 'bg-rose-600/90 text-white shadow-md shadow-rose-900/30'
                      : env === 'staging'
                      ? 'bg-amber-600/90 text-white shadow-md shadow-amber-900/30'
                      : 'bg-cyan-600/90 text-white shadow-md shadow-cyan-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {env}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTestBench}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-800/40 transition shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SDK Test Bench</span>
          </button>

          <button
            onClick={onOpenDiff}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <span>Promote Diff</span>
          </button>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-900/30 transition"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>System Design Pitch</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900/60 border-t border-slate-800/60 px-4 sm:px-6 py-2 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${streamConnected ? 'bg-emerald-400 pulse-active' : 'bg-amber-400'}`} />
              <span className="text-slate-400">Relay Stream:</span>
              <span className="text-emerald-400 font-semibold">{streamConnected ? 'HTTP/2 SSE (Active)' : 'Reconnecting...'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Edge Proxies:</span>
              <span className="text-slate-200">12 Nodes (Node.js / V8 Cluster)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">P99 Invalidation Latency:</span>
              <span className="text-cyan-400 font-semibold">&lt; 14ms</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">In-RAM AST Latency:</span>
              <span className="text-purple-400 font-semibold">0.70µs</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Active Flags:</span>
              <span className="text-white font-semibold">{activeFlagCount}</span>
            </div>

            {killSwitchedCount > 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>{killSwitchedCount} Kill Switch Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>All Circuit Breakers Normal</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
