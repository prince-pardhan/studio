/**
 * BeatFlow Studio - Central Real-Time Audio Engine
 * Coordinates Web Audio context, precise lookahead scheduling, mixer routing,
 * drum synthesis with choke groups, virtual instruments with LFO/unison,
 * real-time parameter automation lanes, and transport synchronization.
 */
import * as Tone from 'tone';
import { Project, PlaybackMode, Note, DrumType, AutomationLane } from '../types/project';
import { DrumSynthEngine } from './DrumSynthEngine';
import { InstrumentEngine } from './InstrumentEngine';
import { MixerEngine } from './MixerEngine';

export type TransportListener = (currentStep: number, isPlaying: boolean) => void;

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  public ctx!: AudioContext;
  public drumSynth!: DrumSynthEngine;
  public instrumentEngine!: InstrumentEngine;
  public mixer!: MixerEngine;

  private isRunning = false;
  private isPaused = false;
  private playbackMode: PlaybackMode = 'pattern';

  // Musical timing
  private bpm = 128;
  private timeSignature: [number, number] = [4, 4];
  private currentStep = 0; // in 16th notes
  private lookaheadMs = 25.0; // scheduling interval (ms)
  private scheduleAheadTime = 0.1; // lookahead window (sec)
  private nextStepTime = 0.0;
  private timerId: number | null = null;

  // Active Project Reference
  private project: Project | null = null;
  public audioBufferCache: Map<string, AudioBuffer> = new Map();

  // Metronome
  public metronomeEnabled = false;

  // CPU Load Tracker
  public cpuLoad = 12; // estimated %
  private lastProcessTime = 0;

  // Listeners for UI playhead sync
  private transportListeners: Set<TransportListener> = new Set();

  private constructor() {
    this.initAudioContext();
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private initAudioContext(): void {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();
    Tone.setContext(this.ctx);

    this.mixer = new MixerEngine(this.ctx);
    this.drumSynth = new DrumSynthEngine(this.ctx);
    this.instrumentEngine = new InstrumentEngine(this.ctx);
  }

  async ensureContextStarted(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    await Tone.start();
  }

  setProject(project: Project): void {
    this.project = project;
    this.bpm = project.bpm;
    this.timeSignature = project.timeSignature;
    this.syncMixerChannels();
  }

  syncMixerChannels(): void {
    if (!this.project) return;
    const hasAnySolo = this.project.mixerChannels.some((c) => c.solo);
    for (const ch of this.project.mixerChannels) {
      this.mixer.updateChannel(ch, hasAnySolo);
    }
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(40, Math.min(240, bpm));
  }

  setTimeSignature(sig: [number, number]): void {
    this.timeSignature = sig;
  }

  setPlaybackMode(mode: PlaybackMode): void {
    this.playbackMode = mode;
  }

  getPlaybackMode(): PlaybackMode {
    return this.playbackMode;
  }

  subscribeTransport(listener: TransportListener): () => void {
    this.transportListeners.add(listener);
    return () => this.transportListeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.transportListeners) {
      listener(this.currentStep, this.isRunning);
    }
  }

  async play(): Promise<void> {
    await this.ensureContextStarted();
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    this.scheduler();
    this.timerId = window.setInterval(() => this.scheduler(), this.lookaheadMs);
    this.notifyListeners();
  }

  pause(): void {
    this.isRunning = false;
    this.isPaused = true;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notifyListeners();
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.currentStep = 0;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notifyListeners();
  }

  seekToStep(step: number): void {
    this.currentStep = Math.max(0, step);
    this.notifyListeners();
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  getIsPlaying(): boolean {
    return this.isRunning;
  }

  // Lookahead Scheduler
  private scheduler(): void {
    if (!this.isRunning) return;
    const t0 = performance.now();

    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }

    const t1 = performance.now();
    // Rough estimate of audio thread load
    this.cpuLoad = Math.min(100, Math.round(((t1 - t0) / this.lookaheadMs) * 100 + 8));
  }

  private advanceStep(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPer16th = secondsPerBeat / 4.0;

    const swingAmount = this.project?.swing ?? 0;
    const isOddStep = this.currentStep % 2 === 1;
    const swingDelay = isOddStep ? swingAmount * (secondsPer16th * 0.33) : 0;

    this.nextStepTime += secondsPer16th + swingDelay;

    if (this.playbackMode === 'pattern') {
      const activePattern = this.getActivePattern();
      const length = activePattern?.lengthInSteps || 16;
      this.currentStep = (this.currentStep + 1) % length;
    } else {
      // Song mode with optional loop markers
      const totalSteps = this.getSongTotalSteps();
      const loopStart = this.project?.loopStartStep ?? 0;
      const loopEnd = this.project?.loopEndStep ?? totalSteps;

      if (this.project?.loopEnabled && this.project.loopEndStep && this.project.loopEndStep > loopStart) {
        if (this.currentStep + 1 >= loopEnd) {
          this.currentStep = loopStart;
        } else {
          this.currentStep++;
        }
      } else {
        this.currentStep = (this.currentStep + 1) % Math.max(64, totalSteps);
      }
    }

    this.notifyListeners();
  }

  private scheduleStep(step: number, time: number): void {
    if (!this.project) return;

    // Process automation curves for this step
    this.processAutomationAtStep(step, time);

    // Metronome click on quarter notes
    if (this.metronomeEnabled && step % 4 === 0) {
      const isDownbeat = step % 16 === 0;
      this.playMetronomeClick(time, isDownbeat);
    }

    if (this.playbackMode === 'pattern') {
      const pattern = this.getActivePattern();
      if (!pattern) return;
      this.playPatternAtStep(pattern, step, time);
    } else {
      this.playSongAtStep(step, time);
    }
  }

  private processAutomationAtStep(step: number, time: number): void {
    if (!this.project?.automationLanes) return;

    for (const lane of this.project.automationLanes) {
      if (!lane.enabled || lane.points.length === 0) continue;

      // Find interpolated value at this step
      const val = this.interpolateAutomation(lane.points, step);

      if (lane.target === 'master_volume') {
        const dB = (val - 1.0) * 40; // 1.0 = 0dB, 0.0 = -40dB
        const masterFader = (this.mixer as any).channels?.get(0)?.faderGain;
        if (masterFader) {
          masterFader.gain.setValueAtTime(val <= 0.01 ? 0 : Math.pow(10, dB / 20), time);
        }
      } else if (lane.target === 'filter_cutoff') {
        const hz = 60 + Math.pow(val, 2) * 18000;
        for (const ch of this.project.mixerChannels) {
          const eqHigh = (this.mixer as any).channels?.get(ch.id)?.eqHigh;
          if (eqHigh) eqHigh.frequency.setValueAtTime(hz, time);
        }
      } else if (lane.target === 'reverb_wet') {
        for (const ch of this.project.mixerChannels) {
          const rWet = (this.mixer as any).channels?.get(ch.id)?.reverbWet;
          if (rWet) rWet.gain.setValueAtTime(val, time);
        }
      }
    }
  }

  private interpolateAutomation(points: AutomationLane['points'], step: number): number {
    if (points.length === 1) return points[0].value;
    const sorted = [...points].sort((a, b) => a.step - b.step);

    if (step <= sorted[0].step) return sorted[0].value;
    if (step >= sorted[sorted.length - 1].step) return sorted[sorted.length - 1].value;

    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      if (step >= p1.step && step <= p2.step) {
        const progress = (step - p1.step) / (p2.step - p1.step);
        return p1.value + progress * (p2.value - p1.value);
      }
    }
    return 0.5;
  }

  private playPatternAtStep(
    pattern: NonNullable<ReturnType<typeof this.getActivePattern>>,
    step: number,
    time: number
  ): void {
    if (!this.project) return;
    const secondsPer16th = (60.0 / this.bpm) / 4.0;
    const hasSoloChannel = this.project.channels.some((c) => c.solo);

    for (const channel of this.project.channels) {
      if (channel.mute) continue;
      if (hasSoloChannel && !channel.solo) continue;

      const dest = this.mixer.getChannelInput(channel.mixerChannel);

      if (channel.type === 'drum' && channel.drumType) {
        const velocities = pattern.drumSteps[channel.id];
        if (velocities && velocities[step] > 0) {
          // Check step modifier (probability, pitch, roll)
          const mod = pattern.drumModifiers?.[channel.id]?.[step];
          const prob = mod?.probability ?? 1.0;

          if (Math.random() <= prob) {
            const vel = velocities[step] * channel.volume;
            const pitchOffset = mod?.pitchOffset ?? 0;
            const roll = mod?.roll ?? 1;

            this.drumSynth.triggerDrum(
              channel.drumType,
              dest,
              time,
              vel,
              pitchOffset,
              roll
            );
          }
        }
      } else if (channel.type === 'synth') {
        const notes = pattern.notes[channel.id];
        if (notes) {
          for (const n of notes) {
            if (n.step === step) {
              const durSec = n.duration * secondsPer16th;
              this.instrumentEngine.triggerNote(
                channel.synthPreset || 'lead',
                channel.synthParams,
                n.midi,
                durSec,
                dest,
                time,
                n.velocity * channel.volume
              );
            }
          }
        }
      }
    }
  }

  private playSongAtStep(step: number, time: number): void {
    if (!this.project) return;
    const secondsPer16th = (60.0 / this.bpm) / 4.0;
    const hasSoloTrack = this.project.tracks.some((t) => t.solo);

    for (const clip of this.project.clips) {
      const track = this.project.tracks[clip.trackIndex];
      if (!track || track.mute) continue;
      if (hasSoloTrack && !track.solo) continue;

      if (step >= clip.startStep && step < clip.startStep + clip.durationSteps) {
        const relativeStep = step - clip.startStep;

        if (clip.type === 'pattern' && clip.patternId) {
          const pattern = this.project.patterns.find((p) => p.id === clip.patternId);
          if (pattern) {
            const patternStep = relativeStep % pattern.lengthInSteps;
            this.playPatternAtStep(pattern, patternStep, time);
          }
        } else if (clip.type === 'audio' && clip.audioAssetId && relativeStep === 0) {
          this.playAudioClip(clip.audioAssetId, time, track.volume * (clip.gain ?? 1.0));
        }
      }
    }
  }

  private playMetronomeClick(time: number, isDownbeat: boolean): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(isDownbeat ? 1400 : 900, time);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.mixer.getChannelInput(0));

    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playAudioClip(assetId: string, time: number, volume: number): void {
    const buffer = this.audioBufferCache.get(assetId);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);

    source.connect(gain);
    gain.connect(this.mixer.getChannelInput(1));
    source.start(time);
  }

  cacheAudioBuffer(assetId: string, buffer: AudioBuffer): void {
    this.audioBufferCache.set(assetId, buffer);
  }

  auditionDrum(drumType: DrumType, mixerChannel = 0, velocity = 0.8, pitchOffset = 0): void {
    this.ensureContextStarted();
    const dest = this.mixer.getChannelInput(mixerChannel);
    this.drumSynth.triggerDrum(drumType, dest, this.ctx.currentTime, velocity, pitchOffset);
  }

  auditionNote(
    preset: any,
    midiNote: number,
    durationSec = 0.5,
    mixerChannel = 0,
    velocity = 0.8
  ): void {
    this.ensureContextStarted();
    const dest = this.mixer.getChannelInput(mixerChannel);
    this.instrumentEngine.triggerNote(
      preset,
      undefined,
      midiNote,
      durationSec,
      dest,
      this.ctx.currentTime,
      velocity
    );
  }

  private getActivePattern() {
    if (!this.project) return null;
    return this.project.patterns.find((p) => p.id === this.project?.activePatternId) || this.project.patterns[0];
  }

  private getSongTotalSteps(): number {
    if (!this.project || this.project.clips.length === 0) return 64;
    let max = 64;
    for (const clip of this.project.clips) {
      const end = clip.startStep + clip.durationSteps;
      if (end > max) max = end;
    }
    return Math.ceil(max / 16) * 16;
  }
}
