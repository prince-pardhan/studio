/**
 * BeatFlow Studio - Offline Audio Exporter
 * Renders multitrack arrangements to pristine 16-bit stereo WAV using OfflineAudioContext.
 */
import { Project, ArrangementClip, Track } from '../types/project';
import { DrumSynthEngine } from './DrumSynthEngine';
import { InstrumentEngine } from './InstrumentEngine';
import { MixerEngine } from './MixerEngine';
import { audioBufferToWav } from './WavEncoder';

export interface ExportProgress {
  progress: number; // 0 to 1
  stage: 'rendering' | 'encoding' | 'complete';
}

export class AudioExporter {
  static async renderProjectToWav(
    project: Project,
    audioBufferCache: Map<string, AudioBuffer>,
    onProgress?: (p: ExportProgress) => void,
    selectedTrackIndex?: number
  ): Promise<Blob> {
    const bpm = project.bpm;
    const secondsPer16th = (60.0 / bpm) / 4.0;

    // Calculate total duration in steps
    let maxStep = 64;
    for (const clip of project.clips) {
      if (selectedTrackIndex !== undefined && clip.trackIndex !== selectedTrackIndex) continue;
      const end = clip.startStep + clip.durationSteps;
      if (end > maxStep) maxStep = end;
    }
    // Add 2 bars tail for reverb / delay release
    const totalStepsWithTail = maxStep + 32;
    const totalDurationSec = totalStepsWithTail * secondsPer16th;
    const sampleRate = 44100;
    const lengthSamples = Math.ceil(totalDurationSec * sampleRate);

    onProgress?.({ progress: 0.1, stage: 'rendering' });

    // Create OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(2, lengthSamples, sampleRate);
    const mixer = new MixerEngine(offlineCtx, offlineCtx.destination);
    const drumSynth = new DrumSynthEngine(offlineCtx);
    const instrumentEngine = new InstrumentEngine(offlineCtx);

    // Sync mixer settings
    const hasAnySolo = project.mixerChannels.some((c) => c.solo);
    for (const ch of project.mixerChannels) {
      mixer.updateChannel(ch, hasAnySolo);
    }

    // Schedule all clips
    const relevantClips =
      selectedTrackIndex !== undefined
        ? project.clips.filter((c) => c.trackIndex === selectedTrackIndex)
        : project.clips;

    const hasSoloTrack = project.tracks.some((t) => t.solo);

    for (const clip of relevantClips) {
      const track = project.tracks[clip.trackIndex];
      if (!track || track.mute) continue;
      if (hasSoloTrack && !track.solo) continue;

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
                drumSynth.triggerDrum(channel.drumType, dest, stepTime, v * channel.volume * track.volume);
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
          const source = offlineCtx.createBufferSource();
          source.buffer = buffer;
          const gain = offlineCtx.createGain();
          gain.gain.setValueAtTime(track.volume, startTime);
          source.connect(gain);
          gain.connect(mixer.getChannelInput(1));
          source.start(startTime);
        }
      }
    }

    onProgress?.({ progress: 0.4, stage: 'rendering' });

    // Render audio
    const renderedBuffer = await offlineCtx.startRendering();

    onProgress?.({ progress: 0.85, stage: 'encoding' });

    // Encode to WAV Blob
    const wavBlob = audioBufferToWav(renderedBuffer);

    onProgress?.({ progress: 1.0, stage: 'complete' });

    return wavBlob;
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
