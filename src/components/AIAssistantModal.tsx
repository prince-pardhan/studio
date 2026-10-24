/**
 * BeatFlow Studio - AI Music Assistant Modal
 * Generates drum patterns, chord progressions, basslines, and melodies using
 * server-side Gemini API with seamless instant algorithmic music theory fallback.
 */
import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Check,
  Disc,
  Music,
  Lightbulb,
  Loader2,
  Volume2,
} from 'lucide-react';
import { Note, ScaleKey } from '../types/project';
import { AlgorithmicMusicGen } from '../ai/AlgorithmicMusicGen';
import { AudioEngine } from '../audio/AudioEngine';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  bpm: number;
  onApplyDrumPattern: (pattern: Record<string, number[]>) => void;
  onApplyNotes: (channelId: string, notes: Note[]) => void;
  onApplyNewPattern: (name: string, drums: Record<string, number[]>, notes: Record<string, Note[]>) => void;
  activeChannelId: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  bpm,
  onApplyDrumPattern,
  onApplyNotes,
  onApplyNewPattern,
  activeChannelId,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('synthwave');
  const [selectedKey, setSelectedKey] = useState<ScaleKey>('C');
  const [selectedType, setSelectedType] = useState<'all' | 'drums' | 'chords' | 'melody'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);
  const [applied, setApplied] = useState(false);
  const audioEngine = AudioEngine.getInstance();

  if (!isOpen) return null;

  const handleGenerate = async (presetPrompt?: string) => {
    setIsLoading(true);
    setApplied(false);
    const query = presetPrompt || prompt;

    try {
      const res = await AlgorithmicMusicGen.requestAIAssistant({
        prompt: query,
        genre: selectedGenre,
        key: `${selectedKey} minor`,
        bpm,
        type: selectedType,
      });
      setGeneratedResult(res);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuditionResult = () => {
    if (!generatedResult) return;
    // Audition notes
    if (generatedResult.chords) {
      for (const n of generatedResult.chords) {
        audioEngine.auditionNote('pad', n.midi, 0.6, 6, 0.75);
      }
    } else if (generatedResult.melody) {
      for (const n of generatedResult.melody) {
        audioEngine.auditionNote('lead', n.midi, 0.4, 5, 0.8);
      }
    }
    // Audition kick & snare preview
    if (generatedResult.drumPattern) {
      audioEngine.auditionDrum('kick', 1, 0.9);
      setTimeout(() => audioEngine.auditionDrum('snare', 2, 0.85), 200);
    }
  };

  const handleApplyToActive = () => {
    if (!generatedResult) return;

    if (generatedResult.drumPattern) {
      onApplyDrumPattern(generatedResult.drumPattern);
    }
    if (generatedResult.chords) {
      onApplyNotes('ch_pad', generatedResult.chords);
    }
    if (generatedResult.melody) {
      onApplyNotes('ch_lead', generatedResult.melody);
    }
    setApplied(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleCreateNewPatternWithResult = () => {
    if (!generatedResult) return;
    const notesMap: Record<string, Note[]> = {};
    if (generatedResult.chords) notesMap['ch_pad'] = generatedResult.chords;
    if (generatedResult.melody) notesMap['ch_lead'] = generatedResult.melody;

    onApplyNewPattern(
      generatedResult.title || `${selectedGenre.toUpperCase()} AI Groove`,
      generatedResult.drumPattern || {},
      notesMap
    );
    setApplied(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#181922] border border-[#2d3042] rounded-xl shadow-2xl p-6 select-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#292c3c]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-tr from-purple-600 to-cyan-500 rounded-lg text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Music Assistant & Generator</h3>
              <p className="text-[11px] text-zinc-400">
                Compose drum grooves, chord progressions, and melodies in real time
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

        {/* Quick Style Chips */}
        <div className="my-4">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Quick Creation Prompts
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setSelectedGenre('synthwave');
                handleGenerate('Create a dark 80s synthwave groove with rolling bass and warm pads');
              }}
              className="px-2.5 py-1 bg-[#222434] hover:bg-[#2d3046] text-cyan-400 text-xs rounded-full border border-cyan-500/30 transition-colors"
            >
              ⚡ 80s Synthwave Groove
            </button>
            <button
              onClick={() => {
                setSelectedGenre('trap');
                handleGenerate('Generate a heavy trap drum beat with rolling hi-hats and deep 808s');
              }}
              className="px-2.5 py-1 bg-[#222434] hover:bg-[#2d3046] text-orange-400 text-xs rounded-full border border-orange-500/30 transition-colors"
            >
              🔥 Heavy Trap Beat
            </button>
            <button
              onClick={() => {
                setSelectedGenre('house');
                handleGenerate('Build a driving 126 BPM 4-on-the-floor house groove');
              }}
              className="px-2.5 py-1 bg-[#222434] hover:bg-[#2d3046] text-emerald-400 text-xs rounded-full border border-emerald-500/30 transition-colors"
            >
              🎵 4-on-the-Floor House
            </button>
            <button
              onClick={() => {
                setSelectedGenre('lofi');
                handleGenerate('Compose a chill Lo-Fi minor 9th chord progression with vinyl bounce');
              }}
              className="px-2.5 py-1 bg-[#222434] hover:bg-[#2d3046] text-purple-400 text-xs rounded-full border border-purple-500/30 transition-colors"
            >
              ☕ Lo-Fi Chill Chords
            </button>
          </div>
        </div>

        {/* Parameters: Key & Genre */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full bg-[#121319] border border-[#2b2d3e] rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none"
            >
              <option value="synthwave">Synthwave / Retro</option>
              <option value="trap">Trap / Hip-Hop</option>
              <option value="house">House / EDM</option>
              <option value="lofi">Lo-Fi / Boom Bap</option>
              <option value="ambient">Cyber Ambient</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Root Key</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value as ScaleKey)}
              className="w-full bg-[#121319] border border-[#2b2d3e] rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none"
            >
              {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((k) => (
                <option key={k} value={k}>
                  {k} Minor
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Target Element</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full bg-[#121319] border border-[#2b2d3e] rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none"
            >
              <option value="all">Full Groove (Drums + Harmony)</option>
              <option value="drums">Drums Only</option>
              <option value="chords">Chord Progression</option>
              <option value="melody">Lead Melody</option>
            </select>
          </div>
        </div>

        {/* Custom Prompt Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., Generate a punchy melodic groove with 808 sub and ambient synths..."
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            className="flex-1 bg-[#121319] border border-[#2b2d3e] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all shadow-md cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isLoading ? 'Generating...' : 'Generate'}</span>
          </button>
        </div>

        {/* Generated Result Preview Card */}
        {generatedResult && (
          <div className="p-4 bg-[#12131b] border border-[#282a3b] rounded-lg mb-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-cyan-400" />
                  {generatedResult.title}
                </h4>
                <p className="text-[11px] text-zinc-400">{generatedResult.description}</p>
              </div>

              <button
                onClick={handleAuditionResult}
                title="Preview sound"
                className="flex items-center gap-1 px-3 py-1 bg-[#252838] hover:bg-[#32364c] text-zinc-200 hover:text-white rounded text-xs transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audition</span>
              </button>
            </div>

            {generatedResult.theoryTip && (
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/25 rounded text-[11px] text-amber-300">
                <Lightbulb className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>{generatedResult.theoryTip}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#292c3c]">
          <span className="text-[10px] text-zinc-500">
            Powered by Google AI Studio Gemini API & Algorithmic Music Engine
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white rounded"
            >
              Close
            </button>

            {generatedResult && (
              <>
                <button
                  onClick={handleApplyToActive}
                  disabled={applied}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-[#252839] hover:bg-[#31354b] text-zinc-200 rounded text-xs font-semibold"
                >
                  {applied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                  <span>Apply to Active</span>
                </button>

                <button
                  onClick={handleCreateNewPatternWithResult}
                  disabled={applied}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 text-black font-bold text-xs rounded-lg shadow-md cursor-pointer"
                >
                  {applied ? <Check className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>Create Pattern</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
