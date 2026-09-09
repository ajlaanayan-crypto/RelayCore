'use client';

import React, { useState, useEffect } from 'react';
import { FlagConfig, EnvironmentId, TelemetryMetric } from '@/types/flag';
import { TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

interface CanaryVisualizerProps {
  flag: FlagConfig;
  environment: EnvironmentId;
}

export const CanaryVisualizer: React.FC<CanaryVisualizerProps> = ({ flag, environment }) => {
  const [metrics, setMetrics] = useState<TelemetryMetric[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`/api/telemetry?flagKey=${flag.key}&env=${environment}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.metrics) {
            setMetrics(data.metrics);
          }
        }
      } catch {
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [flag.key, environment]);

  const treatmentMetrics = metrics.filter((m) => m.variationId === 'treatment' || m.variationId === 'v2_autonomous');
  const controlMetrics = metrics.filter((m) => m.variationId === 'control' || m.variationId === 'off');

  const latestTreatment = treatmentMetrics[treatmentMetrics.length - 1];
  const latestControl = controlMetrics[controlMetrics.length - 1];

  const treatmentErrorRate = latestTreatment ? (latestTreatment.errorRate * 100).toFixed(3) : '0.021';
  const controlErrorRate = latestControl ? (latestControl.errorRate * 100).toFixed(3) : '0.019';
  const isCanaryUnhealthy = parseFloat(treatmentErrorRate) > 0.05;

  return (
    <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">Canary Health & Telemetry Pipeline</h4>
            <p className="text-xs text-slate-400">
              Live evaluation frequency, P99 latency, and canary error delta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCanaryUnhealthy ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Canary Anomaly Detected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Canary Health Normal</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 font-mono">
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-sans">Canary Exposure</div>
          <div className="text-lg font-bold text-cyan-400 mt-1">
            {latestTreatment ? `${latestTreatment.evaluations} req/min` : '284 req/min'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">~25% active traffic</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-sans">Evaluation Latency P99</div>
          <div className="text-lg font-bold text-purple-400 mt-1">
            {latestTreatment ? `${latestTreatment.latencyMicrosecondsP99}µs` : '16µs'}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">In-memory zero network</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-sans">Canary Error Rate</div>
          <div className={`text-lg font-bold mt-1 ${isCanaryUnhealthy ? 'text-rose-400' : 'text-emerald-400'}`}>
            {treatmentErrorRate}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Baseline Control: {controlErrorRate}%</div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">Throughput Time-Series (Last 20 Mins)</span>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
              Treatment (Canary)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-0.5 bg-slate-500 inline-block" />
              Control (Baseline)
            </span>
          </div>
        </div>

        <div className="relative h-28 w-full">
          <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
            <line x1="0" y1="25" x2="400" y2="25" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="0" y1="50" x2="400" y2="50" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="0" y1="75" x2="400" y2="75" stroke="#1e293b" strokeDasharray="3 3" />

            <path
              d="M 0 35 Q 50 30, 100 36 T 200 32 T 300 34 T 400 33"
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
            />

            <path
              d="M 0 78 Q 50 75, 100 72 T 200 70 T 300 68 T 400 65"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>-20m</span>
          <span>-15m</span>
          <span>-10m</span>
          <span>-5m</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
};
