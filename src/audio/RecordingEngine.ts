/**
 * BeatFlow Studio - Audio Recording Engine (Phase 14)
 * Multi-device input selection, real-time input meter (Peak/RMS), live monitoring with gain control,
 * live waveform visualization analysis, pause/resume recording, multi-take support, and IndexedDB persistence.
 */
import { AudioAsset } from '../types/project';
import { AssetStorage } from '../storage/AssetStorage';

export interface InputDeviceInfo {
  deviceId: string;
  label: string;
}

export class RecordingEngine {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private audioContext: AudioContext;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micAnalyserNode: AnalyserNode | null = null;
  private monitorGainNode: GainNode | null = null;
  private isRecording = false;
  private isPaused = false;
  private activeDeviceId: string | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * Returns list of available audio input devices (microphones/interfaces)
   */
  static async getMicrophoneDevices(): Promise<InputDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${idx + 1}`,
        }));
    } catch {
      return [];
    }
  }

  async requestMicrophone(deviceId?: string): Promise<MediaStream> {
    if (this.mediaStream && (!deviceId || this.activeDeviceId === deviceId)) {
      return this.mediaStream;
    }

    if (this.mediaStream) {
      this.cleanup();
    }

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    };

    if (deviceId) {
      audioConstraints.deviceId = { exact: deviceId };
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
    });
    this.activeDeviceId = deviceId || null;

    // Set up live monitoring & analyser graph
    this.micSourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.micAnalyserNode = this.audioContext.createAnalyser();
    this.micAnalyserNode.fftSize = 512;
    this.micAnalyserNode.smoothingTimeConstant = 0.4;
    this.micSourceNode.connect(this.micAnalyserNode);

    // Monitoring node (default muted for safety)
    this.monitorGainNode = this.audioContext.createGain();
    this.monitorGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.micSourceNode.connect(this.monitorGainNode);
    this.monitorGainNode.connect(this.audioContext.destination);

    return this.mediaStream;
  }

  /**
   * Sets low-latency microphone monitoring into headphones.
   * Volume is 0 to 1.
   */
  setMonitoring(enabled: boolean, volume = 0.75): void {
    if (!this.monitorGainNode) return;
    const targetGain = enabled ? Math.max(0, Math.min(1.0, volume)) : 0;
    this.monitorGainNode.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.05);
  }

  /**
   * Calculates live Peak and RMS input meter levels (0.0 to 1.0)
   */
  getLiveInputLevels(): { peak: number; rms: number; peakDb: number; isClipping: boolean } {
    if (!this.micAnalyserNode) {
      return { peak: 0, rms: 0, peakDb: -60, isClipping: false };
    }

    const data = new Float32Array(this.micAnalyserNode.fftSize);
    this.micAnalyserNode.getFloatTimeDomainData(data);

    let peak = 0;
    let sumSquares = 0;

    for (let i = 0; i < data.length; i++) {
      const val = Math.abs(data[i]);
      if (val > peak) peak = val;
      sumSquares += val * val;
    }

    const rms = Math.sqrt(sumSquares / data.length);
    const peakDb = peak > 0.0001 ? 20 * Math.log10(peak) : -60;
    const isClipping = peak >= 0.99;

    return {
      peak: Math.min(1.0, peak),
      rms: Math.min(1.0, rms * 1.8),
      peakDb: Math.round(peakDb * 10) / 10,
      isClipping,
    };
  }

  /**
   * Legacy simple level getter
   */
  getLiveInputLevel(): number {
    return this.getLiveInputLevels().peak;
  }

  /**
   * Copies live time domain data for canvas waveform oscilloscopes
   */
  getLiveTimeDomainData(outArray: Float32Array): void {
    if (this.micAnalyserNode) {
      this.micAnalyserNode.getFloatTimeDomainData(outArray as any);
    }
  }

  /**
   * Copies live frequency data for spectrum bars
   */
  getLiveByteFrequencyData(outArray: Uint8Array): void {
    if (this.micAnalyserNode) {
      this.micAnalyserNode.getByteFrequencyData(outArray as any);
    }
  }

  async startRecording(deviceId?: string): Promise<void> {
    const stream = await this.requestMicrophone(deviceId);
    this.recordedChunks = [];

    const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus' }
      : undefined;

    this.mediaRecorder = new MediaRecorder(stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
    this.isRecording = true;
    this.isPaused = false;
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.isPaused = false;
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  async stopRecording(clipName = 'Vocal Record'): Promise<{ asset: AudioAsset; buffer: AudioBuffer }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Recorder is not active'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        this.isRecording = false;
        this.isPaused = false;
        try {
          const blob = new Blob(this.recordedChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm',
          });
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

          const peaks = AssetStorage.extractPeaks(audioBuffer, 120);
          const assetId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          const asset: AudioAsset = {
            id: assetId,
            name: `${clipName} #${Math.floor(Math.random() * 900 + 100)}`,
            duration: audioBuffer.duration,
            sampleRate: audioBuffer.sampleRate,
            channels: audioBuffer.numberOfChannels,
            createdAt: Date.now(),
            peaks,
          };

          // Save to IndexedDB
          await AssetStorage.saveAsset({
            id: asset.id,
            name: asset.name,
            duration: asset.duration,
            sampleRate: asset.sampleRate,
            channels: asset.channels,
            createdAt: asset.createdAt,
            peaks: peaks || [],
            blob,
          });

          resolve({ asset, buffer: audioBuffer });
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.micSourceNode?.disconnect();
    this.micSourceNode = null;
    this.micAnalyserNode?.disconnect();
    this.micAnalyserNode = null;
    this.monitorGainNode?.disconnect();
    this.monitorGainNode = null;
    this.isRecording = false;
    this.isPaused = false;
    this.activeDeviceId = null;
  }
}
