/**
 * BeatFlow Studio - Advanced Piano Roll Editor
 * Vertical interactive piano keyboard (C2 to C6), multi-bar note grid,
 * scale highlighting, ghost notes, chord progression insertion, arpeggiator,
 * strum humanizer, and MIDI file import/export.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Trash2,
  Wand2,
  Ghost,
  Eye,
  Activity,
} from 'lucide-react';
import { Project, Note, ScaleKey, ScaleType } from '../types/project';
import { AudioEngine } from '../audio/AudioEngine';
import { MidiService } from '../midi/MidiService';
import { AlgorithmicMusicGen } from '../ai/AlgorithmicMusicGen';

interface PianoRollProps {
  project: Project;
  channelId: string;
  currentStep: number;
  scaleKey: ScaleKey;
  setScaleKey: (k: ScaleKey) => void;
  scaleType: ScaleType;
  setScaleType: (t: ScaleType) => void;
  ghostNotesEnabled: boolean;
  setGhostNotesEnabled: (g: boolean) => void;
  onAddOrUpdateNote: (channelId: string, note: Note) => void;
  onDeleteNote: (channelId: string, noteId: string) => void;
  onClearChannelNotes: (channelId: string) => void;
  onSelectChannel: (channelId: string) => void;
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PIANO_KEYS: { midi: number; pitch: string; isBlack: boolean }[] = [];
for (let midi = 84; midi >= 36; midi--) {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  const noteName = PITCH_NAMES[noteIndex];
  const isBlack = noteName.includes('#');
  PIANO_KEYS.push({
    midi,
    pitch: `${noteName}${octave}`,
    isBlack,
  });
}

export const PianoRoll: React.FC<PianoRollProps> = ({
  project,
  channelId,
  currentStep,
  scaleKey,
  setScaleKey,
  scaleType,
  setScaleType,
  ghostNotesEnabled,
  setGhostNotesEnabled,
  onAddOrUpdateNote,
  onDeleteNote,
  onClearChannelNotes,
  onSelectChannel,
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteDuration, setNoteDuration] = useState<number>(2);
  const [draggingNote, setDraggingNote] = useState<{
    id: string;
    startStep: number;
    startMidi: number;
    startX: number;
    startY: number;
  } | null>(null);

  const [resizingNote, setResizingNote] = useState<{
    id: string;
    startDuration: number;
    startX: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioEngine = useRef(AudioEngine.getInstance()).current;

  const activePat =
    project.patterns.find((p) => p.id === project.activePatternId) || project.patterns[0];
  const channel =
    project.channels.find((c) => c.id === channelId) || project.channels[0];
  const notes = (activePat.notes[channel?.id] || []) as Note[];

  // Collect ghost notes from other channels in the active pattern
  const ghostNotes: { note: Note; color: string }[] = [];
  if (ghostNotesEnabled) {
    for (const ch of project.channels) {
      if (ch.id !== channel?.id && activePat.notes[ch.id]) {
        for (const n of activePat.notes[ch.id]) {
          ghostNotes.push({ note: n, color: ch.color });
        }
      }
    }
  }

  const stepWidth = 24;
  const keyHeight = 20;
  const totalSteps = 64;

  const handleKeyClick = (midi: number) => {
    audioEngine.auditionNote(
      channel?.synthPreset || 'lead',
      midi,
      0.4,
      channel?.mixerChannel || 0,
      channel?.volume || 0.8
    );
  };

  const handleGridCellClick = (step: number, midi: number, pitch: string) => {
    const existing = notes.find((n) => n.midi === midi && n.step === step);
    if (existing) {
      onDeleteNote(channel.id, existing.id);
      setSelectedNoteId(null);
      return;
    }

    const newNote: Note = {
      id: `n_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pitch,
      midi,
      step,
      duration: noteDuration,
      velocity: 0.85,
    };

    onAddOrUpdateNote(channel.id, newNote);
    setSelectedNoteId(newNote.id);
    handleKeyClick(midi);
  };

  const handleNoteMouseDown = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setSelectedNoteId(note.id);
    handleKeyClick(note.midi);

    setDraggingNote({
      id: note.id,
      startStep: note.step,
      startMidi: note.midi,
      startX: e.clientX,
      startY: e.clientY,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setSelectedNoteId(note.id);

    setResizingNote({
      id: note.id,
      startDuration: note.duration,
      startX: e.clientX,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingNote) {
        const deltaX = e.clientX - draggingNote.startX;
        const deltaSteps = Math.round(deltaX / stepWidth);
        const newStep = Math.max(0, Math.min(totalSteps - 1, draggingNote.startStep + deltaSteps));

        const deltaY = e.clientY - draggingNote.startY;
        const deltaKeys = Math.round(deltaY / keyHeight);
        const newMidi = Math.max(36, Math.min(84, draggingNote.startMidi - deltaKeys));

        const targetNote = notes.find((n) => n.id === draggingNote.id);
        if (targetNote && (targetNote.step !== newStep || targetNote.midi !== newMidi)) {
          const keyInfo = PIANO_KEYS.find((k) => k.midi === newMidi);
          onAddOrUpdateNote(channel.id, {
            ...targetNote,
            step: newStep,
            midi: newMidi,
            pitch: keyInfo?.pitch || targetNote.pitch,
          });
        }
      } else if (resizingNote) {
        const deltaX = e.clientX - resizingNote.startX;
        const deltaSteps = Math.round(deltaX / stepWidth);
        const newDuration = Math.max(1, resizingNote.startDuration + deltaSteps);

        const targetNote = notes.find((n) => n.id === resizingNote.id);
        if (targetNote && targetNote.duration !== newDuration) {
          onAddOrUpdateNote(channel.id, {
            ...targetNote,
            duration: newDuration,
          });
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingNote(null);
      setResizingNote(null);
    };

    if (draggingNote || resizingNote) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNote, resizingNote, stepWidth, keyHeight, notes, channel?.id, onAddOrUpdateNote]);

  const handleInsertChord = (chordType: 'major' | 'minor' | 'm7' | 'maj7') => {
    const rootMidi = 60;
    let offsets = [0, 4, 7];
    if (chordType === 'minor') offsets = [0, 3, 7];
    if (chordType === 'm7') offsets = [0, 3, 7, 10];
    if (chordType === 'maj7') offsets = [0, 4, 7, 11];

    for (let i = 0; i < offsets.length; i++) {
      const midi = rootMidi + offsets[i];
      const keyInfo = PIANO_KEYS.find((k) => k.midi === midi);
      const newNote: Note = {
        id: `chord_${Date.now()}_${i}`,
        pitch: keyInfo?.pitch || `N${midi}`,
        midi,
        step: 0,
        duration: 8,
        velocity: 0.8,
      };
      onAddOrUpdateNote(channel.id, newNote);
    }
  };

  const handleArpeggiate = () => {
    const arped = AlgorithmicMusicGen.arpeggiateNotes(notes, 'updown', 1);
    onClearChannelNotes(channel.id);
    arped.forEach((n) => onAddOrUpdateNote(channel.id, n));
  };

  const handleStrum = () => {
    const strummed = AlgorithmicMusicGen.applyStrum(notes);
    onClearChannelNotes(channel.id);
    strummed.forEach((n) => onAddOrUpdateNote(channel.id, n));
  };

  const handleExportMidi = () => {
    MidiService.exportPatternToMidi(
      activePat,
      project.bpm,
      channel.id,
      `${channel.name.toLowerCase().replace(/\s+/g, '_')}.mid`
    );
  };

  const handleImportMidi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedNotes = await MidiService.importMidiFile(file, project.bpm);
      for (const n of importedNotes) {
        onAddOrUpdateNote(channel.id, n);
      }
    } catch {
      alert('Unable to parse MIDI file.');
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-[#121317] overflow-hidden select-none">
      {/* Top Piano Roll Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#171820] border-b border-[#252733] text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-500 uppercase">Instrument:</span>
            <select
              value={channel.id}
              onChange={(e) => onSelectChannel(e.target.value)}
              className="bg-[#21232d] border border-[#2d303e] text-cyan-400 font-bold rounded px-2.5 py-1 text-xs outline-none"
            >
              {project.channels
                .filter((c) => c.type === 'synth')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Scale Highlighting Selector */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-700">
            <span className="text-[11px] text-zinc-500 font-medium">Scale:</span>
            <select
              value={scaleKey}
              onChange={(e) => setScaleKey(e.target.value as ScaleKey)}
              className="bg-[#21232d] border border-[#2d303e] text-orange-400 font-bold rounded px-1.5 py-0.5 text-xs outline-none"
            >
              {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select
              value={scaleType}
              onChange={(e) => setScaleType(e.target.value as ScaleType)}
              className="bg-[#21232d] border border-[#2d303e] text-zinc-300 rounded px-1.5 py-0.5 text-xs outline-none"
            >
              <option value="minor">Natural Minor</option>
              <option value="major">Major</option>
              <option value="harmonic_minor">Harmonic Minor</option>
              <option value="pentatonic">Minor Pentatonic</option>
              <option value="blues">Blues Scale</option>
              <option value="dorian">Dorian Mode</option>
              <option value="phrygian">Phrygian Mode</option>
            </select>
          </div>

          {/* Tools: Arp & Strum */}
          <div className="flex items-center gap-1 pl-3 border-l border-zinc-700">
            <button
              onClick={handleArpeggiate}
              title="Arpeggiate active notes"
              className="px-2 py-0.5 bg-[#252734] hover:bg-[#323545] text-cyan-300 rounded text-[11px] font-semibold flex items-center gap-1"
            >
              <Wand2 className="w-3 h-3" />
              <span>Arp</span>
            </button>
            <button
              onClick={handleStrum}
              title="Apply guitar/keyboard strum"
              className="px-2 py-0.5 bg-[#252734] hover:bg-[#323545] text-amber-300 rounded text-[11px] font-semibold flex items-center gap-1"
            >
              <Activity className="w-3 h-3" />
              <span>Strum</span>
            </button>
            <button
              onClick={() => setGhostNotesEnabled(!ghostNotesEnabled)}
              title="Toggle ghost notes from other tracks"
              className={`p-1 rounded ${
                ghostNotesEnabled ? 'text-purple-400 bg-purple-500/20' : 'text-zinc-500'
              }`}
            >
              <Ghost className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* MIDI Import / Export & Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onClearChannelNotes(channel.id)}
            title="Clear all notes"
            className="flex items-center gap-1 px-2.5 py-1 text-zinc-400 hover:text-red-400 hover:bg-[#252733] rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import .mid file"
            className="flex items-center gap-1 px-2.5 py-1 text-zinc-300 hover:text-white bg-[#20222c] hover:bg-[#2b2d3b] rounded border border-[#2d3040] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import MIDI</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportMidi}
            accept=".mid,.midi"
            className="hidden"
          />

          <button
            onClick={handleExportMidi}
            title="Export to .mid file"
            className="flex items-center gap-1 px-2.5 py-1 text-zinc-300 hover:text-white bg-[#20222c] hover:bg-[#2b2d3b] rounded border border-[#2d3040] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export MIDI</span>
          </button>
        </div>
      </div>

      {/* Main Keyboard + Grid Scrollable Container */}
      <div className="flex flex-1 overflow-auto relative">
        {/* Left: Piano Keyboard Keys with scale highlights */}
        <div className="w-24 shrink-0 bg-[#16171e] border-r border-[#272938] sticky left-0 z-20">
          {PIANO_KEYS.map((key) => {
            const inScale = AlgorithmicMusicGen.isNoteInScale(key.midi, scaleKey, scaleType);

            return (
              <button
                key={key.midi}
                onClick={() => handleKeyClick(key.midi)}
                style={{ height: keyHeight }}
                className={`w-full flex items-center justify-between px-2 text-[10px] font-mono border-b transition-colors ${
                  key.isBlack
                    ? 'bg-[#181920] border-[#222430] text-zinc-400 hover:bg-[#242635]'
                    : 'bg-[#292b36] border-[#373a48] text-zinc-200 hover:bg-[#383b4b]'
                }`}
              >
                <span>{key.pitch}</span>
                {inScale ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_#06b6d4]" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Right: Notes Grid */}
        <div
          style={{
            width: totalSteps * stepWidth,
            height: PIANO_KEYS.length * keyHeight,
          }}
          className="relative bg-[#111216]"
        >
          {/* Grid Background Lines */}
          <div className="absolute inset-0 pointer-events-none flex">
            {Array.from({ length: totalSteps }).map((_, stepIdx) => {
              const isBar = stepIdx % 16 === 0;
              const isBeat = stepIdx % 4 === 0;
              return (
                <div
                  key={stepIdx}
                  style={{ width: stepWidth }}
                  className={`h-full border-r ${
                    isBar
                      ? 'border-[#303344]'
                      : isBeat
                      ? 'border-[#212330]'
                      : 'border-[#171822]'
                  }`}
                />
              );
            })}
          </div>

          {/* Semitone Horizontal Lines with Scale Highlight shading */}
          {PIANO_KEYS.map((key, rowIdx) => {
            const inScale = AlgorithmicMusicGen.isNoteInScale(key.midi, scaleKey, scaleType);

            return (
              <div
                key={key.midi}
                style={{
                  top: rowIdx * keyHeight,
                  height: keyHeight,
                  width: '100%',
                  backgroundColor: inScale ? 'transparent' : 'rgba(0, 0, 0, 0.28)',
                }}
                className={`absolute border-b pointer-events-none ${
                  key.isBlack ? 'border-[#1d1f2a]' : 'border-[#222430]'
                }`}
              />
            );
          })}

          {/* Ghost Notes from other tracks */}
          {ghostNotes.map(({ note: gn, color }) => {
            const rowIdx = PIANO_KEYS.findIndex((k) => k.midi === gn.midi);
            if (rowIdx === -1) return null;
            return (
              <div
                key={`ghost_${gn.id}`}
                style={{
                  top: rowIdx * keyHeight + 2,
                  left: gn.step * stepWidth,
                  width: gn.duration * stepWidth - 2,
                  height: keyHeight - 4,
                  backgroundColor: `${color}30`,
                  border: `1px dashed ${color}70`,
                }}
                className="absolute rounded-xs pointer-events-none z-5"
              />
            );
          })}

          {/* Real-time Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-orange-500 pointer-events-none z-20 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
            style={{
              left: (currentStep % totalSteps) * stepWidth,
              transition: 'left 0.05s linear',
            }}
          />

          {/* Clickable Grid Cells */}
          {PIANO_KEYS.map((key, rowIdx) => (
            <div
              key={key.midi}
              style={{
                top: rowIdx * keyHeight,
                height: keyHeight,
                width: '100%',
              }}
              className="absolute flex"
            >
              {Array.from({ length: totalSteps }).map((_, stepIdx) => (
                <div
                  key={stepIdx}
                  onClick={() => handleGridCellClick(stepIdx, key.midi, key.pitch)}
                  style={{ width: stepWidth }}
                  className="h-full cursor-pointer hover:bg-orange-500/10"
                />
              ))}
            </div>
          ))}

          {/* Rendered Notes */}
          {notes.map((note) => {
            const rowIdx = PIANO_KEYS.findIndex((k) => k.midi === note.midi);
            if (rowIdx === -1) return null;

            const isSelected = selectedNoteId === note.id;
            const noteTop = rowIdx * keyHeight;
            const noteLeft = note.step * stepWidth;
            const noteWidth = note.duration * stepWidth;

            return (
              <div
                key={note.id}
                onMouseDown={(e) => handleNoteMouseDown(e, note)}
                style={{
                  top: noteTop + 1,
                  left: noteLeft,
                  width: noteWidth - 1,
                  height: keyHeight - 2,
                  backgroundColor: channel.color,
                }}
                className={`absolute rounded-sm cursor-grab active:cursor-grabbing flex items-center justify-between px-1.5 shadow-md z-10 transition-transform ${
                  isSelected ? 'ring-2 ring-white scale-102' : 'hover:brightness-110'
                }`}
              >
                <span className="text-[9px] font-mono font-bold text-black truncate pointer-events-none">
                  {note.pitch}
                </span>

                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, note)}
                  title="Drag to resize note duration"
                  className="w-2 h-full cursor-ew-resize hover:bg-black/30 rounded-r flex items-center justify-center -mr-1"
                >
                  <div className="w-0.5 h-2 bg-black/60" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
