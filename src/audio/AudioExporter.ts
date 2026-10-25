/**
 * BeatFlow Studio - Offline Audio Exporter (Phase 14)
 * Renders multitrack arrangements to 16-bit, 24-bit, or 32-bit float stereo WAV
 * with sample-rate selection, TPDF dithering, customizable reverb tails, mastering chain processing,
 * and stems rendering (Master, Vocals, Instrumental).
 */
import { Project } from '../types/project';
import { DrumSynthEngine } from './DrumSynthEngine';
import { InstrumentEngine } from './InstrumentEngine';
import { MixerEngine } from './MixerEngine';
import { audioBufferToWav } from './WavEncoder';

export interface ExportProgress {
  progress: number; // 0 to 1
  stage: 'rendering' | 'encoding' | 'complete';
}

export interface RenderOptions {
  bitDepth?: 16 | 24 | 32;
  sampleRate?: 44100 | 48000 | 96000;
  dither?: 'none' | 'tpdf';
  tailSec?: number;
  applyMastering?: boolean;
  stemFilter?: 'all' | 'vocals_only' | 'instrumental_only';
}

export class AudioExporter {
  static async renderProjectToWav(
    project: Project,
    audioBufferCache: Map<string, AudioBuffer>,
    onProgress?: (p: ExportProgress) => void,
    selectedTrackIndex?: number,
    options?: RenderOptions
  ): Promise<{ blob: Blob; maxPeak: number; isClipping: boolean }> {
    const bpm = project.bpm;
    const secondsPer16th = (60.0 / bpm) / 4.0;
    const sampleRate = options?.sampleRate || 44100;
    const tailSec = options?.tailSec ?? 2.0;
    const stemFilter = options?.stemFilter || 'all';

    // Calculate total duration in steps
    let maxStep = 64;
    for (const clip of project.clips) {
      if (selectedTrackIndex !== undefined && clip.trackIndex !== selectedTrackIndex) continue;
      if (stemFilter === 'vocals_only' && clip.type !== 'audio') continue;
      if (stemFilter === 'instrumental_only' && clip.type === 'audio') continue;
      const end = clip.startStep + clip.durationSteps;
      if (end > maxStep) maxStep = end;
    }

    const totalDurationSec = maxStep * secondsPer16th + tailSec;
    const lengthSamples = Math.ceil(totalDurationSec * sampleRate);

    onProgress?.({ progress: 0.1, stage: 'rendering' });

    // Create OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(2, lengthSamples, sampleRate);
    const mixer = new MixerEngine(offlineCtx, offlineCtx.destination);
    const drumSynth = new DrumSynthEngine(offlineCtx);
    const instrumentEngine = new InstrumentEngine(offlineCtx);

    // Apply mastering session if requested (master only, not for individual isolated stems)
    if (options?.applyMastering !== false && project.masteringSession && stemFilter === 'all') {
      mixer.mastering.applySessionConfig(project.masteringSession);
    }

    // Sync mixer channel settings & modular plugins
    const hasAnySolo = project.mixerChannels.some((c) => c.solo);
    for (const ch of project.mixerChannels) {
      mixer.updateChannel(ch, hasAnySolo);
    }

    // Schedule clips
    const relevantClips =
      selectedTrackIndex !== undefined
        ? project.clips.filter((c) => c.trackIndex === selectedTrackIndex)
        : project.clips;

    const hasSoloTrack = project.tracks.some((t) => t.solo);

    for (const clip of relevantClips) {
      const track = project.tracks[clip.trackIndex];
      if (!track || track.mute) continue;
      if (hasSoloTrack && !track.solo) continue;

      // Filter stems if requested
      if (stemFilter === 'vocals_only' && clip.type !== 'audio') continue;
      if (stemFilter === 'instrumental_only' && clip.type === 'audio') continue;

      if (clip.type === 'pattern' && clip.patternId) {
        const pattern = project.patterns.find((p) => p.id === clip.patternId);
        if (!pattern) continue;

        for (let s = 0; s < clip.durationSteps; s++) {
          const stepTime = (clip.startStep + s) * secondsPer16th;
          const patStep = s % pattern.lengthInSteps;

          for (const channel of project.channels) {
            if (channel.mute) continue;
            const dest = mixer.getChannelInput(channel.mixerChannel);

            if (channel.type === 'drum' && channel.drumType) {
              const v = pattern.drumSteps[channel.id]?.[patStep];
              if (v && v > 0) {
                drumSynth.triggerDrum(
                  channel.drumType,
                  dest,
                  stepTime,
                  v * channel.volume * track.volume
                );
              }
            } else if (channel.type === 'synth') {
              const notes = pattern.notes[channel.id];
              if (notes) {
                for (const n of notes) {
                  if (n.step === patStep) {
                    const durSec = n.duration * secondsPer16th;
                    instrumentEngine.triggerNote(
                      channel.synthPreset || 'lead',
                      channel.synthParams,
                      n.midi,
                      durSec,
                      dest,
                      stepTime,
                      n.velocity * channel.volume * track.volume
                    );
                  }
                }
              }
            }
          }
        }
      } else if (clip.type === 'audio' && clip.audioAssetId) {
        const buffer = audioBufferCache.get(clip.audioAssetId);
        if (buffer) {
          const startTime = clip.startStep * secondsPer16th;
          const clipDurationSec = clip.durationSteps * secondsPer16th;
          const targetVol = track.volume * (clip.gain ?? 1.0);

          const source = offlineCtx.createBufferSource();
          source.buffer = buffer;
          const gainNode = offlineCtx.createGain();

          // Apply smooth fade-in
          if (clip.fadeInSteps && clip.fadeInSteps > 0) {
            const fadeInSec = Math.min(clipDurationSec * 0.5, clip.fadeInSteps * secondsPer16th);
            gainNode.gain.setValueAtTime(0.0001, startTime);
            gainNode.gain.linearRampToValueAtTime(targetVol, startTime + fadeInSec);
          } else {
            gainNode.gain.setValueAtTime(targetVol, startTime);
          }

          // Apply smooth fade-out
          if (clip.fadeOutSteps && clip.fadeOutSteps > 0) {
            const fadeOutSec = Math.min(clipDurationSec * 0.5, clip.fadeOutSteps * secondsPer16th);
            const fadeOutStart = Math.max(startTime, startTime + clipDurationSec - fadeOutSec);
            gainNode.gain.setValueAtTime(targetVol, fadeOutStart);
            gainNode.gain.linearRampToValueAtTime(0.0001, startTime + clipDurationSec);
          }

          source.connect(gainNode);

          // Route to vocal mixer channel (Channel 8) if vocal/mic track or channel 8, otherwise Channel 1
          const isVocalTrack =
            track.name.toLowerCase().includes('vocal') ||
            track.name.toLowerCase().includes('voice') ||
            track.name.toLowerCase().includes('mic') ||
            clip.name.toLowerCase().includes('vocal') ||
            clip.trackIndex === 4;

          const mixerDest = mixer.getChannelInput(isVocalTrack ? 8 : 1);
          gainNode.connect(mixerDest);

          source.start(startTime, 0, clipDurationSec);
        }
      }
    }

    onProgress?.({ progress: 0.5, stage: 'rendering' });

    // Render audio graph
    const renderedBuffer = await offlineCtx.startRendering();

    // Scan for peak level and clipping
    let maxPeak = 0;
    for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
      const data = renderedBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxPeak) maxPeak = abs;
      }
    }
    const isClipping = maxPeak >= 0.999;

    onProgress?.({ progress: 0.85, stage: 'encoding' });

    // Encode to WAV Blob with bit depth and dither
    const wavBlob = audioBufferToWav(renderedBuffer, {
      bitDepth: options?.bitDepth || 16,
      dither: options?.dither || 'none',
      float32: options?.bitDepth === 32,
    });

    onProgress?.({ progress: 1.0, stage: 'complete' });

    return { blob: wavBlob, maxPeak, isClipping };
  }

  static downloadWav(blob: Blob, filename = 'BeatFlow_Arrangement.wav'): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
