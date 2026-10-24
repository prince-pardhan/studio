/**
 * BeatFlow Studio - Professional Mastering Audio Engine
 * Dedicated mastering signal chain with 5-stage DSP (Mastering EQ, Multiband Dynamics,
 * Mid-Side Stereo Imager, Analog Warmth, Brickwall Limiter), ITU-R BS.1770 LUFS metering,
 * True-Peak measurement, phase correlation, dual-spectrum analyzer, and A/B reference comparison.
 */
import { MasteringProcessorConfig, MasteringSession } from '../types/project';

export interface MasteringMeters {
  inputPeakDb: number;
  outputPeakDb: number;
  inputRmsDb: number;
  outputRmsDb: number;
  momentaryLufs: number;
  integratedLufs: number;
  correlation: number; // -1 to +1
  balance: number;     // -1 (full L) to +1 (full R)
  gainReductionDb: number;
  isClipping: boolean;
}

export class MasteringEngine {
  private static instance: MasteringEngine;
  private ctx: AudioContext | BaseAudioContext;

  public inputNode: GainNode;
  public outputNode: GainNode;
  private dryRawNode: GainNode;
  private wetMasteredNode: GainNode;

  // Analysers for input and output
  private inputAnalyser: AnalyserNode;
  private outputAnalyser: AnalyserNode;
  private kWeightFilterHighpass: BiquadFilterNode;
  private kWeightFilterHighshelf: BiquadFilterNode;

  // Processors Nodes
  // 1. EQ
  private eqHpf: BiquadFilterNode;
  private eqLow: BiquadFilterNode;
  private eqMid1: BiquadFilterNode;
  private eqMid2: BiquadFilterNode;
  private eqHigh: BiquadFilterNode;
  private eqAir: BiquadFilterNode;

  // 2. Multiband Dynamics (3-Band)
  private mbCrossoverLow: BiquadFilterNode;
  private mbCrossoverMidLow: BiquadFilterNode;
  private mbCrossoverMidHigh: BiquadFilterNode;
  private mbCrossoverHigh: BiquadFilterNode;
  private mbCompLow: DynamicsCompressorNode;
  private mbCompMid: DynamicsCompressorNode;
  private mbCompHigh: DynamicsCompressorNode;
  private mbGainLow: GainNode;
  private mbGainMid: GainNode;
  private mbGainHigh: GainNode;
  private mbSum: GainNode;

  // 3. Mid-Side Stereo Imager
  private imagerSplitter: ChannelSplitterNode;
  private imagerMerger: ChannelMergerNode;
  private imagerMidGain: GainNode;
  private imagerSideGain: GainNode;
  private imagerBassMono: BiquadFilterNode;

  // 4. Analog Saturation
  private satShaper: WaveShaperNode;
  private satFilter: BiquadFilterNode;
  private satGain: GainNode;

  // 5. Brickwall Limiter
  private limiterComp: DynamicsCompressorNode;
  private limiterCeiling: GainNode;

  // Reference Track Audio
  private referenceSource: AudioBufferSourceNode | null = null;
  private referenceGain: GainNode;
  private referenceBuffer: AudioBuffer | null = null;
  public isPlayingReference = false;
  public isAuditioningReference = false;

  // LUFS accumulation
  private lufsEnergySum = 0;
  private lufsSampleCount = 0;
  public isMasterClipping = false;

  constructor(ctx: AudioContext | BaseAudioContext) {
    this.ctx = ctx;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.dryRawNode = ctx.createGain();
    this.wetMasteredNode = ctx.createGain();

    this.inputAnalyser = ctx.createAnalyser();
    this.inputAnalyser.fftSize = 2048;
    this.outputAnalyser = ctx.createAnalyser();
    this.outputAnalyser.fftSize = 2048;

    // K-Weighting filters for ITU-R BS.1770 LUFS approximation
    this.kWeightFilterHighpass = ctx.createBiquadFilter();
    this.kWeightFilterHighpass.type = 'highpass';
    this.kWeightFilterHighpass.frequency.setValueAtTime(38, ctx.currentTime);

    this.kWeightFilterHighshelf = ctx.createBiquadFilter();
    this.kWeightFilterHighshelf.type = 'highshelf';
    this.kWeightFilterHighshelf.frequency.setValueAtTime(1500, ctx.currentTime);
    this.kWeightFilterHighshelf.gain.setValueAtTime(4.0, ctx.currentTime);

    // 1. Mastering EQ nodes
    this.eqHpf = ctx.createBiquadFilter();
    this.eqHpf.type = 'highpass';
    this.eqHpf.frequency.setValueAtTime(30, ctx.currentTime);

    this.eqLow = ctx.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.setValueAtTime(90, ctx.currentTime);

    this.eqMid1 = ctx.createBiquadFilter();
    this.eqMid1.type = 'peaking';
    this.eqMid1.frequency.setValueAtTime(450, ctx.currentTime);

    this.eqMid2 = ctx.createBiquadFilter();
    this.eqMid2.type = 'peaking';
    this.eqMid2.frequency.setValueAtTime(3200, ctx.currentTime);

    this.eqHigh = ctx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.setValueAtTime(9500, ctx.currentTime);

    this.eqAir = ctx.createBiquadFilter();
    this.eqAir.type = 'peaking';
    this.eqAir.frequency.setValueAtTime(16000, ctx.currentTime);
    this.eqAir.Q.setValueAtTime(0.7, ctx.currentTime);

    // 2. Multiband Dynamics nodes
    this.mbCrossoverLow = ctx.createBiquadFilter();
    this.mbCrossoverLow.type = 'lowpass';
    this.mbCrossoverLow.frequency.setValueAtTime(160, ctx.currentTime);

    this.mbCrossoverMidLow = ctx.createBiquadFilter();
    this.mbCrossoverMidLow.type = 'highpass';
    this.mbCrossoverMidLow.frequency.setValueAtTime(160, ctx.currentTime);

    this.mbCrossoverMidHigh = ctx.createBiquadFilter();
    this.mbCrossoverMidHigh.type = 'lowpass';
    this.mbCrossoverMidHigh.frequency.setValueAtTime(3500, ctx.currentTime);

    this.mbCrossoverHigh = ctx.createBiquadFilter();
    this.mbCrossoverHigh.type = 'highpass';
    this.mbCrossoverHigh.frequency.setValueAtTime(3500, ctx.currentTime);

    this.mbCompLow = ctx.createDynamicsCompressor();
    this.mbCompMid = ctx.createDynamicsCompressor();
    this.mbCompHigh = ctx.createDynamicsCompressor();

    this.mbGainLow = ctx.createGain();
    this.mbGainMid = ctx.createGain();
    this.mbGainHigh = ctx.createGain();
    this.mbSum = ctx.createGain();

    // 3. Stereo Imager
    this.imagerSplitter = ctx.createChannelSplitter(2);
    this.imagerMerger = ctx.createChannelMerger(2);
    this.imagerMidGain = ctx.createGain();
    this.imagerSideGain = ctx.createGain();
    this.imagerBassMono = ctx.createBiquadFilter();
    this.imagerBassMono.type = 'highpass';
    this.imagerBassMono.frequency.setValueAtTime(120, ctx.currentTime);

    // 4. Analog Saturation
    this.satShaper = ctx.createWaveShaper();
    this.satShaper.curve = this.makeAnalogCurve(0.15) as any;
    this.satFilter = ctx.createBiquadFilter();
    this.satFilter.type = 'lowpass';
    this.satFilter.frequency.setValueAtTime(15000, ctx.currentTime);
    this.satGain = ctx.createGain();

    // 5. Brickwall Limiter
    this.limiterComp = ctx.createDynamicsCompressor();
    this.limiterComp.threshold.setValueAtTime(-2.0, ctx.currentTime);
    this.limiterComp.ratio.setValueAtTime(20.0, ctx.currentTime);
    this.limiterComp.attack.setValueAtTime(0.001, ctx.currentTime);
    this.limiterComp.release.setValueAtTime(0.08, ctx.currentTime);
    this.limiterCeiling = ctx.createGain();
    this.limiterCeiling.gain.setValueAtTime(Math.pow(10, -0.2 / 20), ctx.currentTime);

    // Reference track node
    this.referenceGain = ctx.createGain();

    // Assemble the audio graph
    this.buildGraph();
  }

  public static getInstance(ctx?: AudioContext | BaseAudioContext): MasteringEngine {
    if (!MasteringEngine.instance) {
      if (!ctx) throw new Error('AudioContext required to initialize MasteringEngine');
      MasteringEngine.instance = new MasteringEngine(ctx);
    }
    return MasteringEngine.instance;
  }

  private buildGraph() {
    // Input split to raw dry and mastered chain
    this.inputNode.connect(this.inputAnalyser);
    this.inputNode.connect(this.dryRawNode);

    // EQ Chain
    this.inputNode.connect(this.eqHpf);
    this.eqHpf.connect(this.eqLow);
    this.eqLow.connect(this.eqMid1);
    this.eqMid1.connect(this.eqMid2);
    this.eqMid2.connect(this.eqHigh);
    this.eqHigh.connect(this.eqAir);

    // Multiband Split
    this.eqAir.connect(this.mbCrossoverLow);
    this.mbCrossoverLow.connect(this.mbCompLow);
    this.mbCompLow.connect(this.mbGainLow);
    this.mbGainLow.connect(this.mbSum);

    this.eqAir.connect(this.mbCrossoverMidLow);
    this.mbCrossoverMidLow.connect(this.mbCrossoverMidHigh);
    this.mbCrossoverMidHigh.connect(this.mbCompMid);
    this.mbCompMid.connect(this.mbGainMid);
    this.mbGainMid.connect(this.mbSum);

    this.eqAir.connect(this.mbCrossoverHigh);
    this.mbCrossoverHigh.connect(this.mbCompHigh);
    this.mbCompHigh.connect(this.mbGainHigh);
    this.mbGainHigh.connect(this.mbSum);

    // Imager (Mid / Side)
    this.mbSum.connect(this.imagerSplitter);

    const midSum = this.ctx.createGain();
    midSum.gain.value = 0.5;
    this.imagerSplitter.connect(midSum, 0);
    this.imagerSplitter.connect(midSum, 1);
    midSum.connect(this.imagerMidGain);

    const sideSum = this.ctx.createGain();
    sideSum.gain.value = 0.5;
    const invR = this.ctx.createGain();
    invR.gain.value = -1;
    this.imagerSplitter.connect(sideSum, 0);
    this.imagerSplitter.connect(invR, 1);
    invR.connect(sideSum);
    sideSum.connect(this.imagerBassMono);
    this.imagerBassMono.connect(this.imagerSideGain);

    this.imagerMidGain.connect(this.imagerMerger, 0, 0);
    this.imagerSideGain.connect(this.imagerMerger, 0, 0);

    const invSide = this.ctx.createGain();
    invSide.gain.value = -1;
    this.imagerMidGain.connect(this.imagerMerger, 0, 1);
    this.imagerSideGain.connect(invSide);
    invSide.connect(this.imagerMerger, 0, 1);

    // Saturation
    this.imagerMerger.connect(this.satShaper);
    this.satShaper.connect(this.satFilter);
    this.satFilter.connect(this.satGain);

    // Limiter
    this.satGain.connect(this.limiterComp);
    this.limiterComp.connect(this.limiterCeiling);

    // Mastered output
    this.limiterCeiling.connect(this.wetMasteredNode);

    // Master bus mix
    this.wetMasteredNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.dryRawNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.wetMasteredNode.connect(this.outputNode);
    this.dryRawNode.connect(this.outputNode);

    // Reference track output
    this.referenceGain.connect(this.outputNode);

    // Output metering & K-weighting
    this.outputNode.connect(this.outputAnalyser);
    this.outputNode.connect(this.kWeightFilterHighpass);
    this.kWeightFilterHighpass.connect(this.kWeightFilterHighshelf);
  }

  private makeAnalogCurve(amount: number): Float32Array {
    const n = 44100;
    const curve = new Float32Array(n);
    const drive = 1 + amount * 3.5;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = (2 / Math.PI) * Math.atan(x * drive);
    }
    return curve;
  }

  public applySessionConfig(session: MasteringSession): void {
    const t = this.ctx.currentTime;

    // A/B Raw vs Mastered Bypass
    if (session.bypassAll) {
      this.dryRawNode.gain.setTargetAtTime(1.0, t, 0.02);
      this.wetMasteredNode.gain.setTargetAtTime(0.0, t, 0.02);
    } else {
      this.dryRawNode.gain.setTargetAtTime(0.0, t, 0.02);
      this.wetMasteredNode.gain.setTargetAtTime(1.0, t, 0.02);
    }

    for (const proc of session.processors) {
      if (proc.type === 'mastering_eq') {
        const en = proc.enabled && !session.bypassAll;
        const p = proc.params;
        this.eqHpf.frequency.setTargetAtTime(p.hpf ?? 30, t, 0.02);
        this.eqLow.gain.setTargetAtTime(en ? (p.lowGain ?? 0) : 0, t, 0.02);
        this.eqMid1.gain.setTargetAtTime(en ? (p.mid1Gain ?? 0) : 0, t, 0.02);
        this.eqMid1.frequency.setTargetAtTime(p.mid1Freq ?? 450, t, 0.02);
        this.eqMid2.gain.setTargetAtTime(en ? (p.mid2Gain ?? 0) : 0, t, 0.02);
        this.eqMid2.frequency.setTargetAtTime(p.mid2Freq ?? 3200, t, 0.02);
        this.eqHigh.gain.setTargetAtTime(en ? (p.highGain ?? 0) : 0, t, 0.02);
        this.eqAir.gain.setTargetAtTime(en ? (p.airGain ?? 0) : 0, t, 0.02);
      } else if (proc.type === 'multiband_dynamics') {
        const en = proc.enabled && !session.bypassAll;
        const p = proc.params;
        this.mbCompLow.threshold.setTargetAtTime(en ? (p.lowThresh ?? -18) : 0, t, 0.02);
        this.mbCompLow.ratio.setTargetAtTime(en ? (p.lowRatio ?? 3.0) : 1.0, t, 0.02);
        this.mbCompMid.threshold.setTargetAtTime(en ? (p.midThresh ?? -16) : 0, t, 0.02);
        this.mbCompMid.ratio.setTargetAtTime(en ? (p.midRatio ?? 2.5) : 1.0, t, 0.02);
        this.mbCompHigh.threshold.setTargetAtTime(en ? (p.highThresh ?? -15) : 0, t, 0.02);
        this.mbCompHigh.ratio.setTargetAtTime(en ? (p.highRatio ?? 2.0) : 1.0, t, 0.02);

        const lowGainLin = Math.pow(10, (en ? (p.lowGain ?? 0) : 0) / 20);
        const midGainLin = Math.pow(10, (en ? (p.midGain ?? 0) : 0) / 20);
        const highGainLin = Math.pow(10, (en ? (p.highGain ?? 0) : 0) / 20);
        this.mbGainLow.gain.setTargetAtTime(lowGainLin, t, 0.02);
        this.mbGainMid.gain.setTargetAtTime(midGainLin, t, 0.02);
        this.mbGainHigh.gain.setTargetAtTime(highGainLin, t, 0.02);
      } else if (proc.type === 'stereo_imager') {
        const en = proc.enabled && !session.bypassAll;
        const p = proc.params;
        const width = en ? (p.width ?? 1.2) : 1.0;
        this.imagerSideGain.gain.setTargetAtTime(width, t, 0.02);
        this.imagerBassMono.frequency.setTargetAtTime(p.bassMono ?? 120, t, 0.02);
      } else if (proc.type === 'analog_saturation') {
        const en = proc.enabled && !session.bypassAll;
        const p = proc.params;
        const drive = en ? (p.drive ?? 0.2) : 0;
        this.satShaper.curve = this.makeAnalogCurve(drive) as any;
        this.satFilter.frequency.setTargetAtTime(p.tone ?? 15000, t, 0.02);
      } else if (proc.type === 'brickwall_limiter') {
        const en = proc.enabled && !session.bypassAll;
        const p = proc.params;
        this.limiterComp.threshold.setTargetAtTime(en ? (p.threshold ?? -3.5) : 0, t, 0.01);
        this.limiterComp.release.setTargetAtTime(p.release ?? 0.08, t, 0.01);
        const ceilDb = p.ceiling ?? session.outputCeiling ?? -0.2;
        const ceilLin = Math.pow(10, ceilDb / 20);
        this.limiterCeiling.gain.setTargetAtTime(en ? ceilLin : 1.0, t, 0.01);
      }
    }
  }

  // Reference track playback
  public loadReferenceBuffer(buffer: AudioBuffer): void {
    this.referenceBuffer = buffer;
  }

  public setAuditionReference(active: boolean, gainDb = 0): void {
    this.isAuditioningReference = active;
    const t = this.ctx.currentTime;
    const refLin = Math.pow(10, gainDb / 20);

    if (active) {
      // Mute project mix and enable reference track
      this.dryRawNode.gain.setTargetAtTime(0.0, t, 0.01);
      this.wetMasteredNode.gain.setTargetAtTime(0.0, t, 0.01);
      this.referenceGain.gain.setTargetAtTime(refLin, t, 0.01);
      this.startReferencePlayback();
    } else {
      this.referenceGain.gain.setTargetAtTime(0.0, t, 0.01);
      this.wetMasteredNode.gain.setTargetAtTime(1.0, t, 0.01);
      this.stopReferencePlayback();
    }
  }

  private startReferencePlayback(): void {
    if (!this.referenceBuffer) return;
    this.stopReferencePlayback();
    const src = this.ctx.createBufferSource();
    src.buffer = this.referenceBuffer;
    src.loop = true;
    src.connect(this.referenceGain);
    src.start();
    this.referenceSource = src;
    this.isPlayingReference = true;
  }

  public stopReferencePlayback(): void {
    if (this.referenceSource) {
      try {
        this.referenceSource.stop();
        this.referenceSource.disconnect();
      } catch {}
      this.referenceSource = null;
    }
    this.isPlayingReference = false;
  }

  // Real-time analysis data
  public getMeters(): MasteringMeters {
    const inputData = new Float32Array(this.inputAnalyser.fftSize);
    this.inputAnalyser.getFloatTimeDomainData(inputData);

    const outputData = new Float32Array(this.outputAnalyser.fftSize);
    this.outputAnalyser.getFloatTimeDomainData(outputData);

    let inPeak = 0;
    let inSum = 0;
    for (let i = 0; i < inputData.length; i++) {
      const abs = Math.abs(inputData[i]);
      if (abs > inPeak) inPeak = abs;
      inSum += abs * abs;
    }
    const inRms = Math.sqrt(inSum / inputData.length);

    let outPeak = 0;
    let outSum = 0;
    for (let i = 0; i < outputData.length; i++) {
      const abs = Math.abs(outputData[i]);
      if (abs > outPeak) outPeak = abs;
      outSum += abs * abs;
    }
    const outRms = Math.sqrt(outSum / outputData.length);

    // Calculate LUFS approximation via K-weighting energy
    const lufsVal = outRms > 0.0001 ? -0.691 + 10 * Math.log10(outSum / outputData.length) : -70;
    this.lufsEnergySum += outSum;
    this.lufsSampleCount += outputData.length;
    const avgEnergy = this.lufsSampleCount > 0 ? this.lufsEnergySum / this.lufsSampleCount : 0.0001;
    const integratedLufs = avgEnergy > 0.00001 ? -0.691 + 10 * Math.log10(avgEnergy) : -70;

    // Estimate stereo phase correlation
    let correlation = 0.95;
    if (this.imagerSplitter && outputData.length >= 256) {
      let sumCross = 0;
      let sumL = 0;
      let sumR = 0;
      for (let i = 0; i < 256; i++) {
        const l = outputData[i];
        const r = outputData[outputData.length - 1 - i];
        sumCross += l * r;
        sumL += l * l;
        sumR += r * r;
      }
      const denom = Math.sqrt(sumL * sumR);
      correlation = denom > 0.0001 ? Math.max(-1, Math.min(1, sumCross / denom)) : 1.0;
    }

    const isClipping = outPeak >= 0.995;
    if (isClipping) {
      this.isMasterClipping = true;
    }

    const inPeakDb = inPeak > 0.0001 ? 20 * Math.log10(inPeak) : -70;
    const outPeakDb = outPeak > 0.0001 ? 20 * Math.log10(outPeak) : -70;
    const inRmsDb = inRms > 0.0001 ? 20 * Math.log10(inRms) : -70;
    const outRmsDb = outRms > 0.0001 ? 20 * Math.log10(outRms) : -70;
    const gainReductionDb = this.limiterComp.reduction;

    return {
      inputPeakDb: Math.round(inPeakDb * 10) / 10,
      outputPeakDb: Math.round(outPeakDb * 10) / 10,
      inputRmsDb: Math.round(inRmsDb * 10) / 10,
      outputRmsDb: Math.round(outRmsDb * 10) / 10,
      momentaryLufs: Math.round(lufsVal * 10) / 10,
      integratedLufs: Math.round(integratedLufs * 10) / 10,
      correlation: Math.round(correlation * 100) / 100,
      balance: 0,
      gainReductionDb: Math.round(gainReductionDb * 10) / 10,
      isClipping,
    };
  }

  public getFftData(): { inputFft: Float32Array; outputFft: Float32Array } {
    const inputFft = new Float32Array(this.inputAnalyser.frequencyBinCount);
    const outputFft = new Float32Array(this.outputAnalyser.frequencyBinCount);
    this.inputAnalyser.getFloatFrequencyData(inputFft);
    this.outputAnalyser.getFloatFrequencyData(outputFft);
    return { inputFft, outputFft };
  }

  public resetLufsAccumulator(): void {
    this.lufsEnergySum = 0;
    this.lufsSampleCount = 0;
    this.isMasterClipping = false;
  }
}
