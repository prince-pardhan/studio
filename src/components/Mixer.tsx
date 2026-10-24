/**
 * BeatFlow Studio - Audio Mixer Console & Modular Plugin Rack
 * Master bus + 8 insert channels with animated LED VU meters, dB faders, panning,
 * mute/solo, and interactive modular Plugin Rack (supporting 19 studio audio effects,
 * drag-and-drop reordering, bypass, preset selection, and parameter editing).
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Sliders,
  Power,
  RotateCcw,
  Sparkles,
  Waves,
  Radio,
  Flame,
  Zap,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from 'lucide-react';
import { Project, MixerChannel, EffectConfig, EffectType } from '../types/project';
import { AudioEngine } from '../audio/AudioEngine';
import { PluginBrowserModal } from './PluginBrowserModal';
import { PluginWindow } from './PluginWindow';

interface MixerProps {
  project: Project;
  onUpdateMixerChannel: (channelId: number, updates: Partial<MixerChannel>) => void;
  onUpdateMixerEffect: (channelId: number, effectId: string, updates: Partial<EffectConfig>) => void;
  onAddPlugin?: (channelId: number, type: EffectType) => void;
  onRemovePlugin?: (channelId: number, effectId: string) => void;
  onReorderPlugins?: (channelId: number, fromIndex: number, toIndex: number) => void;
}

export const Mixer: React.FC<MixerProps> = ({
  project,
  onUpdateMixerChannel,
  onUpdateMixerEffect,
  onAddPlugin,
  onRemovePlugin,
  onReorderPlugins,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<number>(0);
  const [channelPeaks, setChannelPeaks] = useState<Record<number, number>>({});
  const [isPluginBrowserOpen, setIsPluginBrowserOpen] = useState(false);
  const [activeEditingEffect, setActiveEditingEffect] = useState<EffectConfig | null>(null);

  const audioEngine = useRef(AudioEngine.getInstance()).current;

  // Real-time VU meter polling loop
  useEffect(() => {
    let animId: number;
    const pollMeters = () => {
      const peaks: Record<number, number> = {};
      for (const ch of project.mixerChannels) {
        peaks[ch.id] = audioEngine.mixer.getMeterData(ch.id).peak;
      }
      setChannelPeaks(peaks);
      animId = requestAnimationFrame(pollMeters);
    };
    animId = requestAnimationFrame(pollMeters);
    return () => cancelAnimationFrame(animId);
  }, [project.mixerChannels, audioEngine]);

  const selectedChannel =
    project.mixerChannels.find((c) => c.id === selectedChannelId) || project.mixerChannels[0];

  const handleVolumeChange = (chId: number, dB: number) => {
    onUpdateMixerChannel(chId, { volume: dB });
  };

  const handlePanChange = (chId: number, pan: number) => {
    onUpdateMixerChannel(chId, { pan });
  };

  const toggleMute = (chId: number) => {
    const ch = project.mixerChannels.find((c) => c.id === chId);
    if (ch) onUpdateMixerChannel(chId, { mute: !ch.mute });
  };

  const toggleSolo = (chId: number) => {
    const ch = project.mixerChannels.find((c) => c.id === chId);
    if (ch) onUpdateMixerChannel(chId, { solo: !ch.solo });
  };

  return (
    <div className="flex flex-1 bg-[#111216] overflow-hidden select-none">
      {/* Left: Mixer Strips Console */}
      <div className="flex-1 flex flex-col border-r border-[#242635] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#171821] border-b border-[#242635]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Mixer Console
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            9 Buses (1 Master + 8 Inserts)
          </span>
        </div>

        {/* Fader Channels Row */}
        <div className="flex-1 flex overflow-x-auto p-4 gap-2 bg-[#121318]">
          {project.mixerChannels.map((ch) => {
            const isSelected = selectedChannelId === ch.id;
            const peak = channelPeaks[ch.id] || 0;

            return (
              <div
                key={ch.id}
                onClick={() => setSelectedChannelId(ch.id)}
                className={`w-24 shrink-0 flex flex-col justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1e202c] border-orange-500 shadow-md ring-1 ring-orange-500/30'
                    : 'bg-[#171822] border-[#252837] hover:border-[#383c50]'
                }`}
              >
                {/* Channel Header */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-full h-1 rounded"
                    style={{ backgroundColor: ch.color }}
                  />
                  <span className="font-mono text-[10px] font-bold text-zinc-500">
                    {ch.id === 0 ? 'MASTER' : `IN ${ch.id}`}
                  </span>
                  <span className="text-xs font-semibold text-zinc-200 text-center truncate w-full">
                    {ch.name}
                  </span>
                </div>

                {/* Central Meter + Vertical Fader Area */}
                <div className="flex justify-center items-center gap-2.5 my-3 h-52">
                  {/* Vertical LED Peak Meter */}
                  <div className="w-3 h-full bg-[#0d0e12] rounded-sm p-0.5 flex flex-col justify-end border border-[#232533]">
                    <div
                      className="w-full rounded-sm transition-all duration-75"
                      style={{
                        height: `${Math.min(100, peak * 115)}%`,
                        backgroundColor:
                          peak > 0.95 ? '#ef4444' : peak > 0.75 ? '#eab308' : '#10b981',
                      }}
                    />
                  </div>

                  {/* Vertical Slider Fader */}
                  <div className="flex flex-col items-center h-full justify-center">
                    <input
                      type="range"
                      min={-40}
                      max={6}
                      step={0.5}
                      value={ch.volume}
                      onChange={(e) => handleVolumeChange(ch.id, parseFloat(e.target.value))}
                      className="h-44 -rotate-90 w-44 cursor-pointer"
                      title={`${ch.volume.toFixed(1)} dB`}
                    />
                  </div>
                </div>

                {/* dB Readout & Pan */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-mono text-[11px] text-orange-400 font-bold tabular-nums">
                    {ch.volume > -39 ? `${ch.volume > 0 ? '+' : ''}${ch.volume.toFixed(1)} dB` : '-inf'}
                  </span>

                  {/* Pan Slider */}
                  <div className="w-full flex items-center justify-between text-[9px] text-zinc-500">
                    <span>L</span>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.1}
                      value={ch.pan}
                      onChange={(e) => handlePanChange(ch.id, parseFloat(e.target.value))}
                      className="w-12 h-1 cursor-pointer bg-zinc-700"
                      title={`Pan: ${Math.round(ch.pan * 100)}%`}
                    />
                    <span>R</span>
                  </div>

                  {/* Send A & B on Insert Channels */}
                  {ch.id !== 0 && (
                    <div className="w-full flex items-center justify-between gap-1 text-[8px] font-mono text-zinc-400 mt-0.5">
                      <div className="flex flex-col items-center flex-1" title={`Send A (Reverb): ${Math.round((ch.sendA ?? 0.2) * 100)}%`}>
                        <span className="text-[7px] text-purple-400 font-bold">REV</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={ch.sendA ?? 0.2}
                          onChange={(e) => onUpdateMixerChannel(ch.id, { sendA: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col items-center flex-1" title={`Send B (Delay): ${Math.round((ch.sendB ?? 0.2) * 100)}%`}>
                        <span className="text-[7px] text-amber-400 font-bold">DLY</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={ch.sendB ?? 0.2}
                          onChange={(e) => onUpdateMixerChannel(ch.id, { sendB: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mute / Solo Buttons */}
                  <div className="flex items-center gap-1 w-full mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute(ch.id);
                      }}
                      className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors ${
                        ch.mute
                          ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                          : 'bg-[#252837] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSolo(ch.id);
                      }}
                      className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors ${
                        ch.solo
                          ? 'bg-amber-400 text-black font-extrabold'
                          : 'bg-[#252837] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      S
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Selected Channel Modular Effects Rack */}
      <div className="w-88 bg-[#161720] flex flex-col border-l border-[#242635] overflow-hidden">
        {/* Rack Header */}
        <div className="p-3 bg-[#1a1b26] border-b border-[#252837] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
              Insert Effects ({selectedChannel.effects.length})
            </span>
            <h3 className="text-xs font-bold text-zinc-100 truncate">
              {selectedChannel.name} {selectedChannel.id === 0 ? '(Master Bus)' : `(Track ${selectedChannel.id})`}
            </h3>
          </div>

          <button
            onClick={() => setIsPluginBrowserOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-black bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 rounded shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add FX</span>
          </button>
        </div>

        {/* Plugin Slots List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#121319]">
          {selectedChannel.effects.length === 0 ? (
            <div
              onClick={() => setIsPluginBrowserOpen(true)}
              className="border-2 border-dashed border-[#2b2e40] hover:border-orange-500/50 rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-colors group mt-6"
            >
              <div className="w-10 h-10 rounded-full bg-[#202230] group-hover:bg-[#282a3d] flex items-center justify-center text-zinc-400 group-hover:text-orange-400 mb-2 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-zinc-300 group-hover:text-white">
                No Insert Effects Loaded
              </span>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px]">
                Click to browse 19 studio plugins (EQ, Compressor, Reverb, Chorus, Distortion, etc.)
              </p>
            </div>
          ) : (
            selectedChannel.effects.map((effect, idx) => {
              return (
                <div
                  key={effect.id}
                  className={`bg-[#1a1b26] border rounded-xl p-3 flex flex-col gap-2 transition-all shadow-sm ${
                    effect.enabled
                      ? 'border-[#2d3043] hover:border-[#42465e]'
                      : 'border-[#222430] opacity-60'
                  }`}
                >
                  {/* Slot Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded text-[9px] font-mono font-bold bg-[#111218] text-zinc-500 flex items-center justify-center">
                        {idx + 1}
                      </span>

                      {/* Power / Bypass Toggle */}
                      <button
                        onClick={() =>
                          onUpdateMixerEffect(selectedChannel.id, effect.id, {
                            enabled: !effect.enabled,
                          })
                        }
                        title={effect.enabled ? 'Bypass effect' : 'Enable effect'}
                        className={`p-1 rounded transition-colors ${
                          effect.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-600'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-xs font-bold text-zinc-200 truncate">
                        {effect.name}
                      </span>
                    </div>

                    {/* Actions: Reorder & Delete */}
                    <div className="flex items-center gap-1">
                      {idx > 0 && onReorderPlugins && (
                        <button
                          onClick={() => onReorderPlugins(selectedChannel.id, idx, idx - 1)}
                          title="Move up in signal chain"
                          className="p-1 text-zinc-500 hover:text-white rounded hover:bg-[#252838]"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                      )}
                      {idx < selectedChannel.effects.length - 1 && onReorderPlugins && (
                        <button
                          onClick={() => onReorderPlugins(selectedChannel.id, idx, idx + 1)}
                          title="Move down in signal chain"
                          className="p-1 text-zinc-500 hover:text-white rounded hover:bg-[#252838]"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => setActiveEditingEffect(effect)}
                        title="Open Plugin Parameter Editor"
                        className="p-1 text-cyan-400 hover:text-cyan-300 rounded hover:bg-[#252838]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {onRemovePlugin && (
                        <button
                          onClick={() => onRemovePlugin(selectedChannel.id, effect.id)}
                          title="Remove plugin"
                          className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-[#252838]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Primary Quick Slider */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#222432]">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Wet Mix: {Math.round((effect.params.wet ?? 1.0) * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={effect.params.wet ?? 1.0}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, effect.id, {
                          params: { ...effect.params, wet: parseFloat(e.target.value) },
                        })
                      }
                      className="w-24 h-1 bg-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Plugin Browser Modal */}
      <PluginBrowserModal
        isOpen={isPluginBrowserOpen}
        onClose={() => setIsPluginBrowserOpen(false)}
        targetChannelId={selectedChannel.id}
        channelName={selectedChannel.name}
        onAddPlugin={(chId, type) => {
          onAddPlugin?.(chId, type);
        }}
      />

      {/* Floating Plugin Parameter Editor Window */}
      <PluginWindow
        isOpen={!!activeEditingEffect}
        onClose={() => setActiveEditingEffect(null)}
        channelId={selectedChannel.id}
        channelName={selectedChannel.name}
        effect={activeEditingEffect}
        onUpdateParams={(chId, fxId, params) => {
          onUpdateMixerEffect(chId, fxId, { params });
          if (activeEditingEffect && activeEditingEffect.id === fxId) {
            setActiveEditingEffect({
              ...activeEditingEffect,
              params: { ...activeEditingEffect.params, ...params },
            });
          }
        }}
        onToggleBypass={(chId, fxId, bypass) => {
          onUpdateMixerEffect(chId, fxId, { enabled: !bypass });
          if (activeEditingEffect && activeEditingEffect.id === fxId) {
            setActiveEditingEffect({
              ...activeEditingEffect,
              enabled: !bypass,
            });
          }
        }}
      />
    </div>
  );
};
