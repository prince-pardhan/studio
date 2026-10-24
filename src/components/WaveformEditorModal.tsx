/**
 * BeatFlow Studio - Sample Waveform Editor & Trimmer Modal
 * Visual waveform display, start/end trimming, reverse audio toggle, and pitch adjustments.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Scissors, RotateCcw, Volume2, Check } from 'lucide-react';
import { AudioAsset } from '../types/project';
import { AudioEngine } from '../audio/AudioEngine';
import { AssetStorage } from '../storage/AssetStorage';

interface WaveformEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AudioAsset | null;
  onAssetUpdated?: (updated: AudioAsset) => void;
}

export const WaveformEditorModal: React.FC<WaveformEditorModalProps> = ({
  isOpen,
  onClose,
  asset,
  onAssetUpdated,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [startPercent, setStartPercent] = useState(0);
  const [endPercent, setEndPercent] = useState(100);
  const [pitchShift, setPitchShift] = useState(0); // semitones
  const [isReversed, setIsReversed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioEngine = useRef(AudioEngine.getInstance()).current;

  useEffect(() => {
    if (!asset || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const peaks = asset.peaks || [];
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / Math.max(1, peaks.length);

    // Draw background grid
    ctx.fillStyle = '#14151e';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform bars
    ctx.fillStyle = '#f97316';
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const barHeight = peak * (height - 10);
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      // Color dimmed if outside trimmed start/end range
      const percent = (i / peaks.length) * 100;
      if (percent < startPercent || percent > endPercent) {
        ctx.fillStyle = '#3a3c4f';
      } else {
        ctx.fillStyle = '#f97316';
      }
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  }, [asset, startPercent, endPercent, isReversed]);

  if (!isOpen || !asset) return null;

  const handleAudition = () => {
    const buffer = audioEngine.audioBufferCache.get(asset.id);
    if (!buffer) return;

    const source = audioEngine.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.pow(2, pitchShift / 12);

    const gain = audioEngine.ctx.createGain();
    source.connect(gain);
    gain.connect(audioEngine.mixer.getChannelInput(0));

    const offsetSec = (startPercent / 100) * asset.duration;
    const durationSec = ((endPercent - startPercent) / 100) * asset.duration;

    source.start(audioEngine.ctx.currentTime, offsetSec, durationSec);
    setIsPlaying(true);
    source.onended = () => setIsPlaying(false);
  };

  const handleSaveTrim = () => {
    const updated: AudioAsset = {
      ...asset,
      startTime: (startPercent / 100) * asset.duration,
      endTime: (endPercent / 100) * asset.duration,
      reversed: isReversed,
      pitchShift,
    };
    onAssetUpdated?.(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#181922] border border-[#2d3042] rounded-xl shadow-2xl p-6 select-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#292c3c]">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Sample Waveform Editor</h3>
              <p className="text-[11px] text-zinc-400">{asset.name} ({asset.duration.toFixed(2)}s)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-[#252837]"
          >
            ✕
          </button>
        </div>

        {/* Waveform Canvas */}
        <div className="my-5 flex flex-col gap-2">
          <canvas
            ref={canvasRef}
            width={520}
            height={120}
            className="w-full h-28 rounded-lg border border-[#282a3c] bg-[#121319]"
          />

          {/* Start and End Trimming Sliders */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex-1">
              <span className="text-[10px] text-zinc-400 block mb-1">
                Start: {startPercent}% ({((startPercent / 100) * asset.duration).toFixed(2)}s)
              </span>
              <input
                type="range"
                min={0}
                max={endPercent - 5}
                value={startPercent}
                onChange={(e) => setStartPercent(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-zinc-700 cursor-pointer"
              />
            </div>

            <div className="flex-1">
              <span className="text-[10px] text-zinc-400 block mb-1">
                End: {endPercent}% ({((endPercent / 100) * asset.duration).toFixed(2)}s)
              </span>
              <input
                type="range"
                min={startPercent + 5}
                max={100}
                value={endPercent}
                onChange={(e) => setEndPercent(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-zinc-700 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Controls: Pitch & Reverse */}
        <div className="grid grid-cols-2 gap-4 mb-5 p-3 bg-[#13141a] rounded-lg border border-[#242636]">
          <div>
            <span className="text-[10px] text-zinc-400 block mb-1">
              Pitch Shift: {pitchShift > 0 ? `+${pitchShift}` : pitchShift} semitones
            </span>
            <input
              type="range"
              min={-12}
              max={12}
              value={pitchShift}
              onChange={(e) => setPitchShift(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-zinc-700 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">Reverse Sample</span>
              <span className="text-[10px] text-zinc-500">Play in reverse</span>
            </div>
            <button
              onClick={() => setIsReversed(!isReversed)}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                isReversed
                  ? 'bg-orange-500 text-black'
                  : 'bg-[#252838] text-zinc-400 hover:text-white'
              }`}
            >
              {isReversed ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#292c3c]">
          <button
            onClick={handleAudition}
            className="flex items-center gap-2 px-4 py-2 bg-[#252838] hover:bg-[#32364a] text-zinc-200 hover:text-white rounded text-xs font-semibold"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Preview Trim</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTrim}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 text-black font-bold text-xs rounded-lg shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
