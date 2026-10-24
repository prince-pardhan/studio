/**
 * BeatFlow Studio - Main Digital Audio Workstation Application
 * Real-time synthesis, step sequencer, piano roll, multitrack arrangement,
 * mixer with DSP, microphone recording, AI music assistant, live performance pads,
 * dual DJ decks with crossfader, music theory tools, and WAV/MIDI export.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from './state/projectStore';
import { Toolbar } from './components/Toolbar';
import { TransportBar } from './components/TransportBar';
import { Playlist } from './components/Playlist';
import { ChannelRack } from './components/ChannelRack';
import { PianoRoll } from './components/PianoRoll';
import { Mixer } from './components/Mixer';
import { PerformancePads } from './components/PerformancePads';
import { DJDecks } from './components/DJDecks';
import { SampleBrowser } from './components/SampleBrowser';
import { RecordingModal } from './components/RecordingModal';
import { ExportModal } from './components/ExportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { CircleOfFifthsModal } from './components/CircleOfFifthsModal';
import { CommandPalette } from './components/CommandPalette';
import { TemplatesModal } from './components/TemplatesModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { WaveformEditorModal } from './components/WaveformEditorModal';
import { MidiService } from './midi/MidiService';
import { AudioAsset, ArrangementClip, Note } from './types/project';

export default function App() {
  const store = useProjectStore();
  const [isBrowserOpen, setIsBrowserOpen] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isCircleOfFifthsOpen, setIsCircleOfFifthsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isWaveformEditorOpen, setIsWaveformEditorOpen] = useState(false);
  const [activeEditingAsset, setActiveEditingAsset] = useState<AudioAsset | null>(null);
  const [saveToast, setSaveToast] = useState(false);
  const midiServiceRef = useRef<MidiService | null>(null);

  // Initialize Web MIDI API listener for hardware MIDI keyboard
  useEffect(() => {
    const midi = new MidiService();
    midiServiceRef.current = midi;
    midi.initMidi().then((devices) => {
      if (devices.length > 0) {
        // Listen to live hardware MIDI notes
        midi.onMidiNote((noteNumber, velocity, isNoteOn) => {
          if (isNoteOn) {
            const channel = store.project.channels.find(
              (c) => c.id === store.activeChannelId
            ) || store.project.channels[0];

            if (channel.type === 'synth') {
              store.audioEngine.auditionNote(
                channel.synthPreset || 'lead',
                noteNumber,
                0.5,
                channel.mixerChannel,
                velocity * channel.volume
              );
            }
          }
        });
      }
    });
  }, [store.activeChannelId, store.project.channels, store.audioEngine]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea, or select
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      // Ctrl/Cmd + K: Open Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        store.togglePlay();
        return;
      }

      // Enter: Stop
      if (e.code === 'Enter') {
        e.preventDefault();
        store.stopPlayback();
        return;
      }

      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerSaveToast();
        return;
      }

      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        store.undo();
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl+Y: Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        store.redo();
        return;
      }

      // Delete / Backspace: Delete selected clip
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (store.selectedClipId) {
          e.preventDefault();
          store.deleteClip(store.selectedClipId);
          return;
        }
      }

      // Ctrl/Cmd + D: Duplicate selected clip
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (store.selectedClipId) {
          e.preventDefault();
          store.duplicateClip(store.selectedClipId);
          return;
        }
      }

      // Number keys 1-6: Switch active workspace view
      if (e.key === '1') store.setActiveTab('playlist');
      if (e.key === '2') store.setActiveTab('channelrack');
      if (e.key === '3') store.setActiveTab('pianoroll');
      if (e.key === '4') store.setActiveTab('mixer');
      if (e.key === '5') store.setActiveTab('performance');
      if (e.key === '6') store.setActiveTab('dj');

      // Esc: Close all modals & clear selected clip
      if (e.key === 'Escape') {
        setIsExportOpen(false);
        setIsRecordOpen(false);
        setIsShortcutsOpen(false);
        setIsAIAssistantOpen(false);
        setIsCircleOfFifthsOpen(false);
        setIsCommandPaletteOpen(false);
        setIsTemplatesOpen(false);
        setIsAudioSettingsOpen(false);
        setIsWaveformEditorOpen(false);
        store.setSelectedClipId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  const triggerSaveToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2400);
  };

  const handleAddRecordedClip = (
    clip: ArrangementClip,
    asset: AudioAsset,
    buffer: AudioBuffer
  ) => {
    store.addClip(clip);
    store.audioEngine.cacheAudioBuffer(asset.id, buffer);
  };

  const handleAddSampleClipToTimeline = (asset: AudioAsset) => {
    const secondsPer16th = (60 / store.project.bpm) / 4;
    const durationSteps = Math.max(4, Math.round(asset.duration / secondsPer16th));

    const newClip: ArrangementClip = {
      id: `clip_${Date.now()}`,
      trackIndex: Math.min(4, store.project.tracks.length - 1),
      startStep: store.currentStep,
      durationSteps,
      type: 'audio',
      audioAssetId: asset.id,
      name: asset.name,
      color: '#ec4899',
    };
    store.addClip(newClip);
    store.setActiveTab('playlist');
  };

  const handleOpenWaveformEditor = (asset: AudioAsset) => {
    setActiveEditingAsset(asset);
    setIsWaveformEditorOpen(true);
  };

  const handleApplyAIDrumPattern = (pattern: Record<string, number[]>) => {
    Object.entries(pattern).forEach(([chId, vels]) => {
      vels.forEach((vel, stepIdx) => {
        store.setStepVelocity(chId, stepIdx, vel);
      });
    });
  };

  const handleApplyAINotes = (channelId: string, notes: Note[]) => {
    notes.forEach((n) => store.addOrUpdateNote(channelId, n));
    store.setActiveTab('pianoroll');
  };

  const handleApplyAINewPattern = (
    name: string,
    drums: Record<string, number[]>,
    notes: Record<string, Note[]>
  ) => {
    store.addPattern(name);
    setTimeout(() => {
      Object.entries(drums).forEach(([chId, vels]) => {
        vels.forEach((vel, stepIdx) => {
          store.setStepVelocity(chId, stepIdx, vel);
        });
      });
      Object.entries(notes).forEach(([chId, chNotes]) => {
        chNotes.forEach((n) => store.addOrUpdateNote(chId, n));
      });
    }, 50);
  };

  const handleInsertCircleOfFifthsProgression = (notes: Note[]) => {
    notes.forEach((n) => store.addOrUpdateNote(store.activeChannelId, n));
    store.setActiveTab('pianoroll');
  };

  // Theme styling wrapper
  const themeClass =
    store.theme === 'cyber'
      ? 'theme-cyber bg-[#0a0c14] text-[#00f2fe]'
      : store.theme === 'light'
      ? 'theme-light bg-[#f8fafc] text-[#0f172a]'
      : 'bg-[#111216] text-[#e2e8f0]';

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden select-none font-sans ${themeClass}`}
    >
      {/* Top Bar Toolbar */}
      <Toolbar
        project={store.project}
        activeTab={store.activeTab}
        setActiveTab={store.setActiveTab}
        undo={store.undo}
        redo={store.redo}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenAI={() => setIsAIAssistantOpen(true)}
        onOpenCircleOfFifths={() => setIsCircleOfFifthsOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
        onNewProject={store.resetProject}
        onLoadProject={store.loadProject}
        onSaveNotification={triggerSaveToast}
        theme={store.theme}
        onSetTheme={store.setTheme}
      />

      {/* Transport Bar */}
      <TransportBar
        isPlaying={store.isPlaying}
        currentStep={store.currentStep}
        bpm={store.project.bpm}
        timeSignature={store.project.timeSignature}
        swing={store.project.swing}
        metronome={store.metronome}
        playbackMode={store.playbackMode}
        onTogglePlay={store.togglePlay}
        onStop={store.stopPlayback}
        onSetBpm={store.setBpm}
        onSetSwing={store.setSwing}
        onToggleMetronome={store.toggleMetronome}
        onSwitchMode={store.switchPlaybackMode}
        onOpenRecord={() => setIsRecordOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sound Browser */}
        <SampleBrowser
          isOpen={isBrowserOpen}
          onToggle={() => setIsBrowserOpen(!isBrowserOpen)}
          onAddAudioClipToTimeline={handleAddSampleClipToTimeline}
          onEditAsset={handleOpenWaveformEditor}
        />

        {/* Central Viewport based on active tab */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#121318]">
          {store.activeTab === 'playlist' && (
            <Playlist
              project={store.project}
              currentStep={store.currentStep}
              zoomLevel={store.zoomLevel}
              setZoomLevel={store.setZoomLevel}
              selectedClipId={store.selectedClipId}
              setSelectedClipId={store.setSelectedClipId}
              onAddClip={store.addClip}
              onUpdateClip={store.updateClip}
              onDeleteClip={store.deleteClip}
              onDuplicateClip={store.duplicateClip}
              onUpdateProjectTracks={store.updateProjectTracks}
              onAddMarker={store.addMarker}
              onDeleteMarker={store.deleteMarker}
              onSetLoopRange={store.setLoopRange}
              onToggleLoop={store.toggleLoop}
              onAddAutomationLane={store.addAutomationLane}
              onUpdateAutomationPoint={store.updateAutomationPoint}
              onDeleteAutomationLane={store.deleteAutomationLane}
            />
          )}

          {store.activeTab === 'channelrack' && (
            <ChannelRack
              project={store.project}
              currentStep={store.currentStep}
              onToggleStep={store.toggleStep}
              onSetStepVelocity={store.setStepVelocity}
              onSetStepModifier={store.setStepModifier}
              onFillStepsPattern={store.fillStepsPattern}
              onClearChannelSteps={store.clearChannelSteps}
              onSelectPattern={store.selectPattern}
              onAddPattern={() => store.addPattern('Pattern')}
              onDuplicatePattern={store.duplicatePattern}
              onUpdateChannel={store.updateChannel}
              onOpenInPianoRoll={(chId) => {
                store.setActiveChannelId(chId);
                store.setActiveTab('pianoroll');
              }}
            />
          )}

          {store.activeTab === 'pianoroll' && (
            <PianoRoll
              project={store.project}
              channelId={store.activeChannelId}
              currentStep={store.currentStep}
              scaleKey={store.scaleKey}
              setScaleKey={store.setScaleKey}
              scaleType={store.scaleType}
              setScaleType={store.setScaleType}
              ghostNotesEnabled={store.ghostNotesEnabled}
              setGhostNotesEnabled={store.setGhostNotesEnabled}
              onAddOrUpdateNote={store.addOrUpdateNote}
              onDeleteNote={store.deleteNote}
              onClearChannelNotes={store.clearChannelNotes}
              onSelectChannel={store.setActiveChannelId}
            />
          )}

          {store.activeTab === 'mixer' && (
            <Mixer
              project={store.project}
              onUpdateMixerChannel={store.updateMixerChannel}
              onUpdateMixerEffect={store.updateMixerEffect}
            />
          )}

          {store.activeTab === 'performance' && <PerformancePads />}

          {store.activeTab === 'dj' && <DJDecks />}
        </main>
      </div>

      {/* Save Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1e202c] border border-emerald-500/50 shadow-xl px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs text-white">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Project saved successfully to IndexedDB!</span>
        </div>
      )}

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        bpm={store.project.bpm}
        onApplyDrumPattern={handleApplyAIDrumPattern}
        onApplyNotes={handleApplyAINotes}
        onApplyNewPattern={handleApplyAINewPattern}
        activeChannelId={store.activeChannelId}
      />

      {/* Interactive Circle of Fifths Theory Modal */}
      <CircleOfFifthsModal
        isOpen={isCircleOfFifthsOpen}
        onClose={() => setIsCircleOfFifthsOpen(false)}
        onInsertProgression={handleInsertCircleOfFifthsProgression}
      />

      {/* Quick Search Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onTogglePlay={store.togglePlay}
        onSetActiveTab={store.setActiveTab}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAI={() => setIsAIAssistantOpen(true)}
        onOpenCircleOfFifths={() => setIsCircleOfFifthsOpen(true)}
        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onSetTheme={store.setTheme}
        onToggleMetronome={store.toggleMetronome}
      />

      {/* Project Starter Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectGenre={(genre) => store.loadTemplate(genre)}
      />

      {/* Audio Engine Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
      />

      {/* Sample Waveform Editor & Trimmer Modal */}
      <WaveformEditorModal
        isOpen={isWaveformEditorOpen}
        onClose={() => {
          setIsWaveformEditorOpen(false);
          setActiveEditingAsset(null);
        }}
        asset={activeEditingAsset}
      />

      {/* Microphone Recording Modal */}
      <RecordingModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        onAddRecordedClip={handleAddRecordedClip}
        targetTrackIndex={4}
        currentStep={store.currentStep}
      />

      {/* Offline Audio / MIDI Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={store.project}
      />

      {/* Keyboard Shortcuts Reference Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
