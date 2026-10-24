/**
 * BeatFlow Studio - 16-Pad Live Performance Launchpad
 * Real-time triggering of drum hits, 808 bass, chord stabs, and micro-rolls
 * with visual feedback and hardware/computer keyboard key-bindings.
 */
import React, { useState, useEffect } from 'react';
import { Disc, Zap, Volume2, Grid } from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';

interface PadDef {
  id: string;
  label: string;
  sub: string;
  keyBind: string;
  color: string;
  action: (engine: AudioEngine) => void;
}

export const PERFORMANCE_PADS: PadDef[] = [
  // Row 1: Drums
  { id: 'p1', label: '808 Kick', sub: 'One-Shot', keyBind: '1', color: '#f97316', action: (e) => e.auditionDrum('kick', 1, 0.95) },
  { id: 'p2', label: 'Trap Snare', sub: 'One-Shot', keyBind: '2', color: '#ef4444', action: (e) => e.auditionDrum('snare', 2, 0.9) },
  { id: 'p3', label: 'Studio Clap', sub: 'Stereo', keyBind: '3', color: '#ec4899', action: (e) => e.auditionDrum('clap', 2, 0.85) },
  { id: 'p4', label: 'Closed Hat', sub: 'Roll 2x', keyBind: '4', color: '#eab308', action: (e) => (e.drumSynth as any).triggerDrum('hihat_closed', e.mixer.getChannelInput(3), e.ctx.currentTime, 0.85, 0, 2) },

  // Row 2: 808 Bass Hits
  { id: 'p5', label: '808 Bass C1', sub: 'Sub Hit', keyBind: 'Q', color: '#8b5cf6', action: (e) => e.auditionNote('sub_808', 36, 0.8, 4, 0.95) },
  { id: 'p6', label: '808 Bass D#1', sub: 'Sub Hit', keyBind: 'W', color: '#8b5cf6', action: (e) => e.auditionNote('sub_808', 39, 0.8, 4, 0.95) },
  { id: 'p7', label: '808 Bass F1', sub: 'Sub Hit', keyBind: 'E', color: '#8b5cf6', action: (e) => e.auditionNote('sub_808', 41, 0.8, 4, 0.95) },
  { id: 'p8', label: '808 Bass G1', sub: 'Sub Hit', keyBind: 'R', color: '#8b5cf6', action: (e) => e.auditionNote('sub_808', 43, 0.8, 4, 0.95) },

  // Row 3: Chords
  { id: 'p9', label: 'Cm7 Chord', sub: 'Poly Pad', keyBind: 'A', color: '#10b981', action: (e) => { [48, 51, 55, 58].forEach((m) => e.auditionNote('pad', m, 0.8, 6, 0.75)); } },
  { id: 'p10', label: 'Fm7 Chord', sub: 'Poly Pad', keyBind: 'S', color: '#10b981', action: (e) => { [53, 56, 60, 63].forEach((m) => e.auditionNote('pad', m, 0.8, 6, 0.75)); } },
  { id: 'p11', label: 'Gm7 Chord', sub: 'Poly Pad', keyBind: 'D', color: '#10b981', action: (e) => { [55, 58, 62, 65].forEach((m) => e.auditionNote('pad', m, 0.8, 6, 0.75)); } },
  { id: 'p12', label: 'Bb7 Chord', sub: 'Poly Pad', keyBind: 'F', color: '#10b981', action: (e) => { [58, 62, 65, 68].forEach((m) => e.auditionNote('pad', m, 0.8, 6, 0.75)); } },

  // Row 4: Lead Riffs & Special FX
  { id: 'p13', label: 'Lead Arp 1', sub: 'Cyber Lead', keyBind: 'Z', color: '#06b6d4', action: (e) => e.auditionNote('lead', 60, 0.4, 5, 0.9) },
  { id: 'p14', label: 'Lead Arp 2', sub: 'Cyber Lead', keyBind: 'X', color: '#06b6d4', action: (e) => e.auditionNote('lead', 63, 0.4, 5, 0.9) },
  { id: 'p15', label: 'Lead Arp 3', sub: 'Cyber Lead', keyBind: 'C', color: '#06b6d4', action: (e) => e.auditionNote('lead', 67, 0.4, 5, 0.9) },
  { id: 'p16', label: 'Quad Snare', sub: 'Roll 4x', keyBind: 'V', color: '#ef4444', action: (e) => (e.drumSynth as any).triggerDrum('snare', e.mixer.getChannelInput(2), e.ctx.currentTime, 0.85, 0, 4) },
];

export const PerformancePads: React.FC = () => {
  const [activePadId, setActivePadId] = useState<string | null>(null);
  const audioEngine = AudioEngine.getInstance();

  const handleTrigger = (pad: PadDef) => {
    pad.action(audioEngine);
    setActivePadId(pad.id);
    setTimeout(() => setActivePadId(null), 120);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const matched = PERFORMANCE_PADS.find(
        (p) => p.keyBind.toLowerCase() === e.key.toLowerCase()
      );
      if (matched) {
        e.preventDefault();
        handleTrigger(matched);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col flex-1 bg-[#121318] p-6 select-none overflow-y-auto">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#252837]">
        <div className="flex items-center gap-2">
          <Grid className="w-5 h-5 text-orange-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Live Performance Pads</h3>
            <p className="text-[11px] text-zinc-400">
              Trigger one-shots, chords, and rolls using keyboard keys (1-4, Q-R, A-F, Z-V) or mouse
            </p>
          </div>
        </div>
      </div>

      {/* 4x4 Pads Matrix */}
      <div className="grid grid-cols-4 gap-3 max-w-4xl mx-auto w-full my-auto">
        {PERFORMANCE_PADS.map((pad) => {
          const isActive = activePadId === pad.id;

          return (
            <button
              key={pad.id}
              onClick={() => handleTrigger(pad)}
              style={{
                backgroundColor: isActive ? pad.color : `${pad.color}22`,
                borderColor: pad.color,
              }}
              className={`h-28 rounded-xl border-2 flex flex-col justify-between p-3 transition-all transform active:scale-95 shadow-md cursor-pointer ${
                isActive
                  ? 'scale-98 ring-4 ring-white shadow-2xl brightness-125'
                  : 'hover:brightness-125'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-black/40 text-white shadow-inner">
                  {pad.keyBind}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-300">
                  {pad.sub}
                </span>
              </div>

              <div className="text-left w-full">
                <span className="text-sm font-bold text-white block truncate">
                  {pad.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
