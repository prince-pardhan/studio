/**
 * BeatFlow Studio - MIDI Service
 * Supports Web MIDI API hardware controllers, MIDI file (.mid) import & export using @tonejs/midi.
 */
import { Midi } from '@tonejs/midi';
import { Note, Pattern } from '../types/project';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
}

export type MidiNoteCallback = (note: number, velocity: number, isNoteOn: boolean) => void;

interface GenericMidiInput {
  id: string;
  name?: string;
  manufacturer?: string;
  onmidimessage: ((event: any) => void) | null;
}

interface GenericMidiAccess {
  inputs: {
    values: () => IterableIterator<GenericMidiInput>;
  };
  onstatechange: ((event: any) => void) | null;
}

export class MidiService {
  private midiAccess: GenericMidiAccess | null = null;
  private connectedInputs: Map<string, GenericMidiInput> = new Map();
  private noteCallbacks: Set<MidiNoteCallback> = new Set();
  public isSupported = false;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  async initMidi(): Promise<MidiDevice[]> {
    if (!this.isSupported) return [];

    try {
      this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: false });
      const devices: MidiDevice[] = [];

      if (this.midiAccess) {
        for (const input of this.midiAccess.inputs.values()) {
          devices.push({
            id: input.id,
            name: input.name || 'MIDI Controller',
            manufacturer: input.manufacturer,
          });
          this.attachInputListener(input);
        }

        this.midiAccess.onstatechange = (e: any) => {
          const port = e.port;
          if (port && port.type === 'input') {
            if (port.state === 'connected') {
              this.attachInputListener(port as GenericMidiInput);
            } else {
              this.connectedInputs.delete(port.id);
            }
          }
        };
      }

      return devices;
    } catch {
      return [];
    }
  }

  private attachInputListener(input: GenericMidiInput): void {
    if (this.connectedInputs.has(input.id)) return;
    this.connectedInputs.set(input.id, input);

    input.onmidimessage = (event: any) => {
      if (!event.data) return;
      const [status, note, velocity] = event.data;
      const command = status >> 4;

      if (command === 9 && velocity > 0) {
        // Note On
        this.emitNote(note, velocity / 127, true);
      } else if (command === 8 || (command === 9 && velocity === 0)) {
        // Note Off
        this.emitNote(note, 0, false);
      }
    };
  }

  onMidiNote(cb: MidiNoteCallback): () => void {
    this.noteCallbacks.add(cb);
    return () => this.noteCallbacks.delete(cb);
  }

  private emitNote(note: number, velocity: number, isNoteOn: boolean): void {
    for (const cb of this.noteCallbacks) {
      cb(note, velocity, isNoteOn);
    }
  }

  /**
   * Export notes from a channel or pattern to a standard .mid file and triggers browser download
   */
  static exportPatternToMidi(pattern: Pattern, bpm: number, channelId: string, filename = 'beatflow_export.mid'): void {
    const midi = new Midi();
    midi.header.setTempo(bpm);
    const track = midi.addTrack();
    track.name = pattern.name;

    const notes = pattern.notes[channelId] || [];
    const secondsPer16th = (60.0 / bpm) / 4.0;

    for (const n of notes) {
      track.addNote({
        midi: n.midi,
        time: n.step * secondsPer16th,
        duration: n.duration * secondsPer16th,
        velocity: n.velocity,
      });
    }

    const uint8 = midi.toArray();
    const blob = new Blob([new Uint8Array(uint8)], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import a .mid file and extract notes aligned to 16th steps
   */
  static async importMidiFile(file: File, bpm: number): Promise<Note[]> {
    const arrayBuffer = await file.arrayBuffer();
    const midi = new Midi(arrayBuffer);
    const secondsPer16th = (60.0 / bpm) / 4.0;
    const notes: Note[] = [];

    // Find track with notes
    for (const track of midi.tracks) {
      for (const n of track.notes) {
        const step = Math.round(n.time / secondsPer16th);
        const duration = Math.max(1, Math.round(n.duration / secondsPer16th));
        notes.push({
          id: `midi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          pitch: n.name,
          midi: n.midi,
          step,
          duration,
          velocity: n.velocity,
        });
      }
      if (notes.length > 0) break; // take primary track
    }

    return notes;
  }
}
