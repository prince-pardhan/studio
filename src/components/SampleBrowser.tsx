/**
 * BeatFlow Studio - Sample Browser & Asset Library
 * Built-in drums, virtual synthesizers, user microphone recordings, and disk audio file import.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  Volume2,
  Upload,
  Mic,
  Disc,
  Music,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Scissors,
} from 'lucide-react';
import { DrumType, SynthPreset, AudioAsset } from '../types/project';
import { AudioEngine } from '../audio/AudioEngine';
import { AssetStorage } from '../storage/AssetStorage';

interface SampleBrowserProps {
  onAddAudioClipToTimeline?: (asset: AudioAsset) => void;
  onEditAsset?: (asset: AudioAsset) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const BUILT_IN_DRUMS: { id: string; name: string; type: DrumType }[] = [
  { id: 'bd_kick', name: '808 Sub Kick', type: 'kick' },
  { id: 'bd_snare', name: 'Trap Snare Tight', type: 'snare' },
  { id: 'bd_clap', name: 'Studio Clap Stereo', type: 'clap' },
  { id: 'bd_hh_c', name: 'Crisp Closed Hat', type: 'hihat_closed' },
  { id: 'bd_hh_o', name: 'Sizzle Open Hat', type: 'hihat_open' },
  { id: 'bd_perc', name: 'Metallic Perc / Rim', type: 'perc' },
  { id: 'bd_tom', name: 'Low Resonant Tom', type: 'tom' },
  { id: 'bd_808', name: 'Deep 808 Bass Hit', type: '808_bass' },
];

const BUILT_IN_SYNTHS: { id: string; name: string; preset: SynthPreset }[] = [
  { id: 'syn_lead', name: 'Cyber Saw Lead', preset: 'lead' },
  { id: 'syn_pad', name: 'Ambient Poly Pad', preset: 'pad' },
  { id: 'syn_pluck', name: 'Crystal Pluck', preset: 'pluck' },
  { id: 'syn_keys', name: 'FM Electric Rhodes', preset: 'epiano' },
  { id: 'syn_bass', name: 'Punchy Analog Bass', preset: 'bass' },
];

export const SampleBrowser: React.FC<SampleBrowserProps> = ({
  onAddAudioClipToTimeline,
  onEditAsset,
  isOpen,
  onToggle,
}) => {
  const [activeCategory, setActiveCategory] = useState<'drums' | 'synths' | 'recordings'>('drums');
  const [recordedAssets, setRecordedAssets] = useState<AudioAsset[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioEngine = useRef(AudioEngine.getInstance()).current;

  // Load user recordings from IndexedDB
  const refreshAssets = async () => {
    try {
      const all = await AssetStorage.getAllAssets();
      setRecordedAssets(
        all.map((a) => ({
          id: a.id,
          name: a.name,
          duration: a.duration,
          sampleRate: a.sampleRate,
          channels: a.channels,
          createdAt: a.createdAt,
          peaks: a.peaks,
        }))
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshAssets();
  }, []);

  const handleAuditionDrum = (type: DrumType) => {
    audioEngine.auditionDrum(type, 0, 0.85);
  };

  const handleAuditionSynth = (preset: SynthPreset) => {
    audioEngine.auditionNote(preset, 60, 0.4, 0, 0.8);
  };

  const handleImportAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioEngine.ctx.decodeAudioData(arrayBuffer);
      const peaks = AssetStorage.extractPeaks(audioBuffer, 100);
      const id = `asset_${Date.now()}`;

      await AssetStorage.saveAsset({
        id,
        name: file.name.replace(/\.[^/.]+$/, ''),
        blob: file,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        peaks,
        createdAt: Date.now(),
      });

      audioEngine.cacheAudioBuffer(id, audioBuffer);
      await refreshAssets();
      setActiveCategory('recordings');
    } catch {
      alert('Unable to decode audio file. Please choose a valid WAV or MP3.');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    await AssetStorage.deleteAsset(id);
    await refreshAssets();
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        title="Open Browser"
        className="w-8 bg-[#171821] hover:bg-[#20222e] border-r border-[#242635] flex flex-col items-center py-4 text-zinc-400 hover:text-orange-400 transition-colors shrink-0"
      >
        <Folder className="w-4 h-4 mb-2" />
        <span className="[writing-mode:vertical-lr] text-[10px] font-bold uppercase tracking-wider">
          Browser
        </span>
      </button>
    );
  }

  return (
    <div className="w-64 bg-[#14151c] border-r border-[#242635] flex flex-col shrink-0 select-none overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-[#181922] border-b border-[#242635] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Sound Browser
          </span>
        </div>
        <button
          onClick={onToggle}
          className="text-zinc-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-[#252837]"
        >
          ✕
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-[#242635] bg-[#111218]">
        <button
          onClick={() => setActiveCategory('drums')}
          className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
            activeCategory === 'drums'
              ? 'text-orange-400 border-b-2 border-orange-500 bg-[#191a24]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          <span>Drums</span>
        </button>
        <button
          onClick={() => setActiveCategory('synths')}
          className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
            activeCategory === 'synths'
              ? 'text-orange-400 border-b-2 border-orange-500 bg-[#191a24]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Synths</span>
        </button>
        <button
          onClick={() => setActiveCategory('recordings')}
          className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
            activeCategory === 'recordings'
              ? 'text-orange-400 border-b-2 border-orange-500 bg-[#191a24]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Audio ({recordedAssets.length})</span>
        </button>
      </div>

      {/* Sample List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeCategory === 'drums' &&
          BUILT_IN_DRUMS.map((drum) => (
            <div
              key={drum.id}
              onClick={() => handleAuditionDrum(drum.type)}
              className="flex items-center justify-between p-2 rounded hover:bg-[#20222f] cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Disc className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-400" />
                <span className="text-xs text-zinc-300 group-hover:text-white truncate">
                  {drum.name}
                </span>
              </div>
              <Volume2 className="w-3.5 h-3.5 text-zinc-600 group-hover:text-orange-400" />
            </div>
          ))}

        {activeCategory === 'synths' &&
          BUILT_IN_SYNTHS.map((synth) => (
            <div
              key={synth.id}
              onClick={() => handleAuditionSynth(synth.preset)}
              className="flex items-center justify-between p-2 rounded hover:bg-[#20222f] cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Music className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400" />
                <span className="text-xs text-zinc-300 group-hover:text-white truncate">
                  {synth.name}
                </span>
              </div>
              <Volume2 className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-400" />
            </div>
          ))}

        {activeCategory === 'recordings' && (
          <div className="space-y-1">
            {recordedAssets.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs px-4">
                No recorded audio clips yet. Click Record on the transport or import a file below!
              </div>
            ) : (
              recordedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-[#20222f] group transition-colors"
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    <Mic className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs text-zinc-200 truncate">{asset.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {asset.duration.toFixed(1)}s · {asset.sampleRate}Hz
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {onEditAsset && (
                      <button
                        onClick={() => onEditAsset(asset)}
                        title="Edit / Trim Waveform"
                        className="p-1 text-zinc-400 hover:text-cyan-400 hover:bg-[#282a39] rounded"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onAddAudioClipToTimeline && (
                      <button
                        onClick={() => onAddAudioClipToTimeline(asset)}
                        title="Add clip to Arrangement"
                        className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-[#282a39] rounded"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      title="Delete recording"
                      className="p-1 text-zinc-500 hover:text-red-400 hover:bg-[#282a39] rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Upload Section */}
      <div className="p-3 border-t border-[#242635] bg-[#161722]">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2 bg-[#222432] hover:bg-[#2d3043] text-zinc-300 hover:text-white rounded text-xs font-semibold border border-[#313549] transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-orange-400" />
          <span>Import Audio (WAV/MP3)</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportAudioFile}
          accept="audio/*,.wav,.mp3"
          className="hidden"
        />
      </div>
    </div>
  );
};
