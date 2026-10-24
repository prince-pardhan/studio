/**
 * BeatFlow Studio - Advanced Channel Rack & Step Sequencer
 * 16/32 steps, per-step velocity/probability/pitch/rolls, choke groups, humanization, and quick fills.
 */
import React, { useState } from 'react';
import {
  Volume2,
  Plus,
  Copy,
  Music,
  MoreVertical,
  Shuffle,
  Wand2,
} from 'lucide-react';
import { Project, ChannelRackChannel, StepModifier } from '../types/project';
import { AudioEngine } from '../audio/AudioEngine';

interface ChannelRackProps {
  project: Project;
  currentStep: number;
  onToggleStep: (channelId: string, stepIndex: number) => void;
  onSetStepVelocity: (channelId: string, stepIndex: number, velocity: number) => void;
  onSetStepModifier?: (channelId: string, stepIndex: number, mod: Partial<StepModifier>) => void;
  onFillStepsPattern: (channelId: string, interval: number) => void;
  onClearChannelSteps: (channelId: string) => void;
  onSelectPattern: (patternId: string) => void;
  onAddPattern: () => void;
  onDuplicatePattern: (patternId: string) => void;
  onUpdateChannel: (channelId: string, updates: Partial<ChannelRackChannel>) => void;
  onOpenInPianoRoll: (channelId: string) => void;
}

export const ChannelRack: React.FC<ChannelRackProps> = ({
  project,
  currentStep,
  onToggleStep,
  onSetStepVelocity,
  onSetStepModifier,
  onFillStepsPattern,
  onClearChannelSteps,
  onSelectPattern,
  onAddPattern,
  onDuplicatePattern,
  onUpdateChannel,
  onOpenInPianoRoll,
}) => {
  const [activeMenuChannel, setActiveMenuChannel] = useState<string | null>(null);
  const [showModifierDrawer, setShowModifierDrawer] = useState<string | null>(null);
  const audioEngine = AudioEngine.getInstance();

  const activePat =
    project.patterns.find((p) => p.id === project.activePatternId) || project.patterns[0];
  const lengthInSteps = activePat?.lengthInSteps || 16;
  const stepInPattern = currentStep % lengthInSteps;

  const handleAudition = (channel: ChannelRackChannel) => {
    if (channel.type === 'drum' && channel.drumType) {
      audioEngine.auditionDrum(channel.drumType, channel.mixerChannel, channel.volume);
    } else if (channel.type === 'synth') {
      audioEngine.auditionNote(channel.synthPreset || 'lead', 60, 0.4, channel.mixerChannel, channel.volume);
    }
  };

  const handleHumanize = (channelId: string) => {
    const velocities = activePat.drumSteps[channelId] || [];
    velocities.forEach((v, idx) => {
      if (v > 0) {
        const jitter = (Math.random() - 0.5) * 0.2;
        onSetStepVelocity(channelId, idx, Math.max(0.3, Math.min(1.0, v + jitter)));
      }
    });
  };

  const handleRandomize = (channelId: string) => {
    for (let i = 0; i < lengthInSteps; i++) {
      const active = Math.random() > 0.65;
      onSetStepVelocity(channelId, i, active ? Math.random() * 0.4 + 0.6 : 0);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-[#131418] select-none overflow-hidden">
      {/* Pattern Bar Header */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#181920] border-b border-[#262835]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
            <span className="uppercase tracking-wider text-[11px] text-zinc-500">Pattern:</span>
            <select
              value={project.activePatternId}
              onChange={(e) => onSelectPattern(e.target.value)}
              className="bg-[#21232d] border border-[#2d303e] text-orange-400 font-bold rounded px-2.5 py-1 text-xs outline-none"
            >
              {project.patterns.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onAddPattern}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#242633] hover:bg-[#2f3242] text-zinc-300 hover:text-white rounded text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Pattern</span>
          </button>

          <button
            onClick={() => onDuplicatePattern(project.activePatternId)}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#242633] hover:bg-[#2f3242] text-zinc-300 hover:text-white rounded text-xs font-medium transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Clone</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-zinc-400">
          Length: <span className="text-zinc-200 font-bold">{lengthInSteps} steps</span> (4/4 time)
        </div>
      </div>

      {/* Main Channels & Step Sequencer Rows */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {project.channels.map((channel) => {
          const velocities =
            activePat.drumSteps[channel.id] || new Array(lengthInSteps).fill(0);
          const modifiers = activePat.drumModifiers?.[channel.id] || {};

          return (
            <div
              key={channel.id}
              className="flex flex-col bg-[#191a22] border border-[#242633] rounded-lg p-2 hover:border-[#353849] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-52 shrink-0">
                  <button
                    onClick={() => onUpdateChannel(channel.id, { mute: !channel.mute })}
                    title="Mute"
                    className={`w-4 h-4 rounded-full transition-all ${
                      channel.mute ? 'bg-red-500' : 'bg-emerald-500 ring-2 ring-emerald-500/30'
                    }`}
                  />

                  {/* Volume slider */}
                  <div className="flex flex-col w-12" title={`Vol: ${Math.round(channel.volume * 100)}%`}>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={channel.volume}
                      onChange={(e) =>
                        onUpdateChannel(channel.id, { volume: parseFloat(e.target.value) })
                      }
                      className="h-1 bg-zinc-700 cursor-pointer"
                    />
                  </div>

                  {/* Pan slider */}
                  <div className="flex flex-col w-10" title={`Pan: ${channel.pan}`}>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.1}
                      value={channel.pan}
                      onChange={(e) =>
                        onUpdateChannel(channel.id, { pan: parseFloat(e.target.value) })
                      }
                      className="h-1 bg-zinc-700 cursor-pointer"
                    />
                  </div>

                  {/* Channel Name Button */}
                  <button
                    onClick={() => handleAudition(channel)}
                    className="flex-1 text-left px-2 py-1 bg-[#222430] hover:bg-[#2b2e3e] rounded truncate text-xs font-semibold text-zinc-200 flex items-center justify-between border-l-2"
                    style={{ borderLeftColor: channel.color }}
                  >
                    <span className="truncate">{channel.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono ml-1">
                      {channel.type === 'drum' ? 'DRUM' : 'SYNTH'}
                    </span>
                  </button>

                  {/* Target Mixer Track Selector */}
                  <select
                    value={channel.mixerChannel}
                    onChange={(e) =>
                      onUpdateChannel(channel.id, {
                        mixerChannel: parseInt(e.target.value, 10),
                      })
                    }
                    title="Route to Mixer Channel"
                    className="bg-[#101115] text-[10px] font-mono text-zinc-400 rounded px-1 py-0.5 border border-[#2d3040] outline-none"
                  >
                    <option value={0}>Mst</option>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Ch {i + 1}
                      </option>
                    ))}
                  </select>

                  {/* Menu Options */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuChannel(
                          activeMenuChannel === channel.id ? null : channel.id
                        )
                      }
                      className="p-1 text-zinc-400 hover:text-white rounded hover:bg-[#282a38]"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeMenuChannel === channel.id && (
                      <div className="absolute left-0 top-full mt-1 w-48 bg-[#1f2029] border border-[#2f3240] rounded shadow-xl py-1 z-30 text-xs">
                        <button
                          onClick={() => {
                            onFillStepsPattern(channel.id, 2);
                            setActiveMenuChannel(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#2a2c3a] text-zinc-200"
                        >
                          Fill each 2 steps
                        </button>
                        <button
                          onClick={() => {
                            onFillStepsPattern(channel.id, 4);
                            setActiveMenuChannel(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#2a2c3a] text-zinc-200"
                        >
                          Fill each 4 steps (Beat)
                        </button>
                        <button
                          onClick={() => {
                            handleHumanize(channel.id);
                            setActiveMenuChannel(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#2a2c3a] text-emerald-400 flex items-center justify-between"
                        >
                          <span>Humanize Velocity</span>
                          <Wand2 className="w-3 h-3 text-emerald-400" />
                        </button>
                        <button
                          onClick={() => {
                            handleRandomize(channel.id);
                            setActiveMenuChannel(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#2a2c3a] text-zinc-200 flex items-center justify-between"
                        >
                          <span>Randomize Pattern</span>
                          <Shuffle className="w-3 h-3 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => {
                            onClearChannelSteps(channel.id);
                            setActiveMenuChannel(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#2a2c3a] text-red-400"
                        >
                          Clear Steps
                        </button>
                        <div className="border-t border-[#2e313e] my-1" />
                        <button
                          onClick={() => {
                            setShowModifierDrawer(
                              showModifierDrawer === channel.id ? null : channel.id
                            );
                            setActiveMenuChannel(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#2a2c3a] text-cyan-400"
                        >
                          Edit Pitch / Rolls / Probability
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenInPianoRoll(channel.id)}
                    title="Edit in Piano Roll"
                    className="p-1 text-zinc-400 hover:text-orange-400 rounded hover:bg-[#282a38]"
                  >
                    <Music className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 16-Step Grid */}
                <div className="flex-1 flex items-center gap-1">
                  {Array.from({ length: lengthInSteps }).map((_, stepIdx) => {
                    const isActive = velocities[stepIdx] > 0;
                    const isPlayheadHere = stepInPattern === stepIdx;
                    const beatGroup = Math.floor(stepIdx / 4);
                    const isEvenBeat = beatGroup % 2 === 0;
                    const stepRoll = modifiers[stepIdx]?.roll || 1;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => onToggleStep(channel.id, stepIdx)}
                        style={{
                          backgroundColor: isActive
                            ? channel.color
                            : isEvenBeat
                            ? '#2b2d3b'
                            : '#1e202a',
                        }}
                        className={`flex-1 h-8 rounded-sm transition-all relative ${
                          isActive
                            ? 'shadow-sm ring-1 ring-white/20'
                            : 'hover:brightness-125'
                        } ${isPlayheadHere ? 'ring-2 ring-white scale-105 z-10' : ''}`}
                      >
                        {isPlayheadHere && (
                          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_#fff]" />
                        )}
                        {stepRoll > 1 && (
                          <span className="absolute bottom-0 right-0.5 text-[8px] font-black text-black">
                            {stepRoll}x
                          </span>
                        )}
                        <div className="w-full h-full border-t border-white/10 rounded-sm" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step Modifier Drawer (Velocity, Pitch, Roll) */}
              {showModifierDrawer === channel.id && (
                <div className="mt-2 pt-2 border-t border-[#252836] flex items-center gap-1 pl-56">
                  {Array.from({ length: lengthInSteps }).map((_, stepIdx) => (
                    <div key={stepIdx} className="flex-1 flex flex-col items-center gap-1">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={velocities[stepIdx] || 0}
                        onChange={(e) =>
                          onSetStepVelocity(
                            channel.id,
                            stepIdx,
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full h-1 bg-zinc-700 cursor-pointer"
                        title={`Vel: ${Math.round((velocities[stepIdx] || 0) * 100)}%`}
                      />

                      {/* Micro roll button (1x, 2x, 4x) */}
                      <button
                        onClick={() => {
                          const curRoll = modifiers[stepIdx]?.roll || 1;
                          const nextRoll = curRoll === 1 ? 2 : curRoll === 2 ? 4 : 1;
                          onSetStepModifier?.(channel.id, stepIdx, { roll: nextRoll });
                        }}
                        className="text-[8px] font-mono font-bold text-zinc-400 hover:text-white px-0.5 rounded bg-[#101116]"
                      >
                        {modifiers[stepIdx]?.roll || 1}x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
