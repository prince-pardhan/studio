/**
 * BeatFlow Studio - Microphone Recording Modal
 * Live microphone input meter, permission request handling, real-time recording,
 * and automatic placement of audio clips onto the arrangement timeline.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Circle, AlertCircle, CheckCircle } from 'lucide-react';
import { RecordingEngine } from '../audio/RecordingEngine';
import { AudioEngine } from '../audio/AudioEngine';
import { AudioAsset, ArrangementClip } from '../types/project';

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecordedClip: (clip: ArrangementClip, asset: AudioAsset, buffer: AudioBuffer) => void;
  targetTrackIndex: number;
  currentStep: number;
}

export const RecordingModal: React.FC<RecordingModalProps> = ({
  isOpen,
  onClose,
  onAddRecordedClip,
  targetTrackIndex,
  currentStep,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [clipTitle, setClipTitle] = useState('Vocal Take');

  const audioEngine = useRef(AudioEngine.getInstance()).current;
  const recordingEngineRef = useRef<RecordingEngine | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    recordingEngineRef.current = new RecordingEngine(audioEngine.ctx);

    // Prompt mic permission
    recordingEngineRef.current
      .requestMicrophone()
      .then(() => {
        setHasPermission(true);
        setErrorMessage(null);
      })
      .catch((err) => {
        setHasPermission(false);
        setErrorMessage(
          err.name === 'NotAllowedError'
            ? 'Microphone access was denied. Please allow microphone permissions in your browser bar.'
            : `Unable to access microphone: ${err.message}`
        );
      });

    // Level meter animation
    let animId: number;
    const pollLevel = () => {
      if (recordingEngineRef.current) {
        setInputLevel(recordingEngineRef.current.getLiveInputLevel());
      }
      animId = requestAnimationFrame(pollLevel);
    };
    animId = requestAnimationFrame(pollLevel);

    return () => {
      cancelAnimationFrame(animId);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      recordingEngineRef.current?.cleanup();
      recordingEngineRef.current = null;
    };
  }, [isOpen, audioEngine.ctx]);

  const handleStartRecording = async () => {
    if (!recordingEngineRef.current || !hasPermission) return;
    try {
      await recordingEngineRef.current.startRecording();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 0.1);
      }, 100);
    } catch (err: any) {
      setErrorMessage(`Recording error: ${err.message}`);
    }
  };

  const handleStopRecording = async () => {
    if (!recordingEngineRef.current || !isRecording) return;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    try {
      const { asset, buffer } = await recordingEngineRef.current.stopRecording(clipTitle);
      audioEngine.cacheAudioBuffer(asset.id, buffer);

      // Convert duration seconds to 16th steps
      const bpm = audioEngine.ctx ? 128 : 120;
      const secondsPer16th = (60 / bpm) / 4;
      const durationSteps = Math.max(4, Math.round(asset.duration / secondsPer16th));

      const newClip: ArrangementClip = {
        id: `clip_${Date.now()}`,
        trackIndex: targetTrackIndex,
        startStep: currentStep,
        durationSteps,
        type: 'audio',
        audioAssetId: asset.id,
        name: asset.name,
        color: '#ec4899', // Pink
      };

      onAddRecordedClip(newClip, asset, buffer);
      setIsRecording(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(`Failed to process recording: ${err.message}`);
      setIsRecording(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#181922] border border-[#2c2f3f] rounded-xl shadow-2xl p-6 select-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#292c3b]">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-bold text-white">Record Audio / Microphone</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-[#252837]"
          >
            ✕
          </button>
        </div>

        {/* Permission / Status Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {hasPermission && (
          <div className="mt-4 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Microphone ready. Input level active.</span>
          </div>
        )}

        {/* Input Level VU Meter */}
        <div className="my-5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Input Level</span>
            <span className="font-mono text-[11px]">{Math.round(inputLevel * 100)}%</span>
          </div>
          <div className="h-3 bg-[#0f1015] rounded border border-[#272a39] overflow-hidden p-0.5">
            <div
              className="h-full rounded-sm transition-all duration-75"
              style={{
                width: `${Math.min(100, inputLevel * 100)}%`,
                backgroundColor:
                  inputLevel > 0.85 ? '#ef4444' : inputLevel > 0.6 ? '#eab308' : '#10b981',
              }}
            />
          </div>
        </div>

        {/* Clip Name */}
        <div className="mb-4">
          <label className="text-[11px] text-zinc-400 block mb-1">Take Name</label>
          <input
            type="text"
            value={clipTitle}
            onChange={(e) => setClipTitle(e.target.value)}
            disabled={isRecording}
            className="w-full bg-[#121319] border border-[#2b2e3f] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
          />
        </div>

        {/* Recording Timer */}
        <div className="flex flex-col items-center justify-center py-4 bg-[#12131a] rounded-lg border border-[#262837] mb-5">
          <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
            {isRecording ? 'Recording Live...' : 'Ready'}
          </span>
          <span className="font-mono text-3xl font-bold tabular-nums text-white">
            {recordingSeconds.toFixed(1)}s
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isRecording}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded transition-colors"
          >
            Cancel
          </button>

          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              disabled={!hasPermission}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md"
            >
              <Circle className="w-3.5 h-3.5 fill-current" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold transition-all shadow-md"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop & Place on Track</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
