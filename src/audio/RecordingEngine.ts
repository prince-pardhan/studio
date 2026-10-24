/**
 * BeatFlow Studio - Audio Recording Engine
 * Real-time microphone input capture, live input level meter, AudioBuffer decoding,
 * and seamless creation of audio assets for arrangement clips.
 */
import { AudioAsset } from '../types/project';
import { AssetStorage } from '../storage/AssetStorage';

export class RecordingEngine {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private audioContext: AudioContext;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micAnalyserNode: AnalyserNode | null = null;
  private isRecording = false;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async requestMicrophone(): Promise<MediaStream> {
    if (this.mediaStream) return this.mediaStream;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    // Set up monitoring analyser
    this.micSourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.micAnalyserNode = this.audioContext.createAnalyser();
    this.micAnalyserNode.fftSize = 256;
    this.micSourceNode.connect(this.micAnalyserNode);

    return this.mediaStream;
  }

  getLiveInputLevel(): number {
    if (!this.micAnalyserNode) return 0;
    const data = new Float32Array(this.micAnalyserNode.fftSize);
    this.micAnalyserNode.getFloatTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const val = Math.abs(data[i]);
      if (val > peak) peak = val;
    }
    return Math.min(1.0, peak * 2.5);
  }

  async startRecording(): Promise<void> {
    const stream = await this.requestMicrophone();
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
  }

  async stopRecording(clipName = 'Vocal Record'): Promise<{ asset: AudioAsset; buffer: AudioBuffer }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Recorder is not active'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        this.isRecording = false;
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
    this.micAnalyserNode = null;
    this.isRecording = false;
  }
}
