/**
 * BeatFlow Studio - Advanced Drum Synthesis Engine
 * Real-time synthesis with choke groups (Open hat choked by Closed hat),
 * per-step probability, pitch shifts, and flam/roll micro-bursts.
 */
import { DrumType } from '../types/project';

export class DrumSynthEngine {
  private ctx: AudioContext | BaseAudioContext;
  private openHatGain: GainNode | null = null; // for choke group

  constructor(ctx: AudioContext | BaseAudioContext) {
    this.ctx = ctx;
  }

  triggerDrum(
    type: DrumType,
    destination: AudioNode,
    time: number = this.ctx.currentTime,
    velocity: number = 0.8,
    pitchOffset = 0,
    roll = 1
  ): void {
    const vel = Math.max(0.01, Math.min(1.0, velocity));
    const pitchRatio = Math.pow(2, pitchOffset / 12);

    // If Closed hat is triggered, choke the active Open hat
    if (type === 'hihat_closed' && this.openHatGain) {
      try {
        this.openHatGain.gain.setValueAtTime(this.openHatGain.gain.value, time);
        this.openHatGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.01);
      } catch {
        // ignore
      }
    }

    // Handle rolls / flam bursts (e.g. roll = 2 triggers 2 hits spaced 20ms apart)
    const bursts = Math.max(1, Math.min(4, roll));
    const burstInterval = 0.025; // 25ms between micro-hits

    for (let b = 0; b < bursts; b++) {
      const burstTime = time + b * burstInterval;
      const burstVel = b === 0 ? vel : vel * 0.8;

      switch (type) {
        case 'kick':
          this.playKick(destination, burstTime, burstVel, pitchRatio);
          break;
        case 'snare':
          this.playSnare(destination, burstTime, burstVel, pitchRatio);
          break;
        case 'clap':
          this.playClap(destination, burstTime, burstVel);
          break;
        case 'hihat_closed':
          this.playHiHatClosed(destination, burstTime, burstVel, pitchRatio);
          break;
        case 'hihat_open':
          this.playHiHatOpen(destination, burstTime, burstVel, pitchRatio);
          break;
        case 'perc':
          this.playPerc(destination, burstTime, burstVel, pitchRatio);
          break;
        case 'tom':
          this.playTom(destination, burstTime, burstVel, pitchRatio);
          break;
        case '808_bass':
          this.play808Bass(destination, burstTime, burstVel, pitchRatio);
          break;
      }
    }
  }

  // Punchy 808/909 Kick with pitch dive + click transient
  private playKick(destination: AudioNode, time: number, vel: number, pitchRatio: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(160 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(45 * pitchRatio, time + 0.08);

    const clickGain = this.ctx.createGain();
    const clickOsc = this.ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(300 * pitchRatio, time);
    clickGain.gain.setValueAtTime(0.4 * vel, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
    clickOsc.connect(clickGain);
    clickGain.connect(destination);
    clickOsc.start(time);
    clickOsc.stop(time + 0.02);

    gain.gain.setValueAtTime(1.0 * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  // Snare: Tuned body + snappy filtered white noise
  private playSnare(destination: AudioNode, time: number, vel: number, pitchRatio: number): void {
    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(220 * pitchRatio, time);
    bodyOsc.frequency.exponentialRampToValueAtTime(140 * pitchRatio, time + 0.06);

    bodyGain.gain.setValueAtTime(0.7 * vel, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(destination);
    bodyOsc.start(time);
    bodyOsc.stop(time + 0.18);

    const noiseBuffer = this.createNoiseBuffer(0.25);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200 * pitchRatio, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8 * vel, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);

    noiseSource.start(time);
    noiseSource.stop(time + 0.25);
  }

  // Hand Clap: Multi-burst noise generator
  private playClap(destination: AudioNode, time: number, vel: number): void {
    const burstCount = 3;
    const burstSpacing = 0.011;

    for (let i = 0; i < burstCount; i++) {
      const burstTime = time + i * burstSpacing;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.03);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, burstTime);
      filter.Q.setValueAtTime(2, burstTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6 * vel, burstTime);
      gain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.025);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      noise.start(burstTime);
      noise.stop(burstTime + 0.03);
    }

    const tailTime = time + burstCount * burstSpacing;
    const tailNoise = this.ctx.createBufferSource();
    tailNoise.buffer = this.createNoiseBuffer(0.3);

    const tailFilter = this.ctx.createBiquadFilter();
    tailFilter.type = 'bandpass';
    tailFilter.frequency.setValueAtTime(1200, tailTime);
    tailFilter.Q.setValueAtTime(1.5, tailTime);

    const tailGain = this.ctx.createGain();
    tailGain.gain.setValueAtTime(0.85 * vel, tailTime);
    tailGain.gain.exponentialRampToValueAtTime(0.001, tailTime + 0.22);

    tailNoise.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(destination);

    tailNoise.start(tailTime);
    tailNoise.stop(tailTime + 0.25);
  }

  // Closed Hi-Hat: Crisp highpass metallic noise
  private playHiHatClosed(destination: AudioNode, time: number, vel: number, pitchRatio: number): void {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.08);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500 * pitchRatio, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65 * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start(time);
    noise.stop(time + 0.08);
  }

  // Open Hi-Hat with Choke group node tracking
  private playHiHatOpen(destination: AudioNode, time: number, vel: number, pitchRatio: number): void {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.45);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500 * pitchRatio, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7 * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    this.openHatGain = gain;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start(time);
    noise.stop(time + 0.4);
  }

  // Percussion
  private playPerc(destination: AudioNode, time: number, vel: number, pitchRatio: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(720 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(260 * pitchRatio, time + 0.04);

    gain.gain.setValueAtTime(0.8 * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.08);
  }

  // Resonant Tom
  private playTom(destination: AudioNode, time: number, vel: number, pitchRatio: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(65 * pitchRatio, time + 0.12);

    gain.gain.setValueAtTime(0.9 * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  // 808 Sub Bass Hit
  private play808Bass(destination: AudioNode, time: number, vel: number, pitchRatio: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(55 * pitchRatio, time);
    osc.frequency.exponentialRampToValueAtTime(42 * pitchRatio, time + 0.08);

    gain.gain.setValueAtTime(1.0 * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.75);
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
