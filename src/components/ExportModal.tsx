/**
 * BeatFlow Studio - Offline Audio & MIDI Export Modal
 * Real-time OfflineAudioContext rendering with progress feedback and direct browser file download.
 */
import React, { useState } from 'react';
import { Download, CheckCircle, Loader2, Music, Disc } from 'lucide-react';
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
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setIsDone(false);

    try {
      if (exportType === 'master_wav') {
        const audioCache = (AudioEngine.getInstance() as any).audioBufferCache || new Map();
        const blob = await AudioExporter.renderProjectToWav(
          project,
          audioCache,
          (p) => setProgress(p)
        );

        AudioExporter.downloadWav(
          blob,
          `${project.name.toLowerCase().replace(/\s+/g, '_')}_master.wav`
        );
        setIsDone(true);
      } else if (exportType === 'stems_wav') {
        const audioCache = (AudioEngine.getInstance() as any).audioBufferCache || new Map();
        for (let i = 0; i < project.tracks.length; i++) {
          const track = project.tracks[i];
          setProgress({
            progress: (i + 0.5) / project.tracks.length,
            stage: 'rendering',
          });

          const blob = await AudioExporter.renderProjectToWav(
            project,
            audioCache,
            undefined,
            i
          );
          AudioExporter.downloadWav(
            blob,
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
        <div className="my-5 space-y-3">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Render Mode
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
              <span className="text-xs font-bold text-white">Full Mix (WAV)</span>
              <span className="text-[10px] text-zinc-500">16-bit 44.1kHz Stereo</span>
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
              <span className="text-[10px] text-zinc-500">Individual tracks to WAV</span>
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

        {/* Progress or Completion State */}
        {isExporting && (
          <div className="p-4 bg-[#121319] border border-[#262837] rounded-lg mb-5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                {progress?.stage === 'rendering'
                  ? 'Rendering audio graph...'
                  : progress?.stage === 'encoding'
                  ? 'Encoding 16-bit PCM RIFF chunks...'
                  : 'Finalizing...'}
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

        {isDone && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-lg mb-5 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Export complete! Audio file was downloaded to your computer.</span>
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
