'use client';

import React, { useState } from 'react';
import { FlagConfig, RuleGroup, Predicate, Operator } from '@/types/flag';
import { Plus, Trash2, Code2, Check, ArrowRight } from 'lucide-react';

interface RuleBuilderProps {
  flag: FlagConfig;
  onSaveRules: (rules: RuleGroup[]) => void;
}

const COMMON_ATTRIBUTES = [
  'country',
  'plan',
  'email',
  'user_id',
  'app_version',
  'ip',
  'device',
];

const OPERATORS: { label: string; value: Operator }[] = [
  { label: 'EQUALS (==)', value: 'EQUALS' },
  { label: 'NOT EQUALS (!=)', value: 'NOT_EQUALS' },
  { label: 'IN (list)', value: 'IN' },
  { label: 'NOT IN', value: 'NOT_IN' },
  { label: 'CONTAINS', value: 'CONTAINS' },
  { label: 'STARTS WITH', value: 'STARTS_WITH' },
  { label: 'ENDS WITH', value: 'ENDS_WITH' },
  { label: 'GREATER THAN (>)', value: 'GREATER_THAN' },
  { label: 'LESS THAN (<)', value: 'LESS_THAN' },
  { label: 'SEMVER GTE (>=)', value: 'SEMVER_GTE' },
];

export const RuleBuilder: React.FC<RuleBuilderProps> = ({ flag, onSaveRules }) => {
  const [rules, setRules] = useState<RuleGroup[]>(
    flag.rules && flag.rules.length > 0
      ? JSON.parse(JSON.stringify(flag.rules))
      : []
  );
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleAddRule = () => {
    const newRule: RuleGroup = {
      id: `rule_${Date.now().toString(36)}`,
      name: `Targeting Rule ${rules.length + 1}`,
      combinator: 'AND',
      predicates: [
        {
          attribute: 'country',
          operator: 'IN',
          values: ['US', 'CA'],
        },
      ],
      serveVariationId: flag.variations[1]?.id || flag.defaultVariationId,
    };
    setRules([...rules, newRule]);
    setIsDirty(true);
  };

  const handleRemoveRule = (index: number) => {
    const updated = rules.filter((_, i) => i !== index);
    setRules(updated);
    setIsDirty(true);
  };

  const handleAddPredicate = (ruleIndex: number) => {
    const updated = [...rules];
    updated[ruleIndex].predicates.push({
      attribute: 'plan',
      operator: 'EQUALS',
      values: ['enterprise'],
    });
    setRules(updated);
    setIsDirty(true);
  };

  const handleRemovePredicate = (ruleIndex: number, predIndex: number) => {
    const updated = [...rules];
    updated[ruleIndex].predicates = updated[ruleIndex].predicates.filter((_, i) => i !== predIndex);
    setRules(updated);
    setIsDirty(true);
  };

  const handleUpdatePredicate = (
    ruleIndex: number,
    predIndex: number,
    field: keyof Predicate,
    value: unknown
  ) => {
    const updated = [...rules];
    const pred = { ...updated[ruleIndex].predicates[predIndex] };
    if (field === 'values' && typeof value === 'string') {
      pred.values = value.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (field === 'attribute') {
      pred.attribute = String(value);
    } else if (field === 'operator') {
      pred.operator = value as Predicate['operator'];
    }
    updated[ruleIndex].predicates[predIndex] = pred;
    setRules(updated);
    setIsDirty(true);
  };

  const handleSave = () => {
    onSaveRules(rules);
    setIsDirty(false);
  };

  return (
    <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-white tracking-wide">Targeting Rules</h4>
          <p className="text-xs text-slate-400">
            Rules evaluate dynamically in RAM with sub-microsecond latency
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJsonPreview(!showJsonPreview)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{showJsonPreview ? 'Hide AST' : 'View AST'}</span>
          </button>

          {isDirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Rules</span>
            </button>
          )}
        </div>
      </div>

      {showJsonPreview && (
        <div className="mb-4 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 max-h-48 overflow-auto">
          <pre>{JSON.stringify(rules, null, 2)}</pre>
        </div>
      )}

      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-dashed border-slate-800">
            <p className="text-xs text-slate-400">No targeting rules configured yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Add a rule to target specific user plans, regions, or domain emails.
            </p>
            <button
              onClick={handleAddRule}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Rule</span>
            </button>
          </div>
        ) : (
          rules.map((rule, ruleIdx) => (
            <div
              key={rule.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => {
                      const updated = [...rules];
                      updated[ruleIdx].name = e.target.value;
                      setRules(updated);
                      setIsDirty(true);
                    }}
                    className="text-xs font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">Match if</span>
                    <select
                      value={rule.combinator}
                      onChange={(e) => {
                        const updated = [...rules];
                        updated[ruleIdx].combinator = e.target.value as 'AND' | 'OR';
                        setRules(updated);
                        setIsDirty(true);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none"
                    >
                      <option value="AND">ALL (AND)</option>
                      <option value="OR">ANY (OR)</option>
                    </select>
                    <span className="text-slate-400">clauses match</span>
                  </div>

                  <button
                    onClick={() => handleRemoveRule(ruleIdx)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 pl-2 border-l-2 border-slate-800">
                {rule.predicates.map((predicate, predIdx) => (
                  <div key={predIdx} className="flex flex-wrap items-center gap-2 text-xs">
                    <input
                      type="text"
                      list={`attrs-${ruleIdx}-${predIdx}`}
                      value={predicate.attribute}
                      onChange={(e) =>
                        handleUpdatePredicate(ruleIdx, predIdx, 'attribute', e.target.value)
                      }
                      placeholder="Attribute"
                      className="w-28 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                    <datalist id={`attrs-${ruleIdx}-${predIdx}`}>
                      {COMMON_ATTRIBUTES.map((a) => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>

                    <select
                      value={predicate.operator}
                      onChange={(e) =>
                        handleUpdatePredicate(ruleIdx, predIdx, 'operator', e.target.value)
                      }
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={predicate.values.join(', ')}
                      onChange={(e) =>
                        handleUpdatePredicate(ruleIdx, predIdx, 'values', e.target.value)
                      }
                      placeholder="Values (comma-separated)"
                      className="flex-1 min-w-[160px] px-2 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />

                    {rule.predicates.length > 1 && (
                      <button
                        onClick={() => handleRemovePredicate(ruleIdx, predIdx)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={() => handleAddPredicate(ruleIdx)}
                  className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium mt-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Condition Clause</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-400">Then serve variation:</span>
                  <select
                    value={rule.serveVariationId}
                    onChange={(e) => {
                      const updated = [...rules];
                      updated[ruleIdx].serveVariationId = e.target.value;
                      setRules(updated);
                      setIsDirty(true);
                    }}
                    className="px-2 py-1 rounded bg-slate-900 border border-indigo-700/60 text-indigo-300 font-semibold text-xs focus:outline-none"
                  >
                    {flag.variations.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({String(v.value)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))
        )}

        {rules.length > 0 && (
          <button
            onClick={handleAddRule}
            className="w-full py-2 border border-dashed border-slate-700 hover:border-cyan-600 rounded-xl text-xs font-semibold text-slate-400 hover:text-cyan-300 transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Targeting Rule</span>
          </button>
        )}
      </div>
    </div>
  );
};
