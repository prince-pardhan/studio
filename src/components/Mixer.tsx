/**
 * BeatFlow Studio - Audio Mixer Console & Effects Rack
 * Master bus + 8 insert channels with animated LED VU meters, dB faders, panning,
 * mute/solo, and interactive Effect Rack (3-band EQ, Reverb, Delay, Distortion).
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
} from 'lucide-react';
import { Project, MixerChannel, EffectConfig } from '../types/project';
import { AudioEngine } from '../audio/AudioEngine';

interface MixerProps {
  project: Project;
  onUpdateMixerChannel: (channelId: number, updates: Partial<MixerChannel>) => void;
  onUpdateMixerEffect: (channelId: number, effectId: string, updates: Partial<EffectConfig>) => void;
}

export const Mixer: React.FC<MixerProps> = ({
  project,
  onUpdateMixerChannel,
  onUpdateMixerEffect,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<number>(0);
  const [channelPeaks, setChannelPeaks] = useState<Record<number, number>>({});
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

      {/* Right: Selected Channel Effects Rack */}
      <div className="w-80 bg-[#161720] flex flex-col overflow-y-auto">
        <div className="p-3 bg-[#1a1b26] border-b border-[#252837] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
              Effects Slot
            </span>
            <h3 className="text-xs font-bold text-zinc-100 truncate">
              {selectedChannel.name}
            </h3>
          </div>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: selectedChannel.color }}
          />
        </div>

        {/* Effects List */}
        <div className="p-4 space-y-4">
          {/* Effect: 3-Band Parametric EQ */}
          {(() => {
            const eq = selectedChannel.effects.find((e) => e.type === 'eq3') || {
              id: 'fx_eq',
              type: 'eq3' as const,
              name: 'Parametric 3-Band EQ',
              enabled: true,
              params: { low: 0, mid: 0, high: 0 },
            };

            return (
              <div className="bg-[#1c1d27] border border-[#2b2e3e] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-cyan-400" />
                    3-Band EQ
                  </span>
                  <button
                    onClick={() =>
                      onUpdateMixerEffect(selectedChannel.id, eq.id, {
                        enabled: !eq.enabled,
                      })
                    }
                    className={`p-1 rounded ${
                      eq.enabled ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center gap-1 bg-[#13141a] p-2 rounded">
                    <span className="text-[10px] text-zinc-400 font-bold">LOW</span>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={eq.params.low ?? 0}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, eq.id, {
                          params: { ...eq.params, low: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full h-1 bg-zinc-700 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-zinc-300">
                      {(eq.params.low ?? 0).toFixed(1)}dB
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 bg-[#13141a] p-2 rounded">
                    <span className="text-[10px] text-zinc-400 font-bold">MID</span>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={eq.params.mid ?? 0}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, eq.id, {
                          params: { ...eq.params, mid: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full h-1 bg-zinc-700 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-zinc-300">
                      {(eq.params.mid ?? 0).toFixed(1)}dB
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 bg-[#13141a] p-2 rounded">
                    <span className="text-[10px] text-zinc-400 font-bold">HIGH</span>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={eq.params.high ?? 0}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, eq.id, {
                          params: { ...eq.params, high: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full h-1 bg-zinc-700 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-zinc-300">
                      {(eq.params.high ?? 0).toFixed(1)}dB
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Effect: Delay */}
          {(() => {
            const delay = selectedChannel.effects.find((e) => e.type === 'delay') || {
              id: 'fx_delay',
              type: 'delay' as const,
              name: 'Stereo Delay',
              enabled: true,
              params: { wet: 0.25, delayTime: 0.25, feedback: 0.35 },
            };

            return (
              <div className="bg-[#1c1d27] border border-[#2b2e3e] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    Echo Delay
                  </span>
                  <button
                    onClick={() =>
                      onUpdateMixerEffect(selectedChannel.id, delay.id, {
                        enabled: !delay.enabled,
                      })
                    }
                    className={`p-1 rounded ${
                      delay.enabled ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 text-[11px]">Wet / Dry:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={delay.params.wet ?? 0.2}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, delay.id, {
                          params: { ...delay.params, wet: parseFloat(e.target.value) },
                        })
                      }
                      className="w-28 h-1 bg-zinc-700 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 text-[11px]">Feedback:</span>
                    <input
                      type="range"
                      min={0}
                      max={0.8}
                      step={0.02}
                      value={delay.params.feedback ?? 0.3}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, delay.id, {
                          params: { ...delay.params, feedback: parseFloat(e.target.value) },
                        })
                      }
                      className="w-28 h-1 bg-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Effect: Reverb */}
          {(() => {
            const reverb = selectedChannel.effects.find((e) => e.type === 'reverb') || {
              id: 'fx_reverb',
              type: 'reverb' as const,
              name: 'Studio Reverb',
              enabled: true,
              params: { wet: 0.3, roomSize: 0.6 },
            };

            return (
              <div className="bg-[#1c1d27] border border-[#2b2e3e] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Convolution Reverb
                  </span>
                  <button
                    onClick={() =>
                      onUpdateMixerEffect(selectedChannel.id, reverb.id, {
                        enabled: !reverb.enabled,
                      })
                    }
                    className={`p-1 rounded ${
                      reverb.enabled ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 text-[11px]">Wet Mix:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={reverb.params.wet ?? 0.3}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, reverb.id, {
                          params: { ...reverb.params, wet: parseFloat(e.target.value) },
                        })
                      }
                      className="w-28 h-1 bg-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Effect: Distortion / Saturation */}
          {(() => {
            const dist = selectedChannel.effects.find((e) => e.type === 'distortion') || {
              id: 'fx_dist',
              type: 'distortion' as const,
              name: 'Warm Tube Distortion',
              enabled: false,
              params: { wet: 0.35, distortion: 0.5 },
            };

            return (
              <div className="bg-[#1c1d27] border border-[#2b2e3e] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    Tube Drive / Saturation
                  </span>
                  <button
                    onClick={() =>
                      onUpdateMixerEffect(selectedChannel.id, dist.id, {
                        enabled: !dist.enabled,
                      })
                    }
                    className={`p-1 rounded ${
                      dist.enabled ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 text-[11px]">Drive:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={dist.params.distortion ?? 0.5}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, dist.id, {
                          params: { ...dist.params, distortion: parseFloat(e.target.value) },
                        })
                      }
                      className="w-28 h-1 bg-zinc-700 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 text-[11px]">Wet Mix:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={dist.params.wet ?? 0.35}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, dist.id, {
                          params: { ...dist.params, wet: parseFloat(e.target.value) },
                        })
                      }
                      className="w-28 h-1 bg-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Effect: Stereo Chorus */}
          {(() => {
            const chorus = selectedChannel.effects.find((e) => e.type === 'chorus') || {
              id: 'fx_chorus',
              type: 'chorus' as const,
              name: 'Stereo Chorus Ensemble',
              enabled: false,
              params: { wet: 0.3, rate: 1.5 },
            };

            return (
              <div className="bg-[#1c1d27] border border-[#2b2e3e] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    Ensemble Chorus
                  </span>
                  <button
                    onClick={() =>
                      onUpdateMixerEffect(selectedChannel.id, chorus.id, {
                        enabled: !chorus.enabled,
                      })
                    }
                    className={`p-1 rounded ${
                      chorus.enabled ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 text-[11px]">Rate (Hz):</span>
                    <input
                      type="range"
                      min={0.2}
                      max={6.0}
                      step={0.1}
                      value={chorus.params.rate ?? 1.5}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, chorus.id, {
                          params: { ...chorus.params, rate: parseFloat(e.target.value) },
                        })
                      }
                      className="w-28 h-1 bg-zinc-700 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 text-[11px]">Wet Mix:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={chorus.params.wet ?? 0.3}
                      onChange={(e) =>
                        onUpdateMixerEffect(selectedChannel.id, chorus.id, {
                          params: { ...chorus.params, wet: parseFloat(e.target.value) },
                        })
                      }
                      className="w-28 h-1 bg-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
