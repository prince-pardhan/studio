/**
 * BeatFlow Studio - Advanced Virtual Instrument Engine
 * Polyphonic subtractive synthesis, FM Rhodes keys, warm poly pads,
 * with LFO modulation, 3-voice unison detune, and portamento glide.
 */
import { SynthPreset, SynthParams } from '../types/project';

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function pitchToMidi(pitch: string): number {
  const noteMap: Record<string, number> = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
    E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8,
    Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
  };
  const match = pitch.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 60;
  const note = match[1];
  const octave = parseInt(match[2], 10);
  return (octave + 1) * 12 + noteMap[note];
}

export const DEFAULT_SYNTH_PARAMS: Record<SynthPreset, SynthParams> = {
  lead: {
    oscillatorType: 'sawtooth',
    attack: 0.01,
    decay: 0.2,
    sustain: 0.6,
    release: 0.25,
    filterCutoff: 3800,
    filterResonance: 4.0,
    filterType: 'lowpass',
    unisonVoices: 2,
    unisonDetune: 8,
    portamento: 0.04,
    lfo: { enabled: true, shape: 'triangle', rate: 4.5, depth: 0.2, target: 'cutoff' },
  },
  pad: {
    oscillatorType: 'sawtooth',
    attack: 0.4,
    decay: 0.6,
    sustain: 0.8,
    release: 0.8,
    filterCutoff: 1800,
    filterResonance: 2.0,
    filterType: 'lowpass',
    unisonVoices: 3,
    unisonDetune: 12,
    lfo: { enabled: true, shape: 'sine', rate: 0.8, depth: 0.35, target: 'cutoff' },
  },
  bass: {
    oscillatorType: 'sawtooth',
    attack: 0.005,
    decay: 0.25,
    sustain: 0.3,
    release: 0.15,
    filterCutoff: 900,
    filterResonance: 5.5,
    filterType: 'lowpass',
    portamento: 0.03,
  },
  pluck: {
    oscillatorType: 'triangle',
    attack: 0.002,
    decay: 0.18,
    sustain: 0.05,
    release: 0.12,
    filterCutoff: 4500,
    filterResonance: 3.5,
    filterType: 'lowpass',
  },
  epiano: {
    oscillatorType: 'sine',
    attack: 0.005,
    decay: 0.45,
    sustain: 0.4,
    release: 0.35,
    filterCutoff: 3200,
    filterResonance: 1.5,
    filterType: 'lowpass',
  },
  sub_808: {
    oscillatorType: 'sine',
    attack: 0.01,
    decay: 0.3,
    sustain: 0.9,
    release: 0.4,
    filterCutoff: 450,
    filterResonance: 1.0,
    filterType: 'lowpass',
    portamento: 0.06,
  },
  organ: {
    oscillatorType: 'sine',
    attack: 0.01,
    decay: 0.1,
    sustain: 0.9,
    release: 0.15,
    filterCutoff: 5000,
    filterResonance: 1.0,
    filterType: 'lowpass',
  },
};

export class InstrumentEngine {
  private ctx: AudioContext | BaseAudioContext;
  private lastMidiFreq = 440;

  constructor(ctx: AudioContext | BaseAudioContext) {
    this.ctx = ctx;
  }

  triggerNote(
    preset: SynthPreset = 'lead',
    customParams: SynthParams | undefined,
    midiNote: number,
    durationSec: number,
    destination: AudioNode,
    startTime: number = this.ctx.currentTime,
    velocity: number = 0.8
  ): void {
    const params = { ...(DEFAULT_SYNTH_PARAMS[preset] || DEFAULT_SYNTH_PARAMS.lead), ...(customParams || {}) };
    const targetFreq = midiToFreq(midiNote);
    const vel = Math.max(0.01, Math.min(1.0, velocity));

    if (preset === 'epiano') {
      this.playFMKeys(targetFreq, durationSec, destination, startTime, vel, params);
      return;
    }

    if (preset === 'pad') {
      this.playPolyPad(targetFreq, durationSec, destination, startTime, vel, params);
      return;
    }

    this.playSubtractiveVoice(targetFreq, durationSec, destination, startTime, vel, params);
    this.lastMidiFreq = targetFreq;
  }

  private playSubtractiveVoice(
    freq: number,
    duration: number,
    destination: AudioNode,
    time: number,
    vel: number,
    params: SynthParams
  ): void {
    const voices = params.unisonVoices || 1;
    const detuneCents = params.unisonDetune || 8;
    const glideTime = params.portamento || 0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = params.filterType;
    filter.frequency.setValueAtTime(Math.min(20000, params.filterCutoff * (0.5 + 0.5 * vel)), time);
    filter.Q.setValueAtTime(params.filterResonance, time);

    const envDecay = Math.max(0.05, params.decay);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(60, params.filterCutoff * (params.sustain * 0.7 + 0.1)),
      time + envDecay
    );

    // LFO Modulation on filter cutoff
    if (params.lfo && params.lfo.enabled) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = params.lfo.shape;
      lfo.frequency.setValueAtTime(params.lfo.rate, time);
      lfoGain.gain.setValueAtTime(params.filterCutoff * params.lfo.depth * 0.5, time);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(time);
      lfo.stop(time + duration + params.release);
    }

    const masterGain = this.ctx.createGain();
    const a = Math.max(0.002, params.attack);
    const d = Math.max(0.01, params.decay);
    const s = Math.max(0.001, params.sustain * vel);
    const r = Math.max(0.02, params.release);
    const stopTime = time + duration + r;

    masterGain.gain.setValueAtTime(0.0001, time);
    masterGain.gain.linearRampToValueAtTime(vel * 0.45, time + a);
    masterGain.gain.exponentialRampToValueAtTime(s * 0.45, time + a + d);
    masterGain.gain.setValueAtTime(s * 0.45, time + duration);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    // Unison oscillators
    const detuneOffsets = voices === 3 ? [-detuneCents, 0, detuneCents] : voices === 2 ? [-detuneCents / 2, detuneCents / 2] : [0];

    for (const offset of detuneOffsets) {
      const osc = this.ctx.createOscillator();
      osc.type = params.oscillatorType;

      if (glideTime > 0.005) {
        osc.frequency.setValueAtTime(this.lastMidiFreq, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + glideTime);
      } else {
        osc.frequency.setValueAtTime(freq, time);
      }
      osc.detune.setValueAtTime(offset, time);

      osc.connect(filter);
      osc.start(time);
      osc.stop(stopTime);
    }

    filter.connect(masterGain);
    masterGain.connect(destination);
  }

  private playPolyPad(
    freq: number,
    duration: number,
    destination: AudioNode,
    time: number,
    vel: number,
    params: SynthParams
  ): void {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 0.997, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(params.filterCutoff, time);
    filter.Q.setValueAtTime(params.filterResonance, time);

    const a = Math.max(0.1, params.attack);
    const r = Math.max(0.2, params.release);
    const stopTime = time + duration + r;

    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.linearRampToValueAtTime(vel * 0.35, time + a);
    gainNode.gain.setValueAtTime(params.sustain * vel * 0.35, time + duration);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
  }

  private playFMKeys(
    freq: number,
    duration: number,
    destination: AudioNode,
    time: number,
    vel: number,
    params: SynthParams
  ): void {
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const masterGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, time);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 2, time);

    const modIndex = freq * (1.5 + vel * 2.5);
    modGain.gain.setValueAtTime(modIndex, time);
    modGain.gain.exponentialRampToValueAtTime(0.1, time + Math.min(duration, 0.4));

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(params.filterCutoff, time);

    const a = Math.max(0.002, params.attack);
    const d = Math.max(0.1, params.decay);
    const s = Math.max(0.01, params.sustain * vel);
    const r = Math.max(0.05, params.release);
    const stopTime = time + duration + r;

    masterGain.gain.setValueAtTime(0.0001, time);
    masterGain.gain.linearRampToValueAtTime(vel * 0.5, time + a);
    masterGain.gain.exponentialRampToValueAtTime(s * 0.5, time + a + d);
    masterGain.gain.setValueAtTime(s * 0.5, time + duration);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    carrier.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(destination);

    carrier.start(time);
    modulator.start(time);
    carrier.stop(stopTime);
    modulator.stop(stopTime);
  }
}
