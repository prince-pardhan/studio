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
import { MasteringSuite } from './components/MasteringSuite';
import { NewProjectModal } from './components/NewProjectModal';
import { ProjectDashboardModal } from './components/ProjectDashboardModal';
import { EditProjectModal } from './components/EditProjectModal';
import { VoiceStudioModal } from './components/VoiceStudioModal';
import { VocalEditorModal } from './components/VocalEditorModal';
import { AutoMixModal } from './components/AutoMixModal';
import { SongWorkflowBar } from './components/SongWorkflowBar';
import { ProjectStorage } from './storage/ProjectStorage';
import { MidiService } from './midi/MidiService';
import { AudioAsset, ArrangementClip, Note, MixerChannel } from './types/project';

export default function App() {
  const store = useProjectStore();
  const [isBrowserOpen, setIsBrowserOpen] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isVoiceStudioOpen, setIsVoiceStudioOpen] = useState(false);
  const [isVocalEditorOpen, setIsVocalEditorOpen] = useState(false);
  const [isAutoMixOpen, setIsAutoMixOpen] = useState(false);
  const [activeVocalAsset, setActiveVocalAsset] = useState<AudioAsset | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isCircleOfFifthsOpen, setIsCircleOfFifthsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isWaveformEditorOpen, setIsWaveformEditorOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isProjectDashboardOpen, setIsProjectDashboardOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [activeEditingAsset, setActiveEditingAsset] = useState<AudioAsset | null>(null);
  const [saveToast, setSaveToast] = useState(false);
  const [recoveryToast, setRecoveryToast] = useState(false);
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

      // Ctrl/Cmd + N: New Project
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewProjectOpen(true);
        return;
      }

      // Ctrl/Cmd + O: Open Project Library
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setIsProjectDashboardOpen(true);
        return;
      }

      // Ctrl/Cmd + E: Export Audio
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsExportOpen(true);
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
        store.saveProjectManual().then(() => triggerSaveToast());
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

      // Number keys 1-7: Switch active workspace view
      if (e.key === '1') store.setActiveTab('playlist');
      if (e.key === '2') store.setActiveTab('channelrack');
      if (e.key === '3') store.setActiveTab('pianoroll');
      if (e.key === '4') store.setActiveTab('mixer');
      if (e.key === '5') store.setActiveTab('performance');
      if (e.key === '6') store.setActiveTab('dj');
      if (e.key === '7') store.setActiveTab('mastering');

      // Esc: Close all modals & clear selected clip
      if (e.key === 'Escape') {
        setIsExportOpen(false);
        setIsRecordOpen(false);
        setIsVoiceStudioOpen(false);
        setIsVocalEditorOpen(false);
        setIsAutoMixOpen(false);
        setIsShortcutsOpen(false);
        setIsAIAssistantOpen(false);
        setIsCircleOfFifthsOpen(false);
        setIsCommandPaletteOpen(false);
        setIsTemplatesOpen(false);
        setIsAudioSettingsOpen(false);
        setIsWaveformEditorOpen(false);
        setIsNewProjectOpen(false);
        setIsProjectDashboardOpen(false);
        setIsEditProjectOpen(false);
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

  const handlePreviewSong = () => {
    store.stopPlayback();
    store.audioEngine.seekToStep(0);
    store.setActiveTab('playlist');
    store.switchPlaybackMode('song');
    setTimeout(() => {
      store.togglePlay();
    }, 100);
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
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        onOpenProjectDashboard={() => setIsProjectDashboardOpen(true)}
        onOpenEditProject={() => setIsEditProjectOpen(true)}
        onSaveProject={async () => {
          await store.saveProjectManual();
          triggerSaveToast();
        }}
        onDuplicateProject={async () => {
          await store.duplicateCurrentProject();
          triggerSaveToast();
        }}
        saveStatus={store.saveStatus}
        hasUnsavedChanges={store.hasUnsavedChanges}
        theme={store.theme}
        onSetTheme={store.setTheme}
        onImportProject={(file) => {
          ProjectStorage.importProjectPackage(file)
            .then((p) => {
              store.switchProject(p);
              triggerSaveToast();
            })
            .catch((err) => alert(err.message));
        }}
        onOpenVoiceStudio={() => setIsVoiceStudioOpen(true)}
        onOpenAutoMix={() => setIsAutoMixOpen(true)}
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
        onOpenRecord={() => setIsVoiceStudioOpen(true)}
      />

      {/* 8-Step Voice-to-Full-Song Guided Production Bar (Phase 14) */}
      <SongWorkflowBar
        project={store.project}
        onOpenVoiceStudio={() => setIsVoiceStudioOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenVocalEditor={() => {
          if (!activeVocalAsset) {
            const firstAudio = store.project.clips.find(
              (c) => c.type === 'audio' && c.audioAssetId
            );
            if (firstAudio) {
              setActiveVocalAsset({
                id: firstAudio.audioAssetId!,
                name: firstAudio.name,
                duration: 8.0,
                sampleRate: 44100,
                channels: 2,
                createdAt: Date.now(),
              });
            }
          }
          setIsVocalEditorOpen(true);
        }}
        onOpenAutoMix={() => setIsAutoMixOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onSetActiveTab={store.setActiveTab}
        onPreviewSong={handlePreviewSong}
        hasAudioClip={store.project.clips.some((c) => c.type === 'audio')}
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
              onAddPlugin={store.addMixerPlugin}
              onRemovePlugin={store.removeMixerPlugin}
              onReorderPlugins={store.reorderMixerPlugins}
            />
          )}

          {store.activeTab === 'performance' && <PerformancePads />}

          {store.activeTab === 'dj' && <DJDecks />}

          {store.activeTab === 'mastering' && (
            <MasteringSuite
              project={store.project}
              onUpdateMasteringSession={store.updateMasteringSession}
              onUpdateProcessor={store.updateMasteringProcessor}
              onReorderProcessors={store.reorderMasteringProcessors}
              onOpenExport={() => setIsExportOpen(true)}
            />
          )}
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
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        onOpenProjectDashboard={() => setIsProjectDashboardOpen(true)}
        onSaveProject={async () => {
          await store.saveProjectManual();
          triggerSaveToast();
        }}
        onDuplicateProject={async () => {
          await store.duplicateCurrentProject();
          triggerSaveToast();
        }}
        onOpenVoiceStudio={() => setIsVoiceStudioOpen(true)}
        onOpenAutoMix={() => setIsAutoMixOpen(true)}
      />

      {/* New Project Creation Dialog */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreateProject={(opts) => {
          store.createNewProject(opts);
          triggerSaveToast();
        }}
      />

      {/* Project Library & Management Dashboard */}
      <ProjectDashboardModal
        isOpen={isProjectDashboardOpen}
        currentProjectId={store.project.id}
        onClose={() => setIsProjectDashboardOpen(false)}
        onOpenProject={(p) => {
          store.switchProject(p);
          triggerSaveToast();
        }}
        onOpenNewProjectModal={() => setIsNewProjectOpen(true)}
        onRecoverSnapshot={async () => {
          const rec = await store.recoverLatestSnapshot();
          if (rec) {
            setRecoveryToast(true);
            setTimeout(() => setRecoveryToast(false), 3000);
          } else {
            alert('No autosaved recovery snapshot available for this session.');
          }
        }}
      />

      {/* Project Metadata & Settings Editor */}
      <EditProjectModal
        isOpen={isEditProjectOpen}
        project={store.project}
        onClose={() => setIsEditProjectOpen(false)}
        onSave={(id, updates) => {
          store.editProjectMetadata(updates);
          triggerSaveToast();
        }}
      />

      {/* Recovery Notification Toast */}
      {recoveryToast && (
        <div className="fixed bottom-5 left-5 z-50 bg-[#1e202c] border border-amber-500/60 shadow-xl px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs text-white">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Restored session from latest valid autosave snapshot!</span>
        </div>
      )}

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

      {/* Voice & Audio Studio Modal (Phase 14) */}
      <VoiceStudioModal
        isOpen={isVoiceStudioOpen}
        onClose={() => setIsVoiceStudioOpen(false)}
        onAddRecordedClip={(clip, asset, buffer) => {
          handleAddRecordedClip(clip, asset, buffer);
          setActiveVocalAsset(asset);
          triggerSaveToast();
        }}
        onOpenVocalEditor={(asset) => {
          setActiveVocalAsset(asset);
          setIsVocalEditorOpen(true);
        }}
        targetTrackIndex={4}
        currentStep={store.currentStep}
        bpm={store.project.bpm}
      />

      {/* Vocal Editor & Processor Modal (Phase 14) */}
      <VocalEditorModal
        isOpen={isVocalEditorOpen}
        onClose={() => setIsVocalEditorOpen(false)}
        asset={activeVocalAsset || activeEditingAsset}
        bpm={store.project.bpm}
        onPlaceOnTimeline={(clip) => {
          store.addClip(clip);
          store.setActiveTab('playlist');
          triggerSaveToast();
        }}
        onUpdateAsset={(updated) => {
          setActiveVocalAsset(updated);
          triggerSaveToast();
        }}
      />

      {/* Auto Mix Vocal DSP Analyzer Modal (Phase 14) */}
      <AutoMixModal
        isOpen={isAutoMixOpen}
        onClose={() => setIsAutoMixOpen(false)}
        project={store.project}
        vocalAsset={activeVocalAsset}
        onApplyMixerChannel={(updated) => {
          store.updateMixerChannel(updated.id, updated);
          triggerSaveToast();
        }}
      />

      {/* Keyboard Shortcuts Reference Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
