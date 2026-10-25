/**
 * BeatFlow Studio - Algorithmic Music Engine & AI Client
 * Deterministic music theory algorithms for scales, chords, arpeggiators,
 * drum groove generation, and AI backend integration with seamless fallback.
 */
import { Note, ScaleKey, ScaleType } from '../types/project';

export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  pentatonic: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

const NOTE_TO_SEMITONE: Record<ScaleKey, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
  'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

export const CIRCLE_OF_FIFTHS: {
  key: ScaleKey;
  relativeMinor: ScaleKey;
  sharpsOrFlats: string;
}[] = [
  { key: 'C', relativeMinor: 'A', sharpsOrFlats: '0' },
  { key: 'G', relativeMinor: 'E', sharpsOrFlats: '1#' },
  { key: 'D', relativeMinor: 'B', sharpsOrFlats: '2#' },
  { key: 'A', relativeMinor: 'F#', sharpsOrFlats: '3#' },
  { key: 'E', relativeMinor: 'C#', sharpsOrFlats: '4#' },
  { key: 'B', relativeMinor: 'G#', sharpsOrFlats: '5#' },
  { key: 'F#', relativeMinor: 'D#', sharpsOrFlats: '6#' },
  { key: 'C#', relativeMinor: 'A#', sharpsOrFlats: '7#' },
  { key: 'G#', relativeMinor: 'F', sharpsOrFlats: '4b' },
  { key: 'D#', relativeMinor: 'C', sharpsOrFlats: '3b' },
  { key: 'A#', relativeMinor: 'G', sharpsOrFlats: '2b' },
  { key: 'F', relativeMinor: 'D', sharpsOrFlats: '1b' },
];

export class AlgorithmicMusicGen {
  /**
   * Check if a given MIDI note number belongs to key and scale
   */
  static isNoteInScale(midi: number, rootKey: ScaleKey, scaleType: ScaleType): boolean {
    const rootSemi = NOTE_TO_SEMITONE[rootKey];
    const pitchClass = (midi % 12 + 12 - rootSemi) % 12;
    return SCALE_INTERVALS[scaleType].includes(pitchClass);
  }

  /**
   * Generate diatonic chord progression based on genre and scale
   */
  static generateChordProgression(
    rootKey: ScaleKey = 'C',
    scaleType: ScaleType = 'minor',
    genre: 'synthwave' | 'trap' | 'house' | 'lofi' | 'pop' = 'synthwave'
  ): { name: string; notes: Note[] }[] {
    const rootMidi = 48 + NOTE_TO_SEMITONE[rootKey]; // Octave 3
    const intervals = SCALE_INTERVALS[scaleType];

    let progressionSteps: number[] = [0, 5, 2, 6]; // i - VI - III - VII in minor
    if (genre === 'house' || genre === 'pop') {
      progressionSteps = [0, 4, 5, 3]; // I - V - vi - IV
    } else if (genre === 'lofi') {
      progressionSteps = [1, 4, 0, 5]; // ii - V - I - vi
    }

    const chords: { name: string; notes: Note[] }[] = [];
    const chordNames = ['Tonic', 'Subdominant', 'Dominant', 'Resolution'];

    progressionSteps.forEach((degreeIndex, i) => {
      const stepOffset = i * 4; // 1 beat per chord or 1 bar
      const degreeOffset = intervals[degreeIndex % intervals.length];
      const root = rootMidi + degreeOffset;

      // 7th chord triad + 7th
      const third = root + 4; // or 3
      const fifth = root + 7;
      const seventh = root + 10;

      const chordNotes: Note[] = [
        {
          id: `ch_${i}_1`,
          pitch: `N${root}`,
          midi: root,
          step: stepOffset,
          duration: 4,
          velocity: 0.8,
        },
        {
          id: `ch_${i}_2`,
          pitch: `N${third}`,
          midi: third,
          step: stepOffset,
          duration: 4,
          velocity: 0.75,
        },
        {
          id: `ch_${i}_3`,
          pitch: `N${fifth}`,
          midi: fifth,
          step: stepOffset,
          duration: 4,
          velocity: 0.75,
        },
        {
          id: `ch_${i}_4`,
          pitch: `N${seventh}`,
          midi: seventh,
          step: stepOffset,
          duration: 4,
          velocity: 0.7,
        },
      ];

      chords.push({
        name: `${rootKey} ${chordNames[i % chordNames.length]}`,
        notes: chordNotes,
      });
    });

    return chords;
  }

  /**
   * Arpeggiates given chord notes across 16 steps
   */
  static arpeggiateNotes(
    inputNotes: Note[],
    style: 'up' | 'down' | 'updown' | 'random' = 'up',
    rate: 1 | 2 = 1
  ): Note[] {
    if (inputNotes.length === 0) return [];

    // Sort notes by pitch
    const sorted = [...inputNotes].sort((a, b) => a.midi - b.midi);
    const result: Note[] = [];
    const totalSteps = 16;
    let noteIndex = 0;
    let direction = 1;

    for (let step = 0; step < totalSteps; step += rate) {
      const source = sorted[noteIndex];
      result.push({
        id: `arp_${step}`,
        pitch: source.pitch,
        midi: source.midi,
        step,
        duration: rate,
        velocity: source.velocity * (0.8 + Math.random() * 0.2),
      });

      if (style === 'up') {
        noteIndex = (noteIndex + 1) % sorted.length;
      } else if (style === 'down') {
        noteIndex = (noteIndex - 1 + sorted.length) % sorted.length;
      } else if (style === 'updown') {
        noteIndex += direction;
        if (noteIndex >= sorted.length - 1) {
          direction = -1;
        } else if (noteIndex <= 0) {
          direction = 1;
        }
      } else {
        noteIndex = Math.floor(Math.random() * sorted.length);
      }
    }

    return result;
  }

  /**
   * Strum humanizer: applies micro-timing delays across polyphonic chord voices
   */
  static applyStrum(notes: Note[], strumSpreadSteps = 0.5): Note[] {
    return notes.map((n, idx) => ({
      ...n,
      step: Math.round(n.step + (idx % 4) * (strumSpreadSteps / 4)),
      velocity: Math.max(0.2, Math.min(1.0, n.velocity * (0.9 + (idx % 3) * 0.05))),
    }));
  }

  /**
   * Generate genre drum pattern (16 steps)
   */
  /**
   * Generate genre drum pattern (16 steps)
   */
  static generateDrumPattern(genre: string): Record<string, number[]> {
    switch (genre) {
      case 'trap':
        return {
          ch_kick:    [1.0, 0, 0, 0, 0, 0, 0.9, 0, 0.95, 0, 0.8, 0, 0, 0, 0.85, 0],
          ch_snare:   [0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.95, 0, 0, 0, 0, 0, 0, 0, 0.95, 0, 0, 0],
          ch_hihat_c: [0.9, 0.6, 0.8, 0.6, 0.9, 0.6, 0.8, 0.9, 0.9, 0.6, 0.8, 0.6, 0.95, 0.9, 0.8, 0.9],
          ch_hihat_o: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0],
          ch_perc:    [0, 0, 0.7, 0, 0, 0, 0, 0.65, 0, 0, 0, 0.7, 0, 0, 0, 0],
        };
      case 'drill':
        return {
          ch_kick:    [1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0.85, 0],
          ch_snare:   [0, 0, 0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0],
          ch_hihat_c: [0.9, 0, 0.8, 0.9, 0, 0.8, 0.9, 0.7, 0.9, 0, 0.8, 0.9, 0.7, 0.9, 0.8, 0.9],
          ch_hihat_o: [0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0, 0.8, 0],
          ch_perc:    [0, 0, 0.6, 0, 0, 0.8, 0, 0, 0, 0.7, 0, 0, 0, 0.8, 0, 0],
        };
      case 'dnb':
        return {
          ch_kick:    [1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0],
          ch_snare:   [0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0],
          ch_hihat_c: [0.85, 0.7, 0.85, 0.7, 0.85, 0.7, 0.85, 0.7, 0.85, 0.7, 0.85, 0.7, 0.85, 0.7, 0.85, 0.7],
          ch_hihat_o: [0, 0, 0.75, 0, 0, 0, 0.75, 0, 0, 0, 0.75, 0, 0, 0, 0.75, 0],
          ch_perc:    [0, 0, 0, 0.6, 0, 0, 0.7, 0, 0, 0, 0, 0.6, 0, 0, 0.8, 0],
        };
      case 'house':
      case 'edm':
        return {
          ch_kick:    [1.0, 0, 0, 0, 1.0, 0, 0, 0, 1.0, 0, 0, 0, 1.0, 0, 0, 0],
          ch_snare:   [0, 0, 0, 0, 0.95, 0, 0, 0, 0, 0, 0, 0, 0.95, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0],
          ch_hihat_c: [0, 0, 0.8, 0, 0, 0, 0.8, 0, 0, 0, 0.8, 0, 0, 0, 0.8, 0],
          ch_hihat_o: [0, 0, 0.85, 0, 0, 0, 0.85, 0, 0, 0, 0.85, 0, 0, 0, 0.85, 0],
          ch_perc:    [0, 0, 0, 0.6, 0, 0, 0, 0.6, 0, 0, 0, 0.6, 0, 0, 0.7, 0],
        };
      case 'techno':
        return {
          ch_kick:    [1.0, 0, 0, 0, 1.0, 0, 0, 0, 1.0, 0, 0, 0, 1.0, 0, 0, 0],
          ch_snare:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0],
          ch_hihat_c: [0.9, 0.7, 0.9, 0.7, 0.9, 0.7, 0.9, 0.7, 0.9, 0.7, 0.9, 0.7, 0.9, 0.7, 0.9, 0.7],
          ch_hihat_o: [0, 0, 0.85, 0, 0, 0, 0.85, 0, 0, 0, 0.85, 0, 0, 0, 0.85, 0],
          ch_perc:    [0.7, 0, 0.6, 0, 0.7, 0, 0.6, 0, 0.7, 0, 0.6, 0, 0.7, 0, 0.8, 0],
        };
      case 'synthwave':
        return {
          ch_kick:    [1.0, 0, 0, 0, 0, 0, 0.9, 0, 1.0, 0, 0, 0, 0, 0, 0.85, 0],
          ch_snare:   [0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.85, 0, 0, 0, 0, 0, 0, 0, 0.85, 0, 0, 0],
          ch_hihat_c: [0.85, 0.6, 0.8, 0.6, 0.85, 0.6, 0.8, 0.6, 0.85, 0.6, 0.8, 0.6, 0.85, 0.6, 0.8, 0.6],
          ch_hihat_o: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.75, 0],
          ch_perc:    [0, 0, 0.7, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0.65, 0, 0, 0],
        };
      case 'pop':
      case 'rock':
        return {
          ch_kick:    [1.0, 0, 0, 0, 0, 0, 0.8, 0, 0.9, 0, 0, 0, 0, 0, 0, 0],
          ch_snare:   [0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0],
          ch_hihat_c: [0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6],
          ch_hihat_o: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0],
          ch_perc:    [0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0.6, 0],
        };
      case 'bollywood':
        return {
          ch_kick:    [1.0, 0, 0, 0, 0.8, 0, 0, 0, 1.0, 0, 0, 0.7, 0, 0, 0.9, 0],
          ch_snare:   [0, 0, 0, 0, 0.9, 0, 0, 0.7, 0, 0, 0, 0, 0.9, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.85, 0, 0, 0, 0, 0, 0, 0, 0.85, 0, 0, 0],
          ch_hihat_c: [0.8, 0.7, 0.6, 0.8, 0.7, 0.6, 0.8, 0.7, 0.6, 0.8, 0.7, 0.6, 0.8, 0.7, 0.6, 0.8],
          ch_hihat_o: [0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0],
          ch_perc:    [0.9, 0.7, 0, 0.8, 0.9, 0.6, 0, 0.8, 0.9, 0.7, 0, 0.8, 0.9, 0.6, 0, 0.9],
        };
      case 'punjabi':
        return {
          ch_kick:    [1.0, 0, 0, 0.8, 0, 0, 1.0, 0, 0, 0.8, 0, 0, 1.0, 0, 0, 0],
          ch_snare:   [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0],
          ch_hihat_c: [0.9, 0, 0.8, 0.9, 0, 0.8, 0.9, 0, 0.8, 0.9, 0, 0.8, 0.9, 0, 0.8, 0.9],
          ch_hihat_o: [0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0],
          ch_perc:    [1.0, 0.8, 0, 0.9, 0, 0.7, 1.0, 0.8, 0, 0.9, 0, 0.7, 1.0, 0.8, 0, 0.9],
        };
      case 'classical_indian':
        return {
          ch_kick:    [0.9, 0, 0, 0, 0.8, 0, 0, 0, 0.85, 0, 0, 0, 0.7, 0, 0, 0],
          ch_snare:   [0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0],
          ch_hihat_c: [0.7, 0.6, 0.7, 0.6, 0.7, 0.6, 0.7, 0.6, 0.7, 0.6, 0.7, 0.6, 0.7, 0.6, 0.7, 0.6],
          ch_hihat_o: [0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0.6, 0],
          ch_perc:    [0.9, 0.6, 0.8, 0.5, 0.85, 0.6, 0.8, 0.5, 0.9, 0.6, 0.8, 0.5, 0.85, 0.6, 0.8, 0.7],
        };
      case 'cinematic':
        return {
          ch_kick:    [1.0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0],
          ch_snare:   [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0],
          ch_hihat_c: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          ch_hihat_o: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          ch_perc:    [1.0, 0, 0, 0.7, 0, 0, 0.8, 0, 0.9, 0, 0, 0.7, 0, 0, 0.8, 0.9],
        };
      case 'ambient':
        return {
          ch_kick:    [0.8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          ch_snare:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0],
          ch_hihat_c: [0, 0, 0.4, 0, 0, 0, 0.4, 0, 0, 0, 0.4, 0, 0, 0, 0.4, 0],
          ch_hihat_o: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0],
          ch_perc:    [0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0],
        };
      case 'lofi':
      case 'hiphop':
      case 'boombap':
      default:
        return {
          ch_kick:    [1.0, 0, 0, 0, 0, 0, 0, 0.85, 0, 0, 0.9, 0, 0, 0, 0, 0],
          ch_snare:   [0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0],
          ch_clap:    [0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0],
          ch_hihat_c: [0.9, 0, 0.75, 0.6, 0.9, 0, 0.75, 0.6, 0.9, 0, 0.75, 0.6, 0.9, 0.6, 0.75, 0.6],
          ch_hihat_o: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0],
          ch_perc:    [0, 0, 0.6, 0, 0, 0, 0.7, 0, 0, 0, 0.6, 0, 0, 0, 0, 0],
        };
    }
  }

  /**
   * Request AI assistance from backend with fallback
   */
  static async requestAIAssistant(params: {
    prompt?: string;
    genre?: string;
    key?: string;
    bpm?: number;
    type?: 'drums' | 'chords' | 'melody' | 'all';
  }): Promise<{
    title: string;
    description: string;
    chords?: Note[];
    melody?: Note[];
    bassline?: Note[];
    drumPattern?: Record<string, number[]>;
    theoryTip?: string;
  }> {
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = await res.json();

      if (json.success && json.data) {
        return {
          title: json.data.title || 'AI Generated Groove',
          description: json.data.description || 'AI suggested musical arrangement',
          melody: json.data.melody,
          bassline: json.data.bassline,
          drumPattern: json.data.drumPattern,
          theoryTip: json.data.theoryTip,
        };
      }
    } catch {
      // Fallback to local deterministic generator
    }

    // High quality local algorithmic fallback
    const chords = this.generateChordProgression(
      (params.key?.split(' ')[0] as ScaleKey) || 'C',
      'minor',
      (params.genre?.toLowerCase() as any) || 'synthwave'
    );
    const flatChordNotes = chords.flatMap((c) => c.notes);
    const drums = this.generateDrumPattern((params.genre?.toLowerCase() as any) || 'synthwave');

    return {
      title: `${params.genre || 'Cyber'} Harmony`,
      description: `Algorithmically generated in ${params.key || 'C Minor'} at ${params.bpm || 128} BPM.`,
      chords: flatChordNotes,
      drumPattern: drums,
      theoryTip: 'Try using the Circle of Fifths to resolve into the dominant chord before your turnaround!',
    };
  }
}
