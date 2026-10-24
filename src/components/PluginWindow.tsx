/**
 * BeatFlow Studio - Plugin Editor Window
 * Floating/Dockable parameter control window with real-time slider/knob modulation,
 * factory & user presets manager, A/B state comparison, bypass switch, and parameter reset.
 */
import React, { useState } from 'react';
import {
  Power,
  RotateCcw,
  Sparkles,
  Save,
  Check,
  Minimize2,
  Maximize2,
  Bookmark,
} from 'lucide-react';
import { EffectConfig } from '../types/project';
import { BUILT_IN_PLUGINS, PluginRegistry } from '../plugins/PluginRegistry';

interface PluginWindowProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: number;
  channelName: string;
  effect: EffectConfig | null;
  onUpdateParams: (channelId: number, effectId: string, params: Record<string, any>) => void;
  onToggleBypass: (channelId: number, effectId: string, bypass: boolean) => void;
}

export const PluginWindow: React.FC<PluginWindowProps> = ({
  isOpen,
  onClose,
  channelId,
  channelName,
  effect,
  onUpdateParams,
  onToggleBypass,
}) => {
  const [activeAbState, setActiveAbState] = useState<'A' | 'B'>('A');
  const [savedA, setSavedA] = useState<Record<string, any> | null>(null);
  const [savedB, setSavedB] = useState<Record<string, any> | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [userPresets, setUserPresets] = useState<{ id: string; name: string; params: any }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`beatflow_user_presets_${effect?.type}`) || '[]');
    } catch {
      return [];
    }
  });

  if (!isOpen || !effect) return null;

  const def = PluginRegistry.getById(effect.type) || BUILT_IN_PLUGINS[0];
  const currentParams = effect.params || {};

  const handleParamChange = (paramId: string, value: any) => {
    onUpdateParams(channelId, effect.id, { [paramId]: value });
  };

  const handleResetDefaults = () => {
    const defaults = PluginRegistry.createDefaultConfig(effect.type);
    onUpdateParams(channelId, effect.id, defaults.params);
  };

  const handleSelectPreset = (presetParams: Record<string, any>) => {
    onUpdateParams(channelId, effect.id, presetParams);
  };

  const handleToggleAB = () => {
    if (activeAbState === 'A') {
      // Save current to A
      setSavedA({ ...currentParams });
      // Restore B if exists
      if (savedB) {
        onUpdateParams(channelId, effect.id, savedB);
      }
      setActiveAbState('B');
    } else {
      // Save current to B
      setSavedB({ ...currentParams });
      // Restore A if exists
      if (savedA) {
        onUpdateParams(channelId, effect.id, savedA);
      }
      setActiveAbState('A');
    }
  };

  const handleSaveUserPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset = {
      id: `up_${Date.now()}`,
      name: newPresetName.trim(),
      params: { ...currentParams },
    };
    const updated = [...userPresets, newPreset];
    setUserPresets(updated);
    try {
      localStorage.setItem(`beatflow_user_presets_${effect.type}`, JSON.stringify(updated));
    } catch {}
    setNewPresetName('');
    setIsSavingPreset(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`bg-[#171822] border border-[#2d3042] rounded-xl shadow-2xl flex flex-col select-none transition-all duration-150 ${
          isCompact ? 'w-full max-w-md' : 'w-full max-w-2xl'
        }`}
      >
        {/* Top Window Chrome */}
        <div className="px-4 py-2.5 bg-[#1a1c29] border-b border-[#292c3d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Power / Bypass Toggle */}
            <button
              onClick={() => onToggleBypass(channelId, effect.id, effect.enabled)}
              title={effect.enabled ? 'Click to bypass effect' : 'Click to enable effect'}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                effect.enabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'bg-[#252837] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">{effect.name}</span>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase px-1.5 py-0.2 rounded bg-[#20222f]">
                  {def.category}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {channelName} (Insert {channelId})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Compact / Expanded toggle */}
            <button
              onClick={() => setIsCompact(!isCompact)}
              title={isCompact ? 'Expand window' : 'Compact window'}
              className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-[#252838] transition-colors"
            >
              {isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onClose}
              className="w-6 h-6 rounded bg-[#252837] hover:bg-[#34374a] text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Preset Toolbar & A/B State Controls */}
        <div className="px-4 py-2 bg-[#13141c] border-b border-[#232534] flex items-center justify-between text-xs gap-3">
          {/* Preset Selector */}
          <div className="flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const factory = def.factoryPresets.find((p) => p.id === val);
                if (factory) {
                  handleSelectPreset(factory.params);
                  return;
                }
                const custom = userPresets.find((p) => p.id === val);
                if (custom) {
                  handleSelectPreset(custom.params);
                }
              }}
              className="bg-[#1f212d] border border-[#2c2f3e] text-zinc-200 text-xs rounded px-2 py-0.5 outline-none font-medium"
            >
              <option value="">Presets...</option>
              <optgroup label="Factory Presets">
                {def.factoryPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
              {userPresets.length > 0 && (
                <optgroup label="User Presets">
                  {userPresets.map((up) => (
                    <option key={up.id} value={up.id}>
                      {up.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <button
              onClick={() => setIsSavingPreset(!isSavingPreset)}
              title="Save current parameters as user preset"
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-[#222432]"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* A/B Comparison & Reset */}
          <div className="flex items-center gap-2">
            {/* A/B Button */}
            <button
              onClick={handleToggleAB}
              title="Toggle A/B parameter state comparison"
              className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border transition-colors ${
                activeAbState === 'A'
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}
            >
              State {activeAbState}
            </button>

            {/* Reset Defaults */}
            <button
              onClick={handleResetDefaults}
              title="Reset parameters to factory defaults"
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-[#222432]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* User Preset Save Input (if toggled) */}
        {isSavingPreset && (
          <div className="px-4 py-2 bg-[#1a1b26] border-b border-[#282a3b] flex items-center gap-2">
            <input
              type="text"
              placeholder="Preset name..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="flex-1 bg-[#121319] border border-[#2b2e40] text-zinc-200 text-xs px-2.5 py-1 rounded outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveUserPreset()}
            />
            <button
              onClick={handleSaveUserPreset}
              className="px-3 py-1 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded"
            >
              Save
            </button>
            <button
              onClick={() => setIsSavingPreset(false)}
              className="px-2 py-1 text-zinc-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Parameters Grid */}
        <div className="p-5 max-h-[60vh] overflow-y-auto bg-[#121318]">
          <div className={`grid gap-4 ${isCompact ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
            {def.params.map((param) => {
              const val = currentParams[param.id] ?? param.defaultVal;

              if (param.type === 'enum' && param.options) {
                return (
                  <div key={param.id} className="bg-[#191a24] border border-[#262837] rounded-lg p-3 flex flex-col justify-between gap-2">
                    <span className="text-[11px] font-bold text-zinc-300">{param.name}</span>
                    <select
                      value={val}
                      onChange={(e) => handleParamChange(param.id, e.target.value)}
                      className="bg-[#121318] border border-[#2b2d3d] text-orange-400 text-xs rounded px-2 py-1 outline-none font-bold"
                    >
                      {param.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (param.type === 'boolean') {
                return (
                  <div key={param.id} className="bg-[#191a24] border border-[#262837] rounded-lg p-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-300">{param.name}</span>
                    <button
                      onClick={() => handleParamChange(param.id, !val)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${
                        val ? 'bg-orange-500' : 'bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${
                          val ? 'left-4.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                );
              }

              // Numeric Slider
              const min = param.min ?? 0;
              const max = param.max ?? 100;
              const step = param.step ?? 1;

              return (
                <div key={param.id} className="bg-[#191a24] border border-[#262837] rounded-lg p-3 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-300 truncate" title={param.name}>
                      {param.name}
                    </span>
                    <span className="font-mono text-xs text-orange-400 font-bold tabular-nums">
                      {typeof val === 'number' ? val.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0) : val}
                      {param.unit ? ` ${param.unit}` : ''}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={val}
                    onChange={(e) => handleParamChange(param.id, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-700 cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                    <span>{min}{param.unit}</span>
                    <span>{max}{param.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#14151c] border-t border-[#242635] flex items-center justify-between text-xs text-zinc-500">
          <span>Smooth 20ms audio parameter ramping (zero audio clicks)</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#222432] hover:bg-[#2c2f42] text-zinc-200 rounded font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
