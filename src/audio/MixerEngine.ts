/**
 * BeatFlow Studio - Advanced Mixer & Real DSP Audio Effects Engine
 * Master bus, 8 insert channels, 2 Send/Return buses (Reverb/Delay),
 * Stereo Width, animated Peak/RMS meters, Master clipping indicator, and DSP effect rack.
 */
import { MixerChannel, EffectConfig } from '../types/project';

interface ChannelNodes {
  id: number;
  input: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  // Delay & Reverb nodes
  delayNode: DelayNode;
  delayFeedback: GainNode;
  delayWet: GainNode;
  delayDry: GainNode;
  delayOut: GainNode;
  reverbConvolver: ConvolverNode;
  reverbWet: GainNode;
  reverbDry: GainNode;
  reverbOut: GainNode;
  // Distortion
  distortionNode: WaveShaperNode;
  distortionWet: GainNode;
  distortionDry: GainNode;
  distortionOut: GainNode;
  // Chorus
  chorusDelay: DelayNode;
  chorusLfo: OscillatorNode;
  chorusLfoGain: GainNode;
  chorusWet: GainNode;
  chorusDry: GainNode;
  chorusOut: GainNode;
  // Compressor
  compressorNode: DynamicsCompressorNode;
  // Send Gains
  sendAGain: GainNode; // Send to Reverb Bus
  sendBGain: GainNode; // Send to Delay Bus
  // Panner & Volume
  panner: StereoPannerNode;
  faderGain: GainNode;
  muteGain: GainNode;
  analyser: AnalyserNode;
}

export class MixerEngine {
  private ctx: AudioContext | BaseAudioContext;
  private channels: Map<number, ChannelNodes> = new Map();
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterOutput: GainNode | null = null;
  private destination: AudioNode;
  public isMasterClipping = false;

  // Send Return Buses
  public sendABus!: GainNode; // Reverb Bus
  public sendBBus!: GainNode; // Delay Bus

  constructor(ctx: AudioContext | BaseAudioContext, destination?: AudioNode) {
    this.ctx = ctx;
    this.destination = destination || ctx.destination;
    this.initSendBuses();
    this.initMasterBus();
    for (let i = 1; i <= 8; i++) {
      this.initInsertChannel(i);
    }
  }

  private initSendBuses(): void {
    this.sendABus = this.ctx.createGain();
    this.sendBBus = this.ctx.createGain();
  }

  private initMasterBus(): void {
    const input = this.ctx.createGain();
    const faderGain = this.ctx.createGain();
    const muteGain = this.ctx.createGain();
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;

    // Connect Send Buses into Master Input
    this.sendABus.connect(input);
    this.sendBBus.connect(input);

    // Master EQ
    const eqLow = this.ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 300;
    eqLow.gain.value = 0;

    const eqMid = this.ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 1.0;
    eqMid.gain.value = 0;

    const eqHigh = this.ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 3500;
    eqHigh.gain.value = 0;

    // Master Limiter to prevent harsh digital clipping
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-0.5, this.ctx.currentTime);
    limiter.knee.setValueAtTime(0, this.ctx.currentTime);
    limiter.ratio.setValueAtTime(20, this.ctx.currentTime);
    limiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
    limiter.release.setValueAtTime(0.05, this.ctx.currentTime);
    this.masterLimiter = limiter;

    const panner = this.ctx.createStereoPanner();

    const { delayNode, delayFeedback, delayWet, delayDry, delayOut } = this.createDelayNodes();
    const { reverbConvolver, reverbWet, reverbDry, reverbOut } = this.createReverbNodes();
    const { distortionNode, distortionWet, distortionDry, distortionOut } = this.createDistortionNodes();
    const { chorusDelay, chorusLfo, chorusLfoGain, chorusWet, chorusDry, chorusOut } = this.createChorusNodes();
    const compressorNode = this.ctx.createDynamicsCompressor();
    const sendAGain = this.ctx.createGain();
    const sendBGain = this.ctx.createGain();

    input.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(limiter);
    limiter.connect(panner);
    panner.connect(faderGain);
    faderGain.connect(muteGain);
    muteGain.connect(analyser);
    analyser.connect(this.destination);

    this.masterOutput = faderGain;

    this.channels.set(0, {
      id: 0,
      input,
      eqLow,
      eqMid,
      eqHigh,
      delayNode,
      delayFeedback,
      delayWet,
      delayDry,
      delayOut,
      reverbConvolver,
      reverbWet,
      reverbDry,
      reverbOut,
      distortionNode,
      distortionWet,
      distortionDry,
      distortionOut,
      chorusDelay,
      chorusLfo,
      chorusLfoGain,
      chorusWet,
      chorusDry,
      chorusOut,
      compressorNode,
      sendAGain,
      sendBGain,
      panner,
      faderGain,
      muteGain,
      analyser,
    });
  }

  private initInsertChannel(channelId: number): void {
    const input = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();
    const faderGain = this.ctx.createGain();
    const muteGain = this.ctx.createGain();
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;

    // 3-band EQ
    const eqLow = this.ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 320;
    eqLow.gain.value = 0;

    const eqMid = this.ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 1.0;
    eqMid.gain.value = 0;

    const eqHigh = this.ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 3200;
    eqHigh.gain.value = 0;

    // DSP Nodes
    const { delayNode, delayFeedback, delayWet, delayDry, delayOut } = this.createDelayNodes();
    const { reverbConvolver, reverbWet, reverbDry, reverbOut } = this.createReverbNodes();
    const { distortionNode, distortionWet, distortionDry, distortionOut } = this.createDistortionNodes();
    const { chorusDelay, chorusLfo, chorusLfoGain, chorusWet, chorusDry, chorusOut } = this.createChorusNodes();
    const compressorNode = this.ctx.createDynamicsCompressor();

    // Send Gains
    const sendAGain = this.ctx.createGain();
    sendAGain.gain.value = 0;
    sendAGain.connect(this.sendABus);

    const sendBGain = this.ctx.createGain();
    sendBGain.gain.value = 0;
    sendBGain.connect(this.sendBBus);

    // Chain: input -> EQ -> Chorus -> Delay -> Reverb -> Distortion -> Panner -> Fader -> Mute -> Analyser -> Master
    input.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);

    // EQ to Chorus
    eqHigh.connect(chorusDry);
    eqHigh.connect(chorusDelay);
    chorusDry.connect(chorusOut);
    chorusWet.connect(chorusOut);

    // Chorus to Delay
    chorusOut.connect(delayDry);
    chorusOut.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayWet);
    delayDry.connect(delayOut);
    delayWet.connect(delayOut);

    // Delay to Reverb
    delayOut.connect(reverbDry);
    delayOut.connect(reverbConvolver);
    reverbConvolver.connect(reverbWet);
    reverbDry.connect(reverbOut);
    reverbWet.connect(reverbOut);

    // Reverb to Distortion
    reverbOut.connect(distortionDry);
    reverbOut.connect(distortionNode);
    distortionNode.connect(distortionWet);
    distortionDry.connect(distortionOut);
    distortionWet.connect(distortionOut);

    // Send buses tap from distortionOut
    distortionOut.connect(sendAGain);
    distortionOut.connect(sendBGain);

    // Output to Panner & Fader
    distortionOut.connect(panner);
    panner.connect(faderGain);
    faderGain.connect(muteGain);
    muteGain.connect(analyser);

    // Route to Master input
    const masterInput = this.channels.get(0)?.input;
    if (masterInput) {
      analyser.connect(masterInput);
    }

    this.channels.set(channelId, {
      id: channelId,
      input,
      eqLow,
      eqMid,
      eqHigh,
      delayNode,
      delayFeedback,
      delayWet,
      delayDry,
      delayOut,
      reverbConvolver,
      reverbWet,
      reverbDry,
      reverbOut,
      distortionNode,
      distortionWet,
      distortionDry,
      distortionOut,
      chorusDelay,
      chorusLfo,
      chorusLfoGain,
      chorusWet,
      chorusDry,
      chorusOut,
      compressorNode,
      sendAGain,
      sendBGain,
      panner,
      faderGain,
      muteGain,
      analyser,
    });
  }

  private createChorusNodes() {
    const chorusDelay = this.ctx.createDelay(0.1);
    chorusDelay.delayTime.setValueAtTime(0.02, this.ctx.currentTime);

    const chorusLfo = this.ctx.createOscillator();
    chorusLfo.type = 'sine';
    chorusLfo.frequency.setValueAtTime(1.5, this.ctx.currentTime);

    const chorusLfoGain = this.ctx.createGain();
    chorusLfoGain.gain.setValueAtTime(0.003, this.ctx.currentTime);

    chorusLfo.connect(chorusLfoGain);
    chorusLfoGain.connect(chorusDelay.delayTime);
    chorusLfo.start();

    const chorusWet = this.ctx.createGain();
    chorusWet.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const chorusDry = this.ctx.createGain();
    chorusDry.gain.setValueAtTime(1.0, this.ctx.currentTime);

    const chorusOut = this.ctx.createGain();
    chorusDelay.connect(chorusWet);

    return { chorusDelay, chorusLfo, chorusLfoGain, chorusWet, chorusDry, chorusOut };
  }

  private createDelayNodes() {
    const delayNode = this.ctx.createDelay(2.0);
    delayNode.delayTime.setValueAtTime(0.25, this.ctx.currentTime);

    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.35, this.ctx.currentTime);

    const delayWet = this.ctx.createGain();
    delayWet.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const delayDry = this.ctx.createGain();
    delayDry.gain.setValueAtTime(1.0, this.ctx.currentTime);

    const delayOut = this.ctx.createGain();
    return { delayNode, delayFeedback, delayWet, delayDry, delayOut };
  }

  private createReverbNodes() {
    const reverbConvolver = this.ctx.createConvolver();
    reverbConvolver.buffer = this.buildReverbImpulse(1.8, 2.0);

    const reverbWet = this.ctx.createGain();
    reverbWet.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const reverbDry = this.ctx.createGain();
    reverbDry.gain.setValueAtTime(1.0, this.ctx.currentTime);

    const reverbOut = this.ctx.createGain();
    return { reverbConvolver, reverbWet, reverbDry, reverbOut };
  }

  private createDistortionNodes() {
    const distortionNode = this.ctx.createWaveShaper();
    distortionNode.curve = this.makeDistortionCurve(20) as any;
    distortionNode.oversample = '4x';

    const distortionWet = this.ctx.createGain();
    distortionWet.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const distortionDry = this.ctx.createGain();
    distortionDry.gain.setValueAtTime(1.0, this.ctx.currentTime);

    const distortionOut = this.ctx.createGain();
    return { distortionNode, distortionWet, distortionDry, distortionOut };
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private buildReverbImpulse(duration = 2.0, decay = 2.0): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const factor = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  getChannelInput(channelId: number): AudioNode {
    const ch = this.channels.get(channelId);
    return ch ? ch.input : this.channels.get(0)!.input;
  }

  updateChannel(channel: MixerChannel, hasAnySolo: boolean): void {
    const ch = this.channels.get(channel.id);
    if (!ch) return;

    const linearGain =
      channel.volume <= -59 ? 0 : Math.pow(10, channel.volume / 20);
    ch.faderGain.gain.setValueAtTime(linearGain, this.ctx.currentTime);
    ch.panner.pan.setValueAtTime(channel.pan, this.ctx.currentTime);

    let shouldMute = channel.mute;
    if (hasAnySolo) {
      shouldMute = !channel.solo;
    }
    ch.muteGain.gain.setValueAtTime(shouldMute ? 0 : 1, this.ctx.currentTime);

    // Update Send levels
    if (channel.sendA !== undefined) {
      ch.sendAGain.gain.setValueAtTime(channel.sendA, this.ctx.currentTime);
    }
    if (channel.sendB !== undefined) {
      ch.sendBGain.gain.setValueAtTime(channel.sendB, this.ctx.currentTime);
    }

    for (const fx of channel.effects) {
      this.applyEffect(channel.id, fx);
    }
  }

  applyEffect(channelId: number, fx: EffectConfig): void {
    const ch = this.channels.get(channelId);
    if (!ch) return;

    switch (fx.type) {
      case 'eq3': {
        const low = fx.params.low ?? 0;
        const mid = fx.params.mid ?? 0;
        const high = fx.params.high ?? 0;
        ch.eqLow.gain.setValueAtTime(fx.enabled ? low : 0, this.ctx.currentTime);
        ch.eqMid.gain.setValueAtTime(fx.enabled ? mid : 0, this.ctx.currentTime);
        ch.eqHigh.gain.setValueAtTime(fx.enabled ? high : 0, this.ctx.currentTime);
        break;
      }
      case 'delay': {
        const wet = fx.enabled ? (fx.params.wet ?? 0.3) : 0;
        const delayTime = fx.params.delayTime ?? 0.25;
        const feedback = Math.min(0.85, fx.params.feedback ?? 0.35);

        ch.delayWet.gain.setValueAtTime(wet, this.ctx.currentTime);
        ch.delayDry.gain.setValueAtTime(1 - wet * 0.5, this.ctx.currentTime);
        ch.delayNode.delayTime.setValueAtTime(delayTime, this.ctx.currentTime);
        ch.delayFeedback.gain.setValueAtTime(feedback, this.ctx.currentTime);
        break;
      }
      case 'reverb': {
        const wet = fx.enabled ? (fx.params.wet ?? 0.35) : 0;
        ch.reverbWet.gain.setValueAtTime(wet, this.ctx.currentTime);
        ch.reverbDry.gain.setValueAtTime(1 - wet * 0.5, this.ctx.currentTime);
        break;
      }
      case 'distortion': {
        const wet = fx.enabled ? (fx.params.wet ?? 0.3) : 0;
        const drive = fx.params.distortion ?? 0.5;
        ch.distortionWet.gain.setValueAtTime(wet, this.ctx.currentTime);
        ch.distortionDry.gain.setValueAtTime(1 - wet * 0.5, this.ctx.currentTime);
        ch.distortionNode.curve = this.makeDistortionCurve(drive * 60 + 5) as any;
        break;
      }
      case 'chorus': {
        const wet = fx.enabled ? (fx.params.wet ?? 0.35) : 0;
        const rate = fx.params.rate ?? 1.5;
        ch.chorusWet.gain.setValueAtTime(wet, this.ctx.currentTime);
        ch.chorusDry.gain.setValueAtTime(1 - wet * 0.5, this.ctx.currentTime);
        ch.chorusLfo.frequency.setValueAtTime(rate, this.ctx.currentTime);
        break;
      }
    }
  }

  getMeterData(channelId: number): { peak: number; rms: number; isClipping: boolean } {
    const ch = this.channels.get(channelId);
    if (!ch) return { peak: 0, rms: 0, isClipping: false };

    const data = new Float32Array(ch.analyser.fftSize);
    ch.analyser.getFloatTimeDomainData(data);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
      sum += abs * abs;
    }
    const rms = Math.sqrt(sum / data.length);
    const isClipping = peak >= 0.99;
    if (channelId === 0 && isClipping) {
      this.isMasterClipping = true;
    }

    return {
      peak: Math.min(1.0, peak),
      rms: Math.min(1.0, rms * 1.8),
      isClipping,
    };
  }

  resetMasterClipping(): void {
    this.isMasterClipping = false;
  }
}
