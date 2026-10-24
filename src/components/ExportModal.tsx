/**
 * BeatFlow Studio - Offline Audio & MIDI Export Modal
 * Real-time OfflineAudioContext rendering with bit depth (16/24/32-bit), sample rates,
 * TPDF dithering, tail rendering, mastering chain integration, clipping safety scan, and progress bar.
 */
import React, { useState } from 'react';
import {
  Download,
  CheckCircle,
  Loader2,
  Music,
  Disc,
  AlertTriangle,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { Project } from '../types/project';
import { AudioExporter, ExportProgress } from '../audio/AudioExporter';
import { AudioEngine } from '../audio/AudioEngine';
import { MidiService } from '../midi/MidiService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [exportType, setExportType] = useState<'master_wav' | 'stems_wav' | 'midi'>('master_wav');
  const [bitDepth, setBitDepth] = useState<16 | 24 | 32>(24);
  const [sampleRate, setSampleRate] = useState<44100 | 48000 | 96000>(44100);
  const [dither, setDither] = useState<'none' | 'tpdf'>('tpdf');
  const [tailSec, setTailSec] = useState<number>(2.0);
  const [applyMastering, setApplyMastering] = useState<boolean>(true);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [peakReport, setPeakReport] = useState<{ maxPeak: number; isClipping: boolean } | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setIsDone(false);
    setPeakReport(null);

    try {
      const audioCache = (AudioEngine.getInstance() as any).audioBufferCache || new Map();

      if (exportType === 'master_wav') {
        const result = await AudioExporter.renderProjectToWav(
          project,
          audioCache,
          (p) => setProgress(p),
          undefined,
          {
            bitDepth,
            sampleRate,
            dither: bitDepth === 32 ? 'none' : dither,
            tailSec,
            applyMastering,
          }
        );

        AudioExporter.downloadWav(
          result.blob,
          `${project.name.toLowerCase().replace(/\s+/g, '_')}_master_${bitDepth}bit_${sampleRate}Hz.wav`
        );

        setPeakReport({ maxPeak: result.maxPeak, isClipping: result.isClipping });
        setIsDone(true);
      } else if (exportType === 'stems_wav') {
        for (let i = 0; i < project.tracks.length; i++) {
          const track = project.tracks[i];
          setProgress({
            progress: (i + 0.5) / project.tracks.length,
            stage: 'rendering',
          });

          const result = await AudioExporter.renderProjectToWav(
            project,
            audioCache,
            undefined,
            i,
            {
              bitDepth,
              sampleRate,
              dither: bitDepth === 32 ? 'none' : dither,
              tailSec,
              applyMastering: false, // Don't apply master limiter to individual stems
            }
          );

          AudioExporter.downloadWav(
            result.blob,
            `${project.name.toLowerCase().replace(/\s+/g, '_')}_stem_${track.name.replace(/\s+/g, '_')}.wav`
          );
        }
        setIsDone(true);
      } else if (exportType === 'midi') {
        // Export active pattern to MIDI
        const activePat =
          project.patterns.find((p) => p.id === project.activePatternId) || project.patterns[0];
        MidiService.exportPatternToMidi(
          activePat,
          project.bpm,
          'ch_lead',
          `${project.name.toLowerCase().replace(/\s+/g, '_')}.mid`
        );
        setIsDone(true);
      }
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#181922] border border-[#2c2f40] rounded-xl shadow-2xl p-6 select-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#292c3c]">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-bold text-white">Export Project Audio</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-[#252837]"
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div className="my-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Render Format
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => setExportType('master_wav')}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  exportType === 'master_wav'
                    ? 'bg-orange-500/15 border-orange-500 text-white'
                    : 'bg-[#121319] border-[#292c3c] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Disc className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-white">Full Song (WAV)</span>
                <span className="text-[10px] text-zinc-500">Mastered stereo output</span>
              </button>

              <button
                onClick={() => setExportType('stems_wav')}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  exportType === 'stems_wav'
                    ? 'bg-orange-500/15 border-orange-500 text-white'
                    : 'bg-[#121319] border-[#292c3c] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Disc className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Track Stems</span>
                <span className="text-[10px] text-zinc-500">Individual stems to WAV</span>
              </button>

              <button
                onClick={() => setExportType('midi')}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  exportType === 'midi'
                    ? 'bg-orange-500/15 border-orange-500 text-white'
                    : 'bg-[#121319] border-[#292c3c] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Music className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">MIDI File</span>
                <span className="text-[10px] text-zinc-500">Standard MIDI (.mid)</span>
              </button>
            </div>
          </div>

          {exportType !== 'midi' && (
            <div className="bg-[#121319] p-3 rounded-lg border border-[#252837] space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Bit Depth */}
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block mb-1">Bit Depth</span>
                  <select
                    value={bitDepth}
                    onChange={(e) => setBitDepth(parseInt(e.target.value, 10) as any)}
                    className="w-full bg-[#1b1c27] border border-[#2c2f42] text-zinc-200 text-xs rounded px-2.5 py-1 outline-none"
                  >
                    <option value={16}>16-bit PCM (CD Standard)</option>
                    <option value={24}>24-bit PCM (Studio Master)</option>
                    <option value={32}>32-bit Float (Zero Clipping)</option>
                  </select>
                </div>

                {/* Sample Rate */}
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block mb-1">Sample Rate</span>
                  <select
                    value={sampleRate}
                    onChange={(e) => setSampleRate(parseInt(e.target.value, 10) as any)}
                    className="w-full bg-[#1b1c27] border border-[#2c2f42] text-zinc-200 text-xs rounded px-2.5 py-1 outline-none"
                  >
                    <option value={44100}>44.1 kHz (Standard)</option>
                    <option value={48000}>48.0 kHz (Broadcast/Video)</option>
                    <option value={96000}>96.0 kHz (High-Resolution)</option>
                  </select>
                </div>

                {/* Dither */}
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block mb-1">Dithering</span>
                  <select
                    value={dither}
                    disabled={bitDepth === 32}
                    onChange={(e) => setDither(e.target.value as any)}
                    className="w-full bg-[#1b1c27] border border-[#2c2f42] text-zinc-200 text-xs rounded px-2.5 py-1 outline-none disabled:opacity-50"
                  >
                    <option value="tpdf">Triangular (TPDF) Dither</option>
                    <option value="none">None (Truncate)</option>
                  </select>
                </div>

                {/* Reverb Tail */}
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block mb-1">Reverb/Delay Tail</span>
                  <select
                    value={tailSec}
                    onChange={(e) => setTailSec(parseFloat(e.target.value))}
                    className="w-full bg-[#1b1c27] border border-[#2c2f42] text-zinc-200 text-xs rounded px-2.5 py-1 outline-none"
                  >
                    <option value={1.0}>1.0 second</option>
                    <option value={2.0}>2.0 seconds (Recommended)</option>
                    <option value={3.5}>3.5 seconds</option>
                    <option value={5.0}>5.0 seconds</option>
                  </select>
                </div>
              </div>

              {/* Mastering Chain Toggle */}
              <div className="pt-2 border-t border-[#20222f] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-zinc-300 font-medium">Apply Mastering Suite Processing</span>
                </div>
                <input
                  type="checkbox"
                  checked={applyMastering}
                  onChange={(e) => setApplyMastering(e.target.checked)}
                  className="rounded cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Progress State */}
        {isExporting && (
          <div className="p-4 bg-[#121319] border border-[#262837] rounded-lg mb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                {progress?.stage === 'rendering'
                  ? 'Rendering audio graph & DSP plugins...'
                  : progress?.stage === 'encoding'
                  ? `Encoding ${bitDepth}-bit WAV RIFF chunks...`
                  : 'Finalizing export...'}
              </span>
              <span className="font-mono text-[11px] text-orange-400">
                {Math.round((progress?.progress ?? 0) * 100)}%
              </span>
            </div>

            <div className="h-2 bg-[#0a0a0f] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-150"
                style={{ width: `${Math.round((progress?.progress ?? 0) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Completion & Safety Scan Report */}
        {isDone && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-lg mb-4 flex flex-col gap-1 text-xs text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold">Export complete! Audio file was downloaded.</span>
            </div>
            {peakReport && (
              <div className="text-[11px] text-zinc-300 pl-6 font-mono">
                Scanned Max Peak: {(20 * Math.log10(Math.max(0.0001, peakReport.maxPeak))).toFixed(1)} dBFS
                {peakReport.isClipping ? (
                  <span className="text-red-400 font-bold ml-2">⚠️ Warning: Digital clipping detected!</span>
                ) : (
                  <span className="text-emerald-400 font-bold ml-2">✓ Clean headroom (No clipping)</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded"
          >
            {isDone ? 'Close' : 'Cancel'}
          </button>

          <button
            onClick={handleStartExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 disabled:opacity-50 text-black font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Rendering...' : 'Start Render & Download'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
