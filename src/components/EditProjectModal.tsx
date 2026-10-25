/**
 * BeatFlow Studio - Edit Project Metadata Dialog
 * Modify project name, description, tags, cover color, BPM, and time signature
 * non-destructively without altering clips, tracks, or plugins.
 */
import React, { useState, useEffect } from 'react';
import { Settings2, Tag, Palette, Music, Sliders } from 'lucide-react';
import { Project, ProjectType, Genre } from '../types/project';

interface EditProjectModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Project>) => void;
}

const COLOR_PRESETS = [
  '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#71717a'
];

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  project,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('beat');
  const [genre, setGenre] = useState<string>('');
  const [bpm, setBpm] = useState<number>(120);
  const [timeSig, setTimeSig] = useState<[number, number]>([4, 4]);
  const [coverColor, setCoverColor] = useState<string>('#f97316');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setProjectType(project.projectType || 'beat');
      setGenre(project.genre || '');
      setBpm(project.bpm || 120);
      setTimeSig(project.timeSignature || [4, 4]);
      setCoverColor(project.coverColor || '#f97316');
      setTagInput((project.tags || []).join(', '));
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || project.name;
    const tags = tagInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onSave(project.id, {
      name: finalName,
      description: description.trim(),
      projectType,
      genre: genre.trim() || undefined,
      bpm,
      timeSignature: timeSig,
      coverColor,
      tags,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#16171f] border border-[#2c2f40] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242735] bg-[#121319]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Edit Project Settings</h2>
              <p className="text-[11px] text-zinc-400">
                Update project title, notes, genre, and artwork without altering existing tracks
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-300">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0e0f14] border border-[#2b2d3d] focus:border-orange-500/70 rounded-lg text-xs text-white outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-300">Description / Track Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add production notes, key references, collaborator credits..."
              className="w-full px-3 py-2 bg-[#0e0f14] border border-[#2b2d3d] focus:border-orange-500/70 rounded-lg text-xs text-white outline-none resize-none"
            />
          </div>

          {/* Color & Genre Row */}
          <div className="grid grid-cols-2 gap-3">
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
                    className={`w-5 h-5 rounded-full transition-all shrink-0 ${
                      coverColor === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-300">Genre / Style</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. Trap, Lo-Fi, EDM"
                className="w-full px-3 py-1.5 bg-[#0e0f14] border border-[#2b2d3d] focus:border-orange-500/70 rounded-lg text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* BPM & Time Sig */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
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

            <div className="space-y-1">
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
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-zinc-400" />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. vocal, album, rough_mix"
              className="w-full px-3 py-1.5 bg-[#0e0f14] border border-[#2b2d3d] focus:border-orange-500/70 rounded-lg text-xs text-white outline-none"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#242735]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#20222e] hover:bg-[#2b2e3e] text-zinc-300 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
