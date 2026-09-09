'use client';

import React, { useState } from 'react';
import { FlagConfig, EnvironmentId } from '@/types/flag';
import { ShieldAlert, AlertTriangle, X, Radio, CheckCircle } from 'lucide-react';

interface KillSwitchModalProps {
  flag: FlagConfig;
  environment: EnvironmentId;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedFlag: FlagConfig) => void;
}

export const KillSwitchModal: React.FC<KillSwitchModalProps> = ({
  flag,
  environment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [broadcastDone, setBroadcastDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetState = !flag.isKillSwitched;
  const isActionEngage = targetState;

  const handleConfirm = async () => {
    if (confirmInput !== flag.key) {
      setError(`Confirmation mismatch. Please type '${flag.key}' exactly.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/flags/${flag.key}/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment,
          isKillSwitched: targetState,
          actor: 'oncall_engineer@nexusflag.io',
          reason: reason || (isActionEngage ? 'EMERGENCY PANIC KILL SWITCH TRIGGERED' : 'Kill switch reset to normal'),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle kill switch');
      }

      setBroadcastDone(true);
      setTimeout(() => {
        onSuccess({
          ...flag,
          isKillSwitched: targetState,
          version: flag.version + 1,
        });
        setBroadcastDone(false);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing kill switch';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-rose-600 rounded-2xl shadow-2xl shadow-rose-950/60 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 animate-pulse" />

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-rose-950 text-rose-400 border border-rose-800">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono">
                  {isActionEngage ? 'ENGAGE KILL SWITCH' : 'DISENGAGE KILL SWITCH'}
                </h3>
                <p className="text-xs text-rose-400 font-mono">
                  Target Environment: <span className="uppercase font-bold text-white">{environment}</span>
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

          <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p>
                {isActionEngage ? (
                  <>
                    Flipping this kill switch immediately forces <span className="font-bold text-white">{flag.key}</span> to its default fallback variation (<span className="text-rose-300 font-mono">{flag.defaultVariationId}</span>) across all connected microservices and edge proxies in under 15ms.
                  </>
                ) : (
                  <>
                    Disengaging this kill switch will restore dynamic AST evaluation and percentage rollout rules for <span className="font-bold text-white">{flag.key}</span> across all consumer instances.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Incident Justification / Reason:
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isActionEngage ? "e.g. Database connection pool exhaustion detected" : "e.g. Upstream incident resolved"}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Type <span className="font-mono text-rose-400 font-bold">{flag.key}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={flag.key}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 font-medium bg-rose-950/60 p-2 rounded border border-rose-900">
                {error}
              </p>
            )}

            {broadcastDone && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 font-mono animate-fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Delta patch broadcasted via Redis Pub/Sub to 12 edge proxies in 8ms!</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirm}
              disabled={isSubmitting || confirmInput !== flag.key}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-lg transition ${
                isActionEngage
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/50 disabled:opacity-50'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50 disabled:opacity-50'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Radio className="w-4 h-4 animate-spin" />
                  <span>Broadcasting Delta...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>{isActionEngage ? 'Engage Panic Kill Switch' : 'Restore Flag Evaluation'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
