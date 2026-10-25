/**
 * BeatFlow Studio - Phase 14: Voice Studio Modal
 * Complete vocal recording & audio import workstation:
 * - Multi-device microphone input selection
 * - Real-time input level meter (Peak dBFS & RMS)
 * - Live oscilloscope waveform visualizer
 * - Headphone monitoring toggle with safe gain control
 * - 3-second recording countdown
 * - Record, Pause, Resume, Stop
 * - Multi-take manager: audition, rename, delete with confirmation
 * - File drag-and-drop & file picker (WAV, MP3, M4A, OGG)
 * - Automatic placement on arrangement timeline track
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Circle,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Upload,
  Trash2,
  Edit2,
  Check,
  Headphones,
  Sliders,
  AlertCircle,
  Clock,
  Sparkles,
  Music,
  FolderOpen,
} from 'lucide-react';
import { RecordingEngine, InputDeviceInfo } from '../audio/RecordingEngine';
import { AudioEngine } from '../audio/AudioEngine';
import { AudioAsset, ArrangementClip } from '../types/project';
import { AssetStorage } from '../storage/AssetStorage';

export interface RecordedTake {
  id: string;
  name: string;
  asset: AudioAsset;
  buffer: AudioBuffer;
  createdAt: number;
}

interface VoiceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecordedClip: (clip: ArrangementClip, asset: AudioAsset, buffer: AudioBuffer) => void;
  onOpenVocalEditor?: (asset: AudioAsset) => void;
  targetTrackIndex?: number;
  currentStep?: number;
  bpm: number;
}

export const VoiceStudioModal: React.FC<VoiceStudioModalProps> = ({
  isOpen,
  onClose,
  onAddRecordedClip,
  onOpenVocalEditor,
  targetTrackIndex = 4,
  currentStep = 0,
  bpm,
}) => {
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');

  // Microphone & Device State
  const [devices, setDevices] = useState<InputDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [useCountdown, setUseCountdown] = useState(true);

  // Monitoring & Metering
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [monitorVolume, setMonitorVolume] = useState(0.7);
  const [inputLevels, setInputLevels] = useState({ peak: 0, rms: 0, peakDb: -60, isClipping: false });

  // Takes Management
  const [takes, setTakes] = useState<RecordedTake[]>([]);
  const [auditioningTakeId, setAuditioningTakeId] = useState<string | null>(null);
  const [editingTakeId, setEditingTakeId] = useState<string | null>(null);
  const [editingTakeName, setEditingTakeName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Upload Tab State
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedAsset, setUploadedAsset] = useState<AudioAsset | null>(null);
  const [uploadedBuffer, setUploadedBuffer] = useState<AudioBuffer | null>(null);
  const [isAuditioningUpload, setIsAuditioningUpload] = useState(false);

  // Canvas Refs & Audio Engine
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioEngine = useRef(AudioEngine.getInstance()).current;
  const recordingEngineRef = useRef<RecordingEngine | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const auditionSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize recording engine & devices without requesting mic until user action
  useEffect(() => {
    if (!isOpen) return;

    recordingEngineRef.current = new RecordingEngine(audioEngine.ctx);

    // Enumerate already permitted devices
    RecordingEngine.getMicrophoneDevices().then((devList) => {
      setDevices(devList);
      if (devList.length > 0) {
        setSelectedDeviceId(devList[0].deviceId);
      }
    });

    const handleHardwareDeviceChange = () => {
      RecordingEngine.getMicrophoneDevices().then((devList) => {
        setDevices(devList);
      });
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', handleHardwareDeviceChange);

    // Live meter & canvas animation loop
    let animId: number;
    const timeDomainData = new Float32Array(512);

    const drawVisualizer = () => {
      if (recordingEngineRef.current) {
        const levels = recordingEngineRef.current.getLiveInputLevels();
        setInputLevels(levels);

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            recordingEngineRef.current.getLiveTimeDomainData(timeDomainData);
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#0f1118';
            ctx.fillRect(0, 0, w, h);

            // Draw center baseline
            ctx.strokeStyle = '#1e2235';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();

            // Draw oscilloscope waveform
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = isRecording ? '#ef4444' : '#10b981';

            const sliceWidth = w / timeDomainData.length;
            let x = 0;

            for (let i = 0; i < timeDomainData.length; i++) {
              const v = timeDomainData[i];
              const y = (v * 0.5 + 0.5) * h;

              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              x += sliceWidth;
            }
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(drawVisualizer);
    };

    animId = requestAnimationFrame(drawVisualizer);

    return () => {
      cancelAnimationFrame(animId);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleHardwareDeviceChange);
      stopCurrentAudition();
      recordingEngineRef.current?.cleanup();
      recordingEngineRef.current = null;
    };
  }, [isOpen, audioEngine.ctx]);

  // Request microphone on demand
  const ensureMicrophone = async (deviceId?: string): Promise<boolean> => {
    if (!recordingEngineRef.current) {
      recordingEngineRef.current = new RecordingEngine(audioEngine.ctx);
    }
    try {
      await recordingEngineRef.current.requestMicrophone(deviceId || selectedDeviceId || undefined);
      setHasPermission(true);
      setPermissionError(null);

      const devList = await RecordingEngine.getMicrophoneDevices();
      setDevices(devList);
      if (!selectedDeviceId && devList.length > 0) {
        setSelectedDeviceId(devList[0].deviceId);
      }
      return true;
    } catch (err: any) {
      setHasPermission(false);
      setPermissionError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please grant microphone access in your browser site settings.'
          : `Could not access microphone: ${err.message}`
      );
      return false;
    }
  };

  // Handle device switch
  const handleDeviceChange = async (devId: string) => {
    setSelectedDeviceId(devId);
    if (hasPermission) {
      await ensureMicrophone(devId);
      recordingEngineRef.current?.setMonitoring(monitoringEnabled, monitorVolume);
    }
  };

  // Toggle monitoring
  const handleToggleMonitoring = async () => {
    const next = !monitoringEnabled;
    if (next && !hasPermission) {
      const ok = await ensureMicrophone();
      if (!ok) return;
    }
    setMonitoringEnabled(next);
    recordingEngineRef.current?.setMonitoring(next, monitorVolume);
  };

  const handleMonitorVolumeChange = (vol: number) => {
    setMonitorVolume(vol);
    if (monitoringEnabled) {
      recordingEngineRef.current?.setMonitoring(true, vol);
    }
  };

  const stopCurrentAudition = () => {
    if (auditionSourceRef.current) {
      try {
        auditionSourceRef.current.stop();
      } catch {}
      auditionSourceRef.current.disconnect();
      auditionSourceRef.current = null;
    }
    setAuditioningTakeId(null);
    setIsAuditioningUpload(false);
  };

  // Start recording with optional countdown (requests mic if not yet granted)
  const handleStartRecording = async () => {
    if (isRecording) return;
    stopCurrentAudition();

    if (!hasPermission) {
      const ok = await ensureMicrophone();
      if (!ok) return;
    }

    if (useCountdown) {
      setCountdown(3);
      const countTimer = setInterval(() => {
        setCountdown((c) => {
          if (c === null || c <= 1) {
            clearInterval(countTimer);
            setCountdown(null);
            executeRecordingStart();
            return null;
          }
          return c - 1;
        });
      }, 700);
    } else {
      executeRecordingStart();
    }
  };

  const executeRecordingStart = async () => {
    if (!recordingEngineRef.current) return;
    try {
      await recordingEngineRef.current.startRecording(selectedDeviceId || undefined);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 0.1);
      }, 100);
    } catch (err: any) {
      setPermissionError(`Recording start failed: ${err.message}`);
    }
  };

  const handlePauseResume = () => {
    if (!recordingEngineRef.current || !isRecording) return;
    if (isPaused) {
      recordingEngineRef.current.resumeRecording();
      setIsPaused(false);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 0.1);
      }, 100);
    } else {
      recordingEngineRef.current.pauseRecording();
      setIsPaused(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleStopRecording = async () => {
    if (!recordingEngineRef.current || !isRecording) return;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    try {
      const takeNumber = takes.length + 1;
      const takeTitle = `Vocal Take ${takeNumber}`;
      const { asset, buffer } = await recordingEngineRef.current.stopRecording(takeTitle);
      audioEngine.cacheAudioBuffer(asset.id, buffer);

      const newTake: RecordedTake = {
        id: asset.id,
        name: takeTitle,
        asset,
        buffer,
        createdAt: Date.now(),
      };

      setTakes((prev) => [newTake, ...prev]);
      setIsRecording(false);
      setIsPaused(false);
    } catch (err: any) {
      setPermissionError(`Stop recording error: ${err.message}`);
    }
  };

  // Audition take
  const handleAuditionTake = (take: RecordedTake) => {
    if (auditioningTakeId === take.id) {
      stopCurrentAudition();
      return;
    }

    stopCurrentAudition();

    const source = audioEngine.ctx.createBufferSource();
    source.buffer = take.buffer;
    const gain = audioEngine.ctx.createGain();
    gain.gain.setValueAtTime(0.9, audioEngine.ctx.currentTime);

    source.connect(gain);
    gain.connect(audioEngine.mixer.getChannelInput(8)); // Send through Channel 8 vocal strip
    source.start(0);

    auditionSourceRef.current = source;
    setAuditioningTakeId(take.id);

    source.onended = () => {
      setAuditioningTakeId(null);
    };
  };

  // Place take onto timeline
  const handlePlaceTakeOnTimeline = (take: RecordedTake) => {
    const secondsPer16th = (60 / bpm) / 4;
    const durationSteps = Math.max(4, Math.round(take.asset.duration / secondsPer16th));

    const newClip: ArrangementClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      trackIndex: targetTrackIndex,
      startStep: currentStep,
      durationSteps,
      type: 'audio',
      audioAssetId: take.asset.id,
      name: take.name,
      color: '#ec4899', // Pink vocal color
      gain: 1.0,
      fadeInSteps: 1,
      fadeOutSteps: 1,
    };

    onAddRecordedClip(newClip, take.asset, take.buffer);
    onClose();
  };

  // Rename Take
  const handleSaveRenameTake = (takeId: string) => {
    if (!editingTakeName.trim()) return;
    setTakes((prev) =>
      prev.map((t) => (t.id === takeId ? { ...t, name: editingTakeName.trim() } : t))
    );
    setEditingTakeId(null);
  };

  // Delete Take
  const handleDeleteTake = (takeId: string) => {
    setTakes((prev) => prev.filter((t) => t.id !== takeId));
    setDeleteConfirmId(null);
    if (auditioningTakeId === takeId) {
      stopCurrentAudition();
    }
  };

  // File Upload Handling
  const handleFileUpload = async (file: File) => {
    setUploadLoading(true);
    setUploadError(null);

    try {
      const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/flac'];
      if (!validTypes.some((t) => file.type.includes(t)) && !file.name.match(/\.(wav|mp3|m4a|ogg|flac)$/i)) {
        throw new Error('Unsupported format. Please upload a WAV, MP3, M4A, OGG, or FLAC file.');
      }

      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await audioEngine.ctx.decodeAudioData(arrayBuffer);
      const peaks = AssetStorage.extractPeaks(decodedBuffer, 120);

      const assetId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');

      const asset: AudioAsset = {
        id: assetId,
        name: cleanName,
        duration: decodedBuffer.duration,
        sampleRate: decodedBuffer.sampleRate,
        channels: decodedBuffer.numberOfChannels,
        createdAt: Date.now(),
        peaks,
      };

      // Store in IndexedDB & memory cache
      await AssetStorage.saveAsset({
        id: asset.id,
        name: asset.name,
        duration: asset.duration,
        sampleRate: asset.sampleRate,
        channels: asset.channels,
        createdAt: asset.createdAt,
        peaks,
        blob: file,
      });

      audioEngine.cacheAudioBuffer(asset.id, decodedBuffer);

      setUploadedAsset(asset);
      setUploadedBuffer(decodedBuffer);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to decode audio file');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAuditionUpload = () => {
    if (!uploadedBuffer) return;
    if (isAuditioningUpload) {
      stopCurrentAudition();
      return;
    }

    stopCurrentAudition();
    const source = audioEngine.ctx.createBufferSource();
    source.buffer = uploadedBuffer;
    const gain = audioEngine.ctx.createGain();
    gain.gain.setValueAtTime(0.9, audioEngine.ctx.currentTime);

    source.connect(gain);
    gain.connect(audioEngine.mixer.getChannelInput(8));
    source.start(0);

    auditionSourceRef.current = source;
    setIsAuditioningUpload(true);

    source.onended = () => {
      setIsAuditioningUpload(false);
    };
  };

  const handlePlaceUploadOnTimeline = () => {
    if (!uploadedAsset || !uploadedBuffer) return;

    const secondsPer16th = (60 / bpm) / 4;
    const durationSteps = Math.max(4, Math.round(uploadedAsset.duration / secondsPer16th));

    const newClip: ArrangementClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      trackIndex: targetTrackIndex,
      startStep: currentStep,
      durationSteps,
      type: 'audio',
      audioAssetId: uploadedAsset.id,
      name: uploadedAsset.name,
      color: '#ec4899',
      gain: 1.0,
      fadeInSteps: 1,
      fadeOutSteps: 1,
    };

    onAddRecordedClip(newClip, uploadedAsset, uploadedBuffer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#13151f] border border-[#272b3c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222638] bg-[#161926]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white shadow-md">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Voice & Audio Studio
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  Track {targetTrackIndex + 1} • Vocal Bus
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Record live microphone takes or import vocal audio stems</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="flex bg-[#0f1118] p-1 rounded-lg border border-[#252a3d]">
              <button
                onClick={() => setActiveTab('record')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'record'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Record Mic
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'upload'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Upload Audio
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-[#202538] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab 1: Live Record Mic */}
        {activeTab === 'record' && (
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Error banner if microphone permission failed */}
            {permissionError && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl flex items-start gap-3 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Microphone Access Error</p>
                  <p className="text-red-300/80">{permissionError}</p>
                </div>
              </div>
            )}

            {/* Audio Hardware & Monitoring Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#181b29] p-3.5 rounded-xl border border-[#252a3d]">
              {/* Mic Device Selector */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  Input Microphone:
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  disabled={isRecording}
                  className="w-full bg-[#10121b] border border-[#2b3047] text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-pink-500 cursor-pointer disabled:opacity-50"
                >
                  {devices.length === 0 ? (
                    <option value="">Default System Microphone</option>
                  ) : (
                    devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Headphone Monitoring Toggle & Volume */}
              <div className="flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-pink-400" />
                    Direct Monitoring:
                  </span>
                  <button
                    onClick={handleToggleMonitoring}
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                      monitoringEnabled
                        ? 'bg-pink-600/30 text-pink-300 border-pink-500'
                        : 'bg-[#12141d] text-zinc-400 border-[#2c3248] hover:text-zinc-200'
                    }`}
                  >
                    {monitoringEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-zinc-500">Vol:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={monitorVolume}
                    disabled={!monitoringEnabled}
                    onChange={(e) => handleMonitorVolumeChange(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer disabled:opacity-40"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 w-8">
                    {Math.round(monitorVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Live Waveform & Input Meter Viewport */}
            <div className="relative bg-[#0d0f16] rounded-xl border border-[#232738] p-4 flex flex-col items-center">
              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center rounded-xl z-20">
                  <div className="text-6xl font-black text-pink-500 animate-bounce">
                    {countdown}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2 font-semibold">GET READY TO SING / SPEAK</p>
                </div>
              )}

              {/* Waveform Canvas */}
              <canvas
                ref={canvasRef}
                width={560}
                height={120}
                className="w-full h-28 rounded-lg"
              />

              {/* Metering Bar */}
              <div className="w-full mt-3 flex items-center gap-3">
                <span className="text-[11px] font-mono text-zinc-400 w-12 text-right">
                  {inputLevels.peakDb > -50 ? `${inputLevels.peakDb} dB` : '-INF'}
                </span>

                <div className="flex-1 h-3 bg-[#171a25] rounded-full overflow-hidden p-0.5 border border-[#262c3f]">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      inputLevels.isClipping
                        ? 'bg-red-500'
                        : inputLevels.peak > 0.75
                        ? 'bg-amber-400'
                        : 'bg-gradient-to-r from-emerald-500 to-pink-500'
                    }`}
                    style={{ width: `${Math.round(inputLevels.peak * 100)}%` }}
                  />
                </div>

                {inputLevels.isClipping && (
                  <span className="text-[10px] font-bold text-red-400 px-1.5 py-0.5 bg-red-950/80 border border-red-500 rounded">
                    CLIP
                  </span>
                )}
              </div>

              {/* Timer Display */}
              <div className="mt-2 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xl font-mono font-bold text-white tracking-wider">
                  {Math.floor(recordingSeconds / 60)
                    .toString()
                    .padStart(2, '0')}
                  :
                  {Math.floor(recordingSeconds % 60)
                    .toString()
                    .padStart(2, '0')}
                  .
                  {Math.floor((recordingSeconds % 1) * 10)}
                </span>
                {isRecording && (
                  <span className="flex items-center gap-1.5 ml-2 text-xs font-bold text-red-500 animate-pulse">
                    <Circle className="w-2.5 h-2.5 fill-red-500" />
                    {isPaused ? 'PAUSED' : 'REC'}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons: Countdown toggle, Record, Pause, Stop */}
            <div className="flex items-center justify-between border-t border-[#222638] pt-4">
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCountdown}
                  onChange={(e) => setUseCountdown(e.target.checked)}
                  disabled={isRecording}
                  className="rounded accent-pink-500"
                />
                <span>3s Countdown</span>
              </label>

              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    onClick={handleStartRecording}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-pink-600/30 transition-all cursor-pointer"
                  >
                    <Circle className="w-4 h-4 fill-white" />
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePauseResume}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[#202538] hover:bg-[#292f46] text-zinc-200 font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                      <span>{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>

                    <button
                      onClick={handleStopRecording}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop & Save Take</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Multi-Take Manager */}
            {takes.length > 0 && (
              <div className="mt-5 border-t border-[#222638] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-pink-400" />
                    Recorded Takes ({takes.length})
                  </h4>
                  <span className="text-[10px] text-zinc-500">
                    Audition, edit, or place directly onto timeline
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {takes.map((take) => {
                    const isAuditioning = auditioningTakeId === take.id;
                    const isDeleting = deleteConfirmId === take.id;

                    return (
                      <div
                        key={take.id}
                        className="flex items-center justify-between p-2.5 bg-[#171a27] hover:bg-[#1d2133] border border-[#262c3f] rounded-xl transition-all"
                      >
                        {/* Title & Duration */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleAuditionTake(take)}
                            title={isAuditioning ? 'Stop Audition' : 'Audition Take'}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              isAuditioning
                                ? 'bg-pink-500 text-white shadow-xs'
                                : 'bg-[#22273a] text-zinc-300 hover:bg-pink-600 hover:text-white'
                            }`}
                          >
                            {isAuditioning ? <Square className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
                          </button>

                          {editingTakeId === take.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingTakeName}
                                onChange={(e) => setEditingTakeName(e.target.value)}
                                autoFocus
                                className="bg-[#10121b] border border-pink-500 text-xs text-white rounded px-2 py-0.5 outline-none w-36"
                              />
                              <button
                                onClick={() => handleSaveRenameTake(take.id)}
                                className="p-1 text-emerald-400 hover:text-white"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-zinc-200">{take.name}</p>
                              <p className="text-[10px] text-zinc-500">
                                {take.asset.duration.toFixed(2)}s • {take.asset.channels === 1 ? 'Mono' : 'Stereo'} • {take.asset.sampleRate}Hz
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions: Edit, Delete, Place */}
                        <div className="flex items-center gap-1.5">
                          {editingTakeId !== take.id && (
                            <button
                              onClick={() => {
                                setEditingTakeId(take.id);
                                setEditingTakeName(take.name);
                              }}
                              title="Rename Take"
                              className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-[#262b3e]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onOpenVocalEditor && (
                            <button
                              onClick={() => {
                                onOpenVocalEditor(take.asset);
                                onClose();
                              }}
                              title="Open in Vocal Editor"
                              className="px-2.5 py-1 text-[11px] font-semibold text-zinc-300 bg-[#252a3d] hover:bg-[#31374f] rounded-lg transition-colors"
                            >
                              Edit Vocal
                            </button>
                          )}

                          {isDeleting ? (
                            <div className="flex items-center gap-1 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/50">
                              <span className="text-[10px] text-red-300">Delete?</span>
                              <button
                                onClick={() => handleDeleteTake(take.id)}
                                className="text-[10px] text-red-400 font-bold hover:underline"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-[10px] text-zinc-400 hover:text-white"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(take.id)}
                              title="Delete Take"
                              className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-[#262b3e]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handlePlaceTakeOnTimeline(take)}
                            title="Place take on arrangement timeline"
                            className="px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                          >
                            Place on Track
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upload Audio File */}
        {activeTab === 'upload' && (
          <div className="p-6 space-y-5">
            {uploadError && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl flex items-center gap-2 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Hidden Input File */}
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {/* Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2d334a] hover:border-pink-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#0f1118] hover:bg-[#151722]"
            >
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                {uploadLoading ? 'Decoding audio waveform...' : 'Drop audio file here or click to browse'}
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm">
                Supports WAV, MP3, M4A, OGG, and FLAC stems or vocal recordings
              </p>
            </div>

            {/* Uploaded File Preview Card */}
            {uploadedAsset && uploadedBuffer && (
              <div className="p-4 bg-[#181b29] border border-pink-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Music className="w-4 h-4 text-pink-400" />
                      {uploadedAsset.name}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {uploadedAsset.duration.toFixed(2)}s duration • {uploadedAsset.channels} channels • {uploadedAsset.sampleRate}Hz
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAuditionUpload}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252a3d] hover:bg-pink-600 hover:text-white text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      {isAuditioningUpload ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                      <span>{isAuditioningUpload ? 'Stop' : 'Audition'}</span>
                    </button>

                    {onOpenVocalEditor && (
                      <button
                        onClick={() => {
                          onOpenVocalEditor(uploadedAsset);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-[#2a3047] hover:bg-[#343b59] text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Edit Vocal
                      </button>
                    )}

                    <button
                      onClick={handlePlaceUploadOnTimeline}
                      className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
                    >
                      Place on Timeline
                    </button>
                  </div>
                </div>

                {/* Waveform preview bars */}
                {uploadedAsset.peaks && (
                  <div className="h-14 bg-[#0e1017] rounded-lg p-1.5 flex items-center gap-0.5 overflow-hidden">
                    {uploadedAsset.peaks.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-pink-500/80 rounded-xs"
                        style={{ height: `${Math.max(4, p * 100)}%` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
