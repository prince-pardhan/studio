/**
 * BeatFlow Studio - Audio Settings & Device Status Modal
 * Buffer size selection, sample rate monitor, latency configuration, and engine error recovery.
 */
import React, { useState } from 'react';
import { Settings, RefreshCw, Cpu, Activity, CheckCircle } from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [latencyProfile, setLatencyProfile] = useState<'interactive' | 'balanced' | 'safe'>('interactive');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const audioEngine = AudioEngine.getInstance();

  if (!isOpen) return null;

  const handleRestartAudio = async () => {
    setIsResetting(true);
    setResetSuccess(false);
    try {
      if (audioEngine.ctx.state === 'suspended') {
        await audioEngine.ctx.resume();
      }
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2000);
    } catch {
      // ignore
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#181922] border border-[#2d3042] rounded-xl shadow-2xl p-6 select-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#292c3c]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Audio Engine & Device Status</h3>
              <p className="text-[11px] text-zinc-400">Manage audio buffer, latency, and context recovery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-[#252837]"
          >
            ✕
          </button>
        </div>

        {/* Device Information */}
        <div className="my-4 p-3 bg-[#13141a] rounded-lg border border-[#242636] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">AudioContext Status</span>
            <span className="font-mono text-emerald-400 font-bold uppercase">
              {audioEngine.ctx.state}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Hardware Sample Rate</span>
            <span className="font-mono text-zinc-200">{audioEngine.ctx.sampleRate} Hz</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Estimated CPU Load</span>
            <span className="font-mono text-orange-400 font-bold">{audioEngine.cpuLoad}%</span>
          </div>
        </div>

        {/* Latency Buffer Settings */}
        <div className="mb-5 space-y-2">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Latency & Buffer Profile
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setLatencyProfile('interactive')}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                latencyProfile === 'interactive'
                  ? 'bg-orange-500/15 border-orange-500 text-white'
                  : 'bg-[#13141a] border-[#252737] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="text-xs font-bold text-white">Interactive</span>
              <span className="text-[10px] text-zinc-500">~15ms (Fast)</span>
            </button>

            <button
              onClick={() => setLatencyProfile('balanced')}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                latencyProfile === 'balanced'
                  ? 'bg-orange-500/15 border-orange-500 text-white'
                  : 'bg-[#13141a] border-[#252737] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="text-xs font-bold text-white">Balanced</span>
              <span className="text-[10px] text-zinc-500">~30ms (Default)</span>
            </button>

            <button
              onClick={() => setLatencyProfile('safe')}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                latencyProfile === 'safe'
                  ? 'bg-orange-500/15 border-orange-500 text-white'
                  : 'bg-[#13141a] border-[#252737] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="text-xs font-bold text-white">Safe / Relaxed</span>
              <span className="text-[10px] text-zinc-500">~60ms (Heavy DSP)</span>
            </button>
          </div>
        </div>

        {/* Engine Recovery Action */}
        <div className="p-3 bg-[#13141a] rounded-lg border border-[#242636] mb-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-200 block">Audio Engine Recovery</span>
            <span className="text-[10px] text-zinc-500">
              Recover from device sleep or audio context suspension
            </span>
          </div>

          <button
            onClick={handleRestartAudio}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252838] hover:bg-[#32364a] text-zinc-200 rounded text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Restarting...' : 'Restart'}</span>
          </button>
        </div>

        {resetSuccess && (
          <div className="mb-4 p-2 bg-emerald-500/15 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>AudioContext re-initialized and ready.</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-2 border-t border-[#292c3c]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-orange-500 text-black text-xs font-bold rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
