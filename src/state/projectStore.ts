/**
 * BeatFlow Studio - Global Project State & Extended Hooks
 * Manages reactive project data, automation lanes, markers, loop range,
 * scale highlighting, themes, undo/redo history, and AudioEngine sync.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Project,
  Pattern,
  ChannelRackChannel,
  ArrangementClip,
  Track,
  MixerChannel,
  Note,
  ActiveTab,
  PlaybackMode,
  EffectConfig,
  TimelineMarker,
  AutomationLane,
  AutomationPoint,
  StepModifier,
  ScaleKey,
  ScaleType,
  ThemeMode,
  EffectType,
  MasteringSession,
  MasteringProcessorConfig,
} from '../types/project';
import { createDefaultProject } from './defaultProject';
import { ProjectStorage } from '../storage/ProjectStorage';
import { AudioEngine } from '../audio/AudioEngine';
import { AlgorithmicMusicGen } from '../ai/AlgorithmicMusicGen';
import { PluginRegistry } from '../plugins/PluginRegistry';

export function useProjectStore() {
  const [project, setProject] = useState<Project>(() => createDefaultProject());
  const [activeTab, setActiveTab] = useState<ActiveTab>('playlist');
  const [activeChannelId, setActiveChannelId] = useState<string>('ch_lead');
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('pattern');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [metronome, setMetronome] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Music Theory & Visualizer States
  const [scaleKey, setScaleKey] = useState<ScaleKey>('C');
  const [scaleType, setScaleType] = useState<ScaleType>('minor');
  const [ghostNotesEnabled, setGhostNotesEnabled] = useState<boolean>(true);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Undo / Redo stacks
  const historyRef = useRef<Project[]>([]);
  const futureRef = useRef<Project[]>([]);
  const audioEngine = useRef(AudioEngine.getInstance()).current;

  // Sync project to AudioEngine
  useEffect(() => {
    audioEngine.setProject(project);
    if (project.masteringSession) {
      audioEngine.mixer.mastering.applySessionConfig(project.masteringSession);
    }
  }, [project, audioEngine]);

  // Subscribe to AudioEngine transport playhead
  useEffect(() => {
    const unsub = audioEngine.subscribeTransport((step, playing) => {
      setCurrentStep(step);
      setIsPlaying(playing);
    });
    return () => unsub();
  }, [audioEngine]);

  const pushHistory = useCallback((current: Project) => {
    historyRef.current.push(JSON.parse(JSON.stringify(current)));
    if (historyRef.current.length > 30) {
      historyRef.current.shift();
    }
    futureRef.current = [];
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    futureRef.current.push(JSON.parse(JSON.stringify(project)));
    setProject(prev);
    ProjectStorage.saveProject(prev);
  }, [project]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(JSON.parse(JSON.stringify(project)));
    setProject(next);
    ProjectStorage.saveProject(next);
  }, [project]);

  const mutateProject = useCallback(
    (updater: (prev: Project) => Project) => {
      setProject((prev) => {
        pushHistory(prev);
        const updated = updater(prev);
        ProjectStorage.saveProject(updated);
        return updated;
      });
    },
    [pushHistory]
  );

  // Transport controls
  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.setPlaybackMode(playbackMode);
      await audioEngine.play();
    }
  }, [isPlaying, playbackMode, audioEngine]);

  const stopPlayback = useCallback(() => {
    audioEngine.stop();
  }, [audioEngine]);

  const setBpm = useCallback(
    (bpm: number) => {
      mutateProject((prev) => ({
        ...prev,
        bpm: Math.max(40, Math.min(240, bpm)),
      }));
      audioEngine.setBpm(bpm);
    },
    [mutateProject, audioEngine]
  );

  const setSwing = useCallback(
    (swing: number) => {
      mutateProject((prev) => ({
        ...prev,
        swing: Math.max(0, Math.min(1, swing)),
      }));
    },
    [mutateProject]
  );

  const toggleMetronome = useCallback(() => {
    setMetronome((prev) => {
      const next = !prev;
      audioEngine.metronomeEnabled = next;
      return next;
    });
  }, [audioEngine]);

  const switchPlaybackMode = useCallback(
    (mode: PlaybackMode) => {
      setPlaybackMode(mode);
      audioEngine.setPlaybackMode(mode);
    },
    [audioEngine]
  );

  // Step Sequencer actions
  const toggleStep = useCallback(
    (channelId: string, stepIndex: number) => {
      mutateProject((prev) => {
        const activePat = prev.patterns.find((p) => p.id === prev.activePatternId);
        if (!activePat) return prev;

        const currentSteps = activePat.drumSteps[channelId] || new Array(activePat.lengthInSteps).fill(0);
        const newSteps = [...currentSteps];
        newSteps[stepIndex] = newSteps[stepIndex] > 0 ? 0 : 0.85;

        return {
          ...prev,
          patterns: prev.patterns.map((p) =>
            p.id === activePat.id
              ? { ...p, drumSteps: { ...p.drumSteps, [channelId]: newSteps } }
              : p
          ),
        };
      });
    },
    [mutateProject]
  );

  const setStepVelocity = useCallback(
    (channelId: string, stepIndex: number, velocity: number) => {
      mutateProject((prev) => {
        const activePat = prev.patterns.find((p) => p.id === prev.activePatternId);
        if (!activePat) return prev;

        const currentSteps = activePat.drumSteps[channelId] || new Array(activePat.lengthInSteps).fill(0);
        const newSteps = [...currentSteps];
        newSteps[stepIndex] = Math.max(0, Math.min(1, velocity));

        return {
          ...prev,
          patterns: prev.patterns.map((p) =>
            p.id === activePat.id
              ? { ...p, drumSteps: { ...p.drumSteps, [channelId]: newSteps } }
              : p
          ),
        };
      });
    },
    [mutateProject]
  );

  const setStepModifier = useCallback(
    (channelId: string, stepIndex: number, mod: Partial<StepModifier>) => {
      mutateProject((prev) => {
        const activePat = prev.patterns.find((p) => p.id === prev.activePatternId);
        if (!activePat) return prev;

        const existingModifiers = activePat.drumModifiers || {};
        const chMods = existingModifiers[channelId] || {};
        const updatedStepMod = { ...(chMods[stepIndex] || {}), ...mod };

        return {
          ...prev,
          patterns: prev.patterns.map((p) =>
            p.id === activePat.id
              ? {
                  ...p,
                  drumModifiers: {
                    ...existingModifiers,
                    [channelId]: { ...chMods, [stepIndex]: updatedStepMod },
                  },
                }
              : p
          ),
        };
      });
    },
    [mutateProject]
  );

  const fillStepsPattern = useCallback(
    (channelId: string, interval: number) => {
      mutateProject((prev) => {
        const activePat = prev.patterns.find((p) => p.id === prev.activePatternId);
        if (!activePat) return prev;

        const newSteps = new Array(activePat.lengthInSteps).fill(0).map((_, i) =>
          i % interval === 0 ? 0.85 : 0
        );

        return {
          ...prev,
          patterns: prev.patterns.map((p) =>
            p.id === activePat.id
              ? { ...p, drumSteps: { ...p.drumSteps, [channelId]: newSteps } }
              : p
          ),
        };
      });
    },
    [mutateProject]
  );

  const clearChannelSteps = useCallback(
    (channelId: string) => {
      mutateProject((prev) => {
        const activePat = prev.patterns.find((p) => p.id === prev.activePatternId);
        if (!activePat) return prev;

        return {
          ...prev,
          patterns: prev.patterns.map((p) =>
            p.id === activePat.id
              ? {
                  ...p,
                  drumSteps: {
                    ...p.drumSteps,
                    [channelId]: new Array(activePat.lengthInSteps).fill(0),
                  },
                }
              : p
          ),
        };
      });
    },
    [mutateProject]
  );

  // Pattern management
  const selectPattern = useCallback(
    (patternId: string) => {
      setProject((prev) => ({ ...prev, activePatternId: patternId }));
    },
    []
  );

  const addPattern = useCallback(
    (name = 'Pattern') => {
      mutateProject((prev) => {
        const id = `pat_${Date.now()}`;
        const newPat: Pattern = {
          id,
          name: `${name} ${prev.patterns.length + 1}`,
          color: ['#f97316', '#06b6d4', '#10b981', '#a855f7', '#ec4899', '#3b82f6'][
            prev.patterns.length % 6
          ],
          lengthInSteps: 16,
          drumSteps: {},
          notes: {},
        };
        return {
          ...prev,
          patterns: [...prev.patterns, newPat],
          activePatternId: id,
        };
      });
    },
    [mutateProject]
  );

  const duplicatePattern = useCallback(
    (patternId: string) => {
      mutateProject((prev) => {
        const target = prev.patterns.find((p) => p.id === patternId);
        if (!target) return prev;
        const newId = `pat_${Date.now()}`;
        const cloned: Pattern = {
          ...JSON.parse(JSON.stringify(target)),
          id: newId,
          name: `${target.name} (Copy)`,
        };
        return {
          ...prev,
          patterns: [...prev.patterns, cloned],
          activePatternId: newId,
        };
      });
    },
    [mutateProject]
  );

  // Piano Roll Note actions
  const addOrUpdateNote = useCallback(
    (channelId: string, note: Note) => {
      mutateProject((prev) => {
        const activePat = prev.patterns.find((p) => p.id === prev.activePatternId);
        if (!activePat) return prev;

        const currentNotes = activePat.notes[channelId] || [];
        const filtered = currentNotes.filter((n) => n.id !== note.id && !(n.midi === note.midi && n.step === note.step));
        const updatedNotes = [...filtered, note];

        return {
          ...prev,
          patterns: prev.patterns.map((p) =>
            p.id === activePat.id
              ? { ...p, notes: { ...p.notes, [channelId]: updatedNotes } }
              : p
          ),
        };
      });
    },
    [mutateProject]
  );

  const deleteNote = useCallback(
    (channelId: string, noteId: string) => {
      mutateProject((prev) => {
        const activePat = prev.patterns.find((p) => p.id === prev.activePatternId);
        if (!activePat) return prev;

        const currentNotes = activePat.notes[channelId] || [];
        const updatedNotes = currentNotes.filter((n) => n.id !== noteId);

        return {
          ...prev,
          patterns: prev.patterns.map((p) =>
            p.id === activePat.id
              ? { ...p, notes: { ...p.notes, [channelId]: updatedNotes } }
              : p
          ),
        };
      });
    },
    [mutateProject]
  );

  const clearChannelNotes = useCallback(
    (channelId: string) => {
      mutateProject((prev) => {
        const activePat = prev.patterns.find((p) => p.id === prev.activePatternId);
        if (!activePat) return prev;

        return {
          ...prev,
          patterns: prev.patterns.map((p) =>
            p.id === activePat.id
              ? { ...p, notes: { ...p.notes, [channelId]: [] } }
              : p
          ),
        };
      });
    },
    [mutateProject]
  );

  // Arrangement Clips actions
  const addClip = useCallback(
    (clip: ArrangementClip) => {
      mutateProject((prev) => ({
        ...prev,
        clips: [...prev.clips, clip],
      }));
    },
    [mutateProject]
  );

  const updateClip = useCallback(
    (clipId: string, updates: Partial<ArrangementClip>) => {
      mutateProject((prev) => ({
        ...prev,
        clips: prev.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
      }));
    },
    [mutateProject]
  );

  const deleteClip = useCallback(
    (clipId: string) => {
      mutateProject((prev) => ({
        ...prev,
        clips: prev.clips.filter((c) => c.id !== clipId),
      }));
      if (selectedClipId === clipId) setSelectedClipId(null);
    },
    [mutateProject, selectedClipId]
  );

  const duplicateClip = useCallback(
    (clipId: string) => {
      mutateProject((prev) => {
        const target = prev.clips.find((c) => c.id === clipId);
        if (!target) return prev;
        const newClip: ArrangementClip = {
          ...target,
          id: `clip_${Date.now()}`,
          startStep: target.startStep + target.durationSteps,
        };
        return {
          ...prev,
          clips: [...prev.clips, newClip],
        };
      });
    },
    [mutateProject]
  );

  // Timeline Markers
  const addMarker = useCallback(
    (name: string, step: number) => {
      mutateProject((prev) => {
        const colors = ['#f97316', '#06b6d4', '#10b981', '#a855f7', '#ec4899'];
        const markers = prev.markers || [];
        const newMarker: TimelineMarker = {
          id: `marker_${Date.now()}`,
          name,
          step,
          color: colors[markers.length % colors.length],
        };
        return {
          ...prev,
          markers: [...markers, newMarker],
        };
      });
    },
    [mutateProject]
  );

  const deleteMarker = useCallback(
    (id: string) => {
      mutateProject((prev) => ({
        ...prev,
        markers: (prev.markers || []).filter((m) => m.id !== id),
      }));
    },
    [mutateProject]
  );

  // Loop Range
  const setLoopRange = useCallback(
    (startStep: number, endStep: number, enabled = true) => {
      mutateProject((prev) => ({
        ...prev,
        loopStartStep: startStep,
        loopEndStep: endStep,
        loopEnabled: enabled,
      }));
    },
    [mutateProject]
  );

  const toggleLoop = useCallback(() => {
    mutateProject((prev) => ({
      ...prev,
      loopEnabled: !prev.loopEnabled,
    }));
  }, [mutateProject]);

  // Automation Lanes
  const addAutomationLane = useCallback(
    (lane: AutomationLane) => {
      mutateProject((prev) => ({
        ...prev,
        automationLanes: [...(prev.automationLanes || []), lane],
      }));
    },
    [mutateProject]
  );

  const updateAutomationPoint = useCallback(
    (laneId: string, point: AutomationPoint) => {
      mutateProject((prev) => {
        const lanes = prev.automationLanes || [];
        return {
          ...prev,
          automationLanes: lanes.map((lane) => {
            if (lane.id !== laneId) return lane;
            const filtered = lane.points.filter((p) => p.id !== point.id && p.step !== point.step);
            return {
              ...lane,
              points: [...filtered, point].sort((a, b) => a.step - b.step),
            };
          }),
        };
      });
    },
    [mutateProject]
  );

  const deleteAutomationLane = useCallback(
    (laneId: string) => {
      mutateProject((prev) => ({
        ...prev,
        automationLanes: (prev.automationLanes || []).filter((l) => l.id !== laneId),
      }));
    },
    [mutateProject]
  );

  // Channel & Mixer adjustments
  const updateChannel = useCallback(
    (channelId: string, updates: Partial<ChannelRackChannel>) => {
      mutateProject((prev) => ({
        ...prev,
        channels: prev.channels.map((c) => (c.id === channelId ? { ...c, ...updates } : c)),
      }));
    },
    [mutateProject]
  );

  const updateMixerChannel = useCallback(
    (mixerId: number, updates: Partial<MixerChannel>) => {
      mutateProject((prev) => ({
        ...prev,
        mixerChannels: prev.mixerChannels.map((c) =>
          c.id === mixerId ? { ...c, ...updates } : c
        ),
      }));
    },
    [mutateProject]
  );

  const updateMixerEffect = useCallback(
    (mixerId: number, effectId: string, updates: Partial<EffectConfig>) => {
      mutateProject((prev) => ({
        ...prev,
        mixerChannels: prev.mixerChannels.map((c) => {
          if (c.id !== mixerId) return c;
          return {
            ...c,
            effects: c.effects.map((e) => (e.id === effectId ? { ...e, ...updates } : e)),
          };
        }),
      }));
    },
    [mutateProject]
  );

  // Modular Plugin Architecture Actions
  const addMixerPlugin = useCallback(
    (mixerId: number, type: EffectType) => {
      mutateProject((prev) => {
        const newFx = PluginRegistry.createDefaultConfig(type);
        return {
          ...prev,
          mixerChannels: prev.mixerChannels.map((c) =>
            c.id === mixerId ? { ...c, effects: [...c.effects, newFx] } : c
          ),
        };
      });
    },
    [mutateProject]
  );

  const removeMixerPlugin = useCallback(
    (mixerId: number, effectId: string) => {
      mutateProject((prev) => ({
        ...prev,
        mixerChannels: prev.mixerChannels.map((c) =>
          c.id === mixerId ? { ...c, effects: c.effects.filter((e) => e.id !== effectId) } : c
        ),
      }));
    },
    [mutateProject]
  );

  const reorderMixerPlugins = useCallback(
    (mixerId: number, fromIndex: number, toIndex: number) => {
      mutateProject((prev) => {
        return {
          ...prev,
          mixerChannels: prev.mixerChannels.map((c) => {
            if (c.id !== mixerId) return c;
            const updated = [...c.effects];
            const [moved] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, moved);
            return { ...c, effects: updated };
          }),
        };
      });
    },
    [mutateProject]
  );

  const setMixerPluginBypass = useCallback(
    (mixerId: number, effectId: string, bypass: boolean) => {
      updateMixerEffect(mixerId, effectId, { enabled: !bypass });
    },
    [updateMixerEffect]
  );

  const updateMixerPluginParams = useCallback(
    (mixerId: number, effectId: string, params: Record<string, any>) => {
      mutateProject((prev) => ({
        ...prev,
        mixerChannels: prev.mixerChannels.map((c) => {
          if (c.id !== mixerId) return c;
          return {
            ...c,
            effects: c.effects.map((e) =>
              e.id === effectId ? { ...e, params: { ...e.params, ...params } } : e
            ),
          };
        }),
      }));
    },
    [mutateProject]
  );

  // Mastering Suite Actions
  const updateMasteringSession = useCallback(
    (updates: Partial<MasteringSession>) => {
      mutateProject((prev) => {
        const currentSession = prev.masteringSession || {
          processors: [],
          bypassAll: false,
          targetLufs: -14,
          referenceGainDb: 0,
          matchLoudness: false,
          outputCeiling: -0.2,
          ditherType: 'tpdf' as const,
        };
        const updated = { ...currentSession, ...updates };
        audioEngine.mixer.mastering.applySessionConfig(updated);
        return {
          ...prev,
          masteringSession: updated,
        };
      });
    },
    [mutateProject, audioEngine]
  );

  const updateMasteringProcessor = useCallback(
    (procId: string, updates: Partial<MasteringProcessorConfig>) => {
      mutateProject((prev) => {
        if (!prev.masteringSession) return prev;
        const updatedProcs = prev.masteringSession.processors.map((p) =>
          p.id === procId ? { ...p, ...updates } : p
        );
        const updatedSession = { ...prev.masteringSession, processors: updatedProcs };
        audioEngine.mixer.mastering.applySessionConfig(updatedSession);
        return {
          ...prev,
          masteringSession: updatedSession,
        };
      });
    },
    [mutateProject, audioEngine]
  );

  const reorderMasteringProcessors = useCallback(
    (fromIndex: number, toIndex: number) => {
      mutateProject((prev) => {
        if (!prev.masteringSession) return prev;
        const procs = [...prev.masteringSession.processors];
        const [moved] = procs.splice(fromIndex, 1);
        procs.splice(toIndex, 0, moved);
        const updatedSession = { ...prev.masteringSession, processors: procs };
        audioEngine.mixer.mastering.applySessionConfig(updatedSession);
        return {
          ...prev,
          masteringSession: updatedSession,
        };
      });
    },
    [mutateProject, audioEngine]
  );

  const updateProjectTracks = useCallback(
    (tracks: Track[]) => {
      mutateProject((prev) => ({
        ...prev,
        tracks,
      }));
    },
    [mutateProject]
  );

  // Genre Starter Templates
  const loadTemplate = useCallback(
    (genre: 'trap' | 'house' | 'synthwave' | 'lofi' | 'ambient') => {
      const fresh = createDefaultProject();
      fresh.name = `${genre.toUpperCase()} Session`;

      if (genre === 'house') {
        fresh.bpm = 126;
        fresh.patterns[0].drumSteps = AlgorithmicMusicGen.generateDrumPattern('house');
      } else if (genre === 'trap') {
        fresh.bpm = 140;
        fresh.patterns[0].drumSteps = AlgorithmicMusicGen.generateDrumPattern('trap');
      } else if (genre === 'lofi') {
        fresh.bpm = 85;
        fresh.patterns[0].drumSteps = AlgorithmicMusicGen.generateDrumPattern('boombap');
      } else if (genre === 'ambient') {
        fresh.bpm = 95;
      }

      pushHistory(project);
      setProject(fresh);
      audioEngine.setProject(fresh);
      ProjectStorage.saveProject(fresh);
    },
    [project, pushHistory, audioEngine]
  );

  const loadProject = useCallback(
    (loaded: Project) => {
      pushHistory(project);
      setProject(loaded);
      audioEngine.setProject(loaded);
      ProjectStorage.saveProject(loaded);
    },
    [project, pushHistory, audioEngine]
  );

  const resetProject = useCallback(() => {
    const fresh = createDefaultProject();
    pushHistory(project);
    setProject(fresh);
    audioEngine.setProject(fresh);
    ProjectStorage.saveProject(fresh);
  }, [project, pushHistory, audioEngine]);

  return {
    project,
    activeTab,
    setActiveTab,
    activeChannelId,
    setActiveChannelId,
    playbackMode,
    switchPlaybackMode,
    isPlaying,
    currentStep,
    metronome,
    zoomLevel,
    setZoomLevel,
    selectedClipId,
    setSelectedClipId,
    selectedNoteId,
    setSelectedNoteId,
    scaleKey,
    setScaleKey,
    scaleType,
    setScaleType,
    ghostNotesEnabled,
    setGhostNotesEnabled,
    theme,
    setTheme,
    togglePlay,
    stopPlayback,
    setBpm,
    setSwing,
    toggleMetronome,
    toggleStep,
    setStepVelocity,
    setStepModifier,
    fillStepsPattern,
    clearChannelSteps,
    selectPattern,
    addPattern,
    duplicatePattern,
    addOrUpdateNote,
    deleteNote,
    clearChannelNotes,
    addClip,
    updateClip,
    deleteClip,
    duplicateClip,
    addMarker,
    deleteMarker,
    setLoopRange,
    toggleLoop,
    addAutomationLane,
    updateAutomationPoint,
    deleteAutomationLane,
    updateChannel,
    updateMixerChannel,
    updateMixerEffect,
    addMixerPlugin,
    removeMixerPlugin,
    reorderMixerPlugins,
    setMixerPluginBypass,
    updateMixerPluginParams,
    updateMasteringSession,
    updateMasteringProcessor,
    reorderMasteringProcessors,
    updateProjectTracks,
    loadTemplate,
    loadProject,
    resetProject,
    undo,
    redo,
    audioEngine,
  };
}
