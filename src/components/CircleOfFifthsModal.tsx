/**
 * BeatFlow Studio - Interactive Circle of Fifths Music Theory Tool
 * Visual wheel of keys, diatonic chords, relative keys, and instant audio chord auditioning.
 */
import React, { useState } from 'react';
import { Circle, Volume2, Plus, ArrowRight } from 'lucide-react';
import { ScaleKey, Note } from '../types/project';
import { CIRCLE_OF_FIFTHS, AlgorithmicMusicGen } from '../ai/AlgorithmicMusicGen';
import { AudioEngine } from '../audio/AudioEngine';

interface CircleOfFifthsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertProgression: (notes: Note[]) => void;
}

export const CircleOfFifthsModal: React.FC<CircleOfFifthsModalProps> = ({
  isOpen,
  onClose,
  onInsertProgression,
}) => {
  const [selectedKeyIndex, setSelectedKeyIndex] = useState(0); // 0 is C Major / A Minor
  const audioEngine = AudioEngine.getInstance();

  if (!isOpen) return null;

  const current = CIRCLE_OF_FIFTHS[selectedKeyIndex];
  const chords = AlgorithmicMusicGen.generateChordProgression(current.key, 'minor', 'synthwave');

  const handleAuditionKey = (key: ScaleKey) => {
    const testChords = AlgorithmicMusicGen.generateChordProgression(key, 'minor');
    if (testChords[0]) {
      for (const n of testChords[0].notes) {
        audioEngine.auditionNote('pad', n.midi, 0.7, 6, 0.8);
      }
    }
  };

  const handleApplyProgression = () => {
    const flat = chords.flatMap((c) => c.notes);
    onInsertProgression(flat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#181922] border border-[#2d3042] rounded-xl shadow-2xl p-6 select-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#292c3c]">
          <div className="flex items-center gap-2">
            <Circle className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Circle of Fifths Theory Wheel</h3>
              <p className="text-[11px] text-zinc-400">
                Explore key signatures, harmonic relationships, and diatonic chords
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-[#252837]"
          >
            ✕
          </button>
        </div>

        {/* Wheel Grid */}
        <div className="grid grid-cols-2 gap-6 my-6 items-center">
          {/* Circular Wheel Dial */}
          <div className="flex flex-col items-center justify-center relative h-64">
            <div className="w-56 h-56 rounded-full border-2 border-[#2b2d3e] relative flex items-center justify-center bg-[#13141a]">
              {CIRCLE_OF_FIFTHS.map((item, idx) => {
                const angle = (idx * 30 - 90) * (Math.PI / 180);
                const radius = 86; // px
                const x = 112 + radius * Math.cos(angle) - 18;
                const y = 112 + radius * Math.sin(angle) - 18;
                const isSelected = selectedKeyIndex === idx;

                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSelectedKeyIndex(idx);
                      handleAuditionKey(item.key);
                    }}
                    style={{ left: x, top: y }}
                    className={`absolute w-9 h-9 rounded-full flex flex-col items-center justify-center text-[10px] font-bold transition-all shadow-md ${
                      isSelected
                        ? 'bg-orange-500 text-black ring-4 ring-orange-500/30 scale-110 z-10'
                        : 'bg-[#222434] text-zinc-300 hover:bg-[#2e3146] hover:text-white'
                    }`}
                  >
                    <span>{item.key}</span>
                    <span className="text-[8px] opacity-75">{item.relativeMinor}m</span>
                  </button>
                );
              })}

              {/* Center Wheel Info */}
              <div className="flex flex-col items-center justify-center text-center p-2">
                <span className="text-xs text-zinc-400 uppercase font-mono">Key</span>
                <span className="text-lg font-bold text-orange-400">{current.key} Maj</span>
                <span className="text-xs text-zinc-400">{current.relativeMinor} Min</span>
                <span className="text-[10px] font-mono text-zinc-500 mt-1">
                  Accidentals: {current.sharpsOrFlats}
                </span>
              </div>
            </div>
          </div>

          {/* Diatonic Chords Breakdown */}
          <div className="flex flex-col gap-3 bg-[#13141a] border border-[#262837] rounded-lg p-4">
            <h4 className="text-xs font-bold text-white flex items-center justify-between">
              <span>Diatonic Harmony in {current.key}</span>
              <button
                onClick={() => handleAuditionKey(current.key)}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Audition</span>
              </button>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[#1b1d28] rounded border border-[#2b2d3d]">
                <span className="text-[10px] text-zinc-500 uppercase block">Tonic (I)</span>
                <span className="font-bold text-orange-400">{current.key} Major</span>
              </div>
              <div className="p-2 bg-[#1b1d28] rounded border border-[#2b2d3d]">
                <span className="text-[10px] text-zinc-500 uppercase block">Subdominant (IV)</span>
                <span className="font-bold text-cyan-400">
                  {CIRCLE_OF_FIFTHS[(selectedKeyIndex + 11) % 12].key} Major
                </span>
              </div>
              <div className="p-2 bg-[#1b1d28] rounded border border-[#2b2d3d]">
                <span className="text-[10px] text-zinc-500 uppercase block">Dominant (V)</span>
                <span className="font-bold text-emerald-400">
                  {CIRCLE_OF_FIFTHS[(selectedKeyIndex + 1) % 12].key} Major
                </span>
              </div>
              <div className="p-2 bg-[#1b1d28] rounded border border-[#2b2d3d]">
                <span className="text-[10px] text-zinc-500 uppercase block">Rel. Minor (vi)</span>
                <span className="font-bold text-purple-400">{current.relativeMinor} Minor</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleApplyProgression}
                className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 text-black font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Insert Diatonic Chords to Pattern</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-[#292c3c]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252838] hover:bg-[#32364a] text-zinc-300 text-xs font-semibold rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
