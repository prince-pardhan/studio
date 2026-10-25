export interface Note {
  id: string;
  pitch: string; // e.g. "C4", "F#3"
  midi: number;  // 0 - 127
  step: number;  // position in 16th notes relative to pattern start
  duration: number; // in 16th notes (e.g. 1 = 16th note, 4 = quarter note)
  velocity: number; // 0.0 - 1.0
  pitchBend?: number; // -1.0 to 1.0 (cents)
}

export type DrumType =
  | 'kick'
  | 'snare'
  | 'clap'
  | 'hihat_closed'
  | 'hihat_open'
  | 'perc'
  | 'tom'
  | '808_bass';

export type SynthPreset =
  | 'lead'
  | 'pad'
  | 'bass'
  | 'pluck'
  | 'epiano'
  | 'sub_808'
  | 'organ';

export interface LFOParams {
  enabled: boolean;
  shape: 'sine' | 'triangle' | 'square' | 'sawtooth';
  rate: number; // Hz (0.1 to 20)
  depth: number; // 0 to 1
  target: 'cutoff' | 'pitch' | 'pan';
}

export interface SynthParams {
  oscillatorType: 'sine' | 'square' | 'triangle' | 'sawtooth';
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterCutoff: number; // Hz (20 - 20000)
  filterResonance: number; // Q (0.1 - 20)
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  unisonVoices?: number; // 1 to 3
  unisonDetune?: number; // cents (0 to 50)
  portamento?: number; // seconds (0 to 0.5)
  lfo?: LFOParams;
}

export interface StepModifier {
  probability?: number; // 0.0 to 1.0 (default 1.0)
  pitchOffset?: number; // -12 to +12 semitones
  roll?: number;        // 1 (normal), 2 (flam/double), 3 (triplet roll), 4 (quad roll)
}

export interface ChannelRackChannel {
  id: string;
  name: string;
  type: 'drum' | 'synth';
  drumType?: DrumType;
  synthPreset?: SynthPreset;
  customSampleId?: string;
  color: string;
  volume: number; // 0.0 - 1.0 (default 0.8)
  pan: number;    // -1.0 to 1.0 (default 0)
  mute: boolean;
  solo: boolean;
  mixerChannel: number; // 1 to 8 (0 is master)
  chokeGroup?: number;  // e.g. 1 (Open hat choked by closed hat)
  synthParams?: SynthParams;
}

export interface Pattern {
  id: string;
  name: string;
  color: string;
  lengthInSteps: number; // 16, 32, 64
  drumSteps: Record<string, number[]>; // channelId -> array of velocity values
  drumModifiers?: Record<string, Record<number, StepModifier>>; // channelId -> stepIndex -> modifiers
  notes: Record<string, Note[]>;        // channelId -> Piano Roll notes
}

export interface ArrangementClip {
  id: string;
  trackIndex: number;
  startStep: number;     // 16th notes from song start
  durationSteps: number; // 16th notes length
  type: 'pattern' | 'audio';
  patternId?: string;
  audioAssetId?: string;
  name: string;
  color: string;
  offsetSteps?: number;
  gain?: number;         // 0.0 to 2.0 (default 1.0)
  fadeInSteps?: number;  // steps
  fadeOutSteps?: number; // steps
}

export interface TimelineMarker {
  id: string;
  name: string;
  step: number;
  color: string;
}

export type AutomationTarget =
  | 'master_volume'
  | 'track_volume'
  | 'filter_cutoff'
  | 'mixer_pan'
  | 'reverb_wet'
  | 'delay_feedback';

export interface AutomationPoint {
  id: string;
  step: number;
  value: number; // normalized 0.0 to 1.0
}

export interface AutomationLane {
  id: string;
  name: string;
  target: AutomationTarget;
  targetId?: string; // trackId or channelId
  points: AutomationPoint[];
  color: string;
  enabled: boolean;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  volume: number; // 0.0 - 1.0
  pan: number;    // -1.0 - 1.0
  mute: boolean;
  solo: boolean;
  height: number;
  isLocked?: boolean;
  groupId?: string;
}

export type EffectType =
  | 'parametric_eq'
  | 'eq3'
  | 'compressor'
  | 'limiter'
  | 'noise_gate'
  | 'expander'
  | 'reverb'
  | 'delay'
  | 'chorus'
  | 'flanger'
  | 'phaser'
  | 'distortion'
  | 'bitcrusher'
  | 'stereowidth'
  | 'autopan'
  | 'tremolo'
  | 'filter'
  | 'transient_shaper'
  | 'pitch_shifter';

export type PluginCategory =
  | 'eq'
  | 'dynamics'
  | 'reverb'
  | 'delay'
  | 'modulation'
  | 'distortion'
  | 'utility'
  | 'mastering';

export interface PluginParamDef {
  id: string;
  name: string;
  type: 'number' | 'enum' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  defaultVal: number | string | boolean;
  unit?: string;
  options?: { label: string; value: string | number }[];
  description?: string;
}

export interface PluginPreset {
  id: string;
  name: string;
  pluginId: EffectType;
  params: Record<string, any>;
  isFactory?: boolean;
}

export interface PluginDefinition {
  id: EffectType;
  name: string;
  category: PluginCategory;
  description: string;
  params: PluginParamDef[];
  factoryPresets: PluginPreset[];
  iconName?: string;
  isMasteringGrade?: boolean;
}

export interface EffectConfig {
  id: string;
  type: EffectType;
  name: string;
  enabled: boolean;
  params: Record<string, any>;
  presetName?: string;
}

export interface MixerChannel {
  id: number; // 0 = Master, 1-8 = Inserts, 9-10 = Sends
  name: string;
  color: string;
  volume: number; // -60 to +6 dB (0 dB is unity)
  pan: number;    // -1.0 to 1.0
  mute: boolean;
  solo: boolean;
  effects: EffectConfig[];
  sendA?: number; // 0.0 to 1.0 (Reverb Send)
  sendB?: number; // 0.0 to 1.0 (Delay Send)
}

export interface AudioAsset {
  id: string;
  name: string;
  duration: number; // seconds
  sampleRate: number;
  channels: number;
  createdAt: number;
  peaks?: number[]; // normalized waveform points (0-1) for UI rendering
  dataUrl?: string; // base64 or blob URL
  startTime?: number; // trimmed start (sec)
  endTime?: number;   // trimmed end (sec)
  reversed?: boolean;
  pitchShift?: number; // semitones (-12 to +12)
}

export type ThemeMode = 'dark' | 'cyber' | 'light';

export type MasteringProcessorType =
  | 'mastering_eq'
  | 'multiband_dynamics'
  | 'stereo_imager'
  | 'analog_saturation'
  | 'brickwall_limiter';

export interface MasteringProcessorConfig {
  id: string;
  type: MasteringProcessorType;
  name: string;
  enabled: boolean;
  params: Record<string, any>;
}

export interface MasteringSession {
  processors: MasteringProcessorConfig[];
  bypassAll: boolean;
  targetLufs: number; // -14 for streaming, -9 for club, etc.
  referenceTrackAssetId?: string;
  referenceGainDb: number;
  matchLoudness: boolean;
  outputCeiling: number; // dBFS (e.g. -0.1)
  ditherType: 'none' | 'tpdf';
}

export type ProjectType =
  | 'empty'
  | 'beat'
  | 'song'
  | 'podcast'
  | 'remix'
  | 'live'
  | 'mastering';

export type Genre =
  | 'hiphop'
  | 'trap'
  | 'lofi'
  | 'edm'
  | 'house'
  | 'techno'
  | 'pop'
  | 'rock'
  | 'ambient'
  | 'cinematic'
  | 'bollywood'
  | 'classical_indian'
  | 'punjabi'
  | 'drill'
  | 'dnb';

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  projectType: ProjectType;
  genre?: string;
  bpm: number;
  timeSignature: [number, number];
  trackCount: number;
  patternCount: number;
  durationSeconds: number;
  coverColor?: string;
  tags?: string[];
  isFavorite?: boolean;
  sampleRate?: number;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface NewProjectOptions {
  name: string;
  description?: string;
  projectType: ProjectType;
  genre?: Genre | 'blank';
  bpm?: number;
  timeSignature?: [number, number];
  sampleRate?: number;
  outputConfig?: string;
  coverColor?: string;
  tags?: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  projectType?: ProjectType;
  genre?: Genre | string;
  coverColor?: string;
  tags?: string[];
  isFavorite?: boolean;
  sampleRate?: number;
  outputConfig?: string;
  version?: number;
  bpm: number;
  timeSignature: [number, number]; // [4, 4]
  swing: number; // 0 to 1
  patterns: Pattern[];
  activePatternId: string;
  channels: ChannelRackChannel[];
  tracks: Track[];
  clips: ArrangementClip[];
  mixerChannels: MixerChannel[];
  markers?: TimelineMarker[];
  automationLanes?: AutomationLane[];
  loopStartStep?: number;
  loopEndStep?: number;
  loopEnabled?: boolean;
  theme?: ThemeMode;
  masteringSession?: MasteringSession;
  createdAt: number;
  updatedAt: number;
}

export type PlaybackMode = 'song' | 'pattern';
export type ActiveTab =
  | 'playlist'
  | 'pianoroll'
  | 'channelrack'
  | 'mixer'
  | 'performance'
  | 'dj'
  | 'mastering';

export type ScaleKey = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type ScaleType =
  | 'major'
  | 'minor'
  | 'harmonic_minor'
  | 'pentatonic'
  | 'blues'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian';
