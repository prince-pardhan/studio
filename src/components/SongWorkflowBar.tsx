/**
 * BeatFlow Studio - Phase 14: Voice-to-Full-Song Workflow Bar
 * 8-Step Interactive Guided Production Checklist:
 * 1. Record / Upload Voice
 * 2. Choose Music Style & Beats
 * 3. Edit & Tune Vocals
 * 4. Arrange Multitrack Song
 * 5. Auto Mix & Polish
 * 6. 5-Stage Mastering Suite
 * 7. Preview Full Song
 * 8. Download Mastered WAV
 */
import React, { useState } from 'react';
import {
  Mic,
  Music,
  Scissors,
  Layers,
  Sliders,
  Sparkles,
  Play,
  Download,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Project, ActiveTab } from '../types/project';

interface SongWorkflowBarProps {
  project: Project;
  onOpenVoiceStudio: () => void;
  onOpenTemplates: () => void;
  onOpenVocalEditor: () => void;
  onOpenAutoMix: () => void;
  onOpenExport: () => void;
  onSetActiveTab: (tab: ActiveTab) => void;
  onPreviewSong: () => void;
  hasAudioClip: boolean;
}

export const SongWorkflowBar: React.FC<SongWorkflowBarProps> = ({
  project,
  onOpenVoiceStudio,
  onOpenTemplates,
  onOpenVocalEditor,
  onOpenAutoMix,
  onOpenExport,
  onSetActiveTab,
  onPreviewSong,
  hasAudioClip,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Compute status of each step dynamically from the active project
  const steps = [
    {
      id: 1,
      title: 'Voice Studio',
      subtitle: hasAudioClip ? 'Voice Loaded' : 'Record / Upload',
      icon: Mic,
      completed: hasAudioClip,
      action: onOpenVoiceStudio,
      accent: 'from-pink-500 to-rose-500',
    },
    {
      id: 2,
      title: 'Music Style',
      subtitle: project.genre ? `${project.genre.toUpperCase()}` : 'Pick Template',
      icon: Music,
      completed: Boolean(project.genre && project.genre !== 'blank'),
      action: onOpenTemplates,
      accent: 'from-amber-500 to-orange-500',
    },
    {
      id: 3,
      title: 'Edit Vocals',
      subtitle: 'Trim & Tune',
      icon: Scissors,
      completed: hasAudioClip,
      action: onOpenVocalEditor,
      accent: 'from-fuchsia-500 to-pink-500',
    },
    {
      id: 4,
      title: 'Arrangement',
      subtitle: `${project.clips.length} Clips`,
      icon: Layers,
      completed: project.clips.length > 2,
      action: () => onSetActiveTab('playlist'),
      accent: 'from-blue-500 to-indigo-500',
    },
    {
      id: 5,
      title: 'Auto Mix',
      subtitle: 'Balance & FX',
      icon: Sliders,
      completed: Boolean(project.mixerChannels[8]?.effects.length > 0),
      action: onOpenAutoMix,
      accent: 'from-purple-500 to-violet-500',
    },
    {
      id: 6,
      title: 'Mastering',
      subtitle: `${project.masteringSession?.targetLufs ?? -14} LUFS`,
      icon: Sparkles,
      completed: Boolean(project.masteringSession),
      action: () => onSetActiveTab('mastering'),
      accent: 'from-cyan-500 to-teal-500',
    },
    {
      id: 7,
      title: 'Preview Song',
      subtitle: 'Full Audition',
      icon: Play,
      completed: false,
      action: onPreviewSong,
      accent: 'from-emerald-500 to-green-500',
    },
    {
      id: 8,
      title: 'Download WAV',
      subtitle: 'Master & Stems',
      icon: Download,
      completed: false,
      action: onOpenExport,
      accent: 'from-orange-500 to-amber-500',
    },
  ];

  return (
    <div className="bg-[#10121a] border-b border-[#212433] select-none shrink-0 transition-all">
      {/* Mini Toggle Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#131622] text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            AI Voice-to-Full-Song Workflow
          </span>
          <span className="text-[10px] text-zinc-500 hidden sm:inline">
            Follow the 8 guided steps to produce, mix, master and export your song
          </span>
        </div>

        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-[#1f2334]"
        >
          <span>{isCollapsed ? 'Show Steps' : 'Collapse'}</span>
          {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
      </div>

      {/* 8-Step Interactive Grid */}
      {!isCollapsed && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 p-2 bg-[#0c0e15] overflow-x-auto">
          {steps.map((step, idx) => {
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                onClick={step.action}
                className="group relative flex flex-col items-start p-2 rounded-xl bg-[#151722] hover:bg-[#1d2030] border border-[#232738] hover:border-[#3d435d] transition-all text-left cursor-pointer shadow-xs"
              >
                {/* Step indicator top row */}
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[10px] font-mono font-bold text-zinc-500 group-hover:text-zinc-300">
                    Step {step.id}
                  </span>
                  {step.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-zinc-700 group-hover:bg-pink-500 transition-colors" />
                  )}
                </div>

                {/* Step Title & Icon */}
                <div className="flex items-center gap-1.5 w-full">
                  <div className={`p-1 rounded-md bg-gradient-to-tr ${step.accent} text-white shadow-xs shrink-0`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                    {step.title}
                  </span>
                </div>

                {/* Subtitle */}
                <span className="text-[10px] text-zinc-400 mt-0.5 truncate w-full">
                  {step.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
