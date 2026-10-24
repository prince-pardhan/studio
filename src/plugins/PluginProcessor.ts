/**
 * BeatFlow Studio - Plugin Audio Processor Graph
 * Real-time Web Audio API node graph implementation for all 19 studio plugins
 * with click-free parameter smoothing, bypass routing, and clean resource disposal.
 */
import { EffectConfig, EffectType } from '../types/project';

export interface PluginAudioInstance {
  config: EffectConfig;
  input: GainNode;
  output: GainNode;
  updateParams: (params: Record<string, any>) => void;
  setBypass: (bypassed: boolean) => void;
  destroy: () => void;
}

export class PluginProcessorFactory {
  public static create(
    ctx: AudioContext | BaseAudioContext,
    config: EffectConfig
  ): PluginAudioInstance {
    const input = ctx.createGain();
    const output = ctx.createGain();
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    const effectInput = ctx.createGain();
    const effectOutput = ctx.createGain();

    input.connect(dryGain);
    input.connect(effectInput);
    effectOutput.connect(wetGain);
    dryGain.connect(output);
    wetGain.connect(output);

    const applyBypassState = (bypassed: boolean, wetAmount = 1.0) => {
      const t = ctx.currentTime;
      if (bypassed) {
        dryGain.gain.setTargetAtTime(1.0, t, 0.01);
        wetGain.gain.setTargetAtTime(0.0, t, 0.01);
      } else {
        dryGain.gain.setTargetAtTime(1.0 - wetAmount * 0.5, t, 0.01);
        wetGain.gain.setTargetAtTime(wetAmount, t, 0.01);
      }
    };

    let updateSpecificParams: (params: Record<string, any>) => void = () => {};
    let cleanupSpecific: () => void = () => {};

    switch (config.type) {
      case 'parametric_eq': {
        const hpf = ctx.createBiquadFilter();
        hpf.type = 'highpass';
        const lowShelf = ctx.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        const mid1 = ctx.createBiquadFilter();
        mid1.type = 'peaking';
        const mid2 = ctx.createBiquadFilter();
        mid2.type = 'peaking';
        const highShelf = ctx.createBiquadFilter();
        highShelf.type = 'highshelf';
        const trim = ctx.createGain();

        effectInput.connect(hpf);
        hpf.connect(lowShelf);
        lowShelf.connect(mid1);
        mid1.connect(mid2);
        mid2.connect(highShelf);
        highShelf.connect(trim);
        trim.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          hpf.frequency.setTargetAtTime(p.hpfCutoff ?? 30, t, 0.02);
          lowShelf.frequency.setTargetAtTime(p.lowFreq ?? 100, t, 0.02);
          lowShelf.gain.setTargetAtTime(p.lowGain ?? 0, t, 0.02);
          mid1.frequency.setTargetAtTime(p.mid1Freq ?? 800, t, 0.02);
          mid1.gain.setTargetAtTime(p.mid1Gain ?? 0, t, 0.02);
          mid1.Q.setTargetAtTime(p.mid1Q ?? 1.0, t, 0.02);
          mid2.frequency.setTargetAtTime(p.mid2Freq ?? 3500, t, 0.02);
          mid2.gain.setTargetAtTime(p.mid2Gain ?? 0, t, 0.02);
          mid2.Q.setTargetAtTime(p.mid2Q ?? 1.0, t, 0.02);
          highShelf.frequency.setTargetAtTime(p.highFreq ?? 10000, t, 0.02);
          highShelf.gain.setTargetAtTime(p.highGain ?? 0, t, 0.02);
          const trimLinear = Math.pow(10, (p.outputGain ?? 0) / 20);
          trim.gain.setTargetAtTime(trimLinear, t, 0.02);
        };
        cleanupSpecific = () => {
          hpf.disconnect();
          lowShelf.disconnect();
          mid1.disconnect();
          mid2.disconnect();
          highShelf.disconnect();
          trim.disconnect();
        };
        break;
      }

      case 'eq3': {
        const low = ctx.createBiquadFilter();
        low.type = 'lowshelf';
        low.frequency.setValueAtTime(120, ctx.currentTime);
        const mid = ctx.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.setValueAtTime(1000, ctx.currentTime);
        mid.Q.setValueAtTime(0.9, ctx.currentTime);
        const high = ctx.createBiquadFilter();
        high.type = 'highshelf';
        high.frequency.setValueAtTime(8000, ctx.currentTime);

        effectInput.connect(low);
        low.connect(mid);
        mid.connect(high);
        high.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          low.gain.setTargetAtTime(p.low ?? 0, t, 0.02);
          mid.gain.setTargetAtTime(p.mid ?? 0, t, 0.02);
          high.gain.setTargetAtTime(p.high ?? 0, t, 0.02);
        };
        cleanupSpecific = () => {
          low.disconnect();
          mid.disconnect();
          high.disconnect();
        };
        break;
      }

      case 'compressor': {
        const comp = ctx.createDynamicsCompressor();
        const makeup = ctx.createGain();

        effectInput.connect(comp);
        comp.connect(makeup);
        makeup.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          comp.threshold.setTargetAtTime(p.threshold ?? -18, t, 0.02);
          comp.ratio.setTargetAtTime(p.ratio ?? 3.5, t, 0.02);
          comp.attack.setTargetAtTime(p.attack ?? 0.015, t, 0.02);
          comp.release.setTargetAtTime(p.release ?? 0.15, t, 0.02);
          comp.knee.setTargetAtTime(p.knee ?? 6, t, 0.02);
          const makeupLinear = Math.pow(10, (p.makeup ?? 3.0) / 20);
          makeup.gain.setTargetAtTime(makeupLinear, t, 0.02);
        };
        cleanupSpecific = () => {
          comp.disconnect();
          makeup.disconnect();
        };
        break;
      }

      case 'limiter': {
        const comp = ctx.createDynamicsCompressor();
        comp.attack.setValueAtTime(0.001, ctx.currentTime);
        comp.ratio.setValueAtTime(20.0, ctx.currentTime);
        const ceilingGain = ctx.createGain();

        effectInput.connect(comp);
        comp.connect(ceilingGain);
        ceilingGain.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          comp.threshold.setTargetAtTime(p.threshold ?? -4.0, t, 0.01);
          comp.release.setTargetAtTime(p.release ?? 0.08, t, 0.01);
          comp.knee.setTargetAtTime(p.knee ?? 1.0, t, 0.01);
          const ceilLinear = Math.pow(10, (p.ceiling ?? -0.2) / 20);
          ceilingGain.gain.setTargetAtTime(ceilLinear, t, 0.01);
        };
        cleanupSpecific = () => {
          comp.disconnect();
          ceilingGain.disconnect();
        };
        break;
      }

      case 'noise_gate': {
        const gateGain = ctx.createGain();
        effectInput.connect(gateGain);
        gateGain.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          // Gate simulation
          gateGain.gain.setTargetAtTime(1.0, t, 0.02);
        };
        cleanupSpecific = () => gateGain.disconnect();
        break;
      }

      case 'expander': {
        const comp = ctx.createDynamicsCompressor();
        effectInput.connect(comp);
        comp.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          comp.threshold.setTargetAtTime(p.threshold ?? -35, t, 0.02);
          comp.ratio.setTargetAtTime(p.ratio ?? 2.0, t, 0.02);
          comp.attack.setTargetAtTime(p.attack ?? 0.01, t, 0.02);
          comp.release.setTargetAtTime(p.release ?? 0.2, t, 0.02);
        };
        cleanupSpecific = () => comp.disconnect();
        break;
      }

      case 'reverb': {
        const preDelay = ctx.createDelay(0.3);
        const convolver = ctx.createConvolver();
        const damping = ctx.createBiquadFilter();
        damping.type = 'lowpass';

        // Generate synthetic impulse response
        const sampleRate = ctx.sampleRate;
        const dur = 2.5;
        const len = Math.floor(sampleRate * dur);
        const impulse = ctx.createBuffer(2, len, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        for (let i = 0; i < len; i++) {
          const n = i / len;
          const factor = Math.pow(1 - n, 2.2);
          left[i] = (Math.random() * 2 - 1) * factor;
          right[i] = (Math.random() * 2 - 1) * factor;
        }
        convolver.buffer = impulse;

        effectInput.connect(preDelay);
        preDelay.connect(convolver);
        convolver.connect(damping);
        damping.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          preDelay.delayTime.setTargetAtTime((p.preDelay ?? 20) / 1000, t, 0.02);
          damping.frequency.setTargetAtTime(p.damping ?? 7500, t, 0.02);
        };
        cleanupSpecific = () => {
          preDelay.disconnect();
          convolver.disconnect();
          damping.disconnect();
        };
        break;
      }

      case 'delay': {
        const delayL = ctx.createDelay(2.0);
        const delayR = ctx.createDelay(2.0);
        const feedbackGainL = ctx.createGain();
        const feedbackGainR = ctx.createGain();
        const crossFeedL = ctx.createGain();
        const crossFeedR = ctx.createGain();
        const highCut = ctx.createBiquadFilter();
        highCut.type = 'lowpass';

        const splitter = ctx.createChannelSplitter(2);
        const merger = ctx.createChannelMerger(2);

        effectInput.connect(splitter);
        splitter.connect(delayL, 0);
        splitter.connect(delayR, 1);

        // Feedback paths with ping-pong cross-feed
        delayL.connect(feedbackGainL);
        feedbackGainL.connect(delayL);
        feedbackGainL.connect(crossFeedR);
        crossFeedR.connect(delayR);

        delayR.connect(feedbackGainR);
        feedbackGainR.connect(delayR);
        feedbackGainR.connect(crossFeedL);
        crossFeedL.connect(delayL);

        delayL.connect(merger, 0, 0);
        delayR.connect(merger, 0, 1);
        merger.connect(highCut);
        highCut.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          const dTime = p.delayTime ?? 0.25;
          delayL.delayTime.setTargetAtTime(dTime, t, 0.02);
          // Stereo ping-pong offset
          const pp = p.pingPong ?? 0.7;
          delayR.delayTime.setTargetAtTime(dTime * (1 + pp * 0.15), t, 0.02);
          const fb = Math.min(0.88, p.feedback ?? 0.4);
          feedbackGainL.gain.setTargetAtTime(fb * (1 - pp * 0.5), t, 0.02);
          feedbackGainR.gain.setTargetAtTime(fb * (1 - pp * 0.5), t, 0.02);
          crossFeedL.gain.setTargetAtTime(fb * pp * 0.5, t, 0.02);
          crossFeedR.gain.setTargetAtTime(fb * pp * 0.5, t, 0.02);
          highCut.frequency.setTargetAtTime(p.highCut ?? 6000, t, 0.02);
        };
        cleanupSpecific = () => {
          delayL.disconnect();
          delayR.disconnect();
          feedbackGainL.disconnect();
          feedbackGainR.disconnect();
          crossFeedL.disconnect();
          crossFeedR.disconnect();
          highCut.disconnect();
          splitter.disconnect();
          merger.disconnect();
        };
        break;
      }

      case 'chorus': {
        const delay = ctx.createDelay(0.1);
        delay.delayTime.setValueAtTime(0.018, ctx.currentTime);
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(1.5, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.003, ctx.currentTime);
        const feedback = ctx.createGain();
        feedback.gain.setValueAtTime(0.2, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(delay.delayTime);
        lfo.start();

        effectInput.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          lfo.frequency.setTargetAtTime(p.rate ?? 1.5, t, 0.02);
          lfoGain.gain.setTargetAtTime((p.depth ?? 0.65) * 0.005, t, 0.02);
          feedback.gain.setTargetAtTime(p.feedback ?? 0.2, t, 0.02);
          delay.delayTime.setTargetAtTime((p.delay ?? 18) / 1000, t, 0.02);
        };
        cleanupSpecific = () => {
          try { lfo.stop(); } catch {}
          lfo.disconnect();
          lfoGain.disconnect();
          delay.disconnect();
          feedback.disconnect();
        };
        break;
      }

      case 'flanger': {
        const delay = ctx.createDelay(0.05);
        delay.delayTime.setValueAtTime(0.0035, ctx.currentTime);
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.4, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.002, ctx.currentTime);
        const feedback = ctx.createGain();
        feedback.gain.setValueAtTime(0.65, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(delay.delayTime);
        lfo.start();

        effectInput.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          lfo.frequency.setTargetAtTime(p.rate ?? 0.4, t, 0.02);
          lfoGain.gain.setTargetAtTime((p.depth ?? 0.8) * 0.0025, t, 0.02);
          feedback.gain.setTargetAtTime(p.feedback ?? 0.65, t, 0.02);
          delay.delayTime.setTargetAtTime((p.manual ?? 3.5) / 1000, t, 0.02);
        };
        cleanupSpecific = () => {
          try { lfo.stop(); } catch {}
          lfo.disconnect();
          lfoGain.disconnect();
          delay.disconnect();
          feedback.disconnect();
        };
        break;
      }

      case 'phaser': {
        const stages: BiquadFilterNode[] = [];
        for (let i = 0; i < 4; i++) {
          const filter = ctx.createBiquadFilter();
          filter.type = 'allpass';
          filter.frequency.setValueAtTime(1000 + i * 200, ctx.currentTime);
          stages.push(filter);
        }

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.8, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(600, ctx.currentTime);
        lfo.connect(lfoGain);
        stages.forEach((f) => lfoGain.connect(f.frequency));
        lfo.start();

        const feedback = ctx.createGain();
        feedback.gain.setValueAtTime(0.5, ctx.currentTime);

        effectInput.connect(stages[0]);
        for (let i = 0; i < stages.length - 1; i++) {
          stages[i].connect(stages[i + 1]);
        }
        stages[stages.length - 1].connect(feedback);
        feedback.connect(stages[0]);
        stages[stages.length - 1].connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          lfo.frequency.setTargetAtTime(p.rate ?? 0.8, t, 0.02);
          lfoGain.gain.setTargetAtTime((p.depth ?? 0.75) * 800, t, 0.02);
          feedback.gain.setTargetAtTime(p.feedback ?? 0.5, t, 0.02);
          stages.forEach((f, idx) => {
            f.frequency.setTargetAtTime((p.baseFreq ?? 1000) + idx * 250, t, 0.02);
          });
        };
        cleanupSpecific = () => {
          try { lfo.stop(); } catch {}
          lfo.disconnect();
          lfoGain.disconnect();
          feedback.disconnect();
          stages.forEach((f) => f.disconnect());
        };
        break;
      }

      case 'distortion': {
        const shaper = ctx.createWaveShaper();
        const tone = ctx.createBiquadFilter();
        tone.type = 'lowpass';
        const trim = ctx.createGain();

        effectInput.connect(shaper);
        shaper.connect(tone);
        tone.connect(trim);
        trim.connect(effectOutput);

        const makeCurve = (amount: number, type: string) => {
          const n = 44100;
          const curve = new Float32Array(n);
          const k = amount * 50 + 2;
          const deg = Math.PI / 180;

          for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            if (type === 'hard') {
              const driveX = x * (1 + amount * 8);
              curve[i] = Math.max(-1, Math.min(1, driveX));
            } else if (type === 'tape') {
              curve[i] = (2 / Math.PI) * Math.atan(x * (1 + amount * 4));
            } else if (type === 'fuzz') {
              curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x * (1 + amount * 12))));
            } else {
              // Tube
              curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
            }
          }
          return curve;
        };

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          shaper.curve = makeCurve(p.drive ?? 0.4, p.type ?? 'tube') as any;
          tone.frequency.setTargetAtTime(p.tone ?? 6500, t, 0.02);
          const trimLinear = Math.pow(10, (p.outputGain ?? -1.0) / 20);
          trim.gain.setTargetAtTime(trimLinear, t, 0.02);
        };
        cleanupSpecific = () => {
          shaper.disconnect();
          tone.disconnect();
          trim.disconnect();
        };
        break;
      }

      case 'bitcrusher': {
        const shaper = ctx.createWaveShaper();
        const postFilter = ctx.createBiquadFilter();
        postFilter.type = 'lowpass';

        effectInput.connect(shaper);
        shaper.connect(postFilter);
        postFilter.connect(effectOutput);

        const makeBitCurve = (bits: number) => {
          const n = 44100;
          const curve = new Float32Array(n);
          const step = Math.pow(0.5, bits);
          for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = step * Math.round(x / step);
          }
          return curve;
        };

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          shaper.curve = makeBitCurve(p.bits ?? 8) as any;
          postFilter.frequency.setTargetAtTime(p.postFilter ?? 8000, t, 0.02);
        };
        cleanupSpecific = () => {
          shaper.disconnect();
          postFilter.disconnect();
        };
        break;
      }

      case 'stereowidth': {
        const splitter = ctx.createChannelSplitter(2);
        const merger = ctx.createChannelMerger(2);
        const midGain = ctx.createGain();
        const sideGain = ctx.createGain();
        const bassMono = ctx.createBiquadFilter();
        bassMono.type = 'highpass';

        effectInput.connect(splitter);
        // Mid: (L + R) * 0.5
        const midSummer = ctx.createGain();
        midSummer.gain.value = 0.5;
        splitter.connect(midSummer, 0);
        splitter.connect(midSummer, 1);
        midSummer.connect(midGain);

        // Side: (L - R) * 0.5
        const sideSummer = ctx.createGain();
        sideSummer.gain.value = 0.5;
        const invR = ctx.createGain();
        invR.gain.value = -1;
        splitter.connect(sideSummer, 0);
        splitter.connect(invR, 1);
        invR.connect(sideSummer);
        sideSummer.connect(bassMono);
        bassMono.connect(sideGain);

        // Recombine to L (Mid + Side) and R (Mid - Side)
        midGain.connect(merger, 0, 0);
        sideGain.connect(merger, 0, 0);

        const invSide = ctx.createGain();
        invSide.gain.value = -1;
        midGain.connect(merger, 0, 1);
        sideGain.connect(invSide);
        invSide.connect(merger, 0, 1);

        merger.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          const w = p.width ?? 1.25;
          sideGain.gain.setTargetAtTime(w, t, 0.02);
          midGain.gain.setTargetAtTime(1.0, t, 0.02);
          bassMono.frequency.setTargetAtTime(p.monoBass ?? 120, t, 0.02);
        };
        cleanupSpecific = () => {
          splitter.disconnect();
          merger.disconnect();
          midGain.disconnect();
          sideGain.disconnect();
          bassMono.disconnect();
        };
        break;
      }

      case 'autopan': {
        const panner = ctx.createStereoPanner();
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        const lfoGain = ctx.createGain();
        lfo.connect(lfoGain);
        lfoGain.connect(panner.pan);
        lfo.start();

        effectInput.connect(panner);
        panner.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          lfo.frequency.setTargetAtTime(p.rate ?? 1.0, t, 0.02);
          lfoGain.gain.setTargetAtTime(p.depth ?? 0.8, t, 0.02);
          if (p.shape === 'triangle') lfo.type = 'triangle';
          else lfo.type = 'sine';
        };
        cleanupSpecific = () => {
          try { lfo.stop(); } catch {}
          lfo.disconnect();
          lfoGain.disconnect();
          panner.disconnect();
        };
        break;
      }

      case 'tremolo': {
        const tremoloGain = ctx.createGain();
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        const lfoGain = ctx.createGain();
        lfo.connect(lfoGain);
        lfoGain.connect(tremoloGain.gain);
        lfo.start();

        effectInput.connect(tremoloGain);
        tremoloGain.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          lfo.frequency.setTargetAtTime(p.rate ?? 3.5, t, 0.02);
          lfoGain.gain.setTargetAtTime((p.depth ?? 0.75) * 0.45, t, 0.02);
          tremoloGain.gain.setTargetAtTime(1.0 - (p.depth ?? 0.75) * 0.45, t, 0.02);
          if (p.shape === 'square') lfo.type = 'square';
          else lfo.type = 'sine';
        };
        cleanupSpecific = () => {
          try { lfo.stop(); } catch {}
          lfo.disconnect();
          lfoGain.disconnect();
          tremoloGain.disconnect();
        };
        break;
      }

      case 'filter': {
        const filter = ctx.createBiquadFilter();
        const drive = ctx.createGain();

        effectInput.connect(drive);
        drive.connect(filter);
        filter.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          filter.type = p.type || 'lowpass';
          filter.frequency.setTargetAtTime(p.cutoff ?? 1800, t, 0.02);
          filter.Q.setTargetAtTime(p.resonance ?? 4.0, t, 0.02);
          const driveLin = Math.pow(10, (p.drive ?? 2.0) / 20);
          drive.gain.setTargetAtTime(driveLin, t, 0.02);
        };
        cleanupSpecific = () => {
          drive.disconnect();
          filter.disconnect();
        };
        break;
      }

      case 'transient_shaper': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2500, ctx.currentTime);
        const attackGain = ctx.createGain();
        const trim = ctx.createGain();

        effectInput.connect(filter);
        filter.connect(attackGain);
        attackGain.connect(trim);
        effectInput.connect(trim);
        trim.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          const attLin = Math.pow(10, (p.attack ?? 3.5) / 20) - 1;
          attackGain.gain.setTargetAtTime(Math.max(-0.9, attLin), t, 0.02);
          const outLin = Math.pow(10, (p.outputGain ?? 0) / 20);
          trim.gain.setTargetAtTime(outLin, t, 0.02);
        };
        cleanupSpecific = () => {
          filter.disconnect();
          attackGain.disconnect();
          trim.disconnect();
        };
        break;
      }

      case 'pitch_shifter': {
        const delay = ctx.createDelay(0.1);
        delay.delayTime.setValueAtTime(0.02, ctx.currentTime);
        const lfo = ctx.createOscillator();
        lfo.type = 'sawtooth';
        lfo.frequency.setValueAtTime(5, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.005, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(delay.delayTime);
        lfo.start();

        effectInput.connect(delay);
        delay.connect(effectOutput);

        updateSpecificParams = (p) => {
          const t = ctx.currentTime;
          const semitones = p.semitones ?? 0;
          const fine = p.fine ?? 12;
          const totalCents = semitones * 100 + fine;
          const freq = (totalCents / 1200) * 12;
          lfo.frequency.setTargetAtTime(Math.max(0.1, Math.abs(freq)), t, 0.02);
        };
        cleanupSpecific = () => {
          try { lfo.stop(); } catch {}
          lfo.disconnect();
          lfoGain.disconnect();
          delay.disconnect();
        };
        break;
      }

      default: {
        effectInput.connect(effectOutput);
        break;
      }
    }

    // Initialize with provided parameters
    updateSpecificParams(config.params || {});
    applyBypassState(!config.enabled, config.params.wet ?? 1.0);

    return {
      config,
      input,
      output,
      updateParams: (newParams) => {
        config.params = { ...config.params, ...newParams };
        updateSpecificParams(config.params);
        applyBypassState(!config.enabled, config.params.wet ?? 1.0);
      },
      setBypass: (bypassed) => {
        config.enabled = !bypassed;
        applyBypassState(bypassed, config.params.wet ?? 1.0);
      },
      destroy: () => {
        cleanupSpecific();
        input.disconnect();
        output.disconnect();
        dryGain.disconnect();
        wetGain.disconnect();
        effectInput.disconnect();
        effectOutput.disconnect();
      },
    };
  }
}
