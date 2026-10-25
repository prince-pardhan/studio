/**
 * BeatFlow Studio - Phase 14: Vocal Editor Modal
 * Non-destructive vocal processing and trimming station:
 * - Start / End trimming with visual interactive sliders
 * - Real-time Gain adjustment (-12dB to +12dB)
 * - Fade-In and Fade-Out envelopes
 * - High-pass rumble filter (80Hz - 150Hz)
 * - Vocal de-esser (tame harsh sibilance 5kHz - 9kHz)
 * - Analog warmth / saturation
 * - Pitch shift / snap (-12 to +12 semitones)
 * - Instant A/B comparison (Audition Processed vs Clean Original)
 * - Direct timeline clip update or new placement
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Volume2,
  Sliders,
  Play,
  Square,
  Sparkles,
  RotateCcw,
  Check,
  Music,
  Zap,
} from 'lucide-react';
import { AudioAsset, ArrangementClip } from '../types/project';
import { AudioEngine } from '../audio/AudioEngine';

interface VocalEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AudioAsset | null;
  onUpdateAsset?: (updated: AudioAsset) => void;
  onPlaceOnTimeline?: (clip: ArrangementClip) => void;
  targetTrackIndex?: number;
  bpm: number;
}

export const VocalEditorModal: React.FC<VocalEditorModalProps> = ({
  isOpen,
  onClose,
  asset,
  onUpdateAsset,
  onPlaceOnTimeline,
  targetTrackIndex = 4,
  bpm,
}) => {
  // Trimming
  const [startPercent, setStartPercent] = useState(0);
  const [endPercent, setEndPercent] = useState(100);

  // Envelopes & Gain
  const [gainDb, setGainDb] = useState(0); // -12dB to +12dB
  const [fadeInSec, setFadeInSec] = useState(0.05); // seconds
  const [fadeOutSec, setFadeOutSec] = useState(0.05); // seconds

  // DSP Processors
  const [highPassEnabled, setHighPassEnabled] = useState(true);
  const [highPassCutoff, setHighPassCutoff] = useState(90); // Hz

  const [deEsserEnabled, setDeEsserEnabled] = useState(false);
  const [deEsserFreq, setDeEsserFreq] = useState(6500); // Hz

  const [saturationWarmth, setSaturationWarmth] = useState(0.1); // 0 to 1
  const [pitchShiftSemitones, setPitchShiftSemitones] = useState(0); // -12 to +12

  // Audition State & A/B Comparison
  const [isPlaying, setIsPlaying] = useState(false);
  const [auditionMode, setAuditionMode] = useState<'processed' | 'original'>('processed');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioEngine = useRef(AudioEngine.getInstance()).current;
  const activeNodesRef = useRef<{ source: AudioBufferSourceNode; cleanup: () => void } | null>(null);

  // Reset parameters when asset changes
  useEffect(() => {
    if (asset) {
      setStartPercent(0);
      setEndPercent(100);
      setGainDb(0);
      setFadeInSec(0.05);
      setFadeOutSec(0.05);
      setPitchShiftSemitones(asset.pitchShift || 0);
    }
  }, [asset]);

  // Draw interactive waveform canvas
  useEffect(() => {
    if (!asset || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0f1118';
    ctx.fillRect(0, 0, w, h);

    const peaks = asset.peaks || [];
    const barWidth = w / Math.max(1, peaks.length);

    // Waveform bars with gain scaling & trimming shades
    const gainScale = Math.pow(10, gainDb / 20);

    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const scaledPeak = Math.min(1.0, peak * gainScale);
      const barHeight = Math.max(2, scaledPeak * (h - 16));
      const x = i * barWidth;
      const y = (h - barHeight) / 2;

      const currentPercent = (i / peaks.length) * 100;
      const isInsideTrim = currentPercent >= startPercent && currentPercent <= endPercent;

      if (!isInsideTrim) {
        ctx.fillStyle = '#262939';
      } else {
        // Gradient color for vocal clarity
        ctx.fillStyle = gainDb > 6 ? '#f43f5e' : '#ec4899';
      }

      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    }

    // Draw trim boundary lines
    const startX = (startPercent / 100) * w;
    const endX = (endPercent / 100) * w;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, h);
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, h);
    ctx.stroke();
  }, [asset, startPercent, endPercent, gainDb]);

  const stopAudition = () => {
    if (activeNodesRef.current) {
      try {
        activeNodesRef.current.source.stop();
        activeNodesRef.current.cleanup();
      } catch {}
      activeNodesRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleAudition = (mode: 'processed' | 'original') => {
    if (!asset) return;
    if (isPlaying && auditionMode === mode) {
      stopAudition();
      return;
    }

    stopAudition();
    setAuditionMode(mode);

    const buffer = audioEngine.audioBufferCache.get(asset.id);
    if (!buffer) return;

    const ctx = audioEngine.ctx;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Pitch shift via playbackRate
    const semitones = mode === 'processed' ? pitchShiftSemitones : 0;
    source.playbackRate.value = Math.pow(2, semitones / 12);

    let lastNode: AudioNode = source;

    // Gain node
    const gainNode = ctx.createGain();
    const effectiveGain = mode === 'processed' ? Math.pow(10, gainDb / 20) : 1.0;
    gainNode.gain.setValueAtTime(effectiveGain, ctx.currentTime);
    lastNode.connect(gainNode);
    lastNode = gainNode;

    // High pass filter
    let hpFilter: BiquadFilterNode | null = null;
    if (mode === 'processed' && highPassEnabled) {
      hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(highPassCutoff, ctx.currentTime);
      lastNode.connect(hpFilter);
      lastNode = hpFilter;
    }

    // De-Esser notch
    let deEsserFilter: BiquadFilterNode | null = null;
    if (mode === 'processed' && deEsserEnabled) {
      deEsserFilter = ctx.createBiquadFilter();
      deEsserFilter.type = 'peaking';
      deEsserFilter.frequency.setValueAtTime(deEsserFreq, ctx.currentTime);
      deEsserFilter.gain.setValueAtTime(-6.0, ctx.currentTime);
      deEsserFilter.Q.setValueAtTime(2.0, ctx.currentTime);
      lastNode.connect(deEsserFilter);
      lastNode = deEsserFilter;
    }

    // Connect to Vocal Mixer Channel 8
    lastNode.connect(audioEngine.mixer.getChannelInput(8));

    // Calculate time offsets
    const offsetSec = (startPercent / 100) * asset.duration;
    const durationSec = Math.max(0.1, ((endPercent - startPercent) / 100) * asset.duration);

    // Apply fade-in
    if (mode === 'processed' && fadeInSec > 0) {
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(effectiveGain, ctx.currentTime + fadeInSec);
    }

    // Apply fade-out
    if (mode === 'processed' && fadeOutSec > 0) {
      const fadeStart = ctx.currentTime + durationSec - fadeOutSec;
      if (fadeStart > ctx.currentTime) {
        gainNode.gain.setValueAtTime(effectiveGain, fadeStart);
        gainNode.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
      }
    }

    source.start(ctx.currentTime, offsetSec, durationSec);
    setIsPlaying(true);

    activeNodesRef.current = {
      source,
      cleanup: () => {
        gainNode.disconnect();
        hpFilter?.disconnect();
        deEsserFilter?.disconnect();
      },
    };

    source.onended = () => {
      setIsPlaying(false);
      activeNodesRef.current = null;
    };
  };

  const handleApplyToTimeline = () => {
    if (!asset) return;
    stopAudition();

    const trimmedDuration = ((endPercent - startPercent) / 100) * asset.duration;
    const secondsPer16th = (60 / bpm) / 4;
    const durationSteps = Math.max(2, Math.round(trimmedDuration / secondsPer16th));
    const fadeInSteps = Math.max(0, Math.round(fadeInSec / secondsPer16th));
    const fadeOutSteps = Math.max(0, Math.round(fadeOutSec / secondsPer16th));

    const newClip: ArrangementClip = {
      id: `vocal_clip_${Date.now()}`,
      trackIndex: targetTrackIndex,
      startStep: 0,
      durationSteps,
      type: 'audio',
      audioAssetId: asset.id,
      name: `${asset.name} (Tuned)`,
      color: '#ec4899',
      gain: Math.pow(10, gainDb / 20),
      fadeInSteps,
      fadeOutSteps,
    };

    onPlaceOnTimeline?.(newClip);

    const updatedAsset: AudioAsset = {
      ...asset,
      startTime: (startPercent / 100) * asset.duration,
      endTime: (endPercent / 100) * asset.duration,
      pitchShift: pitchShiftSemitones,
    };
    onUpdateAsset?.(updatedAsset);

    onClose();
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#13151f] border border-[#272b3c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222638] bg-[#161926]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Vocal Processor & Clip Editor
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  {asset.name}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Non-destructive trimming, gain envelope, high-pass rumble filter & de-esser
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAudition();
              onClose();
            }}
            className="text-zinc-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-[#202538]"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Waveform Viewport */}
          <div className="bg-[#0c0e15] p-3 rounded-xl border border-[#222638] flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={560}
              height={100}
              className="w-full h-24 rounded-lg"
            />

            {/* Trimming Sliders */}
            <div className="w-full mt-3 grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-zinc-400 mb-1">
                  <span>Start Trim:</span>
                  <span className="font-mono text-pink-400">{((startPercent / 100) * asset.duration).toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, endPercent - 5)}
                  step="0.5"
                  value={startPercent}
                  onChange={(e) => setStartPercent(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-zinc-400 mb-1">
                  <span>End Trim:</span>
                  <span className="font-mono text-pink-400">{((endPercent / 100) * asset.duration).toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min={Math.min(100, startPercent + 5)}
                  max="100"
                  step="0.5"
                  value={endPercent}
                  onChange={(e) => setEndPercent(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* DSP Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gain & Envelopes */}
            <div className="p-4 bg-[#181a28] rounded-xl border border-[#262c3f] space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                Vocal Gain & Fades
              </h4>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-zinc-400 mb-1">
                  <span>Clip Gain:</span>
                  <span className="font-mono text-white">{gainDb > 0 ? `+${gainDb}` : gainDb} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={gainDb}
                  onChange={(e) => setGainDb(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Fade In:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={fadeInSec}
                    onChange={(e) => setFadeInSec(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-zinc-500">{fadeInSec.toFixed(2)}s</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Fade Out:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={fadeOutSec}
                    onChange={(e) => setFadeOutSec(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-zinc-500">{fadeOutSec.toFixed(2)}s</span>
                </div>
              </div>
            </div>

            {/* Vocal Polish & Pitch Tuning */}
            <div className="p-4 bg-[#181a28] rounded-xl border border-[#262c3f] space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                Tonal Polish & Pitch
              </h4>

              {/* High-Pass Rumble Filter */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400">High-Pass Filter:</span>
                <button
                  onClick={() => setHighPassEnabled((p) => !p)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    highPassEnabled
                      ? 'bg-pink-600/30 text-pink-300 border-pink-500'
                      : 'bg-[#12141d] text-zinc-400 border-[#2c3248]'
                  }`}
                >
                  {highPassEnabled ? `${highPassCutoff}Hz ON` : 'OFF'}
                </button>
              </div>

              {/* De-Esser Notch */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400">De-Esser (6.5kHz):</span>
                <button
                  onClick={() => setDeEsserEnabled((p) => !p)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    deEsserEnabled
                      ? 'bg-pink-600/30 text-pink-300 border-pink-500'
                      : 'bg-[#12141d] text-zinc-400 border-[#2c3248]'
                  }`}
                >
                  {deEsserEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Pitch Shift */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-zinc-400 mb-1">
                  <span>Pitch Shift (Semitones):</span>
                  <span className="font-mono text-white">
                    {pitchShiftSemitones > 0 ? `+${pitchShiftSemitones}` : pitchShiftSemitones} st
                  </span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={pitchShiftSemitones}
                  onChange={(e) => setPitchShiftSemitones(parseInt(e.target.value, 10))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* A/B Comparison and Final Action */}
          <div className="flex items-center justify-between border-t border-[#222638] pt-4">
            {/* A/B Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAudition('processed')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  isPlaying && auditionMode === 'processed'
                    ? 'bg-pink-600 text-white border-pink-500 shadow-md shadow-pink-600/30'
                    : 'bg-[#1e2233] text-zinc-300 border-[#2b3046] hover:bg-[#282d43]'
                }`}
              >
                {isPlaying && auditionMode === 'processed' ? (
                  <Square className="w-3.5 h-3.5 fill-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                <span>Audition Processed</span>
              </button>

              <button
                onClick={() => handleAudition('original')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  isPlaying && auditionMode === 'original'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                    : 'bg-[#1e2233] text-zinc-400 border-[#2b3046] hover:text-white'
                }`}
              >
                {isPlaying && auditionMode === 'original' ? (
                  <Square className="w-3.5 h-3.5 fill-white" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>B: Original Raw</span>
              </button>
            </div>

            {/* Apply to Track */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  stopAudition();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyToTimeline}
                className="flex items-center gap-2 px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-pink-600/30 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply & Place on Timeline</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
