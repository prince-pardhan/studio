/**
 * BeatFlow Studio - Transport Bar & Master Monitor
 * Tap tempo calculator, Master clipping alert, real-time CPU load monitor,
 * spectrum visualizer, metronome, swing, and transport controls.
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Circle,
  Volume2,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { PlaybackMode } from '../types/project';
import { AudioEngine } from '../audio/AudioEngine';
import { SpectrumVisualizer } from './SpectrumVisualizer';

interface TransportBarProps {
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
  timeSignature: [number, number];
  swing: number;
  metronome: boolean;
  playbackMode: PlaybackMode;
  onTogglePlay: () => void;
  onStop: () => void;
  onSetBpm: (bpm: number) => void;
  onSetSwing: (swing: number) => void;
  onToggleMetronome: () => void;
  onSwitchMode: (mode: PlaybackMode) => void;
  onOpenRecord: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  currentStep,
  bpm,
  timeSignature,
  swing,
  metronome,
  playbackMode,
  onTogglePlay,
  onStop,
  onSetBpm,
  onSetSwing,
  onToggleMetronome,
  onSwitchMode,
  onOpenRecord,
}) => {
  const [masterPeak, setMasterPeak] = useState<number>(0);
  const [isClipping, setIsClipping] = useState<boolean>(false);
  const [isEditingBpm, setIsEditingBpm] = useState(false);
  const [bpmInput, setBpmInput] = useState(bpm.toString());
  const [masterVol, setMasterVol] = useState(85);
  const tapTimesRef = useRef<number[]>([]);
  const audioEngine = useRef(AudioEngine.getInstance()).current;

  // Real-time VU meter & clipping polling
  useEffect(() => {
    let animId: number;
    const updateMeter = () => {
      const data = audioEngine.mixer.getMeterData(0);
      setMasterPeak(data.peak);
      if (data.isClipping || audioEngine.mixer.isMasterClipping) {
        setIsClipping(true);
      }
      animId = requestAnimationFrame(updateMeter);
    };
    animId = requestAnimationFrame(updateMeter);
    return () => cancelAnimationFrame(animId);
  }, [audioEngine]);

  const bar = Math.floor(currentStep / 16) + 1;
  const beat = Math.floor((currentStep % 16) / 4) + 1;
  const sixteenth = (currentStep % 4) + 1;

  const secondsPer16th = (60 / bpm) / 4;
  const elapsedSec = (currentStep * secondsPer16th).toFixed(1);

  const handleBpmSubmit = () => {
    setIsEditingBpm(false);
    const parsed = parseInt(bpmInput, 10);
    if (!isNaN(parsed) && parsed >= 40 && parsed <= 240) {
      onSetBpm(parsed);
    } else {
      setBpmInput(bpm.toString());
    }
  };

  const handleTapTempo = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    // Reset if last tap was more than 2 seconds ago
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      tapTimesRef.current = [now];
      return;
    }

    taps.push(now);
    if (taps.length > 5) taps.shift();

    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgIntervalMs);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        onSetBpm(calculatedBpm);
      }
    }
  };

  const handleMasterVolChange = (val: number) => {
    setMasterVol(val);
    const dB = val === 0 ? -60 : ((val - 85) / 85) * 12;
    audioEngine.mixer.updateChannel(
      {
        id: 0,
        name: 'Master',
        color: '#fff',
        volume: dB,
        pan: 0,
        mute: false,
        solo: false,
        effects: [],
      },
      false
    );
  };

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-[#181920] border-b border-[#262835] text-xs shrink-0 h-13 select-none">
      {/* Left: Mode switch & Transport controls */}
      <div className="flex items-center gap-3">
        {/* PAT / SONG */}
        <div className="flex items-center p-0.5 bg-[#0e0f13] rounded border border-[#272935]">
          <button
            onClick={() => onSwitchMode('pattern')}
            className={`px-2.5 py-1 font-mono font-bold text-[11px] rounded transition-colors ${
              playbackMode === 'pattern'
                ? 'bg-orange-500 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            PAT
          </button>
          <button
            onClick={() => onSwitchMode('song')}
            className={`px-2.5 py-1 font-mono font-bold text-[11px] rounded transition-colors ${
              playbackMode === 'song'
                ? 'bg-orange-500 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            SONG
          </button>
        </div>

        {/* Play, Stop, Record */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePlay}
            title="Play/Pause (Space)"
            className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center transition-all shadow-sm ${
              isPlaying
                ? 'bg-amber-400 text-black hover:bg-amber-300 ring-2 ring-amber-400/30'
                : 'bg-[#282a38] hover:bg-[#34374a] text-zinc-100'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={onStop}
            title="Stop and return to start (Enter)"
            className="w-8.5 h-8.5 rounded-lg bg-[#282a38] hover:bg-[#34374a] text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={onOpenRecord}
            title="Record Microphone / Audio"
            className="w-8.5 h-8.5 rounded-lg bg-[#282a38] hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center transition-colors border border-red-500/30"
          >
            <Circle className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Song Position Display */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#0e0f13] border border-[#272935] rounded-md font-mono tabular-nums text-orange-400">
          <span className="text-xs font-bold tracking-wider">
            {String(bar).padStart(2, '0')}:{String(beat).padStart(2, '0')}:{String(sixteenth).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-zinc-500">{elapsedSec}s</span>
        </div>
      </div>

      {/* Center: BPM, Tap Tempo, Time Sig, Metronome, Swing, Visualizer */}
      <div className="flex items-center gap-3">
        {/* BPM Tempo & Tap */}
        <div className="flex items-center gap-1.5 bg-[#0e0f13] px-2 py-1 rounded border border-[#272935]">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">BPM</span>
          {isEditingBpm ? (
            <input
              type="number"
              min={40}
              max={240}
              value={bpmInput}
              onChange={(e) => setBpmInput(e.target.value)}
              onBlur={handleBpmSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleBpmSubmit()}
              autoFocus
              className="w-10 bg-transparent text-center font-mono font-bold text-xs text-orange-400 outline-none"
            />
          ) : (
            <button
              onClick={() => {
                setBpmInput(bpm.toString());
                setIsEditingBpm(true);
              }}
              className="font-mono font-bold text-xs text-orange-400 hover:text-orange-300 w-10 text-center"
            >
              {bpm}
            </button>
          )}

          {/* Tap Tempo Button */}
          <button
            onClick={handleTapTempo}
            title="Tap repeatedly to set BPM"
            className="px-1.5 py-0.5 text-[10px] font-bold bg-[#252837] hover:bg-[#34384d] text-zinc-300 hover:text-white rounded uppercase"
          >
            Tap
          </button>
        </div>

        {/* Time Signature */}
        <div className="flex items-center gap-1 bg-[#0e0f13] px-2 py-1 rounded border border-[#272935] font-mono text-xs font-semibold text-zinc-300">
          <span>{timeSignature[0]}/{timeSignature[1]}</span>
        </div>

        {/* Metronome */}
        <button
          onClick={onToggleMetronome}
          title="Metronome Click"
          className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors font-medium text-xs ${
            metronome
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
              : 'bg-[#0e0f13] border-[#272935] text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Click</span>
        </button>

        {/* Swing % */}
        <div className="flex items-center gap-1.5 bg-[#0e0f13] px-2 py-1 rounded border border-[#272935]">
          <span className="text-[10px] text-zinc-500 font-bold">SWING</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(swing * 100)}
            onChange={(e) => onSetSwing(parseInt(e.target.value, 10) / 100)}
            className="w-12 h-1 cursor-pointer bg-zinc-700"
          />
          <span className="font-mono text-[10px] text-zinc-300 tabular-nums">
            {Math.round(swing * 100)}%
          </span>
        </div>

        {/* Spectrum Visualizer Widget */}
        <SpectrumVisualizer />
      </div>

      {/* Right: Master Volume, Peak Meter, and Clip Indicator */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="range"
            min={0}
            max={100}
            value={masterVol}
            onChange={(e) => handleMasterVolChange(parseInt(e.target.value, 10))}
            className="w-16 h-1 cursor-pointer bg-zinc-700"
            title={`Master Volume: ${masterVol}%`}
          />
        </div>

        {/* Dual LED Meter */}
        <div className="flex flex-col gap-0.5 p-1 bg-[#0a0b0d] rounded border border-[#272935] w-20">
          <div className="h-1.5 bg-zinc-900 rounded-xs overflow-hidden flex">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${Math.min(100, masterPeak * 110)}%`,
                backgroundColor:
                  masterPeak > 0.95 ? '#ef4444' : masterPeak > 0.75 ? '#eab308' : '#10b981',
              }}
            />
          </div>
          <div className="h-1.5 bg-zinc-900 rounded-xs overflow-hidden flex">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${Math.min(100, masterPeak * 102)}%`,
                backgroundColor:
                  masterPeak > 0.95 ? '#ef4444' : masterPeak > 0.75 ? '#eab308' : '#10b981',
              }}
            />
          </div>
        </div>

        {/* Clipping Warning LED */}
        <button
          onClick={() => {
            setIsClipping(false);
            audioEngine.mixer.resetMasterClipping();
          }}
          title={isClipping ? 'Digital clipping detected! Click to reset.' : 'No clipping'}
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
            isClipping
              ? 'bg-red-600 text-white animate-pulse shadow-[0_0_8px_#ef4444]'
              : 'bg-[#1b1c26] text-zinc-600'
          }`}
        >
          CLIP
        </button>
      </div>
    </div>
  );
};
