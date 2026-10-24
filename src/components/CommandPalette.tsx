/**
 * BeatFlow Studio - Searchable Command Palette (Ctrl/Cmd + K)
 * Instant search and quick trigger for all DAW functions, views, tools, and actions.
 */
import React, { useState, useEffect } from 'react';
import {
  Search,
  Play,
  Layers,
  Music,
  Sliders,
  Sparkles,
  Circle,
  Download,
  Settings,
  Grid,
  Disc,
} from 'lucide-react';
import { ActiveTab, ThemeMode } from '../types/project';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onSetActiveTab: (tab: ActiveTab) => void;
  onOpenExport: () => void;
  onOpenAI: () => void;
  onOpenCircleOfFifths: () => void;
  onOpenAudioSettings: () => void;
  onOpenShortcuts: () => void;
  onSetTheme: (t: ThemeMode) => void;
  onToggleMetronome: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onTogglePlay,
  onSetActiveTab,
  onOpenExport,
  onOpenAI,
  onOpenCircleOfFifths,
  onOpenAudioSettings,
  onOpenShortcuts,
  onSetTheme,
  onToggleMetronome,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    { id: 'c_play', title: 'Play / Pause Transport', category: 'Playback', icon: <Play className="w-3.5 h-3.5 text-amber-400" />, action: onTogglePlay, shortcut: 'Space' },
    { id: 'c_metro', title: 'Toggle Metronome Click', category: 'Playback', icon: <Play className="w-3.5 h-3.5 text-orange-400" />, action: onToggleMetronome },
    { id: 'c_arr', title: 'Switch to Arrangement Playlist', category: 'Navigation', icon: <Layers className="w-3.5 h-3.5 text-cyan-400" />, action: () => onSetActiveTab('playlist'), shortcut: '1' },
    { id: 'c_rack', title: 'Switch to Channel Rack & Step Sequencer', category: 'Navigation', icon: <Layers className="w-3.5 h-3.5 text-orange-400" />, action: () => onSetActiveTab('channelrack'), shortcut: '2' },
    { id: 'c_piano', title: 'Switch to Piano Roll Editor', category: 'Navigation', icon: <Music className="w-3.5 h-3.5 text-emerald-400" />, action: () => onSetActiveTab('pianoroll'), shortcut: '3' },
    { id: 'c_mix', title: 'Switch to Mixer & Effects Console', category: 'Navigation', icon: <Sliders className="w-3.5 h-3.5 text-purple-400" />, action: () => onSetActiveTab('mixer'), shortcut: '4' },
    { id: 'c_pads', title: 'Open Live Performance Pads (16-Pad)', category: 'Performance', icon: <Grid className="w-3.5 h-3.5 text-pink-400" />, action: () => onSetActiveTab('performance') },
    { id: 'c_dj', title: 'Open 2-Deck DJ Player & Crossfader', category: 'Performance', icon: <Disc className="w-3.5 h-3.5 text-yellow-400" />, action: () => onSetActiveTab('dj') },
    { id: 'c_ai', title: 'Open AI Music Assistant', category: 'AI & Tools', icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />, action: onOpenAI },
    { id: 'c_circle', title: 'Open Circle of Fifths Theory Wheel', category: 'AI & Tools', icon: <Circle className="w-3.5 h-3.5 text-orange-400" />, action: onOpenCircleOfFifths },
    { id: 'c_export', title: 'Export Audio to WAV / MIDI', category: 'Project', icon: <Download className="w-3.5 h-3.5 text-emerald-400" />, action: onOpenExport },
    { id: 'c_settings', title: 'Audio Engine & Buffer Settings', category: 'Project', icon: <Settings className="w-3.5 h-3.5 text-zinc-400" />, action: onOpenAudioSettings },
    { id: 'c_theme_dark', title: 'Theme: Studio Dark', category: 'Appearance', icon: <Settings className="w-3.5 h-3.5 text-zinc-400" />, action: () => onSetTheme('dark') },
    { id: 'c_theme_cyber', title: 'Theme: Cyberpunk Neon', category: 'Appearance', icon: <Settings className="w-3.5 h-3.5 text-cyan-400" />, action: () => onSetTheme('cyber') },
    { id: 'c_shortcuts', title: 'Keyboard Shortcuts Reference', category: 'Help', icon: <Search className="w-3.5 h-3.5 text-zinc-400" />, action: onOpenShortcuts, shortcut: '?' },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="w-full max-w-lg bg-[#181922] border border-[#2d3042] rounded-xl shadow-2xl overflow-hidden select-none flex flex-col">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#292c3c] bg-[#1a1b26]">
          <Search className="w-4 h-4 text-orange-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search action (e.g., Export, AI, Mixer)..."
            autoFocus
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 outline-none"
          />
          <kbd className="text-[10px] font-mono text-zinc-500 bg-[#121319] px-2 py-0.5 rounded border border-[#252837]">
            ESC
          </kbd>
        </div>

        {/* Command Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                  selectedIndex === idx
                    ? 'bg-orange-500/15 border border-orange-500/40 text-white'
                    : 'text-zinc-300 hover:bg-[#20222f]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {item.icon}
                  <span className="font-medium truncate">{item.title}</span>
                  <span className="text-[10px] text-zinc-500 uppercase">{item.category}</span>
                </div>

                {item.shortcut && (
                  <kbd className="px-1.5 py-0.5 bg-[#121319] border border-[#262837] rounded font-mono text-[10px] text-zinc-400">
                    {item.shortcut}
                  </kbd>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
