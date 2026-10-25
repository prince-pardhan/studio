/**
 * BeatFlow Studio - Keyboard Shortcuts Reference Modal
 */
import React from 'react';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause transport' },
  { key: 'Enter', desc: 'Stop playback and rewind to start' },
  { key: 'Ctrl / ⌘ + N', desc: 'Create new project wizard' },
  { key: 'Ctrl / ⌘ + O', desc: 'Open project library & dashboard' },
  { key: 'Ctrl / ⌘ + S', desc: 'Save project to IndexedDB' },
  { key: 'Ctrl / ⌘ + E', desc: 'Export rendered audio (WAV / Stems)' },
  { key: 'Ctrl / ⌘ + K', desc: 'Quick command search palette' },
  { key: 'Ctrl / ⌘ + Z', desc: 'Undo last action' },
  { key: 'Ctrl / ⌘ + Shift + Z', desc: 'Redo previously undone action' },
  { key: 'Ctrl / ⌘ + D', desc: 'Duplicate selected arrangement clip' },
  { key: 'Delete / Backspace', desc: 'Delete selected clip or note' },
  { key: '1 - 7', desc: 'Switch views (Playlist, Rack, Piano, Mixer, Pads, DJ, Master)' },
  { key: 'Esc', desc: 'Close dialogs or clear selection' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#181922] border border-[#2c2f40] rounded-xl shadow-2xl p-6 select-none flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-[#292c3c]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-bold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-[#252837]"
          >
            ✕
          </button>
        </div>

        <div className="my-4 space-y-2.5">
          {SHORTCUTS.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#20222f] text-xs"
            >
              <kbd className="px-2 py-1 bg-[#101116] border border-[#2b2d3d] rounded font-mono text-[11px] text-orange-400 shadow-inner">
                {item.key}
              </kbd>
              <span className="text-zinc-300 text-[11px]">{item.desc}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-[#292c3c]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#252838] hover:bg-[#32364a] text-zinc-200 text-xs font-semibold rounded"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
