/**
 * BeatFlow Studio - Top Bar Toolbar
 * Adheres to 3-Zone Top Bar Contract with Command Palette, AI Assistant,
 * Theme switch, Fullscreen mode, and comprehensive DAW view navigation.
 */
import React, { useState } from 'react';
import {
  Download,
  FolderOpen,
  Save,
  RotateCcw,
  RotateCw,
  Plus,
  HelpCircle,
  FileCode,
  Sparkles,
  Circle,
  Search,
  Maximize2,
  Minimize2,
  Moon,
  Layers,
  Settings,
} from 'lucide-react';
import { ActiveTab, Project, ThemeMode } from '../types/project';
import { ProjectStorage } from '../storage/ProjectStorage';

interface ToolbarProps {
  project: Project;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  undo: () => void;
  redo: () => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  onOpenAI: () => void;
  onOpenCircleOfFifths: () => void;
  onOpenCommandPalette: () => void;
  onOpenTemplates: () => void;
  onOpenAudioSettings: () => void;
  onNewProject: () => void;
  onLoadProject: (p: Project) => void;
  onSaveNotification: () => void;
  theme: ThemeMode;
  onSetTheme: (t: ThemeMode) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  project,
  activeTab,
  setActiveTab,
  undo,
  redo,
  onOpenExport,
  onOpenShortcuts,
  onOpenAI,
  onOpenCircleOfFifths,
  onOpenCommandPalette,
  onOpenTemplates,
  onOpenAudioSettings,
  onNewProject,
  onLoadProject,
  onSaveNotification,
  theme,
  onSetTheme,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      project.name = titleInput.trim();
      ProjectStorage.saveProject(project);
    }
  };

  const handleManualSave = () => {
    ProjectStorage.saveProject(project);
    onSaveNotification();
  };

  const handleBackupExport = () => {
    ProjectStorage.exportProjectAsJSON(project);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await ProjectStorage.importProjectFromJSON(file);
      onLoadProject(loaded);
    } catch {
      alert('Unable to read project file. Please choose a valid .beatflow JSON backup.');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="flex items-center justify-between gap-6 px-4 py-2 bg-[#14151a] border-b border-[#252733] select-none shrink-0 h-13">
      {/* Zone 1: Single text element wordmark + editable project name */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-black text-xs shadow-inner">
            BF
          </div>
          <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
            BeatFlow Studio
          </span>
        </div>

        <span className="text-zinc-600 text-xs" aria-hidden="true">|</span>

        {isEditingTitle ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            autoFocus
            className="px-2 py-0.5 text-xs font-medium text-orange-400 bg-[#1c1d25] border border-orange-500/50 rounded outline-none w-36"
          />
        ) : (
          <button
            onClick={() => {
              setTitleInput(project.name);
              setIsEditingTitle(true);
            }}
            title="Click to rename project"
            className="text-xs font-medium text-zinc-300 hover:text-orange-400 transition-colors whitespace-nowrap px-1.5 py-0.5 rounded hover:bg-[#1f2029]"
          >
            {project.name}
          </button>
        )}

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          title="Search actions (Ctrl/⌘ + K)"
          className="flex items-center gap-1.5 px-2 py-1 bg-[#1c1d25] hover:bg-[#252834] text-zinc-400 hover:text-white rounded text-[11px] border border-[#2b2d3b]"
        >
          <Search className="w-3 h-3 text-orange-400" />
          <span>Quick Find</span>
          <kbd className="text-[9px] font-mono text-zinc-500 bg-[#121319] px-1 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Zone 2: Navigation views with active segmented styling */}
      <nav className="flex items-center gap-1 p-0.5 bg-[#0d0e12] rounded-lg border border-[#232530]">
        <button
          onClick={() => setActiveTab('playlist')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'playlist'
              ? 'bg-[#272936] text-orange-400 shadow-sm border border-orange-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Playlist
        </button>
        <button
          onClick={() => setActiveTab('channelrack')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'channelrack'
              ? 'bg-[#272936] text-orange-400 shadow-sm border border-orange-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Channel Rack
        </button>
        <button
          onClick={() => setActiveTab('pianoroll')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'pianoroll'
              ? 'bg-[#272936] text-orange-400 shadow-sm border border-orange-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Piano Roll
        </button>
        <button
          onClick={() => setActiveTab('mixer')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'mixer'
              ? 'bg-[#272936] text-orange-400 shadow-sm border border-orange-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Mixer
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'performance'
              ? 'bg-[#272936] text-pink-400 shadow-sm border border-pink-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Pads
        </button>
        <button
          onClick={() => setActiveTab('dj')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'dj'
              ? 'bg-[#272936] text-yellow-400 shadow-sm border border-yellow-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          DJ Decks
        </button>
      </nav>

      {/* Zone 3: AI Assistant, Theory, Theme, and Export Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenAI}
          title="AI Music Assistant"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 rounded-lg shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Assist</span>
        </button>

        <button
          onClick={onOpenCircleOfFifths}
          title="Circle of Fifths Theory Wheel"
          className="p-1.5 text-zinc-400 hover:text-orange-400 hover:bg-[#1f2029] rounded transition-colors"
        >
          <Circle className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenTemplates}
          title="Genre Starter Templates"
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1f2029] rounded transition-colors"
        >
          <Layers className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-zinc-800" aria-hidden="true" />

        <button
          onClick={undo}
          title="Undo (Ctrl+Z)"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2029] rounded"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2029] rounded"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <button
          onClick={handleManualSave}
          title="Save Project (Ctrl+S)"
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-300 hover:text-white bg-[#1c1d25] hover:bg-[#252733] border border-[#2b2d3b] rounded"
        >
          <Save className="w-3 h-3 text-emerald-400" />
          <span>Save</span>
        </button>

        <button
          onClick={handleBackupExport}
          title="Export project backup (.beatflow)"
          className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-[#1f2029] rounded"
        >
          <FileCode className="w-4 h-4" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Open project backup"
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1f2029] rounded"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileImport}
          accept=".beatflow,.json"
          className="hidden"
        />

        <button
          onClick={onOpenAudioSettings}
          title="Audio Engine Settings"
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1f2029] rounded"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={toggleFullscreen}
          title="Full Screen Studio Mode"
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1f2029] rounded"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Primary CTA button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-black bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 rounded-lg shadow-sm transition-all whitespace-nowrap ml-1 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
