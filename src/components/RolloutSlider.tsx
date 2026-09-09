'use client';

import React, { useState } from 'react';
import { FlagConfig } from '@/types/flag';
import { Sliders, Percent, Check, HelpCircle } from 'lucide-react';

interface RolloutSliderProps {
  flag: FlagConfig;
  onUpdateRollout: (newRollout: { variationId: string; percentage: number }[]) => void;
}

export const RolloutSlider: React.FC<RolloutSliderProps> = ({ flag, onUpdateRollout }) => {
  const isBinary = flag.variations.length === 2;
  const treatmentVar = flag.variations.find((v) => v.id !== flag.defaultVariationId) || flag.variations[1];
  const controlVar = flag.variations.find((v) => v.id === flag.defaultVariationId) || flag.variations[0];

  const currentTreatmentPct =
    flag.rollout.find((r) => r.variationId === treatmentVar?.id)?.percentage ?? 25;

  const [sliderVal, setSliderVal] = useState<number>(currentTreatmentPct);
  const [hasChanged, setHasChanged] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSliderVal(val);
    setHasChanged(val !== currentTreatmentPct);
  };

  const handleApply = () => {
    if (!treatmentVar || !controlVar) return;
    const newRollout = [
      { variationId: treatmentVar.id, percentage: sliderVal },
      { variationId: controlVar.id, percentage: 100 - sliderVal },
    ];
    onUpdateRollout(newRollout);
    setHasChanged(false);
  };

  return (
    <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">Deterministic Percentage Rollout</h4>
            <p className="text-xs text-slate-400">MurmurHash3 uniform bucket allocation (0 to 99)</p>
          </div>
        </div>

        {hasChanged && (
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950 transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Rollout</span>
          </button>
        )}
      </div>

      {isBinary ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-cyan-400 font-semibold flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                {treatmentVar.name}: {sliderVal}%
              </span>
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
                {controlVar.name}: {100 - sliderVal}%
              </span>
            </div>

            <div className="relative h-4 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${sliderVal}%` }}
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-150"
              />
              <div
                style={{ width: `${100 - sliderVal}%` }}
                className="bg-slate-700 h-full transition-all duration-150"
              />
            </div>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={sliderVal}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Off)</span>
              <span>10% (Canary)</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100% (GA)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase text-slate-300">Hash Range Mapping:</span>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <HelpCircle className="w-3 h-3" />
                <span>Monotonic Stability</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-cyan-950/40 border border-cyan-900/40 text-cyan-300">
                <div className="font-semibold text-white">{treatmentVar.name}</div>
                <div className="text-slate-400 mt-0.5">
                  Hash Buckets: <span className="font-bold text-cyan-300">[0 .. {Math.max(0, sliderVal - 1)}]</span>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                <div className="font-semibold text-white">{controlVar.name}</div>
                <div className="text-slate-400 mt-0.5">
                  Hash Buckets: <span className="font-bold text-slate-200">[{sliderVal} .. 99]</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {flag.rollout.map((r) => {
              const v = flag.variations.find((item) => item.id === r.variationId);
              return (
                <div key={r.variationId} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-xs font-semibold text-white">{v?.name || r.variationId}</div>
                  <div className="text-lg font-bold font-mono text-cyan-400 mt-1 flex items-center">
                    {r.percentage}
                    <Percent className="w-3.5 h-3.5 ml-0.5 text-cyan-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
