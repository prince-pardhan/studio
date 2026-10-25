/**
 * BeatFlow Studio - Top Bar Toolbar
 * Professional 3-Zone DAW Header with comprehensive File Menu dropdown,
 * project creation wizard, project library dashboard trigger, live auto-save
 * indicator, and workspace view switcher.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  FolderOpen,
  FolderPlus,
  Save,
  RotateCcw,
  RotateCw,
  Plus,
  FileCode,
  Sparkles,
  Circle,
  Search,
  Maximize2,
  Minimize2,
  Layers,
  Settings,
  ChevronDown,
  Copy,
  Edit3,
  Upload,
  Music,
  Sliders,
  Keyboard,
  Check,
  AlertCircle,
  Clock,
  Mic,
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
  onOpenNewProject: () => void;
  onOpenProjectDashboard: () => void;
  onOpenEditProject: () => void;
  onSaveProject: () => void;
  onDuplicateProject: () => void;
  saveStatus?: 'saved' | 'saving' | 'error';
  hasUnsavedChanges?: boolean;
  theme: ThemeMode;
  onSetTheme: (t: ThemeMode) => void;
  onImportProject: (file: File) => void;
  onOpenVoiceStudio?: () => void;
  onOpenAutoMix?: () => void;
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
  onOpenNewProject,
  onOpenProjectDashboard,
  onOpenEditProject,
  onSaveProject,
  onDuplicateProject,
  saveStatus = 'saved',
  hasUnsavedChanges = false,
  theme,
  onSetTheme,
  onImportProject,
  onOpenVoiceStudio,
  onOpenAutoMix,
}) => {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileMenuRef = useRef<HTMLDivElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Close File menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setIsFileMenuOpen(false);
      }
    };
    if (isFileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFileMenuOpen]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      project.name = titleInput.trim();
      ProjectStorage.saveProject(project);
    }
  };

  const handleBackupExport = () => {
    ProjectStorage.exportProjectPackage(project);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProject(file);
    }
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
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
    <header className="flex items-center justify-between gap-4 px-4 py-2 bg-[#121318] border-b border-[#222432] select-none shrink-0 h-13 z-30">
      {/* Zone 1: Wordmark, File Menu, Project Title, and Quick Search */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-black text-xs shadow-inner">
            BF
          </div>
          <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap hidden sm:inline">
            BeatFlow Studio
          </span>
        </div>

        {/* File Dropdown Menu */}
        <div className="relative" ref={fileMenuRef}>
          <button
            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              isFileMenuOpen
                ? 'bg-[#252837] text-orange-400'
                : 'bg-[#1a1b24] hover:bg-[#232533] text-zinc-300 hover:text-white border border-[#2b2d3d]'
            }`}
          >
            <span>File</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {isFileMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-[#181923] border border-[#2c2f42] rounded-xl shadow-2xl py-1.5 z-50 text-xs">
              {/* Project Lifecycle */}
              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenNewProject();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-3.5 h-3.5 text-orange-400" />
                  <span>New Project...</span>
                </div>
                <kbd className="text-[10px] font-mono text-zinc-500">Ctrl+N</kbd>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenProjectDashboard();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Open Project Library...</span>
                </div>
                <kbd className="text-[10px] font-mono text-zinc-500">Ctrl+O</kbd>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onSaveProject();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Project</span>
                </div>
                <kbd className="text-[10px] font-mono text-zinc-500">Ctrl+S</kbd>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onDuplicateProject();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-purple-400" />
                  <span>Save As / Duplicate...</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenEditProject();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Project Settings & Metadata...</span>
                </div>
              </button>

              <div className="my-1.5 border-t border-[#262838]" />

              {/* Import / Export */}
              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  importFileInputRef.current?.click();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Import .beatflow Project...</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  handleBackupExport();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-pink-400" />
                  <span>Export .beatflow Package...</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenExport();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-orange-400" />
                  <span>Render Audio (WAV / Stems)...</span>
                </div>
                <kbd className="text-[10px] font-mono text-zinc-500">Ctrl+E</kbd>
              </button>

              <div className="my-1.5 border-t border-[#262838]" />

              {/* Undo / Redo & Settings */}
              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  undo();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Undo</span>
                </div>
                <kbd className="text-[10px] font-mono text-zinc-500">Ctrl+Z</kbd>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  redo();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Redo</span>
                </div>
                <kbd className="text-[10px] font-mono text-zinc-500">Ctrl+Shift+Z</kbd>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenAudioSettings();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Audio Engine Settings...</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenShortcuts();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#252838] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Keyboard Shortcuts...</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Hidden project file input */}
        <input
          type="file"
          ref={importFileInputRef}
          onChange={handleFileChange}
          accept=".beatflow,.json"
          className="hidden"
        />

        {/* Project Name (Editable on click) */}
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="px-2 py-0.5 text-xs font-semibold text-orange-400 bg-[#1c1d25] border border-orange-500/60 rounded outline-none w-36"
            />
          ) : (
            <button
              onClick={() => {
                setTitleInput(project.name);
                setIsEditingTitle(true);
              }}
              title="Click to rename project"
              className="text-xs font-semibold text-zinc-200 hover:text-orange-400 transition-colors whitespace-nowrap px-1.5 py-0.5 rounded hover:bg-[#1a1b24] max-w-[140px] truncate"
            >
              {project.name}
            </button>
          )}

          {/* Auto-Save Status Indicator */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-[#171822] px-2 py-0.5 rounded-full border border-[#252737]">
            {saveStatus === 'saving' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-400">Saving...</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-red-400">Save Error</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-zinc-400">Saved</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Find (Command Palette) */}
        <button
          onClick={onOpenCommandPalette}
          title="Search actions (Ctrl/⌘ + K)"
          className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-[#171822] hover:bg-[#202230] text-zinc-400 hover:text-white rounded text-[11px] border border-[#262838]"
        >
          <Search className="w-3 h-3 text-orange-400" />
          <span>Quick Find</span>
          <kbd className="text-[9px] font-mono text-zinc-500 bg-[#0e0f14] px-1 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Zone 2: Navigation views with active segmented styling */}
      <nav className="flex items-center gap-0.5 p-0.5 bg-[#0d0e13] rounded-lg border border-[#222432] overflow-x-auto">
        {[
          { tab: 'playlist', label: 'Playlist' },
          { tab: 'channelrack', label: 'Channel Rack' },
          { tab: 'pianoroll', label: 'Piano Roll' },
          { tab: 'mixer', label: 'Mixer' },
          { tab: 'performance', label: 'Pads' },
          { tab: 'dj', label: 'DJ Decks' },
          { tab: 'mastering', label: 'Mastering' },
        ].map(({ tab, label }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as ActiveTab)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#252837] text-orange-400 shadow-xs border border-orange-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Voice Studio, Auto Mix, AI Assistant, Theory, Templates, Save, Fullscreen & Export */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenVoiceStudio && (
          <button
            onClick={onOpenVoiceStudio}
            title="Voice & Audio Studio (Record / Upload)"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Voice Studio</span>
          </button>
        )}

        {onOpenAutoMix && (
          <button
            onClick={onOpenAutoMix}
            title="Auto Mix DSP Vocal Analyzer"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Auto Mix</span>
          </button>
        )}

        <button
          onClick={onOpenAI}
          title="AI Music Assistant"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 rounded-lg shadow-xs transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI Assist</span>
        </button>

        <button
          onClick={onOpenCircleOfFifths}
          title="Circle of Fifths Theory Wheel"
          className="p-1.5 text-zinc-400 hover:text-orange-400 hover:bg-[#1a1b24] rounded transition-colors"
        >
          <Circle className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenTemplates}
          title="Genre Starter Templates"
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1a1b24] rounded transition-colors"
        >
          <Layers className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-zinc-800" aria-hidden="true" />

        <button
          onClick={undo}
          title="Undo (Ctrl+Z)"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1b24] rounded"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1b24] rounded"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <button
          onClick={onSaveProject}
          title="Save Project (Ctrl+S)"
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-300 hover:text-white bg-[#171822] hover:bg-[#202230] border border-[#272938] rounded cursor-pointer"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Save</span>
        </button>

        <button
          onClick={toggleFullscreen}
          title="Full Screen Studio Mode"
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1a1b24] rounded"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Primary CTA button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 rounded-lg shadow-sm transition-all whitespace-nowrap ml-1 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
