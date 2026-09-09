'use client';

import React, { useState, useEffect } from 'react';
import { EnvironmentId } from '@/types/flag';
import { GitBranch, ArrowRight, Check, X, RefreshCw } from 'lucide-react';

interface DiffViewerProps {
  isOpen: boolean;
  onClose: () => void;
  onPromotionComplete: () => void;
}

interface DiffItem {
  flagKey: string;
  status: 'ADDED' | 'MODIFIED' | 'UNCHANGED' | 'REMOVED';
  diffDescription: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  isOpen,
  onClose,
  onPromotionComplete,
}) => {
  const [fromEnv, setFromEnv] = useState<EnvironmentId>('staging');
  const [toEnv, setToEnv] = useState<EnvironmentId>('production');
  const [diffItems, setDiffItems] = useState<DiffItem[]>([]);
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promotedMsg, setPromotedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchDiff = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/environments?from=${fromEnv}&to=${toEnv}`);
        if (res.ok) {
          const data = await res.json();
          setDiffItems(data.changes || []);
          const diffKeys = (data.changes || [])
            .filter((c: DiffItem) => c.status === 'MODIFIED' || c.status === 'ADDED')
            .map((c: DiffItem) => c.flagKey);
          setSelectedFlags(diffKeys);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchDiff();
  }, [fromEnv, toEnv, isOpen]);

  if (!isOpen) return null;

  const handlePromote = async () => {
    if (selectedFlags.length === 0) return;
    setPromoting(true);

    try {
      const res = await fetch('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEnv,
          to: toEnv,
          flagKeys: selectedFlags,
          actor: 'release_manager@nexusflag.io',
          reason: `Promoted ${selectedFlags.length} feature flag(s) after successful staging verification`,
        }),
      });

      if (res.ok) {
        setPromotedMsg(`Successfully promoted ${selectedFlags.length} flags to ${toEnv}!`);
        setTimeout(() => {
          setPromotedMsg(null);
          onPromotionComplete();
          onClose();
        }, 1200);
      }
    } catch {
    } finally {
      setPromoting(false);
    }
  };

  const toggleFlag = (key: string) => {
    if (selectedFlags.includes(key)) {
      setSelectedFlags(selectedFlags.filter((k) => k !== key));
    } else {
      setSelectedFlags([...selectedFlags, key]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-cyan-950/40 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  Environment Promotion & Git Diff
                </h3>
                <p className="text-xs text-slate-400">
                  Inspect declarative rule and rollout diffs prior to production promotion
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

          <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">From Source:</span>
              <select
                value={fromEnv}
                onChange={(e) => setFromEnv(e.target.value as EnvironmentId)}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold uppercase focus:outline-none"
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-500" />

            <div className="flex items-center gap-2">
              <span className="text-slate-400">To Target:</span>
              <select
                value={toEnv}
                onChange={(e) => setToEnv(e.target.value as EnvironmentId)}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-rose-400 font-bold uppercase focus:outline-none"
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                Computing AST diff across environments...
              </div>
            ) : diffItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No differences detected. Both environments are completely synchronized.
              </div>
            ) : (
              diffItems.map((item) => {
                const isSelected = selectedFlags.includes(item.flagKey);
                const isModified = item.status === 'MODIFIED';
                const isAdded = item.status === 'ADDED';
                const isUnchanged = item.status === 'UNCHANGED';

                return (
                  <div
                    key={item.flagKey}
                    onClick={() => !isUnchanged && toggleFlag(item.flagKey)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isUnchanged
                        ? 'bg-slate-950/40 border-slate-800/40 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-indigo-950/30 border-indigo-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {!isUnchanged && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFlag(item.flagKey)}
                          className="accent-indigo-500 rounded"
                        />
                      )}
                      <div>
                        <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                          <span>{item.flagKey}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isModified
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : isAdded
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.diffDescription}</p>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      {isModified ? (
                        <span className="text-amber-400 font-semibold">~ Rollout Diff</span>
                      ) : isAdded ? (
                        <span className="text-emerald-400 font-semibold">+ New in {fromEnv}</span>
                      ) : (
                        <span className="text-slate-600">Synced</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {promotedMsg && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 font-mono flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{promotedMsg}</span>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs text-slate-400 font-mono">
              {selectedFlags.length} flag(s) selected for atomic promotion
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                onClick={handlePromote}
                disabled={promoting || selectedFlags.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-950 disabled:opacity-50 transition"
              >
                {promoting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Promoting to {toEnv}...</span>
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4" />
                    <span>Promote {selectedFlags.length} Flags to {toEnv}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
