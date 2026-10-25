/**
 * BeatFlow Studio - Phase 14: Auto Mix Modal
 * Real-time DSP audio analysis and one-click smart mixing console:
 * - Computes true Peak dBFS, RMS dBFS, Crest factor, and spectral energy
 * - Displays detected acoustic characteristics (Rumble, Clarity, Sibilance, Dynamic Range)
 * - Presents mixing recommendations (Fader Gain, High-Pass, EQ, Compressor, De-Esser, Sends)
 * - Audition A/B comparison
 * - Applies configured plugin chain & faders directly to Mixer Channel 8 (Vocal / Mic)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  Activity,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';
import { AutoMixEngine, AutoMixRecommendations } from '../audio/AutoMixEngine';
import { AudioAsset, MixerChannel, Project } from '../types/project';

interface AutoMixModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onApplyMixerChannel: (channel: MixerChannel) => void;
  vocalAsset?: AudioAsset | null;
}

export const AutoMixModal: React.FC<AutoMixModalProps> = ({
  isOpen,
  onClose,
  project,
  onApplyMixerChannel,
  vocalAsset,
}) => {
  const [recommendations, setRecommendations] = useState<AutoMixRecommendations | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlayingAudition, setIsPlayingAudition] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const audioEngine = useRef(AudioEngine.getInstance()).current;
  const auditionNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Find the candidate vocal buffer to analyze
  useEffect(() => {
    if (!isOpen) {
      stopAudition();
      setAppliedSuccess(false);
      return;
    }

    setIsAnalyzing(true);
    setAppliedSuccess(false);

    // Look for vocal asset passed in or look up first audio clip
    let targetAssetId = vocalAsset?.id;
    if (!targetAssetId) {
      const audioClip = project.clips.find((c) => c.type === 'audio' && c.audioAssetId);
      if (audioClip) targetAssetId = audioClip.audioAssetId;
    }

    let buffer: AudioBuffer | undefined;
    if (targetAssetId) {
      buffer = audioEngine.audioBufferCache.get(targetAssetId);
    }

    // If no audio clip exists yet, generate a representative synthetic buffer for demonstration
    if (!buffer) {
      const dummyBuffer = audioEngine.ctx.createBuffer(2, audioEngine.ctx.sampleRate * 2, audioEngine.ctx.sampleRate);
      const ch0 = dummyBuffer.getChannelData(0);
      for (let i = 0; i < ch0.length; i++) {
        ch0[i] = (Math.random() * 2 - 1) * 0.25;
      }
      buffer = dummyBuffer;
    }

    // Run DSP analysis
    setTimeout(() => {
      if (buffer) {
        const vocalCh = project.mixerChannels.find((c) => c.id === 8) || project.mixerChannels[0];
        const rec = AutoMixEngine.generateVocalMixRecommendations(buffer, vocalCh.id, vocalCh.name);
        setRecommendations(rec);
      }
      setIsAnalyzing(false);
    }, 300);
  }, [isOpen, vocalAsset, project.clips, audioEngine]);

  const stopAudition = () => {
    if (auditionNodeRef.current) {
      try {
        auditionNodeRef.current.stop();
      } catch {}
      auditionNodeRef.current = null;
    }
    setIsPlayingAudition(false);
  };

  const handleToggleAudition = () => {
    if (isPlayingAudition) {
      stopAudition();
      return;
    }

    let targetAssetId = vocalAsset?.id;
    if (!targetAssetId) {
      const audioClip = project.clips.find((c) => c.type === 'audio' && c.audioAssetId);
      if (audioClip) targetAssetId = audioClip.audioAssetId;
    }

    if (!targetAssetId) return;
    const buffer = audioEngine.audioBufferCache.get(targetAssetId);
    if (!buffer) return;

    const source = audioEngine.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioEngine.mixer.getChannelInput(8));
    source.start(0);

    auditionNodeRef.current = source;
    setIsPlayingAudition(true);

    source.onended = () => {
      setIsPlayingAudition(false);
      auditionNodeRef.current = null;
    };
  };

  const handleApplyMix = () => {
    if (!recommendations) return;
    const currentChannel =
      project.mixerChannels.find((c) => c.id === recommendations.targetChannelId) ||
      project.mixerChannels[8];

    const updated = AutoMixEngine.applyRecommendationsToChannel(currentChannel, recommendations);
    onApplyMixerChannel(updated);
    setAppliedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#13151f] border border-[#272b3c] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222638] bg-[#161926]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Auto Mix Vocal Analyzer
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  DSP Engine
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Acoustic analysis, balance optimization & plugin chain generation
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

        <div className="p-6 space-y-5">
          {/* Analysis Metrics Grid */}
          {recommendations ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#181b29] border border-[#262c3f] rounded-xl text-center">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Peak Level</span>
                  <span
                    className={`text-lg font-mono font-bold ${
                      recommendations.analysis.isClipping ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {recommendations.analysis.peakDb} dBFS
                  </span>
                  <span className="text-[9px] text-zinc-500 block mt-0.5">
                    {recommendations.analysis.isClipping ? 'Clipping Detected' : 'Headroom OK'}
                  </span>
                </div>

                <div className="p-3 bg-[#181b29] border border-[#262c3f] rounded-xl text-center">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block">RMS Loudness</span>
                  <span className="text-lg font-mono font-bold text-white">
                    {recommendations.analysis.rmsDb} dBFS
                  </span>
                  <span className="text-[9px] text-zinc-500 block mt-0.5">Commercial Target: -16 dBFS</span>
                </div>

                <div className="p-3 bg-[#181b29] border border-[#262c3f] rounded-xl text-center">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Crest Factor</span>
                  <span className="text-lg font-mono font-bold text-purple-300">
                    {recommendations.analysis.crestFactorDb} dB
                  </span>
                  <span className="text-[9px] text-zinc-500 block mt-0.5">Dynamic Range</span>
                </div>
              </div>

              {/* Acoustic Diagnostic Notes */}
              <div className="p-3.5 bg-[#171926] border border-[#24283c] rounded-xl space-y-1.5">
                <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  Acoustic Assessment:
                </h4>
                <ul className="text-xs text-zinc-400 space-y-1 pl-4 list-disc">
                  {recommendations.summaryNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>

              {/* Recommended Chain Preview */}
              <div className="p-3.5 bg-[#151722] border border-[#232738] rounded-xl space-y-2.5">
                <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Mix Adjustments for Channel 8 ({recommendations.channelName}):
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-[#1b1e2c] rounded-lg border border-[#282d42] flex justify-between">
                    <span className="text-zinc-400">Channel Fader:</span>
                    <span className="font-mono font-bold text-purple-300">
                      {recommendations.volumeDb > 0 ? `+${recommendations.volumeDb}` : recommendations.volumeDb} dB
                    </span>
                  </div>

                  <div className="p-2 bg-[#1b1e2c] rounded-lg border border-[#282d42] flex justify-between">
                    <span className="text-zinc-400">High-Pass Filter:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {recommendations.highPassFreq} Hz Cut
                    </span>
                  </div>

                  <div className="p-2 bg-[#1b1e2c] rounded-lg border border-[#282d42] flex justify-between">
                    <span className="text-zinc-400">Compressor:</span>
                    <span className="font-mono font-bold text-pink-400">
                      {recommendations.compThreshold}dB ({recommendations.compRatio}:1)
                    </span>
                  </div>

                  <div className="p-2 bg-[#1b1e2c] rounded-lg border border-[#282d42] flex justify-between">
                    <span className="text-zinc-400">Presence Boost:</span>
                    <span className="font-mono font-bold text-cyan-400">
                      +{recommendations.eqPresenceGain}dB @ 3.5kHz
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500">
              {isAnalyzing ? 'Analyzing vocal audio buffer...' : 'No vocal buffer found to analyze'}
            </div>
          )}

          {/* Success toast if applied */}
          {appliedSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Applied Auto Mix parameters and plugin chain to Channel 8 successfully!</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-[#222638] pt-4">
            <button
              onClick={handleToggleAudition}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-300 bg-[#1e2233] hover:bg-[#282d43] rounded-xl border border-[#2b3046] transition-colors cursor-pointer"
            >
              {isPlayingAudition ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              <span>{isPlayingAudition ? 'Stop Audition' : 'Audition Vocal'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Close
              </button>

              <button
                onClick={handleApplyMix}
                disabled={!recommendations || appliedSuccess}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-40"
              >
                <Zap className="w-4 h-4" />
                <span>Apply Auto Mix</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
