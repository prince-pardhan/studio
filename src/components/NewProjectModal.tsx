/**
 * BeatFlow Studio - New Project Creation Dialog
 * Supports Project Type selection, starter genre templates, BPM, time signature,
 * sample rate, audio output, tags, and cover color.
 */
import React, { useState } from 'react';
import {
  FolderPlus,
  Sliders,
  Sparkles,
  Music,
  Radio,
  Mic,
  Disc,
  SlidersHorizontal,
  FileQuestion,
  Tag,
  Palette,
} from 'lucide-react';
import { NewProjectOptions, ProjectType, Genre } from '../types/project';
import { ProjectStorage } from '../storage/ProjectStorage';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (options: NewProjectOptions) => void;
}

const PROJECT_TYPES: { type: ProjectType; label: string; desc: string; icon: React.ReactNode }[] = [
  { type: 'beat', label: 'Beat / Production', desc: 'Channel rack & 16-step sequencer focused layout', icon: <Music className="w-4 h-4 text-orange-400" /> },
  { type: 'song', label: 'Full Song Arrangement', desc: 'Multitrack timeline with vocal and instrument tracks', icon: <Sliders className="w-4 h-4 text-purple-400" /> },
  { type: 'mastering', label: 'Mastering Project', desc: '5-stage mastering chain & loudness metering', icon: <SlidersHorizontal className="w-4 h-4 text-pink-400" /> },
  { type: 'podcast', label: 'Podcast & Voiceover', desc: 'Multi-host mic tracks with noise gate and speech EQ', icon: <Mic className="w-4 h-4 text-emerald-400" /> },
  { type: 'remix', label: 'Remix / Edit', desc: 'Acapella and stem alignment workspace', icon: <Radio className="w-4 h-4 text-cyan-400" /> },
  { type: 'live', label: 'Live Performance', desc: 'Pad launch & DJ decks performance routing', icon: <Disc className="w-4 h-4 text-amber-400" /> },
  { type: 'empty', label: 'Blank Project', desc: 'Clean slate with zero clips or patterns', icon: <FileQuestion className="w-4 h-4 text-zinc-400" /> },
];

const GENRE_TEMPLATES: { id: Genre | 'blank'; name: string; bpm: number }[] = [
  { id: 'blank', name: 'None (Default)', bpm: 120 },
  { id: 'hiphop', name: 'Hip-Hop / Boom Bap', bpm: 90 },
  { id: 'trap', name: 'Trap / 808', bpm: 140 },
  { id: 'drill', name: 'UK / NY Drill', bpm: 142 },
  { id: 'lofi', name: 'Lo-Fi Chillhop', bpm: 85 },
  { id: 'house', name: 'Deep / Tech House', bpm: 124 },
  { id: 'edm', name: 'EDM / Festival', bpm: 128 },
  { id: 'techno', name: 'Industrial Techno', bpm: 132 },
  { id: 'dnb', name: 'Drum and Bass', bpm: 174 },
  { id: 'pop', name: 'Modern Pop', bpm: 118 },
  { id: 'rock', name: 'Indie / Alt Rock', bpm: 120 },
  { id: 'ambient', name: 'Ambient Soundscape', bpm: 70 },
  { id: 'cinematic', name: 'Cinematic Score', bpm: 80 },
  { id: 'bollywood', name: 'Bollywood Groove', bpm: 98 },
  { id: 'punjabi', name: 'Punjabi Dhol Beats', bpm: 96 },
  { id: 'classical_indian', name: 'Indian Classical Raag', bpm: 80 },
];

const COLOR_PRESETS = [
  '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#71717a'
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('beat');
  const [genre, setGenre] = useState<Genre | 'blank'>('trap');
  const [bpm, setBpm] = useState<number>(140);
  const [timeSig, setTimeSig] = useState<[number, number]>([4, 4]);
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [coverColor, setCoverColor] = useState<string>('#f97316');
  const [tagInput, setTagInput] = useState('');

  if (!isOpen) return null;

  const handleGenreSelect = (selectedGenre: Genre | 'blank') => {
    setGenre(selectedGenre);
    if (selectedGenre !== 'blank') {
      const suggestedBpm = ProjectStorage.getGenreDefaultBpm(selectedGenre);
      setBpm(suggestedBpm);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || `Untitled ${projectType.charAt(0).toUpperCase() + projectType.slice(1)}`;
    const tags = tagInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onCreateProject({
      name: finalName,
      description: description.trim(),
      projectType,
      genre,
      bpm,
      timeSignature: timeSig,
      sampleRate,
      coverColor,
      tags: tags.length > 0 ? tags : [projectType],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[92vh] bg-[#16171f] border border-[#2c2f40] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242735] bg-[#121319]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Create New Project</h2>
              <p className="text-[11px] text-zinc-400">
                Configure your DAW session structure, starter template, and audio engine settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs px-2.5 py-1.5 rounded hover:bg-[#20222e]"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Project Name & Description */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-zinc-300">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Midnight Cyber Anthem"
                autoFocus
                className="w-full px-3 py-2 bg-[#0e0f14] border border-[#2b2d3d] focus:border-orange-500/70 rounded-lg text-xs text-white placeholder-zinc-500 outline-none transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                <Palette className="w-3 h-3 text-orange-400" />
                <span>Cover Color</span>
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCoverColor(c)}
                    className={`w-6 h-6 rounded-full transition-all shrink-0 ${
                      coverColor === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-300">Project Description & Notes</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 140 BPM Trap beat with dark piano melody and sliding 808s"
              className="w-full px-3 py-1.5 bg-[#0e0f14] border border-[#2b2d3d] focus:border-orange-500/70 rounded-lg text-xs text-white placeholder-zinc-500 outline-none"
            />
          </div>

          {/* Project Type Grid */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-zinc-300">Project Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {PROJECT_TYPES.map((pt) => {
                const isSelected = projectType === pt.type;
                return (
                  <button
                    key={pt.type}
                    type="button"
                    onClick={() => {
                      setProjectType(pt.type);
                      setCoverColor(ProjectStorage.getProjectTypeColor(pt.type));
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#212330] border-orange-500/60 shadow-md ring-1 ring-orange-500/40'
                        : 'bg-[#111218] border-[#252737] hover:bg-[#1a1b24]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {pt.icon}
                      <span className="text-xs font-bold text-white">{pt.label}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-2">{pt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Starting Genre Template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Starting Genre Rhythm & Sound Preset</span>
              </label>
              <span className="text-[10px] text-zinc-400">Applies signature groove & tempo</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#0d0e13] rounded-lg border border-[#222432]">
              {GENRE_TEMPLATES.map((gt) => {
                const isSelected = genre === gt.id;
                return (
                  <button
                    key={gt.id}
                    type="button"
                    onClick={() => handleGenreSelect(gt.id)}
                    className={`px-2.5 py-1.5 rounded text-left text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold'
                        : 'text-zinc-300 hover:bg-[#1a1b25] border border-transparent'
                    }`}
                  >
                    <span className="truncate">{gt.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono ml-1">{gt.bpm}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Parameters: BPM, Time Signature, Sample Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* BPM */}
            <div className="bg-[#111218] border border-[#242735] p-3 rounded-lg space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-zinc-300">Tempo (BPM)</span>
                <span className="text-xs font-mono font-bold text-orange-400">{bpm}</span>
              </div>
              <input
                type="range"
                min="50"
                max="220"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            {/* Time Signature */}
            <div className="bg-[#111218] border border-[#242735] p-3 rounded-lg space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-300 block">Time Signature</span>
              <div className="grid grid-cols-4 gap-1">
                {([ [4, 4], [3, 4], [6, 8], [7, 8] ] as [number, number][]).map(([num, den]) => {
                  const isCur = timeSig[0] === num && timeSig[1] === den;
                  return (
                    <button
                      key={`${num}/${den}`}
                      type="button"
                      onClick={() => setTimeSig([num, den])}
                      className={`py-1 text-xs font-mono font-bold rounded transition-colors ${
                        isCur ? 'bg-orange-500 text-black' : 'bg-[#1a1c26] text-zinc-300 hover:bg-[#252837]'
                      }`}
                    >
                      {num}/{den}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sample Rate */}
            <div className="bg-[#111218] border border-[#242735] p-3 rounded-lg space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-300 block">Audio Engine Rate</span>
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(Number(e.target.value))}
                className="w-full px-2 py-1 bg-[#1a1c26] border border-[#2e3144] rounded text-xs text-white outline-none"
              >
                <option value={44100}>44.1 kHz (CD Quality)</option>
                <option value={48000}>48.0 kHz (Studio Standard)</option>
                <option value={96000}>96.0 kHz (Hi-Res Master)</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-zinc-400" />
              <span>Project Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. dark, 808, demo, synth, album-track"
              className="w-full px-3 py-1.5 bg-[#0e0f14] border border-[#2b2d3d] focus:border-orange-500/70 rounded-lg text-xs text-white placeholder-zinc-500 outline-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#242735] bg-[#121319]">
          <span className="text-[11px] text-zinc-400">
            Session will be persisted automatically in IndexedDB.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#20222e] hover:bg-[#2b2e3e] text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-black text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
            >
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
