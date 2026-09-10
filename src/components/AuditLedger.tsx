'use client';

import React, { useState, useEffect } from 'react';
import { AuditLogEntry, EnvironmentId } from '@/types/flag';
import { FileText, Search, ShieldAlert, Sliders, GitBranch, Plus, ChevronDown, ChevronRight } from 'lucide-react';

interface AuditLedgerProps {
  environment: EnvironmentId;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({ environment }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/audit?env=${environment}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [environment]);

  const filtered = logs.filter(
    (l) =>
      l.flagKey.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.reason.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase())
  );

  const getActionBadge = (action: AuditLogEntry['action']) => {
    switch (action) {
      case 'KILL_SWITCH_ENGAGED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950 text-rose-300 border border-rose-800">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Kill Engaged
          </span>
        );
      case 'KILL_SWITCH_DISENGAGED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
            Kill Reset
          </span>
        );
      case 'ROLLOUT_MODIFIED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-800">
            <Sliders className="w-3 h-3 text-cyan-400" />
            Rollout
          </span>
        );
      case 'ENV_PROMOTED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
            <GitBranch className="w-3 h-3 text-indigo-400" />
            Promoted
          </span>
        );
      case 'FLAG_CREATED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
            <Plus className="w-3 h-3 text-amber-400" />
            Created
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800/60">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">Audit Trail Ledger</h4>
            <p className="text-xs text-slate-400">
              Activity log and state changes across environments
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search flag, actor, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-64 transition font-mono"
          />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            {loading ? 'Loading audit records...' : 'No audit records match the current filter.'}
          </div>
        ) : (
          filtered.map((log) => {
            const isExpanded = expandedId === log.id;

            return (
              <div
                key={log.id}
                className="rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden transition"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/40"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-500">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">{log.flagKey}</span>
                        {getActionBadge(log.action)}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{log.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right font-mono text-[11px]">
                    <div className="text-slate-400">{log.actor}</div>
                    <div className="text-slate-500" suppressHydrationWarning>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-slate-900/60 border-t border-slate-800 text-xs font-mono space-y-2">
                    <div className="text-slate-400">
                      <span className="text-slate-500">Change Summary:</span> {log.diffSummary || 'N/A'}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-rose-400 mb-1">
                          Previous State
                        </div>
                        <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                          {log.previousStateSnippet || 'None'}
                        </pre>
                      </div>

                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">
                          Updated State
                        </div>
                        <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                          {log.newStateSnippet || 'None'}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
